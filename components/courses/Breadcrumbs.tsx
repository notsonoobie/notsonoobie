import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type BreadcrumbItem = {
  href?: string;
  label: string;
};

type Props = {
  items: BreadcrumbItem[];
  className?: string;
};

/**
 * Visible breadcrumb trail rendered above the page hero. The current
 * leaf (the page the user is on) should not have an href so it renders
 * as plain text. Pairs with the `BreadcrumbList` JSON-LD that the same
 * route emits — same labels, same order.
 *
 * Kept intentionally compact (font-mono, 11 px, ink-dim) so it doesn't
 * compete with the page title — the structured data does the heavy
 * lifting; the visible chrome is for orientation.
 */
export function Breadcrumbs({ items, className = "" }: Props) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`font-mono text-[11px] text-ink-dim ${className}`}
    >
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="inline-flex items-center gap-1.5">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="hover:text-ink transition-colors focus-visible:outline-none focus-visible:text-cyan"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={isLast ? "text-ink-dim truncate max-w-[18ch] sm:max-w-[28ch]" : "text-ink-dim"}
                  aria-current={isLast ? "page" : undefined}
                  title={item.label}
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <ChevronRight
                  className="size-3 text-ink-faint shrink-0"
                  strokeWidth={2}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
