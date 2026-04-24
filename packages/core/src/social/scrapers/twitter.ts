/**
 * X (Twitter) Public Profile Scraper
 *
 * 1. Official X API v2 (requires TWITTER_BEARER_TOKEN)
 * 2. FxTwitter API (free public proxy)
 * 3. Syndication embed (last resort)
 */

import type { ScrapedProfile, ScrapedPost } from '../scrape';

const FETCH_TIMEOUT_MS = 15_000;

function parseNum(str: string): number {
  const clean = str.replace(/,/g, '').trim();
  const m = clean.match(/^([\d.]+)\s*([KMB])?$/i);
  if (m) {
    const v = parseFloat(m[1]);
    const mult: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9 };
    return Math.round(v * (mult[m[2]?.toUpperCase() ?? ''] ?? 1));
  }
  return parseInt(clean) || 0;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function fetchViaOfficialAPI(username: string): Promise<ScrapedProfile | null> {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  if (!bearerToken) return null;

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(
      `https://api.x.com/2/users/by/username/${encodeURIComponent(username)}?user.fields=id,name,username,description,profile_image_url,public_metrics,verified`,
      { headers: { Authorization: `Bearer ${bearerToken}` }, signal: ctrl.signal },
    );
    clearTimeout(t);
    if (!res.ok) return null;
    const json = await res.json();
    const user = json?.data;
    if (!user) return null;
    const m = user.public_metrics || {};

    // Fetch recent tweets
    const recentPosts: ScrapedPost[] = [];
    if (user.id) {
      try {
        const tRes = await fetch(
          `https://api.x.com/2/users/${user.id}/tweets?max_results=10&tweet.fields=created_at,public_metrics,attachments&expansions=attachments.media_keys&media.fields=url,preview_image_url,type`,
          { headers: { Authorization: `Bearer ${bearerToken}` } },
        );
        if (tRes.ok) {
          const tJson = await tRes.json();
          const mediaMap: Record<string, any> = {};
          for (const med of tJson?.includes?.media || []) mediaMap[med.media_key] = med;
          for (const tw of tJson?.data || []) {
            const mk = tw.attachments?.media_keys || [];
            const fm = mk.length > 0 ? mediaMap[mk[0]] : null;
            recentPosts.push({
              id: tw.id, imageUrl: fm?.url || fm?.preview_image_url || '',
              caption: tw.text || '', likesCount: tw.public_metrics?.like_count ?? 0,
              commentsCount: tw.public_metrics?.reply_count ?? 0,
              timestamp: tw.created_at || '', isVideo: fm?.type === 'video',
            });
          }
        }
      } catch { /* continue without tweets */ }
    }

    return {
      handle: user.username || username, displayName: user.name || username,
      bio: user.description || '', avatarUrl: user.profile_image_url?.replace('_normal', '_400x400') || '',
      followersCount: m.followers_count ?? 0, followingCount: m.following_count ?? 0,
      postsCount: m.tweet_count ?? 0, verified: user.verified ?? false, recentPosts,
    };
  } catch { return null; }
}

async function fetchViaFxTwitter(username: string): Promise<ScrapedProfile | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(`https://api.fxtwitter.com/${encodeURIComponent(username)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const json = await res.json();
    const user = json?.user;
    if (!user) return null;

    return {
      handle: user.screen_name || username, displayName: user.name || username,
      bio: user.description || '', avatarUrl: user.avatar_url || '',
      followersCount: user.followers ?? 0, followingCount: user.following ?? 0,
      postsCount: user.tweets ?? 0, verified: user.verified ?? false, recentPosts: [],
    };
  } catch { return null; }
}

function parseTweetsFromHtml(html: string): ScrapedPost[] {
  const posts: ScrapedPost[] = [];
  // data-tweet-id blocks
  const idPattern = /data-tweet-id="(\d+)"/g;
  let m;
  while ((m = idPattern.exec(html)) !== null && posts.length < 12) {
    const id = m[1];
    const start = m.index;
    const nextStart = html.indexOf('data-tweet-id=', start + 20);
    const block = nextStart > -1 ? html.slice(start, nextStart) : html.slice(start, start + 3000);
    const textMatch = block.match(/<p[^>]*(?:Tweet-text|tweet-text|e-entry-title)[^>]*>([\s\S]*?)<\/p>/i);
    const timeMatch = block.match(/datetime="([^"]+)"/);
    const imgMatch = block.match(/<img[^>]*src="(https:\/\/pbs\.twimg\.com\/media\/[^"]+)"/);
    posts.push({
      id, imageUrl: imgMatch?.[1] || '', caption: textMatch ? textMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '',
      likesCount: 0, commentsCount: 0, timestamp: timeMatch?.[1] || '', isVideo: false,
    });
  }
  // article fallback
  if (posts.length === 0) {
    const artPattern = /<article[^>]*>([\s\S]*?)<\/article>/gi;
    let aMatch; let idx = 0;
    while ((aMatch = artPattern.exec(html)) !== null && idx < 12) {
      const textMatch = aMatch[1].match(/<p[^>]*dir="[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
      const timeMatch = aMatch[1].match(/datetime="([^"]+)"/);
      if (textMatch) {
        posts.push({ id: String(idx), imageUrl: '', caption: textMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(), likesCount: 0, commentsCount: 0, timestamp: timeMatch?.[1] || '', isVideo: false });
        idx++;
      }
    }
  }
  return posts;
}

async function fetchViaSyndication(username: string): Promise<ScrapedProfile | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(`https://syndication.twitter.com/srv/timeline-profile/screen-name/${encodeURIComponent(username)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', Accept: 'text/html', Referer: 'https://publish.twitter.com/' },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const html = await res.text();
    const fMatch = html.match(/(\d[\d,.]*)\s*Followers/i);
    if (!fMatch) return null;
    const recentPosts = parseTweetsFromHtml(html);
    return {
      handle: username, displayName: username, bio: '', avatarUrl: '',
      followersCount: parseNum(fMatch[1]),
      followingCount: 0, postsCount: 0, verified: false, recentPosts,
    };
  } catch { return null; }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function scrapeTwitterProfile(handle: string): Promise<ScrapedProfile | null> {
  const clean = handle.replace(/^@/, '').trim();
  if (!clean) return null;

  const official = await fetchViaOfficialAPI(clean);
  if (official) return official;

  const fx = await fetchViaFxTwitter(clean);
  if (fx) {
    if (fx.recentPosts.length === 0) {
      try {
        const tweets = parseTweetsFromHtml(await (await fetch(`https://syndication.twitter.com/srv/timeline-profile/screen-name/${encodeURIComponent(clean)}`, {
          headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html', Referer: 'https://publish.twitter.com/' },
        })).text());
        if (tweets.length > 0) fx.recentPosts = tweets;
      } catch { /* no tweets */ }
    }
    return fx;
  }

  return await fetchViaSyndication(clean);
}
