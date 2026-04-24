"use client";

import { ArrowUp } from "lucide-react";
import { usePathname } from "next/navigation";
import { smoothScrollTo, useLenis } from "@/components/motion/LenisProvider";
import { NewsletterForm } from "@/components/newsletter/NewsletterForm";

export function Footer() {
  const year = new Date().getFullYear();
  const lenis = useLenis();
  const pathname = usePathname();

  const backToTop = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const heroEl = document.getElementById("hero");
    if (pathname === "/" && heroEl) {
      smoothScrollTo("#hero", lenis);
    } else if (lenis) {
      lenis.scrollTo(0);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer className="relative border-t border-line">
      <div className="mx-auto max-w-7xl px-6 md:px-10 py-14 md:py-20">
        <NewsletterForm
          variant="compact"
          heading="Don't miss the"
          headingAccent="next dispatch."
          subhead=""
        />
      </div>
      <div className="border-t border-line">
        <div className="mx-auto max-w-7xl px-6 md:px-10 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 font-mono text-[11px] text-ink-dim">
          <div>
            © {year} Rahul Gupta · Crafted by Claude Code · Built with Next.js on Vercel
          </div>
          <div className="flex items-center gap-6">
            <span className="inline-flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-mint shadow-[0_0_8px_currentColor]" />
              uptime 99.99%
            </span>
            <a
              href="#hero"
              onClick={backToTop}
              className="inline-flex items-center gap-1.5 hover:text-cyan transition-colors"
            >
              back to top
              <ArrowUp className="size-3.5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
