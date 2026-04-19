"use client";

import { useEffect, useState } from "react";
import type { TocHeading } from "@/lib/blogs";
import { cn } from "@/lib/utils";
import { smoothScrollTo, useLenis } from "@/components/motion/LenisProvider";

export function PostTOC({ toc }: { toc: TocHeading[] }) {
  const [active, setActive] = useState<string>("");
  const lenis = useLenis();

  useEffect(() => {
    if (toc.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "0px 0px -70% 0px", threshold: 0 },
    );
    toc.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [toc]);

  if (toc.length === 0) return null;

  return (
    <aside className="hidden xl:block w-[240px] shrink-0">
      <div className="sticky top-24 pr-4">
        <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-ink-faint mb-4">
          on this page
        </div>
        <ul className="space-y-1 border-l border-line">
          {toc.map((h) => {
            const isActive = active === h.id;
            return (
              <li key={h.id}>
                <a
                  href={`#${h.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    smoothScrollTo(`#${h.id}`, lenis);
                    history.replaceState(null, "", `#${h.id}`);
                  }}
                  className={cn(
                    "block text-[12px] leading-snug py-1.5 pl-3 -ml-px border-l transition-colors",
                    h.depth === 3 && "pl-6",
                    h.depth >= 4 && "pl-8",
                    isActive
                      ? "border-cyan text-cyan"
                      : "border-transparent text-ink-dim hover:text-ink",
                  )}
                >
                  {h.value}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
