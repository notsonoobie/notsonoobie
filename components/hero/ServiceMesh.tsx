"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

type Node = {
  id: number;
  x: number;
  y: number;
  r: number;
  ring: number;
  angle: number;
  accent: Accent;
  label?: string;
};

type Edge = { a: number; b: number; curved?: boolean };

type Accent = "cyan" | "amber" | "mint" | "violet" | "rose";

const ACCENTS: Record<Accent, string> = {
  cyan: "#00E5FF",
  amber: "#FFB340",
  mint: "#7CFFB2",
  violet: "#A78BFA",
  rose: "#FF7A9C",
};

const INNER_LABELS = [
  "api-gateway",
  "orchestrator",
  "event-bus",
  "llm-core",
  "vector-store",
  "iam",
];

const MID_LABELS = [
  "policy",
  "rag",
  "scheduler",
  "analytics",
  "observability",
  "mcp",
  "kafka",
  "redis",
  "postgres",
  "opensearch",
  "s3",
  "k8s",
];

/** Seeded PRNG so SSR == CSR */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function buildGraph(w: number, h: number, cx: number, cy: number) {
  const rand = seeded(424242);
  const R = Math.min(w, h) * 0.5;

  const nodes: Node[] = [];

  // 0 — core
  nodes.push({ id: 0, x: cx, y: cy, r: 7, ring: 0, angle: 0, accent: "cyan", label: "core" });

  // 1 — inner ring: 6 nodes
  const innerCount = 6;
  const innerR = R * 0.32;
  for (let i = 0; i < innerCount; i++) {
    const a = (i / innerCount) * Math.PI * 2 - Math.PI / 2;
    nodes.push({
      id: nodes.length,
      x: cx + Math.cos(a) * innerR,
      y: cy + Math.sin(a) * innerR,
      r: 5,
      ring: 1,
      angle: a,
      accent: i % 3 === 0 ? "cyan" : i % 3 === 1 ? "violet" : "amber",
      label: INNER_LABELS[i],
    });
  }

  // 2 — middle ring: 12 nodes (offset)
  const midCount = 12;
  const midR = R * 0.55;
  for (let i = 0; i < midCount; i++) {
    const a = (i / midCount) * Math.PI * 2 - Math.PI / 2 + Math.PI / midCount;
    const jitter = (rand() - 0.5) * 0.06;
    const rJit = midR + (rand() - 0.5) * 14;
    nodes.push({
      id: nodes.length,
      x: cx + Math.cos(a + jitter) * rJit,
      y: cy + Math.sin(a + jitter) * rJit,
      r: 3.4,
      ring: 2,
      angle: a + jitter,
      accent: (["cyan", "violet", "amber", "mint", "rose"] as Accent[])[i % 5],
      label: MID_LABELS[i],
    });
  }

  // 3 — outer ring: 10 dust nodes
  const outerCount = 10;
  const outerR = R * 0.82;
  for (let i = 0; i < outerCount; i++) {
    const a = (i / outerCount) * Math.PI * 2 + rand() * 0.4;
    const rJit = outerR + (rand() - 0.5) * 20;
    nodes.push({
      id: nodes.length,
      x: cx + Math.cos(a) * rJit,
      y: cy + Math.sin(a) * rJit,
      r: 1.8,
      ring: 3,
      angle: a,
      accent: rand() > 0.5 ? "cyan" : "mint",
    });
  }

  // Edges
  const edges: Edge[] = [];
  const ring1 = nodes.filter((n) => n.ring === 1);
  const ring2 = nodes.filter((n) => n.ring === 2);
  const ring3 = nodes.filter((n) => n.ring === 3);

  // core → inner (spokes)
  ring1.forEach((n) => edges.push({ a: 0, b: n.id }));

  // inner ↔ inner (ring connections)
  for (let i = 0; i < ring1.length; i++) {
    edges.push({ a: ring1[i].id, b: ring1[(i + 1) % ring1.length].id, curved: true });
  }

  // inner → two nearest mid
  ring1.forEach((n1) => {
    const sorted = ring2
      .map((n2) => ({ id: n2.id, d: dist(n1, n2) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
    sorted.forEach((s) => edges.push({ a: n1.id, b: s.id }));
  });

  // mid ↔ mid (selective)
  for (let i = 0; i < ring2.length; i++) {
    if (i % 2 === 0) {
      edges.push({ a: ring2[i].id, b: ring2[(i + 1) % ring2.length].id, curved: true });
    }
  }

  // mid → nearest outer
  ring2.slice(0, 10).forEach((n2, idx) => {
    const outer = ring3[idx % ring3.length];
    if (outer) edges.push({ a: n2.id, b: outer.id });
  });

  return { nodes, edges };
}

function dist(a: Node, b: Node) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Build a quadratic Bezier path from a to b curving away from center. */
function arcPath(a: Node, b: Node, cx: number, cy: number, bulge = 0.2) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  // vector from center to midpoint
  const dx = mx - cx;
  const dy = my - cy;
  const len = Math.hypot(dx, dy) || 1;
  const ox = (dx / len) * len * bulge;
  const oy = (dy / len) * len * bulge;
  return `M ${a.x} ${a.y} Q ${mx + ox} ${my + oy} ${b.x} ${b.y}`;
}

export function ServiceMesh() {
  const [size, setSize] = useState({ w: 1280, h: 820 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const cx = size.w / 2;
  const cy = size.h / 2;
  const R = Math.min(size.w, size.h) * 0.5;
  const { nodes, edges } = useMemo(
    () => buildGraph(size.w, size.h, cx, cy),
    [size.w, size.h, cx, cy],
  );

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      <motion.svg
        viewBox={`0 0 ${size.w} ${size.h}`}
        width={size.w}
        height={size.h}
        className="absolute inset-0"
        aria-hidden
      >
        <defs>
          {/* Node glows per accent */}
          {(Object.keys(ACCENTS) as Accent[]).map((k) => (
            <radialGradient id={`glow-${k}`} key={k} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={ACCENTS[k]} stopOpacity="1" />
              <stop offset="45%" stopColor={ACCENTS[k]} stopOpacity="0.35" />
              <stop offset="100%" stopColor={ACCENTS[k]} stopOpacity="0" />
            </radialGradient>
          ))}
          {/* Edge gradient for shimmer */}
          <linearGradient id="edge-shimmer" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#00E5FF" stopOpacity="0" />
            <stop offset="50%" stopColor="#00E5FF" stopOpacity="1" />
            <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
          </linearGradient>
          {/* Core gradient */}
          <radialGradient id="core-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="20%" stopColor="#7CF0FF" stopOpacity="1" />
            <stop offset="55%" stopColor="#00E5FF" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
          </radialGradient>
          <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
          {/* Clip each edge path so shimmer only shows along the line */}
        </defs>

        {/* Soft concentric orbit rings */}
        <g opacity={0.35}>
          {[0.32, 0.55, 0.82].map((frac, i) => (
            <motion.circle
              key={i}
              cx={cx}
              cy={cy}
              r={R * frac}
              fill="none"
              stroke="#1b1f2a"
              strokeWidth={1}
              strokeDasharray={i === 2 ? "2 6" : i === 1 ? "3 9" : "0"}
              initial={{ opacity: 0 }}
              animate={{ opacity: i === 0 ? 0.8 : 0.55 }}
              transition={{ delay: 0.3 + i * 0.2, duration: 1 }}
            />
          ))}
        </g>

        {/* Base static edges (faint) */}
        <g>
          {edges.map((e, i) => {
            const a = nodes[e.a];
            const b = nodes[e.b];
            if (!a || !b) return null;
            const d = e.curved ? arcPath(a, b, cx, cy, 0.18) : `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
            return (
              <motion.path
                key={i}
                d={d}
                fill="none"
                stroke="#1b1f2a"
                strokeWidth={1}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.9 }}
                transition={{ duration: 1.4, delay: 0.1 + i * 0.012, ease: "easeOut" }}
              />
            );
          })}
        </g>

        {/* Glowing highlight edges (a curated subset) */}
        <g>
          {edges.slice(0, 18).map((e, i) => {
            const a = nodes[e.a];
            const b = nodes[e.b];
            if (!a || !b) return null;
            const d = e.curved ? arcPath(a, b, cx, cy, 0.18) : `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
            return (
              <motion.path
                key={`h${i}`}
                d={d}
                fill="none"
                stroke={ACCENTS.cyan}
                strokeWidth={1.2}
                strokeOpacity={0.55}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.1, 0.75, 0.1] }}
                transition={{
                  duration: 3.6 + (i % 4) * 0.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.18,
                }}
              />
            );
          })}
        </g>

        {/* Shimmer streaks along edges */}
        <g>
          {edges.slice(0, 22).map((e, i) => {
            const a = nodes[e.a];
            const b = nodes[e.b];
            if (!a || !b) return null;
            const d = e.curved ? arcPath(a, b, cx, cy, 0.18) : `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
            const len = Math.hypot(b.x - a.x, b.y - a.y);
            const dashLen = Math.max(14, len * 0.12);
            return (
              <motion.path
                key={`s${i}`}
                d={d}
                fill="none"
                stroke="#00E5FF"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeDasharray={`${dashLen} ${len + dashLen}`}
                initial={{ strokeDashoffset: len + dashLen, opacity: 0 }}
                animate={{
                  strokeDashoffset: [len + dashLen, -dashLen],
                  opacity: [0, 0.85, 0],
                }}
                transition={{
                  duration: 2.8 + (i % 5) * 0.6,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.4 + i * 0.22,
                }}
                style={{ filter: "drop-shadow(0 0 6px #00E5FF)" }}
              />
            );
          })}
        </g>

        {/* Outer ring dust nodes */}
        <g>
          {nodes
            .filter((n) => n.ring === 3)
            .map((n) => (
              <motion.circle
                key={n.id}
                cx={n.x}
                cy={n.y}
                r={n.r}
                fill={ACCENTS[n.accent]}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.25, 1, 0.25] }}
                transition={{
                  duration: 2.6 + n.id * 0.05,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ))}
        </g>

        {/* Mid + inner nodes */}
        <g>
          {nodes
            .filter((n) => n.ring >= 1 && n.ring <= 2)
            .map((n) => (
              <g key={n.id}>
                <motion.circle
                  cx={n.x}
                  cy={n.y}
                  r={n.r + 16}
                  fill={`url(#glow-${n.accent})`}
                  opacity={0.55}
                  initial={{ scale: 0.4 }}
                  animate={{ scale: [0.85, 1.15, 0.85] }}
                  transition={{
                    duration: 3.4 + (n.id % 5) * 0.25,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{ transformOrigin: `${n.x}px ${n.y}px` }}
                />
                <motion.circle
                  cx={n.x}
                  cy={n.y}
                  r={n.r}
                  fill={ACCENTS[n.accent]}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 + n.ring * 0.15, duration: 0.6 }}
                  style={{ transformOrigin: `${n.x}px ${n.y}px` }}
                />
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={n.r + 3.2}
                  fill="none"
                  stroke={ACCENTS[n.accent]}
                  strokeOpacity={0.45}
                  strokeWidth={1}
                />
                {n.label && (
                  <motion.text
                    x={n.x}
                    y={n.y - n.r - 12}
                    textAnchor="middle"
                    fontFamily="var(--font-mono)"
                    fontSize={n.ring === 1 ? 10.5 : 9.5}
                    fontWeight={500}
                    fill={n.ring === 1 ? "#c9d2e3" : "#8a93a6"}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: n.ring === 1 ? 0.85 : 0.55 }}
                    transition={{ delay: 1.0 + n.ring * 0.1, duration: 0.8 }}
                  >
                    {n.label}
                  </motion.text>
                )}
              </g>
            ))}
        </g>

        {/* Activation cascade ping: periodically highlight a random inner node */}
        <g>
          {nodes
            .filter((n) => n.ring === 1)
            .map((n, i) => (
              <motion.circle
                key={`ping${n.id}`}
                cx={n.x}
                cy={n.y}
                fill="none"
                stroke={ACCENTS[n.accent]}
                strokeWidth={1.2}
                initial={{ r: n.r, opacity: 0 }}
                animate={{ r: [n.r, n.r + 28], opacity: [0.7, 0] }}
                transition={{
                  duration: 1.6,
                  repeat: Infinity,
                  repeatDelay: 5 + i * 0.9,
                  ease: "easeOut",
                }}
              />
            ))}
        </g>

        {/* The core — brightest */}
        <g>
          <motion.circle
            cx={cx}
            cy={cy}
            r={55}
            fill="url(#core-grad)"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: [0.95, 1.1, 0.95], opacity: [0.7, 0.95, 0.7] }}
            transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: `${cx}px ${cy}px`, filter: "url(#soft-glow)" }}
          />
          <motion.circle
            cx={cx}
            cy={cy}
            r={10}
            fill="#FFFFFF"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          />
          <motion.circle
            cx={cx}
            cy={cy}
            r={18}
            fill="none"
            stroke="#00E5FF"
            strokeOpacity={0.7}
            strokeWidth={1.2}
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.25, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />
        </g>

        {/* Travelling data packets along the first 10 edges */}
        <g>
          {edges.slice(0, 12).map((e, i) => {
            const a = nodes[e.a];
            const b = nodes[e.b];
            if (!a || !b) return null;
            return (
              <motion.circle
                key={`pk${i}`}
                r={2.8}
                fill="#FFFFFF"
                initial={{ cx: a.x, cy: a.y, opacity: 0 }}
                animate={{
                  cx: [a.x, b.x],
                  cy: [a.y, b.y],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 2.4 + (i % 4) * 0.6,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.35,
                }}
                style={{ filter: "drop-shadow(0 0 5px #00E5FF)" }}
              />
            );
          })}
        </g>
      </motion.svg>

      {/* Scan-line bars across the top and bottom for tech feel */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan/40 to-transparent"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-cyan/30 to-transparent"
      />

      {/* Corner brackets */}
      <div aria-hidden className="absolute top-4 left-4 size-6 border-l border-t border-cyan/40" />
      <div aria-hidden className="absolute top-4 right-4 size-6 border-r border-t border-cyan/40" />
      <div aria-hidden className="absolute bottom-4 left-4 size-6 border-l border-b border-cyan/40" />
      <div aria-hidden className="absolute bottom-4 right-4 size-6 border-r border-b border-cyan/40" />

    </div>
  );
}
