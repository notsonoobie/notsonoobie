import Link from "next/link";
import { ArrowUpRight, Clock } from "lucide-react";
import type { BlogSummary } from "@/lib/blogs";

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Generic blog card used everywhere a `BlogSummary` lands in a list:
 * the `/blogs` grid (server-rendered first batch + client-appended
 * pages) and any future "related posts" rail. Stays a plain JSX
 * component (no `"use client"`, no `"use server"`) so both render
 * paths can call it.
 */
export function BlogCard({ post }: { post: BlogSummary }) {
  const { slug, frontmatter, readingTime } = post;
  return (
    <Link
      href={`/blogs/${slug}`}
      className="group relative block h-full rounded-xl hairline bg-canvas-2/30 hover:bg-canvas-2/70 transition-colors p-6 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pr-8 font-mono text-[10px] tracking-[0.15em] sm:tracking-[0.22em] uppercase text-ink-faint mb-3">
        <time dateTime={frontmatter.date}>
          {formatDate(frontmatter.date)}
        </time>
        <span className="hidden sm:inline-block h-px w-5 bg-line" />
        <span className="inline-flex items-center gap-1 text-ink-dim">
          <Clock className="size-3" strokeWidth={2} />
          {readingTime} min
        </span>
      </div>
      <h3 className="font-display text-lg md:text-xl font-semibold tracking-[-0.01em] leading-snug group-hover:text-cyan transition-colors">
        {frontmatter.title}
      </h3>
      {frontmatter.description && (
        <p className="mt-3 text-ink-dim text-sm leading-relaxed line-clamp-3">
          {frontmatter.description}
        </p>
      )}
      {frontmatter.tags?.length ? (
        <div className="mt-4 flex flex-wrap gap-1">
          {frontmatter.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="px-1.5 py-0.5 rounded-sm hairline font-mono text-[10px] text-ink-dim bg-canvas/60"
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}
      <ArrowUpRight
        className="absolute top-5 right-5 size-4 text-ink-dim group-hover:text-cyan group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all"
        strokeWidth={1.5}
      />
    </Link>
  );
}
