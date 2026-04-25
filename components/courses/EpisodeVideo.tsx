// Server component. The URL is resolved upstream by the query layer
// (lib/courses/queries.ts → resolveMediaUrl), so by the time this renders
// we either have a presigned S3 URL, an external https URL, or null.

import { VideoPlayer } from "./VideoPlayer";

type Props = {
  videoUrl: string | null;
  /** Optional poster image URL (presigned or external). */
  poster?: string | null;
  /** When provided, enables per-episode resume-position persistence. */
  episodeId?: number;
  /** Server-restored video position (from public.episode_state). */
  initialPositionSeconds?: number | null;
  /** Title shown as an overlay at the top of the player. */
  title?: string;
  /** Eyebrow above the title — usually `${courseTitle} · episode N` */
  eyebrow?: string;
};

export function EpisodeVideo({
  videoUrl,
  poster,
  episodeId,
  initialPositionSeconds,
  title,
  eyebrow,
}: Props) {
  if (!videoUrl) return null;

  return (
    <figure className="relative overflow-hidden rounded-xl hairline bg-canvas-2 mb-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30 z-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 80% at 50% 0%, color-mix(in oklab, var(--color-cyan) 18%, transparent) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-10">
        <VideoPlayer
          src={videoUrl}
          poster={poster ?? undefined}
          episodeId={episodeId}
          initialPositionSeconds={initialPositionSeconds}
          title={title}
          eyebrow={eyebrow}
        />
      </div>
    </figure>
  );
}
