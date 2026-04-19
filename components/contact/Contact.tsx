"use client";

import { SectionHeader } from "@/components/ui/SectionHeader";
import { profile } from "@/lib/data";
import { motion } from "framer-motion";
import { ArrowUpRight, Download, Mail, Phone } from "lucide-react";

function LinkedinIcon({ className, strokeWidth = 1.5 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function GithubIcon({ className, strokeWidth = 1.5 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

export function Contact() {
  return (
    <section id="contact" aria-label="Contact information" className="relative py-24 md:py-32 border-t border-line bg-canvas-2/40">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <SectionHeader index="// 06" kicker="contact" title="Open to the right problem.">
          Based in Mumbai. Comfortable with WFO, WFH, or Hybrid. Warmest hellos to the teams building BFSI-scale products and agentic AI platforms.
        </SectionHeader>

        <div className="mt-14 grid lg:grid-cols-[1fr_380px] gap-10 lg:gap-20">
          {/* Links grid */}
          <div className="grid sm:grid-cols-2 gap-3">
            {/* Primary CTA — Cal.com booking, spans full width */}
            <motion.a
              href={profile.cal}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6 }}
              className="group relative sm:col-span-2 rounded-xl border border-cyan/40 bg-canvas/60 hover:border-cyan/70 transition-all overflow-hidden"
            >
              {/* Atmospheric glow blob, intensifies on hover */}
              <div
                aria-hidden
                className="absolute -top-24 -right-24 size-72 rounded-full opacity-40 group-hover:opacity-70 transition-opacity duration-500 pointer-events-none blur-3xl"
                style={{
                  background:
                    "radial-gradient(circle, color-mix(in oklab, var(--color-cyan) 60%, transparent) 0%, transparent 65%)",
                }}
              />
              {/* Diagonal cyan tint */}
              <div
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(135deg, color-mix(in oklab, var(--color-cyan) 7%, transparent) 0%, transparent 55%)",
                }}
              />
              {/* Corner brackets */}
              <span aria-hidden className="absolute top-0 left-0 size-4 border-l border-t border-cyan/60 rounded-tl-xl pointer-events-none" />
              <span aria-hidden className="absolute bottom-0 right-0 size-4 border-r border-b border-cyan/60 rounded-br-xl pointer-events-none" />

              <div className="relative flex items-stretch gap-5 p-5 md:p-6">
                {/* Calendar-page tile */}
                <motion.div
                  initial={{ scale: 0.92, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="relative shrink-0 w-20 h-24 rounded-lg border border-cyan/50 bg-canvas-2 flex flex-col items-center justify-center overflow-hidden"
                >
                  {/* Calendar-page top binding strip */}
                  <span aria-hidden className="absolute top-0 inset-x-0 h-2.5 bg-cyan/80" />
                  <span aria-hidden className="absolute top-1 left-3 w-1 h-1 rounded-full bg-canvas" />
                  <span aria-hidden className="absolute top-1 right-3 w-1 h-1 rounded-full bg-canvas" />
                  <span className="mt-3 font-display text-[2.1rem] font-bold text-cyan leading-none tabular-nums">
                    15
                  </span>
                  <span className="font-mono text-[9px] tracking-[0.3em] text-ink-dim mt-1">
                    MIN
                  </span>
                </motion.div>

                {/* Content column */}
                <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.2em] uppercase">
                      <span className="relative flex size-1.5">
                        <span className="absolute inset-0 size-1.5 rounded-full bg-mint animate-ping opacity-75" />
                        <span className="relative size-1.5 rounded-full bg-mint shadow-[0_0_8px_currentColor]" />
                      </span>
                      <span className="text-mint">available</span>
                      <span className="text-ink-faint">· IST</span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-3 flex-wrap">
                      <span className="font-display text-xl md:text-2xl font-semibold text-ink leading-tight">
                        Let&apos;s talk.
                      </span>
                      <span className="text-ink-dim text-[12px] font-mono">cal.com / 15min</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10.5px]">
                    {["Hiring", "Consultation", "Agentic AI"].map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-sm border border-cyan/30 text-cyan/85 bg-cyan/[0.04]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Round CTA */}
                <div className="hidden sm:flex items-center shrink-0">
                  <div className="size-11 rounded-full border border-cyan/50 grid place-items-center text-cyan group-hover:bg-cyan group-hover:text-canvas group-hover:border-cyan group-hover:shadow-[0_0_24px_-2px_var(--color-cyan)] transition-all duration-300">
                    <ArrowUpRight
                      className="size-4 group-hover:rotate-45 transition-transform duration-300"
                      strokeWidth={2}
                    />
                  </div>
                </div>
              </div>
            </motion.a>

            <ContactLink href={`mailto:${profile.email}`} icon={Mail} label="email" value={profile.email} />
            <ContactLink href={`tel:${profile.phone.replace(/\s+/g, "")}`} icon={Phone} label="phone" value={profile.phone} />
            <ContactLink href={profile.linkedin} icon={LinkedinIcon} label="linkedin" value="/in/rahul-gupta-6a5967188" external />
            <ContactLink href={profile.github} icon={GithubIcon} label="github" value="@notsonoobie" external />
          </div>

          {/* Resume card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8 }}
            className="rounded-xl hairline bg-canvas p-6 flex flex-col"
          >
            <div className="flex items-center justify-between font-mono text-[11px] text-ink-dim">
              <span>resume/</span>
              <span className="text-cyan">v6y · pdf</span>
            </div>
            <h3 className="mt-3 font-display text-xl font-semibold">Full resume</h3>

            {/* Mini document preview */}
            <div
              aria-hidden
              className="mt-4 rounded-md hairline bg-canvas-2/70 p-4 space-y-1.5"
            >
              <div className="h-[3px] w-3/5 bg-cyan/60 rounded-full" />
              <div className="h-[3px] w-2/5 bg-cyan/25 rounded-full" />
              <div className="h-px w-full bg-line my-2" />
              <div className="h-[3px] w-full bg-line rounded-full" />
              <div className="h-[3px] w-11/12 bg-line rounded-full" />
              <div className="h-[3px] w-3/4 bg-line rounded-full" />
              <div className="h-[3px] w-4/5 bg-line rounded-full" />
              <div className="h-px w-full bg-line my-2" />
              <div className="h-[3px] w-2/3 bg-line rounded-full" />
              <div className="h-[3px] w-1/2 bg-line rounded-full" />
            </div>

            {/* Flexible spacer so downloads anchor to the bottom when card is stretched */}
            <div className="flex-1 min-h-[1rem]" />

            {/* Download options */}
            <div className="mt-0">
              <a
                href={profile.resumePdf}
                download
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-cyan text-canvas font-medium text-sm py-2.5 px-4 hover:opacity-90 transition-opacity"
              >
                <Download className="size-4" strokeWidth={2} />
                Download PDF
              </a>
            </div>

            {/* Footer meta */}
            <div className="mt-4 pt-4 border-t border-line flex items-center justify-between font-mono text-[10px] tracking-[0.15em] uppercase text-ink-faint">
              <span>last updated · apr 2026</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1 rounded-full bg-mint shadow-[0_0_6px_currentColor]" />
                current
              </span>
            </div>
          </motion.div>
        </div>

        {/* Big signature line */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="mt-20"
        >
          <a
            href={`mailto:${profile.email}`}
            className="group block"
          >
            <div className="font-mono text-[11px] tracking-[0.3em] uppercase text-ink-dim mb-4">
              let&apos;s build →
            </div>
            <div className="font-display text-[clamp(2.5rem,8vw,7rem)] leading-[0.95] tracking-[-0.03em] font-semibold flex items-baseline gap-4 flex-wrap">
              <span className="group-hover:text-cyan transition-colors duration-300">
                say hello
              </span>
              <ArrowUpRight className="size-12 md:size-20 text-cyan/70 group-hover:rotate-45 transition-transform duration-300" strokeWidth={1} />
            </div>
          </a>
        </motion.div>
      </div>
    </section>
  );
}

function ContactLink({
  href,
  icon: Icon,
  label,
  value,
  external = false,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  external?: boolean;
}) {
  return (
    <motion.a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6 }}
      className="group relative rounded-xl hairline bg-canvas/50 p-5 flex items-center gap-4 hover:bg-canvas transition-colors"
    >
      <div className="size-10 rounded-md hairline grid place-items-center text-cyan group-hover:bg-canvas-2 transition-colors">
        <Icon className="size-4" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-mono text-[10.5px] tracking-[0.2em] uppercase text-ink-faint">
          {label}
        </div>
        <div className="mt-0.5 text-ink truncate">{value}</div>
      </div>
      <ArrowUpRight className="size-4 text-ink-dim group-hover:text-cyan group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" strokeWidth={1.5} />
    </motion.a>
  );
}
