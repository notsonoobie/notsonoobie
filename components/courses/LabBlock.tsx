"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Eye, EyeOff } from "lucide-react";
import type { LabState } from "@/lib/courses/types";
import { persistEpisodeState } from "@/lib/courses/state-client";

type Props = {
  episodeId: number;
  /** Pre-rendered (server) markdown for the lab's instructions. */
  instructions: ReactNode;
  /** Pre-rendered (server) markdown for each hint. Hint count drives the UI. */
  hints: ReactNode[];
  /** Pre-rendered (server) markdown for the optional solution. */
  solution: ReactNode | null;
  initiallyCompleted: boolean;
  /** Server-restored UI state — which hints opened, solution toggled. */
  initialState?: LabState | null;
  onComplete?: (result: { certificateId: string | null }) => void;
};

export function LabBlock({
  episodeId,
  instructions,
  hints,
  solution,
  initiallyCompleted,
  initialState,
  onComplete,
}: Props) {
  const router = useRouter();
  const [done, setDone] = useState(initiallyCompleted);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSolution, setShowSolution] = useState(
    initialState?.solutionOpen ?? false
  );
  const [openHints, setOpenHints] = useState<Set<number>>(
    () => new Set(initialState?.hintsOpen ?? [])
  );

  function persistLabState(nextHints: Set<number>, solutionOpen: boolean) {
    persistEpisodeState(episodeId, {
      labState: {
        hintsOpen: Array.from(nextHints).sort((a, b) => a - b),
        solutionOpen,
      },
    });
  }

  async function markDone() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/courses/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeId }),
      });
      const body = (await res.json()) as {
        ok: boolean;
        certificateId?: string;
        error?: string;
      };
      if (!body.ok) throw new Error(body.error ?? "save_failed");
      setDone(true);
      onComplete?.({ certificateId: body.certificateId ?? null });
      router.refresh();
    } catch (e) {
      console.error("[LabBlock] markDone", e);
      setError("Couldn't save completion. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {instructions}

      {hints.length > 0 && (
        <div className="space-y-2">
          <div className="font-mono text-[10.5px] text-ink-faint tracking-[0.25em] uppercase mb-1">
            {"// hints"}
          </div>
          {hints.map((hint, i) => {
            const isOpen = openHints.has(i);
            return (
              <div
                key={i}
                className="rounded-md hairline bg-canvas-2/40 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => {
                    setOpenHints((s) => {
                      const next = new Set(s);
                      if (next.has(i)) next.delete(i);
                      else next.add(i);
                      persistLabState(next, showSolution);
                      return next;
                    });
                  }}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-canvas-2/60 transition-colors"
                >
                  <span className="font-mono text-xs text-ink-dim">
                    hint {String(i + 1).padStart(2, "0")}
                  </span>
                  <ChevronDown
                    className={`size-4 text-ink-faint transition-transform ${isOpen ? "rotate-180" : ""}`}
                    strokeWidth={2}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-3 text-ink-dim text-[13px] leading-relaxed">
                    {hint}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {solution && (
        <div className="rounded-xl hairline bg-canvas-2/40 overflow-hidden">
          <button
            type="button"
            onClick={() => {
              setShowSolution((v) => {
                const next = !v;
                persistLabState(openHints, next);
                return next;
              });
            }}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-canvas-2/60 transition-colors"
          >
            <span className="inline-flex items-center gap-2 font-mono text-xs text-cyan tracking-[0.18em] uppercase">
              {showSolution ? (
                <EyeOff className="size-3.5" strokeWidth={2} />
              ) : (
                <Eye className="size-3.5" strokeWidth={2} />
              )}
              {showSolution ? "hide solution" : "reveal solution"}
            </span>
          </button>
          {showSolution && (
            <div className="px-5 pb-5 border-t border-line pt-4">
              {solution}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-md hairline bg-amber/10 border border-amber/30 px-3 py-2 text-amber text-[13px] font-mono">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end pt-2">
        {done ? (
          <span className="inline-flex items-center gap-2 rounded-md hairline bg-mint/10 border border-mint/30 text-mint text-sm font-medium h-10 px-5">
            <Check className="size-4" strokeWidth={2.5} />
            marked complete
          </span>
        ) : (
          <button
            type="button"
            onClick={markDone}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-md bg-cyan text-canvas text-sm font-medium h-10 px-5 hover:shadow-[0_0_24px_-4px_var(--color-cyan)] transition-all disabled:opacity-50"
          >
            {submitting ? "saving…" : "mark as done"}
          </button>
        )}
      </div>
    </div>
  );
}
