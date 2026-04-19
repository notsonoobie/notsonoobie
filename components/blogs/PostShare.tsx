"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

type Props = {
  url: string;
  title: string;
};

export function PostShare({ url, title }: Props) {
  const [copied, setCopied] = useState(false);
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-ink-faint mr-1">
        share
      </span>
      <button
        type="button"
        aria-label="Copy link"
        onClick={copy}
        className="size-8 grid place-items-center rounded-md hairline bg-canvas-2/60 text-ink-dim hover:text-cyan hover:bg-canvas-2 transition-colors"
      >
        {copied ? <Check className="size-3.5 text-mint" /> : <Copy className="size-3.5" />}
      </button>
      <a
        href={linkedinUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on LinkedIn"
        className="size-8 grid place-items-center rounded-md hairline bg-canvas-2/60 text-ink-dim hover:text-cyan hover:bg-canvas-2 transition-colors"
      >
        <LinkedinIcon className="size-3.5" />
      </a>
      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on X / Twitter"
        className="size-8 grid place-items-center rounded-md hairline bg-canvas-2/60 text-ink-dim hover:text-cyan hover:bg-canvas-2 transition-colors"
      >
        <XIcon className="size-3.5" />
      </a>
    </div>
  );
}
