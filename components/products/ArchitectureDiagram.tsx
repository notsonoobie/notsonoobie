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
  switch (product.variant) {
    case "api":
      return <ApiDiagram color={ACCENTS[product.accent]} id={product.id} />;
    case "agent":
      return <AgentDiagram color={ACCENTS[product.accent]} id={product.id} />;
    case "compliance":
      return <ComplianceDiagram color={ACCENTS[product.accent]} id={product.id} />;
    case "patch":
      return <PatchDiagram color={ACCENTS[product.accent]} id={product.id} />;
    case "aiops":
      return <AiopsDiagram color={ACCENTS[product.accent]} id={product.id} />;
    default:
      return null;
  }
}

/* ========================================================================= */
/*                            Shared primitives                               */
/* ========================================================================= */

const FS_HEADER = 13;
const FS_LABEL = 10;
const FS_SUB = 8.5;
const FS_NOTE = 9;
const FS_COL = 8.5;

/** Return the point on a circle perimeter along the vector from center toward (tx, ty). */
function portOnCircle(cx: number, cy: number, r: number, tx: number, ty: number) {
  const dx = tx - cx;
  const dy = ty - cy;
  const len = Math.hypot(dx, dy) || 1;
  return { x: cx + (dx / len) * r, y: cy + (dy / len) * r };
}

function Defs({ id, color }: { id: string; color: string }) {
  return (
    <defs>
      <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.18" />
        <stop offset="100%" stopColor={color} stopOpacity="0.02" />
      </linearGradient>
      <radialGradient id={`glow-${id}`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={color} stopOpacity="0.5" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`flow-${id}`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={color} stopOpacity="0" />
        <stop offset="50%" stopColor="#FFFFFF" stopOpacity="1" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient>
    </defs>
  );
}

function FlowPath({
  d,
  color,
  id,
  delay = 0,
  speed = 2.6,
  thick = false,
}: {
  d: string;
  color: string;
  id: string;
  delay?: number;
  speed?: number;
  thick?: boolean;
}) {
  return (
    <>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeOpacity={0.3}
        strokeWidth={thick ? 1.4 : 1}
      />
      <motion.path
        d={d}
        fill="none"
        stroke={`url(#flow-${id})`}
        strokeWidth={thick ? 2.4 : 1.6}
        strokeLinecap="round"
        strokeDasharray="20 220"
        initial={{ strokeDashoffset: 240 }}
        animate={{ strokeDashoffset: -20 }}
        transition={{ duration: speed, repeat: Infinity, ease: "linear", delay }}
      />
    </>
  );
}

function PortTab({ x, y, color, side }: { x: number; y: number; color: string; side: "left" | "right" }) {
  const w = 4;
  const h = 8;
  const rx = side === "right" ? x : x - w;
  return (
    <rect x={rx} y={y - h / 2} width={w} height={h} rx={1} fill={color} fillOpacity={0.7} />
  );
}

function ColLabel({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <text x={x} y={y} fontFamily="var(--font-mono)" fontSize={FS_COL} letterSpacing={1.6} fill="#4a5163">
      {text}
    </text>
  );
}

function Bracket({ x, y, w, h, color }: { x: number; y: number; w: number; h: number; color: string }) {
  const s = 7;
  return (
    <g stroke={color} strokeOpacity={0.55} strokeWidth={1} fill="none">
      <path d={`M${x} ${y + s} L${x} ${y} L${x + s} ${y}`} />
      <path d={`M${x + w - s} ${y} L${x + w} ${y} L${x + w} ${y + s}`} />
      <path d={`M${x + w} ${y + h - s} L${x + w} ${y + h} L${x + w - s} ${y + h}`} />
      <path d={`M${x + s} ${y + h} L${x} ${y + h} L${x} ${y + h - s}`} />
    </g>
  );
}

/**
 * A labeled card used as a row item in a column.
 * - Renders a dark rounded rect with an optional accent rail on one side
 * - Label on line 1, sub on line 2
 */
function RowCard({
  x,
  y,
  w,
  h,
  label,
  sub,
  color,
  rail,
  delay = 0,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub?: string;
  color: string;
  rail: "left" | "right" | "none";
  delay?: number;
}) {
  const railX = rail === "left" ? x + 4 : rail === "right" ? x + w - 6.5 : 0;
  const textX = rail === "right" ? x + 10 : x + 14;
  const textRightX = rail === "right" ? x + w - 14 : x + w - 8;
  const baseY = sub ? y + h / 2 - 2 : y + h / 2 + 3.6;
  return (
    <motion.g
      initial={{ opacity: 0, y: 4 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-15%" }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <rect x={x} y={y} width={w} height={h} rx={6} fill="#0d0f15" stroke="#242a38" strokeWidth={1} />
      {rail !== "none" && (
        <rect x={railX} y={y + 5} width={2.5} height={h - 10} rx={1} fill={color} opacity={0.75} />
      )}
      <text
        x={textX}
        y={baseY}
        fontFamily="var(--font-mono)"
        fontSize={FS_LABEL}
        fontWeight={600}
        fill="#e6e9ef"
      >
        {label}
      </text>
      {sub && (
        <text
          x={textX}
          y={y + h / 2 + 11}
          fontFamily="var(--font-mono)"
          fontSize={FS_SUB}
          fill="#8a93a6"
        >
          {sub}
        </text>
      )}
      {/* invisible right bound guard so `textRightX` isn't a dead import */}
      <rect x={textRightX} y={y} width={0} height={0} />
    </motion.g>
  );
}

/* ========================================================================= */
/*                           Atlas API Manager                                */
/* ========================================================================= */

function ApiDiagram({ color, id }: { color: string; id: string }) {
  const VB = { w: 520, h: 340 };

  // Column specs
  const CL_X = 30, CL_W = 110;
  const GW_X = 176, GW_W = 168;
  const BE_X = 380, BE_W = 110;

  // Shared row y-centers for clients and backends (match vertically)
  const ROW_H = 44;
  const ROW_YS = [72, 168, 264]; // centers

  const clients = [
    { label: "web", sub: "browser", y: ROW_YS[0] - ROW_H / 2 },
    { label: "mobile", sub: "ios · android", y: ROW_YS[1] - ROW_H / 2 },
    { label: "server", sub: "service → service", y: ROW_YS[2] - ROW_H / 2 },
  ];
  const backends = [
    { label: "monolith", sub: "legacy", y: ROW_YS[0] - ROW_H / 2 },
    { label: "microservices", sub: "internal", y: ROW_YS[1] - ROW_H / 2 },
    { label: "database", sub: "system-of-record", y: ROW_YS[2] - ROW_H / 2 },
  ];

  // Gateway body
  const GW_TOP = 46;
  const GW_BOTTOM = 294;
  const GW_H = GW_BOTTOM - GW_TOP;

  // Pipeline rows — centered vertically
  const PIPE_ROWS = 6;
  const PIPE_H = 22;
  const PIPE_STRIDE = 28;
  const PIPE_START = 94; // so that the block fits between header at y=86 and footer at y=272
  const pipeline = [
    "auth · oidc",
    "rate limit",
    "transform",
    "cache",
    "analytics",
    "monetize",
  ];

  return (
    <svg
      viewBox={`0 0 ${VB.w} ${VB.h}`}
      className="w-full h-auto"
      role="img"
      aria-label="Atlas API Manager architecture"
    >
      <Defs id={id} color={color} />

      <ColLabel x={CL_X} y={28} text="CLIENTS" />
      <ColLabel x={GW_X + 6} y={28} text="API GATEWAY · 25+ POLICIES" />
      <ColLabel x={BE_X} y={28} text="BACKENDS" />

      {/* Clients */}
      {clients.map((c, i) => (
        <RowCard
          key={c.label}
          x={CL_X}
          y={c.y}
          w={CL_W}
          h={ROW_H}
          label={c.label}
          sub={c.sub}
          color={color}
          rail="left"
          delay={0.04 * i}
        />
      ))}

      {/* Gateway body */}
      <g>
        <rect
          x={GW_X}
          y={GW_TOP}
          width={GW_W}
          height={GW_H}
          rx={12}
          fill={`url(#fill-${id})`}
          stroke={color}
          strokeOpacity={0.65}
          strokeWidth={1.2}
        />
        <text
          x={GW_X + GW_W / 2}
          y={64}
          textAnchor="middle"
          fontFamily="var(--font-display)"
          fontWeight={700}
          fontSize={FS_HEADER}
          fill="#e6e9ef"
        >
          atlas::gateway
        </text>
        <text
          x={GW_X + GW_W / 2}
          y={80}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize={FS_SUB}
          fill="#8a93a6"
        >
          multi-cloud · DC · bare-metal
        </text>

        {/* Policy chain */}
        {pipeline.map((label, i) => {
          const y = PIPE_START + i * PIPE_STRIDE;
          return (
            <motion.g
              key={label}
              initial={{ opacity: 0, x: -4 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-15%" }}
              transition={{ duration: 0.45, delay: 0.3 + i * 0.07 }}
            >
              <rect
                x={GW_X + 14}
                y={y}
                width={GW_W - 28}
                height={PIPE_H}
                rx={4}
                fill="#0a0b0f"
                stroke={color}
                strokeOpacity={0.35}
              />
              <circle cx={GW_X + 26} cy={y + PIPE_H / 2} r={2.4} fill={color} />
              <text
                x={GW_X + 38}
                y={y + PIPE_H / 2 + 3.4}
                fontFamily="var(--font-mono)"
                fontSize={FS_LABEL}
                fill="#c9d2e3"
              >
                {label}
              </text>
              <text
                x={GW_X + GW_W - 20}
                y={y + PIPE_H / 2 + 3.4}
                textAnchor="end"
                fontFamily="var(--font-mono)"
                fontSize={FS_SUB}
                fill="#4a5163"
              >
                ok
              </text>
            </motion.g>
          );
        })}

        {/* Pulsing streak across the pipeline */}
        <motion.rect
          x={GW_X + 16}
          y={PIPE_START}
          width={GW_W - 32}
          height={PIPE_H}
          rx={3}
          fill={color}
          fillOpacity={0.12}
          initial={{ y: PIPE_START }}
          animate={{ y: [PIPE_START, PIPE_START + (PIPE_ROWS - 1) * PIPE_STRIDE] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
        />

        <text
          x={GW_X + GW_W / 2}
          y={278}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize={FS_NOTE}
          fill={color}
        >
          SSO · OIDC · SAML · LDAP
        </text>
      </g>

      {/* Backends */}
      {backends.map((b, i) => (
        <RowCard
          key={b.label}
          x={BE_X}
          y={b.y}
          w={BE_W}
          h={ROW_H}
          label={b.label}
          sub={b.sub}
          color={color}
          rail="right"
          delay={0.15 + i * 0.05}
        />
      ))}

      {/* Port tabs on gateway edges at each row y */}
      {ROW_YS.map((py, i) => (
        <g key={`ports${i}`}>
          <PortTab x={GW_X} y={py} color={color} side="left" />
          <PortTab x={GW_X + GW_W} y={py} color={color} side="right" />
        </g>
      ))}

      {/* Distinct flows per row — each enters/exits at its own y (no funnel) */}
      {ROW_YS.map((py, i) => (
        <FlowPath
          key={`in${i}`}
          id={id}
          color={color}
          d={`M${CL_X + CL_W} ${py} C ${CL_X + CL_W + 26} ${py} ${GW_X - 26} ${py} ${GW_X} ${py}`}
          delay={i * 0.22}
          speed={2.6}
        />
      ))}
      {ROW_YS.map((py, i) => (
        <FlowPath
          key={`out${i}`}
          id={id}
          color={color}
          d={`M${GW_X + GW_W} ${py} C ${GW_X + GW_W + 26} ${py} ${BE_X - 26} ${py} ${BE_X} ${py}`}
          delay={0.3 + i * 0.22}
          speed={2.6}
        />
      ))}
    </svg>
  );
}

/* ========================================================================= */
/*                         Atlas AI Agent Studio                              */
/* ========================================================================= */

function AgentDiagram({ color, id }: { color: string; id: string }) {
  const VB = { w: 520, h: 340 };
  const cx = 260;
  const cy = 172;
  const CORE_R = 44;

  // Shared row y-centers on both sides (5 rows each)
  const ROW_YS = [60, 116, 172, 228, 284];
  const ROW_H = 40;

  const LEFT_X = 32;
  const LEFT_W = 120;
  const RIGHT_X = 368;
  const RIGHT_W = 120;

  const leftCol = [
    { label: "prompt mgr", sub: "templates" },
    { label: "tools", sub: "built-in" },
    { label: "mcp", sub: "servers" },
    { label: "memory", sub: "short · long" },
    { label: "vectors", sub: "6 stores" },
  ];
  const rightCol = [
    { label: "anthropic", sub: "claude" },
    { label: "openai", sub: "gpt" },
    { label: "bedrock", sub: "aws hosted" },
    { label: "gemini", sub: "google" },
    { label: "ollama", sub: "local" },
  ];

  return (
    <svg
      viewBox={`0 0 ${VB.w} ${VB.h}`}
      className="w-full h-auto"
      role="img"
      aria-label="Atlas AI Agent Studio architecture"
    >
      <Defs id={id} color={color} />

      <ColLabel x={LEFT_X} y={28} text="INPUTS · MEMORY" />
      <ColLabel x={cx - 22} y={28} text="AGENT" />
      <ColLabel x={RIGHT_X} y={28} text="PROVIDERS" />

      {/* Core glow + dashed rings (kept tight so they don't bleed into columns) */}
      <circle cx={cx} cy={cy} r={60} fill={`url(#glow-${id})`} opacity={0.55} />
      <circle cx={cx} cy={cy} r={56} fill="none" stroke={color} strokeOpacity={0.18} strokeDasharray="2 7" />

      {/* Core agent node */}
      <motion.g
        initial={{ scale: 0.72, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        <circle cx={cx} cy={cy} r={CORE_R} fill={`url(#fill-${id})`} stroke={color} strokeWidth={1.4} />
        <text
          x={cx}
          y={cy - 3}
          textAnchor="middle"
          fontFamily="var(--font-display)"
          fontWeight={700}
          fontSize={14}
          fill="#ffffff"
        >
          agent
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize={FS_SUB}
          fill="#c9d2e3"
        >
          reason · act
        </text>
      </motion.g>
      <motion.circle
        cx={cx}
        cy={cy}
        r={CORE_R + 4}
        fill="none"
        stroke={color}
        strokeWidth={1.2}
        animate={{ r: [CORE_R + 4, CORE_R + 18], opacity: [0.6, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut" }}
      />

      {/* Left column: inputs/memory */}
      {leftCol.map((l, i) => {
        const cy_ = ROW_YS[i];
        return (
          <RowCard
            key={l.label}
            x={LEFT_X}
            y={cy_ - ROW_H / 2}
            w={LEFT_W}
            h={ROW_H}
            label={l.label}
            sub={l.sub}
            color={color}
            rail="left"
            delay={0.12 + i * 0.06}
          />
        );
      })}

      {/* Right column: providers */}
      {rightCol.map((r, i) => {
        const cy_ = ROW_YS[i];
        return (
          <RowCard
            key={r.label}
            x={RIGHT_X}
            y={cy_ - ROW_H / 2}
            w={RIGHT_W}
            h={ROW_H}
            label={r.label}
            sub={r.sub}
            color={color}
            rail="right"
            delay={0.2 + i * 0.06}
          />
        );
      })}

      {/* Flows — each to/from its own port on the agent perimeter */}
      {leftCol.map((_, i) => {
        const startX = LEFT_X + LEFT_W;
        const startY = ROW_YS[i];
        const p = portOnCircle(cx, cy, CORE_R, startX, startY);
        const midX = (startX + p.x) / 2;
        const d = `M${startX} ${startY} C ${midX} ${startY} ${midX} ${p.y} ${p.x} ${p.y}`;
        return <FlowPath key={`lf${i}`} id={id} color={color} d={d} delay={0.3 + i * 0.12} speed={2.8} />;
      })}
      {rightCol.map((_, i) => {
        const endX = RIGHT_X;
        const endY = ROW_YS[i];
        const p = portOnCircle(cx, cy, CORE_R, endX, endY);
        const midX = (p.x + endX) / 2;
        const d = `M${p.x} ${p.y} C ${midX} ${p.y} ${midX} ${endY} ${endX} ${endY}`;
        return <FlowPath key={`rf${i}`} id={id} color={color} d={d} delay={0.4 + i * 0.12} speed={2.8} />;
      })}

      {/* Bottom: horizontal row of meta-capabilities */}
      <g>
        {[
          { label: "guardrails", x: 40 },
          { label: "evaluator", x: 148 },
          { label: "HITL", x: 256 },
          { label: "audit log", x: 364 },
        ].map((e, i) => (
          <motion.g
            key={e.label}
            initial={{ opacity: 0, y: 4 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.55 + i * 0.07 }}
          >
            <rect x={e.x} y={318} width={108} height={16} rx={4} fill="#0a0b0f" stroke={color} strokeOpacity={0.4} />
            <text
              x={e.x + 54}
              y={329}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize={FS_SUB}
              fill="#c9d2e3"
            >
              {e.label}
            </text>
          </motion.g>
        ))}
      </g>
    </svg>
  );
}

/* ========================================================================= */
/*                       IT Compliance Manager                                */
/* ========================================================================= */

function ComplianceDiagram({ color, id }: { color: string; id: string }) {
  const VB = { w: 520, h: 340 };

  // Equal rows on both sides sharing the same y-centers
  const ROW_YS = [68, 112, 156, 200, 244];
  const SRC_X = 32;
  const SRC_W = 124;
  const OUT_X = 372;
  const OUT_W = 124;

  const sources = [
    { label: "hosts" },
    { label: "configs" },
    { label: "audits" },
    { label: "RBI feeds" },
    { label: "network · SIEM" },
  ];
  const outs = [
    { label: "CXO dashboard" },
    { label: "report · pdf" },
    { label: "alerts" },
    { label: "playbook · ansible" },
    { label: "copilot" },
  ];

  const ENG_X = 176;
  const ENG_W = 168;
  const ENG_TOP = 50;
  const ENG_BOTTOM = 284;
  const ENG_H = ENG_BOTTOM - ENG_TOP;

  // Engine ladder rows aligned to ROW_YS
  const LADDER_LABELS = [
    "ingest · parse",
    "validate · map",
    "evaluate · rule",
    "remediate · playx",
    "report · alert",
  ];

  return (
    <svg
      viewBox={`0 0 ${VB.w} ${VB.h}`}
      className="w-full h-auto"
      role="img"
      aria-label="IT Compliance Manager architecture"
    >
      <Defs id={id} color={color} />

      <ColLabel x={SRC_X} y={28} text="SOURCES" />
      <ColLabel x={ENG_X + 14} y={28} text="COMPLIANCE ENGINE" />
      <ColLabel x={OUT_X} y={28} text="OUTCOMES" />

      {/* Source lane */}
      {sources.map((s, i) => (
        <motion.g
          key={s.label}
          initial={{ opacity: 0, x: -4 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: i * 0.05 }}
        >
          <rect
            x={SRC_X}
            y={ROW_YS[i] - 11}
            width={SRC_W}
            height={22}
            rx={4}
            fill="#0d0f15"
            stroke="#1b1f2a"
          />
          <rect x={SRC_X + 4} y={ROW_YS[i] - 7} width={2.5} height={14} rx={1} fill={color} opacity={0.75} />
          <text x={SRC_X + 14} y={ROW_YS[i] + 3.5} fontFamily="var(--font-mono)" fontSize={FS_LABEL} fill="#c9d2e3">
            {s.label}
          </text>
        </motion.g>
      ))}

      {/* Engine body */}
      <g>
        <rect
          x={ENG_X}
          y={ENG_TOP}
          width={ENG_W}
          height={ENG_H}
          rx={10}
          fill={`url(#fill-${id})`}
          stroke={color}
          strokeOpacity={0.55}
        />

        {/* Ladder rows aligned to ROW_YS */}
        {LADDER_LABELS.map((label, i) => {
          const y = ROW_YS[i] - 11;
          return (
            <motion.g
              key={label}
              initial={{ opacity: 0, y: 4 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.25 + i * 0.07 }}
            >
              <rect
                x={ENG_X + 14}
                y={y}
                width={ENG_W - 28}
                height={22}
                rx={4}
                fill="#0a0b0f"
                stroke={color}
                strokeOpacity={0.4}
              />
              <circle cx={ENG_X + 26} cy={y + 11} r={2.4} fill={color} />
              <text
                x={ENG_X + 38}
                y={y + 14.5}
                fontFamily="var(--font-mono)"
                fontSize={FS_LABEL}
                fill="#c9d2e3"
              >
                {label}
              </text>
            </motion.g>
          );
        })}

        <text
          x={ENG_X + ENG_W / 2}
          y={270}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize={FS_NOTE}
          fill={color}
        >
          status · passing
        </text>
      </g>

      {/* Outcome lane */}
      {outs.map((o, i) => (
        <motion.g
          key={o.label}
          initial={{ opacity: 0, x: 4 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.3 + i * 0.05 }}
        >
          <rect x={OUT_X} y={ROW_YS[i] - 11} width={OUT_W} height={22} rx={4} fill="#0d0f15" stroke="#1b1f2a" />
          <rect x={OUT_X + OUT_W - 6.5} y={ROW_YS[i] - 7} width={2.5} height={14} rx={1} fill={color} opacity={0.75} />
          <text
            x={OUT_X + 10}
            y={ROW_YS[i] + 3.5}
            fontFamily="var(--font-mono)"
            fontSize={FS_LABEL}
            fill="#c9d2e3"
          >
            {o.label}
          </text>
        </motion.g>
      ))}

      {/* Ports on engine edges at each row y */}
      {ROW_YS.map((py, i) => (
        <g key={`eports${i}`}>
          <PortTab x={ENG_X} y={py} color={color} side="left" />
          <PortTab x={ENG_X + ENG_W} y={py} color={color} side="right" />
        </g>
      ))}

      {/* Flows — one per row, no funnel */}
      {ROW_YS.map((py, i) => (
        <FlowPath
          key={`isf${i}`}
          id={id}
          color={color}
          d={`M${SRC_X + SRC_W} ${py} C ${SRC_X + SRC_W + 14} ${py} ${ENG_X - 14} ${py} ${ENG_X} ${py}`}
          delay={i * 0.16}
          speed={2.8}
        />
      ))}
      {ROW_YS.map((py, i) => (
        <FlowPath
          key={`osf${i}`}
          id={id}
          color={color}
          d={`M${ENG_X + ENG_W} ${py} C ${ENG_X + ENG_W + 14} ${py} ${OUT_X - 14} ${py} ${OUT_X} ${py}`}
          delay={0.3 + i * 0.16}
          speed={2.8}
        />
      ))}

      {/* Footer note */}
      <text
        x={260}
        y={314}
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize={FS_NOTE}
        fill="#4a5163"
      >
        built for one of India&apos;s largest private-sector banks
      </text>
    </svg>
  );
}

/* ========================================================================= */
/*                         Patch Command Center                               */
/* ========================================================================= */

function PatchDiagram({ color, id }: { color: string; id: string }) {
  const VB = { w: 520, h: 340 };
  const cx = 260;
  const cy = 162;
  const CORE_R = 42;

  // Quadrants — boxes are wide + flat, placed far enough to leave a breathing ring around core
  const BOX_W = 148;
  const BOX_H = 82;
  const quads = [
    { label: "middleware", sub: "tomcat · weblogic · jboss", bx: 24, by: 46 },
    { label: "database", sub: "oracle · pg · mysql", bx: 348, by: 46 },
    { label: "os", sub: "rhel · ubuntu · win", bx: 24, by: 196 },
    { label: "network", sub: "cisco · arista · palo alto", bx: 348, by: 196 },
  ];

  // Cell grid inside box — centered under the label
  const CELL = 10;
  const GAP = 3;
  const COLS = 11;
  const ROWS = 3;
  const GRID_W = COLS * CELL + (COLS - 1) * GAP;
  const gridOffsetX = (BOX_W - GRID_W) / 2; // centers grid in box
  const GRID_Y_OFFSET = 20; // below the top label band

  return (
    <svg
      viewBox={`0 0 ${VB.w} ${VB.h}`}
      className="w-full h-auto"
      role="img"
      aria-label="Patch Command Center architecture"
    >
      <Defs id={id} color={color} />

      {/* Core */}
      <circle cx={cx} cy={cy} r={66} fill={`url(#glow-${id})`} opacity={0.45} />
      <circle
        cx={cx}
        cy={cy}
        r={54}
        fill="none"
        stroke={color}
        strokeOpacity={0.18}
        strokeDasharray="2 7"
      />
      {/* Pulsing ring — clipped to stay inside orbit, won't overlap quadrant boxes */}
      <motion.circle
        cx={cx}
        cy={cy}
        r={CORE_R + 6}
        fill="none"
        stroke={color}
        strokeWidth={1}
        animate={{ r: [CORE_R + 6, CORE_R + 42], opacity: [0.55, 0] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeOut" }}
      />
      <circle cx={cx} cy={cy} r={CORE_R} fill={`url(#fill-${id})`} stroke={color} strokeOpacity={0.7} strokeWidth={1.2} />
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontWeight={700}
        fontSize={FS_HEADER}
        fill="#e6e9ef"
      >
        orchestrator
      </text>
      <text
        x={cx}
        y={cy + 11}
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize={FS_SUB}
        fill="#c9d2e3"
      >
        agentless
      </text>

      {/* Quadrants */}
      {quads.map((q, i) => {
        const boxX = q.bx;
        const boxY = q.by;
        const gridOriginX = boxX + gridOffsetX;
        const gridOriginY = boxY + GRID_Y_OFFSET;
        const gridCenterX = boxX + BOX_W / 2;
        const gridCenterY = gridOriginY + (ROWS * CELL + (ROWS - 1) * GAP) / 2;

        // Compute port on core edge pointing at this quadrant's grid center
        const port = portOnCircle(cx, cy, CORE_R, gridCenterX, gridCenterY);

        return (
          <g key={q.label}>
            {/* Connector line: from core edge to the box edge nearest the core */}
            <FlowPath
              id={id}
              color={color}
              d={`M${port.x} ${port.y} L ${gridCenterX} ${gridCenterY}`}
              delay={0.3 + i * 0.12}
              speed={2.8}
              thick
            />

            {/* Quadrant box */}
            <motion.g
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-15%" }}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.08 }}
            >
              <rect x={boxX} y={boxY} width={BOX_W} height={BOX_H} rx={8} fill="#0d0f15" stroke="#1b1f2a" />

              {/* Label row */}
              <text
                x={boxX + 10}
                y={boxY + 14}
                fontFamily="var(--font-mono)"
                fontSize={FS_LABEL}
                fontWeight={600}
                fill={color}
              >
                {q.label}
              </text>

              {/* Server grid */}
              {Array.from({ length: COLS * ROWS }).map((_, k) => {
                const col = k % COLS;
                const row = Math.floor(k / COLS);
                const sx = gridOriginX + col * (CELL + GAP);
                const sy = gridOriginY + row * (CELL + GAP);
                return (
                  <motion.rect
                    key={k}
                    x={sx}
                    y={sy}
                    width={CELL}
                    height={CELL}
                    rx={1.5}
                    fill={color}
                    fillOpacity={0.16 + (k % 5) * 0.08}
                    stroke={color}
                    strokeOpacity={0.3}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: 0.3 + i * 0.05 + k * 0.008 }}
                  />
                );
              })}

              {/* Sub-label INSIDE box, under grid */}
              <text
                x={boxX + BOX_W / 2}
                y={boxY + BOX_H - 10}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                fontSize={FS_SUB}
                fill="#8a93a6"
              >
                {q.sub}
              </text>
            </motion.g>
          </g>
        );
      })}

      {/* Metric banner */}
      <g>
        <rect x={180} y={302} width={160} height={26} rx={5} fill="#0a0b0f" stroke={color} strokeOpacity={0.55} />
        <text
          x={260}
          y={319}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize={FS_LABEL + 0.5}
          fontWeight={600}
          fill={color}
        >
          17,000+ servers / month
        </text>
      </g>
    </svg>
  );
}

/* ========================================================================= */
/*                             Atlas AIOps                                    */
/* ========================================================================= */

function AiopsDiagram({ color, id }: { color: string; id: string }) {
  const VB = { w: 520, h: 340 };

  // Shared row y-centers for signals, pods, actions (3 rows each)
  const ROW_YS = [80, 156, 232];
  const ROW_H = 52;

  const SIG_X = 32;
  const SIG_W = 140;
  const POD_X = 200;
  const POD_W = 120;
  const ACT_X = 348;
  const ACT_W = 140;

  const signals = [
    { label: "alerts", sub: "pagerduty · servicenow" },
    { label: "telemetry", sub: "metrics · dynatrace" },
    { label: "logs", sub: "splunk · elastic" },
  ];
  const actions = [
    { label: "remediate", sub: "k8s · aws · azure" },
    { label: "runbook", sub: "200+ templates" },
    { label: "notify", sub: "slack · teams · itsm" },
  ];

  return (
    <svg
      viewBox={`0 0 ${VB.w} ${VB.h}`}
      className="w-full h-auto"
      role="img"
      aria-label="Atlas AIOps architecture"
    >
      <Defs id={id} color={color} />

      <ColLabel x={SIG_X} y={28} text="SIGNALS" />
      <ColLabel x={POD_X + 14} y={28} text="AGENT SWARM" />
      <ColLabel x={ACT_X} y={28} text="ACTIONS" />

      {/* Bracket around the swarm */}
      <Bracket x={POD_X - 8} y={54} w={POD_W + 16} h={ROW_YS[2] - ROW_YS[0] + ROW_H + 8} color={color} />

      {/* Signals */}
      {signals.map((s, i) => (
        <RowCard
          key={s.label}
          x={SIG_X}
          y={ROW_YS[i] - ROW_H / 2}
          w={SIG_W}
          h={ROW_H}
          label={s.label}
          sub={s.sub}
          color={color}
          rail="left"
          delay={i * 0.07}
        />
      ))}

      {/* Agent pods (accent fill) */}
      {ROW_YS.map((py, i) => (
        <motion.g
          key={`pod${i}`}
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.2 + i * 0.1 }}
          style={{ transformOrigin: `${POD_X + POD_W / 2}px ${py}px` }}
        >
          <rect
            x={POD_X}
            y={py - ROW_H / 2}
            width={POD_W}
            height={ROW_H}
            rx={8}
            fill={`url(#fill-${id})`}
            stroke={color}
            strokeOpacity={0.55}
          />
          <circle cx={POD_X + 18} cy={py} r={10} fill="#0a0b0f" stroke={color} strokeOpacity={0.7} strokeWidth={1.2} />
          <circle cx={POD_X + 18} cy={py} r={3.2} fill={color} />
          <text
            x={POD_X + 34}
            y={py - 3}
            fontFamily="var(--font-mono)"
            fontSize={FS_LABEL}
            fontWeight={600}
            fill="#e6e9ef"
          >
            agent {i + 1}
          </text>
          <text
            x={POD_X + 34}
            y={py + 9}
            fontFamily="var(--font-mono)"
            fontSize={FS_SUB}
            fill="#8a93a6"
          >
            reason · act · verify
          </text>
          <motion.rect
            x={POD_X + 34}
            y={py + 14}
            width={72}
            height={2}
            rx={1}
            fill={color}
            fillOpacity={0.55}
            animate={{ scaleX: [0.2, 1, 0.2] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.3 }}
            style={{ transformOrigin: `${POD_X + 34}px ${py + 15}px` }}
          />
        </motion.g>
      ))}

      {/* Actions */}
      {actions.map((a, i) => (
        <RowCard
          key={a.label}
          x={ACT_X}
          y={ROW_YS[i] - ROW_H / 2}
          w={ACT_W}
          h={ROW_H}
          label={a.label}
          sub={a.sub}
          color={color}
          rail="right"
          delay={0.25 + i * 0.07}
        />
      ))}

      {/* Flows — one per row aligned to pod y (no funnel) */}
      {ROW_YS.map((py, i) => (
        <FlowPath
          key={`sf${i}`}
          id={id}
          color={color}
          d={`M${SIG_X + SIG_W} ${py} C ${SIG_X + SIG_W + 18} ${py} ${POD_X - 18} ${py} ${POD_X} ${py}`}
          delay={i * 0.18}
          speed={2.8}
        />
      ))}
      {ROW_YS.map((py, i) => (
        <FlowPath
          key={`af${i}`}
          id={id}
          color={color}
          d={`M${POD_X + POD_W} ${py} C ${POD_X + POD_W + 18} ${py} ${ACT_X - 18} ${py} ${ACT_X} ${py}`}
          delay={0.3 + i * 0.18}
          speed={2.8}
        />
      ))}

      {/* HITL pill */}
      <g>
        <rect x={220} y={286} width={80} height={22} rx={4} fill="#0a0b0f" stroke={color} strokeOpacity={0.45} />
        <text
          x={260}
          y={300}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize={FS_LABEL}
          fill="#c9d2e3"
        >
          HITL checkpoint
        </text>
      </g>

      {/* Footer metrics */}
      <text
        x={260}
        y={326}
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize={FS_NOTE}
        fill={color}
      >
        70% MTTR ↓ · 90% toil ↓ · 200+ templates
      </text>
    </svg>
  );
}
