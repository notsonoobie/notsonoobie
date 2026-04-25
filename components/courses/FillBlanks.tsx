"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import type { FillContent, FillState } from "@/lib/courses/types";
import { persistEpisodeState } from "@/lib/courses/state-client";

type Props = {
  episodeId: number;
  content: FillContent;
  /** Pre-rendered (server) markdown for the prompt. */
  prompt: ReactNode | null;
  /** Pre-rendered (server) markdown for the post-submit explanation. */
  explanation: ReactNode | null;
  initiallyCompleted: boolean;
  /** Server-restored fill state — typed answers + submitted flag. */
  initialState?: FillState | null;
};

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function answersFromArray(arr: string[]): Record<number, string> {
  const out: Record<number, string> = {};
  arr.forEach((v, i) => {
    if (v) out[i] = v;
  });
  return out;
}

function answersToArray(map: Record<number, string>, length: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < length; i++) out.push(map[i] ?? "");
  return out;
}

export function FillBlanks({
  episodeId,
  content,
  prompt,
  explanation,
  initiallyCompleted,
  initialState,
}: Props) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<number, string>>(
    () => answersFromArray(initialState?.answers ?? [])
  );
  const [submitted, setSubmitted] = useState(
    initialState?.submitted ?? initiallyCompleted
  );
  const [done, setDone] = useState(initiallyCompleted);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced save when the user types
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      persistEpisodeState(episodeId, {
        fillState: {
          answers: answersToArray(answers, content.blanks.length),
          submitted,
        },
      });
    }, 600);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [answers, submitted, episodeId, content.blanks.length]);

  // Parse the text into segments, splitting on {{N}} markers.
  const tokens: Array<{ kind: "text"; value: string } | { kind: "blank"; index: number }> = [];
  const re = /\{\{(\d+)\}\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content.text)) !== null) {
    if (m.index > last) tokens.push({ kind: "text", value: content.text.slice(last, m.index) });
    tokens.push({ kind: "blank", index: Number(m[1]!) });
    last = m.index + m[0]!.length;
  }
  if (last < content.text.length) tokens.push({ kind: "text", value: content.text.slice(last) });

  function isBlankCorrect(index: number): boolean {
    const expected = content.blanks[index] ?? [];
    const got = normalize(answers[index] ?? "");
    if (!got) return false;
    return expected.some((accepted) => normalize(accepted) === got);
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    setSubmitted(true);
    const allCorrect = content.blanks.every((_, i) => isBlankCorrect(i));
    if (!allCorrect) {
      setSubmitting(false);
      return;
    }
    try {
      const res = await fetch("/api/courses/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeId }),
      });
      const body = (await res.json()) as { ok: boolean; error?: string };
      if (!body.ok) throw new Error(body.error ?? "save_failed");
      setDone(true);
      router.refresh();
    } catch (e) {
      console.error("[FillBlanks] save", e);
      setError("Couldn't save progress. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setAnswers({});
    setSubmitted(false);
    persistEpisodeState(episodeId, {
      fillState: { answers: [], submitted: false },
    });
  }

  const allCorrect = content.blanks.every((_, i) => isBlankCorrect(i));

  return (
    <div className="space-y-5">
      {prompt}

      <div className="rounded-xl hairline bg-canvas-2/40 p-5 leading-[2] text-[15px]">
        {tokens.map((t, i): ReactNode => {
          if (t.kind === "text") return <span key={i}>{t.value}</span>;
          const correct = submitted && isBlankCorrect(t.index);
          const wrong = submitted && !isBlankCorrect(t.index);
          return (
            <input
              key={i}
              type="text"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              value={answers[t.index] ?? ""}
              disabled={done}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, [t.index]: e.target.value }))
              }
              className={`mx-1 inline-block min-w-[6ch] rounded-sm border-b-2 bg-canvas/60 px-2 py-0.5 font-mono text-[13px] outline-none transition-colors ${
                correct
                  ? "border-mint text-mint"
                  : wrong
                    ? "border-rose text-rose"
                    : "border-cyan/60 focus:border-cyan text-ink"
              }`}
              placeholder="…"
              aria-label={`blank ${t.index + 1}`}
            />
          );
        })}
      </div>

      {submitted && !allCorrect && !done && (
        <div className="rounded-md hairline bg-amber/10 border border-amber/30 px-3 py-2 text-amber text-[13px] font-mono">
          Some answers are off — adjust the highlighted blanks and try again.
        </div>
      )}
      {done && explanation && (
        <div className="rounded-xl hairline bg-canvas-2/40 px-5 py-4">
          <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-cyan mb-2">
            // explanation
          </div>
          {explanation}
        </div>
      )}
      {error && (
        <div className="rounded-md hairline bg-amber/10 border border-amber/30 px-3 py-2 text-amber text-[13px] font-mono">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        {submitted && !done && (
          <button
            type="button"
            onClick={reset}
            className="text-ink-dim hover:text-ink text-xs font-mono transition-colors"
          >
            clear
          </button>
        )}
        {done ? (
          <span className="inline-flex items-center gap-2 rounded-md hairline bg-mint/10 border border-mint/30 text-mint text-sm font-medium h-10 px-5">
            <Check className="size-4" strokeWidth={2.5} />
            completed
          </span>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-md bg-cyan text-canvas text-sm font-medium h-10 px-5 hover:shadow-[0_0_24px_-4px_var(--color-cyan)] transition-all disabled:opacity-50"
          >
            {submitting ? "checking…" : "check answers"}
          </button>
        )}
      </div>
    </div>
  );
}
