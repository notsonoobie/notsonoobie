export function ProgressBar({
  value,
  total,
  compact = false,
}: {
  value: number;
  total: number;
  compact?: boolean;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      <div
        className={`relative w-full rounded-full bg-canvas-2 overflow-hidden ${compact ? "h-1" : "h-1.5"}`}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-cyan shadow-[0_0_12px_-2px_var(--color-cyan)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      {!compact && (
        <div className="flex items-center justify-between font-mono text-[10.5px] tracking-[0.2em] uppercase">
          <span className="text-ink-faint">
            {value}/{total} episodes
          </span>
          <span className="text-cyan">{pct}%</span>
        </div>
      )}
    </div>
  );
}
