import "server-only";

import { Fragment, type ReactNode } from "react";
import * as runtime from "react/jsx-runtime";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeShiki from "@shikijs/rehype";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { Options as Schema } from "rehype-sanitize";
import rehypeReact from "rehype-react";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { visit } from "unist-util-visit";
import type { Element, Root, Text } from "hast";

import { CodeBlock } from "@/components/blogs/CodeBlock";
import { LightboxImage } from "@/components/blogs/LightboxImage";
import type { TocHeading } from "@/lib/blogs";

// rehype-shiki emits `<pre tabindex="0" data-language="ts">` and per-token
// `<span style="--shiki-dark:...">`. We extend the default sanitiser schema
// to keep those structural bits intact AND to allow the heading anchors
// rehype-autolink-headings injects — without that the `<a>` wrapper
// would be stripped along with the `aria-hidden` it sets.
const schema: Schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    // hast property names: rehype-shiki emits `class` (not the React
    // `className` form) for raw HTML attributes. List both so we cover
    // any plugin that uses the camelCase variant downstream.
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      "class",
      "className",
      "style",
    ],
    pre: [
      ...(defaultSchema.attributes?.pre ?? []),
      "class",
      "className",
      "style",
      "tabindex",
      "tabIndex",
    ],
    span: [
      ...(defaultSchema.attributes?.span ?? []),
      "class",
      "className",
      "style",
    ],
    // Heading anchor links + their wrapper attributes.
    a: [
      ...(defaultSchema.attributes?.a ?? []),
      "class",
      "className",
      "ariaHidden",
      "tabIndex",
      "tabindex",
    ],
    // `id` on every heading + permissive class everywhere — Shiki,
    // autolink-headings, and the heading-text spans all rely on it.
    "*": [
      ...(defaultSchema.attributes?.["*"] ?? []),
      "id",
      "class",
      "className",
    ],
  },
};

const SHIKI_OPTIONS = {
  themes: { dark: "github-dark", light: "github-light" },
  // Emit per-token CSS variables (`--shiki-dark`, `--shiki-light`)
  // instead of a single `color`. `app/blogs/blogs.css` keys on these
  // variables so courses + blogs share one Shiki palette.
  defaultColor: false as const,
  // Stamps `class="language-<lang>"` on the inner <code>. `CodeBlock`'s
  // `extractLanguage` reads this to render the chrome's language label
  // (rehype-shiki doesn't add `data-language` to the <pre> in v4, so
  // this is the cleaner of the two signal paths).
  addLanguageClass: true,
};

/**
 * Custom remark-rehype plugin: walks the HAST tree after rehype-slug
 * has stamped `id`s onto headings, and pushes `{ value, id, depth }`
 * into the array passed in via plugin options. We do this in a single
 * pipeline pass instead of a separate parse-and-walk so the same
 * markdown isn't parsed twice.
 */
function rehypeCollectToc(opts: { toc: TocHeading[] }) {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      const m = /^h([1-6])$/.exec(node.tagName);
      if (!m) return;
      const depth = Number(m[1]);
      // Skip h1 — the page title is rendered separately above the
      // article body, and posts virtually never use h1 inside the
      // body. h2/h3/h4 carry the TOC; deeper levels would clutter it.
      if (depth < 2 || depth > 4) return;
      const id = (node.properties?.id as string | undefined) ?? "";
      if (!id) return;
      // Concatenate text-node content; ignore nested `<a>` (autolink)
      // children so we don't pick up the anchor's `#` glyph.
      let value = "";
      visit(node, "text", (t: Text) => {
        value += t.value;
      });
      value = value.trim();
      if (!value) return;
      opts.toc.push({ value, id, depth });
    });
  };
}

// Build the processor inside the render call so each request gets its
// own TOC array. The plugin chain is constant — the only per-call
// state is the `toc` reference handed to `rehypeCollectToc`.
function buildProcessor(toc: TocHeading[]) {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      // Wrap the heading text in an anchor — the `.blog-prose h2 > a`
      // styles in `app/blogs/blogs.css` already target this exact
      // shape (color: inherit; text-decoration: none).
      behavior: "wrap",
      properties: { className: ["heading-anchor"] },
    })
    .use(rehypeShiki, SHIKI_OPTIONS)
    // `clobberPrefix: ""` strips the default `user-content-` prefix on
    // sanitized ids. Trusted authoring (Supabase Studio + the import
    // CLI) plus an `is_published` filter means we never have to worry
    // about a malicious post hijacking our app-level ids; preserving
    // bare ids matches the slugs Nextra produced before the migration
    // so any in-the-wild bookmarks keep resolving.
    .use(rehypeSanitize, { ...schema, clobberPrefix: "" })
    .use(rehypeCollectToc, { toc })
    .use(rehypeReact, {
      Fragment,
      jsx: (runtime as { jsx: typeof import("react/jsx-runtime").jsx }).jsx,
      jsxs: (runtime as { jsxs: typeof import("react/jsx-runtime").jsxs })
        .jsxs,
      components: {
        pre: CodeBlock,
        img: LightboxImage,
        // Wrap wide tables in a horizontal-scroll container so the
        // article column can stay narrow without breaking on wide
        // tables. Mirrors the `mdx-components.tsx` table override.
        table: (props: React.TableHTMLAttributes<HTMLTableElement>) => (
          <div className="blog-prose-table-wrap">
            <table {...props} />
          </div>
        ),
      },
    });
}

/**
 * Compiles a blog body's raw markdown to a React tree AND a TOC
 * heading list in a single pipeline pass. The detail page calls this
 * once and feeds both halves into the layout.
 */
export async function renderBlogMarkdown(source: string): Promise<{
  body: ReactNode;
  toc: TocHeading[];
}> {
  const toc: TocHeading[] = [];
  const file = await buildProcessor(toc).process(source);
  return { body: file.result as ReactNode, toc };
}
