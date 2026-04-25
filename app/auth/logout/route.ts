import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseRSC } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = getSupabaseRSC();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}

// Fallback GET so that a naive link still works — e.g. if a user opens the
// URL directly. Most exits go through a POST <form> from the UserMenu.
export async function GET(request: NextRequest) {
  return POST(request);
}
