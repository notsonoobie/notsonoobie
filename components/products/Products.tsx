"use client";

import { motion } from "framer-motion";
import { products } from "@/lib/data";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ArchitectureDiagram } from "./ArchitectureDiagram";

const ACCENT_TEXT = {
  cyan: "text-cyan",
  amber: "text-amber",
  mint: "text-mint",
  violet: "text-violet",
  rose: "text-rose",
} as const;

const ACCENT_BG = {
  cyan: "bg-cyan",
  amber: "bg-amber",
  mint: "bg-mint",
  violet: "bg-violet",
  rose: "bg-rose",
} as const;

export function Products() {
  return (
    <section id="products" aria-labelledby="products-heading" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <div id="products-heading">
          <SectionHeader index="// 03" kicker="flagship products" title="Five products. One architect.">
            Each shipped zero-to-one with me as tech lead and founding architect. Adopted across BFSI and NBFC customers — and now, in several cases, being resold.
          </SectionHeader>
        </div>

        <div className="mt-16 md:mt-24 space-y-24 md:space-y-40">
          {products.map((p, i) => (
            <ProductPanel key={p.id} product={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductPanel({
  product,
  index,
}: {
  product: (typeof products)[number];
  index: number;
}) {
  const reversed = index % 2 === 1;
  const accentText = ACCENT_TEXT[product.accent];
  const accentBg = ACCENT_BG[product.accent];

  return (
    <article
      id={`product-${product.id}`}
      aria-labelledby={`product-heading-${product.id}`}
      className="relative"
    >
      {/* Giant numeral backdrop */}
      <div
        aria-hidden
        className={`absolute ${reversed ? "right-0 md:right-[-2%]" : "left-0 md:left-[-2%]"} -top-12 md:-top-20 font-display font-semibold leading-none select-none pointer-events-none text-[22vw] md:text-[14vw] text-ink-faint/10`}
      >
        {String(index + 1).padStart(2, "0")}
      </div>

      <div
        className={`relative grid grid-cols-1 gap-10 md:gap-16 items-center lg:grid-cols-[1.1fr_1fr] ${
          reversed ? "lg:[&>*:first-child]:order-2" : ""
        }`}
      >
        {/* Copy */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[11px] tracking-[0.18em] sm:tracking-[0.3em] uppercase text-ink-dim">
            <span className={`inline-block size-1.5 rounded-full ${accentBg} shadow-[0_0_10px_currentColor] ${accentText}`} />
            <span>{String(index + 1).padStart(2, "0")} / 05</span>
            <span className="hidden sm:inline-block h-px w-10 bg-line" />
            <span className={accentText}>{product.role}</span>
          </div>

          <h3
            id={`product-heading-${product.id}`}
            className="mt-5 font-display text-3xl md:text-4xl lg:text-5xl font-semibold leading-[1.05] tracking-[-0.02em]"
          >
            {product.name}
          </h3>

          <p className="mt-4 text-ink-dim text-lg md:text-xl leading-relaxed max-w-xl">
            {product.tagline}
          </p>

          <p className="mt-5 text-sm md:text-base leading-relaxed text-ink/85 max-w-xl">
            {product.lead}
          </p>

          <ul className="mt-6 space-y-2.5 max-w-xl">
            {product.highlights.map((h) => (
              <li key={h} className="flex gap-3 text-sm leading-relaxed text-ink/90">
                <span className={`mt-[9px] size-[5px] shrink-0 rounded-full ${accentBg}`} />
                <span>{h}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap gap-1.5">
            {product.tech.map((t) => (
              <span
                key={t}
                className="px-2 py-0.5 rounded-sm hairline font-mono text-[10.5px] text-ink-dim bg-canvas-2/60"
              >
                {t}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Architecture diagram */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.9, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          {/* Corner brackets */}
          <span className={`absolute -top-2 -left-2 size-5 border-l-2 border-t-2 ${accentText} border-current opacity-60`} />
          <span className={`absolute -bottom-2 -right-2 size-5 border-r-2 border-b-2 ${accentText} border-current opacity-60`} />

          <div className="relative rounded-2xl hairline bg-canvas-2/60 backdrop-blur-sm p-5 md:p-7 overflow-hidden">
            {/* subtle gradient tint */}
            <div
              aria-hidden
              className="absolute inset-0 opacity-25 pointer-events-none"
              style={{
                background: `radial-gradient(circle at 80% 10%, var(--color-${product.accent}) 0%, transparent 55%)`,
              }}
            />

            <div className="relative flex items-center justify-between mb-4 font-mono text-[10px] text-ink-faint">
              <span>architecture.svg</span>
              <span>· {product.id}</span>
            </div>
            <div className="relative">
              <ArchitectureDiagram product={product} />
            </div>
          </div>
        </motion.div>
      </div>
    </article>
  );
}
