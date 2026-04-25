import "server-only";

import { Fragment } from "react";
import * as runtime from "react/jsx-runtime";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeShiki from "@shikijs/rehype";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { Options as Schema } from "rehype-sanitize";
import rehypeReact from "rehype-react";

import { CodeBlock } from "@/components/blogs/CodeBlock";

// rehype-shiki emits `<pre tabindex="0" data-language="ts">` and per-token
// `<span style="--shiki-dark:...">`. We extend the default sanitiser schema
// to keep those structural bits intact — without them the CodeBlock wrapper
// would lose its language label and Shiki would lose its colours.
const schema: Schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      "className",
      "style",
    ],
    pre: [
      ...(defaultSchema.attributes?.pre ?? []),
      "className",
      "style",
      "tabIndex",
      "dataLanguage",
      "dataTheme",
    ],
    span: [
      ...(defaultSchema.attributes?.span ?? []),
      "className",
      "style",
    ],
  },
};

const SHIKI_OPTIONS = {
  themes: { dark: "github-dark", light: "github-light" },
  // Emit per-token `--shiki-dark` / `--shiki-light` CSS variables instead of
  // a single `color` property — `app/blogs/blogs.css` keys on these variables
  // (lines ~250+ set `color: var(--shiki-dark)`), so courses inherit the
  // same syntax-highlight palette as blogs at zero CSS cost.
  defaultColor: false as const,
};

// Single shared processor — built once at module load. Each render reuses
// it via .process(); plugins are not re-resolved per call.
//
// The pipeline is async because Shiki dynamically imports grammar/theme
// JSON, which is incompatible with react-markdown's synchronous runner
// (the source of the original "runSync finished async" error).
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeShiki, SHIKI_OPTIONS)
  .use(rehypeSanitize, schema)
  // rehype-react converts the HAST tree into a React tree at the end of
  // the pipeline. The `pre` mapping routes Shiki's output through the
  // shared CodeBlock chrome (mac dots, language label, copy button).
  .use(rehypeReact, {
    Fragment,
    jsx: (runtime as { jsx: typeof import("react/jsx-runtime").jsx }).jsx,
    jsxs: (runtime as { jsxs: typeof import("react/jsx-runtime").jsxs }).jsxs,
    components: { pre: CodeBlock },
  });

type Props = {
  source: string;
  /**
   * Drops the long-form treatments (drop cap on the first paragraph,
   * large heading scale) for short-form contexts like quiz questions,
   * options, explanations, and lab hints. Inline code, code blocks,
   * links, and tables still render with full styling.
   */
  compact?: boolean;
  className?: string;
};

export async function EpisodeMarkdown({
  source,
  compact = false,
  className,
}: Props) {
  const cls = className ?? (compact ? "blog-prose compact" : "blog-prose");
  const file = await processor.process(source);
  return <div className={cls}>{file.result as React.ReactNode}</div>;
}
