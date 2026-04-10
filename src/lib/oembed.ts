import type { OEmbedData } from "@/types";

// ─── Platform Detection ─────────────────────────────────────────────────────

const PLATFORM_PATTERNS: [RegExp, string][] = [
  [/(?:youtube\.com|youtu\.be)/i, "youtube"],
  [/instagram\.com/i, "instagram"],
  [/tiktok\.com/i, "tiktok"],
  [/(?:twitter\.com|x\.com)/i, "twitter"],
  [/linkedin\.com/i, "linkedin"],
  [/pinterest\.com/i, "pinterest"],
  [/twitch\.tv/i, "twitch"],
  [/threads\.net/i, "threads"],
  [/facebook\.com/i, "facebook"],
  [/snapchat\.com/i, "snapchat"],
];

export function detectPlatform(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    for (const [pattern, platform] of PLATFORM_PATTERNS) {
      if (pattern.test(hostname)) return platform;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── oEmbed Endpoint Mapping ────────────────────────────────────────────────

const OEMBED_ENDPOINTS: Record<string, (url: string) => string> = {
  youtube: (url) =>
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
  tiktok: (url) =>
    `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
  twitter: (url) =>
    `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`,
};

// ─── Fetch oEmbed Data ──────────────────────────────────────────────────────

export async function fetchOEmbedData(url: string): Promise<OEmbedData | null> {
  const platform = detectPlatform(url);
  if (!platform) return null;

  const endpointFn = OEMBED_ENDPOINTS[platform];
  if (!endpointFn) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(endpointFn(url), {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json();

    return {
      title: data.title ?? null,
      thumbnail_url: data.thumbnail_url ?? null,
      author_name: data.author_name ?? null,
      provider_name: data.provider_name ?? platform,
      html: data.html ?? null,
      type: data.type ?? null,
    };
  } catch {
    return null;
  }
}

// ─── Platform Display Config ────────────────────────────────────────────────

export const PLATFORM_DISPLAY: Record<string, { label: string; color: string }> = {
  youtube: { label: "YouTube", color: "#FF0000" },
  instagram: { label: "Instagram", color: "#E4405F" },
  tiktok: { label: "TikTok", color: "#000000" },
  twitter: { label: "X / Twitter", color: "#1DA1F2" },
  linkedin: { label: "LinkedIn", color: "#0A66C2" },
  pinterest: { label: "Pinterest", color: "#E60023" },
  twitch: { label: "Twitch", color: "#9146FF" },
  threads: { label: "Threads", color: "#000000" },
  facebook: { label: "Facebook", color: "#1877F2" },
  snapchat: { label: "Snapchat", color: "#FFFC00" },
};
