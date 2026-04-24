/**
 * Facebook Public Profile/Page Scraper
 *
 * Scrapes public Facebook pages using og: meta tags and bot UA.
 * No API key required.
 * Note: Personal profiles are mostly private; this works best with Pages.
 */

import type { ScrapedProfile } from '../scrape';

const FETCH_TIMEOUT_MS = 15_000;

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
  if (a) return a[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  const b = html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${esc}["']`, 'i'));
  return b ? b[1].replace(/&amp;/g, '&') : '';
}

export async function scrapeFacebookProfile(handle: string): Promise<ScrapedProfile | null> {
  const clean = handle.replace(/^@/, '').trim();
  if (!clean) return null;

  // Try as a Page first (most scrapeable), then as a profile
  const urlsToTry = [
    `https://www.facebook.com/${encodeURIComponent(clean)}/`,
    `https://www.facebook.com/${encodeURIComponent(clean)}`,
  ];

  for (const url of urlsToTry) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
          Accept: 'text/html',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: ctrl.signal,
        redirect: 'follow',
      });
      clearTimeout(t);
      if (!res.ok) continue;

      const html = await res.text();

      const ogTitle = extractMeta(html, 'og:title');
      const ogDesc = extractMeta(html, 'og:description');
      const ogImage = extractMeta(html, 'og:image');

      if (!ogTitle || ogTitle.toLowerCase() === 'facebook') continue;

      // Try to extract follower/like counts from description or HTML
      const followersMatch = ogDesc.match(/([\d,.]+[KMB]?)\s*(?:followers|people follow)/i)
        || html.match(/([\d,.]+[KMB]?)\s*(?:followers|people follow)/i);
      const likesMatch = ogDesc.match(/([\d,.]+[KMB]?)\s*(?:likes|people like)/i)
        || html.match(/([\d,.]+[KMB]?)\s*(?:likes|people like)/i);

      const displayName = ogTitle
        .replace(/\s*[|–-]\s*Facebook.*$/i, '')
        .replace(/\s*\|\s*[\w\s]+$/i, '')
        .trim();

      const followers = followersMatch ? parseCount(followersMatch[1]) : 0;
      const likes = likesMatch ? parseCount(likesMatch[1]) : 0;

      // Use whichever is higher — likes or followers
      const followerCount = Math.max(followers, likes);

      if (displayName && displayName !== 'Facebook') {
        return {
          handle: clean,
          displayName,
          bio: ogDesc?.replace(/[\d,.]+[KMB]?\s*(likes|followers|people\s+\w+)[,.\s]*/gi, '').trim() || '',
          avatarUrl: ogImage || '',
          followersCount: followerCount,
          followingCount: 0,
          postsCount: 0,
          verified: false,
          recentPosts: [],
        };
      }
    } catch {
      continue;
    }
  }

  return null;
}
