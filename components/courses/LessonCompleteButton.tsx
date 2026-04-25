"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

type Props = {
  episodeId: number;
  initiallyCompleted: boolean;
  onComplete?: (result: { certificateId: string | null }) => void;
};

export function LessonCompleteButton({
  episodeId,
  initiallyCompleted,
  onComplete,
}: Props) {
  const router = useRouter();
  const [done, setDone] = useState(initiallyCompleted);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function mark() {
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
      // Refresh so the parent page's server-rendered progress updates.
      router.refresh();
    } catch (e) {
      console.error("[LessonCompleteButton]", e);
      setError("Couldn't save. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-3">
      {error && (
        <span className="text-amber text-xs font-mono">{error}</span>
      )}
      {done ? (
        <span className="inline-flex items-center gap-2 rounded-md hairline bg-mint/10 border border-mint/30 text-mint text-sm font-medium h-10 px-5">
          <Check className="size-4" strokeWidth={2.5} />
          completed
        </span>
      ) : (
        <button
          type="button"
          onClick={mark}
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-md bg-cyan text-canvas text-sm font-medium h-10 px-5 hover:shadow-[0_0_24px_-4px_var(--color-cyan)] transition-all disabled:opacity-50"
        >
          {submitting ? "saving…" : "mark as complete"}
        </button>
      )}
    </div>
  );
}
