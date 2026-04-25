import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";

// Tiny endpoint the client UserMenu hits on mount to discover whether a
// session is active. Keeps app/layout.tsx free of cookies() so static pages
// (blogs, home, etc.) stay statically rendered.
export async function GET() {
  const user = await getUser();
  return NextResponse.json(
    { user },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
