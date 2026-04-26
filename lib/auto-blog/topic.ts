import type { GoogleGenAI } from "@google/genai";
import type { SupabaseClient } from "@supabase/supabase-js";
import "server-only";

/**
 * Topic picker — first phase of the daily auto-blog cron.
 *
 * Picks ONE technical topic per run. Software engineering,
 * solution architecture, and agentic AI are huge spaces — we let
 * the model decide what to write about, with no server-side
 * categorisation, no vertical pin, no "must fit in this bucket"
 * constraint. The only steer is the dedup list of recent posts
 * so the picker diverges from what's already been covered.
 *
 * Resilience:
 *   1. Grounded call (recency-aware via Google Search).
 *   2. Ungrounded fallback — Gemini occasionally emits no final
 *      text part when grounding fires. Same prompt, no tools.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any, any, any, any, any>;

export type Topic = {
  /** Canonical short name, e.g. "Postgres MERGE deadlocks under load". */
  topic: string;
  /** The contrarian / surprising take we'll lead with. */
  angle: string;
  /** Who this lands with most — "senior backend", "platform leads", etc. */
  audience: string;
  /** Recency hook — release, incident class, regulation, common foot-gun. */
  why_now: string;
};

type CorpusEntry = { title: string; description: string; tags: string[] };

const TOPIC_MODEL = "gemini-3-flash-preview";

const SYSTEM = `You are a technical editor planning a single blog post for Rahul Gupta's personal engineering blog.

His readers are senior software engineers, engineering managers, CTOs, CIOs, and CISOs at companies in the BFSI, fintech, SaaS and platform space. They have strong opinions, finite patience for hype, and want posts that change how they think about something concrete in their stack.

# Pick ONE topic for today's post.

You have full creative freedom across software engineering, solution architecture, and agentic AI. That's a huge space — backend, frontend, mobile, data, ML/AI, security, observability, distributed systems, platform engineering, developer tooling, cloud architecture, agentic systems, model serving, retrieval, evaluation, runtime, languages, anything. Range is the goal. Pick something that hasn't been covered in the recent corpus.

The topic must:

- Be technical and SPECIFIC — name a system, a pattern, a failure mode, a trade-off, a release, a regulation. Bad: "thinking about distributed systems". Good: "why naive sharding by user_id will tip a Postgres cluster at ~30M users".
- Carry a contrarian angle, a hard-won lesson, or a "here's what most teams miss" framing. Posts that just summarise public docs add zero value.
- Be writable in 1500-2000 words. If it could be a sentence, it's not a post; if it's a book chapter, it's not a post either.
- Be aimed at SENIOR practitioners. Not a beginner explainer. Not a "what is X?" definition.
- NOT semantically overlap any topic in the dedup list. "Different wording, same topic" still counts as a repeat. If the recent corpus skews toward one area, deliberately pick something from a different area.

# Use Google Search to find a real anchor:

- A recent release / deprecation / RFC / postmortem / advisory / community thread you can hook the angle to.
- The "why_now" field MUST reference something concrete (release version, regulation, incident class, recurring foot-gun in your work). No vague "as the industry evolves".

# Output

Return ONLY a single JSON object with this exact shape — no prose, no fences, no comments:

{
  "topic": "concise canonical name of the topic",
  "angle": "ONE sentence — the surprising / contrarian take you'll lead with",
  "audience": "who this lands with most (e.g. 'senior backend engineers shipping high-throughput Postgres')",
  "why_now": "ONE sentence — concrete recency hook (release, incident, regulation, or recurring foot-gun)"
}`;

function fmtCorpus(entries: CorpusEntry[]): string {
  if (entries.length === 0) return "(no posts yet)";
  return entries
    .map((r, i) => {
      const tagPart = r.tags.length > 0 ? ` [${r.tags.join(", ")}]` : "";
      return `${String(i + 1).padStart(2, "0")}. ${r.title} — ${r.description}${tagPart}`;
    })
    .join("\n");
}

function buildUserPrompt(corpus: CorpusEntry[]): string {
  return `# Topics already covered in the recent corpus (DO NOT pick anything semantically close to these — and if the corpus skews toward one area, deliberately diverge):

${fmtCorpus(corpus)}

# Now pick today's topic. Range across the breadth of software engineering, solution architecture, and agentic AI.`;
}

/**
 * Robust JSON extractor for plain-text model responses. Same shape
 * as the writer's frontmatter parser — try the cheap happy path
 * first, then anchored fence strip, then last-resort slice.
 *
 * Fixes the previous "no JSON object in model response" failures,
 * which came from an un-anchored fence regex matching backticks
 * that occasionally appear inside the topic / angle strings (e.g.
 * `psql` or `\copy`).
 */
function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("empty model response");

  // 1. Direct parse.
  try {
    return JSON.parse(trimmed);
  } catch {
    /* fall through */
  }

  // 2. Strip an outer fence, anchored to start AND end.
  const fenceWrap = trimmed.match(/^```(?:json)?\s*\n?([\s\S]+?)\n?```\s*$/);
  if (fenceWrap) {
    try {
      return JSON.parse(fenceWrap[1].trim());
    } catch {
      /* fall through */
    }
  }

  // 3. Last-resort slice between the first `{` and last `}`.
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first < 0 || last <= first) {
    const preview = trimmed.slice(0, 200).replace(/\s+/g, " ");
    throw new Error(`no JSON object in model response (got: "${preview}")`);
  }
  return JSON.parse(trimmed.slice(first, last + 1));
}

function validateTopic(parsed: unknown): Topic {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("topic JSON is not an object");
  }
  const obj = parsed as Record<string, unknown>;
  const out: Partial<Topic> = {};
  for (const f of ["topic", "angle", "audience", "why_now"] as const) {
    const v = obj[f];
    if (typeof v !== "string" || v.trim().length === 0) {
      throw new Error(`topic JSON missing/empty field: ${String(f)}`);
    }
    out[f] = v.trim();
  }
  return out as Topic;
}

async function callGemini(
  gemini: GoogleGenAI,
  userPrompt: string,
  withGrounding: boolean,
): Promise<{ text: string; finishReason: string | undefined }> {
  const gen = await gemini.models.generateContent({
    model: TOPIC_MODEL,
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: SYSTEM,
      // High temperature so day-over-day variety within a vertical
      // is real. The vertical itself is randomised server-side.
      temperature: 0.95,
      // Generous: Gemini-3 thinking tokens come out of the same
      // pool. 2048 was getting truncated mid-string.
      maxOutputTokens: 4096,
      ...(withGrounding ? { tools: [{ googleSearch: {} }] } : {}),
    },
  });
  const text = gen.text ?? "";
  const finishReason = gen.candidates?.[0]?.finishReason;
  return {
    text,
    finishReason: finishReason ? String(finishReason) : undefined,
  };
}

export async function pickTopic(
  supabase: AnySupabase,
  gemini: GoogleGenAI,
): Promise<Topic> {
  const { data, error } = await supabase
    .from("blogs")
    .select("title, description, tags")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(80);

  if (error) {
    throw new Error(`pickTopic: failed to load dedup corpus: ${error.message}`);
  }

  const corpus: CorpusEntry[] = (
    (data as { title: string; description: string; tags: string[] | null }[]) ??
    []
  ).map((r) => ({
    title: r.title,
    description: r.description,
    tags: Array.isArray(r.tags) ? r.tags : [],
  }));

  const userPrompt = buildUserPrompt(corpus);

  // Single attempt with grounded → ungrounded fallback. No
  // post-hoc topic rejection / retry — trust the vertical
  // constraint plus the dedup list.
  let lastErr: unknown = null;
  for (const grounded of [true, false]) {
    try {
      const { text, finishReason } = await callGemini(
        gemini,
        userPrompt,
        grounded,
      );
      if (finishReason && /MAX/i.test(String(finishReason))) {
        throw new Error(
          `truncated at MAX_TOKENS (got ${text.length} chars; bump maxOutputTokens)`,
        );
      }
      if (!text.trim()) {
        throw new Error(
          `empty model response (grounding=${grounded}, finishReason=${finishReason ?? "unknown"})`,
        );
      }
      return validateTopic(extractJson(text));
    } catch (err) {
      lastErr = err;
      console.warn(
        `[auto-blog] topic ${grounded ? "grounded" : "ungrounded"} attempt failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
  const message = lastErr instanceof Error ? lastErr.message : String(lastErr);
  throw new Error(
    `pickTopic: both grounded and ungrounded calls failed: ${message}`,
  );
}
