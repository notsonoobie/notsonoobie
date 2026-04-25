"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { persistEpisodeState } from "@/lib/courses/state-client";

type RenderedCard = {
  front: ReactNode;
  back: ReactNode;
};

type Props = {
  episodeId: number;
  /** Pre-rendered (server) markdown for the deck-level prompt. */
  prompt: ReactNode | null;
  /** Pre-rendered cards. Each side's markdown is already rendered. */
  cards: RenderedCard[];
  initiallyCompleted: boolean;
  /** Card indexes the user has seen previously — server-restored from
   * public.episode_state. */
  initialSeenIndexes?: number[];
  /** Last-viewed card index — server-restored. */
  initialIndex?: number | null;
};

export function Flashcards({
  episodeId,
  prompt,
  cards,
  initiallyCompleted,
  initialSeenIndexes,
  initialIndex,
}: Props) {
  const router = useRouter();
  const [idx, setIdx] = useState(
    initialIndex != null && initialIndex >= 0 ? initialIndex : 0
  );
  const [flipped, setFlipped] = useState(false);
  const [seen, setSeen] = useState<Set<number>>(
    () => new Set([0, idx, ...(initialSeenIndexes ?? [])])
  );
  const [done, setDone] = useState(initiallyCompleted);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = cards.length;
  const card = cards[idx];
  const allSeen = seen.size === total;

  function persistSeen(next: Set<number>, currentIdx: number) {
    persistEpisodeState(episodeId, {
      flashcardsSeen: Array.from(next).sort((a, b) => a - b),
      flashcardsIndex: currentIdx,
    });
  }

  function next() {
    setFlipped(false);
    setIdx((i) => {
      const ni = Math.min(total - 1, i + 1);
      setSeen((s) => {
        const seenNext = s.has(ni) ? s : new Set(s).add(ni);
        persistSeen(seenNext, ni);
        return seenNext;
      });
      return ni;
    });
  }
  function prev() {
    setFlipped(false);
    setIdx((i) => {
      const ni = Math.max(0, i - 1);
      persistEpisodeState(episodeId, { flashcardsIndex: ni });
      return ni;
    });
  }

  async function markComplete() {
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
      router.refresh();
    } catch (e) {
      console.error("[Flashcards] save", e);
      setError("Couldn't save. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (total === 0 || !card) {
    return (
      <p className="text-ink-dim font-mono text-sm">No cards in this deck.</p>
    );
  }

  return (
    <div className="space-y-5">
      {prompt}

      <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase flex items-center justify-between">
        <span className="text-ink-faint">
          card {String(idx + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
        <span className="text-cyan">
          {seen.size}/{total} reviewed
        </span>
      </div>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-label="Flip card"
        className="group relative block w-full rounded-2xl hairline bg-canvas-2/50 hover:bg-canvas-2/70 transition-colors min-h-[220px] p-8 text-left"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent 0, transparent 8px, var(--color-cyan) 8px, var(--color-cyan) 9px)",
          }}
        />
        <div className="relative">
          <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-cyan mb-3">
            // {flipped ? "back" : "front"} — tap to flip
          </div>
          <div>{flipped ? card.back : card.front}</div>
        </div>
        <div className="absolute bottom-3 right-3 inline-flex items-center gap-1 text-ink-faint group-hover:text-cyan text-[11px] font-mono transition-colors">
          <RotateCcw className="size-3" strokeWidth={2} />
          flip
        </div>
      </button>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={prev}
          disabled={idx === 0}
          className="inline-flex items-center gap-1.5 rounded-md hairline bg-canvas-2/60 hover:bg-canvas-2 text-ink text-sm h-10 px-4 transition-colors disabled:opacity-40"
        >
          <ChevronLeft className="size-4" strokeWidth={2} />
          prev
        </button>
        <button
          type="button"
          onClick={next}
          disabled={idx === total - 1}
          className="inline-flex items-center gap-1.5 rounded-md hairline bg-canvas-2/60 hover:bg-canvas-2 text-ink text-sm h-10 px-4 transition-colors disabled:opacity-40"
        >
          next
          <ChevronRight className="size-4" strokeWidth={2} />
        </button>
      </div>

      {error && (
        <div className="rounded-md hairline bg-amber/10 border border-amber/30 px-3 py-2 text-amber text-[13px] font-mono">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end pt-2">
        {done ? (
          <span className="inline-flex items-center gap-2 rounded-md hairline bg-mint/10 border border-mint/30 text-mint text-sm font-medium h-10 px-5">
            <Check className="size-4" strokeWidth={2.5} />
            completed
          </span>
        ) : (
          <button
            type="button"
            onClick={markComplete}
            disabled={submitting || !allSeen}
            title={allSeen ? "Mark deck as reviewed" : "Review every card to enable"}
            className="inline-flex items-center gap-2 rounded-md bg-cyan text-canvas text-sm font-medium h-10 px-5 hover:shadow-[0_0_24px_-4px_var(--color-cyan)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "saving…" : allSeen ? "mark deck reviewed" : `review all ${total} cards`}
          </button>
        )}
      </div>
    </div>
  );
}
