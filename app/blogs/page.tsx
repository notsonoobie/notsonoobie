import { SidebarNav } from "@/components/nav/SidebarNav";
import { BlogListJsonLd } from "@/components/seo/BlogListJsonLd";
import { BlogsGrid } from "@/components/blogs/BlogsGrid";
import { BlogsToolbar } from "@/components/blogs/BlogsToolbar";
import { getAllTags, searchBlogs } from "@/lib/blogs";
import { SITE_AUTHOR, SITE_URL } from "@/lib/seo";
import { ArrowUpRight, Clock, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

const BLOGS_DESCRIPTION =
  "Essays on distributed systems, agentic AI, and building enterprise-grade products at BFSI scale.";

const PAGE_SIZE = 9;

type SearchParams = Promise<{ q?: string; topics?: string }>;

/**
 * Parse the `?topics=a,b,c` URL param into a deduped array of tag
 * slugs. Empty strings are dropped; whitespace inside a slug isn't
 * legal but we trim defensively.
 */
function parseTopics(raw: string | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw.split(",")) {
    const trimmed = t.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { q, topics: topicsRaw } = await searchParams;
  const tags = parseTopics(topicsRaw);
  const isFiltered = !!q || tags.length > 0;

  // Per-route OG image bound via Next.js metadata convention
  // (app/blogs/opengraph-image.tsx). Set explicit absolute URLs so the
  // canonical reference ships in the rendered <meta>.
  const ogImage = `${SITE_URL}/blogs/opengraph-image`;
  const base: Metadata = {
    title: "Writing",
    description: BLOGS_DESCRIPTION,
    keywords: [
      "Rahul Gupta blog",
      "distributed systems essays",
      "agentic AI writing",
      "API management",
      "enterprise architecture",
      "BFSI engineering",
      "software engineering essays",
      "platform engineering",
    ],
    category: "Technology",
    authors: [{ name: SITE_AUTHOR, url: SITE_URL }],
    alternates: {
      canonical: `${SITE_URL}/blogs`,
      types: { "application/rss+xml": `${SITE_URL}/sitemap.xml` },
    },
    openGraph: {
      type: "website",
      url: `${SITE_URL}/blogs`,
      title: "Writing · Rahul Gupta",
      description: BLOGS_DESCRIPTION,
      siteName: "Rahul Gupta — Portfolio",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: "Rahul Gupta — Writing",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Writing · Rahul Gupta",
      description: BLOGS_DESCRIPTION,
      creator: "@notsonoobie",
      images: [ogImage],
    },
  };

  // Filtered URLs are still crawl-able (so search engines walk the
  // tag chips and discover the underlying posts) but not indexable —
  // we don't want N filter combos competing with the canonical
  // /blogs URL in the SERP.
  if (isFiltered) {
    return { ...base, robots: { index: false, follow: true } };
  }
  return base;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function BlogsIndexPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q = "", topics: topicsRaw } = await searchParams;
  const tags = parseTopics(topicsRaw);
  const isFiltered = !!q || tags.length > 0;

  const [first, allTags] = await Promise.all([
    searchBlogs({ q, tags, page: 1, pageSize: PAGE_SIZE }),
    getAllTags(),
  ]);

  // Featured-card treatment: only on the unfiltered first view AND
  // only when there's enough content to make the asymmetric layout
  // feel intentional. With a filter active, splitting the result set
  // into "highlight + rest" reads as noise.
  const useFeatured = !isFiltered && first.items.length >= 3;
  const featured = useFeatured ? first.items[0] : null;
  const gridItems = useFeatured ? first.items.slice(1) : first.items;
  const featuredOffset = useFeatured ? 1 : 0;

  return (
    <>
      <SidebarNav />
      <BlogListJsonLd posts={first.items} />

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
        <div
          aria-hidden
          className="absolute inset-0 bg-grid bg-grid-fade opacity-30 pointer-events-none"
        />
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
              {first.total}{" "}
              {first.total === 1
                ? isFiltered
                  ? "match"
                  : "post"
                : isFiltered
                  ? "matches"
                  : "posts"}{" "}
              {isFiltered ? "found" : "published"}
            </span>
          </div>
        </div>
      </section>

      <BlogsToolbar
        tags={allTags}
        q={q}
        selectedTags={tags}
        totalShown={first.total}
      />

      {/* Content */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-6 md:px-10 py-14 md:py-20">
          {first.total === 0 ? (
            <div className="rounded-xl hairline bg-canvas-2/40 px-6 py-12 text-center max-w-xl mx-auto">
              <SearchX
                className="size-8 text-ink-faint mx-auto"
                strokeWidth={1.5}
                aria-hidden
              />
              <p className="mt-4 text-ink text-base font-medium">
                No posts match these filters.
              </p>
              <p className="mt-2 text-ink-dim text-[13px] leading-relaxed">
                Try a broader search term or clear the active filters.
              </p>
              <Link
                href="/blogs"
                className="mt-6 inline-flex items-center gap-1.5 rounded-md hairline bg-canvas/60 hover:bg-canvas h-10 px-4 font-mono text-[11px] tracking-[0.18em] uppercase text-cyan transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
              >
                clear filters
              </Link>
            </div>
          ) : (
            <>
              {featured ? (
                <Link
                  href={`/blogs/${featured.slug}`}
                  className="group relative block rounded-2xl hairline bg-canvas-2/40 hover:bg-canvas-2/70 transition-colors p-8 md:p-12 overflow-hidden mb-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                >
                  <span
                    aria-hidden
                    className="absolute -top-px -left-px size-6 border-l border-t border-cyan/50 rounded-tl-2xl pointer-events-none"
                  />
                  <span
                    aria-hidden
                    className="absolute -top-px -right-px size-6 border-r border-t border-cyan/50 rounded-tr-2xl pointer-events-none"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-[0.045] pointer-events-none"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(45deg, transparent 0, transparent 7px, var(--color-cyan) 7px, var(--color-cyan) 8px)",
                    }}
                  />
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
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[10.5px] tracking-[0.18em] sm:tracking-[0.25em] uppercase text-cyan mb-4">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-cyan shadow-[0_0_8px_currentColor]" />
                          latest
                        </span>
                        <span className="hidden sm:inline-block h-px w-5 bg-line" />
                        <span className="text-ink-faint">
                          {formatDate(featured.frontmatter.date)}
                        </span>
                        <span className="hidden sm:inline-block h-px w-5 bg-line" />
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
                        <ArrowUpRight
                          className="size-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform"
                          strokeWidth={1.8}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              ) : null}

              <BlogsGrid
                initial={gridItems}
                initialHasMore={first.hasMore}
                initialTotal={first.total}
                q={q || undefined}
                tags={tags}
                featuredOffset={featuredOffset}
              />
            </>
          )}
        </div>
      </section>
    </>
  );
}
