import "server-only";
import { getSupabaseRSC, getSupabaseServer } from "@/lib/supabase/server";
import { generateCertId } from "./certificate";

/**
 * Mark an episode as completed for the signed-in user. Idempotent — a second
 * call on the same (user, episode) just updates the quiz score (if provided).
 * Returns the number of newly-completed episodes in the parent course so the
 * caller can decide whether to auto-issue a certificate.
 */
export async function recordEpisodeComplete(params: {
  userId: string;
  episodeId: number;
  quizScore?: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId, episodeId, quizScore } = params;
  const supabase = getSupabaseRSC();

  const { error } = await supabase
    .from("episode_progress")
    .upsert(
      {
        user_id: userId,
        episode_id: episodeId,
        completed_at: new Date().toISOString(),
        quiz_score: quizScore ?? null,
      },
      { onConflict: "user_id,episode_id" }
    );

  if (error) {
    console.error("[courses.recordEpisodeComplete]", error);
    return { ok: false, error: "db_error" };
  }
  return { ok: true };
}

/**
 * Issues a certificate for (user, course) if and only if the user has
 * completed every published episode in the course. Uses the service-role
 * client to bypass RLS on `course_certificates` — users can't self-issue
 * by hitting the table directly, only through this server-side gate.
 *
 * Idempotent: if the cert already exists, returns the existing id.
 */
export async function issueCertificateIfReady(params: {
  userId: string;
  courseId: number;
}): Promise<
  | { ok: true; certificateId: string; newlyIssued: boolean }
  | { ok: false; error: "incomplete" | "not_found" | "db_error" }
> {
  const { userId, courseId } = params;
  const admin = getSupabaseServer();

  const { data: existing } = await admin
    .from("course_certificates")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (existing) {
    return {
      ok: true,
      certificateId: (existing as { id: string }).id,
      newlyIssued: false,
    };
  }

  const { data: episodes, error: epErr } = await admin
    .from("episodes")
    .select("id")
    .eq("course_id", courseId)
    .eq("is_published", true);
  if (epErr) {
    console.error("[courses.issueCertificateIfReady] episodes", epErr);
    return { ok: false, error: "db_error" };
  }
  const episodeIds = ((episodes as { id: number }[]) ?? []).map((e) => e.id);
  if (episodeIds.length === 0) return { ok: false, error: "not_found" };

  const { data: progress } = await admin
    .from("episode_progress")
    .select("episode_id")
    .eq("user_id", userId)
    .in("episode_id", episodeIds);

  const completed = new Set(
    ((progress as { episode_id: number }[]) ?? []).map((r) => r.episode_id)
  );
  const allDone = episodeIds.every((id) => completed.has(id));
  if (!allDone) return { ok: false, error: "incomplete" };

  const certificateId = generateCertId();
  const { error: insErr } = await admin.from("course_certificates").insert({
    id: certificateId,
    user_id: userId,
    course_id: courseId,
    issued_at: new Date().toISOString(),
  });
  if (insErr) {
    // Race: another request issued in parallel. Fetch the id that won.
    const { data: again } = await admin
      .from("course_certificates")
      .select("id")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle();
    if (again) {
      return {
        ok: true,
        certificateId: (again as { id: string }).id,
        newlyIssued: false,
      };
    }
    console.error("[courses.issueCertificateIfReady] insert", insErr);
    return { ok: false, error: "db_error" };
  }

  return { ok: true, certificateId, newlyIssued: true };
}
