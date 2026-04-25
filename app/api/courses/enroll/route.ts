import { NextResponse, after, type NextRequest } from "next/server";
import { getSupabaseServer, getUser } from "@/lib/supabase/server";
import { buildEnrollmentEmail } from "@/lib/emails/enrollment";
import { getResend } from "@/lib/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { courseId?: number };

async function sendEnrollmentEmail(args: {
  to: string;
  courseTitle: string;
  courseTagline: string | null;
  courseSlug: string;
  firstEpisodeSlug: string | null;
  episodeCount: number;
  durationMin: number | null;
  level: string | null;
}) {
  const resend = getResend();
  if (!resend) {
    console.info(
      "[enrollments] RESEND_API_KEY unset; skipping confirmation send for",
      args.to
    );
    return;
  }
  const msg = buildEnrollmentEmail(args.to, {
    courseTitle: args.courseTitle,
    courseTagline: args.courseTagline,
    courseSlug: args.courseSlug,
    firstEpisodeSlug: args.firstEpisodeSlug,
    episodeCount: args.episodeCount,
    durationMin: args.durationMin,
    level: args.level,
  });
  if (!msg) {
    console.info(
      "[enrollments] COURSES_FROM_EMAIL unset; skipping confirmation send for",
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
  });
  if (error) {
    console.error("[enrollments] resend send failed", error);
  }
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 }
    );
  }

  const courseId = Number(body.courseId);
  if (!Number.isInteger(courseId) || courseId <= 0) {
    return NextResponse.json(
      { ok: false, error: "invalid_course_id" },
      { status: 400 }
    );
  }

  // Use service-role for both the existence check and the insert so we can
  // distinguish "newly enrolled" (send email) from "already enrolled"
  // (silent success) without RLS shenanigans.
  const admin = getSupabaseServer();

  const { data: course, error: courseErr } = await admin
    .from("courses")
    .select("id, slug, title, tagline, level, duration_min, is_free, is_published")
    .eq("id", courseId)
    .maybeSingle();

  if (courseErr || !course) {
    return NextResponse.json(
      { ok: false, error: "course_not_found" },
      { status: 404 }
    );
  }
  if (!(course as { is_published: boolean }).is_published) {
    return NextResponse.json(
      { ok: false, error: "course_unpublished" },
      { status: 403 }
    );
  }

  // v1 only ships free courses; the gate is in the schema (is_free) so the
  // future Razorpay flow can drop in by inverting this check.
  if (!(course as { is_free: boolean }).is_free) {
    return NextResponse.json(
      { ok: false, error: "payment_required" },
      { status: 402 }
    );
  }

  const { data: existing } = await admin
    .from("course_enrollments")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .maybeSingle();

  let newlyEnrolled = false;
  if (!existing) {
    const { error: insertErr } = await admin
      .from("course_enrollments")
      .insert({ user_id: user.id, course_id: courseId });
    if (insertErr) {
      // 23505 = unique_violation; concurrent request beat us to it.
      if (insertErr.code !== "23505") {
        console.error("[enrollments] insert failed", insertErr);
        return NextResponse.json(
          { ok: false, error: "db_error" },
          { status: 500 }
        );
      }
    } else {
      newlyEnrolled = true;
    }
  }

  if (newlyEnrolled && user.email) {
    // Look up the first episode of the first section so the email's CTA
    // can deep-link. We pull all episodes (ordered) plus their parent
    // section's sort_order, then sort in JS by (section.sortOrder,
    // episode.sortOrder) — keeps the query trivial under RLS while still
    // honoring the section grouping.
    const [{ data: orderedEpisodes }, { data: episodes }] = await Promise.all(
      [
        admin
          .from("episodes")
          .select("slug, sort_order, course_sections!inner(sort_order, is_published)")
          .eq("course_id", courseId)
          .eq("is_published", true)
          .eq("course_sections.is_published", true),
        admin
          .from("episodes")
          .select("id")
          .eq("course_id", courseId)
          .eq("is_published", true),
      ]
    );

    type OrderedEp = {
      slug: string;
      sort_order: number;
      course_sections: { sort_order: number };
    };
    const firstEp = ((orderedEpisodes as OrderedEp[] | null) ?? [])
      .slice()
      .sort((a, b) => {
        const sd = a.course_sections.sort_order - b.course_sections.sort_order;
        return sd !== 0 ? sd : a.sort_order - b.sort_order;
      })[0] ?? null;

    const courseRow = course as {
      slug: string;
      title: string;
      tagline: string | null;
      level: string | null;
      duration_min: number | null;
    };

    const userEmail = user.email;

    after(async () => {
      try {
        await sendEnrollmentEmail({
          to: userEmail,
          courseTitle: courseRow.title,
          courseTagline: courseRow.tagline,
          courseSlug: courseRow.slug,
          firstEpisodeSlug: firstEp?.slug ?? null,
          episodeCount: episodes?.length ?? 0,
          durationMin: courseRow.duration_min,
          level: courseRow.level,
        });
      } catch (err) {
        console.error("[enrollments] confirmation email failed", err);
      }
    });
  }

  return NextResponse.json({ ok: true, newlyEnrolled });
}
