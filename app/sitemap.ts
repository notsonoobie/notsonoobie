import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { getAllBlogSummaries } from "@/lib/blogs";

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

  return [home, blogList, ...resumeEntries, ...blogEntries];
}
