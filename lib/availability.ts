export type AvailabilityState = {
  /** `true` when actively open to new roles. */
  open: boolean;
  /** Short lowercase label shown next to the status dot (Hero). */
  statusLabel: string;
  /** Short word shown in the Contact card under the ping. */
  availableLabel: string;
  /** Accent token used for the status dot / ping. */
  accent: "mint" | "amber";
  /** Longer sentence shown in the About profile row. */
  availabilityLine: string;
};

const OPEN: AvailabilityState = {
  open: true,
  statusLabel: "online",
  availableLabel: "available",
  accent: "mint",
  availabilityLine: "Open to Mumbai / Pune / Bangalore · WFO · WFH · Hybrid",
};

const CLOSED: AvailabilityState = {
  open: false,
  statusLabel: "consulting",
  availableLabel: "open for consultations",
  accent: "amber",
  availabilityLine: "Not actively looking · Open for consultations & advisory",
};

/**
 * Reads `NEXT_PUBLIC_OPEN_TO_WORK` at build time. Default is open (true) so
 * deployments without the variable keep the current warm hiring signal. Set
 * the env var to `false` in Vercel when the door is closed.
 */
export function getAvailability(): AvailabilityState {
  const raw = process.env.NEXT_PUBLIC_OPEN_TO_WORK;
  const open = raw === undefined ? true : raw.toLowerCase() !== "false";
  return open ? OPEN : CLOSED;
}
