"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { fuzzyScore } from "@/lib/fuzzy";

type Tag = { tag: string; count: number };

type Props = {
  /** All tags + post counts, sorted desc by count. */
  tags: Tag[];
  /** Currently selected tag slugs (subset of `tags`). */
  selected: string[];
  /** Called with the new selected list whenever the user toggles a
   * checkbox. The parent owns the state — this component is a
   * controlled input. */
  onChange: (next: string[]) => void;
  /** Visible label on the trigger when no tags are selected. */
  label?: string;
};

/**
 * Searchable multi-select dropdown for blog tags. Renders a compact
 * trigger button ("Tags · 3 selected"); clicking opens a panel with
 * a filter input + checkbox list. Closes on outside click, Escape,
 * or after the user clears the selection.
 *
 * Keyboard:
 *   Tab        → trigger → search → first checkbox → … → trigger
 *   Esc        → close (focus returns to trigger)
 *   Space/Enter on a row → toggle
 */
export function TagPicker({
  tags,
  selected,
  onChange,
  label = "Topics",
}: Props) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const panelId = useId();

  // Outside-click + Escape to close.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Auto-focus the search input when the panel opens — the user
  // already committed to "filter tags" by clicking the trigger.
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => searchRef.current?.focus());
    } else {
      setFilter("");
    }
  }, [open]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  // Fuzzy filter via bigram overlap so typos (`apimanagemenet`)
  // still match the right topic (`api-management`). Threshold of
  // 0.4 was picked empirically — clears typo-class queries, drops
  // unrelated tokens. Sort descending by score; ties broken by
  // post count so higher-traffic topics surface first.
  const filtered = useMemo(() => {
    const needle = filter.trim();
    if (!needle) return tags;
    return tags
      .map((t) => ({ ...t, _score: fuzzyScore(needle, t.tag) }))
      .filter((t) => t._score >= 0.4)
      .sort((a, b) => b._score - a._score || b.count - a.count);
  }, [tags, filter]);

  function toggle(tag: string) {
    const next = selectedSet.has(tag)
      ? selected.filter((t) => t !== tag)
      : [...selected, tag];
    onChange(next);
  }

  function clearAll() {
    onChange([]);
  }

  const triggerLabel =
    selected.length === 0
      ? label
      : selected.length === 1
        ? `${label} · ${selected[0]}`
        : `${label} · ${selected.length} selected`;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center justify-between gap-2 h-11 px-3 min-w-[180px] rounded-md hairline font-mono text-[12px] tracking-[0.05em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ${
          selected.length > 0
            ? "bg-cyan/10 border-cyan/40 text-cyan"
            : "bg-canvas/60 hover:bg-canvas text-ink-dim hover:text-ink"
        }`}
      >
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown
          className={`size-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={2}
          aria-hidden
        />
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Filter by topic"
          className="absolute z-30 mt-2 w-[280px] sm:w-[320px] rounded-lg hairline bg-canvas-2/95 backdrop-blur-sm shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)] overflow-hidden"
        >
          {/* Search input */}
          <div className="relative border-b border-line p-2">
            <Search
              aria-hidden
              className="absolute left-4 top-1/2 -translate-y-1/2 size-3.5 text-ink-faint"
              strokeWidth={2}
            />
            <input
              ref={searchRef}
              type="search"
              value={filter}
              placeholder="search topics"
              onChange={(e) => setFilter(e.target.value)}
              className="w-full h-9 rounded-md bg-canvas/60 hairline pl-8 pr-3 font-mono text-[12px] text-ink placeholder:text-ink-faint focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan"
            />
          </div>

          {/* Selected count + clear */}
          {selected.length > 0 && (
            <div className="flex items-center justify-between px-3 py-2 border-b border-line bg-canvas-2/40 font-mono text-[10.5px] tracking-[0.18em] uppercase">
              <span className="text-ink-dim">
                {selected.length} selected
              </span>
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-1 text-ink-dim hover:text-cyan transition-colors focus-visible:outline-none focus-visible:text-cyan"
              >
                <X className="size-3" strokeWidth={2} />
                clear
              </button>
            </div>
          )}

          {/* Options. `data-lenis-prevent` opts the element out of
              Lenis's wheel-event interception (see globals.css:130);
              `overscroll-contain` is the same idea via plain CSS so
              the scroll behaviour holds when Lenis is disabled
              (prefers-reduced-motion). Without these, wheel events
              bubble to the page instead of scrolling the dropdown. */}
          <ul
            role="listbox"
            aria-multiselectable="true"
            data-lenis-prevent
            className="max-h-72 overflow-y-auto overscroll-contain py-1"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-3 font-mono text-[11px] text-ink-faint text-center">
                no matches
              </li>
            ) : (
              filtered.map(({ tag, count }) => {
                const checked = selectedSet.has(tag);
                return (
                  <li key={tag}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={checked}
                      onClick={() => toggle(tag)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-canvas/60 transition-colors focus-visible:outline-none focus-visible:bg-canvas/60"
                    >
                      <span
                        className={`inline-flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors ${
                          checked
                            ? "bg-cyan border-cyan text-canvas"
                            : "border-line bg-canvas/60"
                        }`}
                        aria-hidden
                      >
                        {checked && (
                          <Check className="size-3" strokeWidth={3} />
                        )}
                      </span>
                      <span className="flex-1 font-mono text-[12px] text-ink truncate">
                        {tag}
                      </span>
                      <span className="font-mono text-[10.5px] text-ink-faint shrink-0">
                        {count}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
