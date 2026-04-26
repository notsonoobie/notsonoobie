import "server-only";
import { GoogleGenAI } from "@google/genai";

/**
 * Gemini client + helpers for the portfolio assistant.
 *
 * Two surfaces:
 *
 *   1. `embedText(input)` — turns text into a 768-dim float vector
 *      via `gemini-embedding-001`. Used by the indexer (one chunk
 *      per call) and by the chat API (one call per user message).
 *
 *   2. `streamChat({ system, messages })` — streams a Gemini
 *      `gemini-2.5-flash` response back as an async iterable of
 *      text deltas. Cheap, fast, supports tool use later if we
 *      want to expand beyond pure RAG.
 *
 * Both helpers return `null` (or no-op) when `GEMINI_API_KEY` is
 * unset so the assistant gracefully hides instead of erroring.
 *
 * Docs: https://ai.google.dev/gemini-api/docs/migrate
 */

export const EMBEDDING_MODEL = "gemini-embedding-001";
export const CHAT_MODEL = "gemini-2.5-flash";
export const EMBEDDING_DIM = 768;

let cached: GoogleGenAI | null = null;

function getClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!cached) cached = new GoogleGenAI({ apiKey });
  return cached;
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * Embed a single text into a 768-dim vector. Returns `null` if the
 * client isn't configured or the API errors. Truncates input above
 * Gemini's per-request limit (~8000 tokens for embedding-001).
 *
 * Truncation strategy: Gemini's API accepts up to ~2048 input
 * tokens for embedding-001 by default; ~30k chars is a safe upper
 * bound for the kinds of chunks we generate (target ~800 tokens =
 * ~3200 chars).
 */
export async function embedText(input: string): Promise<number[] | null> {
  const client = getClient();
  if (!client) return null;
  const truncated = input.slice(0, 30_000);
  try {
    const res = await client.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: truncated,
      config: {
        outputDimensionality: EMBEDDING_DIM,
        // Two-sided pattern: documents at index time use
        // RETRIEVAL_DOCUMENT, queries at search time use
        // RETRIEVAL_QUERY. Caller passes via the wrapper helpers
        // below so this function stays general.
      },
    });
    const values = res.embeddings?.[0]?.values;
    if (!values || values.length !== EMBEDDING_DIM) {
      console.warn("[gemini] embedText returned wrong dimensionality", {
        got: values?.length,
      });
      return null;
    }
    return values;
  } catch (err) {
    console.warn("[gemini] embedText threw", err);
    return null;
  }
}

/**
 * Stream a chat response. Yields text deltas as they arrive from
 * Gemini's streaming endpoint.
 *
 * Caller passes a system instruction (the persona + grounding
 * context) and the chronological messages. Roles are mapped:
 *   user → "user"
 *   assistant → "model"
 *
 * Yields nothing if the client isn't configured.
 */
export async function* streamChat(opts: {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  /** Optional override; defaults to gemini-2.5-flash. */
  model?: string;
  /** Hard cap on output tokens. Default 1024 — chats should be tight. */
  maxOutputTokens?: number;
}): AsyncGenerator<string, void, unknown> {
  const client = getClient();
  if (!client) return;

  const contents = opts.messages.map((m) => ({
    role: m.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: m.content }],
  }));

  try {
    const stream = await client.models.generateContentStream({
      model: opts.model ?? CHAT_MODEL,
      contents,
      config: {
        systemInstruction: opts.system,
        maxOutputTokens: opts.maxOutputTokens ?? 1024,
        temperature: 0.4,
      },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) yield text;
    }
  } catch (err) {
    console.warn("[gemini] streamChat threw", err);
  }
}
