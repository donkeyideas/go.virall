/**
 * Instagram Public Profile Scraper
 *
 * Primary: /embed/ endpoint → contextJSON with full profile data
 * Fallback: HTML profile page → og:description meta tags
 * No authentication required.
 */

import type { ScrapedProfile, ScrapedPost } from '../scrape';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
];

const BOT_USER_AGENTS = [
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  'Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)',
];

const FETCH_TIMEOUT_MS = 15_000;

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function parseCount(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.trim().replace(/,/g, '');
  const m = cleaned.match(/^([\d.]+)\s*(M|K|B)$/i);
  if (m) {
    const v = parseFloat(m[1]);
    const mult: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9 };
    return Math.round(v * (mult[m[2].toUpperCase()] ?? 1));
  }
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? Math.round(num) : 0;
}

function extractMeta(html: string, tag: string): string {
  const esc = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const a = html.match(new RegExp(`<meta[^>]*(?:property|name)=["']${esc}["'][^>]*content=["']([^"']*)["']`, 'i'));
  if (a) return decodeHtml(a[1]);
  const b = html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${esc}["']`, 'i'));
  if (b) return decodeHtml(b[1]);
  return '';
}

function decodeHtml(t: string): string {
  return t
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
}

function parseOgDesc(desc: string) {
  const r = { followersCount: 0, followingCount: 0, postsCount: 0 };
  if (!desc) return r;
  const m = desc.match(/^([\d,.]+[KMBkmb]?)\s+Followers?,\s*([\d,.]+[KMBkmb]?)\s+Following,\s*([\d,.]+[KMBkmb]?)\s+Posts?\b/i);
  if (m) { r.followersCount = parseCount(m[1]); r.followingCount = parseCount(m[2]); r.postsCount = parseCount(m[3]); return r; }
  const f1 = desc.match(/([\d,.]+[KMBkmb]?)\s+Followers?/i);
  const f2 = desc.match(/([\d,.]+[KMBkmb]?)\s+Following/i);
  const f3 = desc.match(/([\d,.]+[KMBkmb]?)\s+Posts?/i);
  if (f1) r.followersCount = parseCount(f1[1]);
  if (f2) r.followingCount = parseCount(f2[1]);
  if (f3) r.postsCount = parseCount(f3[1]);
  return r;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function scrapeEmbed(handle: string): Promise<ScrapedProfile | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(`https://www.instagram.com/${handle}/embed/`, {
      headers: { 'User-Agent': randomUA(), Accept: 'text/html', 'Accept-Language': 'en-US,en;q=0.9' },
      signal: ctrl.signal, redirect: 'follow',
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const html = await res.text();

    const ctxMatch = html.match(/"contextJSON"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (!ctxMatch) return null;

    let raw: string;
    try { raw = JSON.parse('"' + ctxMatch[1] + '"') as string; } catch { raw = ctxMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\'); }
    raw = raw.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
    const data = JSON.parse(raw) as any;
    const ctx = (data.context ?? data) as any;

    const recentPosts: ScrapedPost[] = [];
    const media = ctx.graphql_media as any[] | undefined;
    if (Array.isArray(media)) {
      for (const item of media.slice(0, 12)) {
        const m = (item.shortcode_media ?? item) as any;
        let caption = '';
        const edges = m.edge_media_to_caption?.edges;
        if (Array.isArray(edges) && edges.length > 0) caption = edges[0]?.node?.text ?? '';
        recentPosts.push({
          id: String(m.shortcode ?? m.id ?? ''),
          imageUrl: String(m.display_url ?? m.thumbnail_src ?? ''),
          caption,
          likesCount: m.edge_media_preview_like?.count ?? m.like_count ?? 0,
          commentsCount: m.commenter_count ?? m.edge_media_to_comment?.count ?? 0,
          timestamp: m.taken_at_timestamp ? new Date(Number(m.taken_at_timestamp) * 1000).toISOString() : '',
          isVideo: Boolean(m.is_video),
        });
      }
    }

    return {
      handle,
      displayName: typeof ctx.full_name === 'string' ? ctx.full_name : handle,
      bio: typeof ctx.biography === 'string' ? ctx.biography : '',
      avatarUrl: typeof ctx.profile_pic_url === 'string' ? ctx.profile_pic_url : '',
      followersCount: typeof ctx.followers_count === 'number' ? ctx.followers_count : 0,
      followingCount: typeof ctx.following_count === 'number' ? ctx.following_count : 0,
      postsCount: (typeof ctx.posts_count === 'number' ? ctx.posts_count : 0) || (typeof ctx.media_count === 'number' ? ctx.media_count : 0),
      verified: ctx.is_verified === true,
      recentPosts,
    };
  } catch { return null; }
}

async function scrapeProfilePage(handle: string): Promise<ScrapedProfile | null> {
  for (const ua of [...BOT_USER_AGENTS, randomUA()]) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
      const res = await fetch(`https://www.instagram.com/${handle}/`, {
        headers: { 'User-Agent': ua, Accept: 'text/html', 'Accept-Language': 'en-US,en;q=0.9' },
        signal: ctrl.signal, redirect: 'follow',
      });
      clearTimeout(t);
      if (!res.ok) continue;
      const html = await res.text();
      const ogDesc = extractMeta(html, 'og:description') || extractMeta(html, 'description');
      if (!ogDesc) continue;
      const parsed = parseOgDesc(ogDesc);
      const ogTitle = extractMeta(html, 'og:title');
      const displayName = ogTitle ? ogTitle.replace(/\s*\(@[\w.]+\).*$/i, '').replace(/\s*[•·].*$/i, '').replace(/\s*Instagram\s*.*$/i, '').trim() : handle;
      return {
        handle, displayName, bio: '', avatarUrl: extractMeta(html, 'og:image'),
        followersCount: parsed.followersCount, followingCount: parsed.followingCount,
        postsCount: parsed.postsCount, verified: false, recentPosts: [],
      };
    } catch { continue; }
  }
  return null;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function scrapeInstagramProfile(handle: string): Promise<ScrapedProfile | null> {
  const clean = handle.replace(/^@/, '').trim();
  if (!clean) return null;

  const embedData = await scrapeEmbed(clean);
  const pageData = await scrapeProfilePage(clean);

  if (embedData && (embedData.followersCount > 0 || embedData.recentPosts.length > 0)) {
    if (!embedData.followingCount && pageData?.followingCount) embedData.followingCount = pageData.followingCount;
    return embedData;
  }
  if (pageData && pageData.followersCount > 0) return pageData;
  return embedData ?? pageData ?? null;
}
