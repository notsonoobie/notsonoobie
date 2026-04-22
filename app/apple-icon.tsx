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
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          fontFamily: "sans-serif",
          fontWeight: 800,
          fontSize: 108,
          letterSpacing: -6,
          color: "#00E5FF",
        }}
      >
        RG
      </div>
    ),
    { ...size },
  );
}
