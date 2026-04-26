import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

import { profile, products, experience, skills, expertise, stats } from "@/lib/data";
import { SITE_URL } from "@/lib/seo";
import { chunkMarkdown, type Chunk } from "@/lib/assistant/chunker";
import { EMBEDDING_DIM, EMBEDDING_MODEL } from "@/lib/gemini";

/**
 * Reusable indexer for the assistant RAG corpus.
 *
 *   • indexAll(...)        — full reindex, used by the nightly cron.
 *   • indexSource(...)     — incremental reindex for a single source
 *                            (blog, course, episode, etc.), used by
 *                            Supabase webhooks on row changes.
 *   • deleteSource(...)    — wipe a source's chunks; used when the
 *                            content row is deleted upstream.
 *
 * The CLI script `scripts/build-assistant-index.ts` is a thin
 * wrapper around `indexAll()` that also loads `.env` for local dev.
 */

// Loose typing — the helpers don't rely on schema generics, and the
// strict types break when callers pass differently-parameterised
// SupabaseClients (script uses createClient directly, API route uses
// the cookie-aware getSupabaseServer).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any, any, any, any, any>;

export type SourceType =
  | "profile"
  | "product"
  | "experience"
  | "blog"
  | "course"
  | "episode";

export type Doc = {
  source_type: SourceType;
  source_key: string;
  title: string;
  url: string | null;
  body: string;
};

// ─────────────────────────────────────────────────────────────────
// Doc generators — pure functions for the static parts (profile,
// products, experience), DB-fetching for blogs / courses / episodes.
// ─────────────────────────────────────────────────────────────────

export function profileDocs(): Doc[] {
  const docs: Doc[] = [];

  // Bio
  const bio: string[] = [
    `# About ${profile.name}`,
    ``,
    `**Title**: ${profile.title}`,
    `**Tagline**: ${profile.tagline}`,
    `**Location**: ${profile.location}`,
    `**Availability**: ${profile.availability}`,
    ``,
    `## Summary`,
    profile.summary,
  ];
  docs.push({
    source_type: "profile",
    source_key: "bio",
    title: `${profile.name} — Bio`,
    url: SITE_URL,
    body: bio.join("\n"),
  });

  // Contact
  const contact: string[] = [
    `# How to contact ${profile.name}`,
    ``,
    `- Email: ${profile.email}`,
    `- Phone: ${profile.phone}`,
    `- LinkedIn: ${profile.linkedin}`,
    `- GitHub: ${profile.github}`,
    `- Cal.com (book a 15-min slot): ${profile.cal}`,
    ``,
    `## Resume`,
    `- PDF: ${SITE_URL}${profile.resumePdf}`,
    `- DOCX: ${SITE_URL}${profile.resumeDocx}`,
    `- JSON: ${SITE_URL}/resume/json`,
  ];
  docs.push({
    source_type: "profile",
    source_key: "contact",
    title: `${profile.name} — Contact + Resume`,
    url: SITE_URL,
    body: contact.join("\n"),
  });

  // Stats
  const statsLines: string[] = [
    `# ${profile.name} — Track record at a glance`,
    ``,
    ...stats.map((s) => `- ${s.value}${s.suffix ?? ""} ${s.label}`),
  ];
  docs.push({
    source_type: "profile",
    source_key: "stats",
    title: `${profile.name} — Stats`,
    url: SITE_URL,
    body: statsLines.join("\n"),
  });

  // Expertise
  const exp: string[] = [`# ${profile.name} — Areas of expertise`, ``];
  for (const e of expertise) {
    exp.push(`## ${e.title}`);
    exp.push(e.body);
    exp.push(``);
  }
  docs.push({
    source_type: "profile",
    source_key: "expertise",
    title: `${profile.name} — Expertise`,
    url: SITE_URL,
    body: exp.join("\n"),
  });

  // Skills — one chunk per group
  for (const group of skills) {
    const lines = [
      `# ${profile.name} — Skills: ${group.label}`,
      ``,
      group.items.map((i) => `- ${i}`).join("\n"),
    ];
    docs.push({
      source_type: "profile",
      source_key: `skills-${group.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      title: `${profile.name} — ${group.label}`,
      url: SITE_URL,
      body: lines.join("\n"),
    });
  }

  return docs;
}

export function productDocs(): Doc[] {
  return products.map((p) => ({
    source_type: "product" as const,
    source_key: p.id,
    title: p.name,
    url: `${SITE_URL}#products`,
    body: [
      `# ${p.name}`,
      ``,
      `**Tagline**: ${p.tagline}`,
      `**Role**: ${p.role}`,
      ``,
      p.lead,
      ``,
      `## Highlights`,
      ...p.highlights.map((h) => `- ${h}`),
      ``,
      `## Tech`,
      p.tech.join(", "),
    ].join("\n"),
  }));
}

export function experienceDocs(): Doc[] {
  return experience.map((role, idx) => ({
    source_type: "experience" as const,
    source_key: `experience-${idx}`,
    title: `${role.title} · ${role.company}`,
    url: `${SITE_URL}#experience`,
    body: [
      `# ${role.title} — ${role.company}`,
      ``,
      `**Period**: ${role.period}`,
      ``,
      ...role.highlights.map((h) => `- ${h}`),
    ].join("\n"),
  }));
}

export async function blogDocs(supabase: AnySupabase): Promise<Doc[]> {
  const { data, error } = await supabase
    .from("blogs")
    .select("slug, title, description, body_md, tags, is_published")
    .eq("is_published", true);
  if (error) throw new Error(`blogs fetch failed: ${error.message}`);
  return (data ?? []).map((b) => makeBlogDoc(b as Record<string, unknown>));
}

export async function singleBlogDoc(
  supabase: AnySupabase,
  slug: string,
): Promise<Doc | null> {
  const { data, error } = await supabase
    .from("blogs")
    .select("slug, title, description, body_md, tags, is_published")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error || !data) return null;
  return makeBlogDoc(data as Record<string, unknown>);
}

function makeBlogDoc(b: Record<string, unknown>): Doc {
  const slug = b.slug as string;
  const tags = Array.isArray(b.tags) ? (b.tags as string[]) : [];
  const lines: string[] = [`# ${b.title as string}`, ``];
  if (b.description) lines.push(`> ${b.description as string}`);
  lines.push(``);
  if (tags.length > 0) lines.push(`Tags: ${tags.join(", ")}`);
  lines.push(``);
  lines.push((b.body_md as string) ?? "");
  return {
    source_type: "blog",
    source_key: slug,
    title: b.title as string,
    url: `${SITE_URL}/blogs/${slug}`,
    body: lines.join("\n"),
  };
}

export async function courseAndEpisodeDocs(supabase: AnySupabase): Promise<Doc[]> {
  const { data: courses, error } = await supabase
    .from("courses")
    .select("id, slug, title, tagline, description, level, duration_min, is_free, is_published")
    .eq("is_published", true);
  if (error) throw new Error(`courses fetch failed: ${error.message}`);

  const docs: Doc[] = [];
  for (const c of courses ?? []) {
    const course = c as Record<string, unknown>;
    const slug = course.slug as string;
    docs.push(makeCourseOverviewDoc(course));
    docs.push(...(await fetchEpisodeDocsForCourse(supabase, course)));
    void slug;
  }
  return docs;
}

export async function singleCourseDocs(
  supabase: AnySupabase,
  slug: string,
): Promise<Doc[]> {
  const { data: course, error } = await supabase
    .from("courses")
    .select("id, slug, title, tagline, description, level, duration_min, is_free, is_published")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error || !course) return [];
  return [makeCourseOverviewDoc(course as Record<string, unknown>)];
}

export async function singleEpisodeDoc(
  supabase: AnySupabase,
  courseSlug: string,
  episodeSlug: string,
): Promise<Doc | null> {
  const { data: course } = await supabase
    .from("courses")
    .select("id, slug, title, is_published")
    .eq("slug", courseSlug)
    .eq("is_published", true)
    .maybeSingle();
  if (!course) return null;
  const { data: episode } = await supabase
    .from("episodes")
    .select(
      "id, slug, title, description, kind, sort_order, is_published, episode_content!inner(body_md, quiz, lab, visual, data)",
    )
    .eq("course_id", (course as { id: number }).id)
    .eq("slug", episodeSlug)
    .eq("is_published", true)
    .maybeSingle();
  if (!episode) return null;
  return makeEpisodeDoc(course as Record<string, unknown>, episode as Record<string, unknown>);
}

async function fetchEpisodeDocsForCourse(
  supabase: AnySupabase,
  course: Record<string, unknown>,
): Promise<Doc[]> {
  const { data: episodes, error } = await supabase
    .from("episodes")
    .select(
      "id, slug, title, description, kind, sort_order, section_id, is_published, episode_content!inner(body_md, quiz, lab, visual, data)",
    )
    .eq("course_id", course.id as number)
    .eq("is_published", true)
    .order("sort_order", { ascending: true });
  if (error) {
    console.warn(`[indexer] episodes fetch failed for ${course.slug}:`, error.message);
    return [];
  }
  return (episodes ?? []).map((ep) =>
    makeEpisodeDoc(course, ep as Record<string, unknown>),
  );
}

function makeCourseOverviewDoc(course: Record<string, unknown>): Doc {
  const slug = course.slug as string;
  const courseUrl = `${SITE_URL}/courses/${slug}`;
  const lines: string[] = [`# ${course.title as string}`, ``];
  if (course.tagline) lines.push(`> ${course.tagline as string}`);
  lines.push(``);
  lines.push(`**Level**: ${course.level ?? "n/a"}`);
  lines.push(`**Estimated duration**: ${course.duration_min ?? "n/a"} min`);
  lines.push(`**Free**: ${course.is_free ? "yes" : "no"}`);
  lines.push(``);
  if (course.description) lines.push(course.description as string);
  return {
    source_type: "course",
    source_key: slug,
    title: course.title as string,
    url: courseUrl,
    body: lines.join("\n"),
  };
}

function makeEpisodeDoc(
  course: Record<string, unknown>,
  episode: Record<string, unknown>,
): Doc {
  const courseSlug = course.slug as string;
  const epSlug = episode.slug as string;
  const epUrl = `${SITE_URL}/courses/${courseSlug}/${epSlug}`;
  const content = (episode.episode_content as Record<string, unknown> | null) ?? {};
  const data = (content.data ?? null) as Record<string, unknown> | null;

  const lines: string[] = [
    `# ${episode.title as string}`,
    ``,
    `*From the course: ${course.title as string}*`,
    ``,
    `**Episode kind**: ${episode.kind as string}`,
    ``,
  ];
  if (episode.description) lines.push(episode.description as string);
  lines.push(``);

  if (content.body_md) lines.push(content.body_md as string);

  if (episode.kind === "quiz" && Array.isArray(content.quiz)) {
    for (const q of content.quiz as Array<{ question: string; explanation?: string }>) {
      lines.push(`**Q**: ${q.question}`);
      if (q.explanation) lines.push(q.explanation);
      lines.push(``);
    }
  }
  if (episode.kind === "exam" && data && Array.isArray(data.questions)) {
    for (const q of data.questions as Array<{ question: string; explanation?: string }>) {
      lines.push(`**Q**: ${q.question}`);
      if (q.explanation) lines.push(q.explanation);
      lines.push(``);
    }
  }
  if (episode.kind === "lab" && content.lab) {
    const lab = content.lab as Record<string, unknown>;
    if (lab.instructions_md) lines.push(lab.instructions_md as string);
  }
  if (episode.kind === "code" && data?.prompt_md) {
    lines.push(data.prompt_md as string);
  }
  if (episode.kind === "fill" && data) {
    if (data.prompt_md) lines.push(data.prompt_md as string);
    if (data.text) lines.push(data.text as string);
  }
  if (episode.kind === "flashcards" && data && Array.isArray(data.cards)) {
    for (const card of data.cards as Array<{ front: string; back: string }>) {
      lines.push(`**${card.front}**: ${card.back}`);
    }
  }
  if (episode.kind === "resources" && data && Array.isArray(data.items)) {
    for (const it of data.items as Array<{ title: string; url: string; description?: string }>) {
      lines.push(`- [${it.title}](${it.url}) — ${it.description ?? ""}`);
    }
  }
  if (episode.kind === "visual" && content.visual) {
    const v = content.visual as Record<string, unknown>;
    if (v.alt) lines.push(`Image alt: ${v.alt as string}`);
    if (v.caption) lines.push(v.caption as string);
  }

  return {
    source_type: "episode",
    source_key: `${courseSlug}/${epSlug}`,
    title: `${course.title as string} — ${episode.title as string}`,
    url: epUrl,
    body: lines.join("\n"),
  };
}

// ─────────────────────────────────────────────────────────────────
// Embedding + upsert
// ─────────────────────────────────────────────────────────────────

async function embedBatch(
  client: GoogleGenAI,
  texts: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<number[][]> {
  const out: number[][] = [];
  const concurrency = 4;
  for (let cursor = 0; cursor < texts.length; cursor += concurrency) {
    const slice = texts.slice(cursor, cursor + concurrency);
    const results = await Promise.all(
      slice.map(async (text) => {
        const res = await client.models.embedContent({
          model: EMBEDDING_MODEL,
          contents: text.slice(0, 30_000),
          config: {
            outputDimensionality: EMBEDDING_DIM,
            // Asymmetric: documents indexed as RETRIEVAL_DOCUMENT,
            // queries at search time use RETRIEVAL_QUERY.
            taskType: "RETRIEVAL_DOCUMENT",
          },
        });
        const vec = res.embeddings?.[0]?.values;
        if (!vec || vec.length !== EMBEDDING_DIM) {
          throw new Error("embedding returned wrong dimensionality");
        }
        return vec;
      }),
    );
    out.push(...results);
    onProgress?.(Math.min(cursor + concurrency, texts.length), texts.length);
  }
  return out;
}

type Pending = { doc: Doc; chunk: Chunk };

async function embedAndUpsert(
  supabase: AnySupabase,
  gemini: GoogleGenAI,
  pending: Pending[],
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  if (pending.length === 0) return;
  const embeddings = await embedBatch(
    gemini,
    pending.map((p) => p.chunk.content),
    onProgress,
  );
  const rows = pending.map((p, i) => ({
    source_type: p.doc.source_type,
    source_key: p.doc.source_key,
    chunk_index: p.chunk.index,
    title: p.doc.title,
    url: p.doc.url,
    content: p.chunk.content,
    token_count: p.chunk.tokens,
    embedding: embeddings[i] as unknown as string,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase
    .from("assistant_chunks")
    .upsert(rows, { onConflict: "source_type,source_key,chunk_index" });
  if (error) throw new Error(`upsert failed: ${error.message}`);
}

async function pruneSourceTail(
  supabase: AnySupabase,
  source_type: string,
  source_key: string,
  maxChunkIndex: number,
): Promise<void> {
  const { error } = await supabase
    .from("assistant_chunks")
    .delete()
    .eq("source_type", source_type)
    .eq("source_key", source_key)
    .gt("chunk_index", maxChunkIndex);
  if (error) {
    console.warn(`[indexer] prune ${source_type}/${source_key} failed:`, error.message);
  }
}

export async function deleteSource(
  supabase: AnySupabase,
  source_type: string,
  source_key: string,
): Promise<number> {
  const { error, count } = await supabase
    .from("assistant_chunks")
    .delete({ count: "exact" })
    .eq("source_type", source_type)
    .eq("source_key", source_key);
  if (error) throw new Error(`delete ${source_type}/${source_key} failed: ${error.message}`);
  return count ?? 0;
}

// ─────────────────────────────────────────────────────────────────
// Public entry points
// ─────────────────────────────────────────────────────────────────

export type IndexResult = {
  sources: number;
  chunks: number;
  staleSourcesDropped: number;
};

/**
 * Full reindex. Gathers every doc, chunks, embeds, upserts, then
 * prunes stale chunks (orphaned tail indexes + sources whose row
 * has been deleted upstream).
 */
export async function indexAll(
  supabase: AnySupabase,
  gemini: GoogleGenAI,
  log?: (msg: string) => void,
): Promise<IndexResult> {
  const tap = log ?? (() => {});

  tap("[indexer] gathering sources…");
  const docs: Doc[] = [
    ...profileDocs(),
    ...productDocs(),
    ...experienceDocs(),
    ...(await blogDocs(supabase)),
    ...(await courseAndEpisodeDocs(supabase)),
  ];
  tap(`[indexer] ${docs.length} source documents`);

  const pending: Pending[] = [];
  for (const doc of docs) {
    for (const chunk of chunkMarkdown(doc.body)) pending.push({ doc, chunk });
  }
  tap(`[indexer] ${pending.length} chunks to embed`);

  await embedAndUpsert(supabase, gemini, pending, (done, total) => {
    if (done === total || done % 32 === 0) {
      tap(`[indexer] embedded ${done}/${total}`);
    }
  });

  // Prune orphan chunks: each source's chunk_index sequence might
  // shrink (smaller content next pass) — drop anything past the
  // current max for each source.
  const maxByKey = new Map<string, { source_type: string; source_key: string; max: number }>();
  for (const p of pending) {
    const k = `${p.doc.source_type}::${p.doc.source_key}`;
    const cur = maxByKey.get(k);
    if (!cur || cur.max < p.chunk.index) {
      maxByKey.set(k, {
        source_type: p.doc.source_type,
        source_key: p.doc.source_key,
        max: p.chunk.index,
      });
    }
  }
  for (const { source_type, source_key, max } of maxByKey.values()) {
    await pruneSourceTail(supabase, source_type, source_key, max);
  }

  // Drop entire sources we no longer have any chunks for.
  const currentKeys = new Set(maxByKey.keys());
  let staleSourcesDropped = 0;
  const { data: existing } = await supabase
    .from("assistant_chunks")
    .select("source_type, source_key");
  if (existing) {
    const uniqueExisting = new Set<string>(
      (existing as Array<{ source_type: string; source_key: string }>).map(
        (r) => `${r.source_type}::${r.source_key}`,
      ),
    );
    for (const k of uniqueExisting) {
      if (!currentKeys.has(k)) {
        const [source_type, source_key] = k.split("::");
        await deleteSource(supabase, source_type!, source_key!);
        staleSourcesDropped += 1;
      }
    }
  }

  return {
    sources: docs.length,
    chunks: pending.length,
    staleSourcesDropped,
  };
}

/**
 * Incremental reindex for a single source. Webhook path: when a
 * blog/course/episode row changes, just re-embed THAT source's
 * chunks. Idempotent — old chunks for the source are deleted, new
 * ones upserted.
 *
 * Returns null if the source can't be resolved (e.g. it was just
 * deleted upstream — caller should call `deleteSource` instead).
 */
export async function indexSource(
  supabase: AnySupabase,
  gemini: GoogleGenAI,
  source_type: SourceType,
  source_key: string,
): Promise<{ chunks: number } | null> {
  const docs = await resolveSourceDocs(supabase, source_type, source_key);
  if (docs.length === 0) return null;

  // Wipe the existing chunks for this source so we don't leave
  // stale tails behind when the new content has fewer chunks.
  await deleteSource(supabase, source_type, source_key);

  const pending: Pending[] = [];
  for (const doc of docs) {
    for (const chunk of chunkMarkdown(doc.body)) pending.push({ doc, chunk });
  }
  await embedAndUpsert(supabase, gemini, pending);
  return { chunks: pending.length };
}

async function resolveSourceDocs(
  supabase: AnySupabase,
  source_type: SourceType,
  source_key: string,
): Promise<Doc[]> {
  switch (source_type) {
    case "profile": {
      const all = profileDocs();
      return all.filter((d) => d.source_key === source_key);
    }
    case "product":
      return productDocs().filter((d) => d.source_key === source_key);
    case "experience":
      return experienceDocs().filter((d) => d.source_key === source_key);
    case "blog": {
      const doc = await singleBlogDoc(supabase, source_key);
      return doc ? [doc] : [];
    }
    case "course":
      return await singleCourseDocs(supabase, source_key);
    case "episode": {
      const [courseSlug, epSlug] = source_key.split("/");
      if (!courseSlug || !epSlug) return [];
      const doc = await singleEpisodeDoc(supabase, courseSlug, epSlug);
      return doc ? [doc] : [];
    }
  }
}
