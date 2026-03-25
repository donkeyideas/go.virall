/**
 * YouTube Data API v3 Profile Fetcher
 *
 * Uses official YouTube API to fetch channel statistics.
 * Requires YOUTUBE_API_KEY environment variable.
 * Free tier: 10,000 units/day.
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

export interface YouTubeProfileData {
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  verified: boolean;
  totalViews?: number;
  channelId?: string;
  recentPosts: SocialPost[];
}

const API_BASE = "https://www.googleapis.com/youtube/v3";

function getApiKey(): string | null {
  return (
    process.env.YOUTUBE_API_KEY ||
    process.env.GOOGLE_PAGESPEED_API_KEY ||
    null
  );
}

export async function scrapeYouTubeProfile(
  handle: string,
): Promise<YouTubeProfileData | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.log("[youtube] No API key configured");
    return null;
  }

  const cleanHandle = handle.trim().replace(/\/$/, "");
  console.log(`[youtube] Fetching profile for ${cleanHandle}...`);

  try {
    const channel = await resolveChannel(cleanHandle, apiKey);
    if (!channel) {
      console.log(`[youtube] Channel not found for ${cleanHandle}`);
      return null;
    }

    // Fetch recent videos
    const recentPosts = await fetchRecentVideos(channel.id, apiKey);

    const profile: YouTubeProfileData = {
      handle: channel.snippet.customUrl || cleanHandle,
      displayName: channel.snippet.title || cleanHandle,
      bio: channel.snippet.description || "",
      avatarUrl: channel.snippet.thumbnails?.default?.url || "",
      followersCount:
        parseInt(channel.statistics.subscriberCount) || 0,
      followingCount: 0,
      postsCount: parseInt(channel.statistics.videoCount) || 0,
      verified: false,
      totalViews: parseInt(channel.statistics.viewCount) || 0,
      channelId: channel.id,
      recentPosts,
    };

    console.log(
      `[youtube] API → subscribers=${profile.followersCount}, videos=${profile.postsCount}, recentPosts=${recentPosts.length}`,
    );
    return profile;
  } catch (err) {
    console.log(`[youtube] API error for ${cleanHandle}:`, err);
    return null;
  }
}

async function fetchRecentVideos(
  channelId: string,
  apiKey: string,
): Promise<SocialPost[]> {
  try {
    // Search for recent uploads (costs 100 units)
    const searchUrl = `${API_BASE}/search?channelId=${channelId}&part=snippet&order=date&maxResults=12&type=video&key=${apiKey}`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json();
    const items = searchData.items || [];
    if (items.length === 0) return [];

    // Get video stats (costs 1 unit per video)
    const videoIds = items.map((i: { id: { videoId: string } }) => i.id.videoId).join(",");
    const statsUrl = `${API_BASE}/videos?id=${videoIds}&part=statistics&key=${apiKey}`;
    const statsRes = await fetch(statsUrl);
    const statsMap: Record<string, { viewCount: string; likeCount: string; commentCount: string }> = {};
    if (statsRes.ok) {
      const statsData = await statsRes.json();
      for (const v of statsData.items || []) {
        statsMap[v.id] = v.statistics;
      }
    }

    return items.map((item: { id: { videoId: string }; snippet: { title: string; publishedAt: string; thumbnails: { high?: { url: string }; medium?: { url: string }; default?: { url: string } } } }) => {
      const videoId = item.id.videoId;
      const stats = statsMap[videoId] || {};
      return {
        id: videoId,
        imageUrl:
          item.snippet.thumbnails?.high?.url ||
          item.snippet.thumbnails?.medium?.url ||
          item.snippet.thumbnails?.default?.url ||
          "",
        caption: item.snippet.title || "",
        likesCount: parseInt(stats.likeCount) || 0,
        commentsCount: parseInt(stats.commentCount) || 0,
        timestamp: item.snippet.publishedAt || "",
        isVideo: true,
      };
    });
  } catch {
    return [];
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function resolveChannel(
  input: string,
  apiKey: string,
): Promise<any | null> {
  const parts = "id,snippet,statistics";

  // @handle format
  if (input.startsWith("@")) {
    return fetchChannelByParam(
      `forHandle=${encodeURIComponent(input)}`,
      parts,
      apiKey,
    );
  }

  // URL parsing
  if (input.includes("youtube.com")) {
    try {
      const url = new URL(
        input.startsWith("http") ? input : `https://${input}`,
      );
      const pathname = url.pathname;

      const channelMatch = pathname.match(/\/channel\/(UC[\w-]+)/);
      if (channelMatch) {
        return fetchChannelByParam(
          `id=${channelMatch[1]}`,
          parts,
          apiKey,
        );
      }

      const handleMatch = pathname.match(/\/@([\w.-]+)/);
      if (handleMatch) {
        return fetchChannelByParam(
          `forHandle=${encodeURIComponent(`@${handleMatch[1]}`)}`,
          parts,
          apiKey,
        );
      }

      const customMatch = pathname.match(/\/(c|user)\/([\w.-]+)/);
      if (customMatch) {
        return fetchChannelByParam(
          `forUsername=${encodeURIComponent(customMatch[2])}`,
          parts,
          apiKey,
        );
      }
    } catch {
      // not a valid URL
    }
  }

  // Channel ID
  if (input.startsWith("UC") && input.length >= 20) {
    return fetchChannelByParam(`id=${input}`, parts, apiKey);
  }

  // Try as handle without @
  return fetchChannelByParam(
    `forHandle=${encodeURIComponent(`@${input}`)}`,
    parts,
    apiKey,
  );
}

async function fetchChannelByParam(
  param: string,
  parts: string,
  apiKey: string,
): Promise<any | null> {
  const url = `${API_BASE}/channels?${param}&part=${parts}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data.items?.[0] || null;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
