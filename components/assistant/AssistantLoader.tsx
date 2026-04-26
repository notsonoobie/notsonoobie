"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * The "I'm working on it" indicator that shows while श्रीman is
 * waiting for the first token from the model.
 *
 * Two pieces:
 *
 *  1. **Colorful ring** — a 16×16 conic-gradient cycling through the
 *     site's accent palette (cyan → mint → violet → amber → rose →
 *     cyan), masked into a thin ring, spinning at 1.4s. CSS-only.
 *
 *  2. **Cycling verb** — picks a random verb from `VERBS` every
 *     1.6s and fades between them via Framer's `AnimatePresence`.
 *     Replaces the static "thinking…" with something that feels
 *     alive without being chatty.
 *
 * Renders only while we're waiting for the very first delta. Once
 * tokens start arriving, the parent swaps in the streaming content
 * and removes this loader entirely.
 */

const VERBS = [
  "vibing",
  "cooking",
  "brewing",
  "musing",
  "weaving",
  "humming",
  "pondering",
  "synthesizing",
  "tinkering",
  "channeling",
];

const CYCLE_MS = 1600;

function randomVerb(except?: string): string {
  // Pick a different verb each cycle; with a 10-element list this
  // converges in O(1) and keeps the cadence feeling non-repetitive.
  let pick = VERBS[Math.floor(Math.random() * VERBS.length)]!;
  let attempts = 0;
  while (pick === except && attempts < 5) {
    pick = VERBS[Math.floor(Math.random() * VERBS.length)]!;
    attempts += 1;
  }
  return pick;
}

export function AssistantLoader() {
  const [verb, setVerb] = useState<string>(() => randomVerb());

  useEffect(() => {
    const id = setInterval(() => {
      setVerb((prev) => randomVerb(prev));
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <span
      className="inline-flex items-center gap-2.5"
      aria-live="polite"
      aria-busy="true"
    >
      {/* Spinner — colorful conic-gradient ring with a soft iridescent
          glow underneath, matching the verb shimmer palette. */}
      <span
        aria-hidden
        className="relative size-4 shrink-0 inline-flex items-center justify-center"
      >
        {/* Behind-the-ring glow — kept small + low-opacity so the ring
            stays the focal element, not a fog around it. */}
        <span
          className="absolute inset-[-1px] rounded-full opacity-40 blur-[2.5px]"
          style={{
            background:
              "conic-gradient(from 0deg, var(--color-cyan), var(--color-violet), var(--color-mint), var(--color-amber), var(--color-rose), var(--color-cyan))",
          }}
        />
        <span
          className="relative size-4 rounded-full animate-spin"
          style={{
            background:
              "conic-gradient(from 0deg, var(--color-cyan), var(--color-mint), var(--color-violet), var(--color-amber), var(--color-rose), var(--color-cyan))",
            mask: "radial-gradient(circle, transparent 50%, black 51%)",
            WebkitMask: "radial-gradient(circle, transparent 50%, black 51%)",
            animationDuration: "1.4s",
          }}
        />
      </span>
      <span className="font-mono text-[11px] font-normal tracking-[0.02em] inline-flex">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={verb}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="inline-block assistant-shimmer"
          >
            {verb}
          </motion.span>
        </AnimatePresence>
        <span aria-hidden className="assistant-shimmer">…</span>
      </span>
    </span>
  );
}
