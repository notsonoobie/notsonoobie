@AGENTS.md

# Portfolio — Learnings & Conventions

This file is a running log of what the project is, how it's wired, and the
gotchas accumulated while building it. Read it before making non-trivial
changes.

---

## The person

- **Rahul Gupta** — Senior Software Engineer · Solutions Architect · Agentic AI
- Applied Cloud Computing (Sep 2021 – Present) · Code B (Oct 2020 – Sep 2021)
- Mumbai, IN · `IST / Asia/Kolkata`
- Email: `notsonoobie@gmail.com` · Phone: `+91 8928885199`
- LinkedIn: `https://www.linkedin.com/in/rahul-gupta-6a5967188/`
- GitHub: `https://github.com/notsonoobie`
- Cal.com: `https://cal.com/agentic-with-rahul-gupta/15min`
- Production domain: **`https://agenticwithrahul.in`** (and `www.` variant,
  both served from Vercel). Canonical = apex.
- Git repo: `https://github.com/notsonoobie/notsonoobie.git`

Anything user-facing that references the person (OG, JSON-LD, sitemap, hero,
contact) should read these from `lib/data.ts` / `lib/seo.ts`, never inline.

---

## Stack

- **Next.js 16** App Router (Turbopack builds), **React 19**, **TypeScript**
- **Tailwind v4** — theme tokens live in `app/globals.css` under `@theme` (no
  `tailwind.config.ts`). Colors, fonts, etc. are CSS variables.
- **Framer Motion 12** for UI animation · **Lenis** for smooth scroll
- **Three.js + @react-three/fiber + @react-three/drei** for the hero 3D cube
- **Nextra 4** + **nextra-theme-blog** (only used as MDX compiler) +
  **gray-matter** for blog MDX
- **simple-icons** for brand logos on the Rubik's cube
- **@vercel/analytics** for production telemetry
- Package manager: **pnpm** (v10+). `pnpm dev`, `pnpm build`.

---

## Routing map

```
/                         → portfolio home (all sections scroll-anchored)
/blogs                    → blog list page (featured + archive layout)
/blogs/<slug>             → MDX post page (SSG via generateStaticParams)

/resume                   → PDF download
/resume/pdf               → PDF download
/resume/docx              → DOCX download
/resume/json              → JSON representation of profile/data

/sitemap.xml              → includes home anchors + /blogs + every post
/robots.txt               → allows everything, points at sitemap
/manifest.webmanifest     → PWA manifest
/opengraph-image          → dynamic OG image
/apple-icon               → Apple touch icon (180×180)
/icon.svg                 → favicon (SVG, RG monogram)
```

Nextra does NOT provide file-system routing here — we explicitly drive it via
`app/blogs/[slug]/page.tsx` which calls Nextra's `importPage(["blogs", slug])`
from `nextra/pages`. This is deliberate so Nextra stays scoped to `/blogs/*`
and doesn't touch the rest of the app.

---

## Core directories

```
app/
  layout.tsx              → root layout, fonts, metadata, LenisProvider, <Analytics />, JsonLd, skip-link
  page.tsx                → home; composes Hero, Stats, About, Expertise, Products, Skills, Timeline, Contact, Footer + SidebarNav
  globals.css             → Tailwind + theme tokens + utility classes
  sitemap.ts              → home anchors + blogs (reads content/blogs at build)
  robots.ts
  opengraph-image.tsx     → dynamic OG via next/og
  apple-icon.tsx          → Apple touch icon
  icon.svg                → favicon (RG monogram)
  manifest.ts
  resume/
    route.ts              → PDF
    pdf/route.ts          → PDF
    docx/route.ts         → DOCX
    json/route.ts         → profile JSON
  blogs/
    layout.tsx            → bg-canvas wrapper; does NOT include SidebarNav
    blogs.css             → scoped prose styles (.blog-prose) — drop-cap,
                            checkboxes, strikethrough, code, tables, kbd, etc.
    page.tsx              → list page (itself renders <SidebarNav />)
    [slug]/page.tsx       → post page — hero, TOC, MDX body, share, prev/next.
                            Does NOT render SidebarNav (distraction-free read).

components/
  hero/                   → Hero.tsx + ServiceMesh.tsx (three.js Rubik's cube)
  products/               → Products.tsx + ArchitectureDiagram.tsx (5 custom SVGs)
  nav/SidebarNav.tsx      → right-rail nav: clickable folder headers + items
  motion/LenisProvider.tsx → exports useLenis() + smoothScrollTo()
  seo/JsonLd.tsx          → emits 6 schema.org blobs (Person, WebSite, …)
  seo/BlogJsonLd.tsx      → BlogPosting per post
  blogs/
    ReadingProgress.tsx   → fixed top scroll bar
    PostTOC.tsx           → sticky right TOC (xl+) with scroll-spy
    PostShare.tsx         → copy/LinkedIn/X share buttons
    PostNav.tsx           → prev/next cards
    CodeBlock.tsx         → client component: header with lang label + copy btn
    LightboxImage.tsx     → glassmorphism image modal w/ zoom & fit toggle
  contact/Contact.tsx     → Cal.com CTA + contact cards + rich resume card

lib/
  data.ts                 → profile, stats, expertise, products, skills, experience,
                            navGroups. Source of truth.
  seo.ts                  → SITE_URL etc. PROD URL = https://agenticwithrahul.in
  blogs.ts                → getBlogSlugs, readBlog, getAllBlogSummaries,
                            getAdjacentBlogs (uses Nextra importPage + gray-matter)
  utils.ts                → cn()

content/blogs/
  *.mdx                   → blog posts
  _meta.ts                → Nextra ordering map

mdx-components.tsx        → exports useMDXComponents; maps pre → CodeBlock,
                            img → LightboxImage; spreads nextra-theme-blog.

next.config.ts            → wrapped with withNextra(). search.codeblocks: false.
```

---

## Theme tokens (`app/globals.css` `@theme`)

Colors:
- `--color-canvas` `#0a0b0f` (main bg)
- `--color-canvas-2` `#0d0f15` (card bg)
- `--color-ink` `#e6e9ef`
- `--color-ink-dim` `#8a93a6`
- `--color-ink-faint` `#4a5163`
- `--color-line` `#1b1f2a` (borders)
- `--color-line-2` `#242a38`
- `--color-cyan` `#00e5ff` (primary accent)
- `--color-cyan-soft` `#7cf0ff`
- `--color-amber` `#ffb340`
- `--color-mint` `#7cffb2` (ok/status)
- `--color-violet` `#a78bfa`
- `--color-rose` `#ff7a9c`

Use via Tailwind utilities: `text-cyan`, `bg-canvas-2`, `border-line`,
`text-ink-dim`, etc.

Fonts:
- `--font-sans` (Inter) · `--font-mono` (JetBrains Mono) · `--font-display`
  (Space Grotesk). Applied through `next/font` in `app/layout.tsx`.

Custom utility classes in `globals.css`:
- `.bg-grid` / `.bg-grid-fade` — dotted grid background w/ radial mask
- `.hairline` / `.hairline-2` — inset 1px shadow as a "border"
- `.glow-cyan` / `.text-glow-cyan`
- `.caret` — blinking cyan cursor
- `.marquee-track` — infinite horizontal scroll
- `.no-scrollbar` — hide scrollbars but keep scrolling
- Lenis-required: `html.lenis`, `.lenis.lenis-smooth`, `.lenis.lenis-stopped`

`prefers-reduced-motion` is respected throughout (Lenis off, useFrame gated,
all motion timings collapsed to 0.01ms in globals.css).

---

## Hero 3D cube (`components/hero/ServiceMesh.tsx`)

- 3×3×3 Rubik's cube built with Three.js + R3F.
- Each of 26 visible cubies carries a real tech logo (Node.js, TypeScript,
  Kubernetes, Kafka, Redis, Postgres, LangChain, etc.) rasterized to a
  `THREE.CanvasTexture` at mount from `simple-icons` SVG paths.
- Logos render in each brand's **official hex** on a `#121418` cubie body —
  subtle "engraving" feel.
- `MeshLambertMaterial` + one directional light so faces dim on the shadow
  side (user wanted colors to appear "as if lit from one direction" but not
  show an explicit light effect).
- Motion: fast multi-axis tumble + random 90° slice twists every ~0.7s.
- Mobile: everything still renders, no mouse parallax.
- **Gotchas**
  - `simple-icons` v16+ **drops** AWS, Azure, Oracle, OpenAI, S3 brand icons
    under trademark policy. Current substitutes: Docker (AWS), Ansible
    (Azure), Anthropic (Oracle), Ollama (OpenAI), MinIO (S3), CrewAI (AI
    Agents). If the user asks for any of those names, remember the swap.
  - `@react-three/fiber` v9 is the React-19-compatible version; don't
    downgrade.
  - Framer Motion's `useMemo(buildCubies, [])` eslint rule requires an inline
    function: `useMemo(() => buildCubies(), [])`.

---

## Sidebar nav (`components/nav/SidebarNav.tsx`)

- Two clickable folder groups: `portfolio/` (home) and `blogs/`
- Inside `portfolio/`, 8 sub-items are scroll-anchor links to the 8 home
  sections (hero, stats, about, expertise, products, skills, experience,
  contact). `blogs/` has no sub-items.
- Sub-items **only scroll-spy when on `/`**. When on a non-home route, they
  hard-navigate to `/#section` via `window.location.href`.
- Data source: `navGroups` in `lib/data.ts` (with `NavGroup`, `NavItem`,
  `NavItemIcon` types).
- Rendered on `/` (from `app/page.tsx`) and on `/blogs` (from
  `app/blogs/page.tsx`). **Intentionally NOT rendered on `/blogs/<slug>`** for
  distraction-free reading.

---

## Smooth scroll (`components/motion/LenisProvider.tsx`)

- `useLenis()` — returns the instance, or `null` if Lenis is disabled (e.g.
  `prefers-reduced-motion`).
- `smoothScrollTo(target, lenis)` — always use this for in-page anchor
  navigation. Uses `getElementById` for hash strings so **IDs beginning with
  a digit work** (rehype-slug can generate `"1-process-supervision"`, which
  `document.querySelector('#1-...')` cannot handle).
- Footer's "back to top" uses `lenis.scrollTo(0)` when off `/`, scrolls to
  `#hero` when on `/`.

---

## Blogs system

Blogs live in **Supabase** (`public.blogs`). The legacy MDX-on-disk
+ Nextra setup was migrated; there is no `content/blogs/` directory,
no `_meta.ts`, no `nextra-theme-blog`. See `docs/publishing-a-blog.md`
for the author workflow (Studio insert OR `pnpm dlx tsx scripts/import-blogs.ts`).

### Schema

`public.blogs` columns (the important ones):

| column           | type          | notes                                              |
|---|---|---|
| `slug`           | text (unique) | URL path; canonical forever, don't rename          |
| `title`          | text          | required                                            |
| `description`    | text          | required, ≤ 160 chars sweet spot                   |
| `body_md`        | text          | raw markdown, rendered via unified pipeline        |
| `tags`           | text[]        | first tag drives `og:section`                      |
| `author`         | text          | defaults to "Rahul Gupta"                          |
| `author_title`   | text          | subtitle under the author chip                     |
| `cover_image_url`| text          | optional cover                                      |
| `published_at`   | timestamptz   | drives sort + sitemap `lastModified`               |
| `updated_at`     | timestamptz   | optional; emits `og:modified_time` when set        |
| `is_published`   | bool          | `false` = draft (hidden everywhere)                |
| `reading_time`   | int           | computed at write time, 220 wpm                    |
| `word_count`     | int           | computed at write time                             |

Plus the search-index columns: `search_vector` (`tsvector`,
auto-maintained by trigger) and `search_text` (concat of title +
description + body for `pg_trgm` similarity).

### Data layer (`lib/blogs.ts`)

Thin Supabase wrapper. Public API:
- `searchBlogs({ q, tags, page, pageSize })` — calls the
  `search_blogs_v1` RPC (FTS via `websearch_to_tsquery` first, then
  `pg_trgm` `word_similarity` fallback for typo tolerance). Returns
  `{ items, total, hasMore }`.
- `getAllBlogSummaries()` — every published blog, sorted desc.
- `getBlogSlugs()` — slug list for `generateStaticParams`.
- `readBlog(slug)` — single row by slug, returns body + frontmatter
  shape compatible with the renderer.
- `getAdjacentBlogs(summaries, slug)` — prev/next.
- `getAllTags()` — distinct tag list with post counts (drives the
  topic dropdown).

### Rendering pipeline

`components/blogs/BlogMarkdown.tsx` runs `unified()`:
- `remark-parse` → `remark-gfm` → `remark-rehype`
- `rehype-slug` → `rehype-autolink-headings` (anchors)
- `@shikijs/rehype` (with `addLanguageClass: true`)
- `rehype-sanitize` (with `clobberPrefix: ""` to preserve heading IDs)
- a custom `rehypeCollectToc` plugin that walks the HAST and pushes
  `{value, id, depth}` into a passed-in array
- `rehype-react` to materialise the React tree

Output: `{ body: ReactNode, toc: TocItem[] }` from a single pipeline
pass.

### Routes

- `/blogs` — `dynamic = "force-dynamic"`. Hero + `BlogsToolbar` (search
  + topic picker) + `BlogsGrid` (server-rendered initial page +
  client-side "load more" via the `loadMoreBlogs` server action in
  `app/blogs/actions.ts`).
- `/blogs/[slug]` — `generateStaticParams` from `getBlogSlugs()`,
  fall back to on-demand for new slugs added post-deploy. Hero,
  drop-capped intro, `<PostTOC />` (sticky `xl+`), `<PostShare />`,
  `<PostNav />` (only renders cards that exist).
- `/blogs/opengraph-image` — list-page OG.
- `/blogs/[slug]/opengraph-image` — per-post OG with date + reading
  time + tags badge.

### Body components

- `pre` → `CodeBlock` (client) — reads `class="language-xxx"` on the
  inner `<code>` (set by `@shikijs/rehype` via `addLanguageClass`)
  for the header label. 3 mac dots + label + copy button.
- `img` → `LightboxImage` (client) — glassmorphism modal, zoom is
  **width-based** (`width: ${82 * zoom}vw`), NOT `transform: scale`,
  so overflow-auto legitimately scrolls. `F` toggles screen/natural
  fit. `+`/`-`/`0` zoom. `Esc` close.

### Shiki syntax highlighting

- Run as a rehype plugin in the BlogMarkdown pipeline (no Nextra).
- Dual-theme CSS vars (`--shiki-dark`, `--shiki-light`). We force dark
  site-wide via `blogs.css`:
  ```css
  .blog-prose pre,
  .blog-prose pre span {
    color: var(--shiki-dark, #d6dde8);
    font-style: var(--shiki-dark-font-style);
    ...
  }
  ```
  Don't re-introduce a flat `color: #d6dde8` on `pre code` — it'll
  clobber Shiki's inline token colors.

### Sitemap

`app/sitemap.ts` calls `getAllBlogSummaries()` at request time and
emits `/blogs/<slug>` per published row with `lastModified =
published_at`. No filesystem globbing.

### Prose CSS scope

All prose styling lives in `app/blogs/blogs.css` under the `.blog-prose`
selector. Things styled:
- headings w/ cyan tab accent on h2
- drop cap via `> p:first-child::first-letter` (not `:first-of-type`)
- ordered lists render `01 02 03` in cyan badges
- custom `▸` markers on unordered lists
- pull-quote blockquotes with left cyan rule
- inline code, tables, kbd, hr, images
- **task-list checkboxes** — custom cyan check centered via `translate(-50%,
  -55%) rotate(45deg)` on `::after`
- **strikethrough** — dim ink + cyan line
- inline SVG/img next to `<a>` — forced `display: inline-block;
  vertical-align: middle` (fixes external-link icons rendering on their own
  line)

---

## Contact section

- Primary CTA (`sm:col-span-2`): **Cal.com booking card** with a stylized
  calendar-page tile showing `15 MIN`, live availability indicator with
  `animate-ping`, topic chips (Intro, Hiring, Consultation, Agentic AI),
  round CTA button that fills cyan on hover.
- 4 secondary cards in a 2×2 grid: Email, Phone, LinkedIn, GitHub.
- LinkedIn and GitHub icons are **inline SVGs** because `lucide-react` v1.x
  dropped brand icons. Don't re-import them from lucide.
- Resume card (right column, `lg:w-[380px]`) fills the row height with a
  mini document preview, a "what's inside" bullet list, flex-1 spacer, PDF
  (primary) + .docx + .json buttons, and a footer meta strip.
- Big "say hello" display-font CTA at the bottom links to mailto.

---

## SEO

- `lib/seo.ts` defines `SITE_URL`, `SITE_NAME`, `SITE_DESCRIPTION`,
  `SITE_KEYWORDS`, `SITE_LOCALE` (`en_IN`), title template, etc.
- `app/layout.tsx` sets metadata (title template, OG, Twitter, canonical,
  robots directives, icons, viewport/themeColor, verification envvar).
- `components/seo/JsonLd.tsx` emits 6 schema.org blobs (Person, WebSite,
  ProfilePage, ItemList of 5 products, two OrganizationRole for jobs).
- `components/seo/BlogJsonLd.tsx` emits `BlogPosting` per post (author +
  publisher cross-link to the Person `@id`).
- Google Search Console is already **DNS-verified** (GoDaddy TXT). No need
  for `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`.

### JSON-LD security hook

The project has a `PreToolUse` hook that blocks writes containing the React
inner-HTML injection prop (the one that begins with `danger…`). Work around
it by building the props object dynamically and spreading it, instead of
writing the attribute literally in JSX. See
`components/seo/JsonLd.tsx` + `components/seo/BlogJsonLd.tsx` for the exact
pattern.

---

## Deployment (Vercel)

- Already deployed at `agenticwithrahul.in`. Auto-deploys on push to `main`.
- `vercel.json` minimal — `framework: nextjs`, `buildCommand: next build`,
  `installCommand: pnpm install`.
- `@vercel/analytics` is mounted in `app/layout.tsx`.
- Node 24 LTS on the platform (default). Next.js 16 runs on Turbopack.
- `next.config.ts` wraps the config with `withNextra()`.

---

## Copyright-sensitive dependencies

- `simple-icons` — dropped some brand logos; see the substitutions above.
- Resume DOCX / PDF — are the user's own files, always fine to serve.
- Nothing else touches external content.

---

## Workflow hints

- **Don't commit without explicit "commit" from the user.**
- When producing a commit, always include the Claude trailer:
  `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
- Spell-check (cSpell) warnings for terms like `BFSI`, `NBFC`, `cubie`,
  `Agentic`, `Kolkata`, `nextdotjs` — **not errors**, safe to ignore.
- Tailwind-suggest diagnostics like `h-[3px]` → `h-0.75` are stylistic only;
  don't feel obligated to rewrite unless asked.
- Always run `pnpm build` after non-trivial changes.
- Framer Motion's `layoutId` (e.g. `nav-pointer`) will animate across
  mount/unmount boundaries; keep the layoutId stable within a single page
  context or the animation looks janky on route change.
- R3F `useMemo(buildCubies, [])` → `useMemo(() => buildCubies(), [])` to
  satisfy `react-hooks/useMemo`.

---

## Useful commands

```sh
pnpm dev              # dev server at :3000
pnpm build            # production build + Turbopack type-check
pnpm start            # serve the built output
pnpm lint             # ESLint

# Resume downloads hit file routes that read from /public:
curl -I http://localhost:3000/resume/pdf
curl -s http://localhost:3000/resume/json | jq .

# Sitemap inspection:
curl -s http://localhost:3000/sitemap.xml
```
