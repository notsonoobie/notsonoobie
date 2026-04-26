"use client";

import { memo, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Markdown renderer for श्रीman's responses.
 *
 * Site-themed, chat-appropriate. No drop caps, no document-style
 * headings, no Shiki — chat answers are 2-4 sentences with the
 * occasional list, code snippet, or link, not blog-length prose.
 *
 * Robust to streaming: react-markdown re-parses on every render, so
 * partial markdown (e.g. `**bo` mid-stream) shows as the literal
 * source until the closing token arrives — same behaviour as Claude
 * and ChatGPT.
 */

const COMPONENTS: Components = {
  // Chat answers shouldn't carry document headings — render h1-h3
  // as bolded labels on their own line. h4-h6 collapse to the same.
  h1: ({ children }) => (
    <p className="font-semibold text-ink mt-2 mb-1">{children}</p>
  ),
  h2: ({ children }) => (
    <p className="font-semibold text-ink mt-2 mb-1">{children}</p>
  ),
  h3: ({ children }) => (
    <p className="font-semibold text-ink mt-2 mb-1">{children}</p>
  ),
  h4: ({ children }) => (
    <p className="font-semibold text-ink mt-2 mb-1">{children}</p>
  ),
  h5: ({ children }) => (
    <p className="font-semibold text-ink mt-2 mb-1">{children}</p>
  ),
  h6: ({ children }) => (
    <p className="font-semibold text-ink mt-2 mb-1">{children}</p>
  ),
  p: ({ children }) => (
    <p className="leading-relaxed [&:not(:first-child)]:mt-2">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-none pl-1 my-2 space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-none pl-1 my-2 space-y-1 [counter-reset:assistant-ol]">
      {children}
    </ol>
  ),
  li: ({ children, node }) => {
    // Detect ordered vs unordered via parent. react-markdown passes
    // `node.position` but not the parent type — easier to use CSS
    // counters: each ordered <ol> resets the counter, ordered <li>
    // increments it. Unordered <li> shows a cyan bullet.
    const ordered = (node as unknown as { parent?: { tagName?: string } })
      ?.parent?.tagName === "ol";
    return (
      <li
        className={`relative pl-5 leading-relaxed ${
          ordered
            ? "[counter-increment:assistant-ol] before:content-[counter(assistant-ol)] before:absolute before:left-0 before:top-0 before:font-mono before:text-[11px] before:text-cyan"
            : "before:content-['▸'] before:absolute before:left-0 before:top-0 before:text-cyan before:text-[12px]"
        }`}
      >
        {children}
      </li>
    );
  },
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-cyan underline underline-offset-2 hover:text-cyan-soft transition-colors break-words"
    >
      {children}
    </a>
  ),
  // Inline code vs code block — react-markdown's `code` callback
  // covers both. We sniff `node.position` and the presence of a
  // newline in children to differentiate. The cleanest way is the
  // className: language-* implies a fenced block.
  code: ({ className, children }) => {
    const isBlock = className?.startsWith("language-") || /\n/.test(String(children));
    if (isBlock) {
      return (
        <code className="block font-mono text-[12px] text-ink leading-relaxed">
          {children}
        </code>
      );
    }
    return (
      <code className="font-mono text-[11.5px] bg-cyan/10 text-cyan px-1 py-[1px] rounded-[3px]">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-2 px-3 py-2.5 rounded-md hairline bg-canvas/60 overflow-x-auto text-[12px] leading-relaxed">
      {children}
    </pre>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-ink">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 pl-3 border-l-2 border-cyan/40 text-ink-dim italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-line-2" />,
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="border-collapse text-[12px]">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="px-2 py-1 text-left font-semibold border-b border-line">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-2 py-1 border-b border-line/50">{children}</td>
  ),
};

type Props = {
  content: string;
};

function AssistantMarkdownInner({ content }: Props): ReactNode {
  return (
    <div className="text-[13px] text-ink break-words [&>*:first-child]:mt-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

// Memoised — react-markdown re-parses on every render, so when
// streaming we want to avoid re-rendering siblings (cursor, sources)
// that didn't change.
export const AssistantMarkdown = memo(AssistantMarkdownInner);
