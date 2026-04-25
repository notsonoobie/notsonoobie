// Server component: renders the cover image for a course, or a deterministic
// gradient fallback when `cover_image_url` is null. The fallback hashes the
// course slug to pick one of N palettes so cards stay visually distinct
// without needing the author to upload an image upfront.

import type { Course } from "@/lib/courses/types";

const PALETTES: Array<{ from: string; to: string; tint: string }> = [
  { from: "#0e3a52", to: "#0a0b0f", tint: "#00e5ff" },
  { from: "#3a1d52", to: "#0a0b0f", tint: "#a78bfa" },
  { from: "#4a2515", to: "#0a0b0f", tint: "#ffb340" },
  { from: "#103a25", to: "#0a0b0f", tint: "#7cffb2" },
  { from: "#4a1525", to: "#0a0b0f", tint: "#ff7a9c" },
  { from: "#1c2c4a", to: "#0a0b0f", tint: "#7cf0ff" },
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function initials(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[words.length - 1]![0]!).toUpperCase();
}

type Props = {
  course: Pick<Course, "slug" | "title" | "coverImageUrl">;
  /** Aspect ratio for the cover. Defaults to 16:10 (cardish). */
  aspect?: "16/10" | "16/9" | "4/3" | "3/2";
  className?: string;
  /** When true, renders larger typography for hero usage. */
  hero?: boolean;
  /** When true, hints the browser to preload the image (for the hero
   * cover on /courses/[slug]). Off-screen covers default to lazy. */
  priority?: boolean;
};

export function CourseCover({
  course,
  aspect = "16/10",
  className = "",
  hero = false,
  priority = false,
}: Props) {
  if (course.coverImageUrl) {
    return (
      <div
        className={`relative w-full overflow-hidden bg-canvas-2 ${className}`}
        style={{ aspectRatio: aspect.replace("/", " / ") }}
      >
        {/* Raw <img> — covers come from arbitrary signed-S3 hosts that
            depend on the tenant's bucket. next/image would need a per-
            deployment remotePatterns allow-list, which doesn't fit a
            private-tenant deploy. CLS is already prevented by the
            aspect-ratio wrapper above. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={course.coverImageUrl}
          alt=""
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          className="absolute inset-0 size-full object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-canvas/60 via-canvas/0 to-transparent"
        />
      </div>
    );
  }

  const palette = PALETTES[hash(course.slug) % PALETTES.length]!;
  const label = initials(course.title);

  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      style={{
        aspectRatio: aspect.replace("/", " / "),
        background: `linear-gradient(135deg, ${palette.from} 0%, ${palette.to} 100%)`,
      }}
      aria-hidden
    >
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(ellipse 60% 80% at 30% 20%, ${palette.tint}33 0%, transparent 60%)`,
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent 0, transparent 9px, ${palette.tint} 9px, ${palette.tint} 10px)`,
        }}
      />
      {/* Corner brackets for the same vocabulary as cards */}
      <span
        className="absolute top-3 left-3 size-5 border-l border-t rounded-tl-md"
        style={{ borderColor: `${palette.tint}55` }}
      />
      <span
        className="absolute bottom-3 right-3 size-5 border-r border-b rounded-br-md"
        style={{ borderColor: `${palette.tint}55` }}
      />
      <div className="absolute inset-0 grid place-items-center">
        <span
          className={`font-display font-semibold tracking-[-0.04em] ${hero ? "text-[clamp(4rem,12vw,9rem)]" : "text-[clamp(2.5rem,9vw,4.5rem)]"}`}
          style={{
            color: palette.tint,
            textShadow: `0 0 24px ${palette.tint}55`,
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
