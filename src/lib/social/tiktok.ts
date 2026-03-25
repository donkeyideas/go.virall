/**
 * TikTok Public Profile Scraper
 *
 * Extracts profile data from TikTok's web page using embedded JSON
 * (__UNIVERSAL_DATA_FOR_REHYDRATION__ or SIGI_STATE).
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

export interface TikTokProfileData {
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  verified: boolean;
  hearts?: number;
  recentPosts: SocialPost[];
}

const FETCH_TIMEOUT_MS = 15_000;

// User agents to try — Googlebot is allowed by TikTok's robots.txt
const USER_AGENTS = [
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "facebookexternalhit/1.1",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
];

export async function scrapeTikTokProfile(
  handle: string,
): Promise<TikTokProfileData | null> {
  const cleanHandle = handle.replace(/^@/, "").trim();
  if (!cleanHandle) return null;

  console.log(`[tiktok] Scraping profile for @${cleanHandle}...`);

  // Try multiple User-Agents — Googlebot often gets richer SSR content
  for (const ua of USER_AGENTS) {
    const result = await fetchTikTokPage(cleanHandle, ua);
    if (result) {
      // If we got profile data with posts, return immediately
      if (result.recentPosts.length > 0 || result.followersCount > 0) {
        return result;
      }
    }
  }

  // If no UA worked fully, try one more time with og: meta tags fallback
  return await fetchTikTokMetaFallback(cleanHandle);
}

async function fetchTikTokPage(
  cleanHandle: string,
  userAgent: string,
): Promise<TikTokProfileData | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(
      `https://www.tiktok.com/@${encodeURIComponent(cleanHandle)}`,
      {
        headers: {
          "User-Agent": userAgent,
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
      console.log(`[tiktok] Returned ${res.status} for @${cleanHandle} (UA: ${userAgent.slice(0, 30)}...)`);
      return null;
    }

    const html = await res.text();

    // Strategy 1: __UNIVERSAL_DATA_FOR_REHYDRATION__
    const rehydrationMatch = html.match(
      /<script[^>]*id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/,
    );

    if (rehydrationMatch) {
      try {
        const data = JSON.parse(rehydrationMatch[1]);
        const userModule =
          data?.__DEFAULT_SCOPE__?.["webapp.user-detail"];
        const userInfo = userModule?.userInfo;

        if (userInfo?.user) {
          const user = userInfo.user;
          const stats = userInfo.stats || {};

          // Extract recent videos from item list
          const recentPosts: SocialPost[] = [];
          const itemList =
            userModule?.itemList ||
            data?.__DEFAULT_SCOPE__?.["webapp.user-detail"]?.itemList ||
            [];

          if (Array.isArray(itemList)) {
            for (const item of itemList.slice(0, 12)) {
              recentPosts.push({
                id: String(item.id || ""),
                imageUrl:
                  item.video?.cover ||
                  item.video?.dynamicCover ||
                  item.video?.originCover ||
                  "",
                caption: String(item.desc || ""),
                likesCount: item.stats?.diggCount ?? 0,
                commentsCount: item.stats?.commentCount ?? 0,
                timestamp: item.createTime
                  ? new Date(Number(item.createTime) * 1000).toISOString()
                  : "",
                isVideo: true,
              });
            }
          }

          const profile: TikTokProfileData = {
            handle: user.uniqueId || cleanHandle,
            displayName: user.nickname || cleanHandle,
            bio: user.signature || "",
            avatarUrl:
              user.avatarLarger || user.avatarMedium || user.avatarThumb || "",
            followersCount: stats.followerCount ?? 0,
            followingCount: stats.followingCount ?? 0,
            postsCount: stats.videoCount ?? 0,
            verified: user.verified ?? false,
            hearts: stats.heartCount ?? 0,
            recentPosts,
          };

          console.log(
            `[tiktok] Rehydration → followers=${profile.followersCount}, videos=${profile.postsCount}, recentPosts=${recentPosts.length}`,
          );
          return profile;
        }
      } catch {
        // JSON parse failed, try next
      }
    }

    // Strategy 2: SIGI_STATE (older pages)
    const sigiMatch = html.match(
      /<script[^>]*id="SIGI_STATE"[^>]*>([\s\S]*?)<\/script>/,
    );

    if (sigiMatch) {
      try {
        const data = JSON.parse(sigiMatch[1]);
        const userModule = data?.UserModule;
        const users = userModule?.users;
        const stats = userModule?.stats;

        if (users && Object.keys(users).length > 0) {
          const userId = Object.keys(users)[0];
          const user = users[userId];
          const userStats = stats?.[userId] || {};

          const profile: TikTokProfileData = {
            handle: user.uniqueId || cleanHandle,
            displayName: user.nickname || cleanHandle,
            bio: user.signature || "",
            avatarUrl: user.avatarLarger || user.avatarMedium || "",
            followersCount: userStats.followerCount ?? 0,
            followingCount: userStats.followingCount ?? 0,
            postsCount: userStats.videoCount ?? 0,
            verified: user.verified ?? false,
            hearts: userStats.heartCount ?? 0,
            recentPosts: [],
          };

          console.log(
            `[tiktok] SIGI_STATE → followers=${profile.followersCount}, videos=${profile.postsCount}`,
          );
          return profile;
        }
      } catch {
        // JSON parse failed
      }
    }

    // Also try JSON-LD if embedded JSON didn't work
    const jsonLdMatch = html.match(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/,
    );
    if (jsonLdMatch) {
      try {
        const ld = JSON.parse(jsonLdMatch[1]);
        if (ld?.name || ld?.["@type"]) {
          const followersMatch = html.match(/(\d[\d,.]*[KMB]?)\s*Followers/i);
          const followingMatch = html.match(/(\d[\d,.]*[KMB]?)\s*Following/i);
          const likesMatch = html.match(/(\d[\d,.]*[KMB]?)\s*Likes/i);

          console.log(`[tiktok] JSON-LD fallback → name=${ld.name}`);
          return {
            handle: cleanHandle,
            displayName: ld.name || cleanHandle,
            bio: ld.description || "",
            avatarUrl: ld.image || "",
            followersCount: followersMatch ? parseCount(followersMatch[1]) : 0,
            followingCount: followingMatch ? parseCount(followingMatch[1]) : 0,
            postsCount: 0,
            verified: false,
            hearts: likesMatch ? parseCount(likesMatch[1]) : 0,
            recentPosts: [],
          };
        }
      } catch {
        // JSON-LD parse failed
      }
    }

    console.log(
      `[tiktok] Could not extract data for @${cleanHandle} (UA: ${userAgent.slice(0, 30)}...)`,
    );
    return null;
  } catch (err) {
    console.log(`[tiktok] Scrape failed for @${cleanHandle}:`, err);
    return null;
  }
}

/**
 * Last-resort fallback: extract basic info from og: meta tags
 */
async function fetchTikTokMetaFallback(
  cleanHandle: string,
): Promise<TikTokProfileData | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(
      `https://www.tiktok.com/@${encodeURIComponent(cleanHandle)}`,
      {
        headers: {
          "User-Agent": "facebookexternalhit/1.1",
          Accept: "text/html",
        },
        signal: controller.signal,
        redirect: "follow",
      },
    );
    clearTimeout(timer);

    if (!res.ok) return null;

    const html = await res.text();

    const ogTitle = extractMeta(html, "og:title");
    const ogDesc = extractMeta(html, "og:description");
    const ogImage = extractMeta(html, "og:image");

    if (!ogTitle || ogTitle.toLowerCase() === "tiktok") return null;

    // og:description often has "X Likes, Y Followers. Bio text"
    const followersMatch = ogDesc.match(/([\d,.]+[KMB]?)\s*Followers/i);
    const likesMatch = ogDesc.match(/([\d,.]+[KMB]?)\s*Likes/i);

    const displayName = ogTitle
      .replace(/\s*\(@[\w.]+\).*$/i, "")
      .replace(/\s*\|\s*TikTok.*$/i, "")
      .replace(/\s*on\s*TikTok.*$/i, "")
      .trim();

    console.log(`[tiktok] Meta fallback → name="${displayName}", followers=${followersMatch?.[1] || 0}`);

    return {
      handle: cleanHandle,
      displayName: displayName || cleanHandle,
      bio: ogDesc?.replace(/[\d,.]+[KMB]?\s*(Likes|Followers|Following)[,.\s]*/gi, "").trim() || "",
      avatarUrl: ogImage || "",
      followersCount: followersMatch ? parseCount(followersMatch[1]) : 0,
      followingCount: 0,
      postsCount: 0,
      verified: false,
      hearts: likesMatch ? parseCount(likesMatch[1]) : 0,
      recentPosts: [],
    };
  } catch {
    return null;
  }
}

function extractMeta(html: string, tag: string): string {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patternA = new RegExp(
    `<meta[^>]*(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["']`,
    "i",
  );
  const matchA = html.match(patternA);
  if (matchA) return matchA[1];

  const patternB = new RegExp(
    `<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["']`,
    "i",
  );
  const matchB = html.match(patternB);
  if (matchB) return matchB[1];

  return "";
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
