"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, RotateCcw, X } from "lucide-react";
import type { QuizState } from "@/lib/courses/types";
import { persistEpisodeState } from "@/lib/courses/state-client";

export type RenderedQuizQuestion = {
  /** Pre-rendered (server) markdown for the question prompt. */
  question: ReactNode;
  /** Pre-rendered (server) markdown for each option. */
  options: ReactNode[];
  /** Pre-rendered (server) markdown for the post-submit explanation. */
  explanation: ReactNode | null;
  /** Single index for radio-style questions; array for "select all that
   * apply". Used purely for scoring — not rendered. */
  correct: number | number[];
};

type Props = {
  episodeId: number;
  questions: RenderedQuizQuestion[];
  initiallyCompleted: boolean;
  initialScore: number | null;
  /** Server-restored quiz state — picks + submitted + score. */
  initialState?: QuizState | null;
  onComplete?: (result: { score: number; certificateId: string | null }) => void;
};

function picksFromState(s: QuizState | null | undefined): Record<number, Set<number>> {
  if (!s) return {};
  const out: Record<number, Set<number>> = {};
  for (const [k, v] of Object.entries(s.picks ?? {})) {
    out[Number(k)] = new Set(v as number[]);
  }
  return out;
}

function picksToJson(picks: Record<number, Set<number>>): Record<number, number[]> {
  const out: Record<number, number[]> = {};
  for (const [k, v] of Object.entries(picks)) {
    out[Number(k)] = Array.from(v);
  }
  return out;
}

function isMulti(
  q: RenderedQuizQuestion
): q is RenderedQuizQuestion & { correct: number[] } {
  return Array.isArray(q.correct);
}

function isCorrect(q: RenderedQuizQuestion, picks: Set<number>): boolean {
  if (isMulti(q)) {
    const expected = new Set(q.correct);
    if (picks.size !== expected.size) return false;
    for (const p of picks) if (!expected.has(p)) return false;
    return true;
  }
  return picks.size === 1 && picks.has(q.correct as number);
}

export function QuizBlock({
  episodeId,
  questions,
  initiallyCompleted,
  initialScore,
  initialState,
  onComplete,
}: Props) {
  const router = useRouter();
  const [picks, setPicks] = useState<Record<number, Set<number>>>(
    () => picksFromState(initialState)
  );
  const [submitted, setSubmitted] = useState(
    initialState?.submitted ?? initiallyCompleted
  );
  const [score, setScore] = useState<number | null>(
    initialState?.score ?? initialScore
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function persist(nextPicks: Record<number, Set<number>>, isSubmitted: boolean, currentScore: number | null) {
    persistEpisodeState(episodeId, {
      quizState: {
        picks: picksToJson(nextPicks),
        submitted: isSubmitted,
        score: currentScore,
      },
    });
  }

  const total = questions.length;
  const answered = questions.reduce(
    (n, _q, i) => ((picks[i]?.size ?? 0) > 0 ? n + 1 : n),
    0
  );
  const canSubmit = answered === total && !submitting;

  function pick(qIdx: number, optIdx: number) {
    if (submitted) return;
    const q = questions[qIdx];
    if (!q) return;
    setPicks((prev) => {
      const cur = new Set(prev[qIdx] ?? []);
      if (isMulti(q)) {
        if (cur.has(optIdx)) cur.delete(optIdx);
        else cur.add(optIdx);
      } else {
        cur.clear();
        cur.add(optIdx);
      }
      const next = { ...prev, [qIdx]: cur };
      persist(next, false, null);
      return next;
    });
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    let correct = 0;
    questions.forEach((q, i) => {
      if (isCorrect(q, picks[i] ?? new Set())) correct += 1;
    });
    const pct = total === 0 ? 0 : Math.round((correct / total) * 100);

    try {
      const res = await fetch("/api/courses/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeId, quizScore: pct }),
      });
      const body = (await res.json()) as {
        ok: boolean;
        certificateId?: string;
        error?: string;
      };
      if (!body.ok) throw new Error(body.error ?? "save_failed");
      setScore(pct);
      setSubmitted(true);
      persist(picks, true, pct);
      onComplete?.({ score: pct, certificateId: body.certificateId ?? null });
      router.refresh();
    } catch (e) {
      console.error("[QuizBlock] submit", e);
      setError("Couldn't save your score. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setPicks({});
    setSubmitted(false);
    setError(null);
    persist({}, false, null);
  }

  return (
    <div className="space-y-6">
      {/* Score banner — wrapped in aria-live="polite" so screen readers
          announce the result on submission without interrupting whatever
          the user is reading. The banner itself only renders after
          submit, so the live region is essentially fire-once per attempt. */}
      <div aria-live="polite" aria-atomic="true">
      {submitted && score !== null && (
        <div className="rounded-xl hairline bg-canvas-2/60 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-cyan/15 text-cyan">
              <Check className="size-5" strokeWidth={2.5} />
            </span>
            <div>
              <div className="font-mono text-[11px] text-ink-faint tracking-[0.2em] uppercase">
                your score
              </div>
              <div className="font-display text-xl font-semibold">
                {score}%
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 text-ink-dim hover:text-ink text-xs font-mono transition-colors"
          >
            <RotateCcw className="size-3.5" strokeWidth={2} />
            retake
          </button>
        </div>
      )}
      </div>

      {questions.map((q, i) => {
        const multi = isMulti(q);
        const cur = picks[i] ?? new Set<number>();
        const correctSet = new Set<number>(
          Array.isArray(q.correct) ? q.correct : [q.correct]
        );
        return (
          <fieldset
            key={i}
            className="rounded-xl hairline bg-canvas-2/40 p-5"
            disabled={submitted}
          >
            {/* Chip-style indicator instead of a `<legend>` riding the
                fieldset border. The HTML legend has historically sat on
                the border at -50% Y offset; tinted backgrounds on the
                fieldset show through it and look like the text is
                overlapping the rule. A stand-alone chip avoids the
                whole class of bug. */}
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-cyan/10 border border-cyan/30 px-2.5 py-1 font-mono text-[10.5px] tracking-[0.22em] uppercase text-cyan">
              q {String(i + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
              {multi && (
                <span className="text-amber border-l border-cyan/30 pl-2">
                  select all
                </span>
              )}
            </div>
            <div className="text-ink font-medium [&_p]:m-0">
              {q.question}
            </div>
            <div className="mt-4 space-y-2">
              {q.options.map((opt, oi) => {
                const selected = cur.has(oi);
                const isCorrectOpt = submitted && correctSet.has(oi);
                const isWrong = submitted && selected && !correctSet.has(oi);
                return (
                  <label
                    key={oi}
                    className={`flex items-start gap-3 rounded-md border px-3 py-2.5 cursor-pointer transition-colors ${
                      isCorrectOpt
                        ? "border-mint/50 bg-mint/10"
                        : isWrong
                          ? "border-rose/50 bg-rose/10"
                          : selected
                            ? "border-cyan/50 bg-cyan/5"
                            : "border-line hover:bg-canvas/40"
                    }`}
                  >
                    <input
                      type={multi ? "checkbox" : "radio"}
                      name={`q-${i}`}
                      checked={selected}
                      onChange={() => pick(i, oi)}
                      className="sr-only"
                    />
                    <span
                      className={`mt-0.5 inline-flex items-center justify-center size-5 ${multi ? "rounded-sm" : "rounded-full"} font-mono text-[10px] shrink-0 ${
                        isCorrectOpt
                          ? "bg-mint text-canvas"
                          : isWrong
                            ? "bg-rose text-canvas"
                            : selected
                              ? "bg-cyan text-canvas"
                              : "hairline text-ink-faint"
                      }`}
                    >
                      {isCorrectOpt ? (
                        <Check className="size-3" strokeWidth={3} />
                      ) : isWrong ? (
                        <X className="size-3" strokeWidth={3} />
                      ) : (
                        String.fromCharCode(65 + oi)
                      )}
                    </span>
                    <span className="text-sm text-ink [&_p]:m-0">{opt}</span>
                  </label>
                );
              })}
            </div>
            {submitted && q.explanation && (
              <div className="mt-4 text-ink-dim text-[13px] leading-relaxed border-l-2 border-cyan/40 pl-3 [&_p]:m-0 [&_p+p]:mt-2">
                {q.explanation}
              </div>
            )}
          </fieldset>
        );
      })}

      {error && (
        <div className="rounded-md hairline bg-amber/10 border border-amber/30 px-3 py-2 text-amber text-[13px] font-mono">
          {error}
        </div>
      )}

      {!submitted && (
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10.5px] text-ink-faint tracking-[0.2em] uppercase">
            {answered}/{total} answered
          </span>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-md bg-cyan text-canvas text-sm font-medium h-10 px-5 hover:shadow-[0_0_24px_-4px_var(--color-cyan)] transition-all disabled:opacity-50 disabled:saturate-50 disabled:pointer-events-none"
          >
            {submitting ? "saving…" : "submit answers"}
          </button>
        </div>
      )}
    </div>
  );
}
