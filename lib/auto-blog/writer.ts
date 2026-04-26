import "server-only";
import { Type, type GoogleGenAI } from "@google/genai";
import type { Topic } from "./topic";

/**
 * Body writer — second phase of the daily auto-blog cron.
 *
 * Takes a `Topic` from `pickTopic` and writes the full post in
 * Rahul's voice. Two layers of guarantee that the output is
 * publishable:
 *
 *   1. Structured JSON output (`responseSchema`) so the response
 *      shape is non-negotiable — no text-extraction games.
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

const WRITER_MODEL = "gemini-2.5-flash";

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
  if (/^# [^#]/m.test(body)) {
    issues.push(`Body starts with a top-level # heading. Don't include the title — strip it; the page renders the title from the DB row.`);
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
        issues.push(`Banned section heading: "${h}". Replace with a content-bearing title.`);
        break;
      }
    }
  }

  // 5. At least one fenced code block. Posts in Rahul's corpus
  // virtually always include code or YAML/SQL.
  const fences = body.match(/```/g) ?? [];
  if (fences.length < 2) {
    issues.push(`Body has no fenced code block. Include at least one with a language fence.`);
  }

  // 6. Length window — proxy via char count.
  if (body.length < 4500) {
    issues.push(`Body too short (${body.length} chars; need >= 4500 ≈ 1500 words).`);
  }
  if (body.length > 14000) {
    issues.push(`Body too long (${body.length} chars; trim to <= 14000 ≈ 2300 words).`);
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
- **body_md**: 1700-2100 words of markdown. No top-level # heading. 5-7 sections. At least one code block. Verdict-shaped close.`;

function buildSystem(samples: VoiceSample[], retryFeedback: string[]): string {
  const sampleBlock =
    samples.length === 0
      ? ""
      : `

# Real openings from your past posts (match this voice exactly)

${samples
  .map(
    (s, i) =>
      `### Sample ${i + 1} — "${s.title}"\n\n${s.opening.trim()}`,
  )
  .join("\n\n---\n\n")}`;

  const feedbackBlock =
    retryFeedback.length === 0
      ? ""
      : `

# Your previous draft was REJECTED. Fix these issues and try again:

${retryFeedback.map((f, i) => `${i + 1}. ${f}`).join("\n")}`;

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

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    body_md: { type: Type.STRING },
  },
  required: ["title", "description", "tags", "body_md"],
} as const;

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
  const gen = await gemini.models.generateContent({
    model: WRITER_MODEL,
    contents: [{ role: "user", parts: [{ text: buildUserPrompt(topic) }] }],
    config: {
      systemInstruction: buildSystem(samples, retryFeedback),
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.7,
      // 8000 tokens ≈ 6000 words of generation budget. Plenty of
      // headroom for a 2000-word body wrapped in JSON.
      maxOutputTokens: 8000,
    },
  });

  const text = gen.text ?? "";
  if (!text.trim()) {
    const reason = gen.candidates?.[0]?.finishReason;
    throw new Error(
      `writer: empty model response (finishReason=${reason ?? "unknown"})`,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    const preview = text.slice(0, 200).replace(/\s+/g, " ");
    throw new Error(
      `writer: response is not valid JSON: ${
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

export async function writeBlog(
  gemini: GoogleGenAI,
  topic: Topic,
  voiceSamples: VoiceSample[],
): Promise<WriteResult> {
  // First pass: no feedback.
  let draft = await callWriter(gemini, topic, voiceSamples, []);
  let issues = checkQuality(draft.body_md);

  if (issues.length === 0) {
    return { draft, attempts: 1, qualityIssues: [] };
  }

  console.warn(
    `[auto-blog] writer attempt 1 failed quality gate (${issues.length} issues): ${issues.join(" / ")}`,
  );

  // Second pass with explicit feedback.
  const second = await callWriter(gemini, topic, voiceSamples, issues);
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
