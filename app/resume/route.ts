import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";

const FILE_NAME = "Rahul_Gupta_Resume.pdf";

export async function GET() {
  const buf = await readFile(join(process.cwd(), "public", FILE_NAME));
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${FILE_NAME}"`,
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
