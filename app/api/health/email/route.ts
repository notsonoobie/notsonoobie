import { NextResponse } from "next/server";

// Health probe for the "Email Service" Statuspage component. Hits
// Resend's API directly with the configured key and grades the HTTP
// response:
//
//   • 2xx → healthy. Key has full access; service is up.
//   • 401 / 403 with a "restricted" error → healthy. The send-only
//     scoped key we use for production is *expected* to be denied
//     access to /domains; getting that response proves Resend's
//     platform validated our key, which means the API is up and our
//     credentials still work.
//   • 401 with "invalid_api_key" → UNHEALTHY. Key was revoked /
//     regenerated; sends will fail.
//   • 5xx → UNHEALTHY. Resend is having an outage.
//   • Network error / timeout → UNHEALTHY. Can't reach Resend.
//
// We do NOT send a test email — that would burn quota on every
// monitor tick. The auth-validation path is enough to prove the
// upstream is healthy.
export const dynamic = "force-dynamic";

const HEALTH_TIMEOUT_MS = 5_000;

export async function GET() {
  const checkedAt = new Date().toISOString();
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, service: "email", checkedAt, error: "RESEND_API_KEY unset" },
      {
        status: 503,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      },
    );
  }
  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });

    // 2xx — full access, all good.
    if (res.ok) {
      return NextResponse.json(
        { ok: true, service: "email", checkedAt },
        {
          status: 200,
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        },
      );
    }

    // 401/403 with "restricted_api_key" → expected for a send-only
    // key. Resend validated the key + responded → service is up.
    if (res.status === 401 || res.status === 403) {
      const body = (await res.json().catch(() => null)) as
        | { name?: string; message?: string }
        | null;
      const name = body?.name ?? "";
      if (
        name === "restricted_api_key" ||
        body?.message?.toLowerCase().includes("restricted")
      ) {
        return NextResponse.json(
          { ok: true, service: "email", checkedAt, scope: "restricted" },
          {
            status: 200,
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
          },
        );
      }
      return NextResponse.json(
        {
          ok: false,
          service: "email",
          checkedAt,
          error: body?.message ?? `auth failure (${res.status})`,
        },
        {
          status: 503,
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        },
      );
    }

    // 5xx — Resend is the broken thing.
    return NextResponse.json(
      { ok: false, service: "email", checkedAt, error: `resend ${res.status}` },
      {
        status: 503,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json(
      { ok: false, service: "email", checkedAt, error: msg },
      {
        status: 503,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      },
    );
  }
}
