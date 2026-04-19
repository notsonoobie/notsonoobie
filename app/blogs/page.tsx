import { SidebarNav } from "@/components/nav/SidebarNav";
import { getAllBlogSummaries } from "@/lib/blogs";
import { SITE_URL } from "@/lib/seo";
import { ArrowUpRight, Clock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Writing · Rahul Gupta",
  description:
    "Essays on distributed systems, agentic AI, and building enterprise-grade products at BFSI scale.",
  alternates: { canonical: `${SITE_URL}/blogs` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/blogs`,
    title: "Writing · Rahul Gupta",
    description:
      "Essays on distributed systems, agentic AI, and building enterprise-grade products at BFSI scale.",
  },
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function BlogsIndexPage() {
  const posts = await getAllBlogSummaries();
  // Only use the featured-post treatment when there are ≥3 posts; otherwise show
  // all posts in a uniform grid so the layout doesn't feel lopsided.
  const useFeatured = posts.length >= 3;
  const featured = useFeatured ? posts[0] : null;
  const rest = useFeatured ? posts.slice(1) : posts;

  return (
    <>
      <SidebarNav />
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
        <div aria-hidden className="absolute inset-0 bg-grid bg-grid-fade opacity-30 pointer-events-none" />
        <div className="relative mx-auto max-w-6xl px-6 md:px-10 pt-28 md:pt-36 pb-14 md:pb-20">
          <div className="font-mono text-[11px] tracking-[0.3em] uppercase text-cyan mb-5">
            {"// writing / v1"}
          </div>
          <h1 className="font-display text-[clamp(2.75rem,7vw,5.5rem)] leading-[0.98] tracking-[-0.025em] font-semibold">
            Notes on building<br />
            <span className="text-cyan text-glow-cyan">at enterprise scale.</span>
          </h1>
          <p className="mt-6 text-ink-dim text-base md:text-lg max-w-2xl leading-relaxed">
            Essays on distributed systems, agentic AI, enterprise API platforms — and what I learn
            along the way shipping products across BFSI and NBFC customers.
          </p>
          <div className="mt-8 flex items-center gap-3 font-mono text-[11px] text-ink-faint">
            <span className="inline-flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-cyan shadow-[0_0_8px_currentColor]" />
              {posts.length} {posts.length === 1 ? "post" : "posts"} published
            </span>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-6 md:px-10 py-14 md:py-20">
          {posts.length === 0 ? (
            <p className="text-ink-dim font-mono text-sm">No posts yet — check back soon.</p>
          ) : (
            <>
              {/* Featured post (only when ≥3 total posts) */}
              {featured ? (
                <Link
                  href={`/blogs/${featured.slug}`}
                  className="group relative block rounded-2xl hairline bg-canvas-2/40 hover:bg-canvas-2/70 transition-colors p-8 md:p-12 overflow-hidden mb-10"
                >
                  {/* Corner brackets */}
                  <span
                    aria-hidden
                    className="absolute -top-px -left-px size-6 border-l border-t border-cyan/50 rounded-tl-2xl pointer-events-none"
                  />
                  <span
                    aria-hidden
                    className="absolute -top-px -right-px size-6 border-r border-t border-cyan/50 rounded-tr-2xl pointer-events-none"
                  />

                  {/* Tint */}
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-70 pointer-events-none"
                    style={{
                      background:
                        "radial-gradient(ellipse 60% 100% at 100% 0%, color-mix(in oklab, var(--color-cyan) 10%, transparent) 0%, transparent 60%)",
                    }}
                  />

                  <div className="relative flex flex-col md:flex-row md:items-start gap-8">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 font-mono text-[10.5px] tracking-[0.25em] uppercase text-cyan mb-4">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-cyan shadow-[0_0_8px_currentColor]" />
                          latest
                        </span>
                        <span className="h-px w-5 bg-line" />
                        <span className="text-ink-faint">
                          {formatDate(featured.frontmatter.date)}
                        </span>
                        <span className="h-px w-5 bg-line" />
                        <span className="text-ink-faint inline-flex items-center gap-1.5">
                          <Clock className="size-3" strokeWidth={2} />
                          {featured.readingTime} min
                        </span>
                      </div>
                      <h2 className="font-display text-[clamp(1.75rem,3.5vw,2.75rem)] leading-[1.05] tracking-[-0.02em] font-semibold group-hover:text-cyan transition-colors">
                        {featured.frontmatter.title}
                      </h2>
                      {featured.frontmatter.description && (
                        <p className="mt-5 text-ink-dim text-base md:text-lg leading-relaxed max-w-2xl">
                          {featured.frontmatter.description}
                        </p>
                      )}
                      {featured.frontmatter.tags?.length ? (
                        <div className="mt-6 flex flex-wrap gap-1.5">
                          {featured.frontmatter.tags.map((t) => (
                            <span
                              key={t}
                              className="px-2 py-0.5 rounded-sm hairline font-mono text-[10.5px] text-ink-dim bg-canvas/60"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-7 inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] uppercase text-cyan">
                        read post
                        <ArrowUpRight className="size-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.8} />
                      </div>
                    </div>
                  </div>
                </Link>
              ) : null}

              {/* Rest */}
              {rest.length > 0 && (
                <>
                  <ul
                    className={
                      rest.length === 1
                        ? "grid gap-4"
                        : "grid gap-4 md:grid-cols-2"
                    }
                  >
                    {rest.map(({ slug, frontmatter, readingTime }) => (
                      <li key={slug}>
                        <Link
                          href={`/blogs/${slug}`}
                          className="group relative block h-full rounded-xl hairline bg-canvas-2/30 hover:bg-canvas-2/70 transition-colors p-6 overflow-hidden"
                        >
                          <div className="flex items-center gap-3 font-mono text-[10px] tracking-[0.22em] uppercase text-ink-faint mb-3">
                            <time dateTime={frontmatter.date}>
                              {formatDate(frontmatter.date)}
                            </time>
                            <span className="h-px w-5 bg-line" />
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
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
