"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { experience } from "@/lib/data";
import { SectionHeader } from "@/components/ui/SectionHeader";

export function Timeline() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 70%", "end 40%"],
  });
  const fill = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section id="experience" aria-label="Professional experience" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <SectionHeader index="// 05" kicker="experience" title="Where the work shipped from." />

        <div ref={ref} className="relative mt-14 pl-8 md:pl-16">
          {/* Rail */}
          <div className="absolute left-3 md:left-6 top-0 bottom-0 w-px bg-line" />
          <motion.div
            className="absolute left-3 md:left-6 top-0 w-px bg-gradient-to-b from-cyan via-cyan/80 to-transparent"
            style={{ height: fill }}
          />

          <div className="space-y-14">
            {experience.map((role, i) => (
              <motion.div
                key={role.company}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.8, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="relative"
              >
                {/* Node */}
                <div className="absolute -left-[22px] md:-left-[46px] top-1.5 size-3.5 rounded-full bg-canvas hairline grid place-items-center">
                  <span className="size-1.5 rounded-full bg-cyan shadow-[0_0_12px_currentColor]" />
                </div>

                <div className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink-dim">
                  {role.period}
                </div>
                <h3 className="mt-2 font-display text-2xl md:text-3xl font-semibold tracking-[-0.01em]">
                  {role.company}
                </h3>
                <div className="text-cyan/90 mt-1 text-sm">{role.title}</div>
                <ul className="mt-4 space-y-2 max-w-2xl">
                  {role.highlights.map((h) => (
                    <li key={h} className="flex gap-3 text-ink/85 leading-relaxed">
                      <span className="text-cyan/70 font-mono text-[12px] mt-1">›</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
