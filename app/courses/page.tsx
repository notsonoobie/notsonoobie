import type { Metadata } from "next";
import { SidebarNav } from "@/components/nav/SidebarNav";
import { CourseCard } from "@/components/courses/CourseCard";
import { CourseListJsonLd } from "@/components/seo/CourseListJsonLd";
import {
  getAllCourses,
  getEnrolledCourseIds,
  getProgressByCourseForUser,
} from "@/lib/courses/queries";
import { getUser } from "@/lib/supabase/server";
import { SITE_AUTHOR, SITE_URL } from "@/lib/seo";

const COURSES_DESCRIPTION =
  "Hands-on courses on distributed systems, agentic AI, and enterprise platforms — text lessons, labs, MCQs, and a shareable completion certificate.";

// Per-route OG image bound via Next.js metadata convention
// (app/courses/opengraph-image.tsx). We still set `images` explicitly so
// the absolute URL is canonical in the rendered <meta>.
const COURSES_OG_IMAGE = `${SITE_URL}/courses/opengraph-image`;

export const metadata: Metadata = {
  title: "Courses",
  description: COURSES_DESCRIPTION,
  keywords: [
    "online courses",
    "engineering courses",
    "agentic AI courses",
    "distributed systems courses",
    "API design courses",
    "enterprise architecture courses",
    "Rahul Gupta courses",
    "free engineering courses",
    "shareable completion certificate",
  ],
  category: "Education",
  authors: [{ name: SITE_AUTHOR, url: SITE_URL }],
  alternates: { canonical: `${SITE_URL}/courses` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/courses`,
    title: "Courses · Rahul Gupta",
    description: COURSES_DESCRIPTION,
    siteName: "Rahul Gupta — Portfolio",
    images: [
      {
        url: COURSES_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Rahul Gupta — Courses",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Courses · Rahul Gupta",
    description: COURSES_DESCRIPTION,
    creator: "@notsonoobie",
    images: [COURSES_OG_IMAGE],
  },
};

// Course catalogue moves rarely; we render at request time so newly-published
// rows show up immediately without a redeploy. RLS on courses limits to
// is_published=true so anon visitors still see the right subset.
export const dynamic = "force-dynamic";

export default async function CoursesIndexPage() {
  const [courses, user] = await Promise.all([getAllCourses(), getUser()]);
  const [progressMap, enrolledIds] = user
    ? await Promise.all([
        getProgressByCourseForUser(user.id),
        getEnrolledCourseIds(user.id),
      ])
    : [
        new Map<number, { completed: number; total: number }>(),
        new Set<number>(),
      ];

  return (
    <>
      <SidebarNav />
      <CourseListJsonLd courses={courses} />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 100% at 50% 0%, color-mix(in oklab, var(--color-cyan) 12%, transparent) 0%, transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-grid bg-grid-fade opacity-30 pointer-events-none"
        />
        <div className="relative mx-auto max-w-6xl px-6 md:px-10 pt-28 md:pt-36 pb-14 md:pb-20">
          <div className="font-mono text-[11px] tracking-[0.3em] uppercase text-cyan mb-5">
            {"// courses / v1"}
          </div>
          <h1 className="font-display text-[clamp(2.5rem,8vw,5.5rem)] leading-[0.98] tracking-[-0.025em] font-semibold">
            Build, ship, and{" "}
            <span className="text-cyan text-glow-cyan">prove it.</span>
          </h1>
          <p className="mt-6 text-ink-dim text-base md:text-lg max-w-2xl leading-relaxed">
            Episode-driven courses on distributed systems, agentic AI, and
            enterprise platforms — text lessons, hands-on labs, MCQs, and a
            shareable certificate at the finish line. Pick a track, finish it,
            put it on your résumé.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[10px] sm:text-[11px] text-ink-faint">
            <span className="inline-flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-cyan shadow-[0_0_8px_currentColor]" />
              {courses.length}{" "}
              {courses.length === 1 ? "course" : "courses"} published
            </span>
            {!user && (
              <>
                <span className="hidden sm:inline-block h-px w-5 bg-line" />
                <span className="text-ink-dim">
                  <a
                    href="/login?next=/courses"
                    className="text-cyan underline underline-offset-2"
                  >
                    sign in
                  </a>{" "}
                  to enroll, track progress, and earn a certificate
                </span>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-6 md:px-10 py-14 md:py-20">
          {courses.length === 0 ? (
            <p className="text-ink-dim font-mono text-sm">
              No courses yet — first one drops soon.
            </p>
          ) : (
            <ul className="grid gap-5 grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))]">
              {courses.map((course) => (
                <li key={course.id} className="flex">
                  <CourseCard
                    course={course}
                    enrolled={enrolledIds.has(course.id)}
                    signedIn={!!user}
                    progress={progressMap.get(course.id) ?? null}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
