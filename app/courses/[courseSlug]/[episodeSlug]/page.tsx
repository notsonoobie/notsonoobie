import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { EpisodeJsonLd } from "@/components/seo/EpisodeJsonLd";
import { Breadcrumbs } from "@/components/courses/Breadcrumbs";
import { EpisodeKindBadge } from "@/components/courses/EpisodeKindBadge";
import { LessonBody } from "@/components/courses/LessonBody";
import { EpisodeMarkdown } from "@/components/courses/EpisodeMarkdown";
import { LessonCompleteButton } from "@/components/courses/LessonCompleteButton";
import { QuizBlock } from "@/components/courses/QuizBlock";
import { LabBlock } from "@/components/courses/LabBlock";
import { VisualBlock } from "@/components/courses/VisualBlock";
import { CodeExercise } from "@/components/courses/CodeExercise";
import { FillBlanks } from "@/components/courses/FillBlanks";
import { Flashcards } from "@/components/courses/Flashcards";
import { Resources } from "@/components/courses/Resources";
import { Exam } from "@/components/courses/Exam";
import { EpisodeVideo } from "@/components/courses/EpisodeVideo";
import { CompletionCard } from "@/components/courses/CompletionCard";
import type {
  CodeContent,
  ExamContent,
  FillContent,
  FlashcardsContent,
  ResourcesContent,
} from "@/lib/courses/types";
import { flattenEpisodes } from "@/lib/courses/types";
import {
  getCourseBySlug,
  getCourseEnrollment,
  getCourseProgress,
  getEpisode,
  getEpisodeProgress,
  getEpisodeState,
  getUserCertificates,
} from "@/lib/courses/queries";
import { getUser } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Params = Promise<{ courseSlug: string; episodeSlug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { courseSlug, episodeSlug } = await params;
  const result = await getEpisode(courseSlug, episodeSlug);
  if (!result) return { title: "Episode not found" };
  const { episode, course, section } = result;

  const url = `${SITE_URL}/courses/${course.slug}/${episode.slug}`;
  const description = episode.description ?? course.tagline ?? course.title;
  const title = `${episode.title} · ${course.title}`;
  // Per-episode OG lives at app/courses/[courseSlug]/[episodeSlug]/opengraph-image.tsx.
  // The proxy lets the 4-segment URL through (only 3-segment episode
  // URLs are auth-gated). Setting an explicit absolute URL so unfurlers
  // get a canonical reference.
  const ogImage = `${url}/opengraph-image`;

  return {
    title,
    description,
    alternates: { canonical: url },
    // `noindex, follow`: crawlers shouldn't index gated content, but
    // following internal links is fine — they'll hit the course detail
    // page (publicly indexable) and be reached for ranking from there.
    // Indexing-off prevents the "rank for query → deliver login wall"
    // SEO-poison pattern.
    robots: { index: false, follow: true },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      section: course.title,
      tags: [section.title, episode.kind],
      publishedTime: episode.createdAt,
      modifiedTime: episode.updatedAt,
      images: [{ url: ogImage, width: 1200, height: 630, alt: episode.title }],
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

export default async function EpisodePage({
  params,
}: {
  params: Params;
}) {
  const { courseSlug, episodeSlug } = await params;

  const user = await getUser();
  if (!user) {
    const next = encodeURIComponent(`/courses/${courseSlug}/${episodeSlug}`);
    redirect(`/login?next=${next}`);
  }

  const result = await getEpisode(courseSlug, episodeSlug);
  if (!result) notFound();
  const { course, episode, section, content } = result;

  // Enrollment gate. Anyone on this URL has signed in (proxy redirected
  // them otherwise) but they need an enrollment row to access episodes.
  const enrollment = await getCourseEnrollment(user.id, course.id);
  if (!enrollment) {
    redirect(`/courses/${course.slug}#enroll`);
  }

  // Sibling lookup for prev/next + progress aggregation. Walks the
  // flattened section tree so prev/next crosses section boundaries
  // naturally — same array semantics as the pre-sections build.
  const fullCourse = await getCourseBySlug(courseSlug);
  const episodes = fullCourse ? flattenEpisodes(fullCourse) : [];
  const idx = episodes.findIndex((e) => e.id === episode.id);
  const prev = idx > 0 ? episodes[idx - 1] : null;
  const next = idx >= 0 && idx < episodes.length - 1 ? episodes[idx + 1] : null;

  const completedIds = await getCourseProgress(user.id, course.id);
  const myProgress = await getEpisodeProgress(user.id, episode.id);
  const myState = await getEpisodeState(user.id, episode.id);
  const certs = await getUserCertificates(user.id);
  const cert = certs.find((c) => c.courseId === course.id) ?? null;

  // Total/completed count includes this episode optimistically once user
  // marks it done in the client, but for the server-rendered card we report
  // pre-action numbers. The client blocks update their own UI on POST.
  const total = episodes.length;
  const completed = episodes.filter((e) => completedIds.has(e.id)).length;
  const isComplete = total > 0 && completed === total;

  // Pre-render every markdown field on the server so block components below
  // (which are client components) receive ready-to-mount React trees with
  // Shiki syntax highlighting + the shared CodeBlock chrome already applied.
  // Shiki never lands in the client bundle this way.
  // - `md` for long-form surfaces (lesson body, lab instructions, prompts).
  // - `mdInline` for short-form surfaces (quiz / exam / hints): drops the
  //   drop cap and shrinks heading scale so a single sentence doesn't
  //   render with editorial chrome.
  const md = (s: string | null | undefined) =>
    s ? <EpisodeMarkdown source={s} /> : null;
  const mdInline = (s: string | null | undefined) =>
    s ? <EpisodeMarkdown source={s} compact /> : null;

  return (
    <>
      <EpisodeJsonLd
        course={course}
        episode={episode}
        sectionTitle={section.title}
        position={idx + 1}
        total={total}
      />
      <article className="relative">
        {/* Hero */}
        <header className="relative overflow-hidden border-b border-line">
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 70% 100% at 50% 0%, color-mix(in oklab, var(--color-cyan) 10%, transparent) 0%, transparent 70%)",
            }}
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-grid bg-grid-fade opacity-25 pointer-events-none"
          />
          <div className="relative mx-auto max-w-3xl px-6 md:px-10 pt-24 md:pt-28 pb-10">
            <Breadcrumbs
              className="mb-5"
              items={[
                { href: "/courses", label: "courses" },
                { href: `/courses/${course.slug}`, label: course.title },
                // Section is a grouping, not a routable URL — we render
                // the label without an href so it appears as a plain
                // crumb between the course and the episode leaf. Same
                // pattern as the BreadcrumbList JSON-LD below.
                { label: section.title },
                { label: episode.title },
              ]}
            />

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <EpisodeKindBadge kind={episode.kind} />
              <span className="font-mono text-[10.5px] text-ink-faint tracking-[0.2em] uppercase">
                episode {String(idx + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
              </span>
            </div>

            <div className="font-mono text-[10.5px] text-cyan tracking-[0.22em] uppercase mb-3">
              {`// ${section.title}`}
            </div>

            <h1 className="font-display text-[clamp(2rem,5.5vw,2.75rem)] leading-[1.05] tracking-[-0.02em] font-semibold">
              {episode.title}
            </h1>
            {episode.description && (
              <p className="mt-4 text-ink-dim text-base leading-relaxed">
                {episode.description}
              </p>
            )}
          </div>
        </header>

        {/* Body */}
        <div className="relative mx-auto max-w-3xl px-6 md:px-10 py-12 md:py-16">
          {/* Optional intro video — sits above whatever the kind dispatch
              renders below, so a `lesson` with a video reads as
              [video] → [lesson markdown], a `lab` reads as
              [video] → [instructions], etc. */}
          {episode.videoUrl && (
            <>
              <div className="font-mono text-[10.5px] text-cyan tracking-[0.22em] uppercase mb-3">
                {"// video"}
              </div>
              <EpisodeVideo
                videoUrl={episode.videoUrl}
                poster={course.coverImageUrl}
                episodeId={episode.id}
                initialPositionSeconds={myState?.videoPositionSeconds ?? null}
                title={episode.title}
                eyebrow={`${course.title} · episode ${String(idx + 1).padStart(2, "0")}`}
              />
            </>
          )}

          {episode.kind === "lesson" && content.bodyMd && (
            <>
              <LessonBody source={content.bodyMd} />
              <div className="mt-12 pt-6 border-t border-line">
                <LessonCompleteButton
                  episodeId={episode.id}
                  initiallyCompleted={!!myProgress}
                />
              </div>
            </>
          )}

          {episode.kind === "quiz" && content.quiz && (
            <QuizBlock
              episodeId={episode.id}
              questions={content.quiz.map((q) => ({
                question: mdInline(q.question)!,
                options: q.options.map((o) => mdInline(o)!),
                explanation: mdInline(q.explanation),
                correct: q.correct,
              }))}
              initiallyCompleted={!!myProgress}
              initialScore={myProgress?.quizScore ?? null}
              initialState={myState?.quizState ?? null}
            />
          )}

          {episode.kind === "lab" && content.lab && (
            <LabBlock
              episodeId={episode.id}
              instructions={md(content.lab.instructions_md)!}
              hints={(content.lab.hints ?? []).map((h) => mdInline(h)!)}
              solution={md(content.lab.solution_md)}
              initiallyCompleted={!!myProgress}
              initialState={myState?.labState ?? null}
            />
          )}

          {episode.kind === "visual" && content.visual && (
            <>
              <VisualBlock visual={content.visual} />
              <div className="mt-12 pt-6 border-t border-line">
                <LessonCompleteButton
                  episodeId={episode.id}
                  initiallyCompleted={!!myProgress}
                />
              </div>
            </>
          )}

          {episode.kind === "code" && content.data && (() => {
            const code = content.data as CodeContent;
            // Synthesise a fenced markdown block so the solution flows
            // through the same Shiki + CodeBlock pipeline as everything else
            // and inherits language label / copy button automatically.
            const solutionMd = code.solution
              ? "```" + (code.language || "") + "\n" + code.solution + "\n```"
              : null;
            return (
              <CodeExercise
                episodeId={episode.id}
                content={code}
                prompt={md(code.prompt_md)}
                solution={md(solutionMd)}
                initiallyCompleted={!!myProgress}
                initialDraft={myState?.codeDraft ?? null}
              />
            );
          })()}

          {episode.kind === "fill" && content.data && (() => {
            const fill = content.data as FillContent;
            return (
              <FillBlanks
                episodeId={episode.id}
                content={fill}
                prompt={mdInline(fill.prompt_md)}
                explanation={mdInline(fill.explanation_md)}
                initiallyCompleted={!!myProgress}
                initialState={myState?.fillState ?? null}
              />
            );
          })()}

          {episode.kind === "flashcards" && content.data && (() => {
            const deck = content.data as FlashcardsContent;
            return (
              <Flashcards
                episodeId={episode.id}
                prompt={mdInline(deck.prompt_md)}
                cards={(deck.cards ?? []).map((c) => ({
                  front: mdInline(c.front)!,
                  back: mdInline(c.back)!,
                }))}
                initiallyCompleted={!!myProgress}
                initialSeenIndexes={myState?.flashcardsSeen ?? []}
                initialIndex={myState?.flashcardsIndex ?? null}
              />
            );
          })()}

          {episode.kind === "resources" && content.data && (
            <Resources
              episodeId={episode.id}
              content={content.data as ResourcesContent}
              prompt={mdInline((content.data as ResourcesContent).prompt_md)}
              initiallyCompleted={!!myProgress}
              initialReadUrls={myState?.resourcesRead ?? []}
            />
          )}

          {episode.kind === "exam" && content.data && (() => {
            const exam = content.data as ExamContent;
            return (
              <Exam
                episodeId={episode.id}
                content={exam}
                prompt={md(exam.prompt_md)}
                questions={(exam.questions ?? []).map((q) => ({
                  question: mdInline(q.question)!,
                  options: q.options.map((o) => mdInline(o)!),
                  explanation: mdInline(q.explanation),
                  correct: q.correct,
                }))}
                initiallyCompleted={!!myProgress}
                initialScore={myProgress?.quizScore ?? null}
                initialState={myState?.quizState ?? null}
              />
            );
          })()}

          {/* Completion card — only shows the "ready" state after the
              entire course is done. Until then it gives a remaining count. */}
          <div className="mt-10">
            <CompletionCard
              courseTitle={course.title}
              certificateId={cert?.id ?? null}
              isComplete={isComplete}
              remaining={Math.max(0, total - completed)}
            />
          </div>

          {/* Prev / next */}
          <nav className="mt-10 grid gap-3 md:grid-cols-2">
            {prev ? (
              <Link
                href={`/courses/${course.slug}/${prev.slug}`}
                className="group rounded-xl hairline bg-canvas-2/40 hover:bg-canvas-2/70 p-4 transition-colors"
              >
                <div className="font-mono text-[10.5px] text-ink-faint tracking-[0.22em] uppercase flex items-center gap-1.5 mb-1.5">
                  <ArrowLeft className="size-3" strokeWidth={2} />
                  previous
                </div>
                <div className="text-ink text-sm font-medium group-hover:text-cyan transition-colors line-clamp-2">
                  {prev.title}
                </div>
              </Link>
            ) : (
              <div />
            )}
            {next ? (
              <Link
                href={`/courses/${course.slug}/${next.slug}`}
                className="group rounded-xl hairline bg-canvas-2/40 hover:bg-canvas-2/70 p-4 transition-colors text-right"
              >
                <div className="font-mono text-[10.5px] text-ink-faint tracking-[0.22em] uppercase flex items-center gap-1.5 mb-1.5 justify-end">
                  next
                  <ArrowRight className="size-3" strokeWidth={2} />
                </div>
                <div className="text-ink text-sm font-medium group-hover:text-cyan transition-colors line-clamp-2">
                  {next.title}
                </div>
              </Link>
            ) : (
              <div />
            )}
          </nav>
        </div>
      </article>
    </>
  );
}
