import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy-client";

// Routes that require a signed-in user. Anything else is public (course
// list + detail pages show a "sign in to start" CTA; anon visitors just
// don't see their progress). Keep this list tight — the bulk of auth
// enforcement lives in the route handlers and RLS, not here.
const PROTECTED_PREFIXES = [
  "/api/courses/progress",
  "/api/courses/certificate",
];

// Per-course Next.js metadata routes that share the /courses/<slug>/<x>
// shape but are NOT episodes — must stay publicly reachable so social
// crawlers can fetch them and our SEO machinery shows real previews.
// Add new metadata segments here when introduced.
const COURSE_METADATA_SEGMENTS = new Set(["opengraph-image", "twitter-image"]);

function isProtectedEpisode(pathname: string) {
  // /courses/<course>/<episode>  (3 path segments after the leading "/")
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "courses" || parts.length !== 3) return false;
  if (COURSE_METADATA_SEGMENTS.has(parts[2]!)) return false;
  return true;
}

export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  const needsAuth =
    PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) ||
    isProtectedEpisode(pathname);

  if (needsAuth && !userId) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname + (search ?? ""));
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    // Run on everything except static assets and Next internals.
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|opengraph-image|apple-icon|manifest.webmanifest|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|pdf|docx)$).*)",
  ],
};
