"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, Play, RotateCcw } from "lucide-react";
import type { CodeContent } from "@/lib/courses/types";
import { persistEpisodeState } from "@/lib/courses/state-client";
import { langLabel } from "@/lib/markdown/lang-label";
import { CodeEditor } from "./CodeEditor";

type Props = {
  episodeId: number;
  content: CodeContent;
  /** Pre-rendered (server) markdown for the exercise prompt. */
  prompt: ReactNode | null;
  /** Pre-rendered (server) reference solution — already rendered through
   * the same Shiki + CodeBlock pipeline as everything else, so the toggle
   * just shows the React node when open. */
  solution: ReactNode | null;
  initiallyCompleted: boolean;
  /** Server-restored draft of the user's last code. Falls back to
   * content.starter when null. */
  initialDraft?: string | null;
};

type CheckResult =
  | { ok: true }
  | { ok: false; reason: string };

function runCheck(code: string, validate: CodeContent["validate"]): CheckResult {
  const norm = code.replace(/\r\n/g, "\n");

  function regexMatch(pattern: string, flags?: string) {
    try {
      return new RegExp(pattern, flags ?? "").test(norm);
    } catch {
      return false;
    }
  }

  if (validate.type === "regex") {
    return regexMatch(validate.pattern, validate.flags)
      ? { ok: true }
      : { ok: false, reason: validate.hint ?? "Pattern didn't match." };
  }
  if (validate.type === "substring") {
    return norm.includes(validate.value)
      ? { ok: true }
      : {
          ok: false,
          reason:
            validate.hint ??
            `Your code should include "${validate.value}".`,
        };
  }
  // 'all' — every item must pass
  for (const item of validate.items) {
    const passed =
      item.type === "regex"
        ? regexMatch(item.pattern, item.flags)
        : norm.includes(item.value);
    if (!passed) {
      return {
        ok: false,
        reason:
          validate.hint ??
          (item.type === "substring"
            ? `Missing: "${item.value}"`
            : "One of the required patterns didn't match."),
      };
    }
  }
  return { ok: true };
}

export function CodeExercise({
  episodeId,
  content,
  prompt,
  solution,
  initiallyCompleted,
  initialDraft,
}: Props) {
  const router = useRouter();
  const [code, setCode] = useState(initialDraft ?? content.starter ?? "");
  const [done, setDone] = useState(initiallyCompleted);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<CheckResult | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // True after the validator passes but the progress POST fails. The
  // user can retry the save without rerunning validation — `check()`
  // sees the saved feedback and short-circuits to the network call.
  const [retrySave, setRetrySave] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced save — flushes 800 ms after the last keystroke so we don't
  // POST on every character.
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      persistEpisodeState(episodeId, { codeDraft: code });
    }, 800);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [code, episodeId]);

  async function saveProgress() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/courses/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeId }),
      });
      const body = (await res.json()) as { ok: boolean; error?: string };
      if (!body.ok) throw new Error(body.error ?? "save_failed");
      setDone(true);
      setRetrySave(false);
      router.refresh();
    } catch (e) {
      console.error("[CodeExercise] save", e);
      setError("Couldn't record progress. Try again.");
      setRetrySave(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function check() {
    const result = runCheck(code, content.validate);
    setFeedback(result);
    if (!result.ok) return;
    await saveProgress();
  }

  function reset() {
    const starter = content.starter ?? "";
    setCode(starter);
    setFeedback(null);
    setRetrySave(false);
    setError(null);
    persistEpisodeState(episodeId, { codeDraft: starter });
  }

  return (
    <div className="space-y-5">
      {prompt}

      <div className="relative rounded-lg border border-line bg-[#07080b] overflow-hidden">
        {/* Header — same vocabulary as components/blogs/CodeBlock.tsx so a
            code-exercise visually reads as the same component as a static
            fenced block in the lesson body. */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-line bg-canvas-2/40">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-rose/60" />
            <span className="size-2 rounded-full bg-amber/60" />
            <span className="size-2 rounded-full bg-mint/60" />
            {content.language && (
              <span className="ml-3 font-mono text-[10px] tracking-[0.2em] uppercase text-ink-dim">
                {langLabel(content.language)}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={reset}
            aria-label="Reset to starter code"
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono tracking-[0.15em] uppercase text-ink-dim hover:text-cyan hover:bg-canvas-2 transition-colors"
          >
            <RotateCcw className="size-3" strokeWidth={1.8} />
            <span>reset</span>
          </button>
        </div>
        <CodeEditor
          value={code}
          onChange={setCode}
          language={content.language}
        />
      </div>

      {feedback && !feedback.ok && (
        <div className="rounded-md hairline bg-amber/10 border border-amber/30 px-4 py-2.5 text-amber text-[13px] font-mono">
          {feedback.reason}
        </div>
      )}
      {feedback?.ok && (
        <div className="rounded-md hairline bg-mint/10 border border-mint/30 px-4 py-2.5 text-mint text-[13px] font-mono inline-flex items-center gap-2">
          <Check className="size-4" strokeWidth={2.25} />
          looks good — saving progress…
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-md hairline bg-amber/10 border border-amber/30 px-3 py-2 text-amber text-[13px] font-mono"
        >
          <span>{error}</span>
          {retrySave && (
            <button
              type="button"
              onClick={saveProgress}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-sm border border-amber/40 hover:bg-amber/15 px-2 py-1 text-[11px] uppercase tracking-[0.18em] transition-colors disabled:opacity-50"
            >
              <RotateCcw className="size-3" strokeWidth={2} />
              retry save
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {solution ? (
          <button
            type="button"
            onClick={() => setShowSolution((v) => !v)}
            className="inline-flex items-center gap-1.5 text-ink-dim hover:text-cyan text-xs font-mono transition-colors"
          >
            {showSolution ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            {showSolution ? "hide solution" : "reveal solution"}
          </button>
        ) : (
          <span />
        )}
        {done ? (
          <span className="inline-flex items-center gap-2 rounded-md hairline bg-mint/10 border border-mint/30 text-mint text-sm font-medium h-10 px-5">
            <Check className="size-4" strokeWidth={2.5} />
            passed
          </span>
        ) : (
          <button
            type="button"
            onClick={check}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-md bg-cyan text-canvas text-sm font-medium h-10 px-5 hover:shadow-[0_0_24px_-4px_var(--color-cyan)] transition-all disabled:opacity-50 disabled:saturate-50 disabled:pointer-events-none"
          >
            <Play className="size-4" strokeWidth={2.25} />
            {submitting ? "checking…" : "run check"}
          </button>
        )}
      </div>

      {showSolution && solution && (
        <div className="rounded-xl hairline bg-canvas-2/40 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-line bg-canvas/40 font-mono text-[11px] tracking-[0.18em] uppercase text-cyan">
            reference solution
          </div>
          <div className="px-4 pb-4">{solution}</div>
        </div>
      )}
    </div>
  );
}
