import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseRSC } from "@/lib/supabase/server";

function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/courses";
  return raw;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const errorDescription = request.nextUrl.searchParams.get(
    "error_description"
  );

  if (errorDescription) {
    console.error("[auth.callback] provider error:", errorDescription);
    return NextResponse.redirect(
      new URL("/login?error=oauth_failed", request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=missing_code", request.url)
    );
  }

  const supabase = getSupabaseRSC();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth.callback] exchange failed:", error);
    return NextResponse.redirect(
      new URL("/login?error=exchange_failed", request.url)
    );
  }

  return NextResponse.redirect(new URL(next, request.url));
}
