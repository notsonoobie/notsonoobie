"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, RotateCcw, ShieldCheck, Timer, X } from "lucide-react";
import type { ExamContent, QuizState } from "@/lib/courses/types";
import { persistEpisodeState } from "@/lib/courses/state-client";

export type RenderedExamQuestion = {
  question: ReactNode;
  options: ReactNode[];
  explanation: ReactNode | null;
  correct: number | number[];
};

type Props = {
  episodeId: number;
  content: ExamContent;
  /** Pre-rendered (server) markdown for the exam-level prompt. */
  prompt: ReactNode | null;
  /** Pre-rendered (server) markdown for every question/option/explanation. */
  questions: RenderedExamQuestion[];
  initiallyCompleted: boolean;
  initialScore: number | null;
  /** Server-restored exam state — picks + submitted + score. */
  initialState?: QuizState | null;
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
  q: RenderedExamQuestion
): q is RenderedExamQuestion & { correct: number[] } {
  return Array.isArray(q.correct);
}

function gradeQuestion(q: RenderedExamQuestion, picked: Set<number>): boolean {
  if (isMulti(q)) {
    const expected = new Set(q.correct);
    if (picked.size !== expected.size) return false;
    for (const p of picked) if (!expected.has(p)) return false;
    return true;
  }
  return picked.size === 1 && picked.has(q.correct as number);
}

export function Exam({
  episodeId,
  content,
  prompt,
  questions,
  initiallyCompleted,
  initialScore,
  initialState,
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
  const [done, setDone] = useState(initiallyCompleted);

  function persist(nextPicks: Record<number, Set<number>>, isSubmitted: boolean, currentScore: number | null) {
    persistEpisodeState(episodeId, {
      quizState: {
        picks: picksToJson(nextPicks),
        submitted: isSubmitted,
        score: currentScore,
      },
    });
  }
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(
    content.time_limit_min ? content.time_limit_min * 60 : null
  );

  const memoQuestions = useMemo(() => questions, [questions]);
  const total = memoQuestions.length;

  // Optional countdown — auto-submits when it hits zero.
  useEffect(() => {
    if (submitted || done || secondsLeft === null) return;
    if (secondsLeft <= 0) {
      void submit();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => (s ?? 0) - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, submitted, done]);

  function pick(qIdx: number, optIdx: number) {
    if (submitted) return;
    const q = memoQuestions[qIdx];
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

  function totalAnswered() {
    return memoQuestions.reduce(
      (n, _q, i) => ((picks[i]?.size ?? 0) > 0 ? n + 1 : n),
      0
    );
  }

  async function submit() {
    setSubmitting(true);
    setError(null);

    let correct = 0;
    memoQuestions.forEach((q, i) => {
      if (gradeQuestion(q, picks[i] ?? new Set())) correct += 1;
    });
    const pct = total === 0 ? 0 : Math.round((correct / total) * 100);
    setScore(pct);
    setSubmitted(true);
    persist(picks, true, pct);

    const passed = pct >= content.passing_score;
    if (!passed) {
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/courses/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeId, quizScore: pct }),
      });
      const body = (await res.json()) as { ok: boolean; error?: string };
      if (!body.ok) throw new Error(body.error ?? "save_failed");
      setDone(true);
      router.refresh();
    } catch (e) {
      console.error("[Exam] save", e);
      setError("Couldn't save your score. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setPicks({});
    setSubmitted(false);
    setScore(null);
    setError(null);
    persist({}, false, null);
    if (content.time_limit_min) {
      setSecondsLeft(content.time_limit_min * 60);
    }
  }

  const passed = score !== null && score >= content.passing_score;
  const mins = secondsLeft != null ? Math.floor(secondsLeft / 60) : null;
  const secs = secondsLeft != null ? secondsLeft % 60 : null;
  // Final-minute warning: text grows + flips to amber/rose with a soft
  // pulse so users notice they're seconds from auto-submit. Tiers:
  //  - <= 60 s → amber, normal weight
  //  - <= 10 s → rose, blink. The CSS animation is cheap; we don't
  //    pull in framer-motion for a single highlight.
  const timerCritical = secondsLeft !== null && secondsLeft <= 10;
  const timerWarning =
    secondsLeft !== null && secondsLeft > 10 && secondsLeft <= 60;

  return (
    <div className="space-y-6">
      {prompt}

      {/* Top status bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl hairline bg-canvas-2/50 px-5 py-3">
        <div className="inline-flex items-center gap-2 text-cyan font-mono text-[11px] tracking-[0.22em] uppercase">
          <ShieldCheck className="size-3.5" strokeWidth={2} />
          final assessment · pass at {content.passing_score}%
        </div>
        {secondsLeft !== null && !done && (
          <div
            role="timer"
            aria-live={timerCritical ? "assertive" : "polite"}
            aria-label="Time remaining"
            className={`inline-flex items-center gap-2 font-mono transition-all ${
              timerCritical
                ? "text-rose text-[14px] font-semibold animate-pulse"
                : timerWarning
                  ? "text-amber text-[12.5px]"
                  : "text-ink-dim text-[11px]"
            }`}
          >
            <Timer
              className={timerCritical ? "size-4" : "size-3.5"}
              strokeWidth={2}
            />
            {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            {timerCritical && (
              <span className="ml-1 uppercase tracking-[0.18em]">
                · auto-submit
              </span>
            )}
          </div>
        )}
      </div>

      {/* Score banner */}
      <div aria-live="polite" aria-atomic="true">
      {submitted && score !== null && (
        <div
          className={`rounded-xl hairline px-5 py-4 flex items-center justify-between ${
            passed
              ? "bg-mint/10 border-mint/40"
              : "bg-amber/10 border-amber/40"
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex size-9 items-center justify-center rounded-full ${passed ? "bg-mint/20 text-mint" : "bg-amber/20 text-amber"}`}
            >
              {passed ? (
                <Check className="size-5" strokeWidth={2.5} />
              ) : (
                <X className="size-5" strokeWidth={2.5} />
              )}
            </span>
            <div>
              <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink-faint">
                your score
              </div>
              <div className="font-display text-xl font-semibold">
                {score}% — {passed ? "passed" : "below threshold"}
              </div>
            </div>
          </div>
          {!passed && !done && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 text-ink-dim hover:text-ink text-xs font-mono transition-colors"
            >
              <RotateCcw className="size-3.5" strokeWidth={2} />
              retry
            </button>
          )}
        </div>
      )}
      </div>

      {memoQuestions.map((q, i) => {
        const multi = isMulti(q);
        const cur = picks[i] ?? new Set<number>();
        const correctSet = new Set<number>(
          Array.isArray(q.correct) ? q.correct : [q.correct]
        );
        return (
          <fieldset
            key={i}
            disabled={submitted}
            className="rounded-xl hairline bg-canvas-2/40 p-5"
          >
            {/* Chip-style indicator — same shape as QuizBlock so the
                exam doesn't render with a different legend treatment. */}
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
                const isCorrect = submitted && correctSet.has(oi);
                const isWrong = submitted && selected && !correctSet.has(oi);
                return (
                  <label
                    key={oi}
                    className={`flex items-start gap-3 rounded-md border px-3 py-2.5 cursor-pointer transition-colors ${
                      isCorrect
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
                      name={`xq-${i}`}
                      checked={selected}
                      onChange={() => pick(i, oi)}
                      className="sr-only"
                    />
                    <span
                      className={`mt-0.5 inline-flex items-center justify-center size-5 ${multi ? "rounded-sm" : "rounded-full"} font-mono text-[10px] shrink-0 ${
                        isCorrect
                          ? "bg-mint text-canvas"
                          : isWrong
                            ? "bg-rose text-canvas"
                            : selected
                              ? "bg-cyan text-canvas"
                              : "hairline text-ink-faint"
                      }`}
                    >
                      {isCorrect ? (
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
            {totalAnswered()}/{total} answered
          </span>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || totalAnswered() < total}
            className="inline-flex items-center gap-2 rounded-md bg-cyan text-canvas text-sm font-medium h-10 px-5 hover:shadow-[0_0_24px_-4px_var(--color-cyan)] transition-all disabled:opacity-50 disabled:saturate-50 disabled:pointer-events-none"
          >
            {submitting ? "submitting…" : "submit exam"}
          </button>
        </div>
      )}
    </div>
  );
}
