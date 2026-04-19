import type { BlogSummary } from "@/lib/blogs";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import Link from "next/link";

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function PostNav({
  previous,
  next,
}: {
  previous: BlogSummary | null;
  next: BlogSummary | null;
}) {
  if (!previous && !next) return null;
  const bothPresent = Boolean(previous) && Boolean(next);

  return (
    <nav
      aria-label="Post navigation"
      className="mt-0 border-t border-line pt-10"
    >
      <div
        className={`grid gap-4 ${
          bothPresent ? "sm:grid-cols-2" : "sm:grid-cols-1"
        }`}
      >
        {previous && <PostNavCard direction="previous" post={previous} />}
        {next && <PostNavCard direction="next" post={next} />}
      </div>
    </nav>
  );
}

function PostNavCard({
  direction,
  post,
}: {
  direction: "previous" | "next";
  post: BlogSummary;
}) {
  const isPrev = direction === "previous";
  const Arrow = isPrev ? ArrowLeft : ArrowRight;
  const alignClass = isPrev ? "text-left" : "text-right";
  const flexClass = isPrev ? "" : "justify-end";

  return (
    <Link
      href={`/blogs/${post.slug}`}
      className={`group relative block rounded-xl border border-line bg-canvas-2/40 hover:border-cyan/60 hover:bg-canvas-2/80 transition-all overflow-hidden ${alignClass}`}
    >
      {/* Corner glow that intensifies on hover */}
      <div
        aria-hidden
        className={`absolute ${
          isPrev ? "-left-16 -top-16" : "-right-16 -top-16"
        } size-48 rounded-full opacity-0 group-hover:opacity-70 transition-opacity duration-500 pointer-events-none blur-3xl`}
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--color-cyan) 45%, transparent) 0%, transparent 65%)",
        }}
      />
      {/* Diagonal cyan tint on hover */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: isPrev
            ? "linear-gradient(135deg, color-mix(in oklab, var(--color-cyan) 6%, transparent) 0%, transparent 60%)"
            : "linear-gradient(225deg, color-mix(in oklab, var(--color-cyan) 6%, transparent) 0%, transparent 60%)",
        }}
      />

      <div className="relative p-5 md:p-6">
        {/* Direction row */}
        <div className={`flex items-center gap-3 ${flexClass} mb-4`}>
          {isPrev && (
            <span className="inline-flex items-center justify-center size-8 rounded-full border border-cyan/40 bg-canvas text-cyan group-hover:-translate-x-1 group-hover:bg-cyan group-hover:text-canvas group-hover:shadow-[0_0_16px_-2px_var(--color-cyan)] transition-all duration-300">
              <Arrow className="size-4" strokeWidth={2} />
            </span>
          )}
          <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-ink-faint">
            {direction}
          </span>
          {!isPrev && (
            <span className="inline-flex items-center justify-center size-8 rounded-full border border-cyan/40 bg-canvas text-cyan group-hover:translate-x-1 group-hover:bg-cyan group-hover:text-canvas group-hover:shadow-[0_0_16px_-2px_var(--color-cyan)] transition-all duration-300">
              <Arrow className="size-4" strokeWidth={2} />
            </span>
          )}
        </div>

        {/* Title */}
        <h4 className="font-display text-base md:text-lg font-semibold leading-snug tracking-[-0.01em] text-ink group-hover:text-cyan transition-colors duration-200 line-clamp-2">
          {post.frontmatter.title}
        </h4>

        {/* Meta row */}
        <div
          className={`mt-4 flex items-center gap-2.5 ${flexClass} font-mono text-[10.5px] text-ink-faint`}
        >
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" strokeWidth={2} />
            {post.readingTime} min
          </span>
          <span className="size-[3px] rounded-full bg-line" />
          <time dateTime={post.frontmatter.date}>
            {formatDate(post.frontmatter.date)}
          </time>
          {post.frontmatter.tags?.[0] && (
            <>
              <span className="size-[3px] rounded-full bg-line" />
              <span className="text-cyan/80">#{post.frontmatter.tags[0]}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
