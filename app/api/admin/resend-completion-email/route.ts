// Dev-only admin endpoint: re-sends the course-completion email for an
// existing certificate. Useful when the original send failed, when the
// email template changed and you want to reissue, or when testing
// changes against a real cert without re-completing the course.
//
// Gated on NODE_ENV !== "production" so this never ships as a public
// surface — production builds return 404.
import { NextResponse, type NextRequest } from "next/server";

import { getCertificateById } from "@/lib/courses/queries";
import { renderCertificatePdf } from "@/lib/courses/render-certificate-pdf";
import { buildCompletionEmail } from "@/lib/emails/completion";
import { getResend } from "@/lib/resend";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { ok: false, error: "not_available_in_production" },
      { status: 404 }
    );
  }

  const body = (await req.json().catch(() => null)) as
    | { certId?: string }
    | null;
  if (!body?.certId) {
    return NextResponse.json(
      { ok: false, error: "certId_required" },
      { status: 400 }
    );
  }

  const cert = await getCertificateById(body.certId);
  if (!cert) {
    return NextResponse.json(
      { ok: false, error: "cert_not_found" },
      { status: 404 }
    );
  }

  const admin = getSupabaseServer();
  const { data: userResult, error: userErr } =
    await admin.auth.admin.getUserById(cert.userId);
  if (userErr || !userResult.user?.email) {
    return NextResponse.json(
      { ok: false, error: "user_email_not_found" },
      { status: 404 }
    );
  }
  const userEmail = userResult.user.email;

  const { data: episodes } = await admin
    .from("episodes")
    .select("id")
    .eq("course_id", cert.courseId)
    .eq("is_published", true);

  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = await renderCertificatePdf({
      courseTitle: cert.course.title,
      ownerName: cert.ownerName ?? "Anonymous learner",
      issuedAt: cert.issuedAt,
      certificateId: cert.id,
    });
  } catch (err) {
    console.error("[admin/resend-completion] PDF render failed", err);
  }

  const resend = getResend();
  if (!resend) {
    return NextResponse.json(
      { ok: false, error: "RESEND_API_KEY_unset" },
      { status: 500 }
    );
  }

  const msg = buildCompletionEmail(
    userEmail,
    {
      courseTitle: cert.course.title,
      courseTagline: cert.course.tagline,
      courseSlug: cert.course.slug,
      certificateId: cert.id,
      episodeCount: episodes?.length ?? 0,
      durationMin: cert.course.durationMin,
      level: cert.course.level,
    },
    pdfBuffer
      ? { buffer: pdfBuffer, courseSlug: cert.course.slug }
      : undefined
  );
  if (!msg) {
    return NextResponse.json(
      { ok: false, error: "COURSES_FROM_EMAIL_unset" },
      { status: 500 }
    );
  }

  const { error: sendErr, data: sendData } = await resend.emails.send({
    to: msg.to,
    from: msg.from,
    replyTo: msg.replyTo,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
    attachments: msg.attachment ? [msg.attachment] : undefined,
  });
  if (sendErr) {
    console.error("[admin/resend-completion] send failed", sendErr);
    return NextResponse.json(
      { ok: false, error: "send_failed", detail: String(sendErr) },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    to: userEmail,
    courseTitle: cert.course.title,
    certId: cert.id,
    pdfAttached: !!pdfBuffer,
    pdfBytes: pdfBuffer?.length ?? 0,
    resendId: sendData?.id ?? null,
  });
}
