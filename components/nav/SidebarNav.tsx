"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sections } from "@/lib/data";
import { ChevronRight, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { smoothScrollTo, useLenis } from "@/components/motion/LenisProvider";

const ICON_LABEL: Record<string, { text: string; color: string }> = {
  tsx: { text: "TSX", color: "text-cyan" },
  md: { text: "MD", color: "text-mint" },
  json: { text: "JSON", color: "text-amber" },
  log: { text: "LOG", color: "text-violet" },
  dir: { text: "DIR", color: "text-rose" },
};

export function SidebarNav() {
  const [active, setActive] = useState<string>(sections[0].id);
  const [mobileOpen, setMobileOpen] = useState(false);
  const lenis = useLenis();

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    smoothScrollTo(`#${id}`, lenis);
    // update URL hash without re-triggering a native jump
    if (typeof window !== "undefined") {
      history.replaceState(null, "", `#${id}`);
    }
  };

  useEffect(() => {
    const entries = new Map<string, number>();
    const observer = new IntersectionObserver(
      (items) => {
        items.forEach((entry) => {
          entries.set(entry.target.id, entry.intersectionRatio);
        });
        let best = active;
        let bestRatio = 0;
        entries.forEach((ratio, id) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = id;
          }
        });
        if (bestRatio > 0) setActive(best);
      },
      { threshold: [0.25, 0.5, 0.75] },
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {/* Desktop: right sidebar */}
      <aside
        aria-label="Section navigation"
        className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 z-40 flex-col"
      >
        <div className="rounded-xl hairline bg-canvas-2/60 backdrop-blur-md p-3 font-mono text-[12px] min-w-[220px]">
          <div className="flex items-center justify-between px-2 pb-2 border-b border-line/80 mb-2">
            <span className="text-ink-dim">portfolio/</span>
            <span className="text-ink-faint">v1</span>
          </div>
          <ul className="space-y-0.5">
            {sections.map((s) => {
              const meta = ICON_LABEL[s.icon] ?? ICON_LABEL.tsx;
              const isActive = active === s.id;
              return (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    onClick={(e) => handleNavClick(e, s.id)}
                    className={cn(
                      "relative flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
                      isActive ? "bg-canvas text-ink" : "text-ink-dim hover:text-ink hover:bg-canvas/60",
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="nav-pointer"
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-cyan shadow-[0_0_10px_currentColor]"
                      />
                    )}
                    <span className={cn("text-[9.5px] font-semibold tracking-wider w-9 shrink-0", meta.color)}>
                      {meta.text}
                    </span>
                    <span className="truncate">{s.label}</span>
                    {isActive && <ChevronRight className="ml-auto size-3 text-cyan" strokeWidth={2} />}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      {/* Mobile: top bar / drawer */}
      <div className="lg:hidden fixed top-4 right-4 z-40">
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="size-10 rounded-md hairline bg-canvas-2/80 backdrop-blur grid place-items-center"
          aria-label="Open navigation"
        >
          {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-12 min-w-[220px] rounded-xl hairline bg-canvas-2/95 backdrop-blur p-3 font-mono text-[12px]"
            >
              <ul className="space-y-0.5">
                {sections.map((s) => {
                  const meta = ICON_LABEL[s.icon] ?? ICON_LABEL.tsx;
                  const isActive = active === s.id;
                  return (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        onClick={(e) => {
                          handleNavClick(e, s.id);
                          setMobileOpen(false);
                        }}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
                          isActive ? "bg-canvas text-ink" : "text-ink-dim hover:text-ink hover:bg-canvas/60",
                        )}
                      >
                        <span className={cn("text-[9.5px] font-semibold tracking-wider w-9 shrink-0", meta.color)}>
                          {meta.text}
                        </span>
                        <span>{s.label}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
