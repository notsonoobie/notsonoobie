import { ImageResponse } from "next/og";
import { getAllBlogSummaries } from "@/lib/blogs";
import { SITE_HOST } from "@/lib/seo";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Writing — Rahul Gupta";

const HEADLINE = "Notes on building at enterprise scale.";
const TAGLINE =
  "Essays on distributed systems, agentic AI, and shipping enterprise products at BFSI scale.";

export default async function BlogsOG() {
  // Graceful degrade if the DB is unreachable at render time — the OG
  // still emits a usable image with just the headline/tagline.
  let count = 0;
  try {
    const posts = await getAllBlogSummaries();
    count = posts.length;
  } catch {
    /* ignore */
  }

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
              "radial-gradient(circle, rgba(0,229,255,0.50) 0%, transparent 60%)",
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
            <span>// writing / v1</span>
          </div>
          {count > 0 ? (
            <div
              style={{
                display: "flex",
                color: "#8a93a6",
                fontSize: 18,
                letterSpacing: 2,
                fontFamily: "monospace",
              }}
            >
              {`${count} ${count === 1 ? "post" : "posts"} published`}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            maxWidth: 1040,
          }}
        >
          <div
            style={{
              fontSize: 76,
              lineHeight: 1.02,
              letterSpacing: -2,
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            {HEADLINE}
          </div>
          <div
            style={{
              fontSize: 26,
              color: "#8a93a6",
              lineHeight: 1.45,
              maxHeight: 150,
              overflow: "hidden",
            }}
          >
            {TAGLINE}
          </div>
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
              distributed systems · agentic AI · BFSI
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
              {SITE_HOST} / blogs
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
