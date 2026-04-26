import type { GoogleGenAI } from "@google/genai";
import matter from "gray-matter";
import "server-only";
import type { Topic } from "./topic";

/**
 * Body writer — second phase of the daily auto-blog cron.
 *
 * Takes a `Topic` from `pickTopic` and writes the full post in
 * Rahul's voice. Output format is YAML frontmatter + markdown body
 * (same shape as the human importer at scripts/import-blogs.ts:142,
 * parsed with the same gray-matter dependency). The body lives
 * outside the frontmatter so the model never has to escape
 * backslashes (\d, \w, C:\Users\…), newlines, or quotes — every
 * one of which broke the previous JSON-mode output for technical
 * posts.
 *
 * Quality gating is intentionally minimal: per the user directive
 * "remove the over-plugged guardrails", we no longer reject posts
 * for banned phrases, banned headers, section count, code-block
 * presence, or length-ceiling. The single remaining sanity check
 * is a min-length floor (1500 chars ≈ 500 words) so we don't ship
 * literal stubs. Auto-repair (strip leading `# Title`) still runs
 * because it's transparent — fixes a markdown reflex without
 * affecting content.
 *
 * Voice anchoring stays:
 *   1. Voice rules in the system prompt (problem-first opening,
 *      structure variation, banned-phrase guidance, verdict close).
 *   2. Pinned byline + length target.
 *   3. Up to 3 verbatim opening paragraphs from real posts as
 *      few-shot exemplars (sampled randomly by the route handler).
 */

const WRITER_MODEL = "gemini-3.1-pro-preview";
const MIN_BODY_CHARS = 1500;

export type DraftPost = {
  title: string;
  description: string;
  tags: string[];
  body_md: string;
};

export type VoiceSample = {
  title: string;
  /** First ~700 chars of the post body — the intro that sets tone. */
  opening: string;
};

// ─────────────────────────────────────────────────────────────────
// Auto-repair — runs before publish. Transparent fix, not a gate.
// ─────────────────────────────────────────────────────────────────

/**
 * Strip a leading top-level `# Title` line if present. Models add
 * one constantly even when explicitly told not to (markdown muscle-
 * memory). The page renders the title from the database row, so a
 * top-level heading would be a duplicate.
 */
export function repairBody(body: string): string {
  let repaired = body.trim();
  // `^# +` matches one hash + space — does NOT touch `## Section`.
  repaired = repaired.replace(/^#\s+[^\n]+\n+/, "");
  return repaired.trim();
}

// ─────────────────────────────────────────────────────────────────
// Tag normalization — defensive. Slugifies each tag in case the
// model emits "API Design" or "Distributed Systems" with caps and
// spaces.
// ─────────────────────────────────────────────────────────────────

function slugifyTag(tag: string): string {
  return tag
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

// ─────────────────────────────────────────────────────────────────
// Prompts
// ─────────────────────────────────────────────────────────────────

const SYSTEM_BASE = `You are Rahul Gupta. You're writing one post for your personal engineering blog at agenticwithrahul.in.

You are a Senior Software Engineer · Solutions Architect · Agentic AI based in Mumbai, India. You ship production systems for BFSI, fintech, SaaS and platform teams. You've been doing this for ten years; you're allergic to hype, dogma, and content marketing that doesn't actually say anything.

Your readers are senior software engineers, engineering managers, CTOs, CIOs, CISOs. Write for someone who already knows the basics and wants the part most posts skip.

# What "Rahul's voice" actually means

You are skeptical of consensus. You write the part that gets edited out of conference talks. You name specific systems, specific versions, specific failure modes. You give a verdict at the end — readers should leave knowing what you would actually pick.

Your sentences are short. You start paragraphs with the point, not the setup. You use "you" to address the reader directly. You use British/Indian spellings sometimes (optimise, behaviour, centre) without making a thing of it.

# Opening (the part the page renders with a drop cap)

The first paragraph IS the intro. 2-4 sentences. Use one of these patterns — never "In today's…", never "X is a…":

- "Most teams that adopt X discover Y the moment Z." (claim + concrete failure)
- "If you've been told X, you're going to be disappointed when Y." (puncture expectation)
- "There's a moment in every X system where you realise Y." (universal, specific)
- "X looks great in the docs. Then you put it behind real load and Z." (demo vs. production)
- A sharp one-line claim followed by the trade-off it implies.

# Structure (4-7 sections)

Pick whichever shape fits the topic. Don't default to "## 1. Section" numbering on every post — vary the structure. Good examples:

- Numbered: ## 1. Where this falls down · ## 2. The fix everyone tries · ## 3. Why it doesn't work · ## 4. What I actually do
- Story arc: ## The setup · ## What broke · ## What I tried · ## What worked · ## When this still falls down
- Comparison: ## The contenders · ## Where each wins · ## Where each loses · ## Pick this when…
- Failure-mode tour: ## Symptom · ## Root cause · ## The naive fix · ## The real fix · ## What to monitor

Headings carry content, not labels. Avoid: "Introduction", "Conclusion", "Summary", "What is X?", "Why does X matter?", "Getting Started", "The Basics".

# Verdict (the close)

End with a concrete take — "When to use / when to skip", "What I'd actually pick", "What I do at work", or similar. Avoid a "Conclusion" header. Avoid "I hope you found this useful". Avoid "Happy coding". Avoid "Thanks for reading". The post stops when the verdict is delivered.

# Required content

- Name real systems, real versions, real numbers. "Postgres 16's MERGE", not "modern relational databases". "Kafka 3.7", not "a message broker". If you don't know the exact version, write "as of recent releases" — never invent one.
- Include at least one fenced code block, SQL/YAML/config snippet, or pseudo-code where it adds clarity. Always declare the language fence (\`\`\`ts, \`\`\`sql, \`\`\`yaml, \`\`\`go, \`\`\`sh, \`\`\`json — never bare \`\`\`).
- Use a markdown table when comparing 3+ contenders.
- Refer to real-world contexts: BFSI workloads, multi-tenant SaaS, fintech compliance, ad-tech latency budgets — whatever fits the topic.

# Words to avoid

These are LLM tells that no human technical writer would ship without irony. Avoid them in any inflection: "delve", "in the realm of", "navigate the complexities", "tapestry", "embark", "unleash", "game-changer", "in today's", "fast-paced", "ever-evolving", "rapidly evolving", "it's worth noting", "it's important to note", "it's essential to", "it's crucial to", "let's dive in", "buckle up", "without further ado", "this post will explore", "we'll be looking at", "in this post, we", "in this article, we", "in conclusion", "i hope you found", "i hope this helps", "happy coding", "thanks for reading", "leverage" (as a verb), "as an ai", "as a language model".

Don't moralise ("while X has its merits, it's crucial to consider…"). State the trade-off and move on.

Don't sign off — no closing salutation, no AI disclosure. The byline already says it's Rahul.

Don't include a top-level \`# Title\` line — the page renders the title from the database row. Start with the intro paragraph.

# Output fields

- **title**: 40-90 chars. Sharp, claim-shaped. Bad: "A guide to Postgres MERGE". Good: "Why Postgres MERGE Won't Save Your Upsert Code".
- **description**: 120-160 chars. One or two complete sentences. Lead with the substantive claim, never "Learn how to…" or "A guide to…".
- **tags**: 3-5 tags. lowercase-hyphenated. Most specific tag first.
- **body_md**: 1500-2000 words of markdown. No top-level # heading. 4-7 sections. Verdict-shaped close.

# Output format (CRITICAL — read carefully)

Output the post as YAML frontmatter followed by the markdown body. Start the response with three dashes on their own line. Then the frontmatter (title, description, tags). Then three dashes on their own line. Then the body.

ALWAYS quote the title and description with single quotes. Always wrap tags in a JSON-style inline array with double-quoted strings. If the title or description contains a literal single quote, double it ('don''t'). Do not put any prose before the opening '---'. Do not wrap the response in a markdown fence.

Example of the exact format:

---
title: 'Sharp claim-shaped title here'
description: 'One or two complete sentences leading with the substantive claim.'
tags: ["primary-tag", "secondary-tag", "tertiary-tag"]
---
The intro paragraph goes here. Then the rest of the post — sections, code fences, tables, everything. Newlines, backticks, backslashes, and double quotes are all fine; write them as-is. Do NOT include a top-level # heading; the page renders the title from the database row.`;

function buildSystem(samples: VoiceSample[]): string {
  if (samples.length === 0) return SYSTEM_BASE;
  const sampleBlock = `

# Real openings from your past posts (match this voice exactly)

${samples
  .map((s, i) => `### Sample ${i + 1} — "${s.title}"\n\n${s.opening.trim()}`)
  .join("\n\n---\n\n")}`;
  return `${SYSTEM_BASE}${sampleBlock}`;
}

function buildUserPrompt(topic: Topic): string {
  return `Today's topic:

- Topic: ${topic.topic}
- Angle: ${topic.angle}
- Audience: ${topic.audience}
- Why now: ${topic.why_now}

Write the post.`;
}

/**
 * Pull a frontmatter draft out of a model response.
 *
 * Expects `---\n<yaml>\n---\n<markdown body>` verbatim. Pre-process
 * for two common deviations:
 *
 *   1. Outer markdown fence (`^```yaml ... ```$`) — strip it.
 *      Anchored to start AND end so we don't accidentally chop a
 *      code block that lives inside the body.
 *   2. Leading prose before the first `---` line — discard up to
 *      and including the line break preceding the first `---`.
 *      gray-matter requires the input to begin with `---`.
 */
function extractFrontmatter(raw: string): unknown {
  let trimmed = raw.trim();
  if (!trimmed) throw new Error("empty model response");

  // 1. Strip an outer fence (anchored both ends).
  const fenceWrap = trimmed.match(
    /^```(?:ya?ml|markdown|md)?\s*\n([\s\S]+?)\n```\s*$/,
  );
  if (fenceWrap) trimmed = fenceWrap[1].trim();

  // 2. Drop any leading prose before the first `---` line.
  if (!trimmed.startsWith("---")) {
    const m = trimmed.match(/^[\s\S]*?(^---\s*$)/m);
    if (m) {
      const idx = trimmed.indexOf(m[1]);
      if (idx >= 0) trimmed = trimmed.slice(idx);
    }
  }

  if (!trimmed.startsWith("---")) {
    const preview = raw.slice(0, 200).replace(/\s+/g, " ");
    throw new Error(`no YAML frontmatter found (got: "${preview}")`);
  }

  let parsed: ReturnType<typeof matter>;
  try {
    parsed = matter(trimmed);
  } catch (err) {
    const preview = trimmed.slice(0, 200).replace(/\s+/g, " ");
    throw new Error(
      `frontmatter parse failed: ${
        err instanceof Error ? err.message : String(err)
      } (preview: "${preview}")`,
    );
  }

  return { ...parsed.data, body_md: parsed.content.trim() };
}

function validateDraftShape(parsed: unknown): DraftPost {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("draft is not an object");
  }
  const obj = parsed as Record<string, unknown>;

  const title = obj.title;
  const description = obj.description;
  const tags = obj.tags;
  const body = obj.body_md;

  if (typeof title !== "string" || title.trim().length < 10) {
    throw new Error("draft.title missing or too short");
  }
  if (typeof description !== "string" || description.trim().length < 40) {
    throw new Error("draft.description missing or too short");
  }
  if (!Array.isArray(tags) || tags.length === 0) {
    throw new Error("draft.tags missing or empty");
  }
  const cleanTags = tags
    .map((t) => (typeof t === "string" ? slugifyTag(t) : ""))
    .filter((t) => t.length >= 2 && t.length <= 40)
    .slice(0, 5);
  if (cleanTags.length === 0) {
    throw new Error("draft.tags has no valid entries after normalization");
  }
  if (typeof body !== "string") {
    throw new Error("draft.body_md missing");
  }

  return {
    title: title.trim(),
    description: description.trim(),
    tags: cleanTags,
    body_md: body.trim(),
  };
}

async function callWriter(
  gemini: GoogleGenAI,
  topic: Topic,
  samples: VoiceSample[],
): Promise<DraftPost> {
  const gen = await gemini.models.generateContent({
    model: WRITER_MODEL,
    contents: [{ role: "user", parts: [{ text: buildUserPrompt(topic) }] }],
    config: {
      systemInstruction: buildSystem(samples),
      temperature: 0.7,
      maxOutputTokens: 24000,
    },
  });

  const text = gen.text ?? "";
  const finishReason = gen.candidates?.[0]?.finishReason;

  if (!text.trim()) {
    throw new Error(
      `writer: empty model response (finishReason=${finishReason ?? "unknown"})`,
    );
  }

  if (finishReason && /MAX/i.test(String(finishReason))) {
    throw new Error(
      `writer: response truncated at MAX_TOKENS (got ${text.length} chars)`,
    );
  }

  let parsed: unknown;
  try {
    parsed = extractFrontmatter(text);
  } catch (err) {
    const preview = text.slice(0, 200).replace(/\s+/g, " ");
    throw new Error(
      `writer: frontmatter extraction failed (finishReason=${finishReason ?? "unknown"}, length=${text.length}): ${
        err instanceof Error ? err.message : String(err)
      } (preview: "${preview}")`,
    );
  }
  return validateDraftShape(parsed);
}

export type WriteResult = {
  draft: DraftPost;
  /** Always 1 now (single attempt; no quality-gate retry). Kept on
   *  the response so the route's logging contract is unchanged. */
  attempts: number;
};

export async function writeBlog(
  gemini: GoogleGenAI,
  topic: Topic,
  voiceSamples: VoiceSample[],
): Promise<WriteResult> {
  const raw = await callWriter(gemini, topic, voiceSamples);
  const draft = { ...raw, body_md: repairBody(raw.body_md) };

  // Single sanity check: refuse to publish a literal stub. Anything
  // above the floor — even a 1700-char post — ships.
  if (draft.body_md.length < MIN_BODY_CHARS) {
    throw new Error(
      `writer: body too short (${draft.body_md.length} chars; need >= ${MIN_BODY_CHARS} ≈ 500 words)`,
    );
  }

  return { draft, attempts: 1 };
}
