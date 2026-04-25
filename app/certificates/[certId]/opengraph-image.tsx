import { ImageResponse } from "next/og";
import { getCertificateById } from "@/lib/courses/queries";
import { formatIssuedDate } from "@/lib/courses/certificate";
import { profile } from "@/lib/data";
import { SITE_HOST } from "@/lib/seo";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Certificate of completion";

type Props = { params: Promise<{ certId: string }> };

export default async function CertOG({ params }: Props) {
  const { certId } = await params;
  const cert = await getCertificateById(certId);

  const courseTitle = cert?.course.title ?? "agenticwithrahul.in course";
  const ownerName = cert?.ownerName ?? "Anonymous learner";
  const issued = cert ? formatIssuedDate(cert.issuedAt) : "";
  const idShort = certId.replace(/^cert_/, "");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0a0b0f",
          color: "#e6e9ef",
          padding: 64,
          position: "relative",
        }}
      >
        {/* Ambient cyan glow */}
        <div
          style={{
            position: "absolute",
            top: -260,
            left: 300,
            width: 800,
            height: 800,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(0,229,255,0.18), transparent 65%)",
            filter: "blur(40px)",
          }}
        />
        {/* Frame */}
        <div
          style={{
            position: "absolute",
            top: 32,
            left: 32,
            right: 32,
            bottom: 32,
            border: "1px solid rgba(0,229,255,0.28)",
            borderRadius: 24,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 48,
            left: 48,
            right: 48,
            bottom: 48,
            border: "1px solid rgba(0,229,255,0.12)",
            borderRadius: 18,
          }}
        />

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#00e5ff",
            fontFamily: "monospace",
            fontSize: 18,
            letterSpacing: 6,
            textTransform: "uppercase",
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 9999,
                background: "#00e5ff",
                boxShadow: "0 0 12px #00e5ff",
              }}
            />
            <span>certificate of completion</span>
          </div>
          <div style={{ color: "#8a93a6" }}>{SITE_HOST} / academy</div>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            zIndex: 1,
          }}
        >
          <div
            style={{
              color: "#8a93a6",
              fontFamily: "monospace",
              fontSize: 18,
              letterSpacing: 6,
              textTransform: "uppercase",
            }}
          >
            awarded to
          </div>
          <div
            style={{
              marginTop: 16,
              fontSize: 76,
              fontWeight: 600,
              letterSpacing: -2,
              lineHeight: 1.05,
              color: "#e6e9ef",
            }}
          >
            {ownerName}
          </div>
          <div
            style={{
              marginTop: 8,
              display: "flex",
              alignItems: "center",
              gap: 8,
              opacity: 0.8,
            }}
          >
            <span
              style={{ width: 36, height: 1, background: "rgba(0,229,255,0.5)" }}
            />
            <span
              style={{ width: 6, height: 6, borderRadius: 9999, background: "rgba(0,229,255,0.6)" }}
            />
            <span
              style={{ width: 36, height: 1, background: "rgba(0,229,255,0.5)" }}
            />
          </div>
          <div
            style={{
              marginTop: 28,
              color: "#8a93a6",
              fontFamily: "monospace",
              fontSize: 16,
              letterSpacing: 6,
              textTransform: "uppercase",
            }}
          >
            for successfully completing
          </div>
          <div
            style={{
              marginTop: 12,
              fontSize: 36,
              fontWeight: 500,
              color: "#00e5ff",
              maxWidth: 920,
              lineHeight: 1.2,
            }}
          >
            {courseTitle}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            color: "#8a93a6",
            fontFamily: "monospace",
            fontSize: 16,
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ letterSpacing: 5, textTransform: "uppercase" }}>
              issued
            </div>
            <div style={{ color: "#e6e9ef", fontSize: 18 }}>{issued}</div>
            <div style={{ color: "#4a5163", fontSize: 12 }}>id · {idShort}</div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 4,
            }}
          >
            <div style={{ color: "#7cf0ff", fontSize: 22, fontStyle: "italic" }}>
              {profile.name}
            </div>
            <div
              style={{
                width: 200,
                height: 1,
                background: "#1b1f2a",
              }}
            />
            <div style={{ letterSpacing: 4, textTransform: "uppercase" }}>
              {profile.name}
            </div>
            <div style={{ color: "#4a5163", fontSize: 12 }}>
              founder · {SITE_HOST}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
