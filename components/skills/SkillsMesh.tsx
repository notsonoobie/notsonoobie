"use client";

import { motion } from "framer-motion";
import { skills } from "@/lib/data";
import { SectionHeader } from "@/components/ui/SectionHeader";

const ACCENTS = ["cyan", "violet", "amber", "mint", "rose", "cyan", "violet", "amber"] as const;

export function SkillsMesh() {
  return (
    <section id="skills" aria-label="Technical skills" className="relative py-24 md:py-32 bg-canvas-2/30 border-y border-line">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <SectionHeader index="// 04" kicker="technical skills" title="Wired across the stack." />

        <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {skills.map((group, i) => {
            const accent = ACCENTS[i % ACCENTS.length];
            return (
              <motion.div
                key={group.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                className="relative rounded-xl hairline bg-canvas-2/50 p-5 overflow-hidden group hover:bg-canvas-2 transition-colors"
              >
                {/* Accent rail */}
                <div
                  className={`absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-transparent via-${accent} to-transparent opacity-70`}
                  style={{ backgroundImage: `linear-gradient(to bottom, transparent, var(--color-${accent}), transparent)` }}
                />
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink-dim">
                    {group.label}
                  </span>
                  <span
                    className="size-2 rounded-full"
                    style={{ background: `var(--color-${accent})`, boxShadow: `0 0 10px var(--color-${accent})` }}
                  />
                </div>
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {group.items.map((item, j) => (
                    <motion.li
                      key={item}
                      initial={{ opacity: 0, scale: 0.85 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.15 + j * 0.03 }}
                      className="px-2 py-0.5 rounded-sm hairline font-mono text-[11.5px] text-ink bg-canvas/60"
                    >
                      {item}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>

        {/* Marquee ticker */}
        <div className="mt-14 overflow-hidden border-y border-line py-4 relative">
          <div className="marquee-track flex gap-12 whitespace-nowrap font-mono text-[12px] text-ink-dim">
            {[...Array(2)].map((_, round) => (
              <div key={round} className="flex gap-12 shrink-0">
                {skills.flatMap((g) => g.items).map((item, j) => (
                  <span key={`${round}-${j}`} className="inline-flex items-center gap-3">
                    <span className="size-1 rounded-full bg-cyan" />
                    {item}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
