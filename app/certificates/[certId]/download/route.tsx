// PDF download — renders the certificate fully in-process via
// @react-pdf/renderer. No browser, no URL self-fetch, no internet —
// designed for the private-tenant deployment where outbound network
// access isn't available.
import { NextResponse } from "next/server";

import { getCertificateById } from "@/lib/courses/queries";
import { renderCertificatePdf } from "@/lib/courses/render-certificate-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Generous timeout for cold starts — pure-JS render is ~200ms once
// fonts are paged in, but the first hit can be slower.
export const maxDuration = 30;

type Params = Promise<{ certId: string }>;

export async function GET(
  _req: Request,
  { params }: { params: Params }
) {
  const { certId } = await params;
  const cert = await getCertificateById(certId);
  if (!cert) {
    return new NextResponse("Certificate not found", { status: 404 });
  }

  const pdfBuffer = await renderCertificatePdf({
    courseTitle: cert.course.title,
    ownerName: cert.ownerName ?? "Anonymous learner",
    issuedAt: cert.issuedAt,
    certificateId: cert.id,
  });

  const safeSlug = cert.course.slug.replace(/[^a-z0-9-]/gi, "");
  const filename = `${safeSlug}-${cert.id.replace(/^cert_/, "")}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // Cache aggressively — the certId is unguessable and the cert is
      // permanent, so the PDF is content-addressed by URL. Once
      // generated, the edge holds it for a year and clients re-use
      // the cache without rerunning the renderer. `immutable` skips
      // revalidation; `s-maxage` covers the CDN, `max-age` the
      // browser.
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
    },
  });
}
