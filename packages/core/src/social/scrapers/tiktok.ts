/**
 * TikTok Public Profile Scraper
 *
 * Extracts profile data from TikTok's web page using embedded JSON.
 * No API key required.
 */

import type { ScrapedProfile, ScrapedPost } from '../scrape';

export interface TikTokProfile extends ScrapedProfile {
  hearts?: number;
}

const FETCH_TIMEOUT_MS = 15_000;

const USER_AGENTS = [
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'facebookexternalhit/1.1',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
];

function parseCount(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.trim().replace(/,/g, '');
  const m = cleaned.match(/^([\d.]+)\s*([KMB])?$/i);
  if (m) {
    const v = parseFloat(m[1]);
    const mult: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9 };
    return Math.round(v * (mult[m[2]?.toUpperCase() ?? ''] ?? 1));
  }
  return parseInt(cleaned) || 0;
}

function extractMeta(html: string, tag: string): string {
  const esc = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const a = html.match(new RegExp(`<meta[^>]*(?:property|name)=["']${esc}["'][^>]*content=["']([^"']*)["']`, 'i'));
  if (a) return a[1];
  const b = html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${esc}["']`, 'i'));
  return b ? b[1] : '';
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function fetchTikTokPage(handle: string, ua: string): Promise<TikTokProfile | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(`https://www.tiktok.com/@${encodeURIComponent(handle)}`, {
      headers: { 'User-Agent': ua, Accept: 'text/html', 'Accept-Language': 'en-US,en;q=0.9' },
      signal: ctrl.signal, redirect: 'follow',
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const html = await res.text();

    // Strategy 1: __UNIVERSAL_DATA_FOR_REHYDRATION__
    const rehMatch = html.match(/<script[^>]*id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/);
    if (rehMatch) {
      try {
        const data = JSON.parse(rehMatch[1]);
        const userInfo = data?.__DEFAULT_SCOPE__?.['webapp.user-detail']?.userInfo;
        if (userInfo?.user) {
          const user = userInfo.user;
          const stats = userInfo.stats || {};
          const itemList = data?.__DEFAULT_SCOPE__?.['webapp.user-detail']?.itemList || [];
          const recentPosts: ScrapedPost[] = [];
          if (Array.isArray(itemList)) {
            for (const item of itemList.slice(0, 12)) {
              recentPosts.push({
                id: String(item.id || ''),
                imageUrl: item.video?.cover || item.video?.dynamicCover || '',
                caption: String(item.desc || ''),
                likesCount: item.stats?.diggCount ?? 0,
                commentsCount: item.stats?.commentCount ?? 0,
                timestamp: item.createTime ? new Date(Number(item.createTime) * 1000).toISOString() : '',
                isVideo: true,
              });
            }
          }
          return {
            handle: user.uniqueId || handle, displayName: user.nickname || handle,
            bio: user.signature || '', avatarUrl: user.avatarLarger || user.avatarMedium || '',
            followersCount: stats.followerCount ?? 0, followingCount: stats.followingCount ?? 0,
            postsCount: stats.videoCount ?? 0, verified: user.verified ?? false,
            hearts: stats.heartCount ?? 0, recentPosts,
          };
        }
      } catch { /* continue */ }
    }

    // Strategy 2: SIGI_STATE
    const sigiMatch = html.match(/<script[^>]*id="SIGI_STATE"[^>]*>([\s\S]*?)<\/script>/);
    if (sigiMatch) {
      try {
        const data = JSON.parse(sigiMatch[1]);
        const users = data?.UserModule?.users;
        const statsMap = data?.UserModule?.stats;
        if (users && Object.keys(users).length > 0) {
          const uid = Object.keys(users)[0];
          const user = users[uid];
          const stats = statsMap?.[uid] || {};
          return {
            handle: user.uniqueId || handle, displayName: user.nickname || handle,
            bio: user.signature || '', avatarUrl: user.avatarLarger || user.avatarMedium || '',
            followersCount: stats.followerCount ?? 0, followingCount: stats.followingCount ?? 0,
            postsCount: stats.videoCount ?? 0, verified: user.verified ?? false,
            hearts: stats.heartCount ?? 0, recentPosts: [],
          };
        }
      } catch { /* continue */ }
    }

    // Strategy 3: JSON-LD + regex
    const ldMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
    if (ldMatch) {
      try {
        const ld = JSON.parse(ldMatch[1]);
        if (ld?.name || ld?.['@type']) {
          const fMatch = html.match(/(\d[\d,.]*[KMB]?)\s*Followers/i);
          const lMatch = html.match(/(\d[\d,.]*[KMB]?)\s*Likes/i);
          return {
            handle, displayName: ld.name || handle, bio: ld.description || '',
            avatarUrl: ld.image || '', followersCount: fMatch ? parseCount(fMatch[1]) : 0,
            followingCount: 0, postsCount: 0, verified: false,
            hearts: lMatch ? parseCount(lMatch[1]) : 0, recentPosts: [],
          };
        }
      } catch { /* continue */ }
    }

    return null;
  } catch { return null; }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

async function fetchMetaFallback(handle: string): Promise<TikTokProfile | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(`https://www.tiktok.com/@${encodeURIComponent(handle)}`, {
      headers: { 'User-Agent': 'facebookexternalhit/1.1', Accept: 'text/html' },
      signal: ctrl.signal, redirect: 'follow',
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const html = await res.text();

    const ogTitle = extractMeta(html, 'og:title');
    const ogDesc = extractMeta(html, 'og:description');
    const ogImage = extractMeta(html, 'og:image');
    if (!ogTitle || ogTitle.toLowerCase() === 'tiktok') return null;

    const fMatch = ogDesc.match(/([\d,.]+[KMB]?)\s*Followers/i);
    const lMatch = ogDesc.match(/([\d,.]+[KMB]?)\s*Likes/i);
    const displayName = ogTitle.replace(/\s*\(@[\w.]+\).*$/i, '').replace(/\s*\|\s*TikTok.*$/i, '').trim();

    return {
      handle, displayName: displayName || handle,
      bio: ogDesc?.replace(/[\d,.]+[KMB]?\s*(Likes|Followers|Following)[,.\s]*/gi, '').trim() || '',
      avatarUrl: ogImage || '', followersCount: fMatch ? parseCount(fMatch[1]) : 0,
      followingCount: 0, postsCount: 0, verified: false,
      hearts: lMatch ? parseCount(lMatch[1]) : 0, recentPosts: [],
    };
  } catch { return null; }
}

export async function scrapeTikTokProfile(handle: string): Promise<TikTokProfile | null> {
  const clean = handle.replace(/^@/, '').trim();
  if (!clean) return null;

  for (const ua of USER_AGENTS) {
    const result = await fetchTikTokPage(clean, ua);
    if (result && (result.recentPosts.length > 0 || result.followersCount > 0)) return result;
  }
  return await fetchMetaFallback(clean);
}
