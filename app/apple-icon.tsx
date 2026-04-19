import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0a0b0f",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          fontWeight: 700,
          fontSize: 88,
          letterSpacing: -2,
          color: "#00E5FF",
          borderRadius: 36,
          boxShadow: "inset 0 0 0 3px rgba(0,229,255,0.55)",
        }}
      >
        RG
      </div>
    ),
    { ...size },
  );
}
