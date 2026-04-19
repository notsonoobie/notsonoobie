"use client";

import { ArrowUp } from "lucide-react";
import { smoothScrollTo, useLenis } from "@/components/motion/LenisProvider";

export function Footer() {
  const year = new Date().getFullYear();
  const lenis = useLenis();
  return (
    <footer className="relative border-t border-line">
      <div className="mx-auto max-w-7xl px-6 md:px-10 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 font-mono text-[11px] text-ink-dim">
        <div>
          © {year} Rahul Gupta · Crafted by Claude Code · built with Next.js on Vercel
        </div>
        <div className="flex items-center gap-6">
          <span className="inline-flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-mint shadow-[0_0_8px_currentColor]" />
            uptime 99.99%
          </span>
          <a
            href="#hero"
            onClick={(e) => {
              e.preventDefault();
              smoothScrollTo("#hero", lenis);
            }}
            className="inline-flex items-center gap-1.5 hover:text-cyan transition-colors"
          >
            back to top
            <ArrowUp className="size-3.5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
