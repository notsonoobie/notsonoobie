import "server-only";

import fs from "node:fs";
import path from "node:path";

import {
  Defs,
  Document,
  Font,
  Image,
  LinearGradient,
  Page,
  RadialGradient,
  Rect,
  Stop,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";

import { profile } from "@/lib/data";
import { SITE_HOST } from "@/lib/seo";
import { formatIssuedDate } from "@/lib/courses/certificate";

// All assets are read off disk — no network at runtime, no Google CDN
// dependency. Required because the app deploys into a private tenant
// where outbound internet is not available.

const FONT_DIR = path.join(process.cwd(), "public", "fonts");

// Pre-load the signature into a Buffer at module load. Passing a path
// to @react-pdf's Image component makes it run a separate codepath that
// has historically rendered alpha-channel PNGs as black silhouettes
// (often visible as a duplicate ghost copy). Passing a Buffer skips
// that path and embeds the image cleanly.
const SIGNATURE_BUFFER = fs.readFileSync(
  path.join(process.cwd(), "public", "signatures", "signature.png")
);

Font.register({
  family: "Inter",
  fonts: [
    { src: path.join(FONT_DIR, "inter-400.ttf"), fontWeight: 400 },
    { src: path.join(FONT_DIR, "inter-500.ttf"), fontWeight: 500 },
    { src: path.join(FONT_DIR, "inter-600.ttf"), fontWeight: 600 },
    { src: path.join(FONT_DIR, "inter-700.ttf"), fontWeight: 700 },
  ],
});

Font.register({
  family: "SpaceGrotesk",
  fonts: [
    { src: path.join(FONT_DIR, "spacegrotesk-500.ttf"), fontWeight: 500 },
    { src: path.join(FONT_DIR, "spacegrotesk-600.ttf"), fontWeight: 600 },
  ],
});

Font.register({
  family: "JetBrainsMono",
  src: path.join(FONT_DIR, "jetbrainsmono-400.ttf"),
});

// Disable @react-pdf's automatic word-break heuristics on long tokens
// — it otherwise hyphenates "agenticwithrahul.in" mid-domain.
Font.registerHyphenationCallback((word) => [word]);

// A4 landscape interior dimensions (page minus the 40pt page padding
// applied below). Used to size the top-glow SVG so its gradient
// coordinates are real pt values rather than percentages — @react-pdf's
// percentage-+-objectBoundingBox path renders inconsistently on some
// PDF viewers and was making the glow vanish.
const PAGE_W = 842; // A4 landscape width in pt
const PAGE_PAD = 40;
const TOP_GLOW_W = PAGE_W - PAGE_PAD * 2; // 762
const TOP_GLOW_H = 360;

// Mirrors the @theme tokens in app/globals.css so the on-screen and
// PDF surfaces share the same palette.
const C = {
  canvas: "#0a0b0f",
  canvas2: "#0d0f15",
  ink: "#e6e9ef",
  inkDim: "#8a93a6",
  inkFaint: "#4a5163",
  line: "#1b1f2a",
  cyan: "#00e5ff",
  cyanSoft: "#7cf0ff",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: C.canvas2,
    color: C.ink,
    fontFamily: "Inter",
    fontWeight: 400,
    padding: 40,
    position: "relative",
  },
  // The radial-gradient glow lives in <Svg> below — a flat rectangle
  // with opacity (the previous approach) reads as a hard-edged box, not
  // a fade. We pin explicit pt dimensions so the gradient inside can use
  // `userSpaceOnUse` coordinates that @react-pdf renders reliably (its
  // %-based + objectBoundingBox path silently swallows the gradient on
  // some PDF viewers).
  topGlowSvg: {
    position: "absolute",
    top: 0,
    left: 0,
    width: TOP_GLOW_W,
    height: TOP_GLOW_H,
  },
  // Big watermarked "RG" behind the content. Opacity is intentionally
  // very low — a hint of brand presence, not a logo stamp.
  watermark: {
    position: "absolute",
    top: 80,
    left: 0,
    right: 0,
    textAlign: "center",
    fontFamily: "SpaceGrotesk",
    fontWeight: 600,
    fontSize: 320,
    color: C.cyan,
    opacity: 0.025,
    letterSpacing: -10,
  },
  // The single elegant inner frame from the on-screen design.
  frame: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    bottom: 16,
    borderWidth: 0.6,
    borderColor: C.cyan,
    borderRadius: 8,
    opacity: 0.18,
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 0,
    position: "relative",
  },
  // ────── Top eyebrow ──────
  eyebrow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eyebrowLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  eyebrowDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: C.cyan,
    marginRight: 9,
  },
  eyebrowText: {
    fontFamily: "JetBrainsMono",
    fontSize: 8.5,
    color: C.cyan,
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  hostText: {
    fontFamily: "JetBrainsMono",
    fontSize: 7.5,
    color: C.inkFaint,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  // ────── Recipient block ──────
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  smallLabel: {
    fontFamily: "JetBrainsMono",
    fontSize: 8.5,
    color: C.inkFaint,
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  recipientName: {
    fontFamily: "SpaceGrotesk",
    fontWeight: 600,
    fontSize: 50,
    color: C.ink,
    marginTop: 14,
    letterSpacing: -1.2,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    opacity: 0.55,
  },
  dividerLineSvg: {
    width: 70,
    height: 0.8,
  },
  dividerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.cyan,
    marginHorizontal: 11,
  },
  forCompletingLabel: {
    marginTop: 30,
  },
  courseTitle: {
    fontFamily: "SpaceGrotesk",
    fontWeight: 500,
    fontSize: 21,
    color: C.cyan,
    marginTop: 9,
    maxWidth: 500,
    textAlign: "center",
  },
  // ────── Footer (two columns) ──────
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 20,
  },
  metaCol: {
    minWidth: 220,
  },
  metaBlock: {
    marginBottom: 9,
  },
  metaValue: {
    fontFamily: "SpaceGrotesk",
    fontWeight: 500,
    fontSize: 12,
    color: C.ink,
    marginTop: 3,
  },
  metaValueDim: {
    fontFamily: "SpaceGrotesk",
    fontWeight: 500,
    fontSize: 12,
    color: C.inkDim,
    marginTop: 3,
  },
  certIdLine: {
    fontFamily: "JetBrainsMono",
    fontSize: 7.5,
    color: C.inkFaint,
    marginTop: 6,
  },
  signatureCol: {
    alignItems: "flex-end",
    minWidth: 220,
  },
  signatureImage: {
    height: 72,
    width: 72, // signature.png is 170×170 (1:1)
  },
  signatureName: {
    fontFamily: "SpaceGrotesk",
    fontWeight: 500,
    fontSize: 12,
    color: C.ink,
  },
  signatureRole: {
    fontFamily: "JetBrainsMono",
    fontSize: 7.5,
    color: C.inkFaint,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginTop: 1,
  },
  // ────── Verify line ──────
  verifyBar: {
    borderTopWidth: 0.6,
    borderTopColor: C.line,
    marginTop: 18,
    // paddingTop matches the visible cyan-dark gap below the text
    // (24pt — page paddingBottom 40 minus the frame's 16pt inset),
    // so the text sits vertically centred between the divider line
    // above and the frame's bottom edge below.
    paddingTop: 24,
    flexDirection: "row",
    justifyContent: "center",
  },
  verifyText: {
    fontFamily: "JetBrainsMono",
    fontSize: 7.5,
    color: C.inkFaint,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  verifyUrl: {
    color: C.inkDim,
  },
});

type Props = {
  courseTitle: string;
  ownerName: string;
  issuedAt: string;
  certificateId: string;
};

export function CertificatePdf({
  courseTitle,
  ownerName,
  issuedAt,
  certificateId,
}: Props) {
  const idShort = certificateId.replace(/^cert_/, "");
  return (
    <Document
      title={`Certificate · ${courseTitle}`}
      author={profile.name}
      creator={profile.name}
      producer={SITE_HOST}
      subject={`${ownerName} — ${courseTitle}`}
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Top-edge radial glow — mirrors the on-screen
            `radial-gradient(ellipse 80% 80% at 50% 0%, cyan, transparent)`.
            Concrete pt coords (userSpaceOnUse) so @react-pdf renders the
            gradient consistently across viewers; %-based gradients with
            objectBoundingBox silently fail in some readers. Center sits
            at the SVG top-middle and the radius is sized to roughly the
            page width, so the cyan fades all the way to transparent
            inside the SVG bounds. */}
        <Svg
          style={styles.topGlowSvg}
          viewBox={`0 0 ${TOP_GLOW_W} ${TOP_GLOW_H}`}
        >
          <Defs>
            {/* Wider-than-tall ellipse via gradientTransform (matrix scales
                x by 2.3× and translates to keep the centre on top-middle).
                Mirrors the on-screen `radial-gradient(ellipse 80% 80% at
                50% 0%, ...)` shape — without the scale-x the gradient
                renders as a circle that spreads too far down. */}
            <RadialGradient
              id="topGlow"
              cx={TOP_GLOW_W / 2}
              cy={0}
              r={180}
              fx={TOP_GLOW_W / 2}
              fy={0}
              gradientUnits="userSpaceOnUse"
              gradientTransform={`matrix(2.3 0 0 1 ${(1 - 2.3) * (TOP_GLOW_W / 2)} 0)`}
            >
              <Stop offset="0%" stopColor={C.cyan} stopOpacity={0.14} />
              <Stop offset="30%" stopColor={C.cyan} stopOpacity={0.06} />
              <Stop offset="65%" stopColor={C.cyan} stopOpacity={0.015} />
              <Stop offset="100%" stopColor={C.cyan} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect
            x={0}
            y={0}
            width={TOP_GLOW_W}
            height={TOP_GLOW_H}
            fill="url(#topGlow)"
          />
        </Svg>
        <Text style={styles.watermark} fixed>
          RG
        </Text>
        <View style={styles.frame} fixed />

        <View style={styles.body}>
          {/* Top eyebrow */}
          <View style={styles.eyebrow}>
            <View style={styles.eyebrowLeft}>
              <View style={styles.eyebrowDot} />
              <Text style={styles.eyebrowText}>certificate of completion</Text>
            </View>
            <Text style={styles.hostText}>{SITE_HOST} / courses</Text>
          </View>

          {/* Recipient block */}
          <View style={styles.centerWrap}>
            <Text style={styles.smallLabel}>
              this certificate is presented to
            </Text>
            <Text style={styles.recipientName}>{ownerName}</Text>
            <View style={styles.divider}>
              {/* Left rule — fades transparent → cyan/60 (left-to-right). */}
              <Svg style={styles.dividerLineSvg}>
                <Defs>
                  <LinearGradient id="dividerLeft" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0%" stopColor={C.cyan} stopOpacity={0} />
                    <Stop offset="100%" stopColor={C.cyan} stopOpacity={0.6} />
                  </LinearGradient>
                </Defs>
                <Rect
                  x="0"
                  y="0"
                  width="70"
                  height="0.8"
                  fill="url(#dividerLeft)"
                />
              </Svg>
              <View style={styles.dividerDot} />
              {/* Right rule — mirrored: cyan/60 → transparent. */}
              <Svg style={styles.dividerLineSvg}>
                <Defs>
                  <LinearGradient id="dividerRight" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0%" stopColor={C.cyan} stopOpacity={0.6} />
                    <Stop offset="100%" stopColor={C.cyan} stopOpacity={0} />
                  </LinearGradient>
                </Defs>
                <Rect
                  x="0"
                  y="0"
                  width="70"
                  height="0.8"
                  fill="url(#dividerRight)"
                />
              </Svg>
            </View>
            <Text style={[styles.smallLabel, styles.forCompletingLabel]}>
              for successfully completing
            </Text>
            <Text style={styles.courseTitle}>{courseTitle}</Text>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.metaCol}>
              <View style={styles.metaBlock}>
                <Text style={styles.smallLabel}>issued</Text>
                <Text style={styles.metaValue}>
                  {formatIssuedDate(issuedAt)}
                </Text>
              </View>
              <View style={styles.metaBlock}>
                <Text style={styles.smallLabel}>expires</Text>
                <Text style={styles.metaValueDim}>No expiration</Text>
              </View>
              <Text style={styles.certIdLine}>id · {idShort}</Text>
            </View>

            <View style={styles.signatureCol}>
              <Image src={SIGNATURE_BUFFER} style={styles.signatureImage} />
              <Text style={styles.signatureName}>{profile.name}</Text>
              <Text style={styles.signatureRole}>instructor</Text>
            </View>
          </View>

          {/* Verification line */}
          <View style={styles.verifyBar}>
            <Text style={styles.verifyText}>
              verified ·
              <Text style={styles.verifyUrl}>
                {" "}
                {SITE_HOST}/certificates/{certificateId}
              </Text>
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
