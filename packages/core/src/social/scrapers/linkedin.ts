/**
 * LinkedIn Public Profile Scraper
 *
 * Scrapes JSON-LD structured data from public profile pages.
 * No API key required — uses bot UA for rich JSON-LD.
 */

import type { ScrapedProfile, ScrapedPost } from '../scrape';

export interface LinkedInProfile extends ScrapedProfile {
  profileType?: 'personal' | 'company';
  jobTitle?: string;
}

const FETCH_TIMEOUT_MS = 15_000;

function parseCount(str: string): number {
  const clean = str.replace(/,/g, '').trim();
  const m = clean.match(/^([\d.]+)\s*([KMB])?$/i);
  if (m) {
    const v = parseFloat(m[1]);
    const mult: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9 };
    return Math.round(v * (mult[m[2]?.toUpperCase() ?? ''] ?? 1));
  }
  return parseInt(clean) || 0;
}

function decode(t: string): string {
  return t.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

function extractMeta(html: string, tag: string): string {
  const esc = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const a = html.match(new RegExp(`<meta[^>]*(?:property|name)=["']${esc}["'][^>]*content=["']([^"']*)["']`, 'i'));
  if (a) return decode(a[1]);
  const b = html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${esc}["']`, 'i'));
  return b ? decode(b[1]) : '';
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function fetchPage(profileUrl: string, handle: string): Promise<LinkedInProfile | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(profileUrl, {
      headers: { 'User-Agent': 'facebookexternalhit/1.1', Accept: 'text/html', 'Accept-Language': 'en-US,en;q=0.9' },
      signal: ctrl.signal, redirect: 'follow',
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const html = await res.text();

    // Strategy 1: JSON-LD
    const ldMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
    if (ldMatch) {
      try {
        const ld = JSON.parse(ldMatch[1]);
        const graph = ld['@graph'] || (Array.isArray(ld) ? ld : [ld]);
        const entity = graph.find((e: any) => ['Person', 'Organization', 'Corporation'].includes(e['@type']));
        if (entity) {
          let followers = 0;
          const stats = entity.interactionStatistic;
          if (stats) {
            for (const s of Array.isArray(stats) ? stats : [stats]) {
              if (s.interactionType?.includes('FollowAction') || s.name === 'Follows') followers = s.userInteractionCount ?? 0;
            }
          }
          if (!followers) { const hf = html.match(/(\d[\d,]*)\s*(?:followers|connections)/i); if (hf) followers = parseCount(hf[1]); }

          const recentPosts: ScrapedPost[] = [];
          for (const entry of graph) {
            if (entry['@type'] === 'Article' || entry['@type'] === 'DiscussionForumPosting') {
              recentPosts.push({
                id: entry.url || String(recentPosts.length), imageUrl: entry.image?.url || '',
                caption: entry.headline || entry.text?.slice(0, 200) || '', likesCount: entry.interactionStatistic?.userInteractionCount ?? 0,
                commentsCount: 0, timestamp: entry.datePublished || '', isVideo: false,
              });
            }
          }

          const isCompany = entity['@type'] === 'Organization' || entity['@type'] === 'Corporation';
          return {
            handle, displayName: decode(entity.name || handle),
            bio: decode(entity.description || (Array.isArray(entity.jobTitle) ? entity.jobTitle.join(', ') : entity.jobTitle || '')),
            avatarUrl: entity.image?.contentUrl || entity.image?.url || entity.logo?.contentUrl || entity.logo?.url || '',
            followersCount: followers, followingCount: 0, postsCount: recentPosts.length,
            verified: false, profileType: isCompany ? 'company' : 'personal',
            jobTitle: Array.isArray(entity.jobTitle) ? entity.jobTitle[0] : entity.jobTitle,
            recentPosts: recentPosts.slice(0, 12),
          };
        }
      } catch { /* JSON-LD parse failed */ }
    }

    // Strategy 2: og: meta fallback
    const ogTitle = extractMeta(html, 'og:title');
    const ogDesc = extractMeta(html, 'og:description');
    const ogImage = extractMeta(html, 'og:image');
    const fHtml = html.match(/(\d[\d,]*)\s*(?:followers|connections)/i);

    if (ogTitle && ogTitle.toLowerCase() !== 'linkedin') {
      const name = ogTitle.replace(/\s*[|–-]\s*LinkedIn.*$/i, '').trim();
      return {
        handle, displayName: decode(name || handle), bio: ogDesc || '',
        avatarUrl: ogImage || '', followersCount: fHtml ? parseCount(fHtml[1]) : 0,
        followingCount: 0, postsCount: 0, verified: false, recentPosts: [],
      };
    }
    return null;
  } catch { return null; }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function scrapeLinkedInProfile(handle: string): Promise<LinkedInProfile | null> {
  const clean = handle.replace(/^@/, '').trim();
  if (!clean) return null;

  const slug = encodeURIComponent(clean.replace(/.*company\//, '').replace(/\/.*/, ''));
  const isCompany = clean.includes('/company/') || handle.toLowerCase().includes('company');
  const urls = isCompany
    ? [`https://www.linkedin.com/company/${slug}/`]
    : [`https://www.linkedin.com/in/${slug}/`, `https://www.linkedin.com/company/${slug}/`];

  for (const url of urls) {
    const result = await fetchPage(url, clean);
    if (result && (result.followersCount > 0 || result.displayName !== clean)) {
      // Try to detect verified from page HTML
      if (!result.verified) {
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
          const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', Accept: 'text/html' },
            signal: ctrl.signal, redirect: 'follow',
          });
          clearTimeout(t);
          if (res.ok) {
            const html = await res.text();
            if (/"verified"\s*:\s*true/i.test(html) || /premium-icon/i.test(html)) {
              result.verified = true;
            }
            // Try to get follower count if missing
            if (!result.followersCount) {
              const fMatch = html.match(/(\d[\d,]*)\s*(?:followers|connections)/i);
              if (fMatch) result.followersCount = parseCount(fMatch[1]);
            }
          }
        } catch { /* continue */ }
      }
      return result;
    }
  }
  return null;
}
