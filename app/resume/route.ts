import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";

// Deterministic download route — prerender at build, serve from the CDN.
export const dynamic = "force-static";
export const revalidate = false;

const FILE_NAME = "Rahul_Gupta_Resume.pdf";

export async function GET() {
  const buf = await readFile(join(process.cwd(), "public", FILE_NAME));
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${FILE_NAME}"`,
      "Cache-Control":
        "public, max-age=3600, s-maxage=31536000, stale-while-revalidate=86400",
    },
  });
}
