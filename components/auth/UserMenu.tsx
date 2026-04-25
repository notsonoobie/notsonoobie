"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Award, LogOut, User } from "lucide-react";

type AuthedUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  plan: "free" | "premium";
};

export function UserMenu() {
  const pathname = usePathname();
  const [user, setUser] = useState<AuthedUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Hide on the puppeteer print target — the /certificates/[id]/print
  // route is a headless-only canvas for the PDF generator and shouldn't
  // include any auth chrome.
  const isPrintRoute = pathname?.endsWith("/print") ?? false;

  // Fetch once on mount. Kept lightweight — no SWR/caching layer; if the
  // session changes between navigations the next click reloads via /login
  // or /auth/logout anyway.
  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((body: { user: AuthedUser | null }) => {
        if (!alive) return;
        setUser(body.user);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (isPrintRoute) return null;
  // Show a fixed-size shimmer placeholder until /api/auth/me resolves so
  // the nav slot reserves space and doesn't pop in late. We can't tell
  // signed-in vs signed-out yet, so the placeholder is a generic chip
  // that visually matches both the "sign in" and the avatar variants.
  if (!loaded) {
    return (
      <div
        aria-hidden
        className="fixed top-4 right-4 z-50 inline-flex items-center gap-2 rounded-full hairline bg-canvas-2/60 h-9 pl-1 pr-3 backdrop-blur-sm animate-pulse"
      >
        <span className="size-7 rounded-full bg-canvas-2" />
        <span className="h-3 w-20 rounded bg-canvas-2" />
      </div>
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="fixed top-4 right-4 z-50 inline-flex items-center gap-2 rounded-md hairline bg-canvas-2/70 hover:bg-canvas-2 text-ink text-xs font-mono px-3 h-9 transition-colors backdrop-blur-sm"
      >
        <span className="size-1.5 rounded-full bg-cyan shadow-[0_0_6px_currentColor]" />
        sign in
      </Link>
    );
  }

  const initial = (user.displayName ?? user.email ?? "?").trim().charAt(0).toUpperCase();

  return (
    <div ref={rootRef} className="fixed top-4 right-4 z-50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center gap-2 rounded-full hairline bg-canvas-2/80 hover:bg-canvas-2 h-9 pl-1 pr-3 transition-colors backdrop-blur-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            width={28}
            height={28}
            className="size-7 rounded-full"
          />
        ) : (
          <span className="size-7 rounded-full bg-cyan/20 text-cyan text-xs font-mono flex items-center justify-center">
            {initial}
          </span>
        )}
        <span className="font-mono text-[11px] text-ink-dim max-w-[120px] truncate">
          {user.displayName ?? user.email ?? "signed in"}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-xl hairline bg-canvas-2/95 backdrop-blur-sm p-1.5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)]"
        >
          <div className="px-2.5 py-2 border-b border-line">
            <div className="text-ink text-sm font-medium truncate">
              {user.displayName ?? "Signed in"}
            </div>
            {user.email && (
              <div className="text-ink-faint text-[11px] font-mono truncate">
                {user.email}
              </div>
            )}
            <div className="mt-1.5 inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.18em] uppercase text-cyan">
              <span className="size-1 rounded-full bg-cyan shadow-[0_0_6px_currentColor]" />
              {user.plan} plan
            </div>
          </div>

          <Link
            href="/courses"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-ink-dim hover:text-ink hover:bg-canvas/60 text-[13px] transition-colors"
          >
            <User className="size-3.5" strokeWidth={1.75} />
            my courses
          </Link>
          <Link
            href="/me/certificates"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-ink-dim hover:text-ink hover:bg-canvas/60 text-[13px] transition-colors"
          >
            <Award className="size-3.5" strokeWidth={1.75} />
            certificates
          </Link>

          <form action="/auth/logout" method="post" className="pt-1 mt-1 border-t border-line">
            <button
              type="submit"
              role="menuitem"
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-ink-dim hover:text-rose hover:bg-canvas/60 text-[13px] transition-colors"
            >
              <LogOut className="size-3.5" strokeWidth={1.75} />
              sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
