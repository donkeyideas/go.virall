/**
 * TikTok Public Profile Scraper
 *
 * Extracts profile data from TikTok's web page using embedded JSON
 * (__UNIVERSAL_DATA_FOR_REHYDRATION__ or SIGI_STATE).
 *
 * If the initial page doesn't include videos (common for large accounts
 * where TikTok lazy-loads them), uses the secUid to call TikTok's
 * internal web API for the video list.
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

// User agents to try — browser UA returns full rehydration data
// Googlebot now returns 403, facebookexternalhit returns minimal HTML
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  "facebookexternalhit/1.1",
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
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Upgrade-Insecure-Requests": "1",
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
        const userModule = data?.__DEFAULT_SCOPE__?.["webapp.user-detail"];
        const userInfo = userModule?.userInfo;

        if (userInfo?.user) {
          const user = userInfo.user;
          const stats = userInfo.stats || {};

          // Extract recent videos — check multiple possible paths
          let recentPosts: SocialPost[] = [];
          const itemList =
            userModule?.itemList ||
            data?.__DEFAULT_SCOPE__?.["webapp.user-detail"]?.itemList ||
            data?.__DEFAULT_SCOPE__?.["webapp.video-feed"]?.itemList ||
            data?.__DEFAULT_SCOPE__?.["webapp.user-detail"]?.postList ||
            [];

          if (Array.isArray(itemList) && itemList.length > 0) {
            recentPosts = mapTikTokItems(itemList);
          }

          // If no items in rehydration JSON, use embed + video page strategy
          if (recentPosts.length === 0) {
            console.log(`[tiktok] No itemList in rehydration, trying embed strategy...`);
            const embedPosts = await fetchTikTokPostsViaEmbed(cleanHandle);
            if (embedPosts.length > 0) {
              recentPosts = embedPosts;
            }
          }

          const profile: TikTokProfileData = {
            handle: user.uniqueId || cleanHandle,
            displayName: user.nickname || cleanHandle,
            bio: user.signature || "",
            avatarUrl: user.avatarLarger || user.avatarMedium || user.avatarThumb || "",
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
        const userStats = userModule?.stats;

        if (users && Object.keys(users).length > 0) {
          const userId = Object.keys(users)[0];
          const user = users[userId];
          const stats = userStats?.[userId] || {};

          // Try to extract videos from ItemModule
          let recentPosts: SocialPost[] = [];
          const itemModule = data?.ItemModule;
          if (itemModule && typeof itemModule === "object") {
            const items = Object.values(itemModule) as Array<Record<string, unknown>>;
            recentPosts = items.slice(0, 12).map((item) => ({
              id: String(item.id || ""),
              imageUrl: (item.video as Record<string, unknown>)?.cover as string || "",
              caption: String(item.desc || ""),
              likesCount: (item.stats as Record<string, unknown>)?.diggCount as number ?? 0,
              commentsCount: (item.stats as Record<string, unknown>)?.commentCount as number ?? 0,
              timestamp: item.createTime
                ? new Date(Number(item.createTime) * 1000).toISOString()
                : "",
              isVideo: true,
            }));
          }

          // Fallback: try embed strategy
          if (recentPosts.length === 0) {
            const embedPosts = await fetchTikTokPostsViaEmbed(cleanHandle);
            if (embedPosts.length > 0) recentPosts = embedPosts;
          }

          const profile: TikTokProfileData = {
            handle: user.uniqueId || cleanHandle,
            displayName: user.nickname || cleanHandle,
            bio: user.signature || "",
            avatarUrl: user.avatarLarger || user.avatarMedium || "",
            followersCount: stats.followerCount ?? 0,
            followingCount: stats.followingCount ?? 0,
            postsCount: stats.videoCount ?? 0,
            verified: user.verified ?? false,
            hearts: stats.heartCount ?? 0,
            recentPosts,
          };

          console.log(
            `[tiktok] SIGI_STATE → followers=${profile.followersCount}, videos=${profile.postsCount}, recentPosts=${recentPosts.length}`,
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

          // Try to extract posts from HTML
          const recentPosts = extractPostsFromHtml(html, cleanHandle);

          console.log(`[tiktok] JSON-LD fallback → name=${ld.name}, posts=${recentPosts.length}`);
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
            recentPosts,
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
 * Map raw TikTok item objects to SocialPost array.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTikTokItems(itemList: any[]): SocialPost[] {
  return itemList.slice(0, 12).map((item) => ({
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
  }));
}

/**
 * Fetch TikTok posts via the embed endpoint + individual video pages.
 *
 * Strategy:
 *   1. GET /embed/@{handle} → extract video IDs from HTML
 *   2. For each video ID, GET /@{handle}/video/{id} → extract stats from rehydration JSON
 *
 * This reliably returns 6-10 recent videos with full engagement data
 * (likes, comments, shares, play count, thumbnails).
 */
async function fetchTikTokPostsViaEmbed(handle: string): Promise<SocialPost[]> {
  try {
    // Step 1: Get video IDs from embed page
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const embedRes = await fetch(
      `https://www.tiktok.com/embed/@${encodeURIComponent(handle)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Accept: "text/html",
        },
        signal: controller.signal,
      },
    );
    clearTimeout(timer);

    if (!embedRes.ok) {
      console.log(`[tiktok] Embed returned ${embedRes.status} for @${handle}`);
      return [];
    }

    const embedHtml = await embedRes.text();
    const videoIdPattern = /\/video\/(\d{15,25})/g;
    const videoIds = new Set<string>();
    let m;
    while ((m = videoIdPattern.exec(embedHtml)) !== null) videoIds.add(m[1]);

    if (videoIds.size === 0) {
      console.log(`[tiktok] No video IDs found in embed page for @${handle}`);
      return [];
    }

    console.log(`[tiktok] Embed → ${videoIds.size} video IDs for @${handle}`);

    // Step 2: Hydrate each video in parallel (max 8)
    const idsToFetch = Array.from(videoIds).slice(0, 8);
    const results = await Promise.allSettled(
      idsToFetch.map((id) => fetchSingleTikTokVideo(handle, id)),
    );

    const posts: SocialPost[] = [];
    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        posts.push(result.value);
      }
    }

    console.log(`[tiktok] Hydrated ${posts.length}/${idsToFetch.length} videos for @${handle}`);
    return posts;
  } catch (err) {
    console.log(`[tiktok] Embed fetch failed:`, err);
    return [];
  }
}

/**
 * Fetch a single TikTok video page and extract data from its rehydration JSON.
 */
async function fetchSingleTikTokVideo(
  handle: string,
  videoId: string,
): Promise<SocialPost | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(
      `https://www.tiktok.com/@${encodeURIComponent(handle)}/video/${videoId}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Accept: "text/html",
        },
        signal: controller.signal,
      },
    );
    clearTimeout(timer);

    if (!res.ok) return null;

    const html = await res.text();
    const rehydMatch = html.match(
      /<script[^>]*id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/,
    );
    if (!rehydMatch) return null;

    const data = JSON.parse(rehydMatch[1]);
    const videoDetail = data?.__DEFAULT_SCOPE__?.["webapp.video-detail"];
    const item = videoDetail?.itemInfo?.itemStruct;
    if (!item) return null;

    const stats = item.stats || {};
    return {
      id: item.id || videoId,
      imageUrl: item.video?.cover || item.video?.dynamicCover || "",
      caption: item.desc || "",
      likesCount: stats.diggCount ?? 0,
      commentsCount: stats.commentCount ?? 0,
      timestamp: item.createTime
        ? new Date(Number(item.createTime) * 1000).toISOString()
        : "",
      isVideo: true,
    };
  } catch {
    return null;
  }
}

/**
 * Extract video posts from the HTML DOM structure.
 * Looks for video card elements with data attributes or embedded video data.
 */
function extractPostsFromHtml(html: string, handle: string): SocialPost[] {
  const posts: SocialPost[] = [];

  // Pattern 1: Video links in the format /@handle/video/{id}
  const videoLinkPattern = new RegExp(`/@${handle}/video/(\\d+)`, "gi");
  const videoIds = new Set<string>();
  let m;
  while ((m = videoLinkPattern.exec(html)) !== null) {
    videoIds.add(m[1]);
  }

  // Pattern 2: Generic video ID pattern
  const genericVideoPattern = /\/video\/(\d{15,25})/g;
  while ((m = genericVideoPattern.exec(html)) !== null) {
    videoIds.add(m[1]);
  }

  for (const id of Array.from(videoIds).slice(0, 12)) {
    posts.push({
      id,
      imageUrl: "",
      caption: "",
      likesCount: 0,
      commentsCount: 0,
      timestamp: "",
      isVideo: true,
    });
  }

  if (posts.length > 0) {
    console.log(`[tiktok] Extracted ${posts.length} video IDs from HTML`);
  }

  return posts;
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

    const followersMatch = ogDesc.match(/([\d,.]+[KMB]?)\s*Followers/i);
    const likesMatch = ogDesc.match(/([\d,.]+[KMB]?)\s*Likes/i);

    const displayName = ogTitle
      .replace(/\s*\(@[\w.]+\).*$/i, "")
      .replace(/\s*\|\s*TikTok.*$/i, "")
      .replace(/\s*on\s*TikTok.*$/i, "")
      .trim();

    // Try to get posts from HTML
    const recentPosts = extractPostsFromHtml(html, cleanHandle);

    console.log(`[tiktok] Meta fallback → name="${displayName}", followers=${followersMatch?.[1] || 0}, posts=${recentPosts.length}`);

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
      recentPosts,
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
    const multipliers: Record<string, number> = { K: 1_000, M: 1_000_000, B: 1_000_000_000 };
    const mult = match[2] ? multipliers[match[2].toUpperCase()] || 1 : 1;
    return Math.round(value * mult);
  }
  return parseInt(cleaned) || 0;
}
