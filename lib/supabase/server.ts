import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

// Server-only — we intentionally don't use the NEXT_PUBLIC_ prefix. Every
// Supabase call happens in a server component, route handler, or the proxy,
// so there is no reason to ship the project URL into the browser bundle.
// Falls back to the old NEXT_PUBLIC_SUPABASE_URL name while any existing
// environments rotate.
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
// New-style Supabase secret key (sb_secret_…) from Settings → API Keys.
// The legacy `service_role` JWT is still read as a fallback so existing
// deployments don't break while rotating to the new system.
const secretKey =
  process.env.SUPABASE_SECRET_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY;
// Publishable key (sb_publishable_…) — replaces the legacy anon JWT.
// RLS-respecting; used for user-scoped reads from server components and the
// proxy. Also accepts the old SUPABASE_ANON_KEY name for compatibility.
const publishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;

let cachedService: SupabaseClient | null = null;

/**
 * Service-role client. Bypasses RLS. Use for privileged server-only ops —
 * newsletter inserts, certificate issuance, webhook handlers.
 */
export function getSupabaseServer(): SupabaseClient {
  if (!url || !secretKey) {
    throw new Error(
      "Supabase env missing: set SUPABASE_URL and SUPABASE_SECRET_KEY."
    );
  }
  if (!cachedService) {
    cachedService = createClient(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cachedService;
}

/**
 * Cookie-aware Supabase client, RLS-respecting. Use in server components,
 * server actions, and route handlers where you want queries to run as the
 * signed-in user. Session refresh is handled by the proxy; `setAll` here
 * silently no-ops when called from a pure server component (where
 * `cookies().set()` is not allowed).
 */
export function getSupabaseRSC(): SupabaseClient {
  if (!url || !publishableKey) {
    throw new Error(
      "Supabase auth env missing: set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY."
    );
  }
  return createServerClient(url, publishableKey, {
    cookies: {
      async getAll() {
        const store = await cookies();
        return store.getAll();
      },
      async setAll(cookiesToSet) {
        try {
          const store = await cookies();
          cookiesToSet.forEach(({ name, value, options }) =>
            store.set(name, value, options)
          );
        } catch {
          // Called from a Server Component. Safe to ignore — the proxy
          // refreshes the session on every request.
        }
      },
    },
  });
}

export type AuthedUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  plan: "free" | "premium";
};

/**
 * Returns the current user, or null if signed out. Wrapped in React cache
 * so repeated calls within one render share the single auth round-trip.
 *
 * Display name and avatar come from the OAuth provider's metadata on
 * `auth.users.user_metadata`. Plan comes from `app_metadata` (admin-only
 * writes, tamper-proof) — empty until the v2 Razorpay flow stamps it.
 */
export const getUser = cache(async (): Promise<AuthedUser | null> => {
  const supabase = getSupabaseRSC();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const userMeta = (data.user.user_metadata ?? {}) as {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    picture?: string;
  };
  const appMeta = (data.user.app_metadata ?? {}) as {
    plan?: "free" | "premium";
  };

  return {
    id: data.user.id,
    email: data.user.email ?? null,
    displayName: userMeta.full_name ?? userMeta.name ?? null,
    avatarUrl: userMeta.avatar_url ?? userMeta.picture ?? null,
    plan: appMeta.plan ?? "free",
  };
});
