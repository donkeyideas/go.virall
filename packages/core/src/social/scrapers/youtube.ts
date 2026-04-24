/**
 * YouTube Data API v3 Profile Fetcher
 * Requires YOUTUBE_API_KEY environment variable.
 */

import type { ScrapedProfile, ScrapedPost } from '../scrape';

export interface YouTubeProfile extends ScrapedProfile {
  totalViews?: number;
  channelId?: string;
}

const API_BASE = 'https://www.googleapis.com/youtube/v3';

function getApiKey(): string | null {
  return process.env.YOUTUBE_API_KEY || null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function scrapeYouTubeProfile(handle: string): Promise<YouTubeProfile | null> {
  const apiKey = getApiKey();
  if (!apiKey) { console.log('[youtube] No API key configured'); return null; }

  const clean = handle.trim().replace(/\/$/, '');

  try {
    const channel = await resolveChannel(clean, apiKey);
    if (!channel) return null;

    const recentPosts = await fetchRecentVideos(channel.id, apiKey);

    return {
      handle: channel.snippet.customUrl || clean,
      displayName: channel.snippet.title || clean,
      bio: channel.snippet.description || '',
      avatarUrl: channel.snippet.thumbnails?.default?.url || '',
      followersCount: parseInt(channel.statistics.subscriberCount) || 0,
      followingCount: 0,
      postsCount: parseInt(channel.statistics.videoCount) || 0,
      verified: false,
      totalViews: parseInt(channel.statistics.viewCount) || 0,
      channelId: channel.id,
      recentPosts,
    };
  } catch (err) {
    console.log(`[youtube] API error for ${clean}:`, err);
    return null;
  }
}

async function fetchRecentVideos(channelId: string, apiKey: string): Promise<ScrapedPost[]> {
  try {
    const searchRes = await fetch(`${API_BASE}/search?channelId=${channelId}&part=snippet&order=date&maxResults=12&type=video&key=${apiKey}`);
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json();
    const items = searchData.items || [];
    if (items.length === 0) return [];

    const videoIds = items.map((i: any) => i.id.videoId).join(',');
    const statsRes = await fetch(`${API_BASE}/videos?id=${videoIds}&part=statistics&key=${apiKey}`);
    const statsMap: Record<string, any> = {};
    if (statsRes.ok) {
      const statsData = await statsRes.json();
      for (const v of statsData.items || []) statsMap[v.id] = v.statistics;
    }

    return items.map((item: any) => {
      const vid = item.id.videoId;
      const stats = statsMap[vid] || {};
      return {
        id: vid,
        imageUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || '',
        caption: item.snippet.title || '',
        likesCount: parseInt(stats.likeCount) || 0,
        commentsCount: parseInt(stats.commentCount) || 0,
        timestamp: item.snippet.publishedAt || '',
        isVideo: true,
      };
    });
  } catch { return []; }
}

async function resolveChannel(input: string, apiKey: string): Promise<any | null> {
  const parts = 'id,snippet,statistics';

  if (input.startsWith('@')) return fetchChannel(`forHandle=${encodeURIComponent(input)}`, parts, apiKey);

  if (input.includes('youtube.com')) {
    try {
      const url = new URL(input.startsWith('http') ? input : `https://${input}`);
      const p = url.pathname;
      const chMatch = p.match(/\/channel\/(UC[\w-]+)/);
      if (chMatch) return fetchChannel(`id=${chMatch[1]}`, parts, apiKey);
      const hMatch = p.match(/\/@([\w.-]+)/);
      if (hMatch) return fetchChannel(`forHandle=${encodeURIComponent(`@${hMatch[1]}`)}`, parts, apiKey);
      const cMatch = p.match(/\/(c|user)\/([\w.-]+)/);
      if (cMatch) return fetchChannel(`forUsername=${encodeURIComponent(cMatch[2])}`, parts, apiKey);
    } catch { /* not a valid URL */ }
  }

  if (input.startsWith('UC') && input.length >= 20) return fetchChannel(`id=${input}`, parts, apiKey);

  return fetchChannel(`forHandle=${encodeURIComponent(`@${input}`)}`, parts, apiKey);
}

async function fetchChannel(param: string, parts: string, apiKey: string): Promise<any | null> {
  const res = await fetch(`${API_BASE}/channels?${param}&part=${parts}&key=${apiKey}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.items?.[0] || null;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
