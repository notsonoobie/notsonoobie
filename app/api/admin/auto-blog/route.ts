import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { GoogleGenAI } from "@google/genai";

import { getSupabaseServer } from "@/lib/supabase/server";
import { isGeminiConfigured } from "@/lib/gemini";
import { pickTopic } from "@/lib/auto-blog/topic";
import { writeBlog, type VoiceSample } from "@/lib/auto-blog/writer";
import { findRecentlyPublished, publishBlog } from "@/lib/auto-blog/publisher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Two Gemini calls (one grounded topic pick, one structured body
// write) plus a Supabase insert. The cron path comfortably finishes
// in 30-50s on the warm path; 300s ceiling absorbs cold starts and
// the worst case where the writer's quality gate fires a retry.
export const maxDuration = 300;

// ─────────────────────────────────────────────────────────────────
// Auth — copy of the timing-safe Bearer check from the reindex
// route. Two call sites isn't worth a shared module.
// ─────────────────────────────────────────────────────────────────

function constantTimeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return constantTimeEqual(header, expected);
}

function unauthorized() {
  return NextResponse.json(
    { ok: false, error: "unauthorized" },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

function ensureClients():
  | { ok: true; supabase: ReturnType<typeof getSupabaseServer>; gemini: GoogleGenAI }
  | { ok: false; response: NextResponse } {
  if (!isGeminiConfigured()) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "gemini_unconfigured" },
        { status: 503 },
      ),
    };
  }
  return {
    ok: true,
    supabase: getSupabaseServer(),
    gemini: new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! }),
  };
}

// ─────────────────────────────────────────────────────────────────
// Voice samples — pull 3 random posts from the recent 10 so the
// writer's few-shot anchor stays representative AND varied across
// runs. Always taking the latest 2 creates an echo chamber where
// each new post over-indexes on the most recent ones.
// ─────────────────────────────────────────────────────────────────

const SAMPLE_POOL = 10;
const SAMPLE_COUNT = 3;

async function loadVoiceSamples(
  supabase: ReturnType<typeof getSupabaseServer>,
): Promise<VoiceSample[]> {
  const { data, error } = await supabase
    .from("blogs")
    .select("title, body_md")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(SAMPLE_POOL);
  if (error) {
    console.warn("[auto-blog] voice-sample load failed", error.message);
    return [];
  }
  const rows = (data as { title: string; body_md: string }[]) ?? [];
  // Fisher-Yates partial shuffle — pick SAMPLE_COUNT distinct indices
  // out of the pool. Deterministic enough for our use; cryptographic
  // randomness is overkill for "which 3 posts to show the model".
  const indices = Array.from({ length: rows.length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices
    .slice(0, SAMPLE_COUNT)
    .map((idx) => rows[idx])
    .map((r) => ({ title: r.title, opening: r.body_md.slice(0, 700) }));
}

// ─────────────────────────────────────────────────────────────────
// Timeout wrapper — Gemini SDK doesn't expose per-call timeouts.
// Without this a hung request would block until maxDuration (300s).
// Per-phase 90s is generous (warm path is < 30s) but fences off the
// pathological case.
// ─────────────────────────────────────────────────────────────────

const PHASE_TIMEOUT_MS = 90_000;

function withTimeout<T>(label: string, promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label}: timed out after ${PHASE_TIMEOUT_MS}ms`));
    }, PHASE_TIMEOUT_MS);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

// ─────────────────────────────────────────────────────────────────
// GET — Vercel Cron entry point
//
// Query params:
//   ?dryRun=1  Run topic + writer phases, skip the DB insert.
//              Returns the generated draft so a human can read it.
//   ?force=1   Bypass the "already published in the last 22h"
//              idempotency guard. Useful for manual re-runs after
//              deleting a bad post.
// ─────────────────────────────────────────────────────────────────

function logPhase(phase: string, payload: Record<string, unknown>) {
  console.log(`[auto-blog] ${JSON.stringify({ phase, ...payload })}`);
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return unauthorized();
  const clients = ensureClients();
  if (!clients.ok) return clients.response;
  const { supabase, gemini } = clients;

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const force = url.searchParams.get("force") === "1";

  const startedAt = Date.now();

  try {
    // Idempotency guard — skipped on dryRun (no insert anyway) or
    // when the caller explicitly forces.
    if (!dryRun && !force) {
      const recent = await findRecentlyPublished(supabase);
      if (recent) {
        logPhase("idempotency", {
          ok: true,
          skipped: true,
          recentSlug: recent.slug,
          recentPublishedAt: recent.published_at,
        });
        return NextResponse.json(
          {
            ok: true,
            skipped: "already_published_recently",
            recentSlug: recent.slug,
            recentPublishedAt: recent.published_at,
            elapsedMs: Date.now() - startedAt,
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      }
    }

    // Phase 1 — topic.
    const t0 = Date.now();
    const topic = await withTimeout("topic", pickTopic(supabase, gemini));
    logPhase("topic", {
      ok: true,
      topic: topic.topic,
      angle: topic.angle,
      elapsedMs: Date.now() - t0,
    });

    // Phase 2 — voice samples (cheap; no timeout needed).
    const samples = await loadVoiceSamples(supabase);
    logPhase("voice", {
      ok: true,
      samples: samples.length,
      titles: samples.map((s) => s.title),
    });

    // Phase 3 — write. Quality gate may retry once internally, so
    // give the timeout the same headroom as a single Gemini call ×2.
    const t2 = Date.now();
    const writeResult = await withTimeout(
      "write",
      writeBlog(gemini, topic, samples),
    );
    logPhase("write", {
      ok: true,
      title: writeResult.draft.title,
      bodyChars: writeResult.draft.body_md.length,
      tagCount: writeResult.draft.tags.length,
      attempts: writeResult.attempts,
      elapsedMs: Date.now() - t2,
    });

    // Phase 4 — publish (or simulate, if dryRun).
    const t3 = Date.now();
    const result = await publishBlog(supabase, writeResult.draft, { dryRun });
    logPhase("publish", {
      ok: true,
      slug: result.slug,
      wordCount: result.wordCount,
      readingTime: result.readingTime,
      isPublished: result.isPublished,
      dryRun,
      elapsedMs: Date.now() - t3,
    });

    const elapsedMs = Date.now() - startedAt;

    // On dryRun, include the full body so a human can read the
    // generated post without hitting the DB. On real runs, omit it
    // to keep the response payload sensible.
    return NextResponse.json(
      {
        ok: true,
        dryRun,
        slug: result.slug,
        title: writeResult.draft.title,
        description: writeResult.draft.description,
        tags: writeResult.draft.tags,
        topic: topic.topic,
        angle: topic.angle,
        wordCount: result.wordCount,
        readingTime: result.readingTime,
        writerAttempts: writeResult.attempts,
        isPublished: result.isPublished,
        elapsedMs,
        ...(dryRun ? { body_md: writeResult.draft.body_md } : {}),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    const elapsedMs = Date.now() - startedAt;
    logPhase("error", { ok: false, error: message, elapsedMs });
    return NextResponse.json(
      { ok: false, error: message, elapsedMs },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
