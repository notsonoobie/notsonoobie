import { fetchMonitorAggregate, type Tone } from "@/lib/betterstack";

const TONE_DOT: Record<Tone, string> = {
  ok: "bg-mint",
  warn: "bg-amber",
  down: "bg-rose",
  maintenance: "bg-cyan",
};

/**
 * Compact status pill in the footer. Two-source architecture:
 *
 *   • Data — Better Stack Uptime API (real-time check results,
 *     refreshed every 30s).
 *   • Click target — the user's hosted Atlassian Statuspage at
 *     `STATUSPAGE_URL` (incident UI, history, subscribe). Opens in a
 *     new tab so visitors don't lose their place.
 *
 * Renders nothing when:
 *   • `BETTERSTACK_API_TOKEN` isn't set or the fetch fails
 *   • Better Stack returns zero monitors
 *   • `STATUSPAGE_URL` isn't set (no link target → no pill)
 *
 * Never substitutes a fake "operational" pill — same honesty rule
 * we enforce throughout the status surface.
 */
export async function StatusBadge() {
  const aggregate = await fetchMonitorAggregate();
  if (!aggregate) return null;
  const href = process.env.STATUSPAGE_URL;
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 hover:text-cyan transition-colors focus-visible:outline-none focus-visible:text-cyan"
      aria-label={`System status: ${aggregate.label}. Opens status page in a new tab.`}
    >
      <span
        aria-hidden
        className={`size-1.5 rounded-full ${TONE_DOT[aggregate.tone]} shadow-[0_0_8px_currentColor]`}
      />
      {aggregate.label}
    </a>
  );
}
