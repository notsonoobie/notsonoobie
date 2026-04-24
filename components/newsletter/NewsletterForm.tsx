"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

type Variant = "compact" | "inline" | "card";

interface Props {
  variant?: Variant;
  eyebrow?: string;
  heading?: string;
  headingAccent?: string;
  subhead?: string;
  className?: string;
}

type Status = "idle" | "submitting" | "success" | "error";

const EASE = [0.16, 1, 0.3, 1] as const;

// Mirror the server-side validation in app/api/newsletter/subscribe/route.ts
// so we can short-circuit before spending a network round-trip. If either
// check is tightened on the server, update this too.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

function validateEmail(value: string): "invalid_email" | null {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_EMAIL_LENGTH) {
    return "invalid_email";
  }
  if (!EMAIL_RE.test(trimmed)) return "invalid_email";
  return null;
}

const errorCopy: Record<string, string> = {
  invalid_email: "That email doesn't look right — double-check it.",
  invalid_source: "Something's off with this form. Refresh and try again.",
  invalid_payload: "Something's off with this form. Refresh and try again.",
  server_error: "Our end hiccuped. Give it a minute and try again.",
  network_error: "Network blip — check your connection and retry.",
};

export function NewsletterForm({
  variant = "card",
  eyebrow = "// newsletter",
  heading = "Get the next post.",
  headingAccent,
  subhead = "Long-form essays on distributed systems and agentic AI. One email per post.",
  className,
}: Props) {
  if (variant === "compact") {
    return (
      <CompactVariant
        eyebrow={eyebrow}
        heading={heading}
        headingAccent={headingAccent}
        subhead={subhead}
        className={className}
      />
    );
  }
  return (
    <GenericVariant
      variant={variant}
      eyebrow={eyebrow}
      heading={heading}
      subhead={subhead}
      className={className}
    />
  );
}

// -----------------------------------------------------------------------------
// Compact (footer) — the primary, polished variant.
// -----------------------------------------------------------------------------

function CompactVariant({
  eyebrow,
  heading,
  headingAccent,
  subhead,
  className,
}: {
  eyebrow: string;
  heading: string;
  headingAccent?: string;
  subhead: string;
  className?: string;
}) {
  const form = useSubscribeForm();

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl hairline bg-canvas-2/50",
        "p-5 sm:p-8 lg:p-12",
        className
      )}
    >
      {/* Ambient cyan glow blob */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-20 size-[22rem] sm:-top-40 sm:-left-24 sm:size-[28rem] rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--color-cyan) 45%, transparent) 0%, transparent 65%)",
        }}
      />
      {/* Diagonal hatch texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, transparent 0, transparent 7px, var(--color-cyan) 7px, var(--color-cyan) 8px)",
        }}
      />
      {/* Corner brackets — inset scales with padding */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-2 left-2 sm:top-3 sm:left-3 size-4 sm:size-5 border-l-2 border-t-2 border-cyan/60 rounded-tl-xl"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-2 right-2 sm:bottom-3 sm:right-3 size-4 sm:size-5 border-r-2 border-b-2 border-cyan/60 rounded-br-xl"
      />

      {/* Stack until lg so the form never fights the pitch for horizontal space
          on tablets. Two-column only on true desktop widths. */}
      <div className="relative grid gap-8 lg:grid-cols-2 lg:gap-12 lg:items-center">
        {/* Left: pitch */}
        <div>
          <div className="font-mono text-[10.5px] tracking-[0.25em] uppercase flex items-center gap-2.5 mb-4">
            <span className="relative flex size-1.5 shrink-0">
              <span className="absolute inset-0 rounded-full bg-mint animate-ping opacity-75" />
              <span className="relative rounded-full size-1.5 bg-mint shadow-[0_0_8px_currentColor]" />
            </span>
            <span className="text-cyan">{eyebrow}</span>
          </div>
          <h3 className="font-display text-[clamp(1.5rem,4.2vw,2.25rem)] leading-[1.08] tracking-[-0.02em] font-semibold max-w-[16ch]">
            {heading}
            {headingAccent && (
              <>
                <br />
                <span className="text-cyan text-glow-cyan">
                  {headingAccent}
                </span>
              </>
            )}
          </h3>
          {subhead && (
            <p className="mt-4 text-ink-dim text-sm md:text-[15px] leading-relaxed max-w-md">
              {subhead}
            </p>
          )}
        </div>

        {/* Right: form + meta (status or trust, never both) */}
        <div className="lg:pl-8 lg:border-l lg:border-line/60">
          <form
            onSubmit={form.onSubmit}
            className="flex flex-col sm:flex-row gap-2.5 sm:gap-3"
            noValidate
            aria-describedby={form.statusId}
          >
            <FormBody form={form} />
          </form>
          <MetaRow
            id={form.statusId}
            status={form.status}
            errorKey={form.errorKey}
          />
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Generic (inline / card) — reserved for future placements.
// -----------------------------------------------------------------------------

function GenericVariant({
  variant,
  eyebrow,
  heading,
  subhead,
  className,
}: {
  variant: "inline" | "card";
  eyebrow: string;
  heading: string;
  subhead: string;
  className?: string;
}) {
  const form = useSubscribeForm();
  const wrapperClass = cn(
    "relative",
    variant === "inline" &&
      "w-full rounded-2xl hairline bg-canvas-2/40 p-6 md:p-8 overflow-hidden",
    variant === "card" &&
      "w-full rounded-xl hairline bg-canvas-2/50 p-6 md:p-7 overflow-hidden",
    className
  );

  const headingClass =
    variant === "inline"
      ? "font-display text-2xl md:text-3xl font-semibold tracking-[-0.01em]"
      : "font-display text-xl md:text-2xl font-semibold tracking-[-0.01em]";

  return (
    <div className={wrapperClass}>
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 70% 100% at 100% 0%, color-mix(in oklab, var(--color-cyan) 8%, transparent) 0%, transparent 60%)",
        }}
      />
      <div className="relative">
        <div className="font-mono text-[10.5px] tracking-[0.25em] uppercase text-cyan mb-3">
          {eyebrow}
        </div>
        <h3 className={headingClass}>{heading}</h3>
        {subhead && (
          <p className="mt-3 text-ink-dim text-sm md:text-[15px] leading-relaxed max-w-xl">
            {subhead}
          </p>
        )}
        <form
          onSubmit={form.onSubmit}
          className="mt-5 flex flex-col sm:flex-row gap-2"
          noValidate
          aria-describedby={form.statusId}
        >
          <FormBody form={form} />
        </form>
        <StatusLine
          id={form.statusId}
          status={form.status}
          errorKey={form.errorKey}
        />
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Shared form state + UI pieces
// -----------------------------------------------------------------------------

function useSubscribeForm() {
  const inputId = useId();
  const statusId = useId();
  const [email, setEmailRaw] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorKey, setErrorKey] = useState<string | null>(null);

  // Clear an existing error as soon as the user edits the field — lets the
  // trust meta reappear and avoids the "yelling at me while I'm fixing it"
  // feeling.
  function setEmail(value: string) {
    setEmailRaw(value);
    if (status === "error") {
      setStatus("idle");
      setErrorKey(null);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting" || status === "success") return;

    // Client-side gate — save the round-trip on obvious input errors and
    // keep the error message a pure local concern (no network_error flicker
    // if the request would have failed anyway).
    const validationError = validateEmail(email);
    if (validationError) {
      setErrorKey(validationError);
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setErrorKey(null);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setErrorKey(data.error ?? "server_error");
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setErrorKey("network_error");
      setStatus("error");
    }
  }

  return {
    inputId,
    statusId,
    email,
    setEmail,
    status,
    errorKey,
    onSubmit,
  };
}

type FormState = ReturnType<typeof useSubscribeForm>;

function FormBody({ form }: { form: FormState }) {
  const disabled = form.status === "submitting" || form.status === "success";

  return (
    <>
      <div className="relative flex-1 min-w-0">
        <label htmlFor={form.inputId} className="sr-only">
          Email address
        </label>
        <span
          aria-hidden
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-[11px] tracking-[0.15em] uppercase text-cyan/70"
        >
          →
        </span>
        <input
          id={form.inputId}
          type="email"
          name="email"
          value={form.email}
          onChange={(e) => form.setEmail(e.target.value)}
          placeholder="you@domain.com"
          inputMode="email"
          autoComplete="email"
          required
          disabled={disabled}
          className={cn(
            "w-full h-10 sm:h-12 rounded-md bg-canvas/80 hairline pl-9 pr-3.5 text-sm text-ink placeholder:text-ink-faint",
            "outline-none transition-shadow",
            "focus:shadow-[0_0_0_1px_var(--color-cyan),0_0_0_4px_color-mix(in_oklab,var(--color-cyan)_22%,transparent)]",
            "disabled:opacity-60"
          )}
        />
      </div>

      <button
        type="submit"
        disabled={disabled || form.email.trim().length === 0}
        className={cn(
          "group h-10 sm:h-12 shrink-0 inline-flex items-center justify-center gap-2 rounded-md px-5 sm:px-6 text-[13px] sm:text-sm font-medium transition-all",
          "sm:min-w-[9rem]",
          "bg-cyan text-canvas hover:shadow-[0_0_24px_-4px_var(--color-cyan)]",
          "disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none",
          "focus:outline-none focus-visible:shadow-[0_0_0_2px_var(--color-canvas),0_0_0_4px_var(--color-cyan)]"
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {form.status === "submitting" ? (
            <motion.span
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="inline-flex items-center gap-2"
            >
              <Loader2 className="size-4 animate-spin" strokeWidth={2.25} />
              Subscribing…
            </motion.span>
          ) : form.status === "success" ? (
            <motion.span
              key="success"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="inline-flex items-center gap-2"
            >
              <Check className="size-4" strokeWidth={2.5} />
              You&apos;re in
            </motion.span>
          ) : (
            <motion.span
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="inline-flex items-center gap-2"
            >
              Subscribe
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                strokeWidth={2.25}
              />
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </>
  );
}

function StatusLine({
  id,
  status,
  errorKey,
}: {
  id: string;
  status: Status;
  errorKey: string | null;
}) {
  const message =
    status === "success"
      ? "Subscribed. Next post lands in your inbox."
      : status === "error"
      ? errorCopy[errorKey ?? ""] ?? errorCopy.server_error
      : "";

  return (
    <div
      id={id}
      role="status"
      aria-live="polite"
      className={cn(
        "min-h-[1.25rem] mt-3 font-mono text-[11px] tracking-[0.02em]",
        status === "error" && "text-rose",
        status === "success" && "text-mint",
        status !== "error" && status !== "success" && "text-ink-faint"
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {message && (
          <motion.span
            key={status}
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="inline-block"
          >
            {message}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

function MetaRow({
  id,
  status,
  errorKey,
}: {
  id: string;
  status: Status;
  errorKey: string | null;
}) {
  const isSuccess = status === "success";
  const isError = status === "error";
  const showMessage = isSuccess || isError;
  const message = isSuccess
    ? "Subscribed. Next post lands in your inbox."
    : isError
    ? errorCopy[errorKey ?? ""] ?? errorCopy.server_error
    : "";

  return (
    <div
      id={id}
      role="status"
      aria-live="polite"
      className="mt-3 sm:mt-3.5 font-mono text-[10px] tracking-[0.2em] uppercase"
    >
      <AnimatePresence mode="wait" initial={false}>
        {showMessage ? (
          <motion.span
            key={status}
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.2, ease: EASE }}
            className={cn(
              "inline-block normal-case tracking-[0.02em] text-[11px]",
              isError ? "text-rose" : "text-mint"
            )}
          >
            {message}
          </motion.span>
        ) : (
          <motion.div
            key="trust"
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-ink-faint"
          >
            <span>zero spam</span>
            <span className="h-px w-3 bg-line" />
            <span>unsubscribe anytime</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
