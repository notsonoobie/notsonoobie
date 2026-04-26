import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { GoogleGenAI } from "@google/genai";

import { getSupabaseServer } from "@/lib/supabase/server";
import { isGeminiConfigured } from "@/lib/gemini";
import { pickTopic } from "@/lib/auto-blog/topic";
import { writeBlog, type VoiceSample } from "@/lib/auto-blog/writer";
import { publishBlog } from "@/lib/auto-blog/publisher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Two Gemini calls (one grounded, one structured) + a Supabase insert.
// Comfortably fits in 60s on a warm path; 300s ceiling is for the
// rare cold-start case where embedding-aware reindex (cascaded via
// the existing webhook) hits the same instance.
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
// Voice samples — pull two recent posts so the writer's few-shot
// stays representative as the corpus grows.
// ─────────────────────────────────────────────────────────────────

async function loadVoiceSamples(
  supabase: ReturnType<typeof getSupabaseServer>,
): Promise<VoiceSample[]> {
  const { data, error } = await supabase
    .from("blogs")
    .select("title, body_md")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(2);
  if (error) {
    console.warn("[auto-blog] voice-sample load failed", error.message);
    return [];
  }
  const rows = (data as { title: string; body_md: string }[]) ?? [];
  return rows.map((r) => ({
    title: r.title,
    opening: r.body_md.slice(0, 700),
  }));
}

// ─────────────────────────────────────────────────────────────────
// GET — Vercel Cron entry point
// ─────────────────────────────────────────────────────────────────

function logPhase(phase: string, payload: Record<string, unknown>) {
  // One-line JSON per phase so Vercel function logs grep cleanly.
  console.log(`[auto-blog] ${JSON.stringify({ phase, ...payload })}`);
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return unauthorized();
  const clients = ensureClients();
  if (!clients.ok) return clients.response;
  const { supabase, gemini } = clients;

  const startedAt = Date.now();
  try {
    const topic = await pickTopic(supabase, gemini);
    logPhase("topic", { ok: true, topic: topic.topic, angle: topic.angle });

    const samples = await loadVoiceSamples(supabase);
    logPhase("voice", { ok: true, samples: samples.length });

    const draft = await writeBlog(gemini, topic, samples);
    logPhase("write", {
      ok: true,
      title: draft.title,
      bodyChars: draft.body_md.length,
      tagCount: draft.tags.length,
    });

    const result = await publishBlog(supabase, draft);
    logPhase("publish", {
      ok: true,
      slug: result.slug,
      wordCount: result.wordCount,
      readingTime: result.readingTime,
      isPublished: result.isPublished,
    });

    const elapsedMs = Date.now() - startedAt;
    return NextResponse.json(
      {
        ok: true,
        slug: result.slug,
        title: draft.title,
        topic: topic.topic,
        wordCount: result.wordCount,
        readingTime: result.readingTime,
        isPublished: result.isPublished,
        elapsedMs,
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
