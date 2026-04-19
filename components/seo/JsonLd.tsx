import { profile, products, experience, skills } from "@/lib/data";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/seo";

export function JsonLd() {
  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${SITE_URL}#person`,
    name: profile.name,
    alternateName: "Rahul",
    url: SITE_URL,
    image: `${SITE_URL}/opengraph-image`,
    jobTitle: "Senior Software Engineer · Solutions Architect · Agentic AI",
    description: SITE_DESCRIPTION,
    email: `mailto:${profile.email}`,
    telephone: profile.phone,
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
    description: SITE_DESCRIPTION,
    inLanguage: "en",
    author: { "@id": `${SITE_URL}#person` },
    publisher: { "@id": `${SITE_URL}#person` },
  };

  const portfolio = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${SITE_URL}#profile`,
    url: SITE_URL,
    name: `${profile.name} — Portfolio`,
    description: SITE_DESCRIPTION,
    mainEntity: { "@id": `${SITE_URL}#person` },
    about: { "@id": `${SITE_URL}#person` },
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
