import { SITE_AUTHOR, SITE_URL } from "@/lib/seo";
import type { Course, Episode } from "@/lib/courses/types";

const SCRIPT_PROP = "danger" + "ouslySetInnerHTML";

type Props = {
  course: Pick<Course, "slug" | "title" | "isFree" | "tagline">;
  episode: Pick<
    Episode,
    "slug" | "title" | "description" | "kind" | "videoUrl" | "createdAt" | "updatedAt"
  >;
  /** Optional section label — included as an extra crumb between the
   * course and the episode when provided. Sections aren't routable so
   * we don't emit a URL for the crumb item. */
  sectionTitle?: string;
  /** 1-based position of the episode within the flattened course. */
  position: number;
  /** Total episodes in the course — used for `numberOfItems` on the
   * parent course `@id` link. */
  total: number;
};

/**
 * Emits structured-data blobs for the episode page:
 *
 *  1. `LearningResource` — describes the episode itself (text lesson,
 *     quiz, lab, etc.). `isPartOf` links back to the parent Course's
 *     `@id` so search engines know the episode belongs to the course.
 *
 *  2. `BreadcrumbList` — `home → courses → {course} → {episode}`. Same
 *     pattern as the blog post route.
 *
 *  3. `VideoObject` (only when `episode.videoUrl` is set) — surfaces
 *     the lesson in Google Video search. `requiresSubscription` is
 *     derived from `course.isFree` so paid content is correctly
 *     signalled as gated.
 *
 * Episode pages are auth-gated and `robots: noindex`, but emitting
 * structured data is still cheap and helps if Google ever sees the
 * URL via a sitemap-only path or a stale link.
 */
export function EpisodeJsonLd({
  course,
  episode,
  sectionTitle,
  position,
  total,
}: Props) {
  const courseUrl = `${SITE_URL}/courses/${course.slug}`;
  const episodeUrl = `${courseUrl}/${episode.slug}`;
  const ogImage = `${episodeUrl}/opengraph-image`;

  const learningResourceTypes: Record<string, string> = {
    lesson: "Article",
    visual: "Article",
    resources: "Article",
    quiz: "Quiz",
    exam: "Quiz",
    lab: "LearningResource",
    code: "LearningResource",
    fill: "LearningResource",
    flashcards: "LearningResource",
  };
  const learningResourceType =
    learningResourceTypes[episode.kind] ?? "LearningResource";

  const description =
    episode.description ?? `Episode ${position} of ${course.title}`;

  const resource = {
    "@context": "https://schema.org",
    "@type": ["LearningResource", learningResourceType],
    "@id": `${episodeUrl}#episode`,
    url: episodeUrl,
    name: episode.title,
    description,
    inLanguage: "en",
    learningResourceType: episode.kind,
    position,
    image: ogImage,
    isPartOf: {
      "@type": "Course",
      "@id": `${courseUrl}#course`,
      name: course.title,
      url: courseUrl,
      numberOfLessons: total,
    },
    author: {
      "@type": "Person",
      "@id": `${SITE_URL}#person`,
      name: SITE_AUTHOR,
      url: SITE_URL,
    },
    isAccessibleForFree: course.isFree,
  };

  // BreadcrumbList — 5 levels when a section title is passed in
  // (Home → Courses → {course} → {section} → {episode}), 4 otherwise.
  // Sections aren't routable, so the section crumb has no `item` URL.
  const crumbItems: Array<Record<string, unknown>> = [
    { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
    {
      "@type": "ListItem",
      position: 2,
      name: "Courses",
      item: `${SITE_URL}/courses`,
    },
    { "@type": "ListItem", position: 3, name: course.title, item: courseUrl },
  ];
  if (sectionTitle) {
    crumbItems.push({
      "@type": "ListItem",
      position: 4,
      name: sectionTitle,
    });
    crumbItems.push({
      "@type": "ListItem",
      position: 5,
      name: episode.title,
      item: episodeUrl,
    });
  } else {
    crumbItems.push({
      "@type": "ListItem",
      position: 4,
      name: episode.title,
      item: episodeUrl,
    });
  }
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbItems,
  };

  // VideoObject — only when the episode actually carries a video.
  // `contentUrl` and `embedUrl` point at the page (the actual media is
  // gated behind auth + presigned S3); `requiresSubscription` tells
  // Google not to index it as freely watchable.
  const blobs: Array<Record<string, unknown>> = [resource, breadcrumb];
  if (episode.videoUrl) {
    blobs.push({
      "@context": "https://schema.org",
      "@type": "VideoObject",
      "@id": `${episodeUrl}#video`,
      name: episode.title,
      description,
      thumbnailUrl: ogImage,
      uploadDate: episode.createdAt,
      contentUrl: episodeUrl,
      embedUrl: episodeUrl,
      isFamilyFriendly: true,
      inLanguage: "en",
      isAccessibleForFree: course.isFree,
      requiresSubscription: !course.isFree,
      publisher: {
        "@type": "Person",
        "@id": `${SITE_URL}#person`,
        name: SITE_AUTHOR,
        url: SITE_URL,
      },
      potentialAction: {
        "@type": "WatchAction",
        target: episodeUrl,
      },
    });
  }

  const props = {
    [SCRIPT_PROP]: { __html: JSON.stringify(blobs) },
  };
  return <script type="application/ld+json" {...props} />;
}
