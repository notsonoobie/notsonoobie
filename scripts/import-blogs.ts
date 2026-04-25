/**
 * Markdown → Supabase upserter. Reads every `.md` / `.mdx` file under
 * `content/blogs/` (the directory the legacy build kept blogs in;
 * absent on a clean install — the script bails gracefully) and pushes
 * each post into `public.blogs`.
 *
 * Used once for the migration off Nextra, then kept as a backstop for
 * authors who'd rather draft in their editor than in Supabase Studio:
 * drop a markdown file with frontmatter into `content/blogs/`, run
 * the script, the upsert keys on `slug` so the row updates in place.
 *
 *   pnpm dlx tsx scripts/import-blogs.ts
 *
 * Environment: needs SUPABASE_URL + SUPABASE_SECRET_KEY (or the
 * legacy SUPABASE_SERVICE_ROLE_KEY) in .env. The script loads .env
 * itself so you don't have to source it manually.
 */
import { readdir, readFile } from "node:fs/promises";
import type { Dirent } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const BLOG_DIR = join(ROOT, "content", "blogs");
const WORDS_PER_MINUTE = 220;

type Frontmatter = {
  title?: string;
  date?: string | Date;
  updated?: string | Date;
  description?: string;
  tags?: string[];
  author?: string;
  authorTitle?: string;
  draft?: boolean;
};

type Row = {
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

async function loadDotEnv() {
  // Cheap .env loader — no external dep. Only handles `KEY=value` and
  // `KEY="value"` lines, which is all we need here. Skips comments and
  // blank lines. Doesn't override pre-existing process env so a CI
  // override still wins.
  try {
    const raw = await readFile(join(ROOT, ".env"), "utf8");
    for (const rawLine of raw.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    // No .env file — assume env is set externally.
  }
}

function computeReadingStats(body: string): {
  readingTime: number;
  wordCount: number;
} {
  // Same algorithm as legacy lib/blogs.ts:54-70 — strip code fences,
  // HTML, and markdown punctuation, then divide whitespace-separated
  // tokens by 220 wpm.
  const stripped = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_`~\-\[\]\(\)]/g, " ");
  const wordCount = stripped.trim().split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
  return { readingTime, wordCount };
}

function toIsoOrNull(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

async function loadBlogFiles(): Promise<
  Array<{ slug: string; row: Row | null; error?: string }>
> {
  let entries: Dirent[];
  try {
    entries = (await readdir(BLOG_DIR, { withFileTypes: true })) as Dirent[];
  } catch {
    console.error(
      `[import-blogs] ${BLOG_DIR} not found — drop markdown files there and re-run.`,
    );
    return [];
  }
  // Accept .md and .mdx alike — the renderer treats every body as plain
  // markdown post-migration, the legacy `.mdx` extension is kept only
  // for compatibility with whatever the author had open in their
  // editor.
  const slugs = entries
    .filter(
      (e) =>
        e.isFile() &&
        (e.name.endsWith(".mdx") || e.name.endsWith(".md")) &&
        !e.name.startsWith("_"),
    )
    .map((e) => e.name.replace(/\.(md|mdx)$/, ""));

  const out: Array<{ slug: string; row: Row | null; error?: string }> = [];
  for (const slug of slugs) {
    try {
      // Try .mdx first, then .md — the legacy posts all used .mdx but
      // the script accepts either extension going forward.
      let raw: string;
      try {
        raw = await readFile(join(BLOG_DIR, `${slug}.mdx`), "utf8");
      } catch {
        raw = await readFile(join(BLOG_DIR, `${slug}.md`), "utf8");
      }
      const { data, content } = matter(raw);
      const fm = data as Frontmatter;

      // Required fields. Without these the row would fail the NOT NULL
      // checks in the schema.
      const issues: string[] = [];
      if (!fm.title) issues.push("title");
      if (!fm.date) issues.push("date");
      if (!fm.description) issues.push("description");
      if (!content.trim()) issues.push("body");
      if (issues.length > 0) {
        out.push({
          slug,
          row: null,
          error: `missing fields: ${issues.join(", ")}`,
        });
        continue;
      }

      const publishedAt = toIsoOrNull(fm.date);
      if (!publishedAt) {
        out.push({ slug, row: null, error: "invalid date" });
        continue;
      }

      const { readingTime, wordCount } = computeReadingStats(content);

      out.push({
        slug,
        row: {
          slug,
          title: fm.title!,
          description: fm.description!,
          body_md: content,
          author: fm.author ?? "Rahul Gupta",
          author_title: fm.authorTitle ?? null,
          cover_image_url: null, // legacy posts don't carry covers
          tags: Array.isArray(fm.tags) ? fm.tags : [],
          reading_time: readingTime,
          word_count: wordCount,
          // `draft: true` in frontmatter → unpublished; absent or
          // false → publish on import. Mirrors legacy behaviour at
          // lib/blogs-mdx.ts:96.
          is_published: fm.draft !== true,
          published_at: publishedAt,
          updated_at: toIsoOrNull(fm.updated),
        },
      });
    } catch (err) {
      out.push({
        slug,
        row: null,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return out;
}

async function main() {
  await loadDotEnv();

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "[import-blogs] SUPABASE_URL + SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) must be set in .env",
    );
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`[import-blogs] reading ${BLOG_DIR} ...`);
  const parsed = await loadBlogFiles();
  console.log(`[import-blogs] found ${parsed.length} files`);

  const validRows = parsed.filter((p) => p.row !== null) as Array<{
    slug: string;
    row: Row;
  }>;
  const errors = parsed.filter((p) => p.error);

  if (validRows.length === 0) {
    console.error("[import-blogs] nothing to import");
    process.exit(1);
  }

  // UPSERT in a single round-trip. `slug` is the conflict target — the
  // unique index on the column makes this safe.
  const { data, error } = await supabase
    .from("blogs")
    .upsert(
      validRows.map((p) => p.row),
      { onConflict: "slug" },
    )
    .select("slug");

  if (error) {
    console.error("[import-blogs] upsert failed", error);
    process.exit(1);
  }

  const writtenSlugs = new Set(
    ((data as { slug: string }[]) ?? []).map((r) => r.slug),
  );
  const written = validRows.filter((p) => writtenSlugs.has(p.slug));
  const skipped = validRows.length - written.length;

  console.log("");
  console.log("┌─────────────────────────────────────────────");
  console.log(`│ imported / updated : ${written.length}`);
  console.log(`│ skipped            : ${skipped}`);
  console.log(`│ errors             : ${errors.length}`);
  console.log("└─────────────────────────────────────────────");

  if (errors.length > 0) {
    console.log("");
    console.log("Errors:");
    for (const e of errors) {
      console.log(`  · ${e.slug}: ${e.error}`);
    }
  }

  console.log("");
  console.log("Sample of imported rows:");
  for (const p of written.slice(0, 5)) {
    console.log(
      `  · ${p.slug}  (${p.row.reading_time} min · ${p.row.word_count} words · ${
        p.row.is_published ? "published" : "draft"
      })`,
    );
  }
  if (written.length > 5) console.log(`  · …and ${written.length - 5} more`);

  process.exit(errors.length > 0 ? 1 : 0);
}

void main();
