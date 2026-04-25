import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SidebarNav } from "@/components/nav/SidebarNav";
import { CourseHeader } from "@/components/courses/CourseHeader";
import { EpisodeList } from "@/components/courses/EpisodeList";
import { EnrollButton } from "@/components/courses/EnrollButton";
import { ProgressBar } from "@/components/courses/ProgressBar";
import { RelatedCourses } from "@/components/courses/RelatedCourses";
import { ShareMenu } from "@/components/courses/ShareMenu";
import { CourseJsonLd } from "@/components/seo/CourseJsonLd";
import {
  getAllCourses,
  getCourseBySlug,
  getCourseEnrollment,
  getCourseProgress,
  getUserCertificates,
} from "@/lib/courses/queries";
import { flattenEpisodes } from "@/lib/courses/types";
import { getUser } from "@/lib/supabase/server";
import { SITE_AUTHOR, SITE_URL } from "@/lib/seo";
import { ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

type Params = Promise<{ courseSlug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { courseSlug } = await params;
  const course = await getCourseBySlug(courseSlug);
  if (!course) return { title: "Course not found" };

  const description =
    course.tagline ?? course.description ?? `Course: ${course.title}`;
  // The per-course OG image lives at
  // `app/courses/[courseSlug]/opengraph-image.tsx` — Next.js auto-binds
  // it via metadata convention, but we still want explicit URLs in
  // `openGraph.images` and `twitter.images` so the absolute URL ships
  // even when the metadataBase is overridden.
  const url = `${SITE_URL}/courses/${course.slug}`;
  const ogImage = `${url}/opengraph-image`;
  // Keyword set: course title + tagline (split into terms, deduped) +
  // a few catalog-level keywords. Modern Google ignores meta keywords
  // for ranking, but we set them for consistency with the rest of the
  // site and for niche search engines that still read them.
  const titleTerms = course.title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4);
  const keywords = Array.from(
    new Set(
      [
        course.title,
        course.level ?? undefined,
        ...titleTerms,
        "course",
        "online learning",
        "completion certificate",
        SITE_AUTHOR,
      ].filter(Boolean) as string[],
    ),
  );
  return {
    title: course.title,
    description,
    keywords,
    category: "Education",
    authors: [{ name: SITE_AUTHOR, url: SITE_URL }],
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: `${course.title} · Course`,
      description,
      siteName: "Rahul Gupta — Portfolio",
      // `article` type unlocks publishedTime/modifiedTime — small but
      // real freshness signal for evergreen content.
      publishedTime: course.createdAt,
      modifiedTime: course.updatedAt,
      authors: [SITE_AUTHOR],
      section: course.level ?? "Engineering",
      images: [{ url: ogImage, width: 1200, height: 630, alt: course.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${course.title} · Course`,
      description,
      creator: "@notsonoobie",
      images: [ogImage],
    },
  };
}

export default async function CourseDetailPage({
  params,
}: {
  params: Params;
}) {
  const { courseSlug } = await params;
  const course = await getCourseBySlug(courseSlug);
  if (!course) notFound();

  const user = await getUser();
  const enrollment = user
    ? await getCourseEnrollment(user.id, course.id)
    : null;
  const completedIds = user
    ? await getCourseProgress(user.id, course.id)
    : new Set<number>();
  const certs = user ? await getUserCertificates(user.id) : [];
  const cert = certs.find((c) => c.courseId === course.id) ?? null;
  // Sibling catalogue for the related-courses module at the bottom of
  // the page. Cheap query (single SELECT, no joins) — same data the
  // /courses index already loads on every visit.
  const allCourses = await getAllCourses();

  const allEpisodes = flattenEpisodes(course);
  const total = allEpisodes.length;
  const completed = allEpisodes.filter((e) => completedIds.has(e.id)).length;
  const firstUncompletedSlug =
    allEpisodes.find((e) => !completedIds.has(e.id))?.slug ??
    allEpisodes[0]?.slug ??
    null;

  return (
    <>
      <SidebarNav />
      <CourseJsonLd course={course} episodeCount={total} />
      <CourseHeader course={course} />

      <section className="relative">
        <div className="mx-auto max-w-5xl px-6 md:px-10 py-12 md:py-16 grid gap-10 md:grid-cols-[1fr_280px]">
          {/* Left: description + episodes */}
          <div className="min-w-0">
            {course.description && (
              <div className="mb-8 text-ink-dim text-[15px] leading-relaxed max-w-prose">
                {course.description}
              </div>
            )}

            <div className="mb-6 flex items-center justify-between gap-3">
              <ShareMenu
                url={`${SITE_URL}/courses/${course.slug}`}
                title={course.title}
                text={
                  course.tagline
                    ? `${course.title} — ${course.tagline}`
                    : course.title
                }
              />
            </div>

            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold tracking-[-0.01em]">
                Course content
              </h2>
              <span className="font-mono text-[10.5px] text-ink-faint tracking-[0.22em] uppercase">
                {total} {total === 1 ? "episode" : "episodes"}
              </span>
            </div>

            {total === 0 ? (
              <p className="text-ink-dim font-mono text-sm">
                Episodes will be listed here once published.
              </p>
            ) : (
              <EpisodeList
                courseSlug={course.slug}
                sections={course.sections}
                completedIds={user ? completedIds : undefined}
                locked={!user || !enrollment}
                lockReason={!user ? "signin" : "enroll"}
              />
            )}
          </div>

          {/* Right: status sidebar */}
          <aside className="md:sticky md:top-24 self-start space-y-5">
            <div className="rounded-xl hairline bg-canvas-2/50 p-5">
              {!user ? (
                <>
                  <div className="font-mono text-[10.5px] text-cyan tracking-[0.22em] uppercase mb-2">
                    {"// sign in"}
                  </div>
                  <p className="text-ink-dim text-[13px] leading-relaxed">
                    Sign in to enroll, track your progress, and earn a certificate.
                  </p>
                  <Link
                    href={`/login?next=${encodeURIComponent(`/courses/${course.slug}`)}`}
                    className="mt-4 inline-flex items-center gap-2 rounded-md bg-cyan text-canvas text-sm font-medium h-10 px-4 hover:shadow-[0_0_24px_-4px_var(--color-cyan)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                  >
                    sign in
                    <ArrowRight className="size-4" strokeWidth={2.25} />
                  </Link>
                </>
              ) : !enrollment ? (
                <>
                  <div className="font-mono text-[10.5px] text-cyan tracking-[0.22em] uppercase mb-2">
                    {"// enroll"}
                  </div>
                  <p className="text-ink-dim text-[13px] leading-relaxed mb-4">
                    Enroll once to unlock every episode and start whenever you&rsquo;re ready.
                  </p>
                  <EnrollButton
                    courseId={course.id}
                    courseTitle={course.title}
                    isFree={course.isFree}
                  />
                </>
              ) : (
                <>
                  <div className="font-mono text-[10.5px] text-cyan tracking-[0.22em] uppercase mb-3">
                    {"// your progress"}
                  </div>
                  <ProgressBar value={completed} total={total} />
                </>
              )}
            </div>

            {user && enrollment && firstUncompletedSlug && (
              <Link
                href={`/courses/${course.slug}/${firstUncompletedSlug}`}
                className="block rounded-xl hairline bg-canvas-2/50 hover:bg-canvas-2 p-5 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
              >
                <div className="font-mono text-[10.5px] text-ink-faint tracking-[0.22em] uppercase mb-1.5">
                  {completed === 0 ? "// start" : "// continue"}
                </div>
                <div className="text-ink text-sm font-medium group-hover:text-cyan transition-colors flex items-center justify-between gap-2">
                  next episode
                  <ArrowRight
                    className="size-4 group-hover:translate-x-0.5 transition-transform"
                    strokeWidth={2}
                  />
                </div>
              </Link>
            )}

            {cert && (
              <Link
                href={`/certificates/${cert.id}`}
                className="block rounded-xl hairline bg-cyan/5 border border-cyan/30 p-5 hover:bg-cyan/10 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
              >
                <div className="font-mono text-[10.5px] text-cyan tracking-[0.22em] uppercase mb-1.5">
                  {"// completed"}
                </div>
                <div className="text-ink text-sm font-medium flex items-center justify-between gap-2">
                  view certificate
                  <ArrowRight
                    className="size-4 text-cyan group-hover:translate-x-0.5 transition-transform"
                    strokeWidth={2}
                  />
                </div>
              </Link>
            )}
          </aside>
        </div>

        <div className="mx-auto max-w-5xl px-6 md:px-10 pb-20">
          <RelatedCourses all={allCourses} currentSlug={course.slug} />
        </div>
      </section>
    </>
  );
}
