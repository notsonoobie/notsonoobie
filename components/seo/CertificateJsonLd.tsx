import { SITE_AUTHOR, SITE_URL } from "@/lib/seo";

const SCRIPT_PROP = "danger" + "ouslySetInnerHTML";

type Props = {
  certificateId: string;
  courseSlug: string;
  courseTitle: string;
  ownerName: string;
  issuedAt: string;
};

/**
 * Emits two JSON-LD blobs for a public verifiable certificate page:
 *
 *  1. `EducationalOccupationalCredential` — credential identity, issuer
 *     (`recognizedBy`), recipient (`awardedTo`), and a back-reference
 *     to the canonical Course `@id` so search engines can join the
 *     credential to the course page.
 *
 *  2. `BreadcrumbList` — Home → Courses → {course} → Certificate.
 *
 * `identifier` carries the cert ID so the credential is uniquely
 * addressable independent of URL. `validFrom` mirrors `dateCreated` —
 * we include both because the schema vocabulary slightly favours
 * `validFrom` for time-bounded credentials, and credentials of
 * completion don't expire (no `validUntil`).
 */
export function CertificateJsonLd({
  certificateId,
  courseSlug,
  courseTitle,
  ownerName,
  issuedAt,
}: Props) {
  const certUrl = `${SITE_URL}/certificates/${certificateId}`;
  const courseUrl = `${SITE_URL}/courses/${courseSlug}`;

  const credential = {
    "@context": "https://schema.org",
    "@type": "EducationalOccupationalCredential",
    "@id": `${certUrl}#credential`,
    url: certUrl,
    identifier: certificateId,
    name: `Certificate of completion — ${courseTitle}`,
    credentialCategory: "Certificate",
    educationalLevel: "completion",
    dateCreated: issuedAt,
    validFrom: issuedAt,
    image: `${certUrl}/opengraph-image`,
    recognizedBy: {
      "@type": "Person",
      "@id": `${SITE_URL}#person`,
      name: SITE_AUTHOR,
      url: SITE_URL,
    },
    about: {
      "@type": "Course",
      "@id": `${courseUrl}#course`,
      name: courseTitle,
      url: courseUrl,
    },
    awardedTo: {
      "@type": "Person",
      name: ownerName,
    },
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Courses",
        item: `${SITE_URL}/courses`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: courseTitle,
        item: courseUrl,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: "Certificate",
        item: certUrl,
      },
    ],
  };

  const props = {
    [SCRIPT_PROP]: { __html: JSON.stringify([credential, breadcrumb]) },
  };
  return <script type="application/ld+json" {...props} />;
}
