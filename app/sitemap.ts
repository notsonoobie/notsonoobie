import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { getAllBlogSummaries } from "@/lib/blogs";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const homeSections = ["", "#about", "#expertise", "#products", "#skills", "#experience", "#contact"];
  const homeEntries = homeSections.map((hash) => ({
    url: `${SITE_URL}/${hash}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: hash === "" ? 1.0 : 0.7,
  }));

  const blogListEntry = {
    url: `${SITE_URL}/blogs`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  };

  const blogs = await getAllBlogSummaries();
  const blogEntries = blogs.map((b) => ({
    url: `${SITE_URL}/blogs/${b.slug}`,
    lastModified: new Date(b.frontmatter.date),
    changeFrequency: "yearly" as const,
    priority: 0.6,
  }));

  return [...homeEntries, blogListEntry, ...blogEntries];
}
