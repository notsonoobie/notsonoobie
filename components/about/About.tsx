"use client";

import { motion } from "framer-motion";
import { profile } from "@/lib/data";
import { SectionHeader } from "@/components/ui/SectionHeader";

const KEYWORDS = [
  "distributed",
  "event-driven",
  "AWS",
  "Oracle Cloud",
  "Tech lead",
  "enterprise-grade",
  "BFSI",
  "NBFC",
  "API management",
  "agentic AI",
  "IT compliance",
  "patching",
  "AIOps",
  "cloud-native",
  "microservices",
  "LLM-powered",
];

function highlight(text: string) {
  const parts: { text: string; keyword: boolean }[] = [];
  const sorted = [...KEYWORDS].sort((a, b) => b.length - a.length);
  const escaped = sorted.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const pattern = new RegExp(`(${escaped})`, "gi");
  let cursor = 0;
  for (const m of text.matchAll(pattern)) {
    const i = m.index ?? 0;
    if (i > cursor) parts.push({ text: text.slice(cursor, i), keyword: false });
    parts.push({ text: m[0], keyword: true });
    cursor = i + m[0].length;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), keyword: false });
  return parts;
}

export function About() {
  const parts = highlight(profile.summary);
  return (
    <section id="about" aria-label="About Rahul Gupta" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <SectionHeader index="// 01" kicker="profile" title="A summary, not a script." />

        <div className="mt-12 grid md:grid-cols-[1fr_360px] gap-10 md:gap-20">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="text-[clamp(1.1rem,1.6vw,1.4rem)] leading-[1.7] text-ink/90"
          >
            {parts.map((p, i) =>
              p.keyword ? (
                <span
                  key={i}
                  className="relative inline-block text-cyan/90 hover:text-cyan transition-colors"
                >
                  {p.text}
                </span>
              ) : (
                <span key={i}>{p.text}</span>
              ),
            )}
          </motion.p>

          <motion.aside
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9, delay: 0.15 }}
            className="font-mono text-[12px] text-ink-dim space-y-4 rounded-md hairline bg-canvas-2/50 backdrop-blur p-6"
          >
            <Row k="role" v="Senior Software Engineer" />
            <Row k="title" v="Tech Lead" />
            <Row k="focus" v="Systems × Intelligence" />
            <Row k="location" v={profile.location} />
            <Row k="available" v={profile.availability} />
            <Row k="primary-cloud" v="AWS · OCI" />
            <Row k="primary-lang" v="TypeScript · Node" />
          </motion.aside>
        </div>
      </div>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start gap-4">
      <span className="text-ink-faint w-24 shrink-0">{k}</span>
      <span className="text-ink">{v}</span>
    </div>
  );
}
