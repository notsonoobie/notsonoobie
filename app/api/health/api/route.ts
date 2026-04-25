import { NextResponse } from "next/server";

// Liveness probe for Better Stack ↔ Atlassian Statuspage's "API
// Service" component. Just verifies the Node runtime + routing
// layer; no upstream calls so this never reports false positives
// when an unrelated service (Supabase / Resend / S3) is down.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "api",
      checkedAt: new Date().toISOString(),
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    },
  );
}
