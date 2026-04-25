"use client";

import { Children, isValidElement, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { langLabel } from "@/lib/markdown/lang-label";

type CodeBlockProps = React.HTMLAttributes<HTMLPreElement> & {
  children?: React.ReactNode;
  ["data-language"]?: string;
  ["data-theme"]?: string;
};

function extractLanguage(children: React.ReactNode): string | null {
  const kids = Children.toArray(children);
  for (const kid of kids) {
    if (!isValidElement(kid)) continue;
    const props = kid.props as { className?: string };
    const match = props.className?.match(/language-([\w-]+)/);
    if (match) return match[1];
  }
  return null;
}

function extractText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    return extractText((node.props as { children?: React.ReactNode }).children);
  }
  return "";
}

export function CodeBlock({ children, className, ...rest }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  // Shiki (via Nextra) sets data-language on the <pre> itself; fall back to the
  // child <code className="language-xxx"> if absent.
  const dataLang = rest["data-language"];
  const childLang = extractLanguage(children);
  const lang = dataLang ?? childLang;
  const label = langLabel(lang);

  const copy = async () => {
    const text = preRef.current?.innerText ?? extractText(children);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  };

  return (
    <div className="relative group my-6 rounded-lg border border-line bg-[#07080b] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-line bg-canvas-2/40">
        <div className="flex items-center gap-2">
          {/* traffic-light accent dots */}
          <span className="size-2 rounded-full bg-rose/60" />
          <span className="size-2 rounded-full bg-amber/60" />
          <span className="size-2 rounded-full bg-mint/60" />
          {label && (
            <span className="ml-3 font-mono text-[10px] tracking-[0.2em] uppercase text-ink-dim">
              {label}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "Copied" : "Copy code"}
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono tracking-[0.15em] uppercase text-ink-dim hover:text-cyan hover:bg-canvas-2 transition-colors"
        >
          {copied ? (
            <>
              <Check className="size-3 text-mint" strokeWidth={2.2} />
              <span className="text-mint">copied</span>
            </>
          ) : (
            <>
              <Copy className="size-3" strokeWidth={1.8} />
              <span>copy</span>
            </>
          )}
        </button>
      </div>

      {/* Pre content — Shiki's inline colors pass through untouched */}
      <pre
        ref={preRef}
        {...rest}
        className={`${className ?? ""} !m-0 !border-0 !rounded-none !bg-transparent`.trim()}
      >
        {children}
      </pre>
    </div>
  );
}
