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
import { ReadingProgress } from "@/components/blogs/ReadingProgress";
import { PostTOC } from "@/components/blogs/PostTOC";
import { PostShare } from "@/components/blogs/PostShare";
import { PostNav } from "@/components/blogs/PostNav";
import { SITE_URL } from "@/lib/seo";

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
  return {
    title: blog.frontmatter.title,
    description: blog.frontmatter.description,
    authors: [{ name: blog.frontmatter.author ?? "Rahul Gupta" }],
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: blog.frontmatter.title,
      description: blog.frontmatter.description,
      publishedTime: blog.frontmatter.date,
      authors: [blog.frontmatter.author ?? "Rahul Gupta"],
      tags: blog.frontmatter.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: blog.frontmatter.title,
      description: blog.frontmatter.description,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const blog = await readBlog(slug);
  if (!blog) notFound();

  const summaries = await getAllBlogSummaries();
  const { previous, next } = getAdjacentBlogs(summaries, slug);

  const { default: MDXContent, frontmatter, toc, readingTime } = blog;
  const postUrl = `${SITE_URL}/blogs/${slug}`;

  return (
    <>
      <ReadingProgress />
      <BlogJsonLd frontmatter={frontmatter} slug={slug} />

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
            <div className="blog-prose">
              <MDXContent />
            </div>

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
