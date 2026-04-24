import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only — we intentionally don't use the NEXT_PUBLIC_ prefix. The
// Supabase client only runs from API routes, so there is no reason to
// ship the project URL into the browser bundle. Falls back to the old
// NEXT_PUBLIC_SUPABASE_URL name while any existing environments rotate.
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
// New-style Supabase secret key (sb_secret_…) from Settings → API Keys.
// The legacy `service_role` JWT is still read as a fallback so existing
// deployments don't break while rotating to the new system.
const secretKey =
  process.env.SUPABASE_SECRET_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY;

let cached: SupabaseClient | null = null;

export function getSupabaseServer(): SupabaseClient {
  if (!url || !secretKey) {
    throw new Error(
      "Supabase env missing: set SUPABASE_URL and SUPABASE_SECRET_KEY."
    );
  }
  if (!cached) {
    cached = createClient(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
