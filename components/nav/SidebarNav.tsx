"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Folder, Menu, X, ChevronRight } from "lucide-react";
import { navGroups, type NavItemIcon } from "@/lib/data";
import { cn } from "@/lib/utils";
import { smoothScrollTo, useLenis } from "@/components/motion/LenisProvider";

const ICON_LABEL: Record<NavItemIcon, { text: string; color: string }> = {
  tsx: { text: "TSX", color: "text-cyan" },
  md: { text: "MD", color: "text-mint" },
  mdx: { text: "MDX", color: "text-mint" },
  json: { text: "JSON", color: "text-amber" },
  log: { text: "LOG", color: "text-violet" },
  dir: { text: "DIR", color: "text-rose" },
};

export function SidebarNav() {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const [activeItem, setActiveItem] = useState<string>("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const lenis = useLenis();
  const mobileRef = useRef<HTMLDivElement>(null);

  // Close the mobile drawer on outside click or Escape.
  useEffect(() => {
    if (!mobileOpen) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (target && mobileRef.current && !mobileRef.current.contains(target)) {
        setMobileOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  // Auto-close when navigating to a new page.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Active group derived from current route
  const activeGroup = navGroups.find((g) => {
    if (g.href === "/") return onHome;
    return pathname.startsWith(g.href);
  });

  // Scroll-spy on home — highlight the section currently in view
  useEffect(() => {
    if (!onHome) {
      setActiveItem("");
      return;
    }
    const portfolio = navGroups.find((g) => g.id === "portfolio");
    if (!portfolio) return;

    const entries = new Map<string, number>();
    const observer = new IntersectionObserver(
      (items) => {
        items.forEach((entry) => {
          entries.set(entry.target.id, entry.intersectionRatio);
        });
        let best = "";
        let bestRatio = 0;
        entries.forEach((ratio, id) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = id;
          }
        });
        if (bestRatio > 0) setActiveItem(best);
      },
      { threshold: [0.25, 0.5, 0.75] },
    );
    portfolio.items.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [onHome]);

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    if (!onHome) {
      window.location.href = `/#${id}`;
      return;
    }
    smoothScrollTo(`#${id}`, lenis);
    if (typeof window !== "undefined") {
      history.replaceState(null, "", `#${id}`);
    }
  };

  const renderGroups = (closeOnNav?: () => void) => (
    <ul className="space-y-3">
      {navGroups.map((group) => {
        const isActiveGroup = activeGroup?.id === group.id;
        return (
          <li key={group.id}>
            {/* Folder header — clickable link */}
            <Link
              href={group.href}
              onClick={closeOnNav}
              className={cn(
                "group flex items-center gap-1.5 font-mono text-[12px] tracking-tight py-1 px-1 rounded transition-colors",
                isActiveGroup
                  ? "text-cyan"
                  : "text-ink hover:text-cyan",
              )}
            >
              <Folder
                className={cn(
                  "size-3.5 shrink-0 transition-colors",
                  isActiveGroup ? "text-cyan" : "text-ink-faint group-hover:text-cyan",
                )}
                strokeWidth={1.75}
              />
              <span>{group.label}</span>
            </Link>

            {/* Sub-items */}
            {group.items.length > 0 && (
              <ul className="mt-1 ml-1.5 pl-2 border-l border-line space-y-0.5">
                {group.items.map((item) => {
                  const meta = ICON_LABEL[item.icon];
                  const isActiveItem = onHome && activeItem === item.id;
                  return (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        onClick={(e) => {
                          handleAnchorClick(e, item.id);
                          closeOnNav?.();
                        }}
                        className={cn(
                          "relative flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors font-mono text-[12px]",
                          isActiveItem
                            ? "bg-canvas text-ink"
                            : "text-ink-dim hover:text-ink hover:bg-canvas/60",
                        )}
                      >
                        {isActiveItem && (
                          <motion.span
                            layoutId="nav-pointer"
                            className="absolute -left-2 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-cyan shadow-[0_0_10px_currentColor]"
                          />
                        )}
                        <span
                          className={cn(
                            "text-[9.5px] font-semibold tracking-wider w-9 shrink-0",
                            meta.color,
                          )}
                        >
                          {meta.text}
                        </span>
                        <span className="truncate">{item.label}</span>
                        {isActiveItem && (
                          <ChevronRight className="ml-auto size-3 text-cyan" strokeWidth={2} />
                        )}
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      {/* Desktop: right sidebar */}
      <aside
        aria-label="Section navigation"
        className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 z-40 flex-col"
      >
        <div className="rounded-xl hairline bg-canvas-2/60 backdrop-blur-md p-3 font-mono text-[12px] min-w-[220px]">
          <div className="flex items-center justify-between px-1 pb-2 border-b border-line/80 mb-3">
            <span className="text-ink-faint text-[10px] tracking-[0.18em] uppercase">~/rahul</span>
            <span className="text-ink-faint text-[10px]">v1</span>
          </div>
          {renderGroups()}
        </div>
      </aside>

      {/* Mobile: top bar / drawer */}
      <div ref={mobileRef} className="lg:hidden fixed top-4 right-4 z-40">
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
              <div className="flex items-center justify-between px-1 pb-2 border-b border-line/80 mb-3">
                <span className="text-ink-faint text-[10px] tracking-[0.18em] uppercase">~/rahul</span>
                <span className="text-ink-faint text-[10px]">v1</span>
              </div>
              {renderGroups(() => setMobileOpen(false))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
