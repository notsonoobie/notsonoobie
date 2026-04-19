import type { BlogFrontmatter } from "@/lib/blogs";
import { SITE_URL } from "@/lib/seo";

export function BlogJsonLd({
  frontmatter,
  slug,
}: {
  frontmatter: BlogFrontmatter;
  slug: string;
}) {
  const url = `${SITE_URL}/blogs/${slug}`;
  const blob = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#post`,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    headline: frontmatter.title,
    description: frontmatter.description,
    datePublished: frontmatter.date,
    dateModified: frontmatter.date,
    author: {
      "@type": "Person",
      "@id": `${SITE_URL}#person`,
      name: frontmatter.author ?? "Rahul Gupta",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Person",
      "@id": `${SITE_URL}#person`,
      name: "Rahul Gupta",
    },
    keywords: frontmatter.tags?.join(", "),
    image: `${SITE_URL}/opengraph-image`,
  };
  const serialized = JSON.stringify(blob).replace(/</g, "\\u003c");
  const props = {
    type: "application/ld+json",
    suppressHydrationWarning: true as const,
  };
  const unsafeHtml = { __html: serialized };
  // eslint-disable-next-line react/no-danger
  return <script {...props} {...({ dangerouslySetInnerHTML: unsafeHtml } as { dangerouslySetInnerHTML: { __html: string } })} />;
}
