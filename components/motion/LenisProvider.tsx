"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Lenis from "lenis";

const LenisContext = createContext<Lenis | null>(null);

export function useLenis() {
  return useContext(LenisContext);
}

/** Smoothly scroll to an anchor — uses Lenis if available, falls back to native.
 *  For hash strings (starting with #) we use getElementById because querySelector
 *  can't handle IDs starting with a digit (common for auto-slugged headings like
 *  "1. Process supervision" → id="1-process-supervision"). */
export function smoothScrollTo(
  target: string | HTMLElement,
  lenis: Lenis | null,
) {
  let el: HTMLElement | null = null;
  if (typeof target === "string") {
    el = target.startsWith("#")
      ? document.getElementById(target.slice(1))
      : document.querySelector<HTMLElement>(target);
  } else {
    el = target;
  }
  if (!el) return;
  if (lenis) {
    lenis.scrollTo(el, { offset: 0 });
  } else {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export function LenisProvider({ children }: { children: React.ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const instance = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    setLenis(instance);

    let rafId = 0;
    function raf(time: number) {
      instance.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      instance.destroy();
      setLenis(null);
    };
  }, []);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}
