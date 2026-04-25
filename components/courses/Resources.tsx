"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Book,
  Check,
  ExternalLink,
  FileText,
  GitBranch,
  Video,
  Wrench,
} from "lucide-react";
import type { ResourcesContent } from "@/lib/courses/types";

type Props = {
  episodeId: number;
  content: ResourcesContent;
  /** Pre-rendered (server) markdown for the resource list's prompt. */
  prompt: ReactNode | null;
  initiallyCompleted: boolean;
  /** URLs the user has previously marked read — server-restored from
   * public.episode_state. */
  initialReadUrls?: string[];
};

const TYPE_META = {
  doc: { label: "docs", icon: FileText, tone: "text-cyan border-cyan/40" },
  paper: { label: "paper", icon: Book, tone: "text-violet border-violet/40" },
  video: { label: "video", icon: Video, tone: "text-rose border-rose/40" },
  tool: { label: "tool", icon: Wrench, tone: "text-amber border-amber/40" },
  repo: { label: "repo", icon: GitBranch, tone: "text-mint border-mint/40" },
  article: { label: "article", icon: ExternalLink, tone: "text-cyan border-cyan/40" },
} as const;

export function Resources({
  episodeId,
  content,
  prompt,
  initiallyCompleted,
  initialReadUrls,
}: Props) {
  const router = useRouter();
  const [readSet, setReadSet] = useState<Set<string>>(
    () => new Set(initialReadUrls ?? [])
  );
  const [done, setDone] = useState(initiallyCompleted);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function persistReadSet(next: Set<string>) {
    void fetch("/api/courses/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        episodeId,
        patch: { resourcesRead: Array.from(next) },
      }),
    }).catch(() => {
      /* best-effort; next toggle re-syncs the full array */
    });
  }

  function toggle(url: string) {
    setReadSet((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      persistReadSet(next);
      return next;
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
      console.error("[Resources] save", e);
      setError("Couldn't save. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const items = content.items ?? [];

  return (
    <div className="space-y-5">
      {prompt}

      <ul className="space-y-2.5">
        {items.map((it, i) => {
          const meta = TYPE_META[it.type ?? "article"];
          const Icon = meta.icon;
          const read = readSet.has(it.url);
          return (
            <li key={i}>
              <div className="flex items-start gap-3 rounded-xl hairline bg-canvas-2/40 hover:bg-canvas-2/70 transition-colors p-4">
                <button
                  type="button"
                  onClick={() => toggle(it.url)}
                  aria-label={read ? "Mark unread" : "Mark read"}
                  className={`mt-1 inline-flex size-5 shrink-0 items-center justify-center rounded-sm border transition-colors ${
                    read
                      ? "bg-cyan/20 border-cyan text-cyan"
                      : "border-line hover:border-cyan/50"
                  }`}
                >
                  {read && <Check className="size-3.5" strokeWidth={2.5} />}
                </button>
                <a
                  href={it.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    // Auto-mark as read on first click; keeps it forgiving.
                    if (!read) toggle(it.url);
                  }}
                  className="group flex-1 min-w-0"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[10px] tracking-[0.18em] uppercase bg-canvas/50 ${meta.tone}`}
                    >
                      <Icon className="size-3" strokeWidth={2} />
                      {meta.label}
                    </span>
                    {it.estimate && (
                      <span className="font-mono text-[10px] text-ink-faint tracking-[0.18em] uppercase">
                        {it.estimate}
                      </span>
                    )}
                  </div>
                  <h4
                    className={`font-display text-base font-semibold leading-snug transition-colors ${
                      read ? "text-ink-dim" : "text-ink group-hover:text-cyan"
                    }`}
                  >
                    {it.title}
                    <ArrowUpRight
                      className="inline ml-1 size-3.5 -translate-y-0.5 opacity-60 group-hover:opacity-100 group-hover:text-cyan transition-all"
                      strokeWidth={2}
                    />
                  </h4>
                  {it.description && (
                    <p className="mt-1 text-ink-dim text-[13px] leading-relaxed line-clamp-2">
                      {it.description}
                    </p>
                  )}
                </a>
              </div>
            </li>
          );
        })}
      </ul>

      {error && (
        <div className="rounded-md hairline bg-amber/10 border border-amber/30 px-3 py-2 text-amber text-[13px] font-mono">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <span className="font-mono text-[10.5px] tracking-[0.2em] uppercase text-ink-faint">
          {readSet.size}/{items.length} read
        </span>
        {done ? (
          <span className="inline-flex items-center gap-2 rounded-md hairline bg-mint/10 border border-mint/30 text-mint text-sm font-medium h-10 px-5">
            <Check className="size-4" strokeWidth={2.5} />
            completed
          </span>
        ) : (
          <button
            type="button"
            onClick={markComplete}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-md bg-cyan text-canvas text-sm font-medium h-10 px-5 hover:shadow-[0_0_24px_-4px_var(--color-cyan)] transition-all disabled:opacity-50"
          >
            {submitting ? "saving…" : "mark complete"}
          </button>
        )}
      </div>
    </div>
  );
}
