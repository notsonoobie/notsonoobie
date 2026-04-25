import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Course } from "@/lib/courses/types";
import { CourseCover } from "./CourseCover";

type Props = {
  /** All courses in the catalogue (already filtered to is_published). */
  all: Course[];
  /** Slug of the course currently being viewed — excluded from the
   * suggestions so we don't recommend the page back to itself. */
  currentSlug: string;
};

/**
 * Compact "more courses" rail rendered at the bottom of a course detail
 * page. Pure topical clustering: the top 3 other published courses by
 * sort order. Skipped when fewer than 2 alternatives exist (a single
 * card on its own looks like an accident).
 *
 * Surfaces are: thumbnail (16/10), title (1 line), level/duration meta,
 * arrow CTA — light enough that the visitor can still focus on the
 * primary course without the rail competing for attention.
 */
export function RelatedCourses({ all, currentSlug }: Props) {
  const others = all.filter((c) => c.slug !== currentSlug).slice(0, 3);
  if (others.length < 2) return null;

  return (
    <section
      aria-labelledby="related-courses-heading"
      className="mt-12 pt-10 border-t border-line"
    >
      <div className="flex items-baseline justify-between gap-3 mb-5">
        <div>
          <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-cyan mb-1">
            {"// keep going"}
          </div>
          <h2
            id="related-courses-heading"
            className="font-display text-lg font-semibold tracking-[-0.01em]"
          >
            More courses
          </h2>
        </div>
        <Link
          href="/courses"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] text-ink-dim hover:text-cyan transition-colors focus-visible:outline-none focus-visible:text-cyan"
        >
          all courses
          <ArrowRight className="size-3" strokeWidth={2} />
        </Link>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {others.map((c) => (
          <li key={c.id}>
            <Link
              href={`/courses/${c.slug}`}
              className="group block h-full overflow-hidden rounded-xl hairline bg-canvas-2/40 hover:bg-canvas-2/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              <CourseCover course={c} aspect="16/10" />
              <div className="p-4">
                <h3 className="font-display text-sm font-semibold leading-snug tracking-[-0.01em] line-clamp-1 group-hover:text-cyan transition-colors">
                  {c.title}
                </h3>
                <div className="mt-2 flex items-center gap-x-3 gap-y-1 font-mono text-[10px] tracking-[0.18em] uppercase text-ink-faint">
                  {c.level && <span className="text-ink-dim">{c.level}</span>}
                  {c.durationMin && <span>{c.durationMin}m</span>}
                  <span className={c.isFree ? "text-mint" : "text-amber"}>
                    {c.isFree ? "free" : "premium"}
                  </span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
