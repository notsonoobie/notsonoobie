import Link from "next/link";
import { ArrowRight, Award } from "lucide-react";

type Props = {
  courseTitle: string;
  certificateId: string | null;
  isComplete: boolean;
  remaining: number;
};

export function CompletionCard({
  courseTitle,
  certificateId,
  isComplete,
  remaining,
}: Props) {
  if (!isComplete) {
    return (
      <div className="rounded-xl hairline bg-canvas-2/40 px-6 py-5">
        <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-cyan mb-2">
          {"// keep going"}
        </div>
        <p className="text-ink-dim text-[13px]">
          {remaining} {remaining === 1 ? "episode" : "episodes"} left to unlock
          your completion certificate for{" "}
          <span className="text-ink">{courseTitle}</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl hairline bg-canvas-2/60 px-6 py-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 right-0 size-60 rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--color-cyan) 40%, transparent) 0%, transparent 65%)",
        }}
      />
      <div className="relative flex items-start gap-4">
        <span className="mt-1 inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-cyan/15 text-cyan">
          <Award className="size-5" strokeWidth={1.75} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-cyan mb-1">
            {"// course complete"}
          </div>
          <h3 className="font-display text-xl font-semibold leading-snug">
            Your certificate for {courseTitle} is ready.
          </h3>
          {certificateId ? (
            <Link
              href={`/certificates/${certificateId}`}
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-cyan text-canvas text-sm font-medium h-10 px-5 hover:shadow-[0_0_24px_-4px_var(--color-cyan)] transition-all"
            >
              view certificate
              <ArrowRight className="size-4" strokeWidth={2.25} />
            </Link>
          ) : (
            <p className="mt-3 text-ink-dim text-[13px]">
              Certificate will appear in your{" "}
              <Link
                href="/me/certificates"
                className="text-cyan underline underline-offset-2"
              >
                certificates
              </Link>{" "}
              once saved.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
