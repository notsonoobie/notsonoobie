import { profile } from "@/lib/data";
import { SITE_HOST } from "@/lib/seo";
import { formatIssuedDate } from "@/lib/courses/certificate";

type Props = {
  courseTitle: string;
  ownerName: string;
  issuedAt: string;
  certificateId: string;
  /** When true, applies styles tuned for print/export (kept readable). */
  printable?: boolean;
};

export function Certificate({
  courseTitle,
  ownerName,
  issuedAt,
  certificateId,
  printable = false,
}: Props) {
  return (
    <article
      className={`cert-print relative overflow-hidden bg-canvas-2 ${
        printable
          ? "w-full h-full"
          : // Mobile: drop the A4 aspect lock — at 375 px the 1.414:1
            // ratio left the recipient name shrunken at ~22 px, so we
            // let the card grow to its natural height instead. From
            // `sm:` up the proper landscape ratio kicks in and the
            // certificate reads as a print-ready document.
            "rounded-2xl border border-cyan/15 sm:aspect-[1.414/1] w-full max-w-4xl mx-auto"
      }`}
      style={{
        // Make sure print dialogs render the dark backdrop fairfully even
        // when "Background graphics" is the user's default off.
        printColorAdjust: "exact",
        WebkitPrintColorAdjust: "exact",
      }}
    >
      {/* Soft top-edge gradient — replaces the heavier ambient glow with
          something that frames the layout without competing with content. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[55%]"
        style={{
          background:
            "radial-gradient(ellipse 80% 80% at 50% 0%, color-mix(in oklab, var(--color-cyan) 12%, transparent) 0%, transparent 70%)",
        }}
      />

      {/* Watermark monogram — subtler than before, and shifted slightly off
          centre so it doesn't fight the recipient name. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 grid place-items-center"
      >
        <span className="font-display font-semibold text-[clamp(8rem,28vw,18rem)] tracking-[-0.06em] text-cyan/[0.02] select-none">
          RG
        </span>
      </div>

      {/* Single elegant inner frame */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-4 sm:inset-6 rounded-xl border border-cyan/10"
      />

      {/* Body */}
      <div
        className={`relative h-full flex flex-col px-6 sm:px-12 lg:px-16 ${printable ? "py-10" : "py-8 sm:py-12"}`}
      >
        {/* Top eyebrow */}
        <div className="flex items-center justify-between gap-3">
          <div className="font-mono text-[10px] sm:text-[11px] tracking-[0.32em] uppercase text-cyan inline-flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-cyan shadow-[0_0_8px_currentColor]" />
            certificate of completion
          </div>
          <div className="font-mono text-[9.5px] sm:text-[10px] tracking-[0.22em] uppercase text-ink-faint hidden sm:block">
            {SITE_HOST} / courses
          </div>
        </div>

        {/* Awarded to */}
        <div className="mt-8 sm:mt-12 flex-1 flex flex-col items-center justify-center text-center">
          <div className="font-mono text-[10px] sm:text-[11px] tracking-[0.32em] uppercase text-ink-faint">
            this certificate is presented to
          </div>
          <h2 className="mt-4 font-display text-[clamp(2rem,6vw,3.75rem)] leading-[1.02] tracking-[-0.025em] font-semibold text-ink">
            {ownerName}
          </h2>
          {/* Refined divider */}
          <div className="mt-4 flex items-center gap-3 opacity-60">
            <span className="h-px w-12 sm:w-16 bg-gradient-to-r from-transparent to-cyan/60" />
            <span className="size-1 rounded-full bg-cyan" />
            <span className="h-px w-12 sm:w-16 bg-gradient-to-l from-transparent to-cyan/60" />
          </div>

          <div className="mt-7 sm:mt-9 font-mono text-[10px] sm:text-[11px] tracking-[0.32em] uppercase text-ink-faint">
            for successfully completing
          </div>
          <h3 className="mt-2 font-display text-[clamp(1.15rem,2.8vw,1.65rem)] leading-tight text-cyan max-w-2xl font-medium">
            {courseTitle}
          </h3>
        </div>

        {/* Footer — two columns, no centre stamp.
            Left: issuance + expiration metadata.
            Right: signature block. */}
        <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 items-end gap-8">
          <div className="text-center sm:text-left space-y-3">
            <div>
              <div className="font-mono text-[9px] sm:text-[10px] tracking-[0.28em] uppercase text-ink-faint mb-1">
                issued
              </div>
              <div className="font-display text-sm sm:text-base font-medium">
                {formatIssuedDate(issuedAt)}
              </div>
            </div>
            <div>
              <div className="font-mono text-[9px] sm:text-[10px] tracking-[0.28em] uppercase text-ink-faint mb-1">
                expires
              </div>
              <div className="font-display text-sm sm:text-base font-medium text-ink-dim">
                No expiration
              </div>
            </div>
            <div className="font-mono text-[9.5px] sm:text-[10px] text-ink-faint break-all pt-1">
              id · {certificateId.replace(/^cert_/, "")}
            </div>
          </div>

          <div className="text-center sm:text-right">
            {/* Real handwritten signature — the strokes in the source PNG
                are already brand-cyan (#25E4DB ≈ var(--color-cyan)) on a
                transparent background, so it drops in without any filter
                or color treatment against the dark canvas. */}
            <img
              src="/signatures/signature.png"
              alt={`${profile.name} signature`}
              width={170}
              height={170}
              className="h-16 sm:h-20 w-auto max-w-[180px] mx-auto sm:ml-auto sm:mr-0 -mb-1"
            />
            <div className="font-display text-sm sm:text-base font-medium text-ink">
              {profile.name}
            </div>
            <div className="mt-0.5 font-mono text-[9px] sm:text-[10px] tracking-[0.18em] uppercase text-ink-faint">
              instructor
            </div>
          </div>
        </div>

        {/* Verification line */}
        <div className="mt-6 pt-4 border-t border-line/60 flex items-center justify-center font-mono text-[9px] sm:text-[10px] tracking-[0.22em] uppercase text-ink-faint">
          verified ·{" "}
          <span className="ml-1 text-ink-dim">
            {SITE_HOST}/certificates/{certificateId}
          </span>
        </div>
      </div>
    </article>
  );
}
