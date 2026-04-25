"use client";

import { ArrowUp } from "lucide-react";
import { usePathname } from "next/navigation";
import { smoothScrollTo, useLenis } from "@/components/motion/LenisProvider";

/**
 * Footer back-to-top affordance. Lives in its own client island so the
 * surrounding `<Footer />` can stay a server component and embed
 * server-fetching pieces (e.g. `<StatusBadge />`) without forcing the
 * whole footer to render on the client.
 *
 * On `/` we smooth-scroll to `#hero` (matches the home navigation
 * model). On every other route we scroll the document to top — which
 * is what the user expects from a global "back to top" link.
 */
export function BackToTopLink() {
  const lenis = useLenis();
  const pathname = usePathname();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
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
    <a
      href="#hero"
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 hover:text-cyan transition-colors"
    >
      back to top
      <ArrowUp className="size-3.5" />
    </a>
  );
}
