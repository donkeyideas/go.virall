/**
 * X (Twitter) Public Profile Scraper
 *
 * 3-tier approach:
 *   1. Official X API v2 (requires TWITTER_BEARER_TOKEN)
 *   2. FxTwitter API (free public proxy)
 *   3. Syndication embed (last resort)
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

export interface TwitterProfileData {
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  verified: boolean;
  recentPosts: SocialPost[];
}

const FETCH_TIMEOUT_MS = 15_000;

export async function scrapeTwitterProfile(
  handle: string,
): Promise<TwitterProfileData | null> {
  const cleanHandle = handle.replace(/^@/, "").trim();
  if (!cleanHandle) return null;

  console.log(`[twitter] Scraping profile for @${cleanHandle}...`);

  // Method 1: Official API (includes tweet fetching if bearer token exists)
  const official = await fetchViaOfficialAPI(cleanHandle);
  if (official) return official;

  // Method 2: FxTwitter proxy for profile data
  const fx = await fetchViaFxTwitter(cleanHandle);
  if (fx) {
    // FxTwitter only returns profile data, not tweets.
    // Try syndication to supplement with actual tweet content.
    if (fx.recentPosts.length === 0) {
      const tweets = await extractTweetsFromSyndication(cleanHandle);
      if (tweets.length > 0) {
        fx.recentPosts = tweets;
        console.log(`[twitter] Syndication supplemented ${tweets.length} tweets`);
      }
    }
    return fx;
  }

  // Method 3: Syndication (profile + tweets)
  const syndication = await fetchViaSyndication(cleanHandle);
  if (syndication) return syndication;

  console.log(
    `[twitter] All methods failed for @${cleanHandle}`,
  );
  return null;
}

async function fetchViaOfficialAPI(
  username: string,
): Promise<TwitterProfileData | null> {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  if (!bearerToken) return null;

  try {
    const fields =
      "id,name,username,description,profile_image_url,public_metrics,verified,protected";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(
      `https://api.x.com/2/users/by/username/${encodeURIComponent(username)}?user.fields=${fields}`,
      {
        headers: { Authorization: `Bearer ${bearerToken}` },
        signal: controller.signal,
      },
    );
    clearTimeout(timer);

    if (!res.ok) return null;

    const json = await res.json();
    const user = json?.data;
    if (!user) return null;

    const metrics = user.public_metrics || {};

    console.log(
      `[twitter] Official API → followers=${metrics.followers_count}`,
    );

    // Fetch recent tweets using the user ID
    const recentPosts: SocialPost[] = [];
    if (user.id) {
      try {
        const tweetsController = new AbortController();
        const tweetsTimer = setTimeout(() => tweetsController.abort(), FETCH_TIMEOUT_MS);

        const tweetsRes = await fetch(
          `https://api.x.com/2/users/${user.id}/tweets?max_results=10&tweet.fields=created_at,public_metrics,attachments&expansions=attachments.media_keys&media.fields=url,preview_image_url,type`,
          {
            headers: { Authorization: `Bearer ${bearerToken}` },
            signal: tweetsController.signal,
          },
        );
        clearTimeout(tweetsTimer);

        if (tweetsRes.ok) {
          const tweetsJson = await tweetsRes.json();
          const tweetData = tweetsJson?.data || [];
          // Build media map from includes
          const mediaMap: Record<string, { url: string; type: string }> = {};
          for (const m of tweetsJson?.includes?.media || []) {
            mediaMap[m.media_key] = { url: m.url || m.preview_image_url || "", type: m.type || "" };
          }

          for (const tweet of tweetData) {
            const mediaKeys = tweet.attachments?.media_keys || [];
            const firstMedia = mediaKeys.length > 0 ? mediaMap[mediaKeys[0]] : null;
            recentPosts.push({
              id: tweet.id,
              imageUrl: firstMedia?.url || "",
              caption: tweet.text || "",
              likesCount: tweet.public_metrics?.like_count ?? 0,
              commentsCount: tweet.public_metrics?.reply_count ?? 0,
              timestamp: tweet.created_at || "",
              isVideo: firstMedia?.type === "video",
            });
          }
          console.log(`[twitter] Official API → ${recentPosts.length} tweets fetched`);
        }
      } catch {
        // Tweet fetch failed, continue with profile only
      }
    }

    return {
      handle: user.username || username,
      displayName: user.name || username,
      bio: user.description || "",
      avatarUrl:
        user.profile_image_url?.replace("_normal", "_400x400") || "",
      followersCount: metrics.followers_count ?? 0,
      followingCount: metrics.following_count ?? 0,
      postsCount: metrics.tweet_count ?? 0,
      verified: user.verified ?? false,
      recentPosts,
    };
  } catch {
    return null;
  }
}

async function fetchViaFxTwitter(
  username: string,
): Promise<TwitterProfileData | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(
      `https://api.fxtwitter.com/${encodeURIComponent(username)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json",
        },
        signal: controller.signal,
      },
    );
    clearTimeout(timer);

    if (!res.ok) return null;

    const json = await res.json();
    const user = json?.user;
    if (!user) return null;

    console.log(
      `[twitter] FxTwitter → followers=${user.followers}`,
    );

    // FxTwitter profile endpoint only returns user data, not tweets.
    // Recent tweets will be fetched separately via syndication.

    return {
      handle: user.screen_name || username,
      displayName: user.name || username,
      bio: user.description || "",
      avatarUrl: user.avatar_url || "",
      followersCount: user.followers ?? 0,
      followingCount: user.following ?? 0,
      postsCount: user.tweets ?? 0,
      verified: user.verified ?? false,
      recentPosts: [],
    };
  } catch {
    return null;
  }
}

/**
 * Extract tweets from the Twitter syndication timeline HTML.
 * This endpoint returns widget-style HTML with embedded tweet data.
 */
async function extractTweetsFromSyndication(
  username: string,
): Promise<SocialPost[]> {
  // Try with retry on 429 (rate limit) — syndication is often rate-limited
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (attempt > 0) {
        // Wait before retry
        await new Promise((r) => setTimeout(r, 3000));
        console.log(`[twitter] Syndication retry ${attempt} for @${username}`);
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const res = await fetch(
        `https://syndication.twitter.com/srv/timeline-profile/screen-name/${encodeURIComponent(username)}`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            Referer: "https://publish.twitter.com/",
          },
          signal: controller.signal,
        },
      );
      clearTimeout(timer);

      if (res.status === 429) {
        console.log(`[twitter] Syndication 429 rate limited (attempt ${attempt})`);
        continue; // retry
      }

      if (!res.ok) return [];

      const html = await res.text();
      if (html.length < 100) return []; // empty response

      const tweets = parseTweetsFromHtml(html);
      if (tweets.length > 0) return tweets;
    } catch {
      // continue to next attempt
    }
  }
  return [];
}

/**
 * Parse tweet data from syndication HTML.
 * Looks for multiple HTML patterns since the format varies.
 */
function parseTweetsFromHtml(html: string): SocialPost[] {
  const posts: SocialPost[] = [];

  // Strategy 1: data-tweet-id blocks (widget format)
  const tweetIdPattern = /data-tweet-id="(\d+)"/g;
  const tweetIds: string[] = [];
  let idMatch;
  while ((idMatch = tweetIdPattern.exec(html)) !== null) {
    tweetIds.push(idMatch[1]);
  }

  if (tweetIds.length > 0) {
    // Split HTML into blocks by tweet ID for extraction
    for (const id of tweetIds.slice(0, 12)) {
      const blockStart = html.indexOf(`data-tweet-id="${id}"`);
      if (blockStart === -1) continue;

      const nextTweetStart = html.indexOf("data-tweet-id=", blockStart + 20);
      const block = nextTweetStart > -1
        ? html.slice(blockStart, nextTweetStart)
        : html.slice(blockStart, blockStart + 3000);

      const textMatch = block.match(/<p[^>]*(?:Tweet-text|tweet-text|e-entry-title)[^>]*>([\s\S]*?)<\/p>/i);
      const timeMatch = block.match(/datetime="([^"]+)"/);
      const imgMatch = block.match(/<img[^>]*src="(https:\/\/pbs\.twimg\.com\/media\/[^"]+)"/);

      posts.push({
        id,
        imageUrl: imgMatch ? imgMatch[1] : "",
        caption: textMatch
          ? textMatch[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
          : "",
        likesCount: 0,
        commentsCount: 0,
        timestamp: timeMatch ? timeMatch[1] : "",
        isVideo: false,
      });
    }
  }

  // Strategy 2: Try embedded JSON (React hydration data)
  if (posts.length === 0) {
    const scriptMatch = html.match(/<script[^>]*>\s*window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?})\s*;?\s*<\/script>/);
    if (scriptMatch) {
      try {
        const data = JSON.parse(scriptMatch[1]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const entries = data?.entries || data?.tweets || [];
        if (Array.isArray(entries)) {
          for (const entry of entries.slice(0, 12)) {
            posts.push({
              id: String(entry.id_str || entry.id || posts.length),
              imageUrl: "",
              caption: String(entry.full_text || entry.text || ""),
              likesCount: entry.favorite_count ?? 0,
              commentsCount: entry.reply_count ?? 0,
              timestamp: entry.created_at || "",
              isVideo: false,
            });
          }
        }
      } catch {
        // JSON parse failed
      }
    }
  }

  // Strategy 3: Generic article/blockquote extraction
  if (posts.length === 0) {
    const articlePattern = /<article[^>]*>([\s\S]*?)<\/article>/gi;
    let articleMatch;
    let idx = 0;
    while ((articleMatch = articlePattern.exec(html)) !== null && idx < 12) {
      const block = articleMatch[1];
      const textMatch = block.match(/<p[^>]*dir="[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
      const timeMatch = block.match(/datetime="([^"]+)"/);
      if (textMatch) {
        posts.push({
          id: String(idx),
          imageUrl: "",
          caption: textMatch[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim(),
          likesCount: 0,
          commentsCount: 0,
          timestamp: timeMatch ? timeMatch[1] : "",
          isVideo: false,
        });
        idx++;
      }
    }
  }

  if (posts.length > 0) {
    console.log(`[twitter] Parsed ${posts.length} tweets from syndication HTML`);
  }

  return posts;
}

async function fetchViaSyndication(
  username: string,
): Promise<TwitterProfileData | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(
      `https://syndication.twitter.com/srv/timeline-profile/screen-name/${encodeURIComponent(username)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: controller.signal,
      },
    );
    clearTimeout(timer);

    if (!res.ok) return null;

    const html = await res.text();
    const followersMatch = html.match(/(\d[\d,.]*)\s*Followers/i);
    const followingMatch = html.match(/(\d[\d,.]*)\s*Following/i);

    if (!followersMatch) return null;

    // Also extract tweets from this HTML
    const recentPosts = parseTweetsFromHtml(html);

    console.log(
      `[twitter] Syndication → followers=${followersMatch[1]}, tweets=${recentPosts.length}`,
    );

    return {
      handle: username,
      displayName: username,
      bio: "",
      avatarUrl: "",
      followersCount: parseFormattedNumber(followersMatch[1]),
      followingCount: followingMatch
        ? parseFormattedNumber(followingMatch[1])
        : 0,
      postsCount: 0,
      verified: false,
      recentPosts,
    };
  } catch {
    return null;
  }
}

function parseFormattedNumber(str: string): number {
  const clean = str.replace(/,/g, "").trim();
  const match = clean.match(/^([\d.]+)\s*([KMB])?$/i);
  if (match) {
    const num = parseFloat(match[1]);
    const multipliers: Record<string, number> = {
      K: 1_000,
      M: 1_000_000,
      B: 1_000_000_000,
    };
    const mult = match[2]
      ? multipliers[match[2].toUpperCase()] || 1
      : 1;
    return Math.round(num * mult);
  }
  return parseInt(clean) || 0;
}
