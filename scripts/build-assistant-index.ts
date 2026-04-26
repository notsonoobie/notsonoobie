/**
 * Build the assistant RAG index. Idempotent — runnable any time
 * content changes.
 *
 *   pnpm dlx tsx scripts/build-assistant-index.ts
 *
 * Reads every public surface (profile, products, experience,
 * blogs, courses, episodes), chunks long content, embeds each
 * chunk via Gemini's `gemini-embedding-001`, and upserts into
 * `public.assistant_chunks`. Stale rows (sources that no longer
 * exist or chunk indexes that shrank) are deleted at the end of
 * each source pass.
 *
 * Environment required:
 *   • SUPABASE_URL + SUPABASE_SECRET_KEY  (or SUPABASE_SERVICE_ROLE_KEY)
 *   • GEMINI_API_KEY
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

import { profile, products, experience } from "../lib/data";
import { chunkMarkdown, type Chunk, approxTokens } from "../lib/assistant/chunker";

// Loose typing for the helper signatures below — the script doesn't
// need the strict per-schema types and TS narrowing breaks otherwise.
type AnySupabase = SupabaseClient<any, any, any, any, any>;

const ROOT = process.cwd();
const SITE_URL = (
  process.env.SITE_URL ?? "https://agenticwithrahul.in"
).replace(/\/$/, "");
const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIM = 768;

type SourceType = "profile" | "product" | "experience" | "blog" | "course" | "episode";

type Doc = {
  source_type: SourceType;
  source_key: string;
  title: string;
  url: string | null;
  body: string; // markdown / plain text to chunk + embed
};

async function loadDotEnv() {
  // Same lightweight loader as scripts/import-blogs.ts.
  try {
    const raw = await readFile(join(ROOT, ".env"), "utf8");
    for (const rawLine of raw.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    // No .env — assume env is set externally.
  }
}

function profileDoc(): Doc {
  // Pack the static profile + stats + skills into one rich document.
  // The assistant ranks against this whenever someone asks about
  // Rahul personally.
  const lines: string[] = [];
  lines.push(`# About ${profile.name}`);
  lines.push(``);
  lines.push(`**Title**: ${profile.title}`);
  lines.push(`**Tagline**: ${profile.tagline}`);
  lines.push(`**Location**: ${profile.location}`);
  lines.push(`**Availability**: ${profile.availability}`);
  lines.push(``);
  lines.push(`## Summary`);
  lines.push(profile.summary);
  lines.push(``);
  lines.push(`## Contact`);
  lines.push(`- Email: ${profile.email}`);
  lines.push(`- Phone: ${profile.phone}`);
  lines.push(`- LinkedIn: ${profile.linkedin}`);
  lines.push(`- GitHub: ${profile.github}`);
  lines.push(`- Cal.com: ${profile.cal}`);
  lines.push(``);
  lines.push(`## Resume`);
  lines.push(`PDF: ${SITE_URL}${profile.resumePdf}`);
  lines.push(`DOCX: ${SITE_URL}${profile.resumeDocx}`);
  return {
    source_type: "profile",
    source_key: "profile",
    title: `${profile.name} — Profile`,
    url: SITE_URL,
    body: lines.join("\n"),
  };
}

function productDocs(): Doc[] {
  return products.map((p) => {
    const lines: string[] = [];
    lines.push(`# ${p.name}`);
    lines.push(``);
    lines.push(`**Tagline**: ${p.tagline}`);
    lines.push(`**Role**: ${p.role}`);
    lines.push(``);
    lines.push(p.lead);
    lines.push(``);
    lines.push(`## Highlights`);
    for (const h of p.highlights) lines.push(`- ${h}`);
    lines.push(``);
    lines.push(`## Tech`);
    lines.push(p.tech.join(", "));
    return {
      source_type: "product" as const,
      source_key: p.id,
      title: p.name,
      url: `${SITE_URL}#products`,
      body: lines.join("\n"),
    };
  });
}

function experienceDocs(): Doc[] {
  return experience.map((role, idx) => {
    const lines: string[] = [];
    lines.push(`# ${role.title} — ${role.company}`);
    lines.push(``);
    lines.push(`**Period**: ${role.period}`);
    lines.push(``);
    for (const h of role.highlights) lines.push(`- ${h}`);
    return {
      source_type: "experience" as const,
      source_key: `experience-${idx}`,
      title: `${role.title} · ${role.company}`,
      url: `${SITE_URL}#experience`,
      body: lines.join("\n"),
    };
  });
}

async function blogDocs(supabase: AnySupabase): Promise<Doc[]> {
  const { data, error } = await supabase
    .from("blogs")
    .select("slug, title, description, body_md, tags, is_published")
    .eq("is_published", true);
  if (error) throw new Error(`blogs fetch failed: ${error.message}`);
  return (data ?? []).map((b: Record<string, unknown>) => {
    const slug = b.slug as string;
    const tags = Array.isArray(b.tags) ? (b.tags as string[]) : [];
    const lines: string[] = [];
    lines.push(`# ${b.title as string}`);
    lines.push(``);
    if (b.description) lines.push(`> ${b.description as string}`);
    lines.push(``);
    if (tags.length > 0) lines.push(`Tags: ${tags.join(", ")}`);
    lines.push(``);
    lines.push((b.body_md as string) ?? "");
    return {
      source_type: "blog" as const,
      source_key: slug,
      title: b.title as string,
      url: `${SITE_URL}/blogs/${slug}`,
      body: lines.join("\n"),
    };
  });
}

async function courseAndEpisodeDocs(
  supabase: AnySupabase,
): Promise<Doc[]> {
  const { data: courses, error: coursesErr } = await supabase
    .from("courses")
    .select("id, slug, title, tagline, description, level, duration_min, is_free, is_published")
    .eq("is_published", true);
  if (coursesErr) throw new Error(`courses fetch failed: ${coursesErr.message}`);

  const docs: Doc[] = [];
  for (const c of courses ?? []) {
    const course = c as Record<string, unknown>;
    const slug = course.slug as string;
    const courseUrl = `${SITE_URL}/courses/${slug}`;

    // Course-level overview doc
    const overviewLines: string[] = [];
    overviewLines.push(`# ${course.title as string}`);
    overviewLines.push(``);
    if (course.tagline) overviewLines.push(`> ${course.tagline as string}`);
    overviewLines.push(``);
    overviewLines.push(`**Level**: ${course.level ?? "n/a"}`);
    overviewLines.push(`**Estimated duration**: ${course.duration_min ?? "n/a"} min`);
    overviewLines.push(`**Free**: ${course.is_free ? "yes" : "no"}`);
    overviewLines.push(``);
    if (course.description) overviewLines.push(course.description as string);
    docs.push({
      source_type: "course",
      source_key: slug,
      title: course.title as string,
      url: courseUrl,
      body: overviewLines.join("\n"),
    });

    // Episode-level docs (lesson body + structured kinds where useful)
    const { data: episodes, error: episodesErr } = await supabase
      .from("episodes")
      .select(
        "id, slug, title, description, kind, sort_order, section_id, is_published, episode_content!inner(body_md, quiz, lab, visual, data)",
      )
      .eq("course_id", course.id as number)
      .eq("is_published", true)
      .order("sort_order", { ascending: true });
    if (episodesErr) {
      console.warn(`[indexer] episodes fetch failed for ${slug}:`, episodesErr.message);
      continue;
    }
    for (const ep of episodes ?? []) {
      const episode = ep as Record<string, unknown>;
      const epSlug = episode.slug as string;
      const epUrl = `${courseUrl}/${epSlug}`;
      const content = (episode.episode_content as Record<string, unknown> | null) ?? {};

      const lines: string[] = [];
      lines.push(`# ${episode.title as string}`);
      lines.push(``);
      lines.push(`*From the course: ${course.title as string}*`);
      lines.push(``);
      lines.push(`**Episode kind**: ${episode.kind as string}`);
      lines.push(``);
      if (episode.description) lines.push(episode.description as string);
      lines.push(``);

      // Lesson body
      if (content.body_md) {
        lines.push(content.body_md as string);
      }
      // Quiz / exam — flatten the question text so the assistant
      // can quote it back when asked about a specific topic.
      const data = (content.data ?? null) as Record<string, unknown> | null;
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
      if (episode.kind === "code" && data) {
        if (data.prompt_md) lines.push(data.prompt_md as string);
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

      docs.push({
        source_type: "episode",
        source_key: `${slug}/${epSlug}`,
        title: `${course.title as string} — ${episode.title as string}`,
        url: epUrl,
        body: lines.join("\n"),
      });
    }
  }
  return docs;
}

async function embedBatch(
  client: GoogleGenAI,
  texts: string[],
): Promise<number[][]> {
  // Embedding API takes one input per call. We parallelize a small
  // batch (4) at a time to stay under quota limits.
  const out: number[][] = [];
  const concurrency = 4;
  let cursor = 0;
  while (cursor < texts.length) {
    const slice = texts.slice(cursor, cursor + concurrency);
    const results = await Promise.all(
      slice.map(async (text) => {
        const res = await client.models.embedContent({
          model: EMBEDDING_MODEL,
          contents: text.slice(0, 30_000),
          config: { outputDimensionality: EMBEDDING_DIM },
        });
        const vec = res.embeddings?.[0]?.values;
        if (!vec || vec.length !== EMBEDDING_DIM) {
          throw new Error("embedding returned wrong dimensionality");
        }
        return vec;
      }),
    );
    out.push(...results);
    cursor += concurrency;
    process.stdout.write(`  ${Math.min(cursor, texts.length)}/${texts.length}\r`);
  }
  process.stdout.write("\n");
  return out;
}

async function main() {
  await loadDotEnv();

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("[indexer] SUPABASE_URL + SUPABASE_SECRET_KEY required");
    process.exit(1);
  }
  if (!geminiKey) {
    console.error("[indexer] GEMINI_API_KEY required");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const gemini = new GoogleGenAI({ apiKey: geminiKey });

  // Gather all source docs.
  console.log("[indexer] gathering sources…");
  const docs: Doc[] = [
    profileDoc(),
    ...productDocs(),
    ...experienceDocs(),
    ...(await blogDocs(supabase)),
    ...(await courseAndEpisodeDocs(supabase)),
  ];
  console.log(`[indexer] ${docs.length} source documents`);

  // Chunk all docs.
  type Pending = {
    doc: Doc;
    chunk: Chunk;
  };
  const pending: Pending[] = [];
  for (const doc of docs) {
    const chunks = chunkMarkdown(doc.body);
    for (const chunk of chunks) pending.push({ doc, chunk });
  }
  console.log(`[indexer] ${pending.length} chunks to embed`);

  // Embed.
  console.log("[indexer] embedding…");
  const embeddings = await embedBatch(
    gemini,
    pending.map((p) => p.chunk.content),
  );

  // Upsert.
  console.log("[indexer] upserting…");
  const rows = pending.map((p, i) => ({
    source_type: p.doc.source_type,
    source_key: p.doc.source_key,
    chunk_index: p.chunk.index,
    title: p.doc.title,
    url: p.doc.url,
    content: p.chunk.content,
    token_count: p.chunk.tokens,
    embedding: embeddings[i] as unknown as string, // pgvector accepts the array directly via PostgREST
    updated_at: new Date().toISOString(),
  }));

  // Postgrest upserts with the unique index (source_type, source_key, chunk_index).
  const { error: upsertErr } = await supabase
    .from("assistant_chunks")
    .upsert(rows, { onConflict: "source_type,source_key,chunk_index" });
  if (upsertErr) {
    console.error("[indexer] upsert failed:", upsertErr);
    process.exit(1);
  }

  // Cleanup: delete stale chunks for sources that shrank or vanished.
  // Group pending chunks by (source_type, source_key) and drop any
  // chunk_index not present.
  const seen = new Map<string, number>();
  for (const p of pending) {
    const k = `${p.doc.source_type}::${p.doc.source_key}`;
    seen.set(k, Math.max(seen.get(k) ?? -1, p.chunk.index));
  }

  for (const [k, maxIdx] of seen) {
    const [source_type, source_key] = k.split("::");
    const { error: deleteErr } = await supabase
      .from("assistant_chunks")
      .delete()
      .eq("source_type", source_type)
      .eq("source_key", source_key)
      .gt("chunk_index", maxIdx);
    if (deleteErr) {
      console.warn(`[indexer] cleanup ${k} failed:`, deleteErr.message);
    }
  }

  // Drop entire sources we no longer have any chunks for. We compare
  // against current source identities to find stragglers.
  const currentSourceKeys = new Set(
    pending.map((p) => `${p.doc.source_type}::${p.doc.source_key}`),
  );
  const { data: existing, error: existErr } = await supabase
    .from("assistant_chunks")
    .select("source_type, source_key");
  if (existErr) {
    console.warn("[indexer] stale-row scan failed:", existErr.message);
  } else {
    const stale = new Set<string>();
    for (const r of (existing ?? []) as Array<{ source_type: string; source_key: string }>) {
      const k = `${r.source_type}::${r.source_key}`;
      if (!currentSourceKeys.has(k)) stale.add(k);
    }
    for (const k of stale) {
      const [source_type, source_key] = k.split("::");
      const { error: dErr } = await supabase
        .from("assistant_chunks")
        .delete()
        .eq("source_type", source_type)
        .eq("source_key", source_key);
      if (dErr) console.warn(`[indexer] drop stale ${k} failed:`, dErr.message);
      else console.log(`[indexer] dropped stale source: ${k}`);
    }
  }

  console.log("");
  console.log("┌──────────────────────────────────────");
  console.log(`│ sources         : ${docs.length}`);
  console.log(`│ chunks indexed  : ${pending.length}`);
  console.log(`│ approx tokens   : ${pending.reduce((sum, p) => sum + (p.chunk.tokens || approxTokens(p.chunk.content)), 0)}`);
  console.log("└──────────────────────────────────────");
}

void main();
