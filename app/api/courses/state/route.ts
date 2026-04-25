import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseRSC, getUser } from "@/lib/supabase/server";

type Patch = {
  videoPositionSeconds?: number | null;
  resourcesRead?: string[];
  flashcardsSeen?: number[];
  flashcardsIndex?: number | null;
  quizState?: {
    picks: Record<number, number[]>;
    submitted: boolean;
    score: number | null;
  };
  codeDraft?: string | null;
  fillState?: { answers: string[]; submitted: boolean };
  labState?: { hintsOpen: number[]; solutionOpen: boolean };
};

type Body = {
  episodeId?: number;
  patch?: Patch;
};

const MAX_TEXT_BYTES = 64 * 1024; // 64 KB cap on code_draft

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const episodeId = Number(body.episodeId);
  if (!Number.isInteger(episodeId) || episodeId <= 0) {
    return NextResponse.json(
      { ok: false, error: "invalid_episode_id" },
      { status: 400 }
    );
  }

  const patch = body.patch ?? {};
  const row: Record<string, unknown> = {
    user_id: user.id,
    episode_id: episodeId,
    updated_at: new Date().toISOString(),
  };

  if (patch.videoPositionSeconds !== undefined) {
    const v = patch.videoPositionSeconds;
    if (v !== null && (!Number.isFinite(v) || v < 0)) {
      return NextResponse.json(
        { ok: false, error: "invalid_position" },
        { status: 400 }
      );
    }
    row.video_position_seconds = v;
  }
  if (patch.resourcesRead !== undefined) {
    if (!Array.isArray(patch.resourcesRead)) {
      return NextResponse.json(
        { ok: false, error: "invalid_resources" },
        { status: 400 }
      );
    }
    row.resources_read = patch.resourcesRead.slice(0, 500);
  }
  if (patch.flashcardsSeen !== undefined) {
    if (!Array.isArray(patch.flashcardsSeen)) {
      return NextResponse.json(
        { ok: false, error: "invalid_flashcards" },
        { status: 400 }
      );
    }
    row.flashcards_seen = patch.flashcardsSeen
      .filter((n) => Number.isInteger(n) && n >= 0)
      .slice(0, 1000);
  }
  if (patch.flashcardsIndex !== undefined) {
    const v = patch.flashcardsIndex;
    if (v !== null && (!Number.isInteger(v) || v < 0)) {
      return NextResponse.json(
        { ok: false, error: "invalid_flashcards_index" },
        { status: 400 }
      );
    }
    row.flashcards_index = v;
  }
  if (patch.quizState !== undefined) {
    if (!patch.quizState || typeof patch.quizState !== "object") {
      return NextResponse.json(
        { ok: false, error: "invalid_quiz_state" },
        { status: 400 }
      );
    }
    row.quiz_state = patch.quizState;
  }
  if (patch.codeDraft !== undefined) {
    const v = patch.codeDraft;
    if (v !== null && typeof v !== "string") {
      return NextResponse.json(
        { ok: false, error: "invalid_code_draft" },
        { status: 400 }
      );
    }
    if (v && v.length > MAX_TEXT_BYTES) {
      return NextResponse.json(
        { ok: false, error: "code_draft_too_large" },
        { status: 413 }
      );
    }
    row.code_draft = v;
  }
  if (patch.fillState !== undefined) {
    if (!patch.fillState || typeof patch.fillState !== "object") {
      return NextResponse.json(
        { ok: false, error: "invalid_fill_state" },
        { status: 400 }
      );
    }
    row.fill_state = patch.fillState;
  }
  if (patch.labState !== undefined) {
    if (!patch.labState || typeof patch.labState !== "object") {
      return NextResponse.json(
        { ok: false, error: "invalid_lab_state" },
        { status: 400 }
      );
    }
    row.lab_state = patch.labState;
  }

  const supabase = getSupabaseRSC();
  const { error } = await supabase
    .from("episode_state")
    .upsert(row, { onConflict: "user_id,episode_id" });

  if (error) {
    console.error("[state.upsert]", error);
    return NextResponse.json(
      { ok: false, error: "db_error" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
