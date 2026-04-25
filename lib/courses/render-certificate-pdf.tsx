import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";

import { CertificatePdf } from "@/lib/pdf/certificate";

/**
 * Renders the course-completion certificate as an A4-landscape PDF
 * **fully in-process** — no browser, no network, no URL self-fetch.
 *
 * Designed for a private-tenant deployment where the function host
 * cannot reach the public internet. Fonts and the signature image are
 * read off disk from `public/fonts/` and `public/signatures/`; nothing
 * outside the deployment is needed at runtime.
 *
 * Returns the raw PDF bytes as a `Buffer` so callers can stream it as
 * a download response, attach it to an email, or store it.
 */
export async function renderCertificatePdf(args: {
  courseTitle: string;
  ownerName: string;
  issuedAt: string;
  certificateId: string;
}): Promise<Buffer> {
  return await renderToBuffer(<CertificatePdf {...args} />);
}
