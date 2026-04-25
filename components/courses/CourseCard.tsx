import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Clock, Signal } from "lucide-react";
import type { Course } from "@/lib/courses/types";
import { CourseCover } from "./CourseCover";

type Props = {
  course: Course;
  /** True when the visitor has an enrollment row for this course.
   * Drives whether the card shows progress chrome or an enroll CTA. */
  enrolled?: boolean;
  /** True when there is an authenticated user. Lets the card link
   * straight to /courses/{slug}#enroll for sign-in-then-enroll flow. */
  signedIn?: boolean;
  progress?: { completed: number; total: number } | null;
};

export function CourseCard({
  course,
  enrolled = false,
  signedIn = false,
  progress,
}: Props) {
  const total = progress?.total ?? 0;
  const completed = progress?.completed ?? 0;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const finished = total > 0 && completed === total;

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl hairline bg-canvas-2/40 hover:bg-canvas-2/70 transition-colors"
    >
      {/* Cover */}
      <div className="relative">
        <CourseCover course={course} aspect="16/10" />

        {/* Free / Premium pill — top-left over cover */}
        <span
          className={`absolute top-3 left-3 inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono text-[10px] tracking-[0.2em] uppercase backdrop-blur-sm ${
            course.isFree
              ? "bg-mint/15 text-mint border border-mint/40"
              : "bg-amber/15 text-amber border border-amber/40"
          }`}
        >
          {course.isFree ? "free" : "premium"}
        </span>

        {/* Completed badge — top-right over cover */}
        {finished && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-sm bg-cyan/20 border border-cyan/50 text-cyan px-1.5 py-0.5 font-mono text-[10px] tracking-[0.2em] uppercase backdrop-blur-sm">
            <Check className="size-3" strokeWidth={2.5} />
            done
          </span>
        )}

        {/* Hover-revealed go-to icon */}
        <span className="absolute bottom-3 right-3 inline-flex size-8 items-center justify-center rounded-full bg-canvas/80 hairline text-ink-dim opacity-0 group-hover:opacity-100 group-hover:text-cyan transition-all backdrop-blur-sm">
          <ArrowUpRight className="size-4" strokeWidth={2} />
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[10px] tracking-[0.18em] uppercase text-ink-faint mb-3">
          {course.level && (
            <span className="inline-flex items-center gap-1 text-ink-dim">
              <Signal className="size-3" strokeWidth={2} />
              {course.level}
            </span>
          )}
          {course.durationMin && (
            <span className="inline-flex items-center gap-1 text-ink-dim">
              <Clock className="size-3" strokeWidth={2} />
              {course.durationMin}m
            </span>
          )}
          {total > 0 && (
            <span className="text-ink-faint">
              {total} {total === 1 ? "episode" : "episodes"}
            </span>
          )}
        </div>

        <h3 className="font-display text-lg md:text-xl font-semibold tracking-[-0.01em] leading-snug line-clamp-2 min-h-[2.75em] group-hover:text-cyan transition-colors">
          {course.title}
        </h3>
        {course.tagline ? (
          <p className="mt-2 text-ink-dim text-[13px] leading-relaxed line-clamp-2 min-h-[3.25em]">
            {course.tagline}
          </p>
        ) : (
          <div className="mt-2 min-h-[3.25em]" aria-hidden />
        )}

        {/* Bottom strip — three states:
            1. enrolled → progress bar (started or 0%)
            2. signed in but not enrolled → "enroll" CTA
            3. anonymous → "sign in to enroll" CTA
            Showing a progress bar when the user hasn't enrolled would
            misleadingly imply they've already opted in. */}
        {enrolled && progress && total > 0 ? (
          <div className="mt-auto pt-5">
            <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.2em] uppercase mb-1.5">
              <span className="text-ink-faint">
                {completed === 0 ? "not started" : `${completed}/${total}`}
              </span>
              <span className={finished ? "text-mint" : "text-cyan"}>
                {pct}%
              </span>
            </div>
            <div className="relative h-1 rounded-full bg-canvas overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 rounded-full transition-all ${finished ? "bg-mint" : "bg-cyan"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="mt-auto pt-5">
            <div className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.22em] uppercase text-cyan group-hover:gap-2 transition-all">
              <span className="size-1.5 rounded-full bg-cyan shadow-[0_0_6px_currentColor]" />
              {signedIn ? "enroll" : "sign in to enroll"}
              <ArrowRight
                className="size-3 group-hover:translate-x-0.5 transition-transform"
                strokeWidth={2}
              />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
