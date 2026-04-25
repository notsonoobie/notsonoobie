# Publishing a new course

Courses live in Supabase across four tables — `courses`,
`course_sections`, `episodes`, `episode_content` — plus optional S3
media. Publishing is "insert the rows, flip `is_published = true`,
done." This doc is the author workflow.

If you haven't set up the schema, RLS, OAuth, or S3 yet, start at
[`docs/courses-setup.md`](./courses-setup.md). That covers the
one-time platform setup; this doc covers the per-course workflow.

---

## TL;DR

1. Insert one row in `public.courses`. Set `is_published = false`
   while you build it.
2. Insert one or more rows in `public.course_sections` for the
   chapters.
3. Insert episode rows in `public.episodes` (one per lesson / quiz /
   lab / etc.), each pointing at a section.
4. Insert matching `public.episode_content` rows — the content shape
   depends on the episode `kind`.
5. Smoke-test at `/courses/<slug>` while `is_published = false` (only
   you, with the row's `id` in the URL, can preview — see §10).
6. Flip `courses.is_published = true`. Live.

Use **Supabase Studio → SQL editor** for the inserts. The hierarchy
makes Studio's row-by-row insert UI tedious; one SQL block per course
is faster and version-controllable.

---

## 1. Prerequisites

Before you publish a course, the platform needs to be set up:

- Schema applied (`docs/courses-setup.md` §1).
- RLS policies in place (§2).
- OAuth providers configured (§3) — only matters if your course
  isn't free.
- (Optional) S3 bucket for cover images / episode videos (§3a).

Check by visiting `/courses` while signed out — the empty-state copy
("first course drops soon") confirms the read path works. If it
errors, fix the platform setup first.

---

## 2. Plan the course

Decisions to make before any SQL:

| Decision | Field | Notes |
|---|---|---|
| Slug | `courses.slug` | URL-safe, lowercase, hyphenated, **immutable**. |
| Title | `courses.title` | Hero, list card, OG, JSON-LD. |
| Tagline | `courses.tagline` | One-liner shown on the course card. |
| Description | `courses.description` | 1–2 paragraphs — shown on the detail page hero. |
| Level | `courses.level` | `beginner` / `intermediate` / `advanced`. Drives `og:section`. |
| Estimated duration | `courses.duration_min` | Total minutes. Shown on the card. |
| Free or paid | `courses.is_free` | v1 only ships free. Set `true` for now. |
| Sort order | `courses.sort_order` | Lower = appears earlier on `/courses`. |
| Section count | `course_sections` rows | 1 section ≈ a single-track course; 2+ ≈ chaptered. |
| Episode plan | per section | Slug, title, kind, ordering. |
| Final exam? | last episode `kind = "exam"` | If yes, the cert becomes credit-worthy. |

Episodes can be one of nine kinds. Pick per learning goal:

| Kind | Use for | Content shape |
|---|---|---|
| `lesson` | Long-form text + code | `episode_content.body_md` |
| `quiz` | Quick recall check | `episode_content.quiz` (jsonb array) |
| `lab` | Hands-on guided exercise | `episode_content.lab` (jsonb) |
| `visual` | Diagram / image walkthrough | `episode_content.visual` (jsonb) |
| `code` | Editor exercise with regex/substring validation | `episode_content.data` (jsonb) |
| `fill` | Fill-in-the-blank cloze | `episode_content.data` (jsonb) |
| `flashcards` | Flip-card review | `episode_content.data` (jsonb) |
| `resources` | Curated reading list | `episode_content.data` (jsonb) |
| `exam` | Timed final assessment, gates the cert | `episode_content.data` (jsonb) |

Full per-kind JSON examples are in `docs/courses-setup.md` §5b. Keep
that file open in another tab while authoring.

---

## 3. Step 1 — Insert the course row

```sql
insert into public.courses (
  slug, title, tagline, description,
  level, duration_min, is_free, is_published, sort_order
) values (
  'event-driven-101',
  'Event-Driven 101',
  'Why teams pick Kafka over REST when scale starts to bite.',
  'A short, opinionated tour of event-driven architecture: producers, consumers, log compaction, exactly-once semantics, and the operational gotchas that surface only at production traffic.',
  'beginner', 30, true, false, 0
);
```

`is_published = false` keeps it off `/courses` and out of the sitemap
while you finish the rest of the inserts. You can still view the page
at `/courses/<slug>` — RLS hides unpublished rows from `select`, but
the service-role admin endpoint and direct-link previews work for the
author.

If the course will have a **cover image** or **intro video**, add the
URLs (or S3 keys) to `cover_image_url` and `course_video_url`. The
schema enforces `course_video_url is null or cover_image_url is not
null` — a video without a banner makes no sense in the list view.

---

## 4. Step 2 — Define sections

Every episode lives in exactly one section. Sections are the
"chapters" on the detail page. Even a one-section course needs one
row here (the schema requires `episodes.section_id` NOT NULL).

**Single-section course** (typical for short courses):

```sql
insert into public.course_sections (course_id, slug, title, sort_order)
values (
  (select id from public.courses where slug = 'event-driven-101'),
  'course-content', 'Course content', 0
);
```

**Multi-section course** (when grouping helps the reader):

```sql
with c as (select id from public.courses where slug = 'streaming-systems')
insert into public.course_sections (course_id, slug, title, sort_order)
select c.id, x.slug, x.title, x.sort_order
from c, (values
  ('fundamentals',       'Fundamentals',       0),
  ('delivery-semantics', 'Delivery semantics', 1),
  ('operational-edges',  'Operational edges',  2)
) as x(slug, title, sort_order);
```

Section ordering rules:
- `sort_order` orders sections within a course (ascending).
- Section `slug` is unique within a course (`unique (course_id,
  slug)`), so two courses can both have a `fundamentals` section
  without colliding.
- Sections are organisational, not gating — completing the cert needs
  every episode in every published section, but sections themselves
  don't have completion checks.

---

## 5. Step 3 — Add episodes

```sql
with c as (select id from public.courses where slug = 'event-driven-101'),
     s as (
       select id, course_id from public.course_sections
       where course_id = (select id from c) and slug = 'course-content'
     )
insert into public.episodes (
  course_id, section_id, slug, title, description, kind, sort_order, is_published
)
select s.course_id, s.id, x.slug, x.title, x.description, x.kind, x.sort_order, true
from s, (values
  ('intro',      'What is event-driven, really?',
   'Strip the buzzwords. A producer writes to a log; consumers read from it.', 'lesson', 0),
  ('quick-quiz', 'Quick check',
   'Three questions to make sure the core ideas stuck.', 'quiz', 1),
  ('lab-1',      'Wire your first producer',
   'Plain TypeScript producer + console consumer in 20 lines.', 'lab', 2)
) as x(slug, title, description, kind, sort_order);
```

Critical column rules:

- `course_id` is **denormalised** on `episodes` for query performance
  (course-scoped progress + completion don't need the section join).
  Always set both `course_id` AND `section_id`.
- `slug` is unique per course (`unique (course_id, slug)`), not per
  section — so two episodes in different sections can't share a slug
  within the same course.
- `sort_order` is **section-relative**: the first episode in *each*
  section starts at 0. Cross-section navigation (prev/next on the
  player) walks the flattened ordered list automatically.
- `kind` must be one of the nine values listed in §2. The check
  constraint blocks anything else.
- `is_published = true` per episode. An unpublished episode in a
  published course is silently skipped from the listing AND from the
  certificate completion check (good — you can hold an episode back
  while finishing it).

Set `is_published = false` on episodes you're still writing and
publish them one at a time. The course detail page renders nothing
about unpublished episodes; users won't see a "coming soon" stub.

If an episode has an **intro video**, set `episodes.video_url` (S3
key or full URL) — the viewer renders it above the body content.

---

## 6. Step 4 — Add episode content

`episode_content` is 1:1 with `episodes` via `episode_id` PK. The
column you populate depends on the `kind`:

| Kind | Column to populate |
|---|---|
| `lesson` | `body_md` (markdown text) |
| `quiz` | `quiz` (jsonb) |
| `lab` | `lab` (jsonb) |
| `visual` | `visual` (jsonb) |
| `code`, `fill`, `flashcards`, `resources`, `exam` | `data` (jsonb) |

**Lesson example:**

```sql
insert into public.episode_content (episode_id, body_md)
select e.id,
$$# What is event-driven, really?

A **producer** writes a record to an append-only log. One or more
**consumers** read from that log at their own pace.

That's it. The whole genre — Kafka, Pulsar, Kinesis, NATS JetStream — is
variations on that one primitive.

```ts
producer.send({ topic: 'orders', value: JSON.stringify(order) })
```

That single line replaces three or four HTTP calls in a typical SOA.
$$
from public.episodes e
join public.courses c on c.id = e.course_id
where c.slug = 'event-driven-101' and e.slug = 'intro';
```

The body markdown goes through the same renderer as blog posts (GFM +
Shiki + drop cap on first paragraph + auto-anchored headings + lightbox
images). See [`docs/publishing-a-blog.md`](./publishing-a-blog.md) §3
for the full element reference.

> **SQL gotcha.** When the lesson body contains its own ` ``` ` code
> fences, wrap the SQL value in `$$ … $$` (Postgres's dollar-quoted
> string literal). Single-quote escaping breaks fast inside markdown.

**Other kinds** — full-detail SQL examples for `quiz`, `lab`, `visual`,
`code`, `fill`, `flashcards`, `resources`, and `exam` live in
[`docs/courses-setup.md`](./courses-setup.md) §5 + §5b. Same shape,
just different `kind` and content column.

---

## 7. Step 5 — Upload media (optional)

Skip this section if you're not using S3. Covers fall back to a
deterministic gradient + course-initials tile; videos simply don't
appear.

Upload media to your bucket (recommended layout):

```sh
aws s3 cp ./cover.jpg     s3://<bucket>/courses/event-driven-101/cover.jpg
aws s3 cp ./intro.mp4     s3://<bucket>/courses/event-driven-101/intro.mp4
aws s3 cp ./episode-01.mp4 s3://<bucket>/episodes/event-driven-101/intro.mp4
```

Then point the DB at the keys:

```sql
update public.courses
  set cover_image_url  = 'courses/event-driven-101/cover.jpg',
      course_video_url = 'courses/event-driven-101/intro.mp4'
  where slug = 'event-driven-101';

update public.episodes
  set video_url = 'episodes/event-driven-101/intro.mp4'
  where course_id = (select id from public.courses where slug = 'event-driven-101')
    and slug = 'intro';
```

The columns accept either a bare S3 key (resolved to a presigned URL
at render time, 1-hour TTL) or a full `https://…` URL (returned as-is
— useful for Unsplash covers or external CDNs during prototyping).

For video encoding: H.264 + AAC + faststart MP4. Faststart shifts the
moov atom to the front so the player starts before the file finishes
downloading.

```sh
ffmpeg -i input.mov -c:v libx264 -preset slow -crf 22 -c:a aac \
  -movflags +faststart out.mp4
```

---

## 8. Step 6 — Smoke test

Before flipping `is_published = true`:

```sh
pnpm dev
```

Walk through:

1. **Anon visit `/courses`** — the unpublished course is hidden.
2. **Direct visit `/courses/<slug>`** as the author — the detail page
   renders. (RLS hides unpublished rows from the public read; the
   service-role queries used by author preview surface them.)
3. **Sign in** with Google or GitHub. Click **Enroll**.
4. **Walk every episode** end-to-end. Each kind:
   - `lesson` — read the body, click **Mark complete**.
   - `quiz` — answer all questions, submit, verify score + explanations.
   - `lab` — open hints, reveal solution, **Mark complete**.
   - `visual` — image renders, **Mark complete**.
   - `code` — type into the editor, click **Validate**, check pass/fail.
   - `fill` — fill the blanks, submit, verify accepted answers list.
   - `flashcards` — flip every card; **Mark complete** unlocks at the
     end.
   - `resources` — click each link, return — checkmarks persist via
     `localStorage` (per episode + url).
   - `exam` — answer, submit; on pass the episode marks complete and
     the certificate auto-issues.
5. After the last episode, the **Completion card** turns green and a
   row appears in `public.course_certificates`. Visit
   `/certificates/<id>` to verify.
6. Sign out → episode URL bounces to `/login`.

If anything errors mid-walk, fix it and re-run from where you broke.
Episode progress is persisted, so you don't restart.

---

## 9. Step 7 — Publish

```sql
update public.courses
  set is_published = true, updated_at = now()
  where slug = 'event-driven-101';
```

The course immediately appears in:
- `/courses` (the catalogue)
- `/sitemap.xml` (with `lastModified = updated_at`)
- The `CourseListJsonLd` ItemList on the catalogue page
- The `CourseJsonLd` Course schema on the detail page (with the
  EducationalOccupationalCredential reference)

`/courses` is `dynamic = "force-dynamic"` so there's no cache to
bust. The detail page uses ISR with on-demand fallback for new
slugs.

---

## 10. Drafts

Three independent levers control visibility:

- **`courses.is_published = false`** — hides the entire course from
  `/courses` and the sitemap. Direct URL access by the public is
  blocked by RLS. Author preview still works (uses service-role).
- **`course_sections.is_published = false`** — hides one section
  while keeping the rest of the course live. Useful for "drop a
  chapter at a time" releases.
- **`episodes.is_published = false`** — hides a single episode.
  Counts toward neither the listing nor the certificate completion
  check.

The certificate auto-issues when **every published episode** in a
**published course** has a `episode_progress` row for the user.
Hold-back episodes don't block the cert; pulling an episode mid-course
shrinks the completion target.

---

## 11. Updating an existing course

Three flavours of update:

- **Typo / small fix in a lesson body** — edit `episode_content.body_md`
  in Studio. Bump `episodes.updated_at` so the page's
  `og:modified_time` reflects the change.
- **Adding a new episode mid-course** — insert into `episodes` with the
  next available `sort_order` for its section. Existing certs stay
  valid; users who completed the course before the new episode landed
  don't lose their cert (the row is immutable). New users see the new
  episode and need to complete it.
- **Re-ordering episodes** — update `sort_order` on the affected rows.
  The flattened prev/next chain re-derives at request time.
- **Renaming a slug** — please don't, unless the course has zero
  traffic. The slug IS the canonical URL forever. If you must, add a
  redirect in `next.config.ts`:
  ```ts
  async redirects() {
    return [{
      source: "/courses/<old-slug>",
      destination: "/courses/<new-slug>",
      permanent: true,
    }];
  }
  ```

If you're seeing stale data on the live site after a Studio edit,
push any code change to trigger a Vercel redeploy — that flushes the
static cache for course detail pages.

---

## 12. Deleting a course

```sql
delete from public.courses where slug = '<slug>';
```

The schema cascades: deleting a course cascades to its sections,
episodes, episode_content, enrollments, certificates, episode_progress,
and episode_state. **This means deleting a course wipes every user's
progress for it and revokes every certificate** — irreversible. If
you're rehoming a course, rename instead (see §11).

The route 404s after the next request. Add a 301 redirect for any
URL with measurable traffic.

---

## 13. Cache + propagation

- `/courses` — `dynamic = "force-dynamic"`. New publish visible on
  the next request.
- `/courses/<slug>` — statically pre-rendered for slugs known at
  build time, on-demand for new slugs added post-deploy. Edited
  bodies update on the next ISR window or after a redeploy.
- `/courses/<slug>/<episode-slug>` — auth-gated, dynamic per request,
  always fresh.
- `/sitemap.xml` — re-reads the DB on each crawl.
- Certificate URLs `/certificates/<id>` — dynamic, always reflect
  current row state.
- S3 presigned URLs — 1-hour TTL by default (see `lib/s3.ts`'s
  `resolveMediaUrl`).

---

## 14. What happens automatically

- **Catalogue listing** — `/courses` re-queries `getAllCourses()` on
  each request.
- **Episode listing** — the detail page renders sections + episodes
  via `getCourseBySlug()`.
- **Per-user progress** — when a user marks an episode complete, the
  app inserts into `episode_progress`. The completion gate counts
  rows; on full coverage it auto-issues the certificate via the
  service-role API (`/api/courses/certificate`).
- **Enrollment confirmation email** — `lib/emails/enrollment.ts`
  fires on enroll.
- **Completion email** — `lib/emails/completion.ts` fires when the
  cert issues, attaches the cert URL.
- **OG images** — `app/courses/opengraph-image.tsx` (catalogue),
  `app/courses/[courseSlug]/opengraph-image.tsx` (detail),
  `app/courses/[courseSlug]/[episodeSlug]/opengraph-image.tsx` (per
  episode).
- **JSON-LD** — Course + BreadcrumbList on the detail page;
  LearningResource + BreadcrumbList + VideoObject (when applicable)
  on episodes; ItemList on the catalogue;
  EducationalOccupationalCredential + BreadcrumbList on the cert page.
- **Sitemap** — course detail URLs included; episodes intentionally
  excluded (auth-gated, `Disallow`'d in robots.txt).

---

## 15. Pre-publish checklist

- [ ] Slug is lowercase, hyphenated, descriptive, stable
- [ ] `title` reads as a sharp standalone tweet
- [ ] `tagline` and `description` fit the layout (tagline ≤ 100 chars
      ideal, description 200–400 chars)
- [ ] `level` set (`beginner` / `intermediate` / `advanced`)
- [ ] `duration_min` reflects realistic completion time
- [ ] At least one section, ordered correctly
- [ ] Every episode has matching `episode_content` (no orphans)
- [ ] Every episode `kind` matches the column you populated
- [ ] `sort_order` set correctly within each section
- [ ] If using a final exam: `passing_score` and `time_limit_min` set
- [ ] Cover image set OR intentional fallback to gradient tile
- [ ] If video present: `course_video_url` requires `cover_image_url`
- [ ] All episodes `is_published = true` (except deliberate hold-backs)
- [ ] Completed a full smoke walk-through end-to-end while signed in
- [ ] Certificate URL renders (after walking the full course as a
      test user)

Then:

```sql
update public.courses
  set is_published = true, updated_at = now()
  where slug = '<slug>';
```

Visit `/courses/<slug>` once after the flip to warm the on-demand
render. For Google to index the new course quickly: Search Console →
URL Inspection → paste the new URL → **Request indexing**.

---

That's the whole flow. SQL in (one course at a time), curriculum out.
