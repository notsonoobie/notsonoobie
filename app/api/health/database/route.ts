import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

// Health probe for the "Database Service" Statuspage component.
// Runs the cheapest meaningful query (select 1 id from blogs limit 1)
// against Supabase via the service-role client, which exercises:
//   • Postgres reachability
//   • Connection pool health
//   • Service-role auth
//
// Cheap, but real — pings the actual data path the rest of the app
// uses. Better Stack treats any non-2xx as "down" and triggers an
// incident in the linked Statuspage component.
export const dynamic = "force-dynamic";

export async function GET() {
  const checkedAt = new Date().toISOString();
  try {
    const client = getSupabaseServer();
    const { error } = await client.from("blogs").select("id").limit(1);
    if (error) {
      return NextResponse.json(
        { ok: false, service: "database", checkedAt, error: error.message },
        {
          status: 503,
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        },
      );
    }
    return NextResponse.json(
      { ok: true, service: "database", checkedAt },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json(
      { ok: false, service: "database", checkedAt, error: msg },
      {
        status: 503,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      },
    );
  }
}
