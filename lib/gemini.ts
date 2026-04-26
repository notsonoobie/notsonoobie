import { GoogleGenAI } from "@google/genai";
import "server-only";

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
 *      `gemini-3-flash-preview` response back as an async iterable of
 *      text deltas. Cheap, fast, supports tool use later if we
 *      want to expand beyond pure RAG.
 *
 * Both helpers return `null` (or no-op) when `GEMINI_API_KEY` is
 * unset so the assistant gracefully hides instead of erroring.
 *
 * Docs: https://ai.google.dev/gemini-api/docs/migrate
 */

export const EMBEDDING_MODEL = "gemini-embedding-001";
export const CHAT_MODEL = "gemini-3-flash-preview";
export const EMBEDDING_DIM = 768;

/**
 * Asymmetric embedding hint. Documents indexed for retrieval should
 * use `RETRIEVAL_DOCUMENT`; the queries searching against them
 * should use `RETRIEVAL_QUERY`. Gemini optimises the vector space
 * differently for each, materially improving recall.
 */
export type EmbeddingTaskType =
  | "RETRIEVAL_DOCUMENT"
  | "RETRIEVAL_QUERY"
  | "SEMANTIC_SIMILARITY";

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
 * Gemini's per-request limit.
 *
 * Pass `taskType` to bias Gemini's embedding for the asymmetric
 * retrieval pattern: `RETRIEVAL_DOCUMENT` for indexed content,
 * `RETRIEVAL_QUERY` for the user's question. Without it, Gemini
 * uses a generic embedding that's strictly weaker for retrieval.
 */
export async function embedText(
  input: string,
  taskType: EmbeddingTaskType = "RETRIEVAL_DOCUMENT",
): Promise<number[] | null> {
  const client = getClient();
  if (!client) return null;
  const truncated = input.slice(0, 30_000);
  try {
    const res = await client.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: truncated,
      config: {
        outputDimensionality: EMBEDDING_DIM,
        taskType,
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
  /** Optional override; defaults to gemini-3-flash-preview. */
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
