import type { GoogleGenAI } from "@google/genai";
import matter from "gray-matter";
import "server-only";
import type { Topic } from "./topic";

/**
 * Body writer — second phase of the daily auto-blog cron.
 *
 * Takes a `Topic` from `pickTopic` and writes the full post in
 * Rahul's voice. Two layers of guarantee that the output is
 * publishable:
 *
 *   1. YAML frontmatter + markdown body output format. The body
 *      lives outside the frontmatter so the model never has to
 *      escape backslashes (\d, \w, C:\Users\…), newlines, or
 *      quotes — every one of which broke the previous JSON-mode
 *      output for technical posts. Same shape as the human
 *      importer at scripts/import-blogs.ts:142, parsed with the
 *      same gray-matter dependency.
 *   2. A post-generation quality gate that rejects the draft if
 *      it (a) uses any phrase from the LLM-tell blocklist, (b)
 *      lacks structural minimums (section count, code block,
 *      length), or (c) contains banned headings ("Conclusion",
 *      "What is X?", etc.). On rejection we retry exactly once
 *      with the failed checks fed back into the prompt as
 *      explicit "do this differently" guidance.
 *
 * Voice anchoring works on three levels:
 *   1. Explicit prose rules in the system prompt (problem-first
 *      opening, banned phrases, structure variation).
 *   2. Pinned byline + length target the model can't drift away
 *      from.
 *   3. Up to 3 verbatim opening paragraphs from real Rahul posts
 *      pasted in as few-shot exemplars. The route handler picks
 *      fresh ones randomly from the recent 10 on each invocation
 *      so the anchor stays representative AND varied.
 */

// Gemma model served through the Gemini API surface. Open-weights
// model — does NOT support Gemini-2.5-only features like
// `responseSchema` (JSON mode) or `thinkingConfig`. Frontmatter
// output sidesteps both: no schema needed, no thinking budget
// contention, and the body content can contain any character class
// without breaking the parse.
const WRITER_MODEL = "gemini-3.1-pro-preview";

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
// Quality gate — runs against the model's output. Same checks the
// prompt warns the model about, so feedback is easy to phrase on
// the retry.
// ─────────────────────────────────────────────────────────────────

/**
 * Lower-cased substrings the body must NOT contain. Each of these
 * is a near-certain LLM tell that no human technical writer would
 * ship without irony.
 *
 * Order is for readability only. The check is plain
 * `lowercased.includes(banned)` so word boundaries are deliberately
 * not enforced — "leverage" (the verb) bites harder when it
 * appears anywhere, including phrases like "we leverage Postgres".
 */
const BANNED_PHRASES = [
  // The classics
  "delve",
  "in the realm of",
  "navigate the complexities",
  "tapestry",
  "embark",
  "unleash",
  "game-changer",
  "game changer",
  // Pacing fillers
  "in today's",
  "in today’s",
  "fast-paced",
  "ever-evolving",
  "rapidly evolving",
  // Hedging
  "it's worth noting",
  "it is worth noting",
  "it's important to note",
  "it is important to note",
  "it's essential to",
  "it is essential to",
  "it's crucial to",
  "it is crucial to",
  // Listicle signposting
  "let's dive in",
  "let us dive in",
  "buckle up",
  "without further ado",
  "this post will explore",
  "we'll be looking at",
  "we will be looking at",
  "in this post, we",
  "in this article, we",
  // Closings
  "in conclusion",
  "i hope you found",
  "i hope this helps",
  "happy coding",
  "thanks for reading",
  // Hype
  "leverage", // verb bite
  // Self-reference
  "as an ai",
  "as a language model",
  "this post was generated",
];

/**
 * Header text patterns we never want as section titles. Caught with
 * a starts-with check after stripping `#`/whitespace.
 */
const BANNED_HEADERS = [
  /^conclusion\b/i,
  /^summary\b/i,
  /^introduction\b/i,
  /^what is\b/i,
  /^why does .* matter/i,
  /^why .* matters\b/i,
  /^the basics\b/i,
  /^getting started\b/i,
];

export type QualityIssue = string;

/**
 * Auto-repair common LLM reflex issues that don't need a regenerate.
 *
 * Currently handles:
 *   - Leading top-level `# Title` line. Models add this constantly
 *     even when explicitly told not to — markdown muscle-memory.
 *     Stripping it ourselves saves a full retry on what is purely
 *     a formatting nit.
 *
 * Anything we can't safely repair (banned phrases, missing
 * sections, short length) still goes through the regenerate path —
 * those changes affect meaning and need the model.
 */
export function repairBody(body: string): string {
  let repaired = body.trim();
  // Strip ONE leading `# Heading` line if present. Use `^# +` (one
  // hash, then space) so we don't strip `## Section` headers.
  repaired = repaired.replace(/^#\s+[^\n]+\n+/, "");
  return repaired.trim();
}

/**
 * Run the quality gate. Returns the list of issues found — empty
 * array = passes. Issues are short human-phrased strings so we can
 * paste them back to the model verbatim in the retry prompt.
 */
export function checkQuality(body: string): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const lower = body.toLowerCase();

  // 1. Banned phrases — substring check.
  for (const banned of BANNED_PHRASES) {
    if (lower.includes(banned)) {
      issues.push(`Body contains banned phrase: "${banned}".`);
    }
  }

  // 2. Top-level `# Title` line — page renders title from DB row.
  // (repairBody strips this automatically before quality check, so
  // it should never trip in practice. Keeping the gate for safety.)
  if (/^#\s+[^#]/m.test(body)) {
    issues.push(
      `Body still contains a top-level # heading after auto-repair. Strip every line that begins with a single # at the start of a line; the page renders the title from the DB row.`,
    );
  }

  // 3. Section count — at least 4 `##` headers.
  const sectionMatches = body.match(/^##\s+\S/gm) ?? [];
  if (sectionMatches.length < 4) {
    issues.push(
      `Body has only ${sectionMatches.length} ## sections. Need at least 4 (target: 5-7 sections).`,
    );
  }

  // 4. Banned section headers.
  const headerLines = body
    .split(/\r?\n/)
    .filter((l) => /^##+\s+/.test(l))
    .map((l) => l.replace(/^##+\s+/, "").trim());
  for (const h of headerLines) {
    for (const pattern of BANNED_HEADERS) {
      if (pattern.test(h)) {
        issues.push(
          `Banned section heading: "${h}". Replace with a content-bearing title.`,
        );
        break;
      }
    }
  }

  // 5. At least one fenced code block. Posts in Rahul's corpus
  // virtually always include code or YAML/SQL.
  const fences = body.match(/```/g) ?? [];
  if (fences.length < 2) {
    issues.push(
      `Body has no fenced code block. Include at least one with a language fence.`,
    );
  }

  // 6. Length window — proxy via char count.
  if (body.length < 4500) {
    issues.push(
      `Body too short (${body.length} chars; need >= 4500 ≈ 1500 words).`,
    );
  }
  if (body.length > 14000) {
    issues.push(
      `Body too long (${body.length} chars; trim to <= 14000 ≈ 2300 words).`,
    );
  }

  return issues;
}

// ─────────────────────────────────────────────────────────────────
// Tag normalization — defensive. Slugifies each tag in case the
// model emits "API Design" or "Distributed Systems" with caps and
// spaces. Mirrors the slugify used by the publisher for slugs.
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

Headings carry content, not labels. NEVER use: "Introduction", "Conclusion", "Summary", "What is X?", "Why does X matter?", "Getting Started", "The Basics".

# Verdict (the close)

End with a concrete take — "When to use / when to skip", "What I'd actually pick", "What I do at work", or similar. NEVER a "Conclusion" header. NEVER "I hope you found this useful". NEVER "Happy coding". NEVER "Thanks for reading". The post stops when the verdict is delivered.

# Required content

- Name real systems, real versions, real numbers. "Postgres 16's MERGE", not "modern relational databases". "Kafka 3.7", not "a message broker". If you don't know the exact version, write "as of recent releases" — never invent one.
- At least one fenced code block, SQL/YAML/config snippet, or pseudo-code. Always declare the language fence (\`\`\`ts, \`\`\`sql, \`\`\`yaml, \`\`\`go, \`\`\`sh, \`\`\`json — never bare \`\`\`).
- Use a markdown table when comparing 3+ contenders.
- Refer to real-world contexts: BFSI workloads, multi-tenant SaaS, fintech compliance, ad-tech latency budgets — whatever fits the topic.

# Banned phrases (each will get the post REJECTED automatically)

Never use any of these, in any inflection:
"delve", "in the realm of", "navigate the complexities", "tapestry", "embark", "unleash", "game-changer", "in today's", "fast-paced", "ever-evolving", "rapidly evolving", "it's worth noting", "it's important to note", "it's essential to", "it's crucial to", "let's dive in", "buckle up", "without further ado", "this post will explore", "we'll be looking at", "in this post, we", "in this article, we", "in conclusion", "i hope you found", "i hope this helps", "happy coding", "thanks for reading", "leverage" (as a verb), "as an ai", "as a language model".

Don't moralise ("while X has its merits, it's crucial to consider…"). State the trade-off and move on.

Don't sign off — no closing salutation, no AI disclosure. The byline already says it's Rahul.

Don't include a top-level \`# Title\` line — the page renders the title from the database row. Start with the intro paragraph.

# Output fields

- **title**: 40-90 chars. Sharp, claim-shaped. Bad: "A guide to Postgres MERGE". Good: "Why Postgres MERGE Won't Save Your Upsert Code".
- **description**: 120-160 chars. One or two complete sentences. Lead with the substantive claim, never "Learn how to…" or "A guide to…".
- **tags**: 3-5 tags. lowercase-hyphenated. Most specific tag first.
- **body_md**: 1700-2100 words of markdown. No top-level # heading. 5-7 sections. At least one code block. Verdict-shaped close.

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

function buildSystem(samples: VoiceSample[], retryFeedback: string[]): string {
  const sampleBlock =
    samples.length === 0
      ? ""
      : `

# Real openings from your past posts (match this voice exactly)

${samples
  .map((s, i) => `### Sample ${i + 1} — "${s.title}"\n\n${s.opening.trim()}`)
  .join("\n\n---\n\n")}`;

  const feedbackBlock =
    retryFeedback.length === 0
      ? ""
      : `

# Your previous draft was almost there — fix these issues and write the new version

${retryFeedback.map((f, i) => `${i + 1}. ${f}`).join("\n")}

CRITICAL: Write a NEW full-length post on the same topic. Do NOT shrink the body, drop sections, or simplify. The previous version was the right depth and length (1700-2100 words, 5-7 sections, at least one fenced code block). The issues above are FORMATTING only — fix them while keeping everything else. A short, safe post will be rejected for being too short.`;

  return `${SYSTEM_BASE}${sampleBlock}${feedbackBlock}`;
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
 * Pull a frontmatter draft out of a Gemma response.
 *
 * Expects the model to emit `---\n<yaml>\n---\n<markdown body>`
 * verbatim. Pre-processes for two common deviations:
 *
 *   1. Outer markdown fence (`^```yaml ... ```$`) — strip it.
 *      Anchored to start AND end so we don't accidentally chop
 *      a code block that lives inside the body.
 *   2. Leading prose before the first `---` line — discard
 *      everything up to and including the line break preceding
 *      the first `---`. gray-matter only accepts input that
 *      BEGINS with `---`.
 *
 * Returns the same `{ title, description, tags, body_md }` shape
 * `validateDraftShape` expects so the rest of the pipeline is
 * unchanged.
 */
function extractFrontmatter(raw: string): unknown {
  let trimmed = raw.trim();
  if (!trimmed) throw new Error("empty model response");

  // 1. Strip an outer fence (`^```yaml … ```$`, also `markdown`,
  //    `md`, or unlabelled). Anchored both ends.
  const fenceWrap = trimmed.match(
    /^```(?:ya?ml|markdown|md)?\s*\n([\s\S]+?)\n```\s*$/,
  );
  if (fenceWrap) trimmed = fenceWrap[1].trim();

  // 2. Drop any leading prose before the first `---` line.
  //    gray-matter requires the input to START with `---`.
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
    throw new Error("draft JSON is not an object");
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
  retryFeedback: string[],
): Promise<DraftPost> {
  // Gemma is text-only — no responseSchema, no thinkingConfig, no
  // JSON mode. We keep maxOutputTokens generous (no thinking-token
  // contention here, but JSON-quoting still inflates raw chars by
  // ~1.4×) and lean on the prompt to enforce JSON shape.
  const gen = await gemini.models.generateContent({
    model: WRITER_MODEL,
    contents: [{ role: "user", parts: [{ text: buildUserPrompt(topic) }] }],
    config: {
      systemInstruction: buildSystem(samples, retryFeedback),
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

  // Truncation detection — if the model hit MAX_TOKENS mid-stream
  // the JSON wrapper is unclosed. Surface the real cause instead of
  // letting the parser failure mask it.
  if (finishReason && String(finishReason).toUpperCase().includes("MAX")) {
    throw new Error(
      `writer: response truncated at MAX_TOKENS (got ${text.length} chars; bump maxOutputTokens or shorten the post)`,
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
  attempts: number;
  qualityIssues: QualityIssue[];
};

function repairDraft(draft: DraftPost): DraftPost {
  return { ...draft, body_md: repairBody(draft.body_md) };
}

export async function writeBlog(
  gemini: GoogleGenAI,
  topic: Topic,
  voiceSamples: VoiceSample[],
): Promise<WriteResult> {
  // First pass: no feedback.
  const first = repairDraft(await callWriter(gemini, topic, voiceSamples, []));
  const issues = checkQuality(first.body_md);

  if (issues.length === 0) {
    return { draft: first, attempts: 1, qualityIssues: [] };
  }

  console.warn(
    `[auto-blog] writer attempt 1 failed quality gate (${issues.length} issues): ${issues.join(" / ")}`,
  );

  // Second pass with explicit feedback. Retry prompt is worded to
  // preserve length/depth — the model has a tendency to over-correct
  // by shrinking when given a single-issue rejection.
  const second = repairDraft(
    await callWriter(gemini, topic, voiceSamples, issues),
  );
  const secondIssues = checkQuality(second.body_md);

  if (secondIssues.length === 0) {
    return { draft: second, attempts: 2, qualityIssues: [] };
  }

  // Two-strikes: surface the failure rather than publish a known-bad
  // post under Rahul's byline. The cron will retry tomorrow; the
  // user can manually re-trigger if they want to inspect.
  throw new Error(
    `writer: quality gate failed twice. Final issues: ${secondIssues.join(" / ")}`,
  );
}
