"use client";

import { useState } from "react";
import { Check, Copy, Download, Share2 } from "lucide-react";

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}

type Props = {
  certUrl: string;
  certId: string;
  /** Same-origin URL of the runtime-generated PDF — see
   * `app/certificates/[certId]/download/route.tsx`. */
  pdfUrl: string;
  courseTitle: string;
  organizationName: string;
  issuedAt: string;
};

export function CertificateActions({
  certUrl,
  certId,
  pdfUrl,
  courseTitle,
  organizationName,
  issuedAt,
}: Props) {
  const [copied, setCopied] = useState(false);

  const issuedDate = new Date(issuedAt);
  const issueYear = issuedDate.getUTCFullYear();
  const issueMonth = issuedDate.getUTCMonth() + 1;

  // LinkedIn "Add to profile" deeplink — pre-fills the certifications form.
  // Reference: https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/add-to-profile-certifications
  const linkedinAddUrl = new URL(
    "https://www.linkedin.com/profile/add"
  );
  linkedinAddUrl.searchParams.set("startTask", "CERTIFICATION_NAME");
  linkedinAddUrl.searchParams.set("name", courseTitle);
  linkedinAddUrl.searchParams.set("organizationName", organizationName);
  linkedinAddUrl.searchParams.set("issueYear", String(issueYear));
  linkedinAddUrl.searchParams.set("issueMonth", String(issueMonth));
  linkedinAddUrl.searchParams.set("certUrl", certUrl);
  linkedinAddUrl.searchParams.set("certId", certId);

  const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(certUrl)}`;
  const xShareText = `I just earned a certificate for completing "${courseTitle}" by ${organizationName}.`;
  const xShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(xShareText)}&url=${encodeURIComponent(certUrl)}`;
  // wa.me deep-links into the WhatsApp app on mobile and into
  // WhatsApp Web on desktop. WhatsApp doesn't take a separate URL
  // field, so we concatenate the brag-line and the cert URL into
  // one encoded `text` payload.
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(`${xShareText} ${certUrl}`)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(certUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  function nativeShare() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      void navigator
        .share({
          title: `Certificate · ${courseTitle}`,
          text: xShareText,
          url: certUrl,
        })
        .catch(() => {
          /* user dismissed */
        });
    } else {
      // Fallback: copy to clipboard.
      void copy();
    }
  }

  const primary =
    "inline-flex items-center justify-center gap-2 rounded-md bg-cyan text-canvas text-[13px] font-medium h-10 px-4 hover:shadow-[0_0_24px_-4px_var(--color-cyan)] transition-all";
  const secondary =
    "inline-flex items-center justify-center gap-2 rounded-md hairline bg-canvas-2/60 hover:bg-canvas-2 text-ink text-[13px] font-medium h-10 px-4 transition-colors";
  const iconBtn =
    "inline-flex size-10 items-center justify-center rounded-md hairline bg-canvas-2/60 text-ink-dim hover:text-cyan hover:bg-canvas-2 transition-colors";

  return (
    <div className="no-print flex flex-wrap items-center justify-center gap-2 sm:gap-3">
      {/* SR-only live region — announces "Link copied" when the copy
          button transitions to the success state. The visible icon
          swap (Copy → Check) handles the sighted feedback. */}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? "Link copied" : ""}
      </span>
      <a
        href={linkedinAddUrl.toString()}
        target="_blank"
        rel="noopener noreferrer"
        className={primary}
      >
        <LinkedinIcon className="size-4" />
        Add to LinkedIn profile
      </a>
      <a href={pdfUrl} download className={secondary}>
        <Download className="size-4" strokeWidth={2} />
        Download PDF
      </a>

      <span aria-hidden className="hidden sm:inline-block h-6 w-px bg-line mx-1" />

      <button
        type="button"
        aria-label="Copy link"
        onClick={copy}
        className={iconBtn}
      >
        {copied ? (
          <Check className="size-4 text-mint" strokeWidth={2.25} />
        ) : (
          <Copy className="size-4" strokeWidth={2} />
        )}
      </button>
      <a
        href={linkedinShareUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on LinkedIn"
        className={iconBtn}
      >
        <LinkedinIcon className="size-4" />
      </a>
      <a
        href={xShareUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on X"
        className={iconBtn}
      >
        <XIcon className="size-4" />
      </a>
      <a
        href={whatsappShareUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on WhatsApp"
        className="inline-flex size-10 items-center justify-center rounded-md hairline bg-canvas-2/60 text-ink-dim hover:text-mint hover:bg-canvas-2 transition-colors"
      >
        <WhatsAppIcon className="size-4" />
      </a>
      <button
        type="button"
        aria-label="More share options"
        onClick={nativeShare}
        className={`${iconBtn} sm:hidden`}
      >
        <Share2 className="size-4" strokeWidth={2} />
      </button>
    </div>
  );
}
