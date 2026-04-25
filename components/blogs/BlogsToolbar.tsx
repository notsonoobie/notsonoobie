"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { TagPicker } from "@/components/blogs/TagPicker";

type Tag = { tag: string; count: number };

type Props = {
  /** All tags + post counts, sorted desc by count (server-prepared). */
  tags: Tag[];
  /** Current free-text query (URL `?q=`), threaded so the input is
   * controlled and stays in sync after `router.replace`. */
  q: string;
  /** Currently selected tags from the URL (`?tags=a,b,c`). */
  selectedTags: string[];
  /** Total result count for the current filter — used in the
   * filter-active summary line ("5 results for 'kafka'"). */
  totalShown: number;
};

const SEARCH_DEBOUNCE_MS = 300;

export function BlogsToolbar({
  tags,
  q: serverQ,
  selectedTags,
  totalShown,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [draftQ, setDraftQ] = useState(serverQ);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the input controlled even when the URL changes from
  // elsewhere (tag toggle, "clear filters", browser back/forward).
  useEffect(() => {
    setDraftQ(serverQ);
  }, [serverQ]);

  function pushParams(next: { q?: string; tags?: string[] }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.q !== undefined) {
      if (next.q) params.set("q", next.q);
      else params.delete("q");
    }
    if (next.tags !== undefined) {
      // URL param is `topics` to match the user-facing label —
      // the DB column and the internal data-layer arg are still
      // called `tags`, but URLs are user-visible so we use the
      // friendlier name here.
      if (next.tags.length > 0) params.set("topics", next.tags.join(","));
      else params.delete("topics");
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function onSearchChange(value: string) {
    setDraftQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushParams({ q: value });
    }, SEARCH_DEBOUNCE_MS);
  }

  function onSubmit(e: React.FormEvent) {
    // Submit fires on Enter — short-circuit the debounce and push immediately.
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    pushParams({ q: draftQ });
  }

  function onTagsChange(next: string[]) {
    pushParams({ tags: next });
  }

  function clearAll() {
    setDraftQ("");
    pushParams({ q: "", tags: [] });
  }

  const isFiltered = !!serverQ || selectedTags.length > 0;

  return (
    <section
      aria-label="Filter posts"
      className="border-b border-line bg-canvas-2/20"
    >
      <div className="mx-auto max-w-6xl px-6 md:px-10 py-6 md:py-8">
        {/* Search + tag picker + clear */}
        <form
          onSubmit={onSubmit}
          role="search"
          className="flex flex-col sm:flex-row gap-3 sm:items-center"
        >
          <label htmlFor="blog-search" className="sr-only">
            Search posts
          </label>
          <div className="relative flex-1">
            <Search
              aria-hidden
              className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-faint"
              strokeWidth={2}
            />
            <input
              id="blog-search"
              type="search"
              value={draftQ}
              placeholder="Search"
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full h-11 rounded-md hairline bg-canvas/60 pl-10 pr-3 font-mono text-[13px] text-ink placeholder:text-ink-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            />
          </div>

          <TagPicker
            tags={tags}
            selected={selectedTags}
            onChange={onTagsChange}
          />

          {isFiltered && (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-md hairline bg-canvas/60 hover:bg-canvas font-mono text-[11px] tracking-[0.18em] uppercase text-ink-dim hover:text-cyan transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              <X className="size-3.5" strokeWidth={2} />
              clear
            </button>
          )}
        </form>

        {/* Filter summary (only when filtered) */}
        {isFiltered && (
          <p
            aria-live="polite"
            className="mt-4 font-mono text-[11px] text-ink-dim"
          >
            {totalShown} {totalShown === 1 ? "result" : "results"}
            {serverQ ? (
              <>
                {" "}for <span className="text-cyan">&ldquo;{serverQ}&rdquo;</span>
              </>
            ) : null}
            {selectedTags.length > 0 ? (
              <>
                {" "}in{" "}
                <span className="text-cyan">
                  {selectedTags.map((t) => `#${t}`).join(", ")}
                </span>
              </>
            ) : null}
          </p>
        )}
      </div>
    </section>
  );
}
