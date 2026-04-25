import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseRSC } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/seo";

const PROVIDERS = ["google", "github"] as const;
type Provider = (typeof PROVIDERS)[number];

function isProvider(p: string): p is Provider {
  return (PROVIDERS as readonly string[]).includes(p);
}

function safeNext(raw: string | null): string {
  // Only allow same-origin absolute paths. Anything starting with // or
  // containing a scheme is rejected — prevents open-redirect abuse via the
  // `next` param.
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/courses";
  return raw;
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ provider: string }> }
) {
  const { provider } = await ctx.params;
  if (!isProvider(provider)) {
    return NextResponse.redirect(
      new URL("/login?error=invalid_provider", request.url)
    );
  }

  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const supabase = getSupabaseRSC();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    console.error("[auth.signin]", provider, error);
    return NextResponse.redirect(
      new URL("/login?error=oauth_failed", request.url)
    );
  }
  return NextResponse.redirect(data.url);
}
