import "server-only";
import { cache } from "react";
import { GetObjectCommand, HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// One S3 client per process. Lives on globalThis so HMR doesn't spawn a new
// one on every reload in dev — Node sockets are cheap to keep open.
const GLOBAL_KEY = Symbol.for("agenticwithrahul.s3-client");
type GlobalCache = { [k: symbol]: S3Client | undefined };

const region = process.env.S3_REGION;
const bucket = process.env.S3_BUCKET;
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

function getClient(): S3Client | null {
  if (!region || !bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }
  const g = globalThis as unknown as GlobalCache;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return g[GLOBAL_KEY] ?? null;
}

let warnedMissingEnv = false;

/**
 * Resolves a stored value to a renderable URL.
 *
 * - `null` / empty → `null`.
 * - `https://…` / `http://…` → returned untouched (external CDN, Unsplash,
 *   etc. — also lets you migrate gradually).
 * - Anything else → treated as an S3 key, returned as a presigned GET URL
 *   with the requested TTL.
 *
 * Wrapped in React `cache` so the same key is signed once per request.
 */
export const resolveMediaUrl = cache(
  async (
    stored: string | null | undefined,
    ttlSeconds = 3600
  ): Promise<string | null> => {
    if (!stored) return null;
    const trimmed = stored.trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;

    const client = getClient();
    if (!client || !bucket) {
      if (!warnedMissingEnv) {
        warnedMissingEnv = true;
        console.warn(
          "[s3] S3 env not configured (S3_REGION / S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY). " +
            "Bare S3 keys will not resolve until you set them."
        );
      }
      return null;
    }

    try {
      return await getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: bucket, Key: trimmed }),
        { expiresIn: ttlSeconds }
      );
    } catch (err) {
      console.error("[s3.resolveMediaUrl]", trimmed, err);
      return null;
    }
  }
);

/**
 * Cheapest possible "can we reach S3?" probe. `HeadBucket` is a 0-byte
 * operation that AWS bills as a free tier op — verifies bucket
 * existence, region, and IAM credentials in one round-trip. Used by
 * the /api/health/storage route that Better Stack pings.
 *
 * Returns `{ ok: true }` on success, `{ ok: false, error: ... }` on
 * any failure (missing env, network error, 4xx/5xx from AWS). Never
 * throws.
 */
export async function checkS3Health(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  if (!region || !bucket || !accessKeyId || !secretAccessKey) {
    return { ok: false, error: "s3 env not configured" };
  }
  const client = getClient();
  if (!client) return { ok: false, error: "s3 client unavailable" };
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.name : "unknown";
    return { ok: false, error: msg };
  }
}
