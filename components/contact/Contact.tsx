"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Mail, Phone, Download, FileText } from "lucide-react";
import { profile } from "@/lib/data";
import { SectionHeader } from "@/components/ui/SectionHeader";

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
            <p className="mt-2 text-sm text-ink-dim leading-relaxed">
              Complete work history, tech stack, and product portfolio — formatted for recruiters.
            </p>
            <a
              href={profile.resumePdf}
              download
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-md bg-cyan text-canvas font-medium text-sm py-2.5 px-4 hover:opacity-90 transition-opacity"
            >
              <Download className="size-4" strokeWidth={2} />
              Download PDF
            </a>
            <a
              href={profile.resumeDocx}
              download
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-md hairline text-sm py-2.5 px-4 text-ink-dim hover:text-ink hover:bg-canvas-2 transition-colors"
            >
              <FileText className="size-4" strokeWidth={1.5} />
              Download .docx
            </a>
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
