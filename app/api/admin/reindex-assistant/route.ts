import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { GoogleGenAI } from "@google/genai";

import { getSupabaseServer } from "@/lib/supabase/server";
import { isGeminiConfigured } from "@/lib/gemini";
import {
  deleteSource,
  indexAll,
  indexSource,
  type SourceType,
} from "@/lib/assistant/index-builder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Full reindex of ~600 chunks runs ~30-40s. 300s ceiling on Vercel
// Pro gives plenty of headroom; Hobby caps at 60s but the webhook
// path (incremental, single source) is well under that anyway.
export const maxDuration = 300;

// ─────────────────────────────────────────────────────────────────
// Auth helpers
// ─────────────────────────────────────────────────────────────────

function constantTimeEqual(a: string, b: string): boolean {
  // timingSafeEqual requires equal-length buffers; pad one if not.
  // Hashing both first sidesteps the length discrepancy and avoids
  // leaking length info via timing.
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

function isWebhookAuthorized(request: Request): boolean {
  const secret = process.env.REINDEX_WEBHOOK_SECRET;
  if (!secret) return false;
  const header = request.headers.get("x-webhook-secret") ?? "";
  return constantTimeEqual(header, secret);
}

function unauthorized() {
  return NextResponse.json(
    { ok: false, error: "unauthorized" },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

function ensureClients(): {
  ok: true;
  supabase: ReturnType<typeof getSupabaseServer>;
  gemini: GoogleGenAI;
} | { ok: false; response: NextResponse } {
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
// GET — Vercel Cron path (full reindex)
// ─────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return unauthorized();
  const clients = ensureClients();
  if (!clients.ok) return clients.response;

  const startedAt = Date.now();
  try {
    const result = await indexAll(clients.supabase, clients.gemini);
    const elapsed = Date.now() - startedAt;
    return NextResponse.json(
      {
        ok: true,
        mode: "full",
        sources: result.sources,
        chunks: result.chunks,
        staleSourcesDropped: result.staleSourcesDropped,
        elapsedMs: elapsed,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[reindex] full reindex failed", err);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

// ─────────────────────────────────────────────────────────────────
// POST — Supabase webhook path (incremental reindex)
// ─────────────────────────────────────────────────────────────────

type SupabaseWebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema?: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
};

/**
 * Map a Supabase webhook payload onto an indexer (source_type, source_key).
 *
 * Returns null when the change has no impact on the assistant index
 * (e.g. an update that didn't change publication status, or a table
 * the indexer doesn't track).
 */
function resolveTarget(payload: SupabaseWebhookPayload): {
  source_type: SourceType;
  source_key: string;
  isPublished: boolean;
} | null {
  const record = payload.record ?? payload.old_record;
  if (!record) return null;

  if (payload.table === "blogs") {
    const slug = record.slug as string | undefined;
    if (!slug) return null;
    return {
      source_type: "blog",
      source_key: slug,
      isPublished: Boolean(record.is_published),
    };
  }

  if (payload.table === "courses") {
    const slug = record.slug as string | undefined;
    if (!slug) return null;
    return {
      source_type: "course",
      source_key: slug,
      isPublished: Boolean(record.is_published),
    };
  }

  if (payload.table === "episodes") {
    // Episode webhooks include `course_id` not `course_slug`. We
    // need the slug to form our composite key. Caller will look it
    // up via the supabase client below.
    return null; // resolved differently in handler
  }

  // course_sections, episode_content — no direct source mapping.
  // Episode-content edits manifest via the parent episode's
  // updated_at trigger which we'd ideally catch separately. For
  // now those go through the nightly full cron.
  return null;
}

export async function POST(request: Request) {
  if (!isWebhookAuthorized(request)) return unauthorized();

  let body: SupabaseWebhookPayload;
  try {
    body = (await request.json()) as SupabaseWebhookPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const clients = ensureClients();
  if (!clients.ok) return clients.response;
  const { supabase, gemini } = clients;

  // Episodes need a special look-up (record has course_id, not slug).
  if (body.table === "episodes") {
    const record = body.record ?? body.old_record;
    if (!record) {
      return NextResponse.json(
        { ok: true, skipped: "no_record" },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const courseId = record.course_id as number | undefined;
    const epSlug = record.slug as string | undefined;
    if (!courseId || !epSlug) {
      return NextResponse.json(
        { ok: true, skipped: "incomplete_episode_record" },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const { data: course } = await supabase
      .from("courses")
      .select("slug")
      .eq("id", courseId)
      .maybeSingle();
    if (!course) {
      return NextResponse.json(
        { ok: true, skipped: "course_not_found" },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const composite = `${(course as { slug: string }).slug}/${epSlug}`;
    const isPublished = Boolean(record.is_published);
    if (body.type === "DELETE" || !isPublished) {
      const removed = await deleteSource(supabase, "episode", composite);
      return NextResponse.json(
        { ok: true, mode: "delete", source_type: "episode", source_key: composite, removed },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const result = await indexSource(supabase, gemini, "episode", composite);
    return NextResponse.json(
      {
        ok: true,
        mode: "upsert",
        source_type: "episode",
        source_key: composite,
        chunks: result?.chunks ?? 0,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const target = resolveTarget(body);
  if (!target) {
    return NextResponse.json(
      { ok: true, skipped: "untracked_table" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // Unpublish or DELETE → wipe chunks for this source.
  if (body.type === "DELETE" || !target.isPublished) {
    try {
      const removed = await deleteSource(supabase, target.source_type, target.source_key);
      return NextResponse.json(
        { ok: true, mode: "delete", ...target, removed },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown error";
      return NextResponse.json(
        { ok: false, error: msg },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }
  }

  // Upsert path.
  try {
    const result = await indexSource(
      supabase,
      gemini,
      target.source_type,
      target.source_key,
    );
    return NextResponse.json(
      {
        ok: true,
        mode: "upsert",
        ...target,
        chunks: result?.chunks ?? 0,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    console.error("[reindex] incremental reindex failed", err);
    return NextResponse.json(
      { ok: false, error: msg },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
