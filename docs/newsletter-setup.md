# Newsletter — Supabase + Resend setup

This is a single-opt-in newsletter signup, wired to a `subscribers` table in
Supabase with a welcome email dispatched via Resend. The form lives in the
site footer (on every page).

The only moving parts outside the repo are:

1. A table + index in your Supabase project.
2. A verified sending domain on Resend.
3. Six env vars — all on Vercel, all in `.env.local` for local dev.

The payload captured from the client is intentionally minimal: **email
only**, plus a hashed IP and user-agent added server-side for abuse triage.
No `source` tag, no CMS. On the first time a given email is stored, the
API route fires a welcome email via Resend (after the response is flushed,
using `next/server`'s `after()` so the user never waits on it). Repeat
submits with the same email return 200 silently and skip the email.

Every welcome email carries a signed, encrypted unsubscribe link
(`/unsubscribe?t=<token>`). Clicking it flips `unsubscribed_at` on the
row — no backend key-check required, the token itself is the credential.
The same URL is also advertised in the `List-Unsubscribe` header so
Gmail / Apple Mail can surface their native unsubscribe button.

---

## 1. Create the table

Open your Supabase project → **SQL editor** → **New query**, paste this in,
and run it once:

```sql
create table if not exists public.subscribers (
  id              bigint generated always as identity primary key,
  email           text not null,
  created_at      timestamptz not null default now(),
  unsubscribed_at timestamptz,
  user_agent      text,
  ip_hash         text
);

-- Emails are normalized to lowercase in the server route, so a regular
-- unique index is enough for v1. `unsubscribed_at` is room to grow — a
-- future unsubscribe flow sets it and a re-subscribe UPDATEs the same row.
create unique index if not exists subscribers_email_unique
  on public.subscribers (email);

-- Lock down all anon / authenticated access. Our server route uses the
-- service-role key, which bypasses RLS entirely.
alter table public.subscribers enable row level security;
```

If you previously ran an earlier version of this schema that included a
`source text not null` column, drop it:

```sql
alter table public.subscribers drop column if exists source;
```

Confirm in **Database → Tables → subscribers** that the row-level-security
indicator is on, and in the **Indexes** tab that `subscribers_email_unique`
exists.

If you ever want to inspect signups, do it in the Supabase SQL editor —
the service role key never leaves the server.

---

## 2. Verify the sending domain on Resend

Before a real welcome email can leave, Resend needs to know the domain it's
sending from.

1. Sign in to [resend.com](https://resend.com).
2. **Domains → Add Domain** → enter `agenticwithrahul.in`.
3. Resend lists three DNS records you need to add at the registrar:
   - `SPF` (`TXT`) — typically `v=spf1 include:amazonses.com ~all`
   - `DKIM` (`TXT` — often three rows)
   - `DMARC` (`TXT`) — recommended for deliverability
4. In GoDaddy (or whoever manages DNS for `agenticwithrahul.in`), create
   each record with the name/value Resend shows. TTL 3600 is fine.
5. Back in Resend, click **Verify**. Propagation is usually a few minutes
   but can take up to 48 h.
6. Once verified, the `From` address in this app
   (`newsletter@agenticwithrahul.in` by default) is cleared to send.

Until the domain is verified Resend will reject sends with a
`domain_not_verified` error (logged server-side — subscription still
persists to Supabase).

---

## 3. Env vars

Copy `.env.example` → `.env.local` at the repo root, then fill in:

| Variable | Where it comes from | Exposure |
| --- | --- | --- |
| `SITE_URL` | Canonical site origin — e.g. `https://agenticwithrahul.in`, no trailing slash | server-only |
| `SUPABASE_URL` | Supabase → Settings → API → Project URL | **server-only** |
| `SUPABASE_SECRET_KEY` | Supabase → Settings → **API Keys** → **Create new secret key** (starts with `sb_secret_…`) | **server-only** |
| `APP_SECRET` | `openssl rand -hex 32` — **must be stable across deploys** (used to salt IP hashes and derive the unsubscribe-token AES key) | server-only |
| `RESEND_API_KEY` | Resend → API Keys | **server-only** |
| `NEWSLETTER_FROM_EMAIL` | You pick — default `"Rahul Gupta <newsletter@agenticwithrahul.in>"` | server-only |
| `NEWSLETTER_REPLY_TO` | Your real inbox — default `notsonoobie@gmail.com` | server-only |

> **Nothing is `NEXT_PUBLIC_`.** The Supabase client lives in
> `lib/supabase/server.ts` behind a `server-only` import, so the URL
> doesn't need to ship to the browser. If you still have
> `NEXT_PUBLIC_SUPABASE_URL` set in an older deployment,
> `lib/supabase/server.ts` reads it as a fallback — swap it to
> `SUPABASE_URL` on your next deploy and delete the `NEXT_PUBLIC_` var.
>
> **Use the new secret-key system.** Supabase has deprecated the legacy
> `service_role` JWT in favour of rotatable secret keys. If you're still
> on the old JWT, `lib/supabase/server.ts` also reads
> `SUPABASE_SERVICE_ROLE_KEY` as a fallback so nothing breaks
> mid-rotation — migrate at your leisure, then remove the old var.

The secret key and the Resend API key both bypass trust boundaries —
never prefix them with `NEXT_PUBLIC_`, never import them from a client
component, never commit them. `lib/supabase/server.ts` and `lib/resend.ts`
both have a `server-only` import so the bundler will refuse a client-side
import.

On Vercel, add all six vars under **Project settings → Environment
Variables** for both **Production** and **Preview**. Redeploy after adding
them.

If `RESEND_API_KEY` is missing at runtime the subscribe route still writes
to Supabase and returns 200; it just logs `RESEND_API_KEY unset; skipping
welcome send for <email>` and moves on. That keeps local dev without
Resend wiring functional.

---

## 4. Local verification

```sh
pnpm dev
```

- Visit `http://localhost:3000` and submit the form from the footer.

In Supabase → **Table editor → subscribers**, you should see a row with
the email you submitted, plus `created_at`, `user_agent`, and `ip_hash`
populated by the server.

Check that email's inbox — a welcome email from
`NEWSLETTER_FROM_EMAIL` should arrive within a few seconds with the
subject _"You're in — next dispatch incoming."_, the three latest posts
linked, a reply-to pointing at `NEWSLETTER_REPLY_TO`, and an
**"Unsubscribe"** link at the bottom.

Submitting the same email again is a no-op — the response stays
`{ ok: true }`, no new row is inserted, and no second welcome email fires
(idempotent by unique index, duplicate-detection gates the send).

### Unsubscribe

1. Click the "Unsubscribe" link in any welcome email.
2. You land at `/unsubscribe?t=<token>`. The page decrypts the token,
   flips `unsubscribed_at` on the matching row, and shows a terminal-style
   success card ("You're out.").
3. In Supabase, the row's `unsubscribed_at` is now a timestamp; the row
   itself is kept so a future re-subscribe can UPDATE the same record.
4. Broken or tampered links render a clear error page with a mailto
   fallback — never leaks whether a given email was actually a subscriber.

The `/unsubscribe` route is `robots: noindex, nofollow` and is omitted
from the sitemap.

### Curl smoke tests

```sh
# Valid
curl -s http://localhost:3000/api/newsletter/subscribe \
  -X POST -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
# => {"ok":true}

# Invalid email
curl -s http://localhost:3000/api/newsletter/subscribe \
  -X POST -H "Content-Type: application/json" \
  -d '{"email":"nope"}'
# => {"ok":false,"error":"invalid_email"}

# Empty payload
curl -s http://localhost:3000/api/newsletter/subscribe \
  -X POST -H "Content-Type: application/json" \
  -d '{}'
# => {"ok":false,"error":"invalid_email"}
```

---

## 5. What's NOT in v1 (planned for later)

- **Double opt-in / confirm flow** — the current welcome email is pure
  acknowledgement, not a confirmation gate. Upgrading adds a
  `confirmation_token` column and a second route that flips a `confirmed`
  flag before the subscriber counts as "active".
- **RFC 8058 one-click POST** — Gmail's native "Unsubscribe" already
  works via the `List-Unsubscribe: <https>` URL + GET flow we emit; a
  future pass can add `List-Unsubscribe-Post: List-Unsubscribe=One-Click`
  so Gmail performs a silent POST instead of opening the page. The
  `/unsubscribe` page already handles the side effect atomically, so the
  POST handler would be a ~10-line addition.
- **Broadcast / dispatch flow** — the newsletter captures subscribers but
  doesn't yet send on new-post publish. Natural next step: a GitHub
  Action or Vercel cron that reads the newest post, renders a dispatch
  email, and calls `resend.batch.send` over the subscribers list.
- **Rate limiting** — v1 relies on unique-on-email + a short email regex.
  If abuse shows up in logs, add Upstash Redis with an IP-window limiter
  (the `ip_hash` column is already populated for exactly this).

Each of these is a separate, additive change — the v1 schema already
carries the columns they need.
