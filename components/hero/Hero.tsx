"use client";

import { smoothScrollTo, useLenis } from "@/components/motion/LenisProvider";
import { getAvailability } from "@/lib/availability";
import { profile } from "@/lib/data";
import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { ServiceMesh } from "./ServiceMesh";

export function Hero() {
  const lenis = useLenis();
  const availability = getAvailability();
  return (
    <section
      id="hero"
      aria-label="Introduction"
      className="relative min-h-[100svh] w-full overflow-hidden isolate"
    >
      {/* Full-bleed faint dotted grid */}
      <div aria-hidden className="absolute inset-0 bg-grid bg-grid-fade opacity-40 pointer-events-none" />

      {/* Top meta bar — consulting status + region chips + clock. Hidden
          on every breakpoint where the SidebarNav burger is visible
          (top-4 left-4, hidden at lg+). On mobile/tablet the bar would
          collide with the burger on the left and the UserMenu on the
          right; only desktop has space for it. */}
      <div className="absolute top-0 left-0 right-0 z-20 px-6 md:px-10 pt-6 hidden lg:flex items-center justify-between font-mono text-[11px] text-ink-dim">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block size-1.5 rounded-full shadow-[0_0_8px_currentColor] ${
              availability.accent === "mint" ? "bg-mint text-mint" : "bg-amber text-amber"
            }`}
          />
          <span>{availability.statusLabel} · mumbai_in</span>
        </div>
        <div className="flex items-center gap-4 opacity-80">
          <span>region: ap-south-1</span>
          <span>build: stable</span>
          <span>latency: 12ms</span>
        </div>
        {/* Empty third child preserves the original justify-between
            distribution so the region chips stay roughly centred
            instead of snapping to the right edge after the clock
            was removed. */}
        <div aria-hidden />
      </div>

      {/* Monogram — hidden below lg because the SidebarNav burger sits at
          top-4 left-4 on those breakpoints and a stacked RG box directly
          beneath it reads as a duplicate UI affordance. Re-appears on
          desktop where the burger is gone. */}
      <div className="hidden lg:block absolute top-16 left-6 md:left-10 z-20">
        <div className="size-9 rounded-md hairline bg-canvas-2/60 backdrop-blur grid place-items-center font-mono text-[11px] tracking-[0.2em] text-cyan">
          RG
        </div>
      </div>

      {/* Main grid: text left, graph right */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-10 pt-32 md:pt-40 pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-16 items-center min-h-[60vh] lg:min-h-[68vh]">
          {/* Left: text column */}
          <div className="relative">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="font-mono text-[11px] tracking-[0.3em] text-cyan uppercase"
            >
              <span className="opacity-60">$</span>&nbsp;whoami
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.0, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="mt-4 font-display text-[clamp(2.75rem,7vw,5.5rem)] leading-[0.95] tracking-[-0.02em] font-semibold"
            >
              {profile.name}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="mt-5 text-ink-dim text-base md:text-lg max-w-xl"
            >
              {profile.title}
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.45 }}
              className="mt-8 md:mt-10 font-display text-[clamp(1.25rem,2.3vw,1.75rem)] leading-tight text-ink"
            >
              Building distributed systems.
              <br />
              <span className="text-cyan text-glow-cyan">Embedding intelligence.</span>
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.65 }}
              className="mt-8 flex flex-wrap items-center gap-2.5 font-mono text-[11px] text-ink-dim"
            >
              <Chip>6Y Experience</Chip>
              <Chip>BFSI · NBFC · Fintechs</Chip>
              <Chip>Multi-Cloud</Chip>
              <Chip>Agentic AI</Chip>
              <Chip>Mumbai · IN</Chip>
            </motion.div>
          </div>

          {/* Right: framed graph */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative aspect-square w-full max-w-[440px] sm:max-w-[520px] md:max-w-[640px] mx-auto lg:max-w-none lg:w-full lg:h-[min(72vh,640px)] lg:aspect-auto"
          >
            {/* Mesh container */}
            <div className="relative h-full w-full overflow-hidden">
              <ServiceMesh />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll cue */}
      <motion.a
        href="#stats"
        onClick={(e) => {
          e.preventDefault();
          smoothScrollTo("#stats", lenis);
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.9 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 font-mono text-[10px] tracking-[0.3em] text-ink-dim hover:text-cyan transition-colors"
      >
        SCROLL
        <motion.span
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="inline-flex"
        >
          <ArrowDown className="size-4" />
        </motion.span>
      </motion.a>
    </section>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2.5 py-1 rounded-sm hairline bg-canvas-2/60 backdrop-blur text-ink-dim">
      {children}
    </span>
  );
}

