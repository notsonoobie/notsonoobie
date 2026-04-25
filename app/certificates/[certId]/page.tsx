import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Certificate } from "@/components/courses/Certificate";
import { CertificateActions } from "@/components/courses/CertificateActions";
import { CertificateJsonLd } from "@/components/seo/CertificateJsonLd";
import { getCertificateById } from "@/lib/courses/queries";
import { Footer } from "@/components/footer/Footer";
import { profile } from "@/lib/data";
import { SITE_AUTHOR, SITE_URL } from "@/lib/seo";
import { formatIssuedDate } from "@/lib/courses/certificate";

export const dynamic = "force-dynamic";

type Params = Promise<{ certId: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { certId } = await params;
  const cert = await getCertificateById(certId);
  if (!cert) return { title: "Certificate not found" };
  const ownerName = cert.ownerName ?? "Anonymous learner";
  const description = `${ownerName} has completed "${cert.course.title}" — a course by Rahul Gupta.`;
  const url = `${SITE_URL}/certificates/${cert.id}`;
  const ogImage = `${url}/opengraph-image`;
  const title = `Certificate · ${cert.course.title}`;
  return {
    title,
    description,
    keywords: [
      cert.course.title,
      "certificate",
      "credential",
      "completion",
      "verifiable certificate",
      SITE_AUTHOR,
      ownerName,
    ],
    category: "Credentials",
    authors: [{ name: SITE_AUTHOR, url: SITE_URL }],
    alternates: { canonical: url },
    // Verifiable credentials are explicitly indexable — recruiters and
    // hiring managers Google these. The root layout already inherits
    // index/follow, but we set it explicitly here to signal intent and
    // pin `max-image-preview: large` so search results surface the cert
    // OG render rather than a thumbnail crop.
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      siteName: "Rahul Gupta — Portfolio",
      // `article` semantics let us carry the issue date, which LinkedIn
      // and other unfurlers use to label the share preview with a
      // byline + date.
      publishedTime: cert.issuedAt,
      modifiedTime: cert.issuedAt,
      authors: [SITE_AUTHOR],
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `Certificate of completion — ${cert.course.title}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      creator: "@notsonoobie",
      images: [ogImage],
    },
  };
}

export default async function CertificatePage({
  params,
}: {
  params: Params;
}) {
  const { certId } = await params;
  const cert = await getCertificateById(certId);
  if (!cert) notFound();

  const ownerName = cert.ownerName ?? "Anonymous learner";
  const certUrl = `${SITE_URL}/certificates/${cert.id}`;
  const pdfUrl = `/certificates/${cert.id}/download`;

  return (
    <div className="cert-page bg-canvas text-ink min-h-screen flex flex-col">
      <main className="flex-1">
        <CertificateJsonLd
          certificateId={cert.id}
          courseSlug={cert.course.slug}
          courseTitle={cert.course.title}
          ownerName={ownerName}
          issuedAt={cert.issuedAt}
        />
        <section className="relative px-5 py-12 md:py-20">
          <div className="mx-auto max-w-5xl">
            {/* Heading + meta */}
            <div className="no-print mb-8 sm:mb-10 flex flex-col items-center text-center gap-3">
              <div className="font-mono text-[10px] sm:text-[11px] tracking-[0.32em] uppercase text-cyan inline-flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-cyan shadow-[0_0_8px_currentColor]" />
                shareable credential
              </div>
              <h1 className="font-display text-[clamp(1.6rem,3.6vw,2.25rem)] leading-[1.1] tracking-[-0.02em] font-semibold">
                {ownerName} earned a certificate for{" "}
                <span className="text-cyan">{cert.course.title}</span>
              </h1>
              <p className="text-ink-dim text-sm font-mono tracking-[0.18em] uppercase">
                issued {formatIssuedDate(cert.issuedAt)} ·{" "}
                {profile.name} · agenticwithrahul.in
              </p>
            </div>

            {/* The cert itself */}
            <Certificate
              courseTitle={cert.course.title}
              ownerName={ownerName}
              issuedAt={cert.issuedAt}
              certificateId={cert.id}
            />

            {/* Actions */}
            <div className="mt-8 sm:mt-10">
              <CertificateActions
                certUrl={certUrl}
                certId={cert.id}
                pdfUrl={pdfUrl}
                courseTitle={cert.course.title}
                organizationName={profile.name}
                issuedAt={cert.issuedAt}
              />
            </div>

            {/* Course back-link */}
            <div className="no-print mt-10 flex items-center justify-center">
              <Link
                href={`/courses/${cert.course.slug}`}
                className="inline-flex items-center gap-2 rounded-md hairline bg-canvas-2/60 hover:bg-canvas-2 text-ink-dim hover:text-ink text-sm font-medium h-10 px-5 transition-colors"
              >
                view the course
                <ArrowRight className="size-4" strokeWidth={2.25} />
              </Link>
            </div>

            {/* Verification card — adds genuine "this is real" framing */}
            <div className="no-print mt-12 mx-auto max-w-2xl rounded-xl hairline bg-canvas-2/40 px-6 py-5">
              <div className="font-mono text-[10px] tracking-[0.28em] uppercase text-ink-faint mb-2">
                {"// authenticity"}
              </div>
              <p className="text-ink-dim text-[13px] leading-relaxed">
                This certificate URL is a permanent, signed, public record on{" "}
                <span className="text-ink">agenticwithrahul.in</span>. Anyone
                can visit it to verify {ownerName.split(" ")[0]} completed
                the course. Tampering with the certificate ID returns a clear
                error rather than a forged page.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
