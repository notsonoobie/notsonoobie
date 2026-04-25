import { Clock, Signal } from "lucide-react";
import type { Course } from "@/lib/courses/types";
import { CourseCover } from "./CourseCover";
import { Breadcrumbs } from "./Breadcrumbs";
import { VideoPlayer } from "./VideoPlayer";

export function CourseHeader({ course }: { course: Course }) {
  // The detail page upgrades the static cover to a playable hero when
  // BOTH banner and video are present. The list view never reaches this
  // component, so the constraint "video requires banner" is enforced at
  // the data layer + reasserted here as a defensive guard.
  const hasHeroVideo = !!course.coverImageUrl && !!course.courseVideoUrl;
  return (
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
      <div className="relative mx-auto max-w-5xl px-6 md:px-10 pt-24 md:pt-32 pb-12 md:pb-16">
        <Breadcrumbs
          className="mb-6"
          items={[
            { href: "/", label: "home" },
            { href: "/courses", label: "courses" },
            { label: course.title },
          ]}
        />

        <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
          {/* Title block */}
          <div className="min-w-0">
            <div className="font-mono text-[11px] tracking-[0.3em] uppercase text-cyan mb-4">
              {"// course"}
              {course.isFree ? " / free" : " / premium"}
            </div>
            <h1 className="font-display text-[clamp(2rem,5.5vw,3.75rem)] leading-[1.02] tracking-[-0.025em] font-semibold">
              {course.title}
            </h1>
            {course.tagline && (
              <p className="mt-5 text-ink-dim text-base md:text-lg max-w-2xl leading-relaxed">
                {course.tagline}
              </p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] text-ink-faint">
              {course.level && (
                <span className="inline-flex items-center gap-1.5">
                  <Signal className="size-3" strokeWidth={2} />
                  {course.level}
                </span>
              )}
              {course.durationMin && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3" strokeWidth={2} />
                  {course.durationMin} min
                </span>
              )}
            </div>
          </div>

          {/* Cover / video — hidden on mobile to keep the hero compact.
              When `courseVideoUrl` is set, swap the static cover for a
              video player using the cover as the poster frame. The
              underlying banner-only path is preserved so courses
              without video render exactly like before. */}
          <div className="hidden lg:block w-full overflow-hidden rounded-xl hairline shadow-[0_20px_80px_-30px_rgba(0,229,255,0.25)]">
            {hasHeroVideo ? (
              <VideoPlayer
                src={course.courseVideoUrl!}
                poster={course.coverImageUrl ?? undefined}
                title={course.title}
                eyebrow={course.tagline ?? "Course intro"}
              />
            ) : (
              <CourseCover course={course} aspect="4/3" priority />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
