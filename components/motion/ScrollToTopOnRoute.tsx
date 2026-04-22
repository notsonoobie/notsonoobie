"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useLenis } from "@/components/motion/LenisProvider";

/**
 * Resets scroll to the top on every route change. Lenis intercepts native
 * scroll, so Next's default scroll-restoration isn't reliable once the smooth
 * wheel is running — we drive the scroll explicitly here. URLs with a hash
 * (anchor navigation) are left alone so the in-page smooth-scroll handler can
 * land wherever it wants.
 */
export function ScrollToTopOnRoute() {
  const pathname = usePathname();
  const lenis = useLenis();
  const prev = useRef<string | null>(null);

  useEffect(() => {
    if (prev.current === null) {
      prev.current = pathname;
      return;
    }
    if (prev.current === pathname) return;
    prev.current = pathname;
    if (typeof window !== "undefined" && window.location.hash) return;
    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
    } else if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
  }, [pathname, lenis]);

  return null;
}
