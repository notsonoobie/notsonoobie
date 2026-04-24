import "server-only";
import { Resend } from "resend";

let cached: Resend | null = null;

/**
 * Returns the Resend client, or `null` if `RESEND_API_KEY` is unset.
 *
 * Callers should treat `null` as "email sending disabled" and skip the
 * dispatch — useful for local dev without a live Resend project and for
 * graceful degradation if the key is revoked in production.
 */
export function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!cached) cached = new Resend(key);
  return cached;
}
