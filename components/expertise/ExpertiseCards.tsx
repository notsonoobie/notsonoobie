"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Box, Layers, Sparkles, Cloud } from "lucide-react";
import { expertise } from "@/lib/data";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { MouseEvent } from "react";

const ICONS = {
  cube: Box,
  layers: Layers,
  spark: Sparkles,
  cloud: Cloud,
} as const;

export function ExpertiseCards() {
  return (
    <section id="expertise" aria-label="Core expertise" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <SectionHeader index="// 02" kicker="core expertise" title="Four axes of practice.">
          Each feeds the next — products need architecture, architecture needs cloud fluency, and the new cloud runs on intelligence.
        </SectionHeader>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {expertise.map((e, i) => (
            <TiltCard key={e.title} index={i}>
              <div className="flex flex-col gap-4 p-6 h-full">
                <div className="flex items-center justify-between">
                  <IconFor icon={e.icon} />
                  <span className="font-mono text-[10px] text-ink-faint">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="font-display text-lg font-semibold tracking-tight leading-snug">
                  {e.title}
                </h3>
                <p className="text-sm leading-relaxed text-ink-dim">{e.body}</p>
              </div>
            </TiltCard>
          ))}
        </div>
      </div>
    </section>
  );
}

function IconFor({ icon }: { icon: keyof typeof ICONS }) {
  const Icon = ICONS[icon];
  return (
    <div className="size-10 rounded-md hairline grid place-items-center bg-canvas text-cyan">
      <Icon className="size-4" strokeWidth={1.5} />
    </div>
  );
}

function TiltCard({ children, index }: { children: React.ReactNode; index: number }) {
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 150, damping: 18 });
  const sry = useSpring(ry, { stiffness: 150, damping: 18 });
  const transform = useTransform(
    [srx, sry],
    ([x, y]) => `perspective(1000px) rotateX(${x}deg) rotateY(${y}deg)`,
  );

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    ry.set(x * 8);
    rx.set(-y * 8);
  };
  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ transform, transformStyle: "preserve-3d" }}
      className="group relative rounded-xl bg-canvas-2/50 hairline hover:bg-canvas-2 transition-colors overflow-hidden"
    >
      {/* Corner bracket — inset slightly and thickened so it reads above the
          hairline edge instead of merging with it. */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-1.5 left-1.5 size-5 border-l-2 border-t-2 border-cyan/70 rounded-tl-md"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-1.5 right-1.5 size-5 border-r-2 border-b-2 border-cyan/70 group-hover:border-cyan rounded-br-md transition-colors"
      />
      <div className="relative">{children}</div>
    </motion.div>
  );
}
