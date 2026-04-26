import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DraftPost } from "./writer";

/**
 * Publisher — final phase of the daily auto-blog cron.
 *
 * Takes a `DraftPost`, normalises the slug, dedupes against existing
 * rows, computes reading-time / word-count, and inserts into
 * `public.blogs`. The Supabase database webhook on the `blogs` table
 * fires automatically on INSERT and cascades the new row into the
 * assistant index — no extra wiring here.
 *
 * Reading-stats algorithm is a direct port of
 * `scripts/import-blogs.ts:82-96` so DB rows look identical regardless
 * of whether they came from the importer or this cron.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any, any, any, any, any>;

const WORDS_PER_MINUTE = 220;
const SLUG_MAX = 80;
const SLUG_SUFFIX_CAP = 9;

export type PublishResult = {
  slug: string;
  id: number | string;
  isPublished: boolean;
  wordCount: number;
  readingTime: number;
};

/**
 * Reading stats — strip code fences, HTML, and markdown punctuation,
 * then divide whitespace-separated tokens by 220 wpm.
 *
 * Ported byte-for-byte from `scripts/import-blogs.ts:82-96` so cron
 * inserts match importer inserts exactly. Don't refactor without
 * updating both call sites.
 */
export function computeReadingStats(body: string): {
  readingTime: number;
  wordCount: number;
} {
  const stripped = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_`~\-\[\]\(\)]/g, " ");
  const wordCount = stripped.trim().split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
  return { readingTime, wordCount };
}

/**
 * Normalise a string into a URL-safe slug.
 *
 * - NFKD-fold to strip accents
 * - lowercase
 * - replace any run of non-alphanumerics with a single hyphen
 * - trim leading/trailing hyphens
 * - cap at SLUG_MAX chars (clipped on a hyphen boundary if possible)
 */
export function slugifyTitle(input: string): string {
  const normalised = input
    .normalize("NFKD")
    // Strip combining marks (diacritics) — \p{M} is the Unicode "Mark"
    // category. The /u flag is required for property escapes.
    .replace(/\p{M}+/gu, "")
    .toLowerCase();
  const hyphened = normalised
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (hyphened.length <= SLUG_MAX) return hyphened;
  // Clip on a hyphen boundary so we don't slice mid-word.
  const sliced = hyphened.slice(0, SLUG_MAX);
  const lastHyphen = sliced.lastIndexOf("-");
  return lastHyphen > SLUG_MAX / 2 ? sliced.slice(0, lastHyphen) : sliced;
}

async function findFreeSlug(
  supabase: AnySupabase,
  base: string,
): Promise<string> {
  for (let i = 1; i <= SLUG_SUFFIX_CAP; i++) {
    const candidate = i === 1 ? base : `${base}-${i}`;
    const { data, error } = await supabase
      .from("blogs")
      .select("slug")
      .eq("slug", candidate)
      .maybeSingle();
    if (error) {
      throw new Error(`findFreeSlug: ${error.message}`);
    }
    if (!data) return candidate;
  }
  throw new Error(
    `findFreeSlug: exhausted suffixes 1..${SLUG_SUFFIX_CAP} for base "${base}"`,
  );
}

export async function publishBlog(
  supabase: AnySupabase,
  draft: DraftPost,
): Promise<PublishResult> {
  // Prefer a slug derived from the title so URL shape is stable even
  // if the model produced something quirky in `draft.slug`. Fall back
  // to the model's slug if title-slugification fails (won't happen in
  // practice — `validateDraft` already guarantees a non-trivial title).
  const baseSlug =
    slugifyTitle(draft.title) || slugifyTitle(draft.slug) || "post";
  const slug = await findFreeSlug(supabase, baseSlug);

  const { readingTime, wordCount } = computeReadingStats(draft.body_md);

  const isPublished = process.env.AUTO_BLOG_DRAFT !== "true";
  const nowIso = new Date().toISOString();

  const row = {
    slug,
    title: draft.title,
    description: draft.description,
    body_md: draft.body_md,
    author: "Rahul Gupta",
    author_title: "Senior Software Engineer",
    cover_image_url: null,
    tags: draft.tags,
    reading_time: readingTime,
    word_count: wordCount,
    is_published: isPublished,
    published_at: nowIso,
    updated_at: null,
  };

  const { data, error } = await supabase
    .from("blogs")
    .insert(row)
    .select("id, slug")
    .single();

  if (error) {
    if (error.code === "23505") {
      // Unique-violation race: another insert grabbed our slug between
      // findFreeSlug and the insert. Vanishingly rare for a once-a-day
      // cron, but surface it cleanly.
      throw new Error(`publishBlog: slug collision race on "${slug}"`);
    }
    throw new Error(`publishBlog: insert failed: ${error.message}`);
  }

  const inserted = data as { id: number | string; slug: string };
  return {
    slug: inserted.slug,
    id: inserted.id,
    isPublished,
    wordCount,
    readingTime,
  };
}
