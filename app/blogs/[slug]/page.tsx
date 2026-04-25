import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";
import {
  getAllBlogSummaries,
  getAdjacentBlogs,
  getBlogSlugs,
  readBlog,
} from "@/lib/blogs";
import { BlogJsonLd } from "@/components/seo/BlogJsonLd";
import { renderBlogMarkdown } from "@/components/blogs/BlogMarkdown";
import { ReadingProgress } from "@/components/blogs/ReadingProgress";
import { PostTOC } from "@/components/blogs/PostTOC";
import { PostShare } from "@/components/blogs/PostShare";
import { PostNav } from "@/components/blogs/PostNav";
import { SITE_AUTHOR, SITE_URL } from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const slugs = await getBlogSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const blog = await readBlog(slug);
  if (!blog) return {};
  const url = `${SITE_URL}/blogs/${slug}`;
  const modified = blog.frontmatter.updated ?? blog.frontmatter.date;
  const authorName = blog.frontmatter.author ?? SITE_AUTHOR;
  // Per-post OG bound by Next.js metadata convention. We set the
  // absolute URL explicitly so unfurlers (LinkedIn, Slack, X) ship the
  // canonical OG even when metadataBase changes per environment.
  const ogImage = `${url}/opengraph-image`;
  // Pick a single article section. Schema.org expects a string, not an
  // array — first tag is the most specific, fall back to a generic
  // "Engineering" if the post has no tags.
  const section = blog.frontmatter.tags?.[0] ?? "Engineering";
  return {
    title: blog.frontmatter.title,
    description: blog.frontmatter.description,
    keywords: blog.frontmatter.tags,
    category: "Technology",
    authors: [{ name: authorName, url: SITE_URL }],
    alternates: { canonical: url },
    // Posts are explicitly indexable (the inheritance from the root
    // layout is fine, but explicit signal here pins the rich-result
    // hints — `max-image-preview: large` ensures Google surfaces the
    // 1200×630 OG render rather than a thumbnail crop).
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "article",
      url,
      title: blog.frontmatter.title,
      description: blog.frontmatter.description,
      siteName: "Rahul Gupta — Portfolio",
      publishedTime: blog.frontmatter.date,
      modifiedTime: modified,
      authors: [authorName],
      section,
      tags: blog.frontmatter.tags,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: blog.frontmatter.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: blog.frontmatter.title,
      description: blog.frontmatter.description,
      creator: "@notsonoobie",
      images: [ogImage],
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const blog = await readBlog(slug);
  if (!blog) notFound();

  const summaries = await getAllBlogSummaries();
  const { previous, next } = getAdjacentBlogs(summaries, slug);

  const { bodyMd, frontmatter, readingTime, wordCount } = blog;
  // Single pipeline pass: returns the rendered React tree AND the
  // table-of-contents headings. PostTOC needs the latter; the article
  // section renders the former.
  const { body, toc } = await renderBlogMarkdown(bodyMd);
  const postUrl = `${SITE_URL}/blogs/${slug}`;

  return (
    <>
      <ReadingProgress />
      <BlogJsonLd
        frontmatter={frontmatter}
        slug={slug}
        readingTime={readingTime}
        wordCount={wordCount}
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        {/* Ambient glow */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 90% at 50% 0%, color-mix(in oklab, var(--color-cyan) 14%, transparent) 0%, transparent 65%)",
          }}
        />
        {/* Dotted grid */}
        <div aria-hidden className="absolute inset-0 bg-grid bg-grid-fade opacity-30 pointer-events-none" />

        <div className="relative mx-auto max-w-4xl px-6 md:px-10 pt-28 md:pt-32 pb-16">
          <Link
            href="/blogs"
            className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.2em] uppercase text-ink-dim hover:text-cyan transition-colors mb-8"
          >
            <ArrowLeft className="size-3.5" />
            back to writing
          </Link>

          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] tracking-[0.18em] uppercase text-ink-faint mb-5">
            <time dateTime={frontmatter.date}>
              {new Date(frontmatter.date).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </time>
            <span className="h-px w-6 bg-line" />
            <span className="inline-flex items-center gap-1.5 text-mint">
              <Clock className="size-3" strokeWidth={2} />
              {readingTime} min read
            </span>
            {frontmatter.tags?.length ? (
              <>
                <span className="h-px w-6 bg-line" />
                <span className="text-cyan">{frontmatter.tags.slice(0, 3).join(" · ")}</span>
              </>
            ) : null}
          </div>

          <h1 className="font-display text-[clamp(2.25rem,5.5vw,4rem)] leading-[1.03] tracking-[-0.025em] font-semibold">
            {frontmatter.title}
          </h1>

          {frontmatter.description && (
            <p className="mt-6 text-ink-dim text-lg md:text-xl leading-relaxed max-w-3xl">
              {frontmatter.description}
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-full hairline grid place-items-center font-mono text-[10px] tracking-[0.2em] text-cyan bg-canvas-2/60">
                RG
              </div>
              <div className="font-mono text-[11px] leading-snug">
                <div className="text-ink">{frontmatter.author ?? "Rahul Gupta"}</div>
                {frontmatter.authorTitle && (
                  <div className="mt-1 text-ink-faint">{frontmatter.authorTitle}</div>
                )}
              </div>
            </div>
            <PostShare url={postUrl} title={frontmatter.title} />
          </div>
        </div>
      </section>

      {/* Content + TOC */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-6 md:px-10 py-16 md:py-20 xl:flex xl:gap-12 xl:justify-center">
          <article className="max-w-3xl mx-auto xl:mx-0 min-w-0">
            <div className="blog-prose">{body}</div>

            <footer className="mt-16 py-8 border-t border-line">
              <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-[11px] text-ink-dim">
                <span>— {frontmatter.author ?? "Rahul Gupta"}</span>
                <PostShare url={postUrl} title={frontmatter.title} />
              </div>
            </footer>

            <PostNav previous={previous} next={next} />
          </article>

          <PostTOC toc={toc} />
        </div>
      </section>
    </>
  );
}
