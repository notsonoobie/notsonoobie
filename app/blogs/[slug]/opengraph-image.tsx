import { ImageResponse } from "next/og";
import { getBlogSlugs, readBlog } from "@/lib/blogs";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Rahul Gupta — Writing";

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = await getBlogSlugs();
  return slugs.map((slug) => ({ slug }));
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function PostOG({ params }: Params) {
  const { slug } = await params;
  const blog = await readBlog(slug);
  const title = blog?.frontmatter.title ?? "Writing";
  const description = blog?.frontmatter.description ?? "";
  const date = blog?.frontmatter.date ? formatDate(blog.frontmatter.date) : "";
  const readingTime = blog?.readingTime ?? 0;
  const tags = (blog?.frontmatter.tags ?? []).slice(0, 3);
  const fontSizeForTitle = title.length > 70 ? 56 : title.length > 44 ? 68 : 84;
  const metaLine = readingTime > 0 && date ? `${date}  ·  ${readingTime} min` : date || "";
  const authorName = blog?.frontmatter.author ?? "Rahul Gupta";

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
        {/* Dot grid */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(138,147,166,0.22) 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* Cyan corner glow */}
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

        {/* Header row */}
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
            <span>rahul.gupta / writing</span>
          </div>
          <div style={{ display: "flex", color: "#8a93a6", fontSize: 18, letterSpacing: 2 }}>
            {metaLine}
          </div>
        </div>

        {/* Title + description */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1040 }}>
          <div
            style={{
              fontSize: fontSizeForTitle,
              lineHeight: 1.05,
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
                fontSize: 26,
                color: "#8a93a6",
                lineHeight: 1.45,
                maxHeight: 150,
                overflow: "hidden",
              }}
            >
              {description}
            </div>
          ) : null}
        </div>

        {/* Footer — tags + author */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 18,
            color: "#8a93a6",
          }}
        >
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", maxWidth: 800 }}>
            {tags.map((t) => (
              <span
                key={t}
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
                {t}
              </span>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 4,
            }}
          >
            <span style={{ display: "flex", color: "#e6e9ef", fontSize: 22, letterSpacing: -0.5 }}>
              {authorName}
            </span>
            <span style={{ display: "flex", fontFamily: "monospace", fontSize: 15, color: "#8a93a6" }}>
              agenticwithrahul.in
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
