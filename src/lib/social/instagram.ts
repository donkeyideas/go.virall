/**
 * Instagram Public Profile Scraper
 *
 * Primary strategy: /embed/ endpoint → extracts contextJSON with full profile
 * data (followers, posts, images, captions, likes) without authentication.
 *
 * Fallback: HTML profile page → og:description meta tags for basic counts.
 *
 * Server-side utility only — requires Node.js runtime (not browser).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InstagramPost {
  id: string;
  imageUrl: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  timestamp: string;
  isVideo: boolean;
  videoUrl?: string;
}

export interface InstagramProfileData {
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  verified: boolean;
  recentPosts: InstagramPost[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
];

const FETCH_TIMEOUT_MS = 15_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Parse human-readable count strings into numbers.
 * "4.4M" → 4_400_000, "12,772" → 12_772, "1.2K" → 1_200
 */
export function parseCount(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.trim().replace(/,/g, "");
  const multiplierMatch = cleaned.match(/^([\d.]+)\s*(M|K|B)$/i);
  if (multiplierMatch) {
    const value = parseFloat(multiplierMatch[1]);
    const suffix = multiplierMatch[2].toUpperCase();
    const multipliers: Record<string, number> = {
      K: 1_000,
      M: 1_000_000,
      B: 1_000_000_000,
    };
    return Math.round(value * (multipliers[suffix] ?? 1));
  }
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? Math.round(num) : 0;
}

function extractMetaTag(html: string, tag: string): string {
  const patternA = new RegExp(
    `<meta[^>]*(?:property|name)=["']${escapeRegex(tag)}["'][^>]*content=["']([^"']*)["']`,
    "i",
  );
  const matchA = html.match(patternA);
  if (matchA) return decodeHtmlEntities(matchA[1]);

  const patternB = new RegExp(
    `<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${escapeRegex(tag)}["']`,
    "i",
  );
  const matchB = html.match(patternB);
  if (matchB) return decodeHtmlEntities(matchB[1]);

  return "";
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) =>
      String.fromCodePoint(parseInt(dec, 10)),
    )
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function parseOgDescription(desc: string): {
  followersCount: number;
  followingCount: number;
  postsCount: number;
} {
  const result = { followersCount: 0, followingCount: 0, postsCount: 0 };
  if (!desc) return result;

  const countsPattern =
    /^([\d,.]+[KMBkmb]?)\s+Followers?,\s*([\d,.]+[KMBkmb]?)\s+Following,\s*([\d,.]+[KMBkmb]?)\s+Posts?\b/i;
  const countsMatch = desc.match(countsPattern);

  if (countsMatch) {
    result.followersCount = parseCount(countsMatch[1]);
    result.followingCount = parseCount(countsMatch[2]);
    result.postsCount = parseCount(countsMatch[3]);
    return result;
  }

  const followersMatch = desc.match(/([\d,.]+[KMBkmb]?)\s+Followers?/i);
  const followingMatch = desc.match(/([\d,.]+[KMBkmb]?)\s+Following/i);
  const postsMatch = desc.match(/([\d,.]+[KMBkmb]?)\s+Posts?/i);

  if (followersMatch) result.followersCount = parseCount(followersMatch[1]);
  if (followingMatch) result.followingCount = parseCount(followingMatch[1]);
  if (postsMatch) result.postsCount = parseCount(postsMatch[1]);

  return result;
}

// ---------------------------------------------------------------------------
// Strategy 1: Embed endpoint (PRIMARY — most reliable)
// ---------------------------------------------------------------------------

/**
 * Scrape Instagram profile via the /embed/ endpoint.
 *
 * This endpoint is designed for third-party embedding and returns a
 * `contextJSON` field with full profile data: followers, following, posts,
 * display_urls, captions, likes, verification status, etc.
 */
async function scrapeEmbed(
  handle: string,
): Promise<InstagramProfileData | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(
      `https://www.instagram.com/${handle}/embed/`,
      {
        headers: {
          "User-Agent": randomUserAgent(),
          Accept: "text/html",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: controller.signal,
        redirect: "follow",
      },
    );
    clearTimeout(timer);

    if (!response.ok) {
      console.log(
        `[instagram] Embed returned ${response.status} for @${handle}`,
      );
      return null;
    }

    const html = await response.text();

    // Extract contextJSON from the embed HTML
    const contextMatch = html.match(
      /"contextJSON"\s*:\s*"((?:[^"\\]|\\.)*)"/,
    );
    if (!contextMatch) {
      console.log(`[instagram] No contextJSON found in embed for @${handle}`);
      return null;
    }

    // Unescape the double-escaped JSON string.
    // The contextJSON value is itself a JSON string escaped inside HTML/JS.
    // Use JSON.parse to properly unescape it (handles \", \\, \n, \t, \uXXXX).
    let rawJson: string;
    try {
      rawJson = JSON.parse('"' + contextMatch[1] + '"') as string;
    } catch {
      // Fallback: manual unescape (only quotes and backslashes —
      // leave \n and \t as-is since they're valid JSON escapes)
      rawJson = contextMatch[1]
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    }

    // Strip any control characters that aren't valid JSON whitespace
    rawJson = rawJson.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");

    const contextData = JSON.parse(rawJson) as Record<string, unknown>;
    const ctx = (contextData.context ?? contextData) as Record<
      string,
      unknown
    >;

    // Extract profile data
    const profile: InstagramProfileData = {
      handle,
      displayName:
        typeof ctx.full_name === "string" ? ctx.full_name : handle,
      bio: typeof ctx.biography === "string" ? ctx.biography : "",
      avatarUrl:
        typeof ctx.profile_pic_url === "string" ? ctx.profile_pic_url : "",
      followersCount:
        typeof ctx.followers_count === "number" ? ctx.followers_count : 0,
      followingCount:
        typeof ctx.following_count === "number" ? ctx.following_count : 0,
      postsCount:
        (typeof ctx.posts_count === "number" ? ctx.posts_count : 0) ||
        (typeof ctx.media_count === "number" ? ctx.media_count : 0),
      verified: ctx.is_verified === true,
      recentPosts: [],
    };

    // Extract posts from graphql_media array
    const media = ctx.graphql_media as
      | Array<Record<string, unknown>>
      | undefined;

    if (Array.isArray(media)) {
      profile.recentPosts = media.slice(0, 12).map((item) => {
        const m = (item.shortcode_media ?? item) as Record<string, unknown>;

        // Caption extraction
        let caption = "";
        const captionEdges = m.edge_media_to_caption as
          | Record<string, unknown>
          | undefined;
        if (captionEdges) {
          const edges = captionEdges.edges as
            | Array<Record<string, unknown>>
            | undefined;
          if (edges && edges.length > 0) {
            const node = edges[0].node as Record<string, unknown> | undefined;
            if (node && typeof node.text === "string") {
              caption = node.text;
            }
          }
        }

        return {
          id: String(m.shortcode ?? m.id ?? ""),
          imageUrl: String(m.display_url ?? m.thumbnail_src ?? ""),
          caption,
          likesCount: extractEmbedCount(m, "edge_media_preview_like") ??
            (typeof m.like_count === "number" ? m.like_count : 0),
          commentsCount:
            (typeof m.commenter_count === "number"
              ? m.commenter_count
              : null) ??
            extractEmbedCount(m, "edge_media_to_comment") ??
            0,
          timestamp: m.taken_at_timestamp
            ? new Date(Number(m.taken_at_timestamp) * 1000).toISOString()
            : "",
          isVideo: Boolean(m.is_video),
          videoUrl:
            typeof m.video_url === "string" ? m.video_url : undefined,
        };
      });
    }

    console.log(
      `[instagram] Embed → followers=${profile.followersCount}, posts=${profile.postsCount}, recentPosts=${profile.recentPosts.length}`,
    );

    return profile;
  } catch (err) {
    console.log(`[instagram] Embed scrape failed for @${handle}:`, err);
    return null;
  }
}

function extractEmbedCount(
  node: Record<string, unknown>,
  edgeName: string,
): number | null {
  const edge = node[edgeName] as Record<string, unknown> | undefined;
  if (edge && typeof edge.count === "number") return edge.count;
  return null;
}

// ---------------------------------------------------------------------------
// Strategy 2: Profile page HTML (fallback for basic counts)
// ---------------------------------------------------------------------------

// Bot user agents that Instagram serves full SSR content to (with meta tags)
const BOT_USER_AGENTS = [
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  "Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)",
];

async function scrapeProfilePage(
  handle: string,
): Promise<InstagramProfileData | null> {
  // Try multiple user agents — Instagram blocks browsers but serves bots
  const agents = [
    ...BOT_USER_AGENTS,
    randomUserAgent(), // fallback: regular browser UA
  ];

  for (const ua of agents) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const response = await fetch(
        `https://www.instagram.com/${handle}/`,
        {
          headers: {
            "User-Agent": ua,
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
          },
          signal: controller.signal,
          redirect: "follow",
        },
      );
      clearTimeout(timer);

      if (!response.ok) continue;

      const html = await response.text();

      const ogDescription = extractMetaTag(html, "og:description");
      const ogImage = extractMetaTag(html, "og:image");
      const ogTitle = extractMetaTag(html, "og:title");
      const metaDescription = extractMetaTag(html, "description");

      const descToParse = ogDescription || metaDescription;
      if (!descToParse) {
        console.log(
          `[instagram] Profile page returned no meta tags for @${handle} with UA: ${ua.slice(0, 30)}... (login wall)`,
        );
        continue; // Try next UA
      }

      const parsed = parseOgDescription(descToParse);

      const displayName = ogTitle
        ? ogTitle
            .replace(/\s*\(@[\w.]+\).*$/i, "")
            .replace(/\s*[•·].*$/i, "")
            .replace(/\s*Instagram\s*.*$/i, "")
            .trim()
        : handle;

      console.log(
        `[instagram] Profile page → followers=${parsed.followersCount}, following=${parsed.followingCount}, posts=${parsed.postsCount}`,
      );

      return {
        handle,
        displayName,
        bio: "",
        avatarUrl: ogImage || "",
        followersCount: parsed.followersCount,
        followingCount: parsed.followingCount,
        postsCount: parsed.postsCount,
        verified: false,
        recentPosts: [],
      };
    } catch {
      // Try next UA
      continue;
    }
  }

  console.log(`[instagram] Profile page scrape failed for @${handle} (all UAs blocked)`);
  return null;
}

// ---------------------------------------------------------------------------
// Main scraper
// ---------------------------------------------------------------------------

/**
 * Scrape public Instagram profile data for the given handle.
 *
 * Strategy:
 *   1. /embed/ endpoint → full data (followers, posts, images, captions)
 *   2. Profile page HTML → basic counts from og:description meta tags
 *
 * Returns `null` if no data can be extracted.
 */
export async function scrapeInstagramProfile(
  handle: string,
): Promise<InstagramProfileData | null> {
  const cleanHandle = handle.replace(/^@/, "").trim();

  if (!cleanHandle || !/^[\w][\w.]{0,28}[\w]$|^[\w]$/.test(cleanHandle)) {
    console.error(`[instagram] Invalid handle: "${handle}"`);
    return null;
  }

  console.log(`[instagram] Scraping profile for @${cleanHandle}...`);

  // Strategy 1: Embed endpoint (most reliable — has posts + images)
  const embedData = await scrapeEmbed(cleanHandle);

  // Strategy 2: Profile page (has following count that embed lacks)
  const pageData = await scrapeProfilePage(cleanHandle);

  // Merge: embed is primary, fill gaps from profile page
  if (embedData && (embedData.followersCount > 0 || embedData.recentPosts.length > 0)) {
    // Embed doesn't provide following_count — grab from profile page
    if (!embedData.followingCount && pageData?.followingCount) {
      embedData.followingCount = pageData.followingCount;
    }
    return embedData;
  }

  // Embed failed — use profile page data if available
  if (pageData && pageData.followersCount > 0) {
    return pageData;
  }

  // Return whatever partial data we got
  if (embedData) return embedData;
  if (pageData) return pageData;

  console.warn(
    `[instagram] No usable data for @${cleanHandle} — profile may be private.`,
  );
  return null;
}
