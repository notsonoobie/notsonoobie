# Publishing a new blog post

This is the only document you need when adding a post. Everything from the
file naming to the SEO is wired up automatically — your job is just to write.

---

## TL;DR

1. Create `content/blogs/<slug>.mdx`.
2. Fill in the YAML frontmatter (title, date, description, tags, …).
3. Write the post body in Markdown / MDX.
4. (Optional) Add the slug to `content/blogs/_meta.ts` to control nav order.
5. `git add` → `git commit` → `git push`. Vercel auto-deploys, the post
   appears at `/blogs/<slug>` and in `/sitemap.xml` within seconds.

No DB. No CMS. No backend deploy. Just files.

---

## 1. Pick a slug

The filename **is** the URL.

```
content/blogs/scaling-apis-bfsi.mdx     →  https://agenticwithrahul.in/blogs/scaling-apis-bfsi
content/blogs/nodejs-in-production.mdx  →  https://agenticwithrahul.in/blogs/nodejs-in-production
```

Slug rules:

- Lowercase, ASCII letters, digits, hyphens only.
- No spaces, no underscores, no `.md` (it's `.mdx`).
- Keep it short and stable — the slug is the canonical URL forever. Renaming
  it later breaks every shared link and forces re-indexing.
- Don't prefix with the date — frontmatter already carries it.

Files starting with an underscore (`_meta.ts`, `_drafts.mdx`, …) are ignored
by the routing layer.

---

## 2. Required frontmatter

Every post starts with this block:

```yaml
---
title: "A short, opinionated title"
date: 2026-04-18
description: "One or two crisp sentences. Shows in the post hero, the list page card, OG previews, and search snippets."
tags: ["nodejs", "production", "performance"]
author: "Rahul Gupta"
authorTitle: "Senior Software Engineer"
---
```

Field guide:

| Field          | Required | Notes                                                                         |
| -------------- | -------- | ----------------------------------------------------------------------------- |
| `title`        | yes      | Used in the hero, list, `<title>`, OG, JSON-LD `headline`, `<h1>` and so on. |
| `date`         | yes      | ISO `YYYY-MM-DD`. Drives sort order, sitemap `lastModified`, and `BlogPosting.datePublished`. |
| `description`  | yes      | 120–160 chars is the sweet spot for SEO snippets.                             |
| `tags`         | no       | Lowercase, hyphenated. The first tag is shown next to the post on the nav cards. |
| `author`       | no       | Defaults to `"Rahul Gupta"`.                                                  |
| `authorTitle`  | no       | Subtitle under the author chip (e.g. `Senior Software Engineer`).             |
| `draft`        | no       | Set `draft: true` to keep the file in the repo but hide it from `/blogs`, the sitemap, and prev/next nav. |

Anything else you add ends up in the post's `metadata` and is harmless.

---

## 3. Write the body

After the closing `---`, you're in Markdown / MDX. **Don't repeat the title
as `# Title`** — the page already renders it from frontmatter. Start with the
intro paragraph; the first paragraph gets a cyan drop-cap automatically.

Everything that's styled (with examples for each):

| Element            | Markdown source                                                  |
| ------------------ | ---------------------------------------------------------------- |
| Heading            | `## Section`, `### Sub-section` (H1 reserved for the page title) |
| Bold / italic      | `**bold**`, `*italic*`                                           |
| Inline code        | `` `code` ``                                                     |
| Link               | `[text](https://…)`                                              |
| Unordered list     | `- item`                                                         |
| Ordered list       | `1. item` — renders `01 02 03` in cyan badges                    |
| Task list          | `- [x] done` / `- [ ] todo` — custom cyan checkboxes             |
| Blockquote         | `> quote` — left-ruled cyan pull-quote                           |
| Code block         | ``` ```ts ``` — header shows the language label + a copy button  |
| Table              | Standard GFM pipe tables                                         |
| Image              | `![alt](https://…)` — clickable, opens the glassmorphism lightbox |
| Strikethrough      | `~~text~~`                                                       |
| Keyboard key       | `<kbd>Cmd</kbd>` — inline mini key cap                           |
| Horizontal rule    | `---`                                                            |

Code blocks support every language Shiki ships with (`js`, `ts`, `tsx`,
`json`, `yaml`, `sh`, `python`, `rust`, `go`, `sql`, `html`, `css`,
`dockerfile`, `diff`, etc.). The header label is derived from the fence
language.

Headings auto-generate slug IDs and populate the **on-this-page** TOC on
desktop — you don't need to do anything for that to work.

For a complete example exercising every component above, see
`content/blogs/nodejs-in-production.mdx`.

---

## 4. Pick the navigation order (optional)

`content/blogs/_meta.ts` is a flat `slug → title` map that controls the order
posts appear in Nextra's internal navigation:

```ts
const meta = {
  "nodejs-in-production": "Running Node.js in production",
  "agentic-ai-guardrails": "Guardrails for agentic AI",
  "scaling-apis-bfsi": "Scaling API gateways for BFSI",
};

export default meta;
```

The public **list page** (`/blogs`) doesn't use `_meta.ts` — it sorts by
`frontmatter.date` desc. So the only reason to update `_meta.ts` is for
tooling consistency; you can ignore it for most posts.

---

## 5. Linking and assets

- **Internal links**: `[other post](/blogs/agentic-ai-guardrails)` —
  resolves through Next.js routing.
- **External links**: `[Node.js docs](https://nodejs.org/api/cluster.html)` —
  opens in the same tab; the underline + cyan tint is automatic.
- **Images**: drop them in `/public/blog-images/<post-slug>/<file>.png` and
  reference as `![alt](/blog-images/<post-slug>/<file>.png)`. External URLs
  also work (the demo Node post uses `picsum.photos`).
- **Resume / files in `/public`**: linkable directly as
  `[my resume](/Rahul_Gupta_Resume.pdf)`.

---

## 6. What happens automatically

You don't need to touch any of these — they react to your new file:

- **Route generation** — `/blogs/<slug>` is statically generated at build via
  `app/blogs/[slug]/page.tsx`'s `generateStaticParams`.
- **Listing** — `/blogs` re-reads the directory at build, sorts by date,
  shows the newest as the featured card (when ≥ 3 posts).
- **Sitemap** — `app/sitemap.ts` glob-loads `content/blogs/*.mdx` and emits
  one entry per post with `lastModified = frontmatter.date`.
- **Reading time** — computed from word count (~220 wpm), shown in the hero
  and on every card.
- **TOC** — built from your `##` / `###` / `####` headings.
- **Open Graph + Twitter cards** — generated from `title`, `description`,
  `tags`, `date`, `author`.
- **JSON-LD** — `BlogPosting` schema emitted per post, cross-linked to the
  Person `@id` so Google can attribute it.
- **Prev / next** — derived from the date-sorted list at build time.
- **Share row** — copy / LinkedIn / X / WhatsApp buttons added to every post.

---

## 7. Drafts

To stash a half-finished post in the repo without publishing it, add
`draft: true` to the frontmatter:

```yaml
---
title: "WIP — kafka rebalance internals"
date: 2026-05-01
description: "Notes on partition assignment strategies."
draft: true
---
```

The post is silently omitted from `/blogs`, `sitemap.xml`, and the prev/next
nav. The file still compiles, so you can preview at the direct URL while the
draft flag is set — useful for screenshots or sharing a private read link.

---

## 8. Pre-publish checklist

Before you push:

- [ ] Slug looks good in the URL (lowercase, no underscores, descriptive)
- [ ] `title` reads as a sharp standalone tweet
- [ ] `date` is today's date (or the date you want as canonical publish date)
- [ ] `description` is one or two complete sentences, ≤ 160 chars
- [ ] First paragraph is a real intro (the drop cap will land on it)
- [ ] `pnpm build` passes locally
- [ ] Spot-check `/blogs/<slug>` in dev — code blocks render with the right
      language label, image lightbox opens cleanly, prev/next cards show
- [ ] `~~strikethrough~~`, task lists, tables all render the way you intend
- [ ] No broken external links

Then:

```sh
git add content/blogs/<slug>.mdx
git commit -m "Publish: <slug>"
git push
```

Vercel kicks off a deploy automatically. About 60 seconds later, the post is
live at `https://agenticwithrahul.in/blogs/<slug>` and in
`https://agenticwithrahul.in/sitemap.xml`.

For Google to start indexing it within hours instead of days: open Google
Search Console → URL Inspection → paste the new URL → **Request indexing**.

---

## 9. Updating an existing post

- **Fixing a typo** — just push, the URL stays the same.
- **Adding a substantive update** — bump `date` to today's date so search
  engines treat it as a fresh signal, and add an "Updated" note at the top
  of the body if appropriate.
- **Renaming** — please don't, unless the original URL has zero traffic. If
  you must, set up a redirect in `vercel.json` or `next.config.ts`.
- **Deleting** — `git rm content/blogs/<slug>.mdx`. The route 404s after
  deploy. If the post had any traffic, add a 301 redirect to the most
  related surviving post.

---

That's the entire workflow. Markdown in, blog out.
