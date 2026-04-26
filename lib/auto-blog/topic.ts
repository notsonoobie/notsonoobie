import "server-only";
import type { GoogleGenAI } from "@google/genai";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Topic picker — first phase of the daily auto-blog cron.
 *
 * Asks Gemini for a single technical topic that will land with senior
 * engineers, engineering managers, CTOs, CIOs, CISOs. Grounded against
 * Google Search so the angle can lean on real recent releases /
 * incidents / regulations. Dedup'd against the last 60 published titles
 * so the picker doesn't loop on a recent topic.
 *
 * Returns a structured `Topic` the writer phase consumes. We don't
 * use `responseSchema` here because the Gemini SDK rejects mixing
 * `googleSearch` grounding with structured output — instead the prompt
 * demands a JSON object back and we parse the text.
 */

// Loosened so callers can pass the cookie-aware client OR the
// service-role client without per-call generic gymnastics. Mirrors the
// pattern in lib/assistant/index-builder.ts.
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

const TOPIC_MODEL = "gemini-2.5-flash";

const SYSTEM = `You are a technical editor planning a single blog post for Rahul Gupta's personal engineering blog.

His readers are senior software engineers, engineering managers, CTOs, CIOs, and CISOs at companies in the BFSI / SaaS / fintech / platform space. They have strong opinions, finite patience for hype, and want posts that change how they think about something concrete in their stack.

Pick ONE topic for today's post. The topic must:

- Be technical and specific, not a generic "how to think about X" post.
- Have a contrarian angle, a hard-won lesson, or a "this is what most teams miss" framing.
- Be writable in 1700-2100 words without padding.
- Be of interest to senior practitioners — not a beginner explainer.
- NOT repeat any of the topics from the dedup list.

Use Google Search to surface real recent releases, postmortems, deprecations, security advisories, or community discussions you can hook the post to.

Return ONLY a single JSON object with this exact shape, no prose around it, no fences:

{
  "topic": "concise canonical name of the topic, max 80 chars",
  "angle": "one sentence — the surprising or contrarian take you'll lead with",
  "audience": "who this lands with most (e.g. 'senior backend engineers shipping high-throughput Postgres')",
  "why_now": "one sentence — recency hook (release, incident class, regulation, drift you've seen)"
}`;

function buildUserPrompt(recent: { title: string; description: string }[]): string {
  const dedupBlock = recent.length
    ? recent
        .map((r, i) => `${String(i + 1).padStart(2, "0")}. ${r.title} — ${r.description}`)
        .join("\n")
    : "(no posts yet)";
  return `Topics already covered in the recent corpus (DO NOT pick anything semantically close to these):

${dedupBlock}

Now pick today's topic.`;
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
    throw new Error("no JSON object in model response");
  }
  return JSON.parse(candidate.slice(first, last + 1));
}

function validateTopic(parsed: unknown): Topic {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("topic JSON is not an object");
  }
  const obj = parsed as Record<string, unknown>;
  const fields: (keyof Topic)[] = ["topic", "angle", "audience", "why_now"];
  const out: Partial<Topic> = {};
  for (const f of fields) {
    const v = obj[f];
    if (typeof v !== "string" || v.trim().length === 0) {
      throw new Error(`topic JSON missing/empty field: ${String(f)}`);
    }
    out[f] = v.trim();
  }
  return out as Topic;
}

export async function pickTopic(
  supabase: AnySupabase,
  gemini: GoogleGenAI,
): Promise<Topic> {
  const { data, error } = await supabase
    .from("blogs")
    .select("title, description")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(60);

  if (error) {
    throw new Error(`pickTopic: failed to load dedup corpus: ${error.message}`);
  }
  const recent = ((data as { title: string; description: string }[]) ?? []).map(
    (r) => ({ title: r.title, description: r.description }),
  );

  const gen = await gemini.models.generateContent({
    model: TOPIC_MODEL,
    contents: [{ role: "user", parts: [{ text: buildUserPrompt(recent) }] }],
    config: {
      systemInstruction: SYSTEM,
      // High temperature so day-over-day variety is real. Grounding +
      // dedup list keep it from drifting into nonsense.
      temperature: 0.95,
      maxOutputTokens: 600,
      tools: [{ googleSearch: {} }],
    },
  });

  const text = gen.text ?? "";
  const parsed = extractJson(text);
  return validateTopic(parsed);
}
