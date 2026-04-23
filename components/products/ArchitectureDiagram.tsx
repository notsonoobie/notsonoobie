"use client";

import { motion } from "framer-motion";
import type { Product } from "@/lib/data";

const ACCENTS = {
  cyan: "#00E5FF",
  amber: "#FFB340",
  mint: "#7CFFB2",
  violet: "#A78BFA",
  rose: "#FF7A9C",
} as const;

type Props = { product: Product };

export function ArchitectureDiagram({ product }: Props) {
  const color = ACCENTS[product.accent];
  const id = product.id;
  switch (product.variant) {
    case "api":
      return <ApiDiagram color={color} id={id} />;
    case "agent":
      return <AgentDiagram color={color} id={id} />;
    case "compliance":
      return <ComplianceDiagram color={color} id={id} />;
    case "patch":
      return <PatchDiagram color={color} id={id} />;
    case "aiops":
      return <AiopsDiagram color={color} id={id} />;
    default:
      return null;
  }
}

/* ---------------------- shared defs ---------------------- */

function Defs({ id, color }: { id: string; color: string }) {
  return (
    <defs>
      <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.32" />
        <stop offset="100%" stopColor={color} stopOpacity="0.02" />
      </linearGradient>
      <radialGradient id={`glow-${id}`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={color} stopOpacity="0.7" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`stream-${id}`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={color} stopOpacity="0" />
        <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient>
    </defs>
  );
}

function CornerFrame({ color }: { color: string }) {
  return (
    <g stroke={color} strokeOpacity={0.35} strokeWidth={1} fill="none">
      <path d="M8 20 L8 8 L20 8" />
      <path d="M492 8 L504 8 L504 20" />
      <path d="M504 300 L504 312 L492 312" />
      <path d="M20 312 L8 312 L8 300" />
    </g>
  );
}

/* ========================================================================= */
/*                   1 · Atlas API Manager — Light streams                    */
/* ========================================================================= */

function ApiDiagram({ color, id }: { color: string; id: string }) {
  const W = 512;
  const H = 320;
  const cx = W / 2;
  const cy = H / 2;
  const GW_W = 180;
  const GW_H = 90;
  const GW_X = cx - GW_W / 2;
  const GW_Y = cy - GW_H / 2;

  const streams = [
    { y: cy - 60, delay: 0 },
    { y: cy - 30, delay: 0.3 },
    { y: cy, delay: 0.6 },
    { y: cy + 30, delay: 0.9 },
    { y: cy + 60, delay: 1.2 },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Atlas API Manager architecture">
      <Defs id={id} color={color} />
      <CornerFrame color={color} />

      {/* Ambient glow behind gateway */}
      <circle cx={cx} cy={cy} r={120} fill={`url(#glow-${id})`} opacity={0.6} />

      {/* Streams passing through */}
      {streams.map((s, i) => (
        <g key={i}>
          <line x1={40} y1={s.y} x2={W - 40} y2={s.y} stroke={color} strokeOpacity={0.15} />
          <motion.line
            x1={40}
            y1={s.y}
            x2={W - 40}
            y2={s.y}
            stroke={`url(#stream-${id})`}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeDasharray="60 500"
            initial={{ strokeDashoffset: 560 }}
            animate={{ strokeDashoffset: -60 }}
            transition={{ duration: 2.4 + i * 0.1, repeat: Infinity, ease: "linear", delay: s.delay }}
          />
        </g>
      ))}

      {/* Gateway core — the hero element */}
      <motion.g
        initial={{ opacity: 0, scale: 0.92 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      >
        <rect
          x={GW_X}
          y={GW_Y}
          width={GW_W}
          height={GW_H}
          rx={16}
          fill="#0a0b0f"
          stroke={color}
          strokeWidth={1.5}
        />
        <rect
          x={GW_X - 1}
          y={GW_Y - 1}
          width={GW_W + 2}
          height={GW_H + 2}
          rx={17}
          fill="none"
          stroke={color}
          strokeOpacity={0.25}
          strokeWidth={4}
        />
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          fontFamily="var(--font-display)"
          fontWeight={700}
          fontSize={22}
          letterSpacing={4}
          fill="#ffffff"
        >
          GATEWAY
        </text>
        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize={10}
          letterSpacing={2}
          fill={color}
        >
          25+ POLICIES · MULTI-CLOUD
        </text>
      </motion.g>

      {/* Endpoint labels */}
      <g fontFamily="var(--font-mono)" fontSize={10} letterSpacing={2} fill="#8a93a6">
        <text x={40} y={38}>CLIENTS →</text>
        <text x={W - 40} y={38} textAnchor="end">→ BACKENDS</text>
      </g>

      {/* Bottom metric */}
      <g>
        <text
          x={cx}
          y={H - 22}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize={10}
          letterSpacing={2}
          fill="#8a93a6"
        >
          15M+ API CALLS / DAY
        </text>
      </g>
    </svg>
  );
}

/* ========================================================================= */
/*                   2 · Atlas AI Agent Studio — Core orbit                   */
/* ========================================================================= */

function AgentDiagram({ color, id }: { color: string; id: string }) {
  const W = 512;
  const H = 320;
  const cx = W / 2;
  // Shift the orbit up slightly so the bottom-most satellite label ("memory")
  // leaves breathing room above the footer caption.
  const cy = H / 2 - 4;
  const R = 40;

  const satellites = [
    { label: "anthropic", angle: -150 },
    { label: "openai", angle: -105 },
    { label: "bedrock", angle: -60 },
    { label: "gemini", angle: -15 },
    { label: "tools", angle: 45 },
    { label: "memory", angle: 90 },
    { label: "vectors", angle: 135 },
    { label: "mcp", angle: -195 },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Atlas AI Agent Studio architecture">
      <Defs id={id} color={color} />
      <CornerFrame color={color} />

      {/* Deep glow */}
      <circle cx={cx} cy={cy} r={110} fill={`url(#glow-${id})`} opacity={0.55} />

      {/* Dashed orbit */}
      <circle cx={cx} cy={cy} r={100} fill="none" stroke={color} strokeOpacity={0.25} strokeDasharray="2 8" />

      {/* Pulsing outer ring */}
      <motion.circle
        cx={cx}
        cy={cy}
        r={R + 6}
        fill="none"
        stroke={color}
        strokeWidth={1.2}
        animate={{ r: [R + 6, R + 60], opacity: [0.7, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeOut" }}
      />

      {/* Satellites */}
      {satellites.map((s, i) => {
        const rad = (s.angle * Math.PI) / 180;
        const sx = cx + Math.cos(rad) * 100;
        const sy = cy + Math.sin(rad) * 100;
        const labelOff = 16;
        // Label offset based on angle
        const lx = cx + Math.cos(rad) * (100 + labelOff);
        const ly = cy + Math.sin(rad) * (100 + labelOff);
        const anchor = Math.cos(rad) > 0.3 ? "start" : Math.cos(rad) < -0.3 ? "end" : "middle";
        return (
          <motion.g
            key={s.label}
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.25 + i * 0.06 }}
          >
            <line x1={cx} y1={cy} x2={sx} y2={sy} stroke={color} strokeOpacity={0.2} />
            <motion.line
              x1={cx}
              y1={cy}
              x2={sx}
              y2={sy}
              stroke={`url(#stream-${id})`}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeDasharray="18 140"
              initial={{ strokeDashoffset: 158 }}
              animate={{ strokeDashoffset: -18 }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "linear", delay: i * 0.25 }}
            />
            <circle cx={sx} cy={sy} r={9} fill="#0a0b0f" stroke={color} strokeWidth={1.2} />
            <circle cx={sx} cy={sy} r={3} fill={color} />
            <text
              x={lx}
              y={ly + 3}
              textAnchor={anchor}
              fontFamily="var(--font-mono)"
              fontSize={9.5}
              fill="#c9d2e3"
            >
              {s.label}
            </text>
          </motion.g>
        );
      })}

      {/* Core */}
      <motion.g
        initial={{ opacity: 0, scale: 0.75 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <circle cx={cx} cy={cy} r={R} fill={`url(#fill-${id})`} stroke={color} strokeWidth={1.4} />
        <text
          x={cx}
          y={cy + 2}
          textAnchor="middle"
          fontFamily="var(--font-display)"
          fontWeight={700}
          fontSize={18}
          letterSpacing={2}
          fill="#ffffff"
        >
          AGENT
        </text>
        <text
          x={cx}
          y={cy + 20}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize={8.5}
          fill={color}
        >
          reason · act
        </text>
      </motion.g>

      {/* Footer */}
      <text
        x={cx}
        y={H - 12}
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize={10}
        letterSpacing={2}
        fill="#8a93a6"
      >
        8 PROVIDERS · 6 VECTOR STORES
      </text>
    </svg>
  );
}

/* ========================================================================= */
/*                 3 · IT Compliance Manager — Shield                         */
/* ========================================================================= */

function ComplianceDiagram({ color, id }: { color: string; id: string }) {
  const W = 512;
  const H = 320;
  const cx = W / 2;
  const cy = H / 2 - 4;

  const checks = [
    { y: cy - 40, delay: 0.3 },
    { y: cy - 14, delay: 0.6 },
    { y: cy + 12, delay: 0.9 },
    { y: cy + 38, delay: 1.2 },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="IT Compliance Manager architecture">
      <Defs id={id} color={color} />
      <CornerFrame color={color} />

      {/* Background glow */}
      <circle cx={cx} cy={cy} r={120} fill={`url(#glow-${id})`} opacity={0.5} />

      {/* Shield shape (hexagonal) */}
      <motion.g
        initial={{ opacity: 0, scale: 0.85 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      >
        <path
          d={`M ${cx} ${cy - 80} L ${cx + 70} ${cy - 40} L ${cx + 70} ${cy + 40} L ${cx} ${cy + 88} L ${cx - 70} ${cy + 40} L ${cx - 70} ${cy - 40} Z`}
          fill={`url(#fill-${id})`}
          stroke={color}
          strokeWidth={1.6}
        />
        <path
          d={`M ${cx} ${cy - 80} L ${cx + 70} ${cy - 40} L ${cx + 70} ${cy + 40} L ${cx} ${cy + 88} L ${cx - 70} ${cy + 40} L ${cx - 70} ${cy - 40} Z`}
          fill="none"
          stroke={color}
          strokeOpacity={0.25}
          strokeWidth={5}
        />
      </motion.g>

      {/* Check items inside shield */}
      {checks.map((c, i) => (
        <motion.g
          key={i}
          initial={{ opacity: 0, x: -8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: c.delay }}
        >
          {/* Checkmark */}
          <circle cx={cx - 34} cy={c.y} r={6} fill={color} />
          <path
            d={`M ${cx - 38} ${c.y} l 3 3 l 6 -6`}
            stroke="#0a0b0f"
            strokeWidth={1.6}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Line */}
          <line x1={cx - 22} y1={c.y} x2={cx + 50} y2={c.y} stroke={color} strokeOpacity={0.4} strokeWidth={1} />
          <motion.circle
            cx={cx + 50}
            cy={c.y}
            r={2}
            fill={color}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: c.delay }}
          />
        </motion.g>
      ))}

      {/* Top header "COMPLIANT" */}
      <motion.text
        x={cx}
        y={cy - 50}
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontWeight={700}
        fontSize={16}
        letterSpacing={3}
        fill="#ffffff"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4, duration: 0.8 }}
      >
        COMPLIANT
      </motion.text>

      {/* Top + bottom corners */}
      <g fontFamily="var(--font-mono)" fontSize={10} letterSpacing={2} fill="#8a93a6">
        <text x={40} y={38}>FEEDS →</text>
        <text x={W - 40} y={38} textAnchor="end">→ REPORTS</text>
      </g>

      <text
        x={cx}
        y={H - 22}
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize={10}
        letterSpacing={2}
        fill={color}
      >
        RBI CYBER KRIs · AUTOMATED
      </text>
    </svg>
  );
}

/* ========================================================================= */
/*               4 · Patch Command Center — Server grid sweep                 */
/* ========================================================================= */

function PatchDiagram({ color, id }: { color: string; id: string }) {
  const W = 512;
  const H = 320;

  // Large dense server grid
  const COLS = 36;
  const ROWS = 10;
  const CELL = 8;
  const GAP = 3;
  const GRID_W = COLS * CELL + (COLS - 1) * GAP;
  const GRID_H = ROWS * CELL + (ROWS - 1) * GAP;
  const GRID_X = (W - GRID_W) / 2;
  const GRID_Y = 70;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Patch Command Center architecture">
      <Defs id={id} color={color} />
      <CornerFrame color={color} />

      {/* Top header */}
      <g>
        <text
          x={W / 2}
          y={44}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize={10}
          letterSpacing={3}
          fill="#8a93a6"
        >
          FLEET · AGENTLESS PATCHING
        </text>
      </g>

      {/* Server grid */}
      <g>
        {Array.from({ length: COLS * ROWS }).map((_, k) => {
          const col = k % COLS;
          const row = Math.floor(k / COLS);
          const x = GRID_X + col * (CELL + GAP);
          const y = GRID_Y + row * (CELL + GAP);
          return (
            <motion.rect
              key={k}
              x={x}
              y={y}
              width={CELL}
              height={CELL}
              rx={1.5}
              fill={color}
              fillOpacity={0.18}
              stroke={color}
              strokeOpacity={0.3}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.2, delay: 0.2 + col * 0.006 + row * 0.02 }}
            />
          );
        })}

        {/* Patch wave — diagonal sweep */}
        {Array.from({ length: COLS }).map((_, col) => (
          <motion.rect
            key={`wave${col}`}
            x={GRID_X + col * (CELL + GAP)}
            y={GRID_Y}
            width={CELL}
            height={GRID_H}
            rx={1.5}
            fill={color}
            fillOpacity={0}
            animate={{ fillOpacity: [0, 0.9, 0] }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              delay: col * 0.06,
              ease: "easeInOut",
            }}
          />
        ))}
      </g>

      {/* Big metric display */}
      <motion.g
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        <text
          x={W / 2}
          y={H - 50}
          textAnchor="middle"
          fontFamily="var(--font-display)"
          fontWeight={700}
          fontSize={44}
          letterSpacing={-1}
          fill="#ffffff"
        >
          17K+
        </text>
        <text
          x={W / 2}
          y={H - 22}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize={10}
          letterSpacing={2}
          fill={color}
        >
          SERVERS · PATCHED · MONTHLY
        </text>
      </motion.g>
    </svg>
  );
}

/* ========================================================================= */
/*                      5 · Atlas AIOps — Linear flow                         */
/* ========================================================================= */

function AiopsDiagram({ color, id }: { color: string; id: string }) {
  const W = 512;
  const H = 320;
  const cy = H / 2;
  const SIG_X = 72;
  const CORE_CX = W / 2;
  const ACT_X = W - 72;
  const NODE_R = 28;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Atlas AIOps architecture">
      <Defs id={id} color={color} />
      <CornerFrame color={color} />

      {/* Background glow behind core */}
      <circle cx={CORE_CX} cy={cy} r={110} fill={`url(#glow-${id})`} opacity={0.55} />

      {/* Connection spine */}
      <line x1={SIG_X} y1={cy} x2={ACT_X} y2={cy} stroke={color} strokeOpacity={0.18} strokeWidth={1} />

      {/* Stream along the spine */}
      <motion.line
        x1={SIG_X}
        y1={cy}
        x2={ACT_X}
        y2={cy}
        stroke={`url(#stream-${id})`}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeDasharray="40 400"
        initial={{ strokeDashoffset: 440 }}
        animate={{ strokeDashoffset: -40 }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
      />

      {/* Signal node (left) */}
      <g>
        <circle cx={SIG_X} cy={cy} r={NODE_R} fill="#0a0b0f" stroke={color} strokeWidth={1.4} />
        <circle cx={SIG_X} cy={cy} r={4} fill={color} />
        <motion.circle
          cx={SIG_X}
          cy={cy}
          r={NODE_R + 4}
          fill="none"
          stroke={color}
          strokeWidth={1.2}
          animate={{ r: [NODE_R + 4, NODE_R + 18], opacity: [0.6, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
        />
        <text
          x={SIG_X}
          y={cy + NODE_R + 22}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize={11}
          fontWeight={600}
          letterSpacing={2}
          fill="#e6e9ef"
        >
          SIGNAL
        </text>
        <text
          x={SIG_X}
          y={cy + NODE_R + 38}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize={8.5}
          fill="#8a93a6"
        >
          pagerduty · splunk
        </text>
      </g>

      {/* Core agent */}
      <motion.g
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      >
        <circle cx={CORE_CX} cy={cy} r={54} fill={`url(#fill-${id})`} stroke={color} strokeWidth={1.6} />
        <circle cx={CORE_CX} cy={cy} r={54 + 4} fill="none" stroke={color} strokeOpacity={0.25} strokeWidth={4} />

        {/* 3 orbiting dots */}
        {[0, 1, 2].map((i) => (
          <motion.circle
            key={i}
            cx={CORE_CX}
            cy={cy - 42}
            r={2.8}
            fill={color}
            animate={{ rotate: 360 }}
            transition={{ duration: 6 + i * 2, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: `${CORE_CX}px ${cy}px` }}
            transform={`rotate(${i * 120} ${CORE_CX} ${cy})`}
          />
        ))}

        <text
          x={CORE_CX}
          y={cy - 4}
          textAnchor="middle"
          fontFamily="var(--font-display)"
          fontWeight={700}
          fontSize={16}
          letterSpacing={2}
          fill="#ffffff"
        >
          AGENT
        </text>
        <text
          x={CORE_CX}
          y={cy + 14}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize={9}
          letterSpacing={1}
          fill={color}
        >
          reason · act
        </text>
      </motion.g>

      {/* Action node (right) */}
      <g>
        <circle cx={ACT_X} cy={cy} r={NODE_R} fill="#0a0b0f" stroke={color} strokeWidth={1.4} />
        <path
          d={`M ${ACT_X - 7} ${cy} L ${ACT_X + 2} ${cy - 7} L ${ACT_X + 2} ${cy + 7} Z`}
          fill={color}
        />
        <text
          x={ACT_X}
          y={cy + NODE_R + 22}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize={11}
          fontWeight={600}
          letterSpacing={2}
          fill="#e6e9ef"
        >
          ACTION
        </text>
        <text
          x={ACT_X}
          y={cy + NODE_R + 38}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize={8.5}
          fill="#8a93a6"
        >
          k8s · servicenow
        </text>
      </g>

      {/* Top label */}
      <g>
        <text
          x={W / 2}
          y={44}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize={10}
          letterSpacing={3}
          fill="#8a93a6"
        >
          AUTONOMOUS RUNBOOKS · 200+ TEMPLATES
        </text>
      </g>

      {/* Bottom metric */}
      <text
        x={W / 2}
        y={H - 22}
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize={10}
        letterSpacing={2}
        fill={color}
      >
        70% MTTR ↓ · 90% TOIL ↓
      </text>
    </svg>
  );
}
