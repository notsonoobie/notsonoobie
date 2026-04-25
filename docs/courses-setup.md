# Courses — Supabase + OAuth setup (v1)

The Courses platform is auth-gated and DB-driven. Every published course
and episode lives in Supabase tables; the app reads them via an
RLS-respecting cookie-aware client. Sign-in is Google or GitHub OAuth via
Supabase Auth — no passwords, no OTP, no custom session code.

What you wire up here:

1. Six tables + RLS policies (no `profiles` mirror — user identity lives
   on `auth.users` directly). Sections (a.k.a. chapters) sit between
   courses and episodes so you can group lectures by topic.
2. Google and GitHub OAuth providers in Supabase Auth.
3. One env var (`SUPABASE_PUBLISHABLE_KEY`) on top of the existing newsletter
   vars.
4. (Optional) Sample course rows for smoke testing.

---

## 1. Run the schema

Open Supabase → **SQL editor** → **New query** → paste and run:

```sql
-- ─────────────────────────────────────────────────────────────────────────
-- courses : top-level units, free or premium (premium gating ships in v2).
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.courses (
  id               bigint generated always as identity primary key,
  slug             text not null unique,
  title            text not null,
  tagline          text,
  description      text,
  cover_image_url  text,
  -- Optional intro video shown on the course detail page when the
  -- banner is also set. Constrained below: video_url requires
  -- cover_image_url so the list view (banner-only) always has
  -- something to render.
  course_video_url text,
  level            text,
  duration_min     int,
  is_free          boolean not null default true,
  is_published     boolean not null default false,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint courses_video_requires_cover
    check (course_video_url is null or cover_image_url is not null)
);

-- ─────────────────────────────────────────────────────────────────────────
-- course_sections : ordered groups of episodes inside a course (Udemy-style
-- "Sections / Chapters"). Every episode lives in exactly one section.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.course_sections (
  id              bigint generated always as identity primary key,
  course_id       bigint not null references public.courses(id) on delete cascade,
  slug            text not null,
  title           text not null,
  description     text,
  sort_order      int not null default 0,
  is_published    boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (course_id, slug)
);

create index if not exists course_sections_course_idx
  on public.course_sections (course_id, sort_order);

-- ─────────────────────────────────────────────────────────────────────────
-- episodes : ordered children of a section; one of nine kinds.
-- `course_id` is denormalized so course-scoped queries (counts, progress,
-- completion gate) stay a single eq() — `section_id` is the grouping axis.
-- `sort_order` is section-relative (first episode in each section = 0).
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.episodes (
  id              bigint generated always as identity primary key,
  course_id       bigint not null references public.courses(id) on delete cascade,
  section_id      bigint not null references public.course_sections(id) on delete cascade,
  slug            text not null,
  title           text not null,
  description     text,
  kind            text not null check (kind in (
                    'lesson','quiz','lab','visual',
                    'code','fill','flashcards','resources','exam'
                  )),
  sort_order      int not null default 0,
  is_published    boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(course_id, slug)
);

create index if not exists episodes_section_idx
  on public.episodes (section_id, sort_order);

-- ─────────────────────────────────────────────────────────────────────────
-- episode_content : 1:1 with episodes; flexible JSON per kind.
--   lesson  → body_md
--   quiz    → quiz   :: jsonb (array of { question, options, correct, explanation })
--   lab     → lab    :: jsonb ({ instructions_md, hints, solution_md })
--   visual  → visual :: jsonb ({ kind: 'svg'|'image', src, alt, caption })
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.episode_content (
  episode_id      bigint primary key references public.episodes(id) on delete cascade,
  body_md         text,        -- lesson body (markdown)
  quiz            jsonb,       -- legacy quiz column (still used)
  lab             jsonb,       -- legacy lab column (still used)
  visual          jsonb,       -- legacy visual column (still used)
  data            jsonb        -- generic blob for v1.5+ kinds (code, fill, flashcards, resources, exam)
);

-- ─────────────────────────────────────────────────────────────────────────
-- episode_progress : user × episode completion log.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.episode_progress (
  user_id         uuid not null references auth.users(id) on delete cascade,
  episode_id      bigint not null references public.episodes(id) on delete cascade,
  completed_at    timestamptz not null default now(),
  quiz_score      int check (quiz_score is null or (quiz_score between 0 and 100)),
  primary key (user_id, episode_id)
);

-- ─────────────────────────────────────────────────────────────────────────
-- course_enrollments : the gate between sign-in and episode access. One
-- row per (user, course). Free courses upsert via /api/courses/enroll on
-- explicit user click. Future paid courses upsert from the Razorpay
-- webhook after capture.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.course_enrollments (
  user_id     uuid not null references auth.users(id) on delete cascade,
  course_id   bigint not null references public.courses(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

-- ─────────────────────────────────────────────────────────────────────────
-- course_certificates : one per (user, course); id is publicly shareable.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.course_certificates (
  id              text primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  course_id       bigint not null references public.courses(id) on delete cascade,
  issued_at       timestamptz not null default now(),
  unique (user_id, course_id)
);

-- ─────────────────────────────────────────────────────────────────────────
-- episode_state : mutable per-(user, episode) UI state. Distinct from
-- episode_progress (the immutable completion fact). Holds every piece of
-- in-progress interaction so a user picking up on another device sees the
-- exact same state. Upserts continuously while the user interacts.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.episode_state (
  user_id                uuid not null references auth.users(id) on delete cascade,
  episode_id             bigint not null references public.episodes(id) on delete cascade,
  -- video kind
  video_position_seconds numeric,
  -- resources kind
  resources_read         jsonb not null default '[]'::jsonb,
  -- flashcards kind
  flashcards_seen        jsonb not null default '[]'::jsonb,
  flashcards_index       int,
  -- quiz / exam kinds — { picks, submitted, score }
  quiz_state             jsonb,
  -- code kind — last typed code
  code_draft             text,
  -- fill kind — { answers, submitted }
  fill_state             jsonb,
  -- lab kind — { hintsOpen, solutionOpen }
  lab_state              jsonb,
  updated_at             timestamptz not null default now(),
  primary key (user_id, episode_id)
);
```

> **No `profiles` table?** Right — for v1, every field we'd put there
> (`display_name`, `avatar_url`) already lives on `auth.users.user_metadata`,
> populated automatically from the OAuth provider. Plan-level data
> (`plan`, `premium_since`) lands in `auth.users.app_metadata` when the v2
> Razorpay flow ships. `app_metadata` is admin-only, so users can't
> self-promote to premium. Zero schema migration needed at that point.

> **Cover images.** `courses.cover_image_url` is a plain `text` URL —
> external URLs work, but the recommended path is a public Supabase
> Storage bucket. Create one called `course-covers` in **Storage → Create
> bucket** and toggle "public". Upload your image, copy the public URL,
> and `update public.courses set cover_image_url = '...' where slug = '...'`.
> When the column is null, `components/courses/CourseCover.tsx` falls back
> to a deterministic gradient + course-initials tile, so courses look
> presentable from day one without art.

### Already on the v1 schema? Apply this migration

If you ran §1 before v1.5 landed, run this once to pick up the new
episode kinds (`code`, `fill`, `flashcards`, `resources`, `exam`), the
generic `data jsonb` column, and the `episode_state` table for
server-side per-episode UI state. Idempotent — safe to re-run.

```sql
-- 1. Allow the new kinds.
alter table public.episodes drop constraint if exists episodes_kind_check;
alter table public.episodes add constraint episodes_kind_check
  check (kind in (
    'lesson','quiz','lab','visual',
    'code','fill','flashcards','resources','exam'
  ));

-- 2. Add the generic content column.
alter table public.episode_content
  add column if not exists data jsonb;

-- 2a. Enrollments table (gate between sign-in and episode access).
create table if not exists public.course_enrollments (
  user_id     uuid not null references auth.users(id) on delete cascade,
  course_id   bigint not null references public.courses(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

alter table public.course_enrollments enable row level security;

create policy "enrollments_select_own"
  on public.course_enrollments for select
  using (auth.uid() = user_id);
create policy "enrollments_insert_own"
  on public.course_enrollments for insert
  with check (auth.uid() = user_id);

-- 3. Mutable per-(user, episode) UI state.
create table if not exists public.episode_state (
  user_id                uuid not null references auth.users(id) on delete cascade,
  episode_id             bigint not null references public.episodes(id) on delete cascade,
  video_position_seconds numeric,
  resources_read         jsonb not null default '[]'::jsonb,
  flashcards_seen        jsonb not null default '[]'::jsonb,
  flashcards_index       int,
  quiz_state             jsonb,
  code_draft             text,
  fill_state             jsonb,
  lab_state              jsonb,
  updated_at             timestamptz not null default now(),
  primary key (user_id, episode_id)
);

-- If you already had an earlier `episode_state` table, this catches you up:
alter table public.episode_state add column if not exists flashcards_index int;
alter table public.episode_state add column if not exists quiz_state       jsonb;
alter table public.episode_state add column if not exists code_draft       text;
alter table public.episode_state add column if not exists fill_state       jsonb;
alter table public.episode_state add column if not exists lab_state        jsonb;

-- ─────────────────────────────────────────────────────────────────────────
-- Course intro video
-- ─────────────────────────────────────────────────────────────────────────
-- Optional: add a video that plays on the course detail page (where the
-- banner is shown) as a hero. The list view always renders the banner,
-- never the video, so a video without a banner makes no sense — we
-- enforce that at the DB layer with a CHECK constraint.
alter table public.courses
  add column if not exists course_video_url text;

alter table public.courses
  drop constraint if exists courses_video_requires_cover;
alter table public.courses
  add constraint courses_video_requires_cover
  check (course_video_url is null or cover_image_url is not null);

alter table public.episode_state enable row level security;

create policy "state_select_own"
  on public.episode_state for select
  using (auth.uid() = user_id);
create policy "state_insert_own"
  on public.episode_state for insert
  with check (auth.uid() = user_id);
create policy "state_update_own"
  on public.episode_state for update
  using (auth.uid() = user_id);
```

### Already on the v1.5 schema? Apply the sections migration

If you ran §1 before sections landed, run this once. It backfills every
existing course with a single "Course content" section, points all
existing episodes at it, and only then makes `episodes.section_id` NOT
NULL — so the migration is atomic and safe even on a populated DB.

```sql
-- 1. Sections table.
create table if not exists public.course_sections (
  id              bigint generated always as identity primary key,
  course_id       bigint not null references public.courses(id) on delete cascade,
  slug            text not null,
  title           text not null,
  description     text,
  sort_order      int not null default 0,
  is_published    boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (course_id, slug)
);

create index if not exists course_sections_course_idx
  on public.course_sections (course_id, sort_order);

-- 2. Backfill: every existing course gets one default section.
insert into public.course_sections (course_id, slug, title, sort_order)
select id, 'course-content', 'Course content', 0
from public.courses
on conflict (course_id, slug) do nothing;

-- 3. Add nullable FK on episodes, point all rows at the default, then
--    flip NOT NULL once the backfill is done.
alter table public.episodes
  add column if not exists section_id bigint references public.course_sections(id)
    on delete cascade;

update public.episodes e
set section_id = s.id
from public.course_sections s
where s.course_id = e.course_id
  and s.slug = 'course-content'
  and e.section_id is null;

alter table public.episodes
  alter column section_id set not null;

create index if not exists episodes_section_idx
  on public.episodes (section_id, sort_order);

-- 4. RLS: section visible iff it's published and its course is.
alter table public.course_sections enable row level security;

create policy "course_sections public read"
  on public.course_sections for select
  using (
    is_published
    and exists (
      select 1 from public.courses c
      where c.id = course_id and c.is_published
    )
  );
```

---

## 2. RLS policies

Run this in the SQL editor right after the schema:

```sql
-- courses : everyone (incl. anon) can browse the published catalogue.
alter table public.courses enable row level security;

create policy "courses_select_published"
  on public.courses for select
  using (is_published = true);

-- course_sections : visible iff the section is published and its course is.
alter table public.course_sections enable row level security;

create policy "course_sections public read"
  on public.course_sections for select
  using (
    is_published
    and exists (
      select 1 from public.courses c
      where c.id = course_id and c.is_published
    )
  );

-- episodes : everyone can list episodes of published courses.
alter table public.episodes enable row level security;

create policy "episodes_select_published"
  on public.episodes for select
  using (
    is_published = true
    and exists (
      select 1 from public.courses c
      where c.id = episodes.course_id and c.is_published = true
    )
  );

-- episode_content : auth required. v1 only ships free courses, so the
-- premium check is a single line you'll un-comment when v2 lands.
alter table public.episode_content enable row level security;

create policy "episode_content_select_authed"
  on public.episode_content for select
  to authenticated
  using (
    exists (
      select 1
      from public.episodes e
      join public.courses c on c.id = e.course_id
      where e.id = episode_content.episode_id
        and e.is_published = true
        and c.is_published = true
        and c.is_free = true
        -- v2: replace the line above with:
        -- and (c.is_free = true
        --      or coalesce((auth.jwt() -> 'app_metadata' ->> 'plan'), 'free') = 'premium')
    )
  );

-- episode_progress : strictly own rows.
alter table public.episode_progress enable row level security;

create policy "progress_select_own"
  on public.episode_progress for select
  using (auth.uid() = user_id);

create policy "progress_insert_own"
  on public.episode_progress for insert
  with check (auth.uid() = user_id);

create policy "progress_update_own"
  on public.episode_progress for update
  using (auth.uid() = user_id);

-- course_enrollments : strictly own rows.
alter table public.course_enrollments enable row level security;

create policy "enrollments_select_own"
  on public.course_enrollments for select
  using (auth.uid() = user_id);
create policy "enrollments_insert_own"
  on public.course_enrollments for insert
  with check (auth.uid() = user_id);

-- course_certificates : owner can read; inserts go through the service-role
-- API route so users can't self-issue.
alter table public.course_certificates enable row level security;

create policy "certs_select_own"
  on public.course_certificates for select
  using (auth.uid() = user_id);

-- episode_state : strictly own rows on every operation.
alter table public.episode_state enable row level security;

create policy "state_select_own"
  on public.episode_state for select
  using (auth.uid() = user_id);
create policy "state_insert_own"
  on public.episode_state for insert
  with check (auth.uid() = user_id);
create policy "state_update_own"
  on public.episode_state for update
  using (auth.uid() = user_id);
```

The service-role key (`SUPABASE_SECRET_KEY`) bypasses RLS, so the cert
issuance route in `app/api/courses/progress/route.ts` can insert on the
user's behalf without a permissive policy.

---

## 3. Configure OAuth providers

Both providers are configured **in the Supabase dashboard**, not in the
repo. No client IDs or secrets ever touch the codebase.

### Common redirect URL

For both Google and GitHub the redirect URL is:

```
https://<your-supabase-project>.supabase.co/auth/v1/callback
```

(Supabase shows the exact URL at **Auth → URL Configuration**.) That URL
is the callback _Supabase_ uses; this app's own callback at
`/auth/callback` is hit afterwards.

You also need to set the **Site URL** (Auth → URL Configuration) to
`https://agenticwithrahul.in` and add `http://localhost:3000` to the list
of allowed redirect URLs for local development.

### Google

1. Create an OAuth 2.0 client at <https://console.cloud.google.com> →
   APIs & Services → Credentials → **Create Credentials → OAuth client ID
   → Web application**.
2. Authorized redirect URI = the Supabase callback URL above.
3. Copy the Client ID + Secret into Supabase → **Auth → Providers →
   Google** → enable, paste, save.

### GitHub

1. Create an OAuth App at <https://github.com/settings/developers> →
   **New OAuth App**.
2. Homepage URL: `https://agenticwithrahul.in`.
   Authorization callback URL: the Supabase callback URL above.
3. Generate a client secret. Copy ID + Secret into Supabase → **Auth →
   Providers → GitHub** → enable, paste, save.

Both providers should now be flipped on in **Auth → Providers**. The
rest of the app reads them via `supabase.auth.signInWithOAuth({ provider })`.

---

## 3a. S3 media setup (optional)

Course covers and episode intro videos are stored in a private S3 bucket
and served through presigned GET URLs generated server-side per render.
You can skip this whole section — courses still render without it (covers
fall back to a generated gradient + course-initials tile, videos simply
don't appear).

### Create the bucket

1. AWS Console → **S3 → Create bucket**.
2. Pick a name (e.g. `agenticwithrahul-media`) and a region (`ap-south-1`
   if you're in India — same region as your users keeps presigned URLs
   fast).
3. **Block all public access**: leave the default ON. We never serve
   files publicly; every URL is presigned + expiring.
4. Defaults are fine for the rest. Create.

### CORS rules

The bucket needs CORS so the browser can play videos via `<video>`
range-requests. Bucket → **Permissions → CORS configuration**:

```json
[
  {
    "AllowedOrigins": ["https://agenticwithrahul.in", "http://localhost:3000"],
    "AllowedMethods": ["GET"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length", "Accept-Ranges"]
  }
]
```

Add your `*.vercel.app` preview domain to `AllowedOrigins` if you want
covers/videos in PR previews.

### IAM user — read-only

Create an IAM user (e.g. `agenticwithrahul-media-reader`), no console
access, programmatic only. Attach this inline policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::<your-bucket>/*"
    }
  ]
}
```

Generate an access key — that's the `S3_ACCESS_KEY_ID` and
`S3_SECRET_ACCESS_KEY` you'll paste into env vars below. **Read-only on
purpose**: the app never uploads. You upload covers and videos via the
AWS Console or `aws s3 cp`.

### Upload media

```sh
aws s3 cp ./cover.jpg s3://<your-bucket>/courses/event-driven-101/cover.jpg
aws s3 cp ./intro.mp4 s3://<your-bucket>/episodes/event-driven-101/intro.mp4
```

Recommended layout: `courses/<slug>/cover.<ext>` for covers,
`episodes/<course-slug>/<episode-slug>.<ext>` for videos. Doesn't matter
to the app — the DB just stores the key — but keeping a convention pays
off when you have 10+ courses.

Pro tip: convert videos to H.264 + AAC in an MP4 container before
upload. `ffmpeg -i input.mov -c:v libx264 -preset slow -crf 22 -c:a aac
-movflags +faststart out.mp4`. Faststart shifts the moov atom to the
front so the browser can start playing before the file finishes
downloading.

### Wire to the DB

The same column accepts either a bare S3 key or a full `https://…` URL.
Bare keys are resolved to a presigned URL at render time; full URLs are
returned untouched (handy for Unsplash covers, etc.).

```sql
update public.courses
  set cover_image_url = 'courses/event-driven-101/cover.jpg'
  where slug = 'event-driven-101';

update public.episodes
  set video_url = 'episodes/event-driven-101/intro.mp4'
  where course_id = (select id from public.courses where slug = 'event-driven-101')
    and slug = 'intro';
```

### Already on the v1.5 schema? Apply this migration

Adds the `episodes.video_url` column. Idempotent.

```sql
alter table public.episodes
  add column if not exists video_url text;
```

> **Single-vendor alternative.** Supabase Storage is S3-compatible and
> supports presigned URLs natively. If you'd rather not run an AWS
> account, swap the `S3Client` `endpoint` config in `lib/s3.ts` to the
> Supabase Storage S3 endpoint
> (`https://<project>.supabase.co/storage/v1/s3`) and use a Supabase
> service-role key as the IAM credential. The DB columns and resolver
> logic stay identical.

---

## 4. Env vars

The newsletter system already requires `SUPABASE_URL` and
`SUPABASE_SECRET_KEY`. Courses adds **one** required var (publishable
key) and **four optional** (S3 media). All server-only.

| Variable | Where it comes from | Required |
| --- | --- | --- |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase → Settings → **API Keys** → **Create new publishable key** (starts with `sb_publishable_…`) | yes |
| `S3_REGION` | AWS region of the bucket (e.g. `ap-south-1`) | only if using S3 covers/videos |
| `S3_BUCKET` | Bucket name (e.g. `agenticwithrahul-media`) | only if using S3 covers/videos |
| `S3_ACCESS_KEY_ID` | Access key from the read-only IAM user (§3a) | only if using S3 covers/videos |
| `S3_SECRET_ACCESS_KEY` | Matching secret | only if using S3 covers/videos |

Why is the publishable key server-only? Every auth flow (sign-in
redirect, callback, sign-out) runs through a server route. The browser
never needs to talk to Supabase directly, so there's no reason to ship
this key in the bundle. If you later add real-time client features
(e.g. a Q&A inbox), promote it to `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

If you're still on the legacy anon JWT, the server falls back to
`SUPABASE_ANON_KEY`. Migrate at your leisure.

Add the new vars on Vercel under **Project settings → Environment
Variables** for both **Production** and **Preview**, then redeploy.

---

## 5. Sample course (smoke test)

Run this once to seed a 3-episode course you can click through to verify
everything end-to-end:

> The block below uses a **4-backtick fence** (` ```` `). The lesson body
> contains its own ` ``` ` markdown code blocks inside the Postgres
> `$$…$$` dollar-quoted string, so a normal 3-backtick outer fence would
> close early when rendered. Postgres doesn't care; markdown does.

````sql
with c as (
  insert into public.courses (slug, title, tagline, description, level, duration_min, is_free, is_published, sort_order)
  values (
    'event-driven-101',
    'Event-Driven 101',
    'Why teams pick Kafka over REST when scale starts to bite.',
    'A short, opinionated tour of event-driven architecture: producers, consumers, log compaction, exactly-once semantics, and the operational gotchas that surface only at production traffic.',
    'beginner', 30, true, true, 0
  )
  returning id
), s as (
  -- Single default section for the smoke-test seed. A real course can
  -- declare multiple — see the multi-section example below.
  insert into public.course_sections (course_id, slug, title, sort_order)
  select id, 'course-content', 'Course content', 0 from c
  returning id, course_id
)
insert into public.episodes (course_id, section_id, slug, title, description, kind, sort_order, is_published)
select s.course_id, s.id, x.slug, x.title, x.description, x.kind, x.sort_order, true
from s, (values
  ('intro',      'What is event-driven, really?', 'Strip the buzzwords. A producer writes to a log; consumers read from it.', 'lesson', 0),
  ('quick-quiz', 'Quick check',                   'Three questions to make sure the core ideas stuck.',                       'quiz',   1),
  ('lab-1',      'Wire your first producer',      'Plain TypeScript producer + console consumer in 20 lines.',                'lab',    2)
) as x(slug, title, description, kind, sort_order);

insert into public.episode_content (episode_id, body_md)
select e.id,
$$# What is event-driven, really?

> Strip away the buzzwords for a moment.

A **producer** writes a record to an append-only log. One or more **consumers** read from that log at their own pace.

That's it. The whole genre — Kafka, Pulsar, Kinesis, NATS JetStream — is
variations on that one primitive.

## Why this matters

In a request/response system, the producer is responsible for knowing every
downstream consumer. Adding a new analytics pipeline means changing the
producer. In an event-driven system, the producer publishes once; new
consumers subscribe without coordination.

```ts
producer.send({ topic: 'orders', value: JSON.stringify(order) })
```

That single line replaces three or four HTTP calls in a typical SOA.
$$
from public.episodes e
join public.courses c on c.id = e.course_id
where c.slug = 'event-driven-101' and e.slug = 'intro';

insert into public.episode_content (episode_id, quiz)
select e.id,
'[
  {
    "question": "Which is the defining characteristic of event-driven architecture?",
    "options": [
      "Synchronous HTTP between services",
      "Producers publish to a log; consumers subscribe independently",
      "All services share a single relational database",
      "REST endpoints on every microservice"
    ],
    "correct": 1,
    "explanation": "Decoupling producers from consumers is the entire point. Everything else is plumbing."
  },
  {
    "question": "What does log compaction give you?",
    "options": [
      "Smaller storage at the cost of replay history",
      "Latest-value-per-key snapshot, useful for state-restore",
      "Automatic encryption of records",
      "Cross-region replication"
    ],
    "correct": 1,
    "explanation": "Compacted topics keep the most recent record per key — perfect for materialising a current-state view."
  },
  {
    "question": "Which problem do consumer groups solve?",
    "options": [
      "Authentication against the broker",
      "Sharing a topic across parallel readers without re-processing the same partition",
      "Schema evolution",
      "TLS termination"
    ],
    "correct": 1,
    "explanation": "Consumer groups partition-balance work across multiple instances of the same logical consumer."
  }
]'::jsonb
from public.episodes e
join public.courses c on c.id = e.course_id
where c.slug = 'event-driven-101' and e.slug = 'quick-quiz';

insert into public.episode_content (episode_id, lab)
select e.id,
'{
  "instructions_md": "## Wire your first producer\n\nIn this lab you''ll stand up a one-file Node script that publishes to a Kafka topic and reads back from it.\n\n1. `npm install kafkajs` in any scratch directory.\n2. Spin up a single-broker Kafka via Docker:\n   ```\n   docker run -p 9092:9092 -e ALLOW_PLAINTEXT_LISTENER=yes bitnami/kafka:latest\n   ```\n3. Write a script that produces 5 messages on topic `orders` and consumes them.\n\nWhen the consumer prints all 5 messages, mark this episode complete.",
  "hints": [
    "kafkajs needs `clientId` and `brokers` in the constructor.",
    "Consumers must subscribe to the topic *and* call `run()` with an `eachMessage` handler."
  ],
  "solution_md": "## Reference solution\n\n```ts\nimport { Kafka } from \"kafkajs\";\n\nconst kafka = new Kafka({ clientId: \"demo\", brokers: [\"localhost:9092\"] });\nconst producer = kafka.producer();\nconst consumer = kafka.consumer({ groupId: \"demo-group\" });\n\nawait producer.connect();\nfor (let i = 0; i < 5; i++) {\n  await producer.send({ topic: \"orders\", messages: [{ value: `order-${i}` }] });\n}\n\nawait consumer.connect();\nawait consumer.subscribe({ topic: \"orders\", fromBeginning: true });\nawait consumer.run({ eachMessage: async ({ message }) => console.log(message.value?.toString()) });\n```\n\nIf you see `order-0` through `order-4` print to stdout, you''re done."
}'::jsonb
from public.episodes e
join public.courses c on c.id = e.course_id
where c.slug = 'event-driven-101' and e.slug = 'lab-1';
````

You should now see the course at `/courses/event-driven-101` with three
episodes you can complete in turn. Finishing all three auto-issues a
certificate.

### Multi-section pattern

For a real chaptered course, declare each section explicitly and link
episodes by `section_id`. Sections are ordered by their own
`sort_order`; episode `sort_order` is **section-relative** (each
section's first episode is `0`).

```sql
with c as (
  insert into public.courses (slug, title, tagline, level, duration_min, is_free, is_published, sort_order)
  values ('streaming-systems', 'Streaming Systems', 'From log primitives to exactly-once.', 'intermediate', 90, true, true, 1)
  returning id
), s_fundamentals as (
  insert into public.course_sections (course_id, slug, title, sort_order)
  select id, 'fundamentals', 'Fundamentals', 0 from c
  returning id, course_id
), s_delivery as (
  insert into public.course_sections (course_id, slug, title, sort_order)
  select id, 'delivery-semantics', 'Delivery semantics', 1 from c
  returning id, course_id
), all_episodes as (
  -- Section 1 — fundamentals (sort_order resets per section).
  insert into public.episodes (course_id, section_id, slug, title, kind, sort_order, is_published)
  select course_id, id, 'log-primer',  'The log as a primitive', 'lesson', 0, true from s_fundamentals
  union all
  select course_id, id, 'producers',   'Producers in practice',  'lesson', 1, true from s_fundamentals
  union all
  -- Section 2 — delivery semantics.
  select course_id, id, 'at-least-once', 'At-least-once', 'lesson', 0, true from s_delivery
  union all
  select course_id, id, 'exactly-once', 'Exactly-once',  'lesson', 1, true from s_delivery
  returning 1
)
select count(*) from all_episodes;
```

The course detail page will render two collapsible-feeling section
cards, each numbering its episodes from 01. Prev/next on the player
walks the whole chain across the section boundary. Certificate still
issues only after all four episodes are complete — sections are
organizational, not gating.

---

## 5b. More episode kinds (v1.5)

Beyond `lesson`, `quiz`, `lab`, `visual`, the platform ships five more
episode kinds. Each one stores its content in `episode_content.data`
(jsonb). Set `episodes.kind` to the matching string and the viewer
auto-dispatches to the right component.

### `code` — interactive code exercise

Validation runs client-side: regex match, substring match, or `all` of
multiple conditions. Server doesn't execute code — this is for syntactic
verification ("your answer must include `await producer.send(`").

```sql
insert into public.episode_content (episode_id, data)
select e.id, '{
  "language": "ts",
  "prompt_md": "Write a Kafka producer that sends an `orders` message.",
  "starter": "import { Kafka } from \"kafkajs\";\n\n// your code here\n",
  "validate": {
    "type": "all",
    "items": [
      { "type": "substring", "value": "new Kafka(" },
      { "type": "regex", "pattern": "producer\\.send\\(" }
    ],
    "hint": "Construct a Kafka client and call producer.send()."
  },
  "solution": "const kafka = new Kafka({ clientId: \"demo\", brokers: [\"localhost:9092\"] });\nconst producer = kafka.producer();\nawait producer.connect();\nawait producer.send({ topic: \"orders\", messages: [{ value: \"hi\" }] });"
}'::jsonb
from public.episodes e where e.slug = 'first-producer';
```

### `fill` — fill-in-the-blank cloze

`text` carries `{{0}}`, `{{1}}` markers. `blanks[i]` is the array of
accepted answers (case-insensitive, trimmed match) for blank `i`.

```sql
insert into public.episode_content (episode_id, data)
select e.id, '{
  "prompt_md": "Fill in the blanks for a Kafka topic creation command.",
  "text": "kafka-topics --create --topic {{0}} --partitions {{1}} --replication-factor {{2}}",
  "blanks": [
    ["orders", "events"],
    ["3"],
    ["1", "2", "3"]
  ],
  "explanation_md": "Three replicas is the typical production minimum, but 1 is fine for local Docker."
}'::jsonb
from public.episodes e where e.slug = 'topic-create';
```

### `flashcards` — flip-card review deck

Plain front/back pairs. Markdown allowed in both. Episode is markable
complete only after every card is reviewed (next-button advances).

```sql
insert into public.episode_content (episode_id, data)
select e.id, '{
  "prompt_md": "Review the core Kafka terminology.",
  "cards": [
    { "front": "Producer", "back": "Process that publishes records to a Kafka topic." },
    { "front": "Consumer group", "back": "Set of consumers that share work across topic partitions." },
    { "front": "Log compaction", "back": "Retention strategy that keeps the latest record per key." }
  ]
}'::jsonb
from public.episodes e where e.slug = 'kafka-flashcards';
```

### `resources` — curated reading list

Type icon: `doc | paper | video | tool | repo | article`. The viewer
tracks read-state in `localStorage` (per episode + url) so checkmarks
persist across visits without DB writes.

```sql
insert into public.episode_content (episode_id, data)
select e.id, '{
  "prompt_md": "Deep-dive reading once you''re comfortable with the basics.",
  "items": [
    {
      "title": "Kafka: The Definitive Guide (free chapter)",
      "url": "https://www.confluent.io/resources/kafka-the-definitive-guide-v2/",
      "type": "doc",
      "estimate": "45 min read",
      "description": "Chapter 1 covers the producer/consumer model end-to-end."
    },
    {
      "title": "kafkajs source",
      "url": "https://github.com/tulios/kafkajs",
      "type": "repo",
      "description": "Read producer.send to see how batching & idempotence are wired."
    },
    {
      "title": "Designing Data-Intensive Applications (Ch. 11)",
      "url": "https://dataintensive.net",
      "type": "paper",
      "estimate": "90 min read"
    }
  ]
}'::jsonb
from public.episodes e where e.slug = 'further-reading';
```

### `exam` — final assessment (gates the certificate)

Multi-question scored test with a passing threshold. The episode marks
**complete only on pass** — a fail saves no progress, and the user can
retry. Because completion gates the certificate, an `exam` episode
effectively becomes the credit-worthy final.

Supports an optional `time_limit_min` countdown (auto-submits at zero).
Quiz questions accept either `correct: <number>` (single-correct) or
`correct: [<number>, ...]` (multi-select, strict scoring).

```sql
insert into public.episode_content (episode_id, data)
select e.id, '{
  "prompt_md": "30-minute timed exam. 70% to pass — you can retry.",
  "passing_score": 70,
  "time_limit_min": 30,
  "questions": [
    {
      "question": "Which of the following are true about Kafka? (select all)",
      "options": [
        "Topics are partitioned for parallelism",
        "A consumer group reads each partition exactly once",
        "Producers always wait for all replicas to acknowledge",
        "Log compaction deletes records older than the retention window"
      ],
      "correct": [0, 1],
      "explanation": "Partitioning + consumer-group ownership is the parallelism story. Acknowledgement and compaction are configurable, not absolute."
    },
    {
      "question": "What is the primary use case of log compaction?",
      "options": [
        "Reducing disk usage at all costs",
        "Keeping the latest value per key for state-restore",
        "Encrypting records at rest",
        "Cross-region replication"
      ],
      "correct": 1
    }
  ]
}'::jsonb
from public.episodes e where e.slug = 'final-exam';
```

> **Tip on exams + certificates.** The certificate auto-issues only when
> *every* published episode in the course has a progress row. Make the
> exam the last episode, set a sensible `passing_score`, and the cert
> becomes a real proof of competence rather than mere attendance.

### Existing kinds — quick recap

- **`lesson`** — `episode_content.body_md` (markdown). Mark-complete button.
- **`quiz`** — `episode_content.quiz` (jsonb array of QuizQuestion).
  `correct` may now be a number or an array of numbers (multi-select).
- **`lab`** — `episode_content.lab` (jsonb: instructions_md, hints,
  solution_md). Read + mark-done.
- **`visual`** — `episode_content.visual` (jsonb: kind, src, alt, caption).
  Mark-complete button.

---

## 6. Local verification

```sh
pnpm dev
```

Then:

1. **Anon visit `/courses`** → sample course card, no progress info,
   "sign in to start" CTA.
2. **Click an episode** → redirected to `/login?next=...`.
3. **Sign in with Google** (or GitHub) → bounce through Supabase, land
   back on the episode.
4. **Lesson** → "mark as complete" persists.
5. **Quiz** → answer all three, submit; score saves; explanations show.
6. **Lab** → reveal solution, click "mark as done".
7. After episode 3, the **completion card** appears and a row exists in
   `public.course_certificates`. Visit `/certificates/<cert_id>` —
   public, shareable.
8. `UserMenu` → "certificates" → the new certificate is listed.
9. **Sign out** → top-right chip flips to "sign in"; revisiting any
   episode URL bounces to `/login`.

---

## 7. What's NOT in v1 (planned for later)

- **Razorpay one-time payment** unlocking premium and gating
  `is_free=false` courses. Mechanics:
  1. Razorpay webhook hits `/api/payments/razorpay/webhook` with a
     `payment.captured` event.
  2. Handler verifies the signature, then calls
     `supabase.auth.admin.updateUserById(userId, { app_metadata: { plan: 'premium', premium_since: new Date().toISOString() } })`.
  3. Un-comment the premium branch of the `episode_content` RLS policy
     (the line is already in the file, commented). Done — no schema
     migration, no new tables.
- **Premium newsletter segment** — likely a `subscribers.plan` column +
  a separate Resend audience.
- **Downloadable resources** per-course (PDFs, templates) — Supabase
  Storage + a per-resource access check that reuses the same
  free-or-premium predicate.
- **Direct Q&A access** — design TBD; probably a per-user thread.
- **Admin UI** for course authoring. v1 authors directly via the
  Supabase SQL editor.
- **Certificate PDF download.** v1 renders an HTML cert card; a
  `react-pdf` or `puppeteer` route could ship later.

Each of these is additive — v1's tables already carry the columns they
need (`is_free`).
