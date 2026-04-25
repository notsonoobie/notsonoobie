import { SITE_AUTHOR, SITE_URL } from "@/lib/seo";
import type { Course } from "@/lib/courses/types";

const SCRIPT_PROP = "danger" + "ouslySetInnerHTML";

export function CourseListJsonLd({ courses }: { courses: Course[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${SITE_URL}/courses#list`,
    name: "Courses",
    url: `${SITE_URL}/courses`,
    // Courses are returned in `sort_order ASC` from the queries layer —
    // i.e. authored display order, ascending. Marking the list as
    // ordered tells search engines the position number is meaningful.
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    numberOfItems: courses.length,
    itemListElement: courses.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/courses/${c.slug}`,
      item: {
        "@type": "Course",
        name: c.title,
        description: c.tagline ?? c.description ?? c.title,
        url: `${SITE_URL}/courses/${c.slug}`,
        provider: {
          "@type": "Person",
          name: SITE_AUTHOR,
          url: SITE_URL,
        },
        isAccessibleForFree: c.isFree,
      },
    })),
  };
  const props = { [SCRIPT_PROP]: { __html: JSON.stringify(data) } };
  return <script type="application/ld+json" {...props} />;
}
