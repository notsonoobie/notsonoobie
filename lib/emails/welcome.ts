import { profile } from "@/lib/data";
import { encryptEmailToken } from "@/lib/newsletter/token";
import { SITE_HOST, SITE_URL } from "@/lib/seo";
import matter from "gray-matter";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import "server-only";

const BLOG_DIR = join(process.cwd(), "content", "blogs");
const RECENT_LIMIT = 3;

const DEFAULT_FROM = `${profile.name} <newsletter@${SITE_HOST}>`;

type RecentPost = {
  slug: string;
  title: string;
  description?: string;
};

async function getRecentPosts(limit: number): Promise<RecentPost[]> {
  try {
    const entries = await readdir(BLOG_DIR, { withFileTypes: true });
    const posts: (RecentPost & { date: string })[] = [];
    for (const entry of entries) {
      if (
        !entry.isFile() ||
        !entry.name.endsWith(".mdx") ||
        entry.name.startsWith("_")
      ) {
        continue;
      }
      const slug = entry.name.replace(/\.mdx$/, "");
      try {
        const raw = await readFile(join(BLOG_DIR, entry.name), "utf8");
        const { data } = matter(raw);
        if (data.draft) continue;
        if (!data.title || !data.date) continue;
        posts.push({
          slug,
          title: String(data.title),
          description: data.description ? String(data.description) : undefined,
          date: String(data.date),
        });
      } catch {
        // Skip posts that fail to parse.
      }
    }
    posts.sort((a, b) => +new Date(b.date) - +new Date(a.date));
    return posts
      .slice(0, limit)
      .map(({ slug, title, description }) => ({ slug, title, description }));
  } catch {
    return [];
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// -----------------------------------------------------------------------------
// Dark-theme, terminal-inspired welcome email.
//
// Compatibility rules (Outlook / Gmail / Apple Mail):
//   • Table-based layout, role="presentation", cellpadding/spacing 0.
//   • Every colored cell sets BOTH `bgcolor=` attribute and inline
//     `background-color:` — survives Gmail dark-mode colour protection.
//   • Inline styles only. No <style>, no @font-face, no flex / grid.
//   • System font stack — Gmail strips webfonts.
//   • Border-radius degrades to squared corners in Outlook (still reads
//     intentional inside the terminal vocabulary).
// -----------------------------------------------------------------------------

const FONT_SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const FONT_MONO =
  "'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', 'Courier New', monospace";

const C_BG = "#0a0b0f";
const C_SURFACE = "#0d0f15";
const C_SURFACE_2 = "#12151d"; // one notch lighter — used on chrome + footer
const C_LINE = "#1b1f2a";

// Dark-mode lock: Outlook (especially the new web / Monarch build) will
// rewrite plain `background-color` on elements it considers "dark theme".
// It does NOT rewrite `background-image`. A linear-gradient of one solid
// colour therefore behaves as an un-rewritable flat fill. We stamp this
// on every coloured cell in addition to bgcolor / background-color so
// the colour survives even when the filter fires.
const lock = (hex: string) =>
  `background-color:${hex} !important; background-image:linear-gradient(${hex},${hex}) !important;`;
const C_INK = "#e6e9ef";
const C_INK_DIM = "#8a93a6";
const C_INK_FAINT = "#5a6172";
const C_CYAN = "#00e5ff";
const C_CYAN_SOFT = "#7cf0ff";

function renderRecentItem(post: RecentPost, index: number): string {
  const num = String(index + 1).padStart(2, "0");
  const href = `${SITE_URL}/blogs/${post.slug}`;
  return `
              <tr>
                <td width="32" valign="top" align="left" style="padding:20px 0 16px 0; font-family:${FONT_MONO}; font-size:15px; letter-spacing:1px; color:${C_CYAN}; font-weight:700; line-height:1.35;">
                  ${num}
                </td>
                <td valign="top" style="padding:18px 0;">
                  <a href="${href}" style="display:inline-block; font-family:${FONT_SANS}; font-size:16px; line-height:1.35; font-weight:700; color:${C_INK}; text-decoration:none;">
                    ${escapeHtml(post.title)}
                    <span style="color:${C_CYAN};">&nbsp;→</span>
                  </a>
                  ${
                    post.description
                      ? `<div style="font-family:${FONT_SANS}; font-size:13px; line-height:1.55; color:${C_INK_DIM}; margin-top:6px;">${escapeHtml(post.description)}</div>`
                      : ""
                  }
                </td>
              </tr>`;
}

function renderRecentDivider(): string {
  return `
              <tr>
                <td colspan="2" height="1" class="l-line" bgcolor="${C_LINE}" style="height:1px; line-height:1px; font-size:1px; ${lock(C_LINE)}">&nbsp;</td>
              </tr>`;
}

function renderRecent(recent: RecentPost[]): string {
  if (!recent.length) return "";
  const rows: string[] = [];
  recent.forEach((post, i) => {
    if (i > 0) rows.push(renderRecentDivider());
    rows.push(renderRecentItem(post, i));
  });
  return `<!-- Recent essays -->
            <div style="font-family:${FONT_MONO}; font-size:11px; letter-spacing:2.5px; text-transform:uppercase; color:${C_CYAN}; margin:0 0 4px; padding-bottom:8px; border-bottom:1px solid ${C_LINE};">
              // recent essays
            </div>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              ${rows.join("")}
            </table>`;
}

function renderHtml(
  recent: RecentPost[],
  unsubscribeUrl: string,
  subscriberEmail: string,
): string {
  const safeEmail = escapeHtml(subscriberEmail);

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>Welcome to ${SITE_HOST}</title>
  <!--[if mso]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->
  <style type="text/css">
    :root { color-scheme: dark; supported-color-schemes: dark; }
    body, table, td, div, p, a, h1, h2, h3, h4, span { color-scheme: dark; }
    /* Outlook web (outlook.com / Office 365 web) applies dark-mode colour
       rewrites by injecting data-ogsc (generated-style-change) and
       data-ogsb (generated-style-background) attributes onto elements it
       has re-colored. We target those and re-pin the original values. */
    [data-ogsc] .l-bg,        [data-ogsb] .l-bg        { background-color: ${C_BG} !important; }
    [data-ogsc] .l-surface,   [data-ogsb] .l-surface   { background-color: ${C_SURFACE} !important; }
    [data-ogsc] .l-surface-2, [data-ogsb] .l-surface-2 { background-color: ${C_SURFACE_2} !important; }
    [data-ogsc] .l-line,      [data-ogsb] .l-line      { background-color: ${C_LINE} !important; }
    [data-ogsc] .l-ink        { color: ${C_INK}       !important; }
    [data-ogsc] .l-ink-dim    { color: ${C_INK_DIM}   !important; }
    [data-ogsc] .l-ink-faint  { color: ${C_INK_FAINT} !important; }
    [data-ogsc] .l-cyan       { color: ${C_CYAN}      !important; }
    [data-ogsc] .l-cyan-soft  { color: ${C_CYAN_SOFT} !important; }
    [data-ogsc] .l-mint       { color: #7cffb2        !important; }
    [data-ogsc] .l-white      { color: #ffffff        !important; }
  </style>
  <!--[if mso]>
  <style type="text/css">
    /* Desktop Outlook (MSO) lock — same pins as above, tuned to mso
       selectors (which don't understand data-ogsc). */
    .l-bg        { background-color: ${C_BG}        !important; }
    .l-surface   { background-color: ${C_SURFACE}   !important; }
    .l-surface-2 { background-color: ${C_SURFACE_2} !important; }
    .l-line      { background-color: ${C_LINE}      !important; }
    .l-ink       { color: ${C_INK}                  !important; }
    .l-white     { color: #ffffff                   !important; }
  </style>
  <![endif]-->
</head>
<body style="margin:0; padding:0; color:${C_INK}; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">

<!-- Preheader -->
<div style="display:none; visibility:hidden; opacity:0; overflow:hidden; width:0; max-width:0; max-height:0; font-size:1px; line-height:1px; color:${C_BG}; mso-hide:all;">
  You&rsquo;re in — next dispatch incoming.
</div>

<!-- Outer wrapper (transparent — only the main card has bg) -->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%; table-layout:fixed;">
  <tr>
    <td align="center" style="padding:40px 16px;">

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%; max-width:600px;">

        <!-- Terminal chrome -->
        <tr>
          <td class="l-surface-2" bgcolor="${C_SURFACE_2}" style="${lock(C_SURFACE_2)} border:1px solid ${C_LINE}; border-bottom:none; border-radius:10px 10px 0 0; padding:12px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td align="left" style="font-size:0; line-height:0;" width="80">
                  <span style="display:inline-block; width:10px; height:10px; background-color:#ff5f57; border-radius:50%; margin-right:6px;">&nbsp;</span>
                  <span style="display:inline-block; width:10px; height:10px; background-color:#febc2e; border-radius:50%; margin-right:6px;">&nbsp;</span>
                  <span style="display:inline-block; width:10px; height:10px; background-color:#28c840; border-radius:50%;">&nbsp;</span>
                </td>
                <td align="center" style="font-family:${FONT_MONO}; font-size:11px; letter-spacing:1.5px; color:${C_INK_DIM};">
                  ~/welcome
                </td>
                <td align="right" width="80" style="font-family:${FONT_MONO}; font-size:11px; letter-spacing:1.5px; color:${C_CYAN};">
                  ● live
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td class="l-surface" bgcolor="${C_SURFACE}" style="${lock(C_SURFACE)} border-left:1px solid ${C_LINE}; border-right:1px solid ${C_LINE}; padding:40px 32px 32px;">

            <div style="font-family:${FONT_MONO}; font-size:11px; letter-spacing:2.5px; text-transform:uppercase; color:${C_CYAN}; margin:0 0 14px;">
              // newsletter
            </div>

            <h1 style="margin:0 0 18px; font-family:${FONT_SANS}; font-size:36px; line-height:1.05; letter-spacing:-1px; font-weight:700; color:#ffffff;">
              You&rsquo;re in.
            </h1>

            <p style="margin:0 0 26px; font-family:${FONT_SANS}; font-size:15px; line-height:1.6; color:${C_INK};">
              Thanks for subscribing to <span style="color:${C_CYAN};">${SITE_HOST}</span>. You&rsquo;ll get the next post the day it ships — long-form essays on distributed systems, enterprise API platforms, and agentic AI. One email per post. No drip.
            </p>

            <!-- Status block (real email plugged in) -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${C_BG}" style="${lock(C_BG)} border:1px solid ${C_LINE}; border-left:2px solid ${C_CYAN}; margin:0 0 28px;" class="l-bg">
              <tr>
                <td class="l-bg" bgcolor="${C_BG}" style="${lock(C_BG)} padding:14px 18px; font-family:${FONT_MONO}; font-size:12px; line-height:1.75; color:${C_INK}; word-break:break-all;">
                  <span style="color:${C_CYAN};">$</span> <span style="color:${C_INK_DIM};">subscribe</span> --email <span style="color:${C_CYAN_SOFT};">${safeEmail}</span><br>
                  <span style="color:${C_INK_DIM};">→</span> <span style="color:#7cffb2;">ok</span> &nbsp;·&nbsp; status <span style="color:${C_INK};">confirmed</span> &nbsp;·&nbsp; cadence <span style="color:${C_INK};">per post</span>
                </td>
              </tr>
            </table>

            ${renderRecent(recent)}

            <!-- Signature -->
            <div style="margin-top:12px; padding-top:20px; border-top:1px solid ${C_LINE}; font-family:${FONT_MONO}; font-size:12px; letter-spacing:0.5px; color:${C_INK}; line-height:1.6;">
              &mdash; ${profile.name}<br>
              <span style="color:${C_INK_DIM};">Mumbai, IN · ${SITE_HOST}</span>
            </div>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td class="l-surface-2" bgcolor="${C_SURFACE_2}" style="${lock(C_SURFACE_2)} border:1px solid ${C_LINE}; border-top:none; border-radius:0 0 10px 10px; padding:18px 32px;">
            <div style="font-family:${FONT_MONO}; font-size:11px; line-height:1.7; color:${C_INK_FAINT};">
              You are receiving this because you subscribed at <a href="${SITE_URL}" style="color:${C_CYAN}; text-decoration:none;">${SITE_HOST}</a>. <a href="${unsubscribeUrl}" style="color:${C_CYAN}; text-decoration:underline;">Unsubscribe</a>.
            </div>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html>`;
}

function renderText(
  recent: RecentPost[],
  unsubscribeUrl: string,
  subscriberEmail: string,
): string {
  const recentText = recent.length
    ? `\n\n// RECENT ESSAYS\n\n${recent
        .map((p, i) => {
          const num = String(i + 1).padStart(2, "0");
          const head = `${num}  ${p.title} →`;
          const body = p.description ? `\n    ${p.description}` : "";
          return `${head}${body}\n    ${SITE_URL}/blogs/${p.slug}`;
        })
        .join("\n\n")}`
    : "";

  return `${SITE_HOST}
~/welcome

// NEWSLETTER

You're in.

Thanks for subscribing to ${SITE_HOST}. You'll get the next post the day
it ships — long-form essays on distributed systems, enterprise API
platforms, and agentic AI. One email per post. No drip.

  $ subscribe --email ${subscriberEmail}
  → ok · status confirmed · cadence per post${recentText}

— ${profile.name}
Mumbai, IN · ${SITE_HOST}

---
You are receiving this because you subscribed at ${SITE_URL}. Unsubscribe: ${unsubscribeUrl}
`;
}

export type WelcomeEmail = {
  to: string;
  from: string;
  replyTo: string;
  subject: string;
  html: string;
  text: string;
  headers: Record<string, string>;
};

export async function buildWelcomeEmail(to: string): Promise<WelcomeEmail> {
  const recent = await getRecentPosts(RECENT_LIMIT);
  const from = process.env.NEWSLETTER_FROM_EMAIL ?? DEFAULT_FROM;
  const replyTo = process.env.NEWSLETTER_REPLY_TO ?? profile.email;
  const unsubscribeToken = encryptEmailToken(to);
  const unsubscribeUrl = `${SITE_URL}/unsubscribe?t=${unsubscribeToken}`;

  return {
    to,
    from,
    replyTo,
    subject: "You're in — next dispatch incoming.",
    html: renderHtml(recent, unsubscribeUrl, to),
    text: renderText(recent, unsubscribeUrl, to),
    headers: {
      // Prefer the HTTPS endpoint so Gmail / Apple Mail surface the native
      // one-click button; keep the mailto as a fallback.
      "List-Unsubscribe": `<${unsubscribeUrl}>, <mailto:${replyTo}?subject=unsubscribe>`,
    },
  };
}
