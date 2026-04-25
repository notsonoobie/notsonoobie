// Tiny client-side helper to PATCH episode_state. Best-effort fire-and-
// forget; the next state change re-syncs the full payload anyway, so a
// dropped request doesn't corrupt anything.

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

export function persistEpisodeState(episodeId: number, patch: Patch): void {
  void fetch("/api/courses/state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({ episodeId, patch }),
  }).catch(() => {
    /* best-effort */
  });
}
