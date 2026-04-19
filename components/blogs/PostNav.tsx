import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { BlogSummary } from "@/lib/blogs";

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
      className={`mt-16 grid gap-4 border-t border-line pt-10 ${
        bothPresent ? "sm:grid-cols-2" : "sm:grid-cols-1"
      }`}
    >
      {previous && (
        <Link
          href={`/blogs/${previous.slug}`}
          className="group relative rounded-xl hairline bg-canvas-2/40 hover:bg-canvas-2 p-5 transition-colors"
        >
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.25em] uppercase text-ink-faint mb-3">
            <ArrowLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform" />
            previous
          </div>
          <div className="font-display text-base md:text-lg leading-tight group-hover:text-cyan transition-colors">
            {previous.frontmatter.title}
          </div>
        </Link>
      )}
      {next && (
        <Link
          href={`/blogs/${next.slug}`}
          className="group relative rounded-xl hairline bg-canvas-2/40 hover:bg-canvas-2 p-5 transition-colors text-right"
        >
          <div className="flex items-center justify-end gap-2 font-mono text-[10px] tracking-[0.25em] uppercase text-ink-faint mb-3">
            next
            <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="font-display text-base md:text-lg leading-tight group-hover:text-cyan transition-colors">
            {next.frontmatter.title}
          </div>
        </Link>
      )}
    </nav>
  );
}
