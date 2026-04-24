import { buildWelcomeEmail } from "@/lib/emails/welcome";
import { getResend } from "@/lib/resend";
import { getSupabaseServer } from "@/lib/supabase/server";
import { NextResponse, after } from "next/server";
import { createHash } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;
const MAX_EMAIL = 254;

function hashIp(ip: string | null) {
  if (!ip) return null;
  const salt = process.env.APP_SECRET ?? "";
  return createHash("sha256").update(`${ip}|${salt}`).digest("hex");
}

function ok() {
  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}

function fail(error: string, status = 400) {
  return NextResponse.json(
    { ok: false, error },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

async function sendWelcome(email: string) {
  const resend = getResend();
  if (!resend) {
    console.info(
      "[newsletter] RESEND_API_KEY unset; skipping welcome send for",
      email,
    );
    return;
  }
  const message = await buildWelcomeEmail(email);
  const { error } = await resend.emails.send({
    to: message.to,
    from: message.from,
    replyTo: message.replyTo,
    subject: message.subject,
    html: message.html,
    text: message.text,
    headers: message.headers,
  });
  if (error) {
    console.error("[newsletter] resend send failed", error);
  }
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return fail("invalid_payload");
  }

  if (!payload || typeof payload !== "object") {
    return fail("invalid_payload");
  }

  const { email } = payload as { email?: unknown };

  if (typeof email !== "string") return fail("invalid_email");
  const normalized = email.trim().toLowerCase();
  if (normalized.length === 0 || normalized.length > MAX_EMAIL) {
    return fail("invalid_email");
  }
  if (!EMAIL_RE.test(normalized)) return fail("invalid_email");

  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() ?? null;
  const ipHash = hashIp(ip);
  const userAgent = request.headers.get("user-agent")?.slice(0, 512) ?? null;

  const supabase = getSupabaseServer();

  // Three cases:
  //   1. Row doesn't exist       → INSERT, send welcome.
  //   2. Row exists, unsubscribed → UPDATE to clear unsubscribed_at
  //                                  (re-activate) and refresh metadata,
  //                                  send welcome.
  //   3. Row exists, still active → no-op, no welcome, silent 200.
  // We do a SELECT first so we can distinguish (2) from (3) — upsert alone
  // collapses them, which silently traps ex-subscribers who try to return.
  const { data: existing, error: selectError } = await supabase
    .from("subscribers")
    .select("id, unsubscribed_at")
    .eq("email", normalized)
    .maybeSingle();

  if (selectError) {
    console.error("[newsletter] supabase select failed", selectError);
    return fail("server_error", 500);
  }

  let shouldSendWelcome = false;

  if (!existing) {
    const { error: insertError } = await supabase
      .from("subscribers")
      .insert({
        email: normalized,
        user_agent: userAgent,
        ip_hash: ipHash,
      });
    if (insertError) {
      // 23505 = Postgres unique_violation. A concurrent request beat us to
      // it — the email is now registered, so we report success but skip
      // the welcome (the winning request is responsible for that).
      if (insertError.code !== "23505") {
        console.error("[newsletter] supabase insert failed", insertError);
        return fail("server_error", 500);
      }
    } else {
      shouldSendWelcome = true;
    }
  } else if (existing.unsubscribed_at) {
    const { error: updateError } = await supabase
      .from("subscribers")
      .update({
        unsubscribed_at: null,
        user_agent: userAgent,
        ip_hash: ipHash,
      })
      .eq("id", existing.id);
    if (updateError) {
      console.error(
        "[newsletter] supabase resubscribe update failed",
        updateError,
      );
      return fail("server_error", 500);
    }
    shouldSendWelcome = true;
  }
  // else: existing row is already active → silent no-op.

  if (shouldSendWelcome) {
    after(async () => {
      try {
        await sendWelcome(normalized);
      } catch (err) {
        console.error("[newsletter] welcome email failed", err);
      }
    });
  }

  return ok();
}
