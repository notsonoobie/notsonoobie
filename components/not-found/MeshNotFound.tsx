"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, CornerDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

type PostSpec = { slug: string; title: string };

type PrimaryNode = {
  id: string;
  label: string;
  href: string;
  hotkey: string;
  hotkeyKey: string;
};

const PRIMARIES: PrimaryNode[] = [
  { id: "home",    label: "home",    href: "/",         hotkey: "g h", hotkeyKey: "h" },
  { id: "writing", label: "writing", href: "/blogs",    hotkey: "g b", hotkeyKey: "b" },
  { id: "resume",  label: "resume",  href: "/resume",   hotkey: "g r", hotkeyKey: "r" },
  { id: "contact", label: "contact", href: "/#contact", hotkey: "g c", hotkeyKey: "c" },
];

function formatElapsed(s: number) {
  if (s < 60) return `${String(s).padStart(2, "0")} s`;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function MeshNotFound({ posts }: { posts: PostSpec[] }) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [timestamp, setTimestamp] = useState("--:--:-- UTC+05:30");
  const [gHeld, setGHeld] = useState(false);
  const gTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live clock + elapsed timer.
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const ss = String(now.getSeconds()).padStart(2, "0");
      setTimestamp(`${hh}:${mm}:${ss} UTC+05:30`);
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  // Vim-style G + letter navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA" || tgt.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") {
        setGHeld(false);
        if (gTimer.current) clearTimeout(gTimer.current);
        return;
      }
      if (!gHeld) {
        if (e.key.toLowerCase() === "g") {
          e.preventDefault();
          setGHeld(true);
          if (gTimer.current) clearTimeout(gTimer.current);
          gTimer.current = setTimeout(() => setGHeld(false), 1400);
        }
        return;
      }
      const k = e.key.toLowerCase();
      const match = PRIMARIES.find((p) => p.hotkeyKey === k);
      if (match) {
        e.preventDefault();
        router.push(match.href);
      }
      setGHeld(false);
      if (gTimer.current) clearTimeout(gTimer.current);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [gHeld, router]);

  return (
    <section className="relative min-h-[100svh] w-full overflow-hidden isolate bg-canvas text-ink">
      {/* Background layers */}
      <div aria-hidden className="absolute inset-0 bg-grid bg-grid-fade opacity-40 pointer-events-none" />
      <div
        aria-hidden
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[640px] rounded-full opacity-60 pointer-events-none blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--color-cyan) 18%, transparent) 0%, transparent 65%)",
        }}
      />

      {/* Top status strip */}
      <div className="absolute top-0 left-0 right-0 z-20 pl-6 pr-16 md:pl-10 md:pr-16 lg:pr-10 pt-6 flex items-center justify-between font-mono text-[11px] text-ink-dim">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-1.5 rounded-full bg-amber shadow-[0_0_8px_currentColor] text-amber animate-pulse" />
          <span className="text-amber/90">404</span>
          <span className="text-ink-faint hidden sm:inline">
            · route_not_found · dispatch failed
          </span>
          <span className="text-ink-faint sm:hidden">· route_not_found</span>
        </div>
        <div className="tabular-nums" suppressHydrationWarning>
          {timestamp}
        </div>
      </div>

      {/* Monogram */}
      <Link href="/" className="absolute top-16 left-6 md:left-10 z-20" aria-label="Return to home page">
        <div className="size-9 rounded-md hairline bg-canvas-2/60 backdrop-blur grid place-items-center font-mono text-[11px] tracking-[0.2em] text-cyan hover:text-canvas hover:bg-cyan transition-colors">
          RG
        </div>
      </Link>

      {/* Main content — single centered column */}
      <div className="relative z-10 mx-auto max-w-3xl px-6 md:px-10 pt-32 md:pt-40 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="font-mono text-[11px] tracking-[0.3em] text-amber uppercase"
        >
          <span className="opacity-60">$</span>&nbsp;ERR_ROUTE
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mt-4 font-display text-[clamp(3rem,8vw,6rem)] leading-[0.95] tracking-[-0.02em] font-semibold"
        >
          Lost in the mesh.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-5 text-ink-dim text-base md:text-lg leading-relaxed"
        >
          The path{" "}
          <code className="font-mono text-amber bg-amber/10 border border-amber/25 rounded px-1.5 py-0.5 text-[0.92em] break-all">
            {pathname}
          </code>{" "}
          isn&apos;t registered with any service on this host.
        </motion.p>

        {/* Recovery Console */}
        <motion.aside
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 rounded-xl hairline bg-canvas-2/60 backdrop-blur p-5 md:p-6 font-mono text-[12px] relative overflow-hidden"
          aria-label="Recovery console"
        >
          {/* Corner brackets */}
          <span aria-hidden className="pointer-events-none absolute top-1.5 left-1.5 size-4 border-l border-t border-cyan/60 rounded-tl-md" />
          <span aria-hidden className="pointer-events-none absolute bottom-1.5 right-1.5 size-4 border-r border-b border-cyan/60 rounded-br-md" />

          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-rose/80" />
              <span className="size-2 rounded-full bg-amber/80" />
              <span className="size-2 rounded-full bg-mint/80" />
              <span className="ml-2 text-ink-faint tracking-[0.18em] uppercase text-[10px]">
                ~/recovery
              </span>
            </div>
            <span className="text-cyan text-[10px]">v1</span>
          </div>

          {/* Trace */}
          <div className="mt-4 space-y-1 leading-relaxed">
            <div>
              <span className="text-amber">Error:</span>{" "}
              <span className="text-ink">ROUTE_NOT_FOUND</span>
            </div>
            <div className="pl-4 text-ink-dim">
              at <span className="text-ink">Mesh.resolve</span>(
              <span className="text-cyan break-all">&quot;{pathname}&quot;</span>)
            </div>
            <div className="pl-4 text-ink-dim">
              at <span className="text-ink">Gateway.dispatch</span>(req)
            </div>
            <div className="pl-4 text-ink-dim">
              at <span className="text-ink">Client.fetch</span>
            </div>
          </div>

          {/* Primary routes */}
          <div className="mt-5 pt-4 border-t border-line">
            <div className="text-ink-faint tracking-[0.18em] uppercase text-[10px] mb-2.5">
              REDIRECT TO
            </div>
            <ul className="space-y-1">
              {PRIMARIES.map((p) => (
                <li key={p.id}>
                  <Link
                    href={p.href}
                    className={cn(
                      "group flex items-center justify-between gap-3 rounded-md px-2 py-1.5 transition-colors outline-none",
                      "text-ink-dim hover:bg-canvas/70 hover:text-ink",
                      "focus-visible:bg-canvas focus-visible:text-ink focus-visible:ring-1 focus-visible:ring-cyan/60",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-cyan">&gt;</span>
                      <span className="transition-colors group-hover:text-cyan group-focus-visible:text-cyan">
                        {p.label}
                      </span>
                    </span>
                    <span className="text-ink-faint text-[10px] tracking-wider uppercase opacity-70 group-hover:opacity-100 transition-opacity">
                      {p.hotkey}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Recent writing */}
          {posts.length > 0 && (
            <div className="mt-5 pt-4 border-t border-line">
              <div className="text-ink-faint tracking-[0.18em] uppercase text-[10px] mb-2.5">
                RECENT WRITING
              </div>
              <ul className="space-y-1">
                {posts.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={`/blogs/${p.slug}`}
                      className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-ink-dim hover:bg-canvas/70 hover:text-ink transition-colors"
                    >
                      <span className="text-cyan shrink-0">&gt;</span>
                      <span className="truncate">{p.title}</span>
                      <ArrowRight className="ml-auto size-3 shrink-0 text-ink-faint group-hover:text-cyan group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer status row */}
          <div className="mt-5 pt-4 border-t border-line flex items-center justify-between text-[10px] tracking-wider uppercase text-ink-faint gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="relative size-1.5">
                <span className="absolute inset-0 rounded-full bg-mint animate-ping opacity-60" />
                <span className="relative block size-1.5 rounded-full bg-mint shadow-[0_0_6px_currentColor]" />
              </span>
              stuck{" "}
              <span className="text-ink tabular-nums" suppressHydrationWarning>
                {formatElapsed(elapsed)}
              </span>
            </span>
            <span
              className={cn(
                "transition-colors inline-flex items-center gap-1",
                gHeld ? "text-cyan" : "",
              )}
            >
              {gHeld ? (
                <>
                  <CornerDownRight className="size-3" />
                  <span className="tracking-[0.18em]">g …</span>
                </>
              ) : (
                <span>g + h / b / r / c</span>
              )}
            </span>
          </div>
        </motion.aside>
      </div>
    </section>
  );
}
