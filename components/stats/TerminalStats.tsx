"use client";

import { motion } from "framer-motion";
import { stats } from "@/lib/data";
import { CountUp } from "@/components/motion/CountUp";

export function TerminalStats() {
  return (
    <section id="stats" aria-label="Key statistics" className="relative border-y border-line bg-canvas-2/40">
      <div className="mx-auto max-w-7xl px-6 md:px-10 py-10">
        {/* Terminal chrome */}
        <div className="flex items-center gap-3 font-mono text-[11px] text-ink-dim mb-6">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-rose/80" />
            <span className="size-2.5 rounded-full bg-amber/80" />
            <span className="size-2.5 rounded-full bg-mint/80" />
          </div>
          <span className="opacity-70">~/rahul/stats.sh</span>
          <span className="ml-auto opacity-60">
            <span className="text-cyan">$</span> stats --live
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 md:gap-10">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <div className="absolute -left-4 top-2 bottom-2 w-px bg-gradient-to-b from-transparent via-cyan/40 to-transparent" />
              <div className="font-display text-4xl md:text-5xl font-semibold tabular-nums tracking-[-0.02em]">
                <CountUp
                  to={s.value}
                  suffix={s.suffix ?? ""}
                  prefix={s.prefix ?? ""}
                  format={s.format === "comma" ? (n) => n.toLocaleString() : undefined}
                />
              </div>
              <div className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-dim">
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
