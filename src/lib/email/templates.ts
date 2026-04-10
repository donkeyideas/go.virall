/**
 * Go Virall — Shared email template utilities.
 * All CSS is inline for email client compatibility.
 * Uses table-based layout for maximum email client support.
 */

// ─── Color Constants (matching app dark theme) ──────────────────────────────

export const COLORS = {
  bg: "#0F0A1E",
  cardBg: "#0B1928",
  cardBorder: "rgba(75,156,211,0.12)",
  primaryText: "#F0EDF5",
  secondaryText: "#8B8A9E",
  accent: "#DC2626",
  accentLight: "#EF4444",
  purple: "#4B9CD3",
  purpleLight: "#A78BFA",
  green: "#22C55E",
  red: "#EF4444",
  yellow: "#FACC15",
  border: "#2D2252",
  white: "#FFFFFF",
  linkBlue: "#818CF8",
} as const;

// ─── Email Wrapper ──────────────────────────────────────────────────────────

/**
 * Wraps inner content in a full HTML email document with responsive meta tags,
 * base styles, and the Go Virall branded layout.
 */
export function emailWrapper(content: string, preheaderText?: string): string {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>Go Virall</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${COLORS.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
  ${preheaderText ? `<div style="display:none;font-size:1px;color:${COLORS.bg};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheaderText}</div>` : ""}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${COLORS.bg};">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding:32px 0 24px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size:28px;font-weight:800;color:${COLORS.primaryText};letter-spacing:-0.5px;text-align:center;">
                    Go <span style="color:${COLORS.accent};">Virall</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td>
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:32px 0 16px 0;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="border-top:1px solid ${COLORS.border};padding-top:24px;text-align:center;">
                    <p style="margin:0 0 8px 0;font-size:13px;color:${COLORS.secondaryText};">
                      Go Virall &mdash; Social Intelligence for Creators
                    </p>
                    <p style="margin:0 0 8px 0;font-size:12px;color:${COLORS.secondaryText};">
                      <a href="https://govirall.com/dashboard/settings" style="color:${COLORS.linkBlue};text-decoration:underline;">Manage email preferences</a>
                      &nbsp;&middot;&nbsp;
                      <a href="https://govirall.com/dashboard/settings" style="color:${COLORS.linkBlue};text-decoration:underline;">Unsubscribe</a>
                    </p>
                    <p style="margin:0;font-size:11px;color:${COLORS.secondaryText};opacity:0.7;">
                      &copy; ${new Date().getFullYear()} Go Virall. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Stat Card ──────────────────────────────────────────────────────────────

/**
 * Generates an inline-styled stat card for email display.
 * @param label  — e.g. "Followers"
 * @param value  — e.g. "12,450"
 * @param trend  — optional: { direction: "up"|"down"|"flat", value: "+5.2%" }
 */
export function statCard(
  label: string,
  value: string,
  trend?: { direction: "up" | "down" | "flat"; value: string },
): string {
  let trendHtml = "";
  if (trend) {
    const trendColor =
      trend.direction === "up"
        ? COLORS.green
        : trend.direction === "down"
          ? COLORS.red
          : COLORS.yellow;
    const arrow =
      trend.direction === "up" ? "&#9650;" : trend.direction === "down" ? "&#9660;" : "&#9644;";
    trendHtml = `<span style="font-size:13px;color:${trendColor};font-weight:600;">${arrow} ${escapeHtml(trend.value)}</span>`;
  }

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${COLORS.cardBg};border:1px solid ${COLORS.border};border-radius:12px;margin-bottom:8px;">
  <tr>
    <td style="padding:16px 20px;">
      <p style="margin:0 0 4px 0;font-size:12px;font-weight:600;color:${COLORS.secondaryText};text-transform:uppercase;letter-spacing:0.5px;">
        ${escapeHtml(label)}
      </p>
      <p style="margin:0;font-size:28px;font-weight:700;color:${COLORS.primaryText};line-height:1.2;">
        ${escapeHtml(value)}
        ${trendHtml ? `&nbsp;${trendHtml}` : ""}
      </p>
    </td>
  </tr>
</table>`;
}

// ─── Compact Stat (for grid-like rows) ──────────────────────────────────────

/**
 * A smaller stat cell for use inside a table row — used to pack 2-3 stats per row.
 */
export function compactStat(
  label: string,
  value: string,
  trend?: { direction: "up" | "down" | "flat"; value: string },
): string {
  let trendHtml = "";
  if (trend) {
    const trendColor =
      trend.direction === "up"
        ? COLORS.green
        : trend.direction === "down"
          ? COLORS.red
          : COLORS.yellow;
    const arrow =
      trend.direction === "up" ? "&#9650;" : trend.direction === "down" ? "&#9660;" : "&#9644;";
    trendHtml = `<div style="font-size:11px;color:${trendColor};font-weight:600;margin-top:2px;">${arrow} ${escapeHtml(trend.value)}</div>`;
  }

  return `<td style="padding:12px 16px;background-color:${COLORS.cardBg};border:1px solid ${COLORS.border};border-radius:8px;">
  <div style="font-size:11px;font-weight:600;color:${COLORS.secondaryText};text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(label)}</div>
  <div style="font-size:22px;font-weight:700;color:${COLORS.primaryText};line-height:1.3;margin-top:2px;">${escapeHtml(value)}</div>
  ${trendHtml}
</td>`;
}

// ─── Section Header ─────────────────────────────────────────────────────────

/**
 * Generates a section header with optional subtitle.
 */
export function sectionHeader(title: string, subtitle?: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:28px;margin-bottom:12px;">
  <tr>
    <td style="padding:0;">
      <h2 style="margin:0;font-size:18px;font-weight:700;color:${COLORS.primaryText};line-height:1.3;">
        ${escapeHtml(title)}
      </h2>
      ${subtitle ? `<p style="margin:4px 0 0 0;font-size:13px;color:${COLORS.secondaryText};">${escapeHtml(subtitle)}</p>` : ""}
    </td>
  </tr>
</table>`;
}

// ─── CTA Button ─────────────────────────────────────────────────────────────

/**
 * Generates a centered call-to-action button.
 */
export function ctaButton(text: string, href: string, color?: string): string {
  const bgColor = color || COLORS.accent;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0;">
  <tr>
    <td align="center">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="17%" strokecolor="${bgColor}" fillcolor="${bgColor}">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">${escapeHtml(text)}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="${href}" target="_blank" style="display:inline-block;padding:14px 32px;background-color:${bgColor};color:${COLORS.white};font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;line-height:1;text-align:center;">
        ${escapeHtml(text)}
      </a>
      <!--<![endif]-->
    </td>
  </tr>
</table>`;
}

// ─── Content Card ───────────────────────────────────────────────────────────

/**
 * A bordered card that wraps arbitrary HTML content.
 */
export function contentCard(innerHtml: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${COLORS.cardBg};border:1px solid ${COLORS.border};border-radius:12px;margin-bottom:12px;">
  <tr>
    <td style="padding:20px;">
      ${innerHtml}
    </td>
  </tr>
</table>`;
}

// ─── Divider ────────────────────────────────────────────────────────────────

export function divider(): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:20px 0;">
  <tr>
    <td style="border-top:1px solid ${COLORS.border};"></td>
  </tr>
</table>`;
}

// ─── Progress Bar (inline SVG for email) ────────────────────────────────────

/**
 * Renders a simple progress bar as an inline HTML table.
 * @param percentage — 0-100
 * @param color — bar fill color
 */
export function progressBar(percentage: number, color?: string, label?: string): string {
  const clampedPct = Math.min(100, Math.max(0, percentage));
  const fillColor = color || COLORS.purple;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:4px 0;">
  ${label ? `<tr><td style="font-size:12px;color:${COLORS.secondaryText};padding-bottom:4px;">${escapeHtml(label)}</td><td style="font-size:12px;color:${COLORS.primaryText};padding-bottom:4px;text-align:right;font-weight:600;">${clampedPct}%</td></tr>` : ""}
  <tr>
    <td colspan="2" style="padding:0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${COLORS.border};border-radius:6px;overflow:hidden;">
        <tr>
          <td style="width:${clampedPct}%;height:8px;background-color:${fillColor};border-radius:6px;"></td>
          <td style="width:${100 - clampedPct}%;height:8px;"></td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

// ─── Numbered List Item ─────────────────────────────────────────────────────

export function numberedItem(number: number, title: string, description: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:12px;">
  <tr>
    <td style="width:36px;vertical-align:top;padding-top:2px;">
      <div style="width:28px;height:28px;background-color:${COLORS.accent};border-radius:50%;text-align:center;line-height:28px;font-size:14px;font-weight:700;color:${COLORS.white};">
        ${number}
      </div>
    </td>
    <td style="padding-left:12px;vertical-align:top;">
      <p style="margin:0 0 4px 0;font-size:15px;font-weight:600;color:${COLORS.primaryText};">${escapeHtml(title)}</p>
      <p style="margin:0;font-size:13px;color:${COLORS.secondaryText};line-height:1.5;">${escapeHtml(description)}</p>
    </td>
  </tr>
</table>`;
}

// ─── Platform Badge ─────────────────────────────────────────────────────────

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "#E1306C",
  tiktok: "#00F2EA",
  youtube: "#FF0000",
  twitter: "#1DA1F2",
  linkedin: "#0A66C2",
  threads: "#000000",
  pinterest: "#E60023",
  twitch: "#9146FF",
};

export function platformBadge(platform: string): string {
  const color = PLATFORM_COLORS[platform.toLowerCase()] || COLORS.purple;
  const name = platform.charAt(0).toUpperCase() + platform.slice(1);
  return `<span style="display:inline-block;padding:3px 10px;background-color:${color};color:${COLORS.white};font-size:11px;font-weight:700;border-radius:4px;text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(name)}</span>`;
}

// ─── Post Card (for top performing content) ─────────────────────────────────

export function postCard(post: {
  caption: string;
  likes: number;
  comments: number;
  imageUrl?: string;
  platform?: string;
}): string {
  const imageHtml = post.imageUrl
    ? `<td style="width:60px;vertical-align:top;padding-right:12px;">
        <img src="${post.imageUrl}" alt="" width="60" height="60" style="display:block;width:60px;height:60px;border-radius:8px;object-fit:cover;" />
       </td>`
    : "";

  const captionTruncated =
    post.caption && post.caption.length > 100
      ? post.caption.slice(0, 97) + "..."
      : post.caption || "No caption";

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${COLORS.cardBg};border:1px solid ${COLORS.border};border-radius:8px;margin-bottom:8px;">
  <tr>
    <td style="padding:12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          ${imageHtml}
          <td style="vertical-align:top;">
            ${post.platform ? `<div style="margin-bottom:4px;">${platformBadge(post.platform)}</div>` : ""}
            <p style="margin:0 0 6px 0;font-size:13px;color:${COLORS.primaryText};line-height:1.4;">${escapeHtml(captionTruncated)}</p>
            <p style="margin:0;font-size:12px;color:${COLORS.secondaryText};">
              <span style="color:${COLORS.accent};font-weight:600;">&hearts; ${formatNumber(post.likes)}</span>
              &nbsp;&middot;&nbsp;
              <span style="font-weight:600;">&#128172; ${formatNumber(post.comments)}</span>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

// ─── Inline SVG Bar Chart ───────────────────────────────────────────────────

/**
 * Generates an inline SVG horizontal bar chart suitable for email.
 * Each bar shows a label, value, and proportional bar width.
 */
export function barChart(
  items: { label: string; value: number; color?: string }[],
): string {
  if (!items.length) return "";
  const maxVal = Math.max(...items.map((i) => i.value), 1);
  const barHeight = 24;
  const rowHeight = barHeight + 20;
  const svgHeight = items.length * rowHeight + 8;
  const chartWidth = 520;
  const labelWidth = 100;
  const valueWidth = 60;
  const barMaxWidth = chartWidth - labelWidth - valueWidth - 20;

  const bars = items
    .map((item, i) => {
      const barWidth = Math.max(4, (item.value / maxVal) * barMaxWidth);
      const y = i * rowHeight + 4;
      const color = item.color || COLORS.purple;
      return `
        <text x="0" y="${y + barHeight / 2 + 4}" font-family="sans-serif" font-size="12" fill="${COLORS.secondaryText}">${escapeHtml(item.label)}</text>
        <rect x="${labelWidth}" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" fill="${color}" />
        <text x="${labelWidth + barWidth + 8}" y="${y + barHeight / 2 + 4}" font-family="sans-serif" font-size="13" font-weight="bold" fill="${COLORS.primaryText}">${formatNumber(item.value)}</text>
      `;
    })
    .join("");

  return `<div style="overflow-x:auto;">
  <img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${chartWidth}" height="${svgHeight}" viewBox="0 0 ${chartWidth} ${svgHeight}">${bars}</svg>`)}" alt="Bar chart" style="display:block;max-width:100%;height:auto;" />
</div>`;
}

// ─── Helper Utilities ───────────────────────────────────────────────────────

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return num.toLocaleString("en-US");
}

export function formatCurrency(cents: number): string {
  return "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatPercent(value: number): string {
  return value.toFixed(1) + "%";
}

export function trendFromDelta(current: number, previous: number): { direction: "up" | "down" | "flat"; value: string } {
  if (previous === 0) {
    if (current > 0) return { direction: "up", value: "+100%" };
    return { direction: "flat", value: "0%" };
  }
  const pctChange = ((current - previous) / previous) * 100;
  if (Math.abs(pctChange) < 0.1) return { direction: "flat", value: "0%" };
  const sign = pctChange > 0 ? "+" : "";
  return {
    direction: pctChange > 0 ? "up" : "down",
    value: `${sign}${pctChange.toFixed(1)}%`,
  };
}

/**
 * Format a date range string for the report header.
 */
export function dateRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const yearOpts: Intl.DateTimeFormatOptions = { ...opts, year: "numeric" };
  if (start.getFullYear() !== end.getFullYear()) {
    return `${start.toLocaleDateString("en-US", yearOpts)} - ${end.toLocaleDateString("en-US", yearOpts)}`;
  }
  return `${start.toLocaleDateString("en-US", opts)} - ${end.toLocaleDateString("en-US", yearOpts)}`;
}
