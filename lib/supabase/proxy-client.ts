import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;

/**
 * Refreshes the Supabase auth cookie on every request. Called from `proxy.ts`
 * (the Next.js 16 rename of middleware). Must call `supabase.auth.getUser()`
 * so any refresh is committed back to the response cookies before the body
 * is generated.
 *
 * Returns both the NextResponse (with possibly updated cookies) and the
 * verified user object so the proxy can make redirect decisions without a
 * second round-trip.
 */
export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse;
  userId: string | null;
}> {
  let response = NextResponse.next({ request });

  if (!url || !publishableKey) {
    // Auth env not configured — pass through without touching cookies. Keeps
    // local dev without Supabase auth wiring functional.
    return { response, userId: null };
  }

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  return { response, userId: data.user?.id ?? null };
}
