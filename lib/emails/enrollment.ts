import "server-only";
import { profile } from "@/lib/data";
import { SITE_HOST, SITE_URL } from "@/lib/seo";

const FONT_SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const FONT_MONO =
  "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";

const C_BG = "#0a0b0f";
const C_SURFACE = "#0d0f15";
const C_SURFACE_2 = "#12151d";
const C_LINE = "#1b1f2a";
const C_INK = "#e6e9ef";
const C_INK_DIM = "#8a93a6";
const C_INK_FAINT = "#4a5163";
const C_CYAN = "#00e5ff";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type EnrollmentInput = {
  courseTitle: string;
  courseTagline?: string | null;
  courseSlug: string;
  firstEpisodeSlug?: string | null;
  episodeCount: number;
  durationMin?: number | null;
  level?: string | null;
};

function lock(hex: string): string {
  return `background-color:${hex} !important;background-image:linear-gradient(${hex},${hex}) !important;`;
}

function renderHtml(input: EnrollmentInput): string {
  const startUrl = input.firstEpisodeSlug
    ? `${SITE_URL}/courses/${input.courseSlug}/${input.firstEpisodeSlug}`
    : `${SITE_URL}/courses/${input.courseSlug}`;

  const metaBits: string[] = [];
  if (input.level) metaBits.push(escapeHtml(input.level));
  metaBits.push(`${input.episodeCount} ${input.episodeCount === 1 ? "episode" : "episodes"}`);
  if (input.durationMin) metaBits.push(`~${input.durationMin} min`);
  const metaText = metaBits.join(" · ");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="dark only" />
  <meta name="supported-color-schemes" content="dark only" />
  <title>You're enrolled — ${escapeHtml(input.courseTitle)}</title>
</head>
<body bgcolor="${C_BG}" style="margin:0;padding:0;${lock(C_BG)}font-family:${FONT_SANS};color:${C_INK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${lock(C_BG)}">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

          <!-- Terminal chrome -->
          <tr>
            <td bgcolor="${C_SURFACE_2}" style="${lock(C_SURFACE_2)}border:1px solid ${C_LINE};border-bottom:0;border-radius:10px 10px 0 0;padding:14px 18px;font-family:${FONT_MONO};font-size:11px;color:${C_INK_DIM};letter-spacing:0.18em;text-transform:uppercase;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" style="font-family:${FONT_MONO};">
                    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;${lock("#ff5f56")};margin-right:6px;vertical-align:middle;"></span>
                    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;${lock("#ffbd2e")};margin-right:6px;vertical-align:middle;"></span>
                    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;${lock("#27c93f")};margin-right:14px;vertical-align:middle;"></span>
                    <span style="color:${C_INK_DIM};">~/courses/enrolled</span>
                  </td>
                  <td align="right" style="font-family:${FONT_MONO};color:${C_CYAN};">● live</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td bgcolor="${C_SURFACE}" style="${lock(C_SURFACE)}border:1px solid ${C_LINE};border-top:0;border-radius:0 0 10px 10px;padding:36px 32px 28px 32px;">

              <p style="margin:0 0 12px 0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:${C_CYAN};">
                // enrollment confirmed
              </p>

              <h1 style="margin:0 0 16px 0;font-size:26px;line-height:1.2;font-weight:600;letter-spacing:-0.02em;color:${C_INK};">
                You're in. Welcome aboard.
              </h1>

              <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:${C_INK_DIM};">
                You're now enrolled in <strong style="color:${C_INK};">${escapeHtml(input.courseTitle)}</strong>${
    input.courseTagline ? ` — ${escapeHtml(input.courseTagline)}` : ""
  }. The full course is yours: every episode, every lab, every checkpoint.
              </p>

              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:${C_INK_DIM};">
                Work through it at your own pace. Your spot is held the whole time, so come back whenever it suits you — no streak to keep, no clock running.
              </p>

              <!-- Course meta strip -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 22px 0;">
                <tr>
                  <td bgcolor="${C_SURFACE_2}" style="${lock(C_SURFACE_2)}border:1px solid ${C_LINE};border-radius:6px;padding:12px 14px;font-family:${FONT_MONO};font-size:12px;color:${C_INK_DIM};">
                    <span style="color:${C_CYAN};">$</span> course --info
                    <br />
                    <span style="color:${C_INK};">${escapeHtml(input.courseTitle)}</span>
                    <br />
                    <span style="color:${C_INK_FAINT};">${escapeHtml(metaText)}</span>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px 0;">
                <tr>
                  <td bgcolor="${C_CYAN}" style="${lock(C_CYAN)}border-radius:6px;">
                    <a href="${startUrl}" style="display:inline-block;padding:12px 24px;font-family:${FONT_SANS};font-size:14px;font-weight:600;color:${C_BG};text-decoration:none;letter-spacing:0.02em;">
                      ${input.firstEpisodeSlug ? "Start the first episode" : "Open the course"} →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px 0;font-size:13px;line-height:1.6;color:${C_INK_DIM};">
                A small tip: the labs and hands-on bits are where the ideas actually stick — don't skim them. Mark each episode complete as you go, and the certificate unlocks the moment you finish the last one.
              </p>

              <p style="margin:14px 0 0 0;font-size:13px;line-height:1.6;color:${C_INK_FAINT};">
                Got a question, found a typo, or stuck on something? Just hit reply — this email lands in my inbox.
              </p>

              <!-- Signature -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;border-top:1px solid ${C_LINE};padding-top:18px;">
                <tr>
                  <td style="font-family:${FONT_SANS};font-size:13px;color:${C_INK};">
                    — ${escapeHtml(profile.name)}
                    <br />
                    <span style="color:${C_INK_FAINT};font-family:${FONT_MONO};font-size:11px;">Mumbai, IN · ${SITE_HOST}</span>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:18px 8px 4px 8px;font-family:${FONT_MONO};font-size:11px;color:${C_INK_FAINT};letter-spacing:0.05em;">
              You are receiving this because you enrolled in a course at ${SITE_HOST}.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderText(input: EnrollmentInput): string {
  const startUrl = input.firstEpisodeSlug
    ? `${SITE_URL}/courses/${input.courseSlug}/${input.firstEpisodeSlug}`
    : `${SITE_URL}/courses/${input.courseSlug}`;
  return `// enrollment confirmed

You're in. Welcome aboard.

You're now enrolled in ${input.courseTitle}${input.courseTagline ? ` — ${input.courseTagline}` : ""}. The full course is yours: every episode, every lab, every checkpoint.

Work through it at your own pace. Your spot is held the whole time, so come back whenever it suits you — no streak to keep, no clock running.

  $ course --info
  ${input.courseTitle}
  ${input.episodeCount} ${input.episodeCount === 1 ? "episode" : "episodes"}${input.level ? ` · ${input.level}` : ""}${input.durationMin ? ` · ~${input.durationMin} min` : ""}

Start: ${startUrl}

A small tip: the labs and hands-on bits are where the ideas actually stick — don't skim them. Mark each episode complete as you go, and the certificate unlocks the moment you finish the last one.

Got a question, found a typo, or stuck on something? Just hit reply — this email lands in my inbox.

— ${profile.name}
Mumbai, IN · ${SITE_HOST}

---
You are receiving this because you enrolled in a course at ${SITE_URL}.
`;
}

export type EnrollmentEmail = {
  to: string;
  from: string;
  /** Set when COURSES_REPLY_TO is provided. When undefined, the route
   * omits the header so replies go to `from` (effectively no-reply if
   * COURSES_FROM_EMAIL is itself a noreply alias). */
  replyTo: string | undefined;
  subject: string;
  html: string;
  text: string;
};

/**
 * Returns null if `COURSES_FROM_EMAIL` is unset — caller should skip the
 * send (and log) rather than dispatching with a missing sender. Same
 * pattern as how the newsletter route handles a missing RESEND_API_KEY.
 */
export function buildEnrollmentEmail(
  to: string,
  input: EnrollmentInput
): EnrollmentEmail | null {
  const from = process.env.COURSES_FROM_EMAIL;
  if (!from) return null;
  const replyTo = process.env.COURSES_REPLY_TO;
  return {
    to,
    from,
    replyTo,
    subject: `Welcome to ${input.courseTitle} — you're in`,
    html: renderHtml(input),
    text: renderText(input),
  };
}
