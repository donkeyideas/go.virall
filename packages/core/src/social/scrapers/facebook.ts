/**
 * Facebook Public Profile/Page Scraper
 *
 * Strategies (priority order):
 * 1. Googlebot UA → Facebook serves richer SSR content to crawlers
 * 2. facebookexternalhit UA → rich og: meta tags
 * 3. Browser UA → may contain embedded JSON data
 *
 * Extracts: display name, bio, avatar, follower/like counts, post count,
 * verified status, and recent posts where available.
 */

import type { ScrapedProfile, ScrapedPost } from '../scrape';

const FETCH_TIMEOUT_MS = 15_000;

const USER_AGENTS = [
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  'Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)',
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

function decodeHtml(t: string): string {
  return t
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
}

function extractMeta(html: string, tag: string): string {
  const esc = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const a = html.match(new RegExp(`<meta[^>]*(?:property|name)=["']${esc}["'][^>]*content=["']([^"']*)["']`, 'i'));
  if (a) return decodeHtml(a[1]);
  const b = html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${esc}["']`, 'i'));
  return b ? decodeHtml(b[1]) : '';
}

async function fetchPage(url: string, ua: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      headers: { 'User-Agent': ua, Accept: 'text/html', 'Accept-Language': 'en-US,en;q=0.9' },
      signal: ctrl.signal, redirect: 'follow',
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

/** Extract follower and like counts from HTML or og:description */
function extractCounts(html: string, ogDesc: string) {
  const followersMatch = ogDesc.match(/([\d,.]+[KMB]?)\s*(?:followers|people follow)/i)
    || html.match(/([\d,.]+[KMB]?)\s*(?:followers|people follow)/i);
  const likesMatch = ogDesc.match(/([\d,.]+[KMB]?)\s*(?:likes|people like)/i)
    || html.match(/([\d,.]+[KMB]?)\s*(?:likes|people like)/i);
  const followers = followersMatch ? parseCount(followersMatch[1]) : 0;
  const likes = likesMatch ? parseCount(likesMatch[1]) : 0;
  return { followers: Math.max(followers, likes), likes };
}

/** Extract post count from the page HTML */
function extractPostCount(html: string): number {
  // Embedded JSON fields
  const jsonPatterns = [
    /"post_count"\s*:\s*(\d+)/,
    /"num_posts"\s*:\s*(\d+)/,
    /"total_count"\s*:\s*(\d+)(?=[^}]*"tab_type"\s*:\s*"POSTS")/,
    /"videoCount"\s*:\s*(\d+)/,
  ];
  for (const p of jsonPatterns) {
    const m = html.match(p);
    if (m) return parseInt(m[1]) || 0;
  }

  // Visible text patterns: "6 Posts", "Posts · 6", "6 posts"
  const textPatterns = [
    /(\d[\d,.]*)\s*(?:Posts?|publications?|videos?)\b/i,
    /\bPosts?\s*[·:]\s*(\d[\d,.]*)/i,
  ];
  for (const p of textPatterns) {
    const m = html.match(p);
    if (m) {
      const count = parseCount(m[1]);
      // Sanity check: avoid matching unrelated large numbers
      if (count > 0 && count < 1_000_000) return count;
    }
  }

  return 0;
}

/** Detect verified badge in page HTML */
function detectVerified(html: string): boolean {
  return /["']is_verified["']\s*:\s*true/i.test(html)
    || /["']isVerified["']\s*:\s*true/i.test(html)
    || /show_verified_badge[^"]*["']\s*:\s*true/i.test(html)
    || /verification_status["']\s*:\s*["']blue_verified/i.test(html);
}

/** Extract bio/about from embedded JSON or HTML */
function extractBio(html: string, ogDesc: string): string {
  // Try embedded JSON "about" or "bio" fields
  const aboutMatch = html.match(/"about"\s*:\s*\{"text"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (aboutMatch) {
    try { return JSON.parse('"' + aboutMatch[1] + '"'); } catch { /* continue */ }
  }
  const bioMatch = html.match(/"bio"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (bioMatch) {
    try { return JSON.parse('"' + bioMatch[1] + '"'); } catch { /* continue */ }
  }
  const descMatch = html.match(/"page_about_fields"\s*:\s*\{[^}]*"blurb"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (descMatch) {
    try { return JSON.parse('"' + descMatch[1] + '"'); } catch { /* continue */ }
  }

  // Fall back to og:description with count patterns and page metadata removed
  if (ogDesc) {
    return ogDesc
      .replace(/[\d,.]+[KMB]?\s*(likes?|followers?|people\s+\w+|talking\s+about\s+this)[,.\s]*/gi, '')
      .replace(/^\s*[·.,\-–]\s*/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return '';
}

/** Extract recent posts from embedded JSON in the page HTML */
function extractPosts(html: string): ScrapedPost[] {
  const posts: ScrapedPost[] = [];
  const seenKeys = new Set<string>();

  // Dedup helper: use first 50 chars of text as key
  const dedupKey = (text: string) => text.slice(0, 50).toLowerCase().trim();

  // Strategy 1: Find "creation_time" followed by "message":{"text":"..."} in the same JSON block.
  // Facebook embeds stories as large JSON with creation_time appearing before message text.
  const storyPattern = /"creation_time"\s*:\s*(\d+)[\s\S]*?"message"\s*:\s*\{"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let storyMatch;
  while ((storyMatch = storyPattern.exec(html)) !== null && posts.length < 12) {
    try {
      const text = JSON.parse('"' + storyMatch[2] + '"');
      const key = dedupKey(text);
      if (text.length < 10 || seenKeys.has(key)) continue;
      seenKeys.add(key);

      const ts = parseInt(storyMatch[1]);
      // Look near the match for engagement data and images
      const nearby = html.slice(Math.max(0, storyMatch.index - 500), storyMatch.index + storyMatch[0].length + 2000);
      const imgMatch = nearby.match(/"uri"\s*:\s*"(https:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i);
      const likesMatch = nearby.match(/"reaction_count"\s*:\s*\{"count"\s*:\s*(\d+)/);
      const commentsMatch = nearby.match(/"comment_count"\s*:\s*\{"total_count"\s*:\s*(\d+)/);

      posts.push({
        id: String(posts.length),
        imageUrl: imgMatch ? imgMatch[1].replace(/\\\//g, '/') : '',
        caption: text.slice(0, 500),
        likesCount: likesMatch ? parseInt(likesMatch[1]) : 0,
        commentsCount: commentsMatch ? parseInt(commentsMatch[1]) : 0,
        timestamp: ts > 0 ? new Date(ts * 1000).toISOString() : '',
        isVideo: false,
      });
    } catch { continue; }
  }

  // Strategy 2: Simpler "message":{"text":"..."} — catches posts when creation_time isn't nearby
  if (posts.length === 0) {
    const msgPattern = /"message"\s*:\s*\{"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
    let msgMatch;
    while ((msgMatch = msgPattern.exec(html)) !== null && posts.length < 12) {
      try {
        const text = JSON.parse('"' + msgMatch[1] + '"');
        const key = dedupKey(text);
        if (text.length < 10 || seenKeys.has(key)) continue;
        seenKeys.add(key);

        // Look after the message for creation_time (within 5000 chars)
        const after = html.slice(msgMatch.index + msgMatch[0].length, msgMatch.index + msgMatch[0].length + 5000);
        const timeMatch = after.match(/"creation_time"\s*:\s*(\d+)/);

        posts.push({
          id: String(posts.length), imageUrl: '', caption: text.slice(0, 500),
          likesCount: 0, commentsCount: 0,
          timestamp: timeMatch ? new Date(parseInt(timeMatch[1]) * 1000).toISOString() : '',
          isVideo: false,
        });
      } catch { continue; }
    }
  }

  // Strategy 3: <article> elements (some Facebook pages use these)
  if (posts.length === 0) {
    const artPattern = /<article[^>]*>([\s\S]*?)<\/article>/gi;
    let artMatch;
    while ((artMatch = artPattern.exec(html)) !== null && posts.length < 12) {
      const block = artMatch[1];
      const textMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      const timeMatch = block.match(/datetime="([^"]+)"/);
      if (textMatch) {
        const text = textMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        const key = dedupKey(text);
        if (text.length > 5 && !seenKeys.has(key)) {
          seenKeys.add(key);
          posts.push({
            id: String(posts.length), imageUrl: '', caption: text.slice(0, 500),
            likesCount: 0, commentsCount: 0, timestamp: timeMatch?.[1] || '', isVideo: false,
          });
        }
      }
    }
  }

  return posts;
}

export async function scrapeFacebookProfile(handle: string): Promise<ScrapedProfile | null> {
  const clean = handle.replace(/^@/, '').trim();
  if (!clean) return null;

  // Try multiple Facebook domains — mbasic is less aggressive at blocking
  const urls = [
    `https://www.facebook.com/${encodeURIComponent(clean)}/`,
    `https://mbasic.facebook.com/${encodeURIComponent(clean)}/`,
    `https://m.facebook.com/${encodeURIComponent(clean)}/`,
  ];

  // Accumulate best data across all UA + URL attempts
  let bestDisplayName = '';
  let bestBio = '';
  let bestAvatar = '';
  let bestFollowers = 0;
  let bestPostCount = 0;
  let bestVerified = false;
  let bestPosts: ScrapedPost[] = [];
  let foundPage = false;

  for (const pageUrl of urls) {
    if (foundPage && bestFollowers > 0) break;
    for (const ua of USER_AGENTS) {
      const html = await fetchPage(pageUrl, ua);
      if (!html) continue;

      const ogTitle = extractMeta(html, 'og:title');
      // mbasic pages may have <title> instead of og:title
      const titleMatch = !ogTitle ? html.match(/<title[^>]*>([^<]+)<\/title>/i) : null;
      const pageTitle = ogTitle || (titleMatch ? decodeHtml(titleMatch[1]) : '');
      if (!pageTitle || pageTitle.toLowerCase() === 'facebook' || pageTitle.toLowerCase().includes('log in')) continue;
      foundPage = true;

      const ogDesc = extractMeta(html, 'og:description');
      const ogImage = extractMeta(html, 'og:image');

      // Display name
      const displayName = pageTitle
        .replace(/\s*[|–-]\s*Facebook.*$/i, '')
        .replace(/\s*\|\s*[\w\s]+$/i, '')
        .trim();
      if (!bestDisplayName || displayName !== clean) bestDisplayName = displayName;

      // Avatar
      if (!bestAvatar && ogImage) bestAvatar = ogImage;

      // Counts
      const { followers } = extractCounts(html, ogDesc);
      if (followers > bestFollowers) bestFollowers = followers;

      // Post count from HTML
      const postCount = extractPostCount(html);
      if (postCount > bestPostCount) bestPostCount = postCount;

      // Verified
      if (!bestVerified) bestVerified = detectVerified(html);

      // Bio
      if (!bestBio) bestBio = extractBio(html, ogDesc);

      // Posts
      const htmlPosts = extractPosts(html);
      if (htmlPosts.length > bestPosts.length) bestPosts = htmlPosts;

      // If we got followers + posts, good enough
      if (bestFollowers > 0 && bestPostCount > 0) break;
    }
  }

  if (!foundPage || !bestDisplayName || bestDisplayName === 'Facebook') return null;

  // If we extracted posts but postCount is still 0, use posts length
  if (bestPostCount === 0 && bestPosts.length > 0) {
    bestPostCount = bestPosts.length;
  }

  return {
    handle: clean,
    displayName: bestDisplayName,
    bio: bestBio,
    avatarUrl: bestAvatar,
    followersCount: bestFollowers,
    followingCount: 0,
    postsCount: bestPostCount,
    verified: bestVerified,
    recentPosts: bestPosts,
  };
}
