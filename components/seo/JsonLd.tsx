import { profile, products, experience, skills } from "@/lib/data";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, SITE_KEYWORDS } from "@/lib/seo";

export function JsonLd() {
  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${SITE_URL}#person`,
    name: profile.name,
    alternateName: "Rahul",
    givenName: "Rahul",
    familyName: "Gupta",
    gender: "https://schema.org/Male",
    url: SITE_URL,
    // Pin the Person to the home ProfilePage so search engines treat
    // the home URL as the canonical surface for this entity. Without
    // mainEntityOfPage, Google sometimes selects a deeper URL (e.g.
    // /blogs/<slug>) as the Person's canonical "page".
    mainEntityOfPage: { "@type": "ProfilePage", "@id": `${SITE_URL}#profile` },
    // Image as ImageObject so Google/LinkedIn pick up dimensions
    // alongside the URL — Knowledge Panel surfaces favour
    // ImageObject over a flat string.
    image: {
      "@type": "ImageObject",
      url: `${SITE_URL}/opengraph-image`,
      width: 1200,
      height: 630,
    },
    jobTitle: "Senior Software Engineer · Solutions Architect · Agentic AI",
    description: SITE_DESCRIPTION,
    email: `mailto:${profile.email}`,
    telephone: profile.phone,
    nationality: { "@type": "Country", name: "India" },
    knowsLanguage: ["en", "hi"],
    address: {
      "@type": "PostalAddress",
      addressLocality: "Mumbai",
      addressRegion: "Maharashtra",
      addressCountry: "IN",
    },
    worksFor: {
      "@type": "Organization",
      name: "Applied Cloud Computing",
      url: "https://www.appliedcloudcomputing.com/",
    },
    sameAs: [profile.linkedin, profile.github].filter((u) => u && u !== "#"),
    knowsAbout: [
      ...new Set(skills.flatMap((g) => g.items)),
      "Agentic AI",
      "Event-Driven Architecture",
      "BFSI Engineering",
    ],
    hasOccupation: {
      "@type": "Occupation",
      name: "Senior Software Engineer",
      occupationLocation: {
        "@type": "City",
        name: "Mumbai",
      },
      skills: skills.flatMap((g) => g.items).join(", "),
    },
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}#website`,
    url: SITE_URL,
    name: SITE_NAME,
    alternateName: "Rahul Gupta",
    description: SITE_DESCRIPTION,
    inLanguage: "en",
    keywords: SITE_KEYWORDS.join(", "),
    image: {
      "@type": "ImageObject",
      url: `${SITE_URL}/opengraph-image`,
      width: 1200,
      height: 630,
    },
    author: { "@id": `${SITE_URL}#person` },
    publisher: { "@id": `${SITE_URL}#person` },
    // SearchAction powers Google's sitelinks searchbox — when the site
    // ranks for branded queries, Google may render an internal search
    // box right in the SERP that targets `/blogs?q=…`. Currently the
    // only searchable surface is /blogs (FTS + trigram fuzzy).
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/blogs?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  // Build-time stamp for `dateModified` — refreshed on every deploy.
  // Static date for `dateCreated` (the day the portfolio went live).
  // Both feed the "freshness" signal Google uses for ProfilePage
  // ranking against time-sensitive queries.
  const buildDate = new Date().toISOString();
  const portfolio = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${SITE_URL}#profile`,
    url: SITE_URL,
    name: `${profile.name} — Portfolio`,
    description: SITE_DESCRIPTION,
    inLanguage: "en",
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: `${SITE_URL}/opengraph-image`,
      width: 1200,
      height: 630,
    },
    dateCreated: "2025-01-01",
    dateModified: buildDate,
    mainEntity: { "@id": `${SITE_URL}#person` },
    about: { "@id": `${SITE_URL}#person` },
    isPartOf: { "@id": `${SITE_URL}#website` },
  };

  const productItems = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Flagship Products",
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "SoftwareApplication",
        name: p.name,
        applicationCategory: "EnterpriseApplication",
        description: `${p.tagline} ${p.lead}`,
        creator: { "@id": `${SITE_URL}#person` },
        operatingSystem: "Cross-platform",
      },
    })),
  };

  const workHistory = experience.map((role, i) => ({
    "@context": "https://schema.org",
    "@type": "OrganizationRole",
    "@id": `${SITE_URL}#role-${i}`,
    roleName: role.title,
    startDate: role.period.split(" – ")[0],
    endDate: role.period.split(" – ")[1],
    member: { "@id": `${SITE_URL}#person` },
    worksFor: {
      "@type": "Organization",
      name: role.company,
    },
    description: role.highlights.join(" "),
  }));

  const blobs = [person, website, portfolio, productItems, ...workHistory];
  const serialized = JSON.stringify(blobs).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      // eslint-disable-next-line react/no-danger
      {...({ dangerouslySetInnerHTML: { __html: serialized } } as { dangerouslySetInnerHTML: { __html: string } })}
    />
  );
}
