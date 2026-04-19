import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const sections = ["", "#about", "#expertise", "#products", "#skills", "#experience", "#contact"];
  return sections.map((hash) => ({
    url: `${SITE_URL}/${hash}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: hash === "" ? 1.0 : 0.7,
  }));
}
