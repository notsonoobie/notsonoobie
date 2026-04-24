import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

/**
 * Encrypted token that pins a specific email into an unsubscribe link.
 *
 * Layout: `base64url(iv ‖ authTag ‖ ciphertext)`.
 * - iv        — 12 bytes, random per token
 * - authTag   — 16 bytes, from AES-256-GCM
 * - ciphertext — variable length, `{ email, iat }` JSON
 *
 * `APP_SECRET` must be stable across deploys — rotating it immediately
 * invalidates every outstanding unsubscribe link.
 */

type TokenPayload = {
  email: string;
  iat: number;
};

const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const secret = process.env.APP_SECRET;
  if (!secret) {
    throw new Error(
      "APP_SECRET missing. Generate with `openssl rand -hex 32`."
    );
  }
  // sha256 gives us a deterministic 32-byte key regardless of secret length.
  return createHash("sha256").update(secret).digest();
}

export function encryptEmailToken(email: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const payload: TokenPayload = {
    email,
    iat: Math.floor(Date.now() / 1000),
  };
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64url");
}

export function decryptEmailToken(token: string): TokenPayload | null {
  try {
    const buf = Buffer.from(token, "base64url");
    if (buf.length < IV_LENGTH + TAG_LENGTH + 1) return null;
    const iv = buf.subarray(0, IV_LENGTH);
    const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const ciphertext = buf.subarray(IV_LENGTH + TAG_LENGTH);
    const key = getKey();
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
    const parsed = JSON.parse(plaintext) as Partial<TokenPayload>;
    if (typeof parsed.email !== "string" || parsed.email.length === 0) {
      return null;
    }
    if (typeof parsed.iat !== "number") return null;
    return { email: parsed.email, iat: parsed.iat };
  } catch {
    return null;
  }
}
