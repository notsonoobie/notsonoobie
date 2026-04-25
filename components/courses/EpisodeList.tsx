import Link from "next/link";
import { Check, Lock } from "lucide-react";
import type { Episode, SectionWithEpisodes } from "@/lib/courses/types";
import { EpisodeKindBadge } from "./EpisodeKindBadge";

type Props = {
  courseSlug: string;
  sections: SectionWithEpisodes[];
  completedIds?: Set<number>;
  locked?: boolean;
  /** Whether the lock is because the user isn't signed in or because they
   * aren't enrolled. Affects the badge wording + the redirect target. */
  lockReason?: "signin" | "enroll";
};

export function EpisodeList({
  courseSlug,
  sections,
  completedIds,
  locked = false,
  lockReason = "signin",
}: Props) {
  return (
    <div className="space-y-6">
      {sections.map((section, sIdx) => {
        const total = section.episodes.length;
        const done = section.episodes.filter((ep) =>
          completedIds?.has(ep.id) ?? false
        ).length;
        const sectionNum = String(sIdx + 1).padStart(2, "0");
        return (
          <section
            key={section.id}
            className="rounded-xl hairline overflow-hidden bg-canvas-2/30"
            aria-labelledby={`section-${section.id}-title`}
          >
            <header className="flex items-center justify-between gap-3 px-5 py-3 bg-canvas-2/60 border-b border-line">
              <div className="min-w-0">
                <div className="font-mono text-[10.5px] text-cyan tracking-[0.22em] uppercase mb-0.5">
                  {`// section ${sectionNum}`}
                </div>
                <h3
                  id={`section-${section.id}-title`}
                  className="font-display text-base md:text-lg font-semibold tracking-[-0.01em] truncate"
                >
                  {section.title}
                </h3>
                {section.description && (
                  <p className="mt-1 text-ink-dim text-[12.5px] leading-relaxed line-clamp-2">
                    {section.description}
                  </p>
                )}
              </div>
              <span className="font-mono text-[10.5px] text-ink-faint tracking-[0.18em] uppercase whitespace-nowrap">
                {completedIds ? `${done}/${total}` : `${total} ${total === 1 ? "ep" : "eps"}`}
              </span>
            </header>

            {total === 0 ? (
              <p className="px-5 py-4 text-ink-dim font-mono text-xs">
                No episodes in this section yet.
              </p>
            ) : (
              <ol className="divide-y divide-line">
                {section.episodes.map((ep, i) => (
                  <EpisodeListItem
                    key={ep.id}
                    courseSlug={courseSlug}
                    episode={ep}
                    indexInSection={i}
                    completed={completedIds?.has(ep.id) ?? false}
                    showCompletion={!!completedIds}
                    locked={locked}
                    lockReason={lockReason}
                  />
                ))}
              </ol>
            )}
          </section>
        );
      })}
    </div>
  );
}

type ItemProps = {
  courseSlug: string;
  episode: Episode;
  indexInSection: number;
  completed: boolean;
  showCompletion: boolean;
  locked: boolean;
  lockReason: "signin" | "enroll";
};

function EpisodeListItem({
  courseSlug,
  episode: ep,
  indexInSection,
  completed,
  showCompletion,
  locked,
  lockReason,
}: ItemProps) {
  const num = String(indexInSection + 1).padStart(2, "0");
  const target = `/courses/${courseSlug}/${ep.slug}`;
  const href = locked
    ? lockReason === "enroll"
      ? `/courses/${courseSlug}#enroll`
      : `/login?next=${encodeURIComponent(target)}`
    : target;
  return (
    <li>
      <Link
        href={href}
        className="group flex items-start gap-4 px-5 py-4 bg-canvas-2/40 hover:bg-canvas-2/70 transition-colors"
      >
        <span
          className={`mt-0.5 inline-flex items-center justify-center size-6 shrink-0 rounded-full font-mono text-[11px] ${
            showCompletion && completed
              ? "bg-cyan/15 text-cyan border border-cyan/40"
              : "bg-canvas hairline text-ink-faint"
          }`}
        >
          {showCompletion && completed ? (
            <Check className="size-3.5" strokeWidth={2.5} />
          ) : (
            num
          )}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <EpisodeKindBadge kind={ep.kind} />
            {locked && (
              <span className="inline-flex items-center gap-1 rounded-sm border border-amber/40 text-amber bg-amber/5 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.18em] uppercase">
                <Lock className="size-3" strokeWidth={2} />
                {lockReason === "enroll" ? "enroll" : "sign in"}
              </span>
            )}
          </div>
          <h4 className="font-display text-base md:text-lg font-semibold leading-snug tracking-[-0.01em] group-hover:text-cyan transition-colors">
            {ep.title}
          </h4>
          {ep.description && (
            <p className="mt-1 text-ink-dim text-[13px] leading-relaxed line-clamp-2">
              {ep.description}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}
