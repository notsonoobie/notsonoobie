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

function lock(hex: string): string {
  return `background-color:${hex} !important;background-image:linear-gradient(${hex},${hex}) !important;`;
}

type CompletionInput = {
  courseTitle: string;
  courseTagline?: string | null;
  courseSlug: string;
  certificateId: string;
  episodeCount: number;
  durationMin?: number | null;
  level?: string | null;
};

function renderHtml(input: CompletionInput): string {
  const certUrl = `${SITE_URL}/certificates/${input.certificateId}`;
  const courseUrl = `${SITE_URL}/courses/${input.courseSlug}`;
  const certIdShort = input.certificateId.replace(/^cert_/, "");

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
  <title>You finished ${escapeHtml(input.courseTitle)}</title>
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
                    <span style="color:${C_INK_DIM};">~/courses/completed</span>
                  </td>
                  <td align="right" style="font-family:${FONT_MONO};color:${C_CYAN};">● done</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td bgcolor="${C_SURFACE}" style="${lock(C_SURFACE)}border:1px solid ${C_LINE};border-top:0;border-radius:0 0 10px 10px;padding:36px 32px 28px 32px;">

              <p style="margin:0 0 12px 0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:${C_CYAN};">
                // course complete
              </p>

              <h1 style="margin:0 0 16px 0;font-size:26px;line-height:1.2;font-weight:600;letter-spacing:-0.02em;color:${C_INK};">
                You did it. Congrats.
              </h1>

              <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:${C_INK_DIM};">
                You finished every episode of <strong style="color:${C_INK};">${escapeHtml(input.courseTitle)}</strong>${
    input.courseTagline ? ` — ${escapeHtml(input.courseTagline)}` : ""
  }. That's a real win — most people who start a course don't make it to the last episode.
              </p>

              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:${C_INK_DIM};">
                Your certificate is signed, dated, and waiting for you.
              </p>

              <!-- Course meta strip -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 22px 0;">
                <tr>
                  <td bgcolor="${C_SURFACE_2}" style="${lock(C_SURFACE_2)}border:1px solid ${C_LINE};border-radius:6px;padding:12px 14px;font-family:${FONT_MONO};font-size:12px;color:${C_INK_DIM};">
                    <span style="color:${C_CYAN};">$</span> course --status complete
                    <br />
                    <span style="color:${C_INK};">${escapeHtml(input.courseTitle)}</span>
                    <br />
                    <span style="color:${C_INK_FAINT};">${escapeHtml(metaText)} · cert ${escapeHtml(certIdShort)}</span>
                  </td>
                </tr>
              </table>

              <!-- Primary CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 18px 0;">
                <tr>
                  <td bgcolor="${C_CYAN}" style="${lock(C_CYAN)}border-radius:6px;">
                    <a href="${certUrl}" style="display:inline-block;padding:12px 24px;font-family:${FONT_SANS};font-size:14px;font-weight:600;color:${C_BG};text-decoration:none;letter-spacing:0.02em;">
                      View your certificate →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px 0;font-size:13px;line-height:1.6;color:${C_INK_DIM};">
                The certificate page has buttons to add it to your LinkedIn profile in one click, share it on LinkedIn or X, or download a printable copy. The URL is permanent — bookmark it, paste it on your résumé, send it to whoever asked you to take the course.
              </p>

              <p style="margin:14px 0 0 0;font-size:13px;line-height:1.6;color:${C_INK_FAINT};">
                And if you have feedback on the course — what worked, what dragged, what should have been there — just hit reply. This email lands in my inbox and I read every one.
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
              You are receiving this because you completed a course at ${SITE_HOST}. Course page: ${courseUrl}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderText(input: CompletionInput): string {
  const certUrl = `${SITE_URL}/certificates/${input.certificateId}`;
  const courseUrl = `${SITE_URL}/courses/${input.courseSlug}`;
  const certIdShort = input.certificateId.replace(/^cert_/, "");

  return `// course complete

You did it. Congrats.

You finished every episode of ${input.courseTitle}${input.courseTagline ? ` — ${input.courseTagline}` : ""}. That's a real win — most people who start a course don't make it to the last episode.

Your certificate is signed, dated, and waiting for you.

  $ course --status complete
  ${input.courseTitle}
  ${input.episodeCount} ${input.episodeCount === 1 ? "episode" : "episodes"}${input.level ? ` · ${input.level}` : ""}${input.durationMin ? ` · ~${input.durationMin} min` : ""}
  cert ${certIdShort}

View your certificate: ${certUrl}

The certificate page has buttons to add it to your LinkedIn profile in one click, share it on LinkedIn or X, or download a printable copy. The URL is permanent — bookmark it, paste it on your résumé, send it to whoever asked you to take the course.

And if you have feedback on the course — what worked, what dragged, what should have been there — just hit reply. This email lands in my inbox and I read every one.

— ${profile.name}
Mumbai, IN · ${SITE_HOST}

---
You are receiving this because you completed a course at ${SITE_URL}. Course: ${courseUrl}
`;
}

export type CompletionEmail = {
  to: string;
  from: string;
  /** Set when COURSES_REPLY_TO is provided. Undefined → header omitted so
   * replies go to `from` (no-reply if COURSES_FROM_EMAIL is a noreply alias). */
  replyTo: string | undefined;
  subject: string;
  html: string;
  text: string;
  /** Set when the caller has rendered the certificate PDF and wants it
   * attached. Built upstream (`app/api/courses/progress/route.ts`) so
   * this builder stays free of the heavy puppeteer dependency. */
  attachment?: {
    filename: string;
    content: Buffer;
  };
};

/**
 * Returns null if `COURSES_FROM_EMAIL` is unset — caller skips the send
 * with a log line, same pattern as the missing-RESEND_API_KEY path.
 *
 * Optional `pdf` argument — when provided, the rendered certificate PDF
 * is included as an attachment named `<slug>-<short-cert-id>.pdf` (same
 * shape as the download-route filename so the user sees a consistent
 * name across surfaces). When omitted, the email ships link-only.
 */
export function buildCompletionEmail(
  to: string,
  input: CompletionInput,
  pdf?: { buffer: Buffer; courseSlug: string }
): CompletionEmail | null {
  const from = process.env.COURSES_FROM_EMAIL;
  if (!from) return null;
  const replyTo = process.env.COURSES_REPLY_TO;
  const attachment = pdf
    ? {
        filename: `${pdf.courseSlug.replace(/[^a-z0-9-]/gi, "")}-${input.certificateId.replace(/^cert_/, "")}.pdf`,
        content: pdf.buffer,
      }
    : undefined;
  return {
    to,
    from,
    replyTo,
    subject: `Course complete — ${input.courseTitle}`,
    html: renderHtml(input),
    text: renderText(input),
    attachment,
  };
}
