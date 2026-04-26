/**
 * Markdown-aware chunker for the assistant index.
 *
 * Goal: split long documents into coherent ~800-token chunks while
 * preserving the natural structure of the source (headings,
 * paragraphs). Short documents stay as a single chunk.
 *
 * Strategy:
 *   1. If the doc fits in one chunk (under target tokens), return it.
 *   2. Otherwise split on H1/H2/H3 boundaries — each section
 *      becomes its own chunk.
 *   3. If any section is still too big, slice it into overlapping
 *      paragraph windows.
 *   4. If a single paragraph exceeds the limit (rare — long code
 *      blocks), hard-cut on character count.
 *
 * No external tokenizer dependency: ~4 chars ≈ 1 token is a
 * conservative approximation across English + code.
 */

export const TARGET_TOKENS = 800;
export const MAX_TOKENS = 1100; // hard ceiling per chunk
export const OVERLAP_TOKENS = 100;

const CHARS_PER_TOKEN = 4;
const TARGET_CHARS = TARGET_TOKENS * CHARS_PER_TOKEN;
const MAX_CHARS = MAX_TOKENS * CHARS_PER_TOKEN;
const OVERLAP_CHARS = OVERLAP_TOKENS * CHARS_PER_TOKEN;

export type Chunk = {
  /** 0-based index within the source. */
  index: number;
  content: string;
  /** Approximate token count. */
  tokens: number;
};

export function approxTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Split markdown content into chunks. Returns at least one chunk
 * even for empty input (an empty chunk is filtered out by the
 * caller via length checks if desired).
 */
export function chunkMarkdown(markdown: string): Chunk[] {
  const trimmed = markdown.trim();
  if (!trimmed) return [];

  // Fast path: whole doc fits in one chunk.
  if (trimmed.length <= MAX_CHARS) {
    return [{ index: 0, content: trimmed, tokens: approxTokens(trimmed) }];
  }

  // Split on top-level headings (H1, H2, H3). Keep the heading
  // attached to its following content.
  const sections = splitOnHeadings(trimmed);

  const chunks: string[] = [];
  for (const section of sections) {
    if (section.length <= MAX_CHARS) {
      chunks.push(section);
    } else {
      // Section too big — break by paragraph windows.
      chunks.push(...windowByParagraphs(section));
    }
  }

  return chunks
    .map((c) => c.trim())
    .filter((c) => c.length > 0)
    .map((content, index) => ({
      index,
      content,
      tokens: approxTokens(content),
    }));
}

function splitOnHeadings(markdown: string): string[] {
  // Match lines starting with #, ##, or ###. Don't split deeper —
  // small subsections stay with their parent.
  const lines = markdown.split("\n");
  const sections: string[] = [];
  let current: string[] = [];

  const isBoundary = (line: string) => /^#{1,3}\s/.test(line);

  for (const line of lines) {
    if (isBoundary(line) && current.length > 0) {
      sections.push(current.join("\n"));
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) sections.push(current.join("\n"));

  return sections;
}

function windowByParagraphs(text: string): string[] {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let buf = "";

  for (const p of paragraphs) {
    if (!p.trim()) continue;

    // Single paragraph too big — hard-slice it on char count.
    if (p.length > MAX_CHARS) {
      if (buf) {
        chunks.push(buf);
        buf = "";
      }
      let cursor = 0;
      while (cursor < p.length) {
        const end = Math.min(cursor + TARGET_CHARS, p.length);
        chunks.push(p.slice(cursor, end));
        cursor = end - OVERLAP_CHARS;
        if (cursor < 0) cursor = 0;
        if (end >= p.length) break;
      }
      continue;
    }

    if ((buf + "\n\n" + p).length > TARGET_CHARS && buf.length > 0) {
      chunks.push(buf);
      // Overlap: carry the tail of the previous chunk into the next.
      const overlap = buf.length > OVERLAP_CHARS ? buf.slice(-OVERLAP_CHARS) : buf;
      buf = overlap + "\n\n" + p;
    } else {
      buf = buf ? buf + "\n\n" + p : p;
    }
  }
  if (buf.length > 0) chunks.push(buf);
  return chunks;
}
