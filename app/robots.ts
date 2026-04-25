import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Block crawl of API routes + auth-gated surfaces. Page-level
        // `robots: noindex` already keeps these out of the index;
        // disallowing them here saves the per-bot crawl budget so it
        // gets spent on the public catalogue / blog / certificates.
        disallow: [
          "/api/",
          "/auth/",
          "/login",
          "/me/",
          // Episode pages live at /courses/{slug}/{episode} and redirect
          // unauthenticated visitors to /login. The pattern matches a
          // /courses URL with at least three path segments (slug + ep)
          // so the public catalogue (/courses, /courses/{slug}) stays
          // crawlable.
          "/courses/*/*",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
