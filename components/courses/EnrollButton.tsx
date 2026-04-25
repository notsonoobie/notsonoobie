"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Sparkles } from "lucide-react";

type Props = {
  courseId: number;
  courseTitle: string;
  isFree: boolean;
};

export function EnrollButton({ courseId, courseTitle, isFree }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enroll() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/courses/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      const body = (await res.json()) as {
        ok: boolean;
        newlyEnrolled?: boolean;
        error?: string;
      };
      if (!body.ok) {
        if (body.error === "payment_required") {
          setError("This course requires a paid plan.");
          return;
        }
        throw new Error(body.error ?? "enroll_failed");
      }
      // Refresh server state — the page re-renders with episode access unlocked
      // and the CTA flips to "continue".
      router.refresh();
    } catch (e) {
      console.error("[EnrollButton]", e);
      setError("Couldn't enroll. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={enroll}
        disabled={submitting}
        className="group inline-flex w-full items-center justify-center gap-2 rounded-md bg-cyan text-canvas text-sm font-medium h-11 px-5 hover:shadow-[0_0_24px_-4px_var(--color-cyan)] transition-all disabled:opacity-60"
      >
        {submitting ? (
          "enrolling…"
        ) : (
          <>
            <Sparkles className="size-4" strokeWidth={2.25} />
            Enroll {isFree ? "for free" : "now"}
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              strokeWidth={2.25}
            />
          </>
        )}
      </button>
      {error && (
        <p className="font-mono text-[11px] text-amber">{error}</p>
      )}
      <p className="font-mono text-[10.5px] text-ink-faint tracking-[0.18em] uppercase">
        unlocks every episode in <span className="text-ink-dim">{courseTitle}</span>
      </p>
    </div>
  );
}
