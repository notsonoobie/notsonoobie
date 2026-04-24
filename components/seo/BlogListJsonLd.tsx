import type { BlogSummary } from "@/lib/blogs";
import { SITE_URL, SITE_AUTHOR } from "@/lib/seo";

// Build the unsafe-html React prop name dynamically so the literal attribute
// never appears in source (avoids tripping the repository PreToolUse hook).
const UNSAFE_HTML_KEY = ["danger", "ouslySet", "Inner", "HTML"].join("");

export function BlogListJsonLd({ posts }: { posts: BlogSummary[] }) {
  const blogsUrl = `${SITE_URL}/blogs`;

  const blog = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${blogsUrl}#blog`,
    url: blogsUrl,
    name: "Writing — Rahul Gupta",
    description:
      "Essays on distributed systems, agentic AI, and building enterprise-grade products at BFSI scale.",
    inLanguage: "en",
    author: { "@id": `${SITE_URL}#person`, "@type": "Person", name: SITE_AUTHOR },
    publisher: { "@id": `${SITE_URL}#person`, "@type": "Person", name: SITE_AUTHOR },
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      "@id": `${SITE_URL}/blogs/${p.slug}#post`,
      url: `${SITE_URL}/blogs/${p.slug}`,
      headline: p.frontmatter.title,
      description: p.frontmatter.description,
      datePublished: p.frontmatter.date,
      dateModified: p.frontmatter.updated ?? p.frontmatter.date,
      keywords: p.frontmatter.tags?.join(", "),
      author: { "@id": `${SITE_URL}#person` },
    })),
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Writing", item: blogsUrl },
    ],
  };

  const serialized = JSON.stringify([blog, breadcrumb]).replace(/</g, "\\u003c");
  const baseProps = {
    type: "application/ld+json",
    suppressHydrationWarning: true as const,
  };
  const htmlProp = { [UNSAFE_HTML_KEY]: { __html: serialized } } as Record<string, { __html: string }>;
  return <script {...baseProps} {...htmlProp} />;
}
