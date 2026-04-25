import "server-only";
import { getSupabaseRSC, getSupabaseServer } from "@/lib/supabase/server";
import { resolveMediaUrl } from "@/lib/s3";
import type {
  Certificate,
  Course,
  CourseWithSections,
  Enrollment,
  Episode,
  EpisodeContent,
  EpisodeProgress,
  EpisodeState,
  Section,
  SectionWithEpisodes,
} from "./types";

const COVER_TTL = 3600; // 1 h — image caching window
const VIDEO_TTL = 21600; // 6 h — videos play long

type CourseRow = {
  id: number;
  slug: string;
  title: string;
  tagline: string | null;
  description: string | null;
  cover_image_url: string | null;
  /** Optional intro video for the course detail page. Resolved by
   * the queries layer the same way episode videos are — direct URL,
   * presigned S3 GET, or null. Authors may only set this when
   * `cover_image_url` is also populated (DB CHECK constraint). */
  course_video_url: string | null;
  level: string | null;
  duration_min: number | null;
  is_free: boolean;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type EpisodeRow = {
  id: number;
  course_id: number;
  section_id: number;
  slug: string;
  title: string;
  description: string | null;
  kind: Episode["kind"];
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  video_url: string | null;
};

type SectionRow = {
  id: number;
  course_id: number;
  slug: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

const EPISODE_COLUMNS =
  "id, course_id, section_id, slug, title, description, kind, sort_order, is_published, created_at, updated_at, video_url";

const SECTION_COLUMNS =
  "id, course_id, slug, title, description, sort_order, is_published, created_at, updated_at";

function mapCourse(row: CourseRow): Course {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    tagline: row.tagline,
    description: row.description,
    coverImageUrl: row.cover_image_url,
    courseVideoUrl: row.course_video_url,
    level: row.level,
    durationMin: row.duration_min,
    isFree: row.is_free,
    isPublished: row.is_published,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEpisode(row: EpisodeRow): Episode {
  return {
    id: row.id,
    courseId: row.course_id,
    sectionId: row.section_id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    kind: row.kind,
    sortOrder: row.sort_order,
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    videoUrl: row.video_url,
  };
}

function mapSection(row: SectionRow): Section {
  return {
    id: row.id,
    courseId: row.course_id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    sortOrder: row.sort_order,
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Joins resolved (cover/video URLs swapped in) sections + episodes into a
 * `SectionWithEpisodes[]` tree, ordered by section sort_order then
 * episode sort_order. Sections with zero published episodes still appear
 * — empty sections are still meaningful in an authoring workflow.
 */
function buildSectionTree(
  sections: Section[],
  episodes: Episode[]
): SectionWithEpisodes[] {
  const bySection = new Map<number, Episode[]>();
  for (const ep of episodes) {
    const list = bySection.get(ep.sectionId);
    if (list) list.push(ep);
    else bySection.set(ep.sectionId, [ep]);
  }
  return sections
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((s) => ({
      ...s,
      episodes: (bySection.get(s.id) ?? [])
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }));
}

/** Resolves cover_image_url + course_video_url on a single course in place. */
async function resolveCourseCover(course: Course): Promise<Course> {
  const [coverImageUrl, courseVideoUrl] = await Promise.all([
    resolveMediaUrl(course.coverImageUrl, COVER_TTL),
    resolveMediaUrl(course.courseVideoUrl, VIDEO_TTL),
  ]);
  return {
    ...course,
    coverImageUrl,
    // Schema constraint: video may only be set when banner is set.
    // Defensive null-out here too in case a row sneaks past the DB
    // check — the UI always reads `coverImageUrl` first and gates the
    // video on its presence, so this just keeps the API consistent.
    courseVideoUrl: coverImageUrl ? courseVideoUrl : null,
  };
}

/** Resolves video_url on a single episode in place. */
async function resolveEpisodeVideo(episode: Episode): Promise<Episode> {
  return {
    ...episode,
    videoUrl: await resolveMediaUrl(episode.videoUrl, VIDEO_TTL),
  };
}

export async function getAllCourses(): Promise<Course[]> {
  const supabase = getSupabaseRSC();
  const { data, error } = await supabase
    .from("courses")
    .select(
      "id, slug, title, tagline, description, cover_image_url, course_video_url, level, duration_min, is_free, is_published, sort_order, created_at, updated_at"
    )
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[courses.getAllCourses]", error);
    return [];
  }
  return Promise.all((data as CourseRow[]).map(mapCourse).map(resolveCourseCover));
}

/**
 * Service-role variant for build-time / cookie-free contexts (sitemap.xml).
 * Returns the same published catalogue without going through the cookie-aware
 * client, which would force the calling route to be dynamic.
 */
export async function getAllCoursesPublic(): Promise<Course[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("courses")
    .select(
      "id, slug, title, tagline, description, cover_image_url, course_video_url, level, duration_min, is_free, is_published, sort_order, created_at, updated_at"
    )
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[courses.getAllCoursesPublic]", error);
    return [];
  }
  return Promise.all((data as CourseRow[]).map(mapCourse).map(resolveCourseCover));
}

/** Service-role variant of getCourseBySlug — see getAllCoursesPublic. */
export async function getCourseBySlugPublic(
  slug: string
): Promise<CourseWithSections | null> {
  const supabase = getSupabaseServer();
  const { data: course } = await supabase
    .from("courses")
    .select(
      "id, slug, title, tagline, description, cover_image_url, course_video_url, level, duration_min, is_free, is_published, sort_order, created_at, updated_at"
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (!course) return null;

  const courseId = (course as CourseRow).id;

  const [{ data: sections }, { data: episodes }] = await Promise.all([
    supabase
      .from("course_sections")
      .select(SECTION_COLUMNS)
      .eq("course_id", courseId)
      .eq("is_published", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("episodes")
      .select(EPISODE_COLUMNS)
      .eq("course_id", courseId)
      .eq("is_published", true)
      .order("sort_order", { ascending: true }),
  ]);

  const [resolvedCourse, resolvedEpisodes] = await Promise.all([
    resolveCourseCover(mapCourse(course as CourseRow)),
    Promise.all(((episodes as EpisodeRow[]) ?? []).map(mapEpisode).map(resolveEpisodeVideo)),
  ]);
  const tree = buildSectionTree(
    ((sections as SectionRow[]) ?? []).map(mapSection),
    resolvedEpisodes
  );
  return { ...resolvedCourse, sections: tree };
}

export async function getCourseBySlug(
  slug: string
): Promise<CourseWithSections | null> {
  const supabase = getSupabaseRSC();
  const { data: course, error } = await supabase
    .from("courses")
    .select(
      "id, slug, title, tagline, description, cover_image_url, course_video_url, level, duration_min, is_free, is_published, sort_order, created_at, updated_at"
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error || !course) return null;

  const courseId = (course as CourseRow).id;

  const [{ data: sections }, { data: episodes }] = await Promise.all([
    supabase
      .from("course_sections")
      .select(SECTION_COLUMNS)
      .eq("course_id", courseId)
      .eq("is_published", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("episodes")
      .select(EPISODE_COLUMNS)
      .eq("course_id", courseId)
      .eq("is_published", true)
      .order("sort_order", { ascending: true }),
  ]);

  const [resolvedCourse, resolvedEpisodes] = await Promise.all([
    resolveCourseCover(mapCourse(course as CourseRow)),
    Promise.all(((episodes as EpisodeRow[]) ?? []).map(mapEpisode).map(resolveEpisodeVideo)),
  ]);
  const tree = buildSectionTree(
    ((sections as SectionRow[]) ?? []).map(mapSection),
    resolvedEpisodes
  );
  return { ...resolvedCourse, sections: tree };
}

export async function getEpisode(
  courseSlug: string,
  episodeSlug: string
): Promise<{
  course: Course;
  episode: Episode;
  section: Section;
  content: EpisodeContent;
} | null> {
  const supabase = getSupabaseRSC();
  const { data: course } = await supabase
    .from("courses")
    .select(
      "id, slug, title, tagline, description, cover_image_url, course_video_url, level, duration_min, is_free, is_published, sort_order, created_at, updated_at"
    )
    .eq("slug", courseSlug)
    .eq("is_published", true)
    .maybeSingle();
  if (!course) return null;

  const { data: episode } = await supabase
    .from("episodes")
    .select(EPISODE_COLUMNS)
    .eq("course_id", (course as CourseRow).id)
    .eq("slug", episodeSlug)
    .eq("is_published", true)
    .maybeSingle();
  if (!episode) return null;

  const episodeRow = episode as EpisodeRow;

  const [{ data: section }, { data: content }] = await Promise.all([
    supabase
      .from("course_sections")
      .select(SECTION_COLUMNS)
      .eq("id", episodeRow.section_id)
      .maybeSingle(),
    supabase
      .from("episode_content")
      .select("episode_id, body_md, quiz, lab, visual, data")
      .eq("episode_id", episodeRow.id)
      .maybeSingle(),
  ]);

  // Section row should always exist (NOT NULL FK), but defend against
  // RLS-trimmed reads with a defensive null bail.
  if (!section) return null;

  const mappedContent: EpisodeContent = content
    ? {
        episodeId: (content as { episode_id: number }).episode_id,
        bodyMd: (content as { body_md: string | null }).body_md,
        quiz: (content as { quiz: EpisodeContent["quiz"] }).quiz,
        lab: (content as { lab: EpisodeContent["lab"] }).lab,
        visual: (content as { visual: EpisodeContent["visual"] }).visual,
        data: (content as { data: EpisodeContent["data"] }).data,
      }
    : {
        episodeId: episodeRow.id,
        bodyMd: null,
        quiz: null,
        lab: null,
        visual: null,
        data: null,
      };

  const [resolvedCourse, resolvedEpisode] = await Promise.all([
    resolveCourseCover(mapCourse(course as CourseRow)),
    resolveEpisodeVideo(mapEpisode(episodeRow)),
  ]);
  return {
    course: resolvedCourse,
    episode: resolvedEpisode,
    section: mapSection(section as SectionRow),
    content: mappedContent,
  };
}

/**
 * Aggregate per-course completion counts for a single user across the
 * entire published catalogue. One round-trip for episodes, one for the
 * user's progress rows. Returns a Map keyed by course id; missing courses
 * imply zero progress.
 */
export async function getProgressByCourseForUser(
  userId: string
): Promise<Map<number, { completed: number; total: number }>> {
  const supabase = getSupabaseRSC();

  const { data: episodes } = await supabase
    .from("episodes")
    .select("id, course_id")
    .eq("is_published", true);

  const byCourse = new Map<number, { ids: Set<number> }>();
  for (const row of (episodes as { id: number; course_id: number }[]) ?? []) {
    const existing = byCourse.get(row.course_id);
    if (existing) existing.ids.add(row.id);
    else byCourse.set(row.course_id, { ids: new Set([row.id]) });
  }

  const allEpisodeIds: number[] = [];
  for (const { ids } of byCourse.values()) {
    for (const id of ids) allEpisodeIds.push(id);
  }
  if (allEpisodeIds.length === 0) return new Map();

  const { data: progress } = await supabase
    .from("episode_progress")
    .select("episode_id")
    .eq("user_id", userId)
    .in("episode_id", allEpisodeIds);

  const completedIds = new Set(
    ((progress as { episode_id: number }[]) ?? []).map((r) => r.episode_id)
  );

  const out = new Map<number, { completed: number; total: number }>();
  for (const [courseId, { ids }] of byCourse.entries()) {
    let completed = 0;
    for (const id of ids) if (completedIds.has(id)) completed += 1;
    out.set(courseId, { completed, total: ids.size });
  }
  return out;
}

/** Returns the set of episode IDs the current user has completed in a course. */
export async function getCourseProgress(
  userId: string,
  courseId: number
): Promise<Set<number>> {
  const supabase = getSupabaseRSC();
  const { data } = await supabase
    .from("episode_progress")
    .select("episode_id, episodes!inner(course_id)")
    .eq("user_id", userId)
    .eq("episodes.course_id", courseId);

  const completed = new Set<number>();
  for (const row of (data as { episode_id: number }[]) ?? []) {
    completed.add(row.episode_id);
  }
  return completed;
}

/**
 * Mutable per-(user, episode) UI state. Returns null when the user
 * hasn't interacted with the episode yet — caller should treat that as
 * defaults (no resume, no reads, no seen cards).
 */
export async function getEpisodeState(
  userId: string,
  episodeId: number
): Promise<EpisodeState | null> {
  const supabase = getSupabaseRSC();
  const { data } = await supabase
    .from("episode_state")
    .select(
      "user_id, episode_id, video_position_seconds, resources_read, flashcards_seen, flashcards_index, quiz_state, code_draft, fill_state, lab_state, updated_at"
    )
    .eq("user_id", userId)
    .eq("episode_id", episodeId)
    .maybeSingle();

  if (!data) return null;
  const row = data as {
    user_id: string;
    episode_id: number;
    video_position_seconds: number | null;
    resources_read: unknown;
    flashcards_seen: unknown;
    flashcards_index: number | null;
    quiz_state: unknown;
    code_draft: string | null;
    fill_state: unknown;
    lab_state: unknown;
    updated_at: string;
  };

  function asQuizState(v: unknown): EpisodeState["quizState"] {
    if (!v || typeof v !== "object") return null;
    const o = v as { picks?: unknown; submitted?: unknown; score?: unknown };
    return {
      picks: (o.picks as Record<number, number[]>) ?? {},
      submitted: !!o.submitted,
      score: typeof o.score === "number" ? o.score : null,
    };
  }
  function asFillState(v: unknown): EpisodeState["fillState"] {
    if (!v || typeof v !== "object") return null;
    const o = v as { answers?: unknown; submitted?: unknown };
    return {
      answers: Array.isArray(o.answers) ? (o.answers as string[]) : [],
      submitted: !!o.submitted,
    };
  }
  function asLabState(v: unknown): EpisodeState["labState"] {
    if (!v || typeof v !== "object") return null;
    const o = v as { hintsOpen?: unknown; solutionOpen?: unknown };
    return {
      hintsOpen: Array.isArray(o.hintsOpen) ? (o.hintsOpen as number[]) : [],
      solutionOpen: !!o.solutionOpen,
    };
  }

  return {
    userId: row.user_id,
    episodeId: row.episode_id,
    videoPositionSeconds:
      row.video_position_seconds === null
        ? null
        : Number(row.video_position_seconds),
    resourcesRead: Array.isArray(row.resources_read)
      ? (row.resources_read as string[])
      : [],
    flashcardsSeen: Array.isArray(row.flashcards_seen)
      ? (row.flashcards_seen as number[])
      : [],
    flashcardsIndex: row.flashcards_index,
    quizState: asQuizState(row.quiz_state),
    codeDraft: row.code_draft,
    fillState: asFillState(row.fill_state),
    labState: asLabState(row.lab_state),
    updatedAt: row.updated_at,
  };
}

/**
 * Bulk enrollment lookup — returns the set of course ids the user is
 * enrolled in. One round-trip; the catalogue list page calls this so it
 * can render an "enroll" CTA for un-enrolled courses instead of a "not
 * started · 0%" progress bar that implies they've already opted in.
 */
export async function getEnrolledCourseIds(
  userId: string
): Promise<Set<number>> {
  const supabase = getSupabaseRSC();
  const { data, error } = await supabase
    .from("course_enrollments")
    .select("course_id")
    .eq("user_id", userId);
  if (error) {
    console.error("[courses.getEnrolledCourseIds]", error);
    return new Set();
  }
  return new Set(
    ((data as { course_id: number }[]) ?? []).map((r) => r.course_id)
  );
}

/** Returns the user's enrollment row for a course, or null if not enrolled. */
export async function getCourseEnrollment(
  userId: string,
  courseId: number
): Promise<Enrollment | null> {
  const supabase = getSupabaseRSC();
  const { data } = await supabase
    .from("course_enrollments")
    .select("user_id, course_id, enrolled_at")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (!data) return null;
  const row = data as { user_id: string; course_id: number; enrolled_at: string };
  return { userId: row.user_id, courseId: row.course_id, enrolledAt: row.enrolled_at };
}

export async function getEpisodeProgress(
  userId: string,
  episodeId: number
): Promise<EpisodeProgress | null> {
  const supabase = getSupabaseRSC();
  const { data } = await supabase
    .from("episode_progress")
    .select("user_id, episode_id, completed_at, quiz_score")
    .eq("user_id", userId)
    .eq("episode_id", episodeId)
    .maybeSingle();

  if (!data) return null;
  const row = data as {
    user_id: string;
    episode_id: number;
    completed_at: string;
    quiz_score: number | null;
  };
  return {
    userId: row.user_id,
    episodeId: row.episode_id,
    completedAt: row.completed_at,
    quizScore: row.quiz_score,
  };
}

export async function getUserCertificates(
  userId: string
): Promise<(Certificate & { course: Course })[]> {
  const supabase = getSupabaseRSC();
  const { data } = await supabase
    .from("course_certificates")
    .select(
      "id, user_id, course_id, issued_at, courses!inner(id, slug, title, tagline, description, cover_image_url, course_video_url, level, duration_min, is_free, is_published, sort_order, created_at, updated_at)"
    )
    .eq("user_id", userId)
    .order("issued_at", { ascending: false });

  return ((data as unknown as Array<{
    id: string;
    user_id: string;
    course_id: number;
    issued_at: string;
    courses: CourseRow;
  }>) ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    courseId: row.course_id,
    issuedAt: row.issued_at,
    course: mapCourse(row.courses),
  }));
}

/**
 * Service-role enumeration of every issued certificate. Sitemap uses this
 * to surface the public credential URLs (`/certificates/<id>`) for crawlers.
 * Bypasses RLS — the cert id itself is the unguessable secret, same model
 * as `getCertificateById` below.
 *
 * Returns `id` + `issuedAt` only because that's all the sitemap needs;
 * other surfaces should keep using `getCertificateById` for the full row.
 */
export async function getAllCertificatesPublic(): Promise<
  Array<{ id: string; issuedAt: string }>
> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("course_certificates")
    .select("id, issued_at")
    .order("issued_at", { ascending: false });
  if (error) {
    console.error("[courses.getAllCertificatesPublic]", error);
    return [];
  }
  return ((data as Array<{ id: string; issued_at: string }>) ?? []).map(
    (row) => ({ id: row.id, issuedAt: row.issued_at })
  );
}

/**
 * Public certificate lookup by id. Uses the service-role client because the
 * `course_certificates` row is only SELECT-able by its owner under RLS, but
 * we want the cert URL to be publicly shareable. Service role bypasses RLS
 * and returns the row by the unguessable id.
 *
 * Owner name is read from `auth.users.user_metadata` via the auth admin API
 * (no `profiles` table to JOIN against — we don't keep one).
 */
export async function getCertificateById(
  certId: string
): Promise<(Certificate & { course: Course; ownerName: string | null }) | null> {
  const supabase = getSupabaseServer();
  const { data } = await supabase
    .from("course_certificates")
    .select(
      "id, user_id, course_id, issued_at, courses!inner(id, slug, title, tagline, description, cover_image_url, course_video_url, level, duration_min, is_free, is_published, sort_order, created_at, updated_at)"
    )
    .eq("id", certId)
    .maybeSingle();

  if (!data) return null;
  const row = data as unknown as {
    id: string;
    user_id: string;
    course_id: number;
    issued_at: string;
    courses: CourseRow;
  };

  let ownerName: string | null = null;
  try {
    const { data: userResult } = await supabase.auth.admin.getUserById(
      row.user_id
    );
    const meta = (userResult.user?.user_metadata ?? {}) as {
      full_name?: string;
      name?: string;
    };
    ownerName = meta.full_name ?? meta.name ?? null;
  } catch (err) {
    console.error("[courses.getCertificateById] auth lookup", err);
  }

  return {
    id: row.id,
    userId: row.user_id,
    courseId: row.course_id,
    issuedAt: row.issued_at,
    course: await resolveCourseCover(mapCourse(row.courses)),
    ownerName,
  };
}
