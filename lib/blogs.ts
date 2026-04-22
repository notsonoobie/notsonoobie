import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import matter from "gray-matter";
import { importPage } from "nextra/pages";
import type { ComponentType } from "react";

export type BlogFrontmatter = {
  title: string;
  date: string;
  /** Optional ISO date of last update — falls back to `date` if absent. */
  updated?: string;
  description: string;
  tags?: string[];
  author?: string;
  authorTitle?: string;
  draft?: boolean;
};

export type TocHeading = {
  value: string;
  id: string;
  depth: number;
};

export type BlogSummary = {
  slug: string;
  frontmatter: BlogFrontmatter;
  readingTime: number;
  wordCount: number;
};

export type LoadedBlog = {
  default: ComponentType;
  frontmatter: BlogFrontmatter;
  toc: TocHeading[];
  readingTime: number;
  wordCount: number;
};

const BLOG_DIR = join(process.cwd(), "content", "blogs");
const WORDS_PER_MINUTE = 220;

export async function getBlogSlugs(): Promise<string[]> {
  try {
    const entries = await readdir(BLOG_DIR, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith(".mdx") && !e.name.startsWith("_"))
      .map((e) => e.name.replace(/\.mdx$/, ""));
  } catch {
    return [];
  }
}

async function getReadingStats(
  slug: string,
): Promise<{ readingTime: number; wordCount: number }> {
  try {
    const raw = await readFile(join(BLOG_DIR, `${slug}.mdx`), "utf8");
    const { content } = matter(raw);
    const stripped = content
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/[#>*_`~\-\[\]\(\)]/g, " ");
    const wordCount = stripped.trim().split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
    return { readingTime, wordCount };
  } catch {
    return { readingTime: 1, wordCount: 0 };
  }
}

export async function readBlog(slug: string): Promise<LoadedBlog | null> {
  try {
    const result = await importPage(["blogs", slug]);
    const fm = (result.metadata ?? {}) as Partial<BlogFrontmatter>;
    if (!fm.title || !fm.date) return null;
    const { readingTime, wordCount } = await getReadingStats(slug);
    const toc = Array.isArray(result.toc) ? (result.toc as TocHeading[]) : [];
    return {
      default: result.default as ComponentType,
      frontmatter: fm as BlogFrontmatter,
      toc,
      readingTime,
      wordCount,
    };
  } catch {
    return null;
  }
}

export async function getAllBlogSummaries(): Promise<BlogSummary[]> {
  const slugs = await getBlogSlugs();
  const summaries: BlogSummary[] = [];
  for (const slug of slugs) {
    const loaded = await readBlog(slug);
    if (!loaded || loaded.frontmatter.draft) continue;
    summaries.push({
      slug,
      frontmatter: loaded.frontmatter,
      readingTime: loaded.readingTime,
      wordCount: loaded.wordCount,
    });
  }
  summaries.sort(
    (a, b) => +new Date(b.frontmatter.date) - +new Date(a.frontmatter.date),
  );
  return summaries;
}

export function getAdjacentBlogs(summaries: BlogSummary[], slug: string) {
  const idx = summaries.findIndex((s) => s.slug === slug);
  return {
    previous: idx > 0 ? summaries[idx - 1] : null,
    next: idx < summaries.length - 1 && idx >= 0 ? summaries[idx + 1] : null,
  };
}
