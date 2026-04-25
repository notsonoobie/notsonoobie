"use client";

import { useEffect, useState } from "react";
import { ArrowDown, Check, Loader2 } from "lucide-react";
import { BlogCard } from "@/components/blogs/BlogCard";
import { loadMoreBlogs } from "@/app/blogs/actions";
import type { BlogSummary } from "@/lib/blogs";

type Props = {
  /** Server-rendered first batch — already includes the featured
   * post when not filtered (the page slices it off so this list is
   * just the grid). */
  initial: BlogSummary[];
  /** Whether the server thinks there's a page 2. Drives the initial
   * "load more" button visibility. */
  initialHasMore: boolean;
  /** Total result count from the server (for "X left" hint). */
  initialTotal: number;
  /** Filter state — threaded so the action knows what to re-query. */
  q?: string;
  tags: string[];
  /** Number of items the page rendered above the grid (the featured
   * card, when present). Used to keep the "X left" math right. */
  featuredOffset: number;
};

export function BlogsGrid({
  initial,
  initialHasMore,
  initialTotal,
  q,
  tags,
  featuredOffset,
}: Props) {
  const [items, setItems] = useState(initial);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  // Reset on filter change. The page server-renders the new initial
  // batch and React reuses this component instance because the
  // surrounding tree shape is the same — so we have to manually
  // sync state with the new props. Tags array is normalized to a
  // joined string in the dep list so reference-fresh array literals
  // (which the parent rebuilds on every render) don't trigger the
  // effect when the contents are unchanged.
  const tagsKey = tags.join(",");
  useEffect(() => {
    setItems(initial);
    setPage(1);
    setHasMore(initialHasMore);
    setAnnouncement("");
  }, [initial, initialHasMore, q, tagsKey]);

  async function onLoadMore() {
    setLoading(true);
    try {
      const next = await loadMoreBlogs({ q, tags, page: page + 1 });
      setItems((prev) => [...prev, ...next.items]);
      setPage(page + 1);
      setHasMore(next.hasMore);
      setAnnouncement(`Loaded ${next.items.length} more posts`);
    } catch (err) {
      console.error("[BlogsGrid] loadMore", err);
      setAnnouncement("Couldn't load more posts. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (initialTotal === 0) {
    // Empty state — handled by the page wrapper, kept here as a guard
    // so the grid renders nothing rather than an empty <ul>.
    return null;
  }

  const shownCount = featuredOffset + items.length;
  const remaining = Math.max(0, initialTotal - shownCount);

  return (
    <>
      <ul
        className={items.length === 1 ? "grid gap-4" : "grid gap-4 md:grid-cols-2"}
      >
        {items.map((post) => (
          <li key={post.slug}>
            <BlogCard post={post} />
          </li>
        ))}
      </ul>

      <div className="mt-10 flex flex-col items-center gap-2">
        {hasMore ? (
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loading}
            aria-busy={loading}
            className="inline-flex items-center gap-2 rounded-md hairline bg-canvas-2/60 hover:bg-canvas-2 hover:text-cyan h-11 px-5 font-mono text-[12px] tracking-[0.18em] uppercase text-ink-dim transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" strokeWidth={2} />
                loading…
              </>
            ) : (
              <>
                <ArrowDown className="size-4" strokeWidth={2} />
                load more
                {remaining > 0 && (
                  <span className="text-ink-faint">· {remaining} left</span>
                )}
              </>
            )}
          </button>
        ) : (
          items.length > 0 && (
            <p className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] uppercase text-ink-faint">
              <Check className="size-3.5 text-mint" strokeWidth={2} />
              you&rsquo;re all caught up
            </p>
          )
        )}
        <span className="sr-only" aria-live="polite">
          {announcement}
        </span>
      </div>
    </>
  );
}
