import type { GoogleGenAI } from "@google/genai";
import type { SupabaseClient } from "@supabase/supabase-js";
import "server-only";

/**
 * Topic picker — first phase of the daily auto-blog cron.
 *
 * Asks Gemini for a single technical topic that lands with senior
 * engineers, engineering managers, CTOs, CIOs, CISOs. Grounded against
 * Google Search so the angle can lean on real recent releases /
 * incidents / regulations. Dedup'd against the last 80 published
 * titles + descriptions so the picker doesn't loop on a recent topic.
 *
 * Resilience layers (in order):
 *   1. Grounded call (recency-aware, uses search tool).
 *   2. Ungrounded retry — Gemini occasionally emits no final text
 *      part when grounding fires; falls back to model-internal
 *      knowledge with the same prompt.
 *   3. Substring-overlap retry — if the picked topic obviously
 *      overlaps an existing post (a corpus title is a substring of
 *      the new topic, or vice versa), add the offender to the
 *      dedup list and try once more.
 *
 * We don't use Gemini's `responseSchema` here because the SDK
 * rejects mixing `googleSearch` grounding with structured output —
 * instead the prompt demands a JSON object back and we parse text.
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

// Topic verticals Rahul actually writes in. Steers the picker away
// from generic "intro to X" and toward the categories the corpus
// already lives in. Each picked topic should fit *one* of these.
const TOPIC_VERTICALS = [
  "Postgres / OLTP databases at scale",
  "Distributed systems trade-offs (consistency, partitioning, ordering)",
  "API design (REST vs gRPC vs GraphQL vs Protobuf)",
  "API gateways (Apigee, Gravitee, Kong, Envoy/xDS)",
  "Microservices boundaries and inter-service messaging (Kafka, NATS, Pulsar)",
  "Platform engineering and developer-tools (CI/CD, IaC, multi-tenancy)",
  "Cloud-native runtime concerns (Kubernetes pitfalls, autoscaling, cost)",
  "Observability (tracing, structured logs, SLOs that survive contact)",
  "Security and compliance for engineering leaders (BFSI / fintech context)",
  "RAG architectures, vector retrieval, evaluation harnesses for LLM apps",
  "Agentic systems (tool use, planner-executor patterns, MCP)",
  "Backend language choices (Go, Node, Python) for specific workloads",
  "Concurrency models and event-driven backends",
  "Production AI systems (model serving, inference cost, drift)",
];

const SYSTEM = `You are a technical editor planning a single blog post for Rahul Gupta's personal engineering blog.

His readers are senior software engineers, engineering managers, CTOs, CIOs, and CISOs at companies in the BFSI, fintech, SaaS and platform space. They have strong opinions, finite patience for hype, and want posts that change how they think about something concrete in their stack.

# Pick ONE topic for today's post. The topic must:

- Sit clearly inside ONE of these verticals Rahul writes in:
${TOPIC_VERTICALS.map((v) => `  · ${v}`).join("\n")}

- Be technical and SPECIFIC — name a system, a pattern, a failure mode, a trade-off, a release, a regulation. Bad: "thinking about distributed systems". Good: "why naive sharding by user_id will tip a Postgres cluster at ~30M users".
- Carry a contrarian angle, a hard-won lesson, or a "here's what most teams miss" framing. Posts that just summarise public docs add zero value.
- Be writable in 1700-2100 words without padding. If it could be a sentence, it's not a post; if it's a book chapter, it's not a post either.
- Be aimed at SENIOR practitioners. Not a beginner explainer. Not a "what is X?" definition. Assume the reader knows the basics.
- NOT semantically overlap any topic in the dedup list. "Different wording, same topic" still counts as a repeat.

# Use Google Search to find a real anchor:

- A recent release / deprecation / RFC / postmortem / advisory / community thread you can hook the angle to.
- The "why_now" field MUST reference something concrete (release version, regulation, incident class, recurring foot-gun in your work). No vague "as the industry evolves".

# Output

Return ONLY a single JSON object with this exact shape — no prose, no fences, no comments:

{
  "topic": "concise canonical name of the topic, 30-90 chars",
  "angle": "ONE sentence — the surprising / contrarian take you'll lead with",
  "audience": "who this lands with most (e.g. 'senior backend engineers shipping high-throughput Postgres')",
  "why_now": "ONE sentence — concrete recency hook (release, incident, regulation, or recurring foot-gun you've seen)"
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

function buildUserPrompt(corpus: CorpusEntry[], extraReject: string[]): string {
  const rejectBlock =
    extraReject.length > 0
      ? `

# Already-rejected topic candidates this run (do NOT pick anything close to these either):
${extraReject.map((r, i) => `R${i + 1}. ${r}`).join("\n")}`
      : "";

  return `# Topics already covered in the recent corpus (DO NOT pick anything semantically close to these):

${fmtCorpus(corpus)}${rejectBlock}

# Now pick today's topic.`;
}

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("empty model response");
  // Strip a markdown fence if present. Gemini sometimes wraps JSON in
  // ```json … ``` even when told not to.
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  const candidate = (fenced ? fenced[1] : trimmed).trim();
  // Last-resort slice: find the first `{` and the last `}`.
  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");
  if (first < 0 || last <= first) {
    const preview = trimmed.slice(0, 200).replace(/\s+/g, " ");
    throw new Error(`no JSON object in model response (got: "${preview}")`);
  }
  return JSON.parse(candidate.slice(first, last + 1));
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
  // Shape validation — catches "ok" and "TBD"-shaped placeholder
  // outputs the model occasionally produces.
  if (out.topic!.length < 20 || out.topic!.length > 120) {
    throw new Error(
      `topic.topic out of length range (got ${out.topic!.length} chars; need 20-120)`,
    );
  }
  if (out.angle!.length < 30) {
    throw new Error(
      `topic.angle too short (got ${out.angle!.length} chars; need >= 30)`,
    );
  }
  return out as Topic;
}

/**
 * Cheap "is this topic obviously a repeat?" check. We don't run
 * embeddings — at this corpus size a substring overlap on the
 * normalised text catches the lazy-rephrase failure mode without
 * the cost. False negatives (true semantic repeats with no shared
 * vocabulary) are accepted; the dedup list in the prompt is the
 * primary line of defence.
 */
function normaliseForOverlap(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isObviousRepeat(topic: Topic, corpus: CorpusEntry[]): string | null {
  const t = normaliseForOverlap(topic.topic);
  if (t.length < 12) return null;
  for (const c of corpus) {
    const ct = normaliseForOverlap(c.title);
    if (!ct) continue;
    // Either direction of containment counts. Many false rejects
    // would be benign repeats anyway.
    if (ct.length >= 12 && (t.includes(ct) || ct.includes(t))) {
      return c.title;
    }
  }
  return null;
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
      // High temperature so day-over-day variety is real. Grounding
      // + dedup list keep it from drifting into nonsense.
      temperature: 0.95,
      // Generous budget. Gemini 2.5 Flash spends "thinking" tokens
      // out of the same pool as output; 600 was tight enough that a
      // grounded call could exhaust the budget on tool steps and
      // emit no final answer text.
      maxOutputTokens: 2048,
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

async function attemptPick(
  gemini: GoogleGenAI,
  userPrompt: string,
): Promise<{ topic: Topic; grounded: boolean }> {
  let lastErr: unknown = null;
  for (const grounded of [true, false]) {
    try {
      const { text, finishReason } = await callGemini(
        gemini,
        userPrompt,
        grounded,
      );
      if (!text.trim()) {
        throw new Error(
          `empty model response (grounding=${grounded}, finishReason=${finishReason ?? "unknown"})`,
        );
      }
      const topic = validateTopic(extractJson(text));
      return { topic, grounded };
    } catch (err) {
      lastErr = err;
    }
  }
  const message = lastErr instanceof Error ? lastErr.message : String(lastErr);
  throw new Error(
    `pickTopic: both grounded and ungrounded calls failed: ${message}`,
  );
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

  // Up to 3 attempts: each rejected topic gets fed back into the
  // prompt as a "do not pick this either" line so Gemini diverges.
  const rejected: string[] = [];
  let lastFallbackUsed = false;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const userPrompt = buildUserPrompt(corpus, rejected);
    const { topic, grounded } = await attemptPick(gemini, userPrompt);

    const repeatOf = isObviousRepeat(topic, corpus);
    if (repeatOf) {
      console.warn(
        `[auto-blog] topic attempt ${attempt} rejected as repeat of "${repeatOf}": "${topic.topic}"`,
      );
      rejected.push(topic.topic);
      continue;
    }
    if (!grounded) lastFallbackUsed = true;
    if (lastFallbackUsed) {
      console.warn(
        `[auto-blog] topic phase fell back to ungrounded — grounded call returned unparseable text`,
      );
    }
    return topic;
  }

  throw new Error(
    `pickTopic: 3 attempts all produced obvious repeats of existing posts (rejected: ${rejected.join(" | ")})`,
  );
}
