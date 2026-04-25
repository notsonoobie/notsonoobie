import { NextResponse, after, type NextRequest } from "next/server";
import { getSupabaseServer, getUser } from "@/lib/supabase/server";
import {
  issueCertificateIfReady,
  recordEpisodeComplete,
} from "@/lib/courses/actions";
import { renderCertificatePdf } from "@/lib/courses/render-certificate-pdf";
import { buildCompletionEmail } from "@/lib/emails/completion";
import { getResend } from "@/lib/resend";

type Body = {
  episodeId?: number;
  quizScore?: number;
};

async function sendCompletionEmail(args: {
  to: string;
  courseTitle: string;
  courseTagline: string | null;
  courseSlug: string;
  certificateId: string;
  episodeCount: number;
  durationMin: number | null;
  level: string | null;
  /** Pre-rendered certificate PDF. When provided the email goes out
   * with the PDF as an attachment; when omitted (e.g. puppeteer threw)
   * the email still ships, link-only. */
  pdfBuffer: Buffer | null;
}) {
  const resend = getResend();
  if (!resend) {
    console.info(
      "[completion] RESEND_API_KEY unset; skipping completion email for",
      args.to
    );
    return;
  }
  const msg = buildCompletionEmail(
    args.to,
    {
      courseTitle: args.courseTitle,
      courseTagline: args.courseTagline,
      courseSlug: args.courseSlug,
      certificateId: args.certificateId,
      episodeCount: args.episodeCount,
      durationMin: args.durationMin,
      level: args.level,
    },
    args.pdfBuffer
      ? { buffer: args.pdfBuffer, courseSlug: args.courseSlug }
      : undefined
  );
  if (!msg) {
    console.info(
      "[completion] COURSES_FROM_EMAIL unset; skipping completion send for",
      args.to
    );
    return;
  }
  const { error } = await resend.emails.send({
    to: msg.to,
    from: msg.from,
    replyTo: msg.replyTo,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
    attachments: msg.attachment ? [msg.attachment] : undefined,
  });
  if (error) {
    console.error("[completion] resend send failed", error);
  }
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const episodeId = Number(body.episodeId);
  if (!Number.isInteger(episodeId) || episodeId <= 0) {
    return NextResponse.json(
      { ok: false, error: "invalid_episode_id" },
      { status: 400 }
    );
  }

  const quizScore =
    body.quizScore !== undefined && Number.isFinite(body.quizScore)
      ? Math.max(0, Math.min(100, Math.round(Number(body.quizScore))))
      : undefined;

  const result = await recordEpisodeComplete({
    userId: user.id,
    episodeId,
    quizScore,
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  // Look up the parent course so we can auto-issue a certificate when the
  // user has completed every episode. Use the service-role client because
  // the user is authenticated but the episode row may be RLS-gated.
  const admin = getSupabaseServer();
  const { data: ep } = await admin
    .from("episodes")
    .select("course_id")
    .eq("id", episodeId)
    .maybeSingle();

  let certificateId: string | undefined;
  if (ep) {
    const courseId = (ep as { course_id: number }).course_id;
    const cert = await issueCertificateIfReady({ userId: user.id, courseId });
    if (cert.ok) {
      certificateId = cert.certificateId;

      // Brand-new certificate → fire-and-forget completion email. Idempotent
      // because `newlyIssued` is true exactly once per (user, course); a
      // second progress hit on the same finished course returns false.
      if (cert.newlyIssued && user.email) {
        const userEmail = user.email;
        const newCertId = cert.certificateId;

        const { data: course } = await admin
          .from("courses")
          .select("slug, title, tagline, level, duration_min")
          .eq("id", courseId)
          .maybeSingle();

        const { data: episodes } = await admin
          .from("episodes")
          .select("id")
          .eq("course_id", courseId)
          .eq("is_published", true);

        if (course) {
          const c = course as {
            slug: string;
            title: string;
            tagline: string | null;
            level: string | null;
            duration_min: number | null;
          };
          after(async () => {
            // Look up the certificate's recipient name (auth metadata)
            // so the PDF gets the same display name the user sees on
            // the cert page. `userEmail` is captured above, but the
            // Sacramento — sorry, the recipient name — needs the
            // user_metadata fetch.
            let ownerName: string | null = null;
            try {
              const { data } = await admin.auth.admin.getUserById(user.id);
              const meta = (data.user?.user_metadata ?? {}) as {
                full_name?: string;
                name?: string;
              };
              ownerName = meta.full_name ?? meta.name ?? null;
            } catch (err) {
              console.error("[completion] auth metadata lookup failed", err);
            }

            // Render the cert PDF first so we can attach it to the
            // completion email. Failure is non-fatal: the email goes
            // out link-only, and we still log so prod issues are
            // visible.
            let pdfBuffer: Buffer | null = null;
            try {
              pdfBuffer = await renderCertificatePdf({
                courseTitle: c.title,
                ownerName: ownerName ?? "Anonymous learner",
                issuedAt: new Date().toISOString(),
                certificateId: newCertId,
              });
            } catch (err) {
              console.error("[completion] PDF render failed", err);
            }
            try {
              await sendCompletionEmail({
                to: userEmail,
                courseTitle: c.title,
                courseTagline: c.tagline,
                courseSlug: c.slug,
                certificateId: newCertId,
                episodeCount: episodes?.length ?? 0,
                durationMin: c.duration_min,
                level: c.level,
                pdfBuffer,
              });
            } catch (err) {
              console.error("[completion] email failed", err);
            }
          });
        }
      }
    }
  }

  return NextResponse.json({ ok: true, certificateId });
}
