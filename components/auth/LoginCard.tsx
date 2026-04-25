import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { profile } from "@/lib/data";
import { SITE_HOST } from "@/lib/seo";

type Props = {
  error?: string;
  next?: string;
};

function errorCopy(error: string | undefined): string | null {
  if (!error) return null;
  switch (error) {
    case "invalid_provider":
      return "That sign-in provider isn't supported. Try Google or GitHub.";
    case "oauth_failed":
      return "The OAuth handshake failed. Try once more — if it keeps failing the provider may be rate-limiting from your network.";
    case "missing_code":
      return "The provider didn't return an auth code. Please retry — usually a stale browser tab.";
    case "exchange_failed":
      return "We couldn't complete sign-in. Try again, or use a different provider.";
    default:
      return "Something went wrong. Please try again.";
  }
}

function providerHref(provider: "google" | "github", next: string | undefined) {
  const query = next ? `?next=${encodeURIComponent(next)}` : "";
  return `/auth/signin/${provider}${query}`;
}

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
    <path
      fill="#ffffff"
      d="M21.35 11.1h-9.17v2.9h5.27c-.23 1.46-1.68 4.28-5.27 4.28-3.17 0-5.75-2.62-5.75-5.85s2.58-5.85 5.75-5.85c1.8 0 3.02.77 3.71 1.43l2.53-2.44C16.89 3.93 14.76 3 12.18 3 7.06 3 2.92 7.13 2.92 12.25S7.06 21.5 12.18 21.5c7 0 9.2-4.9 9.2-7.44 0-.5-.05-.87-.11-1.26"
    />
  </svg>
);

const GithubIcon = () => (
  <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
    <path
      fill="#ffffff"
      d="M12 .5A11.5 11.5 0 0 0 .5 12.3c0 5.1 3.3 9.4 7.9 10.95.6.1.8-.25.8-.55v-2.05c-3.2.7-3.9-1.38-3.9-1.38-.55-1.35-1.3-1.7-1.3-1.7-1.05-.72.1-.7.1-.7 1.15.1 1.75 1.2 1.75 1.2 1.05 1.8 2.75 1.3 3.4.95.1-.75.4-1.3.75-1.6-2.55-.3-5.2-1.3-5.2-5.75 0-1.25.45-2.3 1.15-3.1-.1-.3-.5-1.5.1-3.1 0 0 .95-.3 3.1 1.15a10.3 10.3 0 0 1 5.65 0c2.15-1.45 3.1-1.15 3.1-1.15.6 1.6.25 2.8.15 3.1.7.8 1.15 1.85 1.15 3.1 0 4.45-2.65 5.45-5.2 5.75.4.35.75 1.05.75 2.1v3.1c0 .3.2.65.8.55 4.6-1.55 7.9-5.85 7.9-10.95A11.5 11.5 0 0 0 12 .5z"
    />
  </svg>
);

export function LoginCard({ error, next }: Props) {
  const err = errorCopy(error);

  return (
    <section className="relative min-h-[100svh] flex items-center justify-center px-6 py-20 overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 bg-grid bg-grid-fade opacity-60 pointer-events-none"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 size-[34rem] rounded-full opacity-30 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--color-cyan) 45%, transparent) 0%, transparent 65%)",
        }}
      />

      <div className="relative w-full max-w-md">
        <div className="relative overflow-hidden rounded-2xl hairline bg-canvas-2/60 px-7 py-9 sm:px-10 sm:py-11">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, transparent 0, transparent 7px, var(--color-cyan) 7px, var(--color-cyan) 8px)",
            }}
          />
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
                <span className="absolute inset-0 rounded-full bg-cyan animate-ping opacity-75" />
                <span className="relative rounded-full size-1.5 bg-cyan shadow-[0_0_8px_currentColor]" />
              </span>
              <span className="text-cyan">{"// sign in"}</span>
            </div>

            <h1 className="font-display text-[clamp(1.85rem,4.5vw,2.5rem)] leading-[1.05] tracking-[-0.025em] font-semibold">
              Log in to{" "}
              <span className="text-cyan text-glow-cyan">{SITE_HOST}</span>
            </h1>
            <p className="mt-4 text-ink-dim text-[15px] leading-relaxed">
              Access free courses, track your progress, and collect completion
              certificates.
            </p>

            {err && (
              <div
                role="alert"
                className="mt-5 rounded-md hairline bg-amber/10 border border-amber/30 px-3 py-2 text-amber text-[13px] font-mono leading-relaxed"
              >
                {err}{" "}
                <a
                  href={`mailto:${profile.email}?subject=${encodeURIComponent("Login issue on " + SITE_HOST)}`}
                  className="underline underline-offset-2 hover:text-amber/80"
                >
                  email me
                </a>{" "}
                if it keeps happening.
              </div>
            )}

            <div className="mt-7 flex flex-col gap-3">
              <Link
                href={providerHref("google", next)}
                className="group inline-flex items-center justify-center gap-3 rounded-md hairline bg-canvas/70 hover:bg-canvas text-ink text-sm font-medium h-11 px-5 transition-colors"
              >
                <GoogleIcon />
                Continue with Google
              </Link>
              <Link
                href={providerHref("github", next)}
                className="group inline-flex items-center justify-center gap-3 rounded-md hairline bg-canvas/70 hover:bg-canvas text-ink text-sm font-medium h-11 px-5 transition-colors"
              >
                <GithubIcon />
                Continue with GitHub
              </Link>
            </div>

            <div className="mt-7 pt-5 border-t border-line flex items-center justify-between">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-ink-dim hover:text-ink text-xs font-mono transition-colors"
              >
                <ArrowLeft className="size-3.5" strokeWidth={2} />
                Back to {SITE_HOST}
              </Link>
              <span className="font-mono text-[10px] text-ink-faint tracking-[0.15em] uppercase">
                {"// zero passwords"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
