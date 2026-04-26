/**
 * Page-aware starter prompts for the empty state of the assistant
 * widget. Pure synchronous helper — same pathname patterns we use
 * server-side in the chat route's pathnameToSource(), kept in sync
 * by hand. Cheap UX win: the assistant feels like it knows what
 * you're looking at before you type.
 */

const HOME = [
  "What does Rahul work on?",
  "Show me his most recent blog post",
  "What courses does he teach?",
  "How can I reach him?",
] as const;

const BLOG_INDEX = [
  "Most popular post?",
  "What does Rahul write about?",
  "Recommend a post on distributed systems",
  "Latest blog post?",
] as const;

const BLOG_POST = [
  "Summarize this post",
  "What's the main argument?",
  "Find related blogs",
  "TL;DR?",
] as const;

const COURSES_INDEX = [
  "Which course should I start with?",
  "What's free?",
  "What does Rahul teach?",
  "Most popular course?",
] as const;

const COURSE_DETAIL = [
  "What does this course cover?",
  "Who is this for?",
  "How long does it take?",
  "What will I learn?",
] as const;

const EPISODE = [
  "Explain this lesson",
  "Quiz me on this topic",
  "What's the key takeaway?",
  "What's the next lesson?",
] as const;

const CERTIFICATES_OWN = [
  "What certificates do I have?",
  "How do I share these on LinkedIn?",
  "Most recent certificate?",
  "Track record so far?",
] as const;

const CERTIFICATE_PUBLIC = [
  "What did this person learn?",
  "Tell me about the course",
  "How do I verify this?",
  "Who issued this credential?",
] as const;

/**
 * Resolve the starter set for a given pathname. Always returns an
 * array of 4 (or fewer) prompts; falls back to home prompts for
 * unmatched / utility routes.
 */
export function getStartersForPath(pathname: string): readonly string[] {
  const clean = pathname.split("?")[0]!.split("#")[0]!.replace(/\/$/, "");

  if (clean === "" || clean === "/") return HOME;

  if (clean === "/blogs") return BLOG_INDEX;
  if (/^\/blogs\/[^/]+$/.test(clean)) return BLOG_POST;

  if (clean === "/courses") return COURSES_INDEX;
  // /courses/<slug>/<episode> — match BEFORE /courses/<slug> so the
  // episode pattern wins on three-segment paths.
  if (/^\/courses\/[^/]+\/[^/]+$/.test(clean)) return EPISODE;
  if (/^\/courses\/[^/]+$/.test(clean)) return COURSE_DETAIL;

  if (clean === "/me/certificates") return CERTIFICATES_OWN;
  if (/^\/certificates\/[^/]+$/.test(clean)) return CERTIFICATE_PUBLIC;

  return HOME;
}
