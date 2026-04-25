import { randomBytes } from "node:crypto";

/**
 * Generates a URL-safe certificate id. 9 random bytes → 12 base64url chars,
 * prefixed with "cert_" for readability in URLs and DB rows. Collision
 * probability at 9 bytes is negligible for a solo-author course catalogue.
 */
export function generateCertId(): string {
  const raw = randomBytes(9)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `cert_${raw}`;
}

export function formatIssuedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
