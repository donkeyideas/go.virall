/**
 * Threads (Meta) Public Profile Scraper
 *
 * Threads profiles are publicly viewable. We scrape the profile page
 * for meta tags (og:description contains follower count).
 * No API key required.
 */

export interface SocialPost {
  id: string;
  imageUrl: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  timestamp: string;
  isVideo: boolean;
}

export interface ThreadsProfileData {
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  verified: boolean;
  recentPosts: SocialPost[];
}

const FETCH_TIMEOUT_MS = 15_000;

export async function scrapeThreadsProfile(
  handle: string,
): Promise<ThreadsProfileData | null> {
  const cleanHandle = handle.replace(/^@/, "").trim();
  if (!cleanHandle) return null;

  console.log(`[threads] Scraping profile for @${cleanHandle}...`);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    // Use bot UA — Threads only serves og: meta tags to crawler/bot user agents
    const res = await fetch(
      `https://www.threads.net/@${encodeURIComponent(cleanHandle)}`,
      {
        headers: {
          "User-Agent": "facebookexternalhit/1.1",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: controller.signal,
        redirect: "follow",
      },
    );
    clearTimeout(timer);

    if (!res.ok) {
      console.log(`[threads] Returned ${res.status} for @${cleanHandle}`);
      return null;
    }

    const html = await res.text();

    // Extract meta tags
    const ogDesc = extractMeta(html, "og:description");
    const ogTitle = extractMeta(html, "og:title");
    const ogImage = extractMeta(html, "og:image");
    const metaDesc = extractMeta(html, "description");

    const desc = ogDesc || metaDesc;

    // Threads og:description format: "X Followers, Y Following, Z Posts - ..."
    const followersMatch = desc.match(/([\d,.]+[KMB]?)\s*Followers?/i);
    const followingMatch = desc.match(/([\d,.]+[KMB]?)\s*Following/i);
    const postsMatch = desc.match(/([\d,.]+[KMB]?)\s*(?:Posts?|Threads?|Replies)/i);

    // Display name from og:title: "Name (@handle) on Threads"
    const displayName = ogTitle
      ? ogTitle
          .replace(/\s*\(@[\w.]+\).*$/i, "")
          .replace(/\s*on\s*Threads.*$/i, "")
          .trim()
      : cleanHandle;

    if (!followersMatch && !desc) {
      console.log(
        `[threads] No meta tags found for @${cleanHandle} — login wall`,
      );
      return null;
    }

    // Try to extract post content from HTML
    const recentPosts = extractThreadsPosts(html);

    const profile: ThreadsProfileData = {
      handle: cleanHandle,
      displayName: displayName || cleanHandle,
      bio: "",
      avatarUrl: ogImage || "",
      followersCount: followersMatch
        ? parseCount(followersMatch[1])
        : 0,
      followingCount: followingMatch
        ? parseCount(followingMatch[1])
        : 0,
      postsCount: postsMatch ? parseCount(postsMatch[1]) : 0,
      verified: false,
      recentPosts,
    };

    console.log(
      `[threads] Meta → followers=${profile.followersCount}, posts=${profile.postsCount}`,
    );
    return profile;
  } catch (err) {
    console.log(`[threads] Scrape failed for @${cleanHandle}:`, err);
    return null;
  }
}

/**
 * Try to extract post data from Threads HTML.
 * Threads embeds post data in script tags for SEO/bot rendering.
 */
function extractThreadsPosts(html: string): SocialPost[] {
  const posts: SocialPost[] = [];

  // Strategy 1: Look for JSON-LD structured data with posts
  const jsonLdPattern = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = jsonLdPattern.exec(html)) !== null) {
    try {
      const ld = JSON.parse(match[1]);
      const items = ld["@graph"] || (Array.isArray(ld) ? ld : [ld]);
      for (const item of items) {
        if (
          item["@type"] === "SocialMediaPosting" ||
          item["@type"] === "Article" ||
          item["@type"] === "DiscussionForumPosting"
        ) {
          posts.push({
            id: item.url || String(posts.length),
            imageUrl: item.image?.url || item.image || "",
            caption: item.articleBody || item.text || item.headline || "",
            likesCount: item.interactionStatistic?.userInteractionCount ?? 0,
            commentsCount: 0,
            timestamp: item.datePublished || item.dateCreated || "",
            isVideo: false,
          });
        }
      }
    } catch {
      // continue
    }
  }

  // Strategy 2: Look for embedded post content in data attributes or script tags
  if (posts.length === 0) {
    const dataPattern = /"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
    let dataMatch;
    let idx = 0;
    while ((dataMatch = dataPattern.exec(html)) !== null && idx < 12) {
      const text = dataMatch[1]
        .replace(/\\n/g, " ")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\")
        .trim();
      if (text.length > 15 && text.length < 1000) {
        posts.push({
          id: String(idx),
          imageUrl: "",
          caption: text,
          likesCount: 0,
          commentsCount: 0,
          timestamp: "",
          isVideo: false,
        });
        idx++;
      }
    }
  }

  if (posts.length > 0) {
    console.log(`[threads] Extracted ${posts.length} posts from HTML`);
  }

  return posts.slice(0, 12);
}

function extractMeta(html: string, tag: string): string {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patternA = new RegExp(
    `<meta[^>]*(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["']`,
    "i",
  );
  const matchA = html.match(patternA);
  if (matchA) return decodeEntities(matchA[1]);

  const patternB = new RegExp(
    `<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["']`,
    "i",
  );
  const matchB = html.match(patternB);
  if (matchB) return decodeEntities(matchB[1]);

  return "";
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) =>
      String.fromCodePoint(parseInt(dec, 10)),
    )
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function parseCount(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.trim().replace(/,/g, "");
  const match = cleaned.match(/^([\d.]+)\s*([KMB])?$/i);
  if (match) {
    const value = parseFloat(match[1]);
    const multipliers: Record<string, number> = {
      K: 1_000,
      M: 1_000_000,
      B: 1_000_000_000,
    };
    const mult = match[2]
      ? multipliers[match[2].toUpperCase()] || 1
      : 1;
    return Math.round(value * mult);
  }
  return parseInt(cleaned) || 0;
}
