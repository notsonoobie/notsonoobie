// TS shapes mirroring the Supabase schema in docs/courses-setup.md. Kept
// hand-written rather than generated so the file stays readable and there's
// no codegen step in the build.

export type EpisodeKind =
  | "lesson"
  | "quiz"
  | "lab"
  | "visual"
  | "code"
  | "fill"
  | "flashcards"
  | "resources"
  | "exam";

export type Course = {
  id: number;
  slug: string;
  title: string;
  tagline: string | null;
  description: string | null;
  /** Always shown on the course list and as a poster on the detail
   * page — also gates whether `courseVideoUrl` is allowed. */
  coverImageUrl: string | null;
  /** Optional intro video for the course detail page. Only ever
   * populated alongside `coverImageUrl`; the list view never plays it,
   * always falling back to the banner. */
  courseVideoUrl: string | null;
  level: string | null;
  durationMin: number | null;
  isFree: boolean;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type Episode = {
  id: number;
  courseId: number;
  sectionId: number;
  slug: string;
  title: string;
  description: string | null;
  kind: EpisodeKind;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  /**
   * Optional intro video. Resolved to a renderable URL by the query layer:
   * - `null` if not set on the row
   * - direct `https://…` if stored as an external URL
   * - presigned S3 GET URL if stored as an S3 key
   */
  videoUrl: string | null;
};

/**
 * Sections (chapters) group episodes inside a course. The
 * `episodes.course_id` FK is preserved so course-scoped queries stay
 * trivial; `section_id` is the new grouping axis. Section sort_order
 * orders sections within a course; episode sort_order orders episodes
 * within a section.
 */
export type Section = {
  id: number;
  courseId: number;
  slug: string;
  title: string;
  description: string | null;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SectionWithEpisodes = Section & {
  episodes: Episode[];
};

export type QuizQuestion = {
  question: string;
  options: string[];
  /** Single correct = number; multi-select = number[] (strict scoring). */
  correct: number | number[];
  explanation?: string;
};

export type LabContent = {
  instructions_md: string;
  hints?: string[];
  solution_md?: string;
};

export type VisualContent = {
  kind: "svg" | "image";
  src: string;
  alt: string;
  caption?: string;
};

/**
 * Code exercise with author-provided starter code, prompt, and a validation
 * pattern. The validator runs entirely client-side: regex match (preferred)
 * or substring check against the user's edited code. Designed for syntactic
 * verification (e.g. "your code must include `producer.send`") — full
 * runtime sandboxing is out of scope for v1.
 */
export type CodeContent = {
  language: string; // 'ts' | 'py' | 'sql' | 'sh' — for syntax-highlight label
  prompt_md: string; // markdown rendered above the editor
  starter: string; // pre-filled code in the textarea
  /**
   * Validation. Either { type: 'regex', pattern, flags? } or
   * { type: 'substring', value } or { type: 'all', items: [...] } for AND.
   */
  validate:
    | { type: "regex"; pattern: string; flags?: string; hint?: string }
    | { type: "substring"; value: string; hint?: string }
    | {
        type: "all";
        items: Array<
          | { type: "regex"; pattern: string; flags?: string }
          | { type: "substring"; value: string }
        >;
        hint?: string;
      };
  solution?: string; // optional reveal-able solution
};

/**
 * Fill-in-the-blank cloze. The `text` carries `{{0}}`, `{{1}}`, ... markers
 * that are replaced with input fields. `blanks[i]` is the array of accepted
 * answers for blank `i` (case-insensitive, trimmed match).
 */
export type FillContent = {
  prompt_md?: string;
  text: string;
  blanks: string[][];
  explanation_md?: string;
};

/** Flashcards deck: simple front/back pairs. Markdown allowed in both. */
export type FlashcardsContent = {
  prompt_md?: string;
  cards: Array<{ front: string; back: string }>;
};

/** Curated resource list. Track read-state in localStorage by episode + url. */
export type ResourcesContent = {
  prompt_md?: string;
  items: Array<{
    title: string;
    url: string;
    description?: string;
    type?: "doc" | "paper" | "video" | "tool" | "repo" | "article";
    estimate?: string; // "10 min read", "20 min talk"
  }>;
};

/**
 * Final assessment. Same question shape as QuizContent, plus a passing
 * score threshold. Episode is only marked complete on pass — fail counts
 * as no progress and the user can retry.
 */
export type ExamContent = {
  prompt_md?: string;
  passing_score: number; // 0..100
  time_limit_min?: number; // optional countdown
  questions: QuizQuestion[];
};

export type EpisodeContent = {
  episodeId: number;
  bodyMd: string | null;
  quiz: QuizQuestion[] | null;
  lab: LabContent | null;
  visual: VisualContent | null;
  /**
   * Generic JSON column for kinds added after v1. Each kind reads its own
   * shape from here (CodeContent, FillContent, ...). Keeps the schema flat
   * without adding a new column per future kind.
   */
  data:
    | CodeContent
    | FillContent
    | FlashcardsContent
    | ResourcesContent
    | ExamContent
    | null;
};

export type EpisodeProgress = {
  userId: string;
  episodeId: number;
  completedAt: string;
  quizScore: number | null;
};

/** Snapshot of an in-progress quiz/exam attempt. `picks` is keyed by
 * question index → array of selected option indexes (multi-select
 * questions can have multiple). */
export type QuizState = {
  picks: Record<number, number[]>;
  submitted: boolean;
  score: number | null;
};

/** Snapshot of an in-progress fill-in-the-blank attempt. `answers`
 * indexed by blank position. */
export type FillState = {
  answers: string[];
  submitted: boolean;
};

/** Lab-specific UI: which hints the user opened, whether the solution
 * has been revealed. */
export type LabState = {
  hintsOpen: number[];
  solutionOpen: boolean;
};

/** Mutable per-(user, episode) UI state — distinct from EpisodeProgress
 * which is the immutable completion fact. Holds every piece of in-
 * progress interaction so a user picking up on another device sees the
 * exact same state. */
export type EpisodeState = {
  userId: string;
  episodeId: number;
  videoPositionSeconds: number | null;
  resourcesRead: string[];
  flashcardsSeen: number[];
  flashcardsIndex: number | null;
  quizState: QuizState | null;
  codeDraft: string | null;
  fillState: FillState | null;
  labState: LabState | null;
  updatedAt: string;
};

export type CourseWithSections = Course & {
  sections: SectionWithEpisodes[];
};

/**
 * Walks the section tree in display order and returns a flat episode
 * array. Used by code paths that don't care about grouping (prev/next
 * walking, total counts, first-uncompleted lookup).
 */
export function flattenEpisodes(course: CourseWithSections): Episode[] {
  return course.sections.flatMap((s) => s.episodes);
}

export type CourseProgressSummary = {
  course: Course;
  total: number;
  completed: number;
  completedEpisodeIds: Set<number>;
};

export type Certificate = {
  id: string;
  userId: string;
  courseId: number;
  issuedAt: string;
};

export type Enrollment = {
  userId: string;
  courseId: number;
  enrolledAt: string;
};
