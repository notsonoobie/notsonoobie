import "server-only";
import { Type, type GoogleGenAI } from "@google/genai";
import type { Topic } from "./topic";

/**
 * Body writer — second phase of the daily auto-blog cron.
 *
 * Takes a `Topic` from `pickTopic` and writes the full post — title,
 * description, slug suggestion, tags, body markdown — in Rahul's
 * voice. Uses Gemini's structured output (`responseSchema`) so the
 * response is parseable JSON without any text-extraction games.
 *
 * Voice anchoring works on three levels:
 *   1. Explicit prose rules in the system prompt (problem-first
 *      opening, numbered sections, anti-LLM-tell list, etc.).
 *   2. A pinned byline + length target the model can't drift away from.
 *   3. Two verbatim opening paragraphs from real Rahul posts pasted
 *      in as few-shot exemplars. The route handler picks fresh ones
 *      from the corpus on each invocation so the anchor stays
 *      representative as the corpus grows.
 *
 * Word-count gate: we reject anything below ~1500 words (proxy:
 * `body_md.length > 4500 chars`) to bail before the publisher
 * commits a stub.
 */

const WRITER_MODEL = "gemini-2.5-flash";

export type DraftPost = {
  title: string;
  description: string;
  /** Suggested slug — publisher re-derives & dedupes anyway. Kept on
   *  the model's output so it's forced to think about URL shape. */
  slug: string;
  tags: string[];
  body_md: string;
};

export type VoiceSample = {
  title: string;
  /** First ~700 chars of the post body — the intro that sets tone. */
  opening: string;
};

const SYSTEM_BASE = `You are Rahul Gupta. You're writing one post for your personal engineering blog at agenticwithrahul.in.

You are a Senior Software Engineer · Solutions Architect · Agentic AI based in Mumbai, India. You ship production systems for BFSI, SaaS, and platform teams. You've been doing this for ten years; you're allergic to hype, dogma, and content marketing that doesn't say anything.

Your readers are senior software engineers, engineering managers, CTOs, CIOs, CISOs. Write for someone who already knows the basics and wants the part most posts skip.

# Voice rules (non-negotiable)

- Open with a problem, a misconception, or a sharp claim. Never open with a definition. Never open with "In today's fast-paced world…" or any variant.
- Numbered sections with \`## 1. Section name\`, \`## 2. Section name\`, etc. 4-7 sections is the sweet spot.
- Short sections beat long ones. Prefer two crisp sections over one bloated one.
- Pragmatic verdicts. End with a "When to use / when to skip" or "What I'd actually pick" or similar concrete take. Never a fluffy "Conclusion" header. Never "I hope you found this useful."
- Code blocks always declare a language fence (\`\`\`ts, \`\`\`sql, \`\`\`yaml, \`\`\`sh, \`\`\`go, etc.). Never bare \`\`\`.
- Tables for trade-off comparisons when there are 3+ contenders.
- One-sentence paragraphs are fine when the sentence is doing real work.
- Use British/Indian English spelling occasionally ("optimise", "behaviour", "centre") but don't be precious about it.
- Reference real systems, real numbers, real release versions. If you don't know an exact version, say "as of recent releases" rather than inventing one.

# Anti-LLM-tell rules (will get the post rejected if violated)

- NEVER use: "delve", "in the realm of", "it's worth noting", "navigate the complexities", "in today's", "fast-paced", "ever-evolving", "robust", "leverage" (as a verb), "tapestry", "embark", "unleash", "game-changer", "buckle up", "let's dive in", "without further ado", "in conclusion".
- Don't pad sentences with "It's important to note that…" or "It is essential to understand that…". Just say the thing.
- Don't moralise — no "while X has its merits, it's crucial to consider…". Just state the trade-off.
- Don't write "this post will explore" or "we'll be looking at". The reader is here, they know what they clicked.
- Don't sign off as anything other than the byline. No "Happy coding!", no signoff at all.
- Do NOT add disclaimers, AI mentions, or "this is generated content" notices. The post is published under your byline.

# Structure target

- 1700-2100 words. Strictly. A 1200-word post is too short; a 2800-word post is bloated.
- DO NOT include a top-level \`# Title\` line — the page renders the title from the database row.
- First paragraph IS the intro. The site's CSS gives it a drop cap, so make it count — 2-4 sentences that establish the problem and your stance.
- Each \`##\` section is a real point, not a heading-tax filler ("What is X?" / "Why does it matter?" — banned).

# Slug

- Lowercase ASCII, hyphens for spaces, no punctuation, max 80 chars.
- Topic-leading: \`postgres-merge-deadlocks-under-load\`, not \`a-deep-dive-into-postgres\`.
- No date prefix. The DB column carries the date.

# Tags

- 3-5 tags. Lowercase, hyphenated. Topic-first ordering — the most specific tag first.
- Examples that work: \`postgres\`, \`distributed-systems\`, \`sre\`, \`api-design\`, \`performance\`, \`security\`, \`platform-engineering\`.

# Description

- 120-160 chars. One or two complete sentences. No "Learn how to…" or "A guide to…". Lead with the substantive claim of the post.
`;

function buildSystem(samples: VoiceSample[]): string {
  if (samples.length === 0) return SYSTEM_BASE;
  const block = samples
    .map(
      (s, i) =>
        `### Voice sample ${i + 1} — "${s.title}"\n\n${s.opening.trim()}`,
    )
    .join("\n\n---\n\n");
  return `${SYSTEM_BASE}

# Two real openings from your past posts (match this voice)

${block}`;
}

function buildUserPrompt(topic: Topic): string {
  return `Today's topic:

- Topic: ${topic.topic}
- Angle: ${topic.angle}
- Audience: ${topic.audience}
- Why now: ${topic.why_now}

Write the post.`;
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    slug: { type: Type.STRING },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    body_md: { type: Type.STRING },
  },
  required: ["title", "description", "slug", "tags", "body_md"],
} as const;

function validateDraft(parsed: unknown): DraftPost {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("draft JSON is not an object");
  }
  const obj = parsed as Record<string, unknown>;

  const title = obj.title;
  const description = obj.description;
  const slug = obj.slug;
  const tags = obj.tags;
  const body = obj.body_md;

  if (typeof title !== "string" || title.trim().length < 10) {
    throw new Error("draft.title missing or too short");
  }
  if (typeof description !== "string" || description.trim().length < 40) {
    throw new Error("draft.description missing or too short");
  }
  if (typeof slug !== "string" || slug.trim().length < 3) {
    throw new Error("draft.slug missing or too short");
  }
  if (!Array.isArray(tags) || tags.length === 0) {
    throw new Error("draft.tags missing or empty");
  }
  const cleanTags = tags
    .map((t) => (typeof t === "string" ? t.trim().toLowerCase() : ""))
    .filter((t) => t.length > 0)
    .slice(0, 5);
  if (cleanTags.length === 0) {
    throw new Error("draft.tags has no valid entries");
  }
  if (typeof body !== "string" || body.length < 4500) {
    throw new Error(
      `draft.body_md too short (${typeof body === "string" ? body.length : 0} chars; need >= 4500)`,
    );
  }

  return {
    title: title.trim(),
    description: description.trim(),
    slug: slug.trim(),
    tags: cleanTags,
    body_md: body.trim(),
  };
}

export async function writeBlog(
  gemini: GoogleGenAI,
  topic: Topic,
  voiceSamples: VoiceSample[],
): Promise<DraftPost> {
  const gen = await gemini.models.generateContent({
    model: WRITER_MODEL,
    contents: [{ role: "user", parts: [{ text: buildUserPrompt(topic) }] }],
    config: {
      systemInstruction: buildSystem(voiceSamples),
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.7,
      // 8000 tokens ≈ 6000 words of generation budget. The structural
      // overhead of the JSON wrapper is small. Plenty of headroom for
      // a 2000-word body without truncation.
      maxOutputTokens: 8000,
    },
  });

  const text = gen.text ?? "";
  if (!text.trim()) {
    throw new Error("writeBlog: empty model response");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(
      `writeBlog: response is not valid JSON: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
  return validateDraft(parsed);
}
