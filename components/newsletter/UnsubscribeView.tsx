import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { profile } from "@/lib/data";
import { SITE_HOST } from "@/lib/seo";

type Props =
  | { state: "success"; email: string }
  | { state: "error"; reason: "missing_token" | "invalid_token" | "server_error" };

function errorCopy(
  reason: "missing_token" | "invalid_token" | "server_error"
) {
  if (reason === "missing_token") {
    return {
      eyebrow: "// unsubscribe",
      heading: "Missing link.",
      body:
        "This page needs a signed link from a newsletter email to work. If you want to opt out, just reply to any post email with “unsubscribe” and I'll handle it manually.",
    };
  }
  if (reason === "invalid_token") {
    return {
      eyebrow: "// unsubscribe",
      heading: "Broken link.",
      body:
        "This unsubscribe link is invalid or tampered with. It might have been wrapped by a link-scanning proxy. Reply to any post email with “unsubscribe” and I'll handle it manually.",
    };
  }
  return {
    eyebrow: "// unsubscribe",
    heading: "Something went wrong.",
    body:
      "We couldn't process that unsubscribe. Try again in a minute, or email me directly and I'll take you off the list personally.",
  };
}

export function UnsubscribeView(props: Props) {
  const isSuccess = props.state === "success";
  const copy = isSuccess
    ? {
        eyebrow: "// unsubscribed",
        heading: "You're out.",
        body: (
          <>
            <span className="font-mono text-ink">{props.email}</span> has been
            removed from the {SITE_HOST} newsletter. Sorry to see you go — if
            you change your mind, you can resubscribe any time.
          </>
        ),
      }
    : errorCopy(props.reason);

  return (
    <section className="relative min-h-[100svh] flex items-center justify-center px-6 py-20 overflow-hidden">
      {/* Grid + fade */}
      <div
        aria-hidden
        className="absolute inset-0 bg-grid bg-grid-fade opacity-60 pointer-events-none"
      />
      {/* Ambient cyan glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 size-[34rem] rounded-full opacity-30 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--color-cyan) 45%, transparent) 0%, transparent 65%)",
        }}
      />

      <div className="relative w-full max-w-xl">
        <div className="relative overflow-hidden rounded-2xl hairline bg-canvas-2/60 px-7 py-9 sm:px-10 sm:py-12">
          {/* Diagonal hatch */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, transparent 0, transparent 7px, var(--color-cyan) 7px, var(--color-cyan) 8px)",
            }}
          />
          {/* Corner brackets */}
          <span
            aria-hidden
            className="pointer-events-none absolute top-3 left-3 size-5 border-l-2 border-t-2 border-cyan/60 rounded-tl-xl"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-3 right-3 size-5 border-r-2 border-b-2 border-cyan/60 rounded-br-xl"
          />

          <div className="relative">
            <div className="font-mono text-[10.5px] tracking-[0.25em] uppercase flex items-center gap-3 mb-5">
              <span className="relative flex size-1.5 shrink-0">
                <span
                  className={`absolute inset-0 rounded-full ${
                    isSuccess ? "bg-mint" : "bg-amber"
                  } animate-ping opacity-75`}
                />
                <span
                  className={`relative rounded-full size-1.5 ${
                    isSuccess ? "bg-mint" : "bg-amber"
                  } shadow-[0_0_8px_currentColor]`}
                />
              </span>
              <span className="text-cyan">{copy.eyebrow}</span>
            </div>

            <h1 className="font-display text-[clamp(2rem,5vw,2.75rem)] leading-[1.05] tracking-[-0.025em] font-semibold">
              {copy.heading}
            </h1>

            <p className="mt-5 text-ink-dim text-[15px] leading-relaxed max-w-prose">
              {copy.body}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/"
                className="group inline-flex items-center gap-2 rounded-md bg-cyan text-canvas text-sm font-medium h-11 px-5 hover:shadow-[0_0_24px_-4px_var(--color-cyan)] transition-all"
              >
                Back to {SITE_HOST}
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  strokeWidth={2.25}
                />
              </Link>
              {!isSuccess && (
                <a
                  href={`mailto:${profile.email}?subject=unsubscribe`}
                  className="inline-flex items-center gap-2 rounded-md hairline bg-canvas/60 text-ink text-sm font-medium h-11 px-5 hover:bg-canvas transition-colors"
                >
                  <Mail className="size-4" strokeWidth={1.75} />
                  Email me
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
