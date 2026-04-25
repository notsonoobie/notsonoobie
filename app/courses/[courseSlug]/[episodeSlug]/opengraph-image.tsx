import { ImageResponse } from "next/og";
import { getCourseBySlugPublic } from "@/lib/courses/queries";
import { flattenEpisodes } from "@/lib/courses/types";
import { SITE_HOST } from "@/lib/seo";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Episode · Rahul Gupta";

type Params = { params: Promise<{ courseSlug: string; episodeSlug: string }> };

// Per-episode OG. Keeps the per-course OG layout but swaps the eyebrow
// to the course title and uses the episode title as the headline. The
// proxy lets this through because the URL has 4 path segments — the
// `isProtectedEpisode` check matches only 3-segment episode URLs.
export default async function EpisodeOG({ params }: Params) {
  const { courseSlug, episodeSlug } = await params;
  // Service-role variant — same reason as the per-course OG. Build- and
  // crawler-fetchable without a request cookie.
  const course = await getCourseBySlugPublic(courseSlug);

  const episodes = course ? flattenEpisodes(course) : [];
  const idx = episodes.findIndex((e) => e.slug === episodeSlug);
  const episode = idx >= 0 ? episodes[idx] : null;

  const courseTitle = course?.title ?? "Course";
  const title = episode?.title ?? "Episode";
  const description = episode?.description ?? course?.tagline ?? "";
  const kind = episode?.kind ?? "lesson";
  const total = episodes.length;
  const position = idx >= 0 ? idx + 1 : 0;
  const isFree = course?.isFree ?? true;

  const fontSizeForTitle = title.length > 60 ? 60 : title.length > 40 ? 72 : 84;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a0b0f",
          color: "#e6e9ef",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "70px 80px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(138,147,166,0.22) 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -180,
            left: -180,
            width: 560,
            height: 560,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(0,229,255,0.45) 0%, transparent 60%)",
            filter: "blur(10px)",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 18,
            color: "#00e5ff",
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                border: "1px solid #1b1f2a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(13,15,21,0.6)",
              }}
            >
              RG
            </div>
            <span>{`// ${kind}`}</span>
          </div>
          {total > 0 ? (
            <div
              style={{
                display: "flex",
                color: "#8a93a6",
                fontSize: 18,
                letterSpacing: 2,
                fontFamily: "monospace",
              }}
            >
              {`ep ${String(position).padStart(2, "0")} / ${String(total).padStart(2, "0")}`}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            maxWidth: 1040,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 22,
              color: "#7cf0ff",
              letterSpacing: 1.5,
              textTransform: "uppercase",
              fontFamily: "monospace",
            }}
          >
            {courseTitle}
          </div>
          <div
            style={{
              fontSize: fontSizeForTitle,
              lineHeight: 1.04,
              letterSpacing: -2,
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            {title}
          </div>
          {description ? (
            <div
              style={{
                fontSize: 24,
                color: "#8a93a6",
                lineHeight: 1.45,
                maxHeight: 110,
                overflow: "hidden",
              }}
            >
              {description}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 18,
            color: "#8a93a6",
          }}
        >
          <div style={{ display: "flex", gap: 10 }}>
            <span
              style={{
                padding: "8px 14px",
                border: "1px solid rgba(0,229,255,0.35)",
                borderRadius: 4,
                color: "#7cf0ff",
                fontFamily: "monospace",
                fontSize: 16,
                letterSpacing: 1.5,
                textTransform: "uppercase",
              }}
            >
              {isFree ? "free episode" : "premium episode"}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 4,
            }}
          >
            <span
              style={{
                display: "flex",
                color: "#e6e9ef",
                fontSize: 22,
                letterSpacing: -0.5,
              }}
            >
              Rahul Gupta
            </span>
            <span
              style={{
                display: "flex",
                fontFamily: "monospace",
                fontSize: 15,
                color: "#8a93a6",
              }}
            >
              {SITE_HOST} / courses
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
