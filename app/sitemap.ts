import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { getAllBlogSummaries } from "@/lib/blogs";
import {
  getAllCertificatesPublic,
  getAllCoursesPublic,
} from "@/lib/courses/queries";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const home = {
    url: `${SITE_URL}/`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 1.0,
  };

  const blogList = {
    url: `${SITE_URL}/blogs`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  };

  const coursesList = {
    url: `${SITE_URL}/courses`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  };

  const resumeEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/resume`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/resume/docx`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/resume/json`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  const blogs = await getAllBlogSummaries();
  const blogEntries = blogs.map((b) => ({
    url: `${SITE_URL}/blogs/${b.slug}`,
    lastModified: new Date(b.frontmatter.date),
    changeFrequency: "yearly" as const,
    priority: 0.7,
  }));

  // Courses — fetched at build/render time. Failures degrade gracefully
  // (sitemap still emits, just without the course entries).
  //
  // Episodes are intentionally NOT listed: they're auth-gated
  // (`robots: noindex` + `Disallow: /courses/*/*` in robots.txt).
  // Sitemap + noindex is contradictory — Google's docs explicitly say
  // not to include noindex pages. Crawlers still discover episodes via
  // the course detail page's lesson list, so we don't lose discovery.
  let courseEntries: MetadataRoute.Sitemap = [];
  try {
    const courses = await getAllCoursesPublic();
    courseEntries = courses.map((c) => ({
      url: `${SITE_URL}/courses/${c.slug}`,
      lastModified: new Date(c.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch (err) {
    console.error("[sitemap] courses fetch failed", err);
  }

  // Public certificates — issued credentials live at unguessable URLs
  // (`/certificates/cert_<id>`), but they're meant to be shared on
  // LinkedIn / résumés. Listing them in the sitemap so search engines
  // discover them too. Low priority because each cert is leaf-level
  // content with no outbound links.
  let certEntries: MetadataRoute.Sitemap = [];
  try {
    const certs = await getAllCertificatesPublic();
    certEntries = certs.map((c) => ({
      url: `${SITE_URL}/certificates/${c.id}`,
      lastModified: new Date(c.issuedAt),
      changeFrequency: "yearly" as const,
      priority: 0.5,
    }));
  } catch (err) {
    console.error("[sitemap] certificates fetch failed", err);
  }

  return [
    home,
    blogList,
    coursesList,
    ...resumeEntries,
    ...blogEntries,
    ...courseEntries,
    ...certEntries,
  ];
}
