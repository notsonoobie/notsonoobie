import type { Metadata } from "next";
import { MeshNotFound } from "@/components/not-found/MeshNotFound";
import { getAllBlogSummaries } from "@/lib/blogs";

export const metadata: Metadata = {
  title: "404 — Route not found",
  description: "The path you requested isn't registered on this host.",
  robots: { index: false, follow: false },
};

export default async function NotFound() {
  const summaries = await getAllBlogSummaries();
  const latest = summaries.slice(0, 3).map((s) => ({
    slug: s.slug,
    title: s.frontmatter.title,
  }));
  return <MeshNotFound posts={latest} />;
}
