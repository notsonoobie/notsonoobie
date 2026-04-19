import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Rahul Gupta — Senior Software Engineer · Solutions Architect · Agentic AI";

export default async function OG() {
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
            top: -160,
            right: -160,
            width: 520,
            height: 520,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(0,229,255,0.55) 0%, transparent 60%)",
            filter: "blur(10px)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 18, color: "#00e5ff", letterSpacing: 3, textTransform: "uppercase" }}>
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
          <span>rahul.gupta / portfolio</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 84, lineHeight: 1, letterSpacing: -2, fontWeight: 700 }}>
            Rahul Gupta
          </div>
          <div style={{ fontSize: 30, color: "#8a93a6" }}>
            Senior Software Engineer · Solutions Architect · Agentic AI
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: 20, color: "#8a93a6" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ color: "#e6e9ef", fontSize: 34, letterSpacing: -1 }}>
              Architecting distributed systems.
            </div>
            <div style={{ color: "#00e5ff", fontSize: 34, letterSpacing: -1 }}>
              Embedding intelligence.
            </div>
          </div>
          <div style={{ display: "flex", gap: 24, fontFamily: "monospace", fontSize: 16 }}>
            <span>6y</span>
            <span>15+ customers</span>
            <span>5 products</span>
            <span>Mumbai · IN</span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
