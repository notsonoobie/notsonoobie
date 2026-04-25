import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * Frontmatter shape — kept identical to the legacy MDX-file API so
 * downstream consumers (page render, OG image, JSON-LD, sitemap) don't
 * have to learn a new vocabulary. The DB columns map to these fields
 * via `mapBlog` below.
 */
export type BlogFrontmatter = {
  title: string;
  /** ISO date string — `published_at` in the DB. */
  date: string;
  /** Optional ISO date — `updated_at` in the DB. Falls back to `date`
   * when callers want a "last touched" timestamp. */
  updated?: string;
  description: string;
  tags?: string[];
  author?: string;
  authorTitle?: string;
  /** True when the row is `is_published = false`. Surfaces only when a
   * privileged caller fetches an unpublished row — public reads here
   * filter to `is_published = true`. */
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
  /** Raw markdown body — the renderer (`renderBlogMarkdown`) compiles
   * it on demand. The legacy MDX pipeline emitted a pre-built React
   * component here; that's gone now since posts are no longer MDX. */
  bodyMd: string;
  frontmatter: BlogFrontmatter;
  readingTime: number;
  wordCount: number;
};

type BlogRow = {
  slug: string;
  title: string;
  description: string;
  body_md: string;
  author: string;
  author_title: string | null;
  cover_image_url: string | null;
  tags: string[];
  reading_time: number;
  word_count: number;
  is_published: boolean;
  published_at: string;
  updated_at: string | null;
};

const SUMMARY_COLUMNS =
  "slug, title, description, author, author_title, tags, reading_time, word_count, is_published, published_at, updated_at";

const FULL_COLUMNS = `${SUMMARY_COLUMNS}, body_md, cover_image_url`;

function mapFrontmatter(row: BlogRow): BlogFrontmatter {
  return {
    title: row.title,
    date: row.published_at,
    updated: row.updated_at ?? undefined,
    description: row.description,
    tags: row.tags && row.tags.length > 0 ? row.tags : undefined,
    author: row.author,
    authorTitle: row.author_title ?? undefined,
    draft: !row.is_published,
  };
}

function mapSummary(row: BlogRow): BlogSummary {
  return {
    slug: row.slug,
    frontmatter: mapFrontmatter(row),
    readingTime: row.reading_time,
    wordCount: row.word_count,
  };
}

function mapBlog(row: BlogRow): LoadedBlog {
  return {
    bodyMd: row.body_md,
    frontmatter: mapFrontmatter(row),
    readingTime: row.reading_time,
    wordCount: row.word_count,
  };
}

// Every blog read goes through the service-role client. Blogs carry no
// per-user state — there's no tenancy to enforce, no signed-in vs
// signed-out gating beyond `is_published`, which we filter on
// explicitly. Using the cookie-aware client would force every caller
// to be a request-context route (no `generateStaticParams`, no static
// prerender of the detail page or OG image).
function client() {
  return getSupabaseServer();
}

/**
 * All published blog slugs — used by `generateStaticParams` for the
 * detail page AND the OG image route, plus the sitemap.
 */
export async function getBlogSlugs(): Promise<string[]> {
  const { data, error } = await client()
    .from("blogs")
    .select("slug")
    .eq("is_published", true)
    .order("published_at", { ascending: false });
  if (error) {
    console.error("[blogs.getBlogSlugs]", error);
    return [];
  }
  return ((data as { slug: string }[]) ?? []).map((r) => r.slug);
}

/**
 * Summary list for the index page, the "latest blogs" panel on
 * `/not-found`, and the sitemap. Sorted newest-first by
 * `published_at`. Excludes the body to keep payload small.
 */
export async function getAllBlogSummaries(): Promise<BlogSummary[]> {
  const { data, error } = await client()
    .from("blogs")
    .select(SUMMARY_COLUMNS)
    .eq("is_published", true)
    .order("published_at", { ascending: false });
  if (error) {
    console.error("[blogs.getAllBlogSummaries]", error);
    return [];
  }
  return ((data as BlogRow[]) ?? []).map(mapSummary);
}

/**
 * Full row for the detail page + OG image. Returns `null` on any
 * miss (no row, draft post, etc.) so callers can `notFound()` cleanly.
 */
export async function readBlog(slug: string): Promise<LoadedBlog | null> {
  const { data, error } = await client()
    .from("blogs")
    .select(FULL_COLUMNS)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) {
    console.error("[blogs.readBlog]", slug, error);
    return null;
  }
  if (!data) return null;
  return mapBlog(data as BlogRow);
}

/** Pure computation — same shape as the legacy helper. */
export function getAdjacentBlogs(summaries: BlogSummary[], slug: string) {
  const idx = summaries.findIndex((s) => s.slug === slug);
  return {
    previous: idx > 0 ? summaries[idx - 1] : null,
    next:
      idx >= 0 && idx < summaries.length - 1 ? summaries[idx + 1] : null,
  };
}

export type SearchInput = {
  /** Free-text query — fed into `websearch_to_tsquery` so users can
   * type natural phrases (`kafka pulsar -nats`) without escaping. */
  q?: string;
  /** Tag filter — any-of semantics. A post matches when its `tags`
   * array contains *any* of the selected tags. Empty / absent =
   * no tag filter. */
  tags?: string[];
  /** 1-based page index. Defaults to 1. */
  page?: number;
  /** Items per page. Defaults to 9 (3×3 grid). */
  pageSize?: number;
};

export type SearchResult = {
  items: BlogSummary[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

/**
 * Paginated catalogue query — combines optional FTS (`q`) with optional
 * single-tag filter, sorted newest-first. Used both by the index page
 * for its first server-rendered batch AND by the load-more server
 * action for subsequent pages.
 *
 * Implementation:
 *  - `.textSearch(...)` against the generated `search_vector` column.
 *    `type: "websearch"` accepts user-typed input verbatim — no
 *    escaping, no parser failures on stray punctuation.
 *  - `.contains("tags", [tag])` — array containment via GIN index.
 *  - `.range(offset, offset + size - 1)` for pagination.
 *  - `count: "exact"` so the toolbar / load-more button can report
 *    "X results" / "N left" precisely.
 *
 * Recency-sorted: ranking by FTS relevance (`ts_rank_cd`) is left for
 * a future iteration once we have a feel for whether matches feel
 * stale.
 */
/**
 * Row shape returned by the `search_blogs_v1` RPC. Mirrors `BlogRow`
 * (the shape `mapSummary` reads) plus `total_count` — the same value
 * on every row of a result set, computed via a window function in
 * the SQL CTE.
 */
type SearchBlogsRow = BlogRow & { total_count: number };

export async function searchBlogs(
  input: SearchInput
): Promise<SearchResult> {
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const pageSize = Math.max(1, Math.floor(input.pageSize ?? 9));
  const q = input.q?.trim() ?? "";
  const tags = (input.tags ?? [])
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const offset = (page - 1) * pageSize;

  // Single round-trip via the RPC: combines weighted FTS + trigram
  // word_similarity fallback (typo tolerance) + array-tag filter +
  // count(*) over () for total — see `search_blogs_v1` in the
  // `blogs_fuzzy_search_v1` migration.
  const { data, error } = await client().rpc("search_blogs_v1", {
    q,
    tag_filter: tags,
    result_limit: pageSize,
    result_offset: offset,
  });

  if (error) {
    console.error("[blogs.searchBlogs]", { q, tags, page }, error);
    return { items: [], total: 0, page, pageSize, hasMore: false };
  }

  const rows = (data as SearchBlogsRow[]) ?? [];
  const items = rows.map(mapSummary);
  const total = rows[0]?.total_count ?? 0;
  return {
    items,
    total,
    page,
    pageSize,
    hasMore: offset + items.length < total,
  };
}

/**
 * Tag frequency table for the toolbar. Aggregated in JS — at the
 * catalogue size this is trivial (one round-trip, ~30 unique tags
 * across 23 posts), and it keeps the schema free of an `rpc` function
 * that nothing else needs.
 */
export async function getAllTags(): Promise<
  Array<{ tag: string; count: number }>
> {
  const { data, error } = await client()
    .from("blogs")
    .select("tags")
    .eq("is_published", true);
  if (error) {
    console.error("[blogs.getAllTags]", error);
    return [];
  }
  const counts = new Map<string, number>();
  for (const row of (data as { tags: string[] | null }[]) ?? []) {
    for (const t of row.tags ?? []) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
