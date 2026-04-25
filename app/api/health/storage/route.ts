import { NextResponse } from "next/server";
import { checkS3Health } from "@/lib/s3";

// Health probe for the "Object Storage Service" Statuspage component.
// Calls S3 `HeadBucket` on the configured bucket — the cheapest S3
// op (0-byte body, free tier) that still exercises:
//   • S3 reachability + region routing
//   • IAM credential validity
//   • Bucket existence + access policy
//
// Returns 200 on success, 503 on any failure. Better Stack flips the
// Statuspage component on the next tick.
export const dynamic = "force-dynamic";

export async function GET() {
  const checkedAt = new Date().toISOString();
  const result = await checkS3Health();
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, service: "storage", checkedAt, error: result.error },
      {
        status: 503,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      },
    );
  }
  return NextResponse.json(
    { ok: true, service: "storage", checkedAt },
    {
      status: 200,
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    },
  );
}
