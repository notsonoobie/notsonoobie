# Publishing a new blog post

Blogs live in Supabase (`public.blogs`), not on disk. Publishing is
"insert a row" — either through the Supabase admin UI or by running a
small importer script over a local markdown file.

---

## TL;DR

**Studio path** (recommended for one-off posts):

1. Open the [Supabase Studio](https://supabase.com/dashboard) → table
   editor → `blogs` → **Insert row**.
2. Fill the required columns (`slug`, `title`, `description`,
   `body_md`, `published_at`).
3. Set `is_published = true`. Save.
4. Live at `https://agenticwithrahul.in/blogs/<slug>` on the next
   request.

**Markdown-file path** (recommended when drafting in your editor):

1. Drop `content/blogs/<slug>.md` locally with the frontmatter block
   below.
2. `pnpm dlx tsx scripts/import-blogs.ts` — upserts on `slug`.

The `content/blogs/` directory is intentionally not tracked in git
post-migration. Don't commit files there.

---

## 1. Pick a slug

The slug **is** the URL path. Now stored in a column instead of a
filename, but the rules are unchanged:

```
slug = "scaling-apis-bfsi"  →  https://agenticwithrahul.in/blogs/scaling-apis-bfsi
```

- Lowercase, ASCII letters / digits / hyphens only.
- No spaces, no underscores.
- Keep it short and stable — the slug is the canonical URL forever.
  Renaming it later breaks every shared link and forces re-indexing.
- Don't prefix with the date — `published_at` already carries it.

The unique index on `blogs.slug` rejects duplicates at insert time.

---

## 2. Column ↔ frontmatter mapping

The two paths share one schema. Studio takes columns directly; the
importer accepts the legacy frontmatter convention and maps onto the
same columns.

| Frontmatter      | Column           | Required | Notes |
|---|---|---|---|
| `title`          | `title`          | yes | Hero, list card, `<title>`, OG, JSON-LD `headline`. |
| `date`           | `published_at`   | yes | ISO `YYYY-MM-DD`. Drives sort + sitemap `lastModified`. |
| `description`    | `description`    | yes | 120–160 chars is the sweet spot for SEO snippets. |
| body (after `---`) | `body_md`      | yes | The markdown body — see §3. |
| `tags`           | `tags`           | no  | `text[]`. First tag drives `og:section`. Lowercase, hyphenated. |
| `author`         | `author`         | no  | Defaults to "Rahul Gupta". |
| `authorTitle`    | `author_title`   | no  | Subtitle under the author chip. |
| `updated`        | `updated_at`     | no  | When set, drives `og:modified_time` + JSON-LD `dateModified`. |
| `draft: true`    | `is_published=false` | no | Hides from `/blogs`, sitemap, prev/next, and search. |
| (n/a)            | `cover_image_url` | no | Optional cover; not in legacy frontmatter. |
| (auto)           | `reading_time`   | (auto) | Computed at write time, 220 wpm. |
| (auto)           | `word_count`     | (auto) | Computed at write time. |

The `published_at` column is the canonical "when did this go live"
timestamp. The list page sorts `desc` on it.

---

## 3. Write the body

After the frontmatter (or directly into `body_md`) you're in plain
markdown. **Don't repeat the title as `# Title`** — the page already
renders it from the row. Start with the intro paragraph; the first
paragraph gets a cyan drop-cap automatically.

Supported out of the box:

| Element            | Source                                                  |
|---|---|
| Headings           | `## Section`, `### Sub-section` (`h1` reserved)          |
| Bold / italic      | `**bold**`, `*italic*`                                   |
| Inline code        | `` `code` ``                                             |
| Link               | `[text](https://…)`                                      |
| Lists              | `-`, `1.` (ordered renders `01 02 03` in cyan)           |
| Task list          | `- [x] done` / `- [ ] todo`                              |
| Blockquote         | `> quote`                                                |
| Code block         | ```` ```ts ```` — Shiki highlighting + copy button       |
| Table              | Standard GFM pipe tables                                 |
| Image              | `![alt](https://…)` — clickable lightbox                 |
| Strikethrough      | `~~text~~`                                               |
| Keyboard key       | `<kbd>Cmd</kbd>`                                         |
| Horizontal rule    | `---`                                                    |

Code fences support every language Shiki ships with (`ts`, `tsx`,
`json`, `yaml`, `sh`, `python`, `rust`, `go`, `sql`, `dockerfile`,
`diff`, etc.). Headings auto-anchor with `rehype-slug` and populate the
on-this-page TOC.

---

## 4. Path A — Supabase Studio

Best for one-off posts you've already written.

1. Open Studio → **Table Editor** → `blogs` → **Insert row** (top-right).
2. Fill the columns from §2:
   - Required: `slug`, `title`, `description`, `body_md`, `published_at`.
   - Optional: `tags`, `author`, `author_title`, `updated_at`, `cover_image_url`.
3. Set `is_published = true` (uncheck for a draft).
4. **Save**. The row is live immediately. `/blogs` is dynamic
   (`force-dynamic`) so the next page load shows the new post; the
   detail page renders on-demand for slugs not in the build-time
   prerender set.

`reading_time` and `word_count` can be left null; the importer fills
them automatically. If you skip them in Studio they stay null and the
hero just doesn't show the "N min read" badge.

---

## 5. Path B — Import script

Best when you want to draft in your editor and benefit from the
220-wpm reading-time computation.

1. Make sure `.env` has:
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY` (or legacy `SUPABASE_SERVICE_ROLE_KEY`)
2. Drop `content/blogs/<slug>.md` (or `.mdx`) with the legacy
   frontmatter block:
   ```yaml
   ---
   title: "Title goes here"
   date: 2026-04-26
   description: "One or two crisp sentences."
   tags: ["distributed-systems", "performance"]
   author: "Rahul Gupta"
   authorTitle: "Senior Software Engineer"
   updated: 2026-05-01     # optional
   draft: false            # optional, default published
   ---
   ```
3. Run:
   ```sh
   pnpm dlx tsx scripts/import-blogs.ts
   ```
4. The script:
   - Reads every `.md` / `.mdx` in `content/blogs/` (skips `_*` files).
   - Computes `reading_time` and `word_count` from the body.
   - Upserts into `blogs` keyed on `slug`. Re-running updates in
     place.
   - Reports `imported / updated / skipped / errors` counts.

The directory is intentionally untracked. Don't `git add` files
there — the row in Supabase is the source of truth.

---

## 6. Drafts

To stash a half-finished post in the DB without publishing:

- **Studio**: set `is_published = false`.
- **Markdown file**: `draft: true` in the frontmatter.

Drafts are silently omitted from `/blogs`, the sitemap, the prev/next
nav, and search results. Direct URL access (`/blogs/<slug>`) returns
404 — there's no preview-mode bypass.

---

## 7. Updating an existing post

- **Typo / small fix**: edit `body_md` in Studio (or re-import the
  markdown file). The change shows on next ISR window.
- **Substantive update**: bump `updated_at` to today's date so JSON-LD
  emits `dateModified` and OG carries `og:modified_time` — the
  freshness signal for re-crawl.
- **Bumping `published_at`**: only do this if the post is genuinely a
  new piece. Existing inbound links / SERP rankings expect the
  original date.

If the static page is cached and the change isn't showing up, push any
code change to trigger a Vercel redeploy — that flushes the cache for
all static blog routes.

---

## 8. Deleting

- **Studio**: select the row → **Delete**.
- **CLI** (if you must): `delete from blogs where slug = '<slug>';`
  via the Supabase SQL editor.

The route 404s after the next request. If the slug had inbound links
or any SERP traffic, add a 301 in `next.config.ts` pointing at the
nearest surviving post:

```ts
async redirects() {
  return [{
    source: "/blogs/<old-slug>",
    destination: "/blogs/<new-slug>",
    permanent: true,
  }];
}
```

---

## 9. Cache + propagation

- `/blogs` (list) → `dynamic = "force-dynamic"`. New posts visible
  on the next request.
- `/blogs/<slug>` (detail) → statically pre-rendered for slugs known
  at build time. New slugs added to the DB after a deploy render
  on-demand on first hit (no 404). Edited rows update on the next ISR
  window or after a redeploy.
- Sitemap (`/sitemap.xml`) → re-reads the DB on each crawl;
  `lastModified` reflects `published_at` (or `updated_at` when set).
- Search index → Postgres `tsvector` + `pg_trgm` GIN indexes; both
  update via triggers when the row changes. No manual reindex.

---

## 10. What happens automatically

You don't touch any of these — they react to the row:

- **Route generation** — `app/blogs/[slug]/page.tsx`'s
  `generateStaticParams` enumerates `blogs.slug` at build; on-demand
  for everything inserted after.
- **List + filtering** — `/blogs` reads `searchBlogs(...)` from
  `lib/blogs.ts`, which calls the `search_blogs_v1` Postgres RPC
  (FTS + trigram fuzzy fallback).
- **OG image** — `app/blogs/[slug]/opengraph-image.tsx` renders the
  1200×630 card from `title` / `description` / `tags` / `published_at`.
- **JSON-LD** — `BlogPosting` + `BreadcrumbList`, cross-linked to the
  Person `@id`.
- **Prev / next** — derived at request time from the date-sorted
  summary list.
- **Reading time / TOC / share row** — built from the rendered body.
- **Sitemap** — `app/sitemap.ts` queries `getAllBlogSummaries()` at
  request time.

---

## 11. Pre-publish checklist

- [ ] Slug looks good in the URL (lowercase, no underscores)
- [ ] `title` reads as a sharp standalone tweet
- [ ] `published_at` is the date you want as canonical
- [ ] `description` is one or two complete sentences, ≤ 160 chars
- [ ] First paragraph is a real intro (the drop cap will land on it)
- [ ] `tags` are lowercase, hyphenated, and the first one is the
      headline topic
- [ ] Code blocks declare a language fence (` ```ts `, not bare ` ``` `)
- [ ] No broken external links
- [ ] If using Path B: `pnpm build` still passes after the import (the
      reading-time + word-count get baked into the JSON-LD)

When publishing via Studio, hit the URL once after save to warm the
on-demand render: `https://agenticwithrahul.in/blogs/<slug>`. For
Google to start indexing within hours instead of days: open Search
Console → URL Inspection → paste the new URL → **Request indexing**.

---

That's the whole flow. Markdown in (one row at a time), blog out.
