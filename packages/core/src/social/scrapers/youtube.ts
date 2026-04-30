/**
 * YouTube Profile Fetcher
 *
 * Primary: YouTube Data API v3 (requires YOUTUBE_API_KEY)
 * Fallback: HTML page scraping (no key required)
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
  const clean = handle.trim().replace(/\/$/, '');

  // Try API first
  const apiKey = getApiKey();
  if (apiKey) {
    try {
      const channel = await resolveChannel(clean, apiKey);
      if (channel) {
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
      }
    } catch (err) {
      console.log(`[youtube] API error for ${clean}:`, err);
    }
  }

  // Fallback: scrape channel page HTML
  return await scrapeYouTubeHtml(clean);
}

/** HTML fallback when no API key is configured */
async function scrapeYouTubeHtml(handle: string): Promise<YouTubeProfile | null> {
  const urlHandle = handle.startsWith('@') ? handle : `@${handle}`;
  const url = `https://www.youtube.com/${urlHandle}`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15_000);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        Accept: 'text/html', 'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: ctrl.signal, redirect: 'follow',
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const html = await res.text();

    // Extract from og: meta tags
    const metaVal = (tag: string) => {
      const esc = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const m = html.match(new RegExp(`<meta[^>]*(?:property|name)=["']${esc}["'][^>]*content=["']([^"']*)["']`, 'i'));
      return m ? m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"') : '';
    };

    const ogTitle = metaVal('og:title');
    const ogDesc = metaVal('og:description');
    const ogImage = metaVal('og:image');
    if (!ogTitle) return null;

    // Try to extract subscriber count from HTML
    const subMatch = html.match(/"subscriberCountText"\s*:\s*\{"simpleText"\s*:\s*"([\d,.]+[KMB]?)\s*subscribers?"/i)
      || html.match(/([\d,.]+[KMB]?)\s*subscribers?/i);
    const vidMatch = html.match(/"videoCountText"\s*:\s*\{[^}]*"([\d,.]+[KMB]?)(?:\s*videos?)?"/i);

    const parseNum = (s: string) => {
      const clean = s.replace(/,/g, '').trim();
      const m = clean.match(/^([\d.]+)\s*([KMB])?$/i);
      if (m) {
        const v = parseFloat(m[1]);
        const mult: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9 };
        return Math.round(v * (mult[m[2]?.toUpperCase() ?? ''] ?? 1));
      }
      return parseInt(clean) || 0;
    };

    const displayName = ogTitle.replace(/\s*[-–]\s*YouTube.*$/i, '').trim();

    return {
      handle,
      displayName: displayName || handle,
      bio: ogDesc || '',
      avatarUrl: ogImage || '',
      followersCount: subMatch ? parseNum(subMatch[1]) : 0,
      followingCount: 0,
      postsCount: vidMatch ? parseNum(vidMatch[1]) : 0,
      verified: false,
      recentPosts: [],
    };
  } catch { return null; }
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
