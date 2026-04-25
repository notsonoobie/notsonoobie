import {
  Beaker,
  BookOpen,
  Code2,
  HelpCircle,
  ImageIcon,
  Layers,
  Library,
  ShieldCheck,
  TextCursorInput,
} from "lucide-react";
import type { EpisodeKind } from "@/lib/courses/types";

// Each entry pairs the foreground colour with a matching tinted bg so
// the badge reads as a status pill (cyan-on-cyan, mint-on-mint, …) the
// way other status chips in the system do. Keeping the tint subtle
// (10%) keeps the dark canvas feel — the colour is a hint, not a fill.
const CONFIG: Record<
  EpisodeKind,
  { label: string; icon: typeof BookOpen; tone: string }
> = {
  lesson: {
    label: "lesson",
    icon: BookOpen,
    tone: "text-cyan border-cyan/40 bg-cyan/10",
  },
  quiz: {
    label: "quiz",
    icon: HelpCircle,
    tone: "text-amber border-amber/40 bg-amber/10",
  },
  lab: {
    label: "lab",
    icon: Beaker,
    tone: "text-mint border-mint/40 bg-mint/10",
  },
  visual: {
    label: "visual",
    icon: ImageIcon,
    tone: "text-violet border-violet/40 bg-violet/10",
  },
  code: {
    label: "code",
    icon: Code2,
    tone: "text-cyan border-cyan/40 bg-cyan/10",
  },
  fill: {
    label: "fill in",
    icon: TextCursorInput,
    tone: "text-amber border-amber/40 bg-amber/10",
  },
  flashcards: {
    label: "flashcards",
    icon: Layers,
    tone: "text-mint border-mint/40 bg-mint/10",
  },
  resources: {
    label: "resources",
    icon: Library,
    tone: "text-cyan border-cyan/40 bg-cyan/10",
  },
  exam: {
    label: "exam",
    icon: ShieldCheck,
    tone: "text-rose border-rose/40 bg-rose/10",
  },
};

export function EpisodeKindBadge({ kind }: { kind: EpisodeKind }) {
  const cfg = CONFIG[kind];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[10px] tracking-[0.18em] uppercase ${cfg.tone}`}
    >
      <Icon className="size-3" strokeWidth={2} />
      {cfg.label}
    </span>
  );
}
