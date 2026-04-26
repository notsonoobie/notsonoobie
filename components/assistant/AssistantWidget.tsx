"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Loader2, MessageCircle, Sparkles, X } from "lucide-react";
import { AssistantLoader } from "./AssistantLoader";
import { AssistantMarkdown } from "./AssistantMarkdown";
import { getStartersForPath } from "@/lib/assistant/starters";

/**
 * Capture what the user is currently viewing — pathname, title, full
 * URL — so the chat backend can prioritise retrieval from this exact
 * page. Read at send time (not at mount) so the context is always
 * fresh, even if the user navigates while the widget is open.
 *
 * Strips the global title-template suffix (" · Rahul Gupta") so the
 * model sees the meaningful part of the title only.
 */
function getPageContext(pathname: string): {
  pathname: string;
  title: string | null;
  url: string | null;
} {
  if (typeof window === "undefined") {
    return { pathname, title: null, url: null };
  }
  const raw = (document.title || "").trim();
  const cleanTitle =
    raw.split(" · Rahul Gupta")[0]!.split(" — Rahul Gupta")[0]!.trim() || null;
  return {
    pathname,
    title: cleanTitle,
    url: window.location.href,
  };
}

type Role = "user" | "assistant";

type Source = {
  title: string;
  url: string | null;
  source_type: string;
};

type Message = {
  id: string;
  role: Role;
  content: string;
  sources?: Source[];
  /** True while Gemini is still streaming into this message. */
  streaming?: boolean;
  /** True if the request errored mid-stream. */
  error?: boolean;
};

let messageCounter = 0;
const nextId = () => `m${++messageCounter}-${Date.now()}`;

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  // Probe the API on mount — if Gemini isn't configured, hide the
  // widget entirely. No "coming soon" fake state.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/assistant/chat", { method: "GET", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const configured = Boolean(data && data.configured);
        setAvailable(configured);
      })
      .catch(() => !cancelled && setAvailable(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-scroll on new messages.
  useEffect(() => {
    if (!open || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  // Focus input when opening.
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Esc closes panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || pending) return;

      const userMsg: Message = { id: nextId(), role: "user", content: trimmed };
      const assistantMsg: Message = {
        id: nextId(),
        role: "assistant",
        content: "",
        streaming: true,
      };

      // Snapshot of history we'll send (current messages + new user msg).
      const history = [...messages, userMsg].map(({ role, content }) => ({
        role,
        content,
      }));

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setDraft("");
      setPending(true);

      try {
        const res = await fetch("/api/assistant/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history,
            pageContext: getPageContext(pathname),
          }),
        });
        if (!res.ok) {
          const code = res.status === 429 ? "rate_limited" : "request_failed";
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? {
                    ...m,
                    streaming: false,
                    error: true,
                    content:
                      code === "rate_limited"
                        ? "Daily message limit reached. Try again tomorrow, or email Rahul directly."
                        : "Something went wrong. Please try again.",
                  }
                : m,
            ),
          );
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("no body reader");
        const decoder = new TextDecoder();
        let buffer = "";

        // ndjson stream — events delimited by '\n'.
        // Each event is one JSON object.
        // We mutate the assistant message in-place as deltas arrive.
        // Sources event arrives first.
        // Done event terminates.
        // Error event flips the message into error state.
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? ""; // last partial line stays in buffer
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            try {
              const evt = JSON.parse(trimmedLine) as
                | { type: "sources"; items: Source[] }
                | { type: "delta"; text: string }
                | { type: "error"; message: string }
                | { type: "done" };
              if (evt.type === "sources") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsg.id ? { ...m, sources: evt.items } : m,
                  ),
                );
              } else if (evt.type === "delta") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsg.id
                      ? { ...m, content: m.content + evt.text }
                      : m,
                  ),
                );
              } else if (evt.type === "error") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsg.id
                      ? {
                          ...m,
                          streaming: false,
                          error: true,
                          content: evt.message,
                        }
                      : m,
                  ),
                );
              } else if (evt.type === "done") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsg.id ? { ...m, streaming: false } : m,
                  ),
                );
              }
            } catch {
              // Skip malformed lines.
            }
          }
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? {
                  ...m,
                  streaming: false,
                  error: true,
                  content: "Network issue. Please try again.",
                }
              : m,
          ),
        );
      } finally {
        setPending(false);
      }
    },
    [messages, pending, pathname],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void send(draft);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(draft);
    }
  };

  if (available !== true) return null;

  return (
    <>
      {/* Trigger */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="trigger"
            initial={{ opacity: 0, scale: 0.85, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 8 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-cyan text-canvas font-display text-[14px] font-semibold leading-none h-11 pl-3.5 pr-4 shadow-[0_8px_30px_-8px_var(--color-cyan)] hover:shadow-[0_8px_40px_-4px_var(--color-cyan)] transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            aria-label="Open श्रीman, Rahul's AI assistant"
          >
            <Sparkles className="size-4" strokeWidth={2.25} />
            श्रीman
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex flex-col rounded-none bg-canvas-2/95 backdrop-blur overflow-hidden sm:inset-auto sm:bottom-5 sm:right-5 sm:w-[min(420px,calc(100vw-2.5rem))] sm:h-[min(620px,calc(100vh-2.5rem))] sm:rounded-2xl sm:hairline sm:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]"
            role="dialog"
            aria-label="श्रीman — Rahul's AI assistant"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-line">
              <div className="flex items-center gap-2.5">
                <span className="size-7 rounded-md bg-cyan/15 hairline grid place-items-center">
                  <Sparkles className="size-3.5 text-cyan" strokeWidth={2.25} />
                </span>
                <span className="font-display text-[15px] font-semibold leading-none">
                  श्रीman
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="size-8 grid place-items-center rounded-md hairline bg-canvas/40 hover:bg-canvas text-ink-dim hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
                aria-label="Close assistant"
              >
                <X className="size-4" strokeWidth={2} />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              data-lenis-prevent
              className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4"
            >
              {messages.length === 0 ? (
                <EmptyState pathname={pathname} onPick={(t) => void send(t)} />
              ) : (
                messages.map((m) => <MessageBubble key={m.id} message={m} />)
              )}
            </div>

            {/* Composer */}
            <form
              onSubmit={onSubmit}
              className="border-t border-line p-3 flex items-stretch gap-2"
            >
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder="Ask me anything"
                className="flex-1 resize-none rounded-md hairline bg-canvas/60 px-3 py-2 font-mono text-[12.5px] text-ink placeholder:text-ink-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan h-11 max-h-32 overflow-auto leading-snug content-center"
                disabled={pending}
              />
              <button
                type="submit"
                disabled={!draft.trim() || pending}
                className="size-11 shrink-0 grid place-items-center rounded-md bg-cyan text-canvas hover:shadow-[0_0_18px_-4px_var(--color-cyan)] disabled:opacity-40 disabled:cursor-not-allowed transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-canvas-2"
                aria-label="Send"
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" strokeWidth={2.25} />
                ) : (
                  <ArrowUp className="size-4" strokeWidth={2.5} />
                )}
              </button>
            </form>
            <div className="px-4 pb-3 font-mono text-[10px] text-ink-faint tracking-[0.05em]">
              श्रीman can make mistakes. Verify what matters.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function EmptyState({
  pathname,
  onPick,
}: {
  pathname: string;
  onPick: (q: string) => void;
}) {
  const starters = getStartersForPath(pathname);
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-start gap-2.5 mb-4">
        <span className="size-7 rounded-md bg-cyan/15 hairline grid place-items-center shrink-0">
          <MessageCircle className="size-3.5 text-cyan" strokeWidth={2} />
        </span>
        <div className="text-[13px] text-ink leading-relaxed">
          Hi — I'm <span className="font-semibold text-ink">श्रीman</span>,
          Rahul's assistant. I can answer questions about his work, his
          courses, and his writing. Try one of the starters below or ask
          your own.
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {starters.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="text-left px-3 py-2 rounded-md hairline bg-canvas/30 hover:bg-canvas/60 text-[12.5px] text-ink-dim hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-cyan/15 hairline border-cyan/30 px-3.5 py-2 text-[13px] text-ink leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    );
  }

  const isWaiting = message.streaming && !message.content;

  return (
    <div className="flex flex-col gap-2">
      <div className="break-words">
        {isWaiting ? (
          <AssistantLoader />
        ) : message.error ? (
          <div className="text-[13px] leading-relaxed text-rose whitespace-pre-wrap">
            {message.content}
          </div>
        ) : (
          <div className="relative">
            <AssistantMarkdown content={message.content} />
            {message.streaming && (
              <span
                aria-hidden
                className="inline-block w-1.5 h-3 ml-0.5 align-baseline bg-cyan animate-pulse"
              />
            )}
          </div>
        )}
      </div>
      {message.sources && message.sources.length > 0 && !message.error && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {message.sources.map((s, i) => {
            const label = `${i + 1}. ${s.title}`;
            const className =
              "inline-flex items-center gap-1 max-w-full px-2 py-0.5 rounded-sm hairline bg-canvas/40 hover:bg-canvas/70 font-mono text-[10px] text-ink-dim hover:text-cyan transition-colors truncate";
            return s.url ? (
              <a
                key={`${s.source_type}-${i}`}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className={className}
                title={label}
              >
                <span className="truncate">{label}</span>
              </a>
            ) : (
              <span key={`${s.source_type}-${i}`} className={className} title={label}>
                <span className="truncate">{label}</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
