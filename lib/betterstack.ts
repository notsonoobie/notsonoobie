/**
 * Better Stack Uptime API integration.
 *
 * The footer status pill reads aggregate monitor state from Better
 * Stack — the system actually running the HTTP probes — rather than
 * Atlassian Statuspage, which only gets updated when state *changes*
 * and so lags behind the real check results.
 *
 * Atlassian Statuspage stays alive externally as the click target
 * (incident UI, history, subscribers) — we just don't read from it.
 *
 * Docs: https://betterstack.com/docs/uptime/api/list-all-existing-monitors/
 */

export type MonitorStatus =
  | "up"
  | "down"
  | "validating"
  | "paused"
  | "pending"
  | "maintenance";

export type Monitor = {
  id: string;
  type: "monitor";
  attributes: {
    url: string;
    monitor_name: string;
    status: MonitorStatus;
    last_checked_at: string | null;
    paused_at: string | null;
  };
};

type MonitorsResponse = {
  data: Monitor[];
};

export type Tone = "ok" | "warn" | "down" | "maintenance";

export type MonitorAggregate = {
  /** Single UI tone derived from the worst monitor in the set. */
  tone: Tone;
  /** Lower-case copy for the footer pill. */
  label: string;
  /** Per-status counts — useful for richer surfaces in the future. */
  totals: { up: number; down: number; maintenance: number; other: number };
  /** Raw monitor list, in case a caller wants to drill in. */
  monitors: Monitor[];
  /** ISO timestamp of when *we* fetched, not when Better Stack last
   * checked. The latter is per-monitor on `attributes.last_checked_at`. */
  fetchedAt: string;
};

const ENDPOINT = "https://uptime.betterstack.com/api/v2/monitors";

/**
 * Fetch + aggregate Better Stack monitors. Cached for 30 seconds so a
 * burst of footer renders shares one upstream request. Token rate
 * limit is ~60/min; this stays well under it.
 *
 * Returns `null` when:
 *   • `BETTERSTACK_API_TOKEN` is unset (integration not configured)
 *   • The fetch throws or the upstream returns non-2xx
 *   • The response contains zero monitors (treat as not-yet-set-up
 *     rather than guessing "operational" for nothing)
 *
 * Callers MUST handle null by hiding the surface — never substitute
 * a fake "operational" pill. Same rule we apply for Atlassian.
 */
export async function fetchMonitorAggregate(): Promise<MonitorAggregate | null> {
  const token = process.env.BETTERSTACK_API_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(ENDPOINT, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 30 },
    });
    if (!res.ok) {
      console.warn(`[betterstack] monitors fetch failed: ${res.status}`);
      return null;
    }
    const json = (await res.json()) as MonitorsResponse;
    const monitors = Array.isArray(json?.data) ? json.data : [];
    if (monitors.length === 0) return null;

    const totals = { up: 0, down: 0, maintenance: 0, other: 0 };
    for (const m of monitors) {
      const s = m.attributes?.status;
      switch (s) {
        case "up":
        case "paused":
        case "validating":
        case "pending":
          // `validating` = about-to-be-down; `pending` = freshly created.
          // Both are transient — count as up so the pill doesn't flap.
          totals.up += 1;
          break;
        case "down":
          totals.down += 1;
          break;
        case "maintenance":
          totals.maintenance += 1;
          break;
        default:
          totals.other += 1;
      }
    }

    let tone: Tone = "ok";
    let label = "all systems operational";
    if (totals.down > 0) {
      tone = "down";
      label =
        totals.down === 1 ? "service outage" : `${totals.down} services down`;
    } else if (totals.maintenance > 0) {
      tone = "maintenance";
      label = "scheduled maintenance";
    }

    return {
      tone,
      label,
      totals,
      monitors,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn("[betterstack] fetch threw", err);
    return null;
  }
}
