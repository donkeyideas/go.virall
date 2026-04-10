/**
 * X (Twitter) Public Profile Scraper
 *
 * 4-tier approach:
 *   1. Official X API v2 (requires TWITTER_BEARER_TOKEN)
 *   2. Guest Token + GraphQL API (same method browsers use in incognito)
 *   3. FxTwitter API (free public proxy)
 *   4. Syndication embed (last resort)
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

/**
 * Twitter's public web app bearer token.
 * This is NOT a secret — it's embedded in the client-side JavaScript that
 * every visitor to x.com downloads. It identifies the Twitter web app itself.
 * Used to activate guest tokens for unauthenticated GraphQL API access.
 */
const TWITTER_PUBLIC_BEARER =
  "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";

/** Cache guest tokens (valid ~3h, we cache for 30 min) */
let cachedGuestToken: { token: string; expiresAt: number } | null = null;

export async function scrapeTwitterProfile(
  handle: string,
): Promise<TwitterProfileData | null> {
  const cleanHandle = handle.replace(/^@/, "").trim();
  if (!cleanHandle) return null;

  console.log(`[twitter] Scraping profile for @${cleanHandle}...`);

  // Method 1: Official API (includes tweet fetching if bearer token exists)
  const official = await fetchViaOfficialAPI(cleanHandle);
  if (official && official.recentPosts.length > 0) return official;

  // Method 2: Guest Token + GraphQL (same as browser incognito mode)
  const guest = await fetchViaGuestGraphQL(cleanHandle);
  if (guest && guest.recentPosts.length > 0) return guest;

  // Best profile data so far (may have empty posts)
  let bestProfile = official || guest;

  // Method 3: FxTwitter proxy for profile data + tweet hydration
  const fx = await fetchViaFxTwitter(cleanHandle);
  if (fx) {
    if (!bestProfile) bestProfile = fx;
    if (fx.recentPosts.length === 0) {
      const tweets = await fetchTweetsViaFxHydration(cleanHandle);
      if (tweets.length > 0) {
        fx.recentPosts = tweets;
        console.log(`[twitter] FxTwitter hydration → ${tweets.length} tweets`);
      } else {
        const syndicationTweets = await extractTweetsFromSyndication(cleanHandle);
        if (syndicationTweets.length > 0) {
          fx.recentPosts = syndicationTweets;
          console.log(`[twitter] Syndication supplemented ${syndicationTweets.length} tweets`);
        }
      }
    }
    if (fx.recentPosts.length > 0) {
      // Attach posts to the best profile data available
      if (bestProfile && bestProfile !== fx) {
        bestProfile.recentPosts = fx.recentPosts;
        return bestProfile;
      }
      return fx;
    }
  }

  // Method 4: Syndication (profile + tweets)
  const syndication = await fetchViaSyndication(cleanHandle);
  if (syndication && syndication.recentPosts.length > 0) {
    if (bestProfile) {
      bestProfile.recentPosts = syndication.recentPosts;
      return bestProfile;
    }
    return syndication;
  }

  // Return whatever profile data we have, even without posts
  if (bestProfile) {
    console.log(`[twitter] Returning profile for @${cleanHandle} without posts (all tweet methods failed)`);
    return bestProfile;
  }

  console.log(`[twitter] All methods failed for @${cleanHandle}`);
  return null;
}

/* ─── Method 1: Official X API v2 ─── */

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
    console.log(`[twitter] Official API → followers=${metrics.followers_count}`);

    // Fetch recent tweets
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
      avatarUrl: user.profile_image_url?.replace("_normal", "_400x400") || "",
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

/* ─── Method 2: Guest Token + GraphQL API ─── */
/* This is exactly what the browser does at x.com in incognito mode */

async function activateGuestToken(): Promise<string | null> {
  // Return cached token if still valid
  if (cachedGuestToken && Date.now() < cachedGuestToken.expiresAt) {
    return cachedGuestToken.token;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch("https://api.x.com/1.1/guest/activate.json", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${decodeURIComponent(TWITTER_PUBLIC_BEARER)}`,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.log(`[twitter] Guest token activation failed: ${res.status}`);
      return null;
    }

    const json = await res.json();
    const token = json?.guest_token;
    if (!token) return null;

    // Cache for 30 minutes
    cachedGuestToken = { token, expiresAt: Date.now() + 30 * 60 * 1000 };
    console.log(`[twitter] Guest token activated: ${token.slice(0, 8)}...`);
    return token;
  } catch (e) {
    console.log(`[twitter] Guest token error: ${e}`);
    return null;
  }
}

async function fetchViaGuestGraphQL(
  username: string,
): Promise<TwitterProfileData | null> {
  const guestToken = await activateGuestToken();
  if (!guestToken) return null;

  const bearer = decodeURIComponent(TWITTER_PUBLIC_BEARER);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${bearer}`,
    "x-guest-token": guestToken,
    "x-twitter-active-user": "yes",
    "x-twitter-client-language": "en",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    Referer: "https://x.com/",
    "Content-Type": "application/json",
  };

  try {
    // Step 1: Get user ID via UserByScreenName
    const userVariables = JSON.stringify({
      screen_name: username,
      withSafetyModeUserFields: true,
    });
    const userFeatures = JSON.stringify({
      hidden_profile_subscriptions_enabled: true,
      rweb_tipjar_consumption_enabled: true,
      responsive_web_graphql_exclude_directive_enabled: true,
      verified_phone_label_enabled: false,
      subscriptions_verification_info_is_identity_verified_enabled: true,
      subscriptions_verification_info_verified_since_enabled: true,
      highlights_tweets_tab_ui_enabled: true,
      responsive_web_twitter_article_notes_tab_enabled: true,
      subscriptions_feature_can_gift_premium: true,
      creator_subscriptions_tweet_preview_api_enabled: true,
      responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
      responsive_web_graphql_timeline_navigation_enabled: true,
    });

    const userUrl = `https://x.com/i/api/graphql/sLVLhk0bGj3MVFEKTdax1w/UserByScreenName?variables=${encodeURIComponent(userVariables)}&features=${encodeURIComponent(userFeatures)}`;

    const controller1 = new AbortController();
    const timer1 = setTimeout(() => controller1.abort(), FETCH_TIMEOUT_MS);

    const userRes = await fetch(userUrl, {
      headers,
      signal: controller1.signal,
    });
    clearTimeout(timer1);

    if (!userRes.ok) {
      console.log(`[twitter] GraphQL UserByScreenName failed: ${userRes.status}`);
      // If 403, guest token is invalid — clear cache
      if (userRes.status === 403 || userRes.status === 401) {
        cachedGuestToken = null;
      }
      return null;
    }

    const userJson = await userRes.json();
    const userResult = userJson?.data?.user?.result;
    if (!userResult) {
      console.log("[twitter] GraphQL → no user result");
      return null;
    }

    const legacy = userResult.legacy || {};
    const restId = userResult.rest_id;

    const profileData: TwitterProfileData = {
      handle: legacy.screen_name || username,
      displayName: legacy.name || username,
      bio: legacy.description || "",
      avatarUrl: (legacy.profile_image_url_https || "").replace("_normal", "_400x400"),
      followersCount: legacy.followers_count ?? 0,
      followingCount: legacy.friends_count ?? 0,
      postsCount: legacy.statuses_count ?? 0,
      verified: userResult.is_blue_verified ?? legacy.verified ?? false,
      recentPosts: [],
    };

    console.log(
      `[twitter] GraphQL → @${profileData.handle}, followers=${profileData.followersCount}`,
    );

    if (!restId) return profileData;

    // Step 2: Get tweets via UserTweets
    const tweetsVariables = JSON.stringify({
      userId: restId,
      count: 20,
      includePromotedContent: false,
      withQuickPromoteEligibilityTweetFields: false,
      withVoice: false,
      withV2Timeline: true,
    });
    const tweetsFeatures = JSON.stringify({
      rweb_tipjar_consumption_enabled: true,
      responsive_web_graphql_exclude_directive_enabled: true,
      verified_phone_label_enabled: false,
      creator_subscriptions_tweet_preview_api_enabled: true,
      responsive_web_graphql_timeline_navigation_enabled: true,
      responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
      communities_web_enable_tweet_community_results_fetch: true,
      c9s_tweet_anatomy_moderator_badge_enabled: true,
      articles_preview_enabled: true,
      responsive_web_edit_tweet_api_enabled: true,
      graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
      view_counts_everywhere_api_enabled: true,
      longform_notetweets_consumption_enabled: true,
      responsive_web_twitter_article_tweet_consumption_enabled: true,
      tweet_awards_web_tipping_enabled: false,
      creator_subscriptions_quote_tweet_preview_enabled: false,
      freedom_of_speech_not_reach_fetch_enabled: true,
      standardized_nudges_misinfo: true,
      tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
      rweb_video_timestamps_enabled: true,
      longform_notetweets_rich_text_read_enabled: true,
      longform_notetweets_inline_media_enabled: true,
      responsive_web_enhance_cards_enabled: false,
    });

    const tweetsUrl = `https://x.com/i/api/graphql/HuTx74BxAnezK1gWvYY7zg/UserTweets?variables=${encodeURIComponent(tweetsVariables)}&features=${encodeURIComponent(tweetsFeatures)}`;

    const controller2 = new AbortController();
    const timer2 = setTimeout(() => controller2.abort(), FETCH_TIMEOUT_MS);

    const tweetsRes = await fetch(tweetsUrl, {
      headers,
      signal: controller2.signal,
    });
    clearTimeout(timer2);

    if (!tweetsRes.ok) {
      console.log(`[twitter] GraphQL UserTweets failed: ${tweetsRes.status}`);
      return profileData; // Return profile even without tweets
    }

    const tweetsJson = await tweetsRes.json();
    const tweets = extractTweetsFromGraphQL(tweetsJson);
    profileData.recentPosts = tweets;

    console.log(`[twitter] GraphQL → ${tweets.length} tweets fetched`);
    return profileData;
  } catch (e) {
    console.log(`[twitter] GraphQL error: ${e}`);
    return null;
  }
}

/**
 * Extract tweets from Twitter's GraphQL UserTweets response.
 * The response structure is deeply nested with timeline instructions.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractTweetsFromGraphQL(json: any): SocialPost[] {
  const posts: SocialPost[] = [];

  try {
    // Navigate the deeply nested timeline structure
    const instructions =
      json?.data?.user?.result?.timeline_v2?.timeline?.instructions ||
      json?.data?.user?.result?.timeline?.timeline?.instructions ||
      [];

    for (const instruction of instructions) {
      // Look for "TimelineAddEntries" instruction type
      const entries = instruction?.entries || [];
      for (const entry of entries) {
        // Each entry can be a tweet, cursor, or module
        const tweetResult =
          entry?.content?.itemContent?.tweet_results?.result ||
          entry?.content?.itemContent?.tweet_results?.result?.tweet;

        if (!tweetResult) {
          // Could be a module with items (e.g. pinned tweets)
          const items = entry?.content?.items;
          if (Array.isArray(items)) {
            for (const item of items) {
              const nestedTweet =
                item?.item?.itemContent?.tweet_results?.result ||
                item?.item?.itemContent?.tweet_results?.result?.tweet;
              if (nestedTweet) {
                const post = parseSingleGraphQLTweet(nestedTweet);
                if (post) posts.push(post);
              }
            }
          }
          continue;
        }

        const post = parseSingleGraphQLTweet(tweetResult);
        if (post) posts.push(post);
      }
    }
  } catch (e) {
    console.log(`[twitter] Error extracting GraphQL tweets: ${e}`);
  }

  return posts.slice(0, 20);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseSingleGraphQLTweet(result: any): SocialPost | null {
  try {
    // Handle "TweetWithVisibilityResults" wrapper
    const tweet = result?.tweet || result;
    const legacy = tweet?.legacy;
    if (!legacy) return null;

    // Skip retweets — we want original tweets
    if (legacy.retweeted_status_result) return null;

    // Extract media
    const media = legacy.extended_entities?.media || legacy.entities?.media || [];
    const firstMedia = media[0];
    const imageUrl =
      firstMedia?.media_url_https ||
      firstMedia?.media_url ||
      "";
    const hasVideo = media.some(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (m: any) => m.type === "video" || m.type === "animated_gif",
    );

    return {
      id: legacy.id_str || tweet.rest_id || "",
      imageUrl,
      caption: legacy.full_text || "",
      likesCount: legacy.favorite_count ?? 0,
      commentsCount: legacy.reply_count ?? 0,
      timestamp: legacy.created_at || "",
      isVideo: hasVideo,
    };
  } catch {
    return null;
  }
}

/* ─── Method 3: FxTwitter ─── */

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
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
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

    console.log(`[twitter] FxTwitter → followers=${user.followers}`);

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
 * Key strategy: Extract tweet IDs from syndication HTML, then fetch each
 * tweet individually via FxTwitter's reliable status endpoint.
 * FxTwitter returns structured JSON with full engagement metrics.
 */
async function fetchTweetsViaFxHydration(username: string): Promise<SocialPost[]> {
  // Step 1: Get tweet IDs from syndication HTML
  const tweetIds = await extractTweetIdsFromSyndication(username);
  if (tweetIds.length === 0) {
    console.log(`[twitter] No tweet IDs found in syndication for @${username}`);
    return [];
  }

  console.log(`[twitter] Found ${tweetIds.length} tweet IDs, hydrating via FxTwitter...`);

  // Step 2: Fetch each tweet via FxTwitter status API (parallel, max 10)
  const posts: SocialPost[] = [];
  const idsToFetch = tweetIds.slice(0, 10);

  const results = await Promise.allSettled(
    idsToFetch.map((id) => fetchSingleTweetFx(username, id)),
  );

  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      posts.push(result.value);
    }
  }

  if (posts.length > 0) {
    console.log(`[twitter] Hydrated ${posts.length}/${idsToFetch.length} tweets via FxTwitter`);
  }

  return posts;
}

async function fetchSingleTweetFx(username: string, tweetId: string): Promise<SocialPost | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);

    const res = await fetch(
      `https://api.fxtwitter.com/${encodeURIComponent(username)}/status/${tweetId}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; GoVirall/1.0)",
          Accept: "application/json",
        },
        signal: controller.signal,
      },
    );
    clearTimeout(timer);

    if (!res.ok) return null;

    const json = await res.json();
    const tweet = json?.tweet;
    if (!tweet) return null;

    // Extract first media image
    const firstPhoto = tweet.media?.photos?.[0];
    const firstVideo = tweet.media?.videos?.[0];
    const imageUrl = firstPhoto?.url || firstVideo?.thumbnail_url || "";
    const hasVideo = (tweet.media?.videos?.length ?? 0) > 0;

    return {
      id: tweet.id || tweetId,
      imageUrl,
      caption: tweet.text || "",
      likesCount: tweet.likes ?? 0,
      commentsCount: tweet.replies ?? 0,
      timestamp: tweet.created_at || "",
      isVideo: hasVideo,
    };
  } catch {
    return null;
  }
}

/**
 * Extract tweet IDs from syndication HTML using multiple patterns.
 * We only need the IDs — full data will be fetched via FxTwitter.
 */
async function extractTweetIdsFromSyndication(username: string): Promise<string[]> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 2000));
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const res = await fetch(
        `https://syndication.twitter.com/srv/timeline-profile/screen-name/${encodeURIComponent(username)}`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            Referer: "https://publish.twitter.com/",
          },
          signal: controller.signal,
        },
      );
      clearTimeout(timer);

      if (res.status === 429) {
        console.log(`[twitter] Syndication 429 rate limited (attempt ${attempt})`);
        continue;
      }

      if (!res.ok) {
        console.log(`[twitter] Syndication returned ${res.status}`);
        return [];
      }

      const html = await res.text();
      if (html.length < 100) return [];

      const ids = new Set<string>();

      // Pattern 1: data-tweet-id attribute
      const dataTweetId = /data-tweet-id="(\d+)"/g;
      let m;
      while ((m = dataTweetId.exec(html)) !== null) ids.add(m[1]);

      // Pattern 2: /status/{id} links in the HTML
      const statusLinks = new RegExp(`/${username}/status/(\\d+)`, "gi");
      while ((m = statusLinks.exec(html)) !== null) ids.add(m[1]);

      // Pattern 3: Generic /status/ links
      const genericStatus = /\/status\/(\d{15,25})/g;
      while ((m = genericStatus.exec(html)) !== null) ids.add(m[1]);

      // Pattern 4: "id_str":"..." in embedded JSON
      const idStr = /"id_str"\s*:\s*"(\d+)"/g;
      while ((m = idStr.exec(html)) !== null) ids.add(m[1]);

      // Pattern 5: __NEXT_DATA__ or similar JSON payloads
      const nextDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (nextDataMatch) {
        try {
          const nd = JSON.parse(nextDataMatch[1]);
          extractIdsFromObject(nd, ids);
        } catch { /* ignore */ }
      }

      // Pattern 6: Any script containing tweet-like data
      const scriptJsonPattern = /<script[^>]*>([\s\S]*?)<\/script>/g;
      while ((m = scriptJsonPattern.exec(html)) !== null) {
        const content = m[1];
        if (content.includes('"id_str"') || content.includes('"tweet_id"')) {
          const innerIds = /["'](?:id_str|tweet_id)["']\s*:\s*["'](\d{15,25})["']/g;
          let innerM;
          while ((innerM = innerIds.exec(content)) !== null) ids.add(innerM[1]);
        }
      }

      if (ids.size > 0) {
        console.log(`[twitter] Syndication → extracted ${ids.size} tweet IDs`);
        return Array.from(ids);
      }

      // If no IDs found, try parsing tweets directly as fallback
      console.log(`[twitter] Syndication → no tweet IDs found in ${html.length} chars of HTML`);
    } catch {
      // continue to next attempt
    }
  }
  return [];
}

/**
 * Recursively search a JSON object for tweet IDs.
 */
function extractIdsFromObject(obj: unknown, ids: Set<string>): void {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    for (const item of obj) extractIdsFromObject(item, ids);
    return;
  }
  const record = obj as Record<string, unknown>;
  if (typeof record.id_str === "string" && /^\d{15,25}$/.test(record.id_str)) {
    ids.add(record.id_str);
  }
  if (typeof record.id === "string" && /^\d{15,25}$/.test(record.id)) {
    ids.add(record.id);
  }
  for (const value of Object.values(record)) {
    extractIdsFromObject(value, ids);
  }
}

/* ─── Syndication direct parsing (fallback) ─── */

async function extractTweetsFromSyndication(username: string): Promise<SocialPost[]> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 3000));
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const res = await fetch(
        `https://syndication.twitter.com/srv/timeline-profile/screen-name/${encodeURIComponent(username)}`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            Referer: "https://publish.twitter.com/",
          },
          signal: controller.signal,
        },
      );
      clearTimeout(timer);

      if (res.status === 429) continue;
      if (!res.ok) return [];

      const html = await res.text();
      if (html.length < 100) return [];

      const tweets = parseTweetsFromHtml(html);
      if (tweets.length > 0) return tweets;
    } catch {
      // continue
    }
  }
  return [];
}

function parseTweetsFromHtml(html: string): SocialPost[] {
  const posts: SocialPost[] = [];

  // Strategy 1: data-tweet-id blocks
  const tweetIdPattern = /data-tweet-id="(\d+)"/g;
  const tweetIds: string[] = [];
  let idMatch;
  while ((idMatch = tweetIdPattern.exec(html)) !== null) {
    tweetIds.push(idMatch[1]);
  }

  if (tweetIds.length > 0) {
    for (const id of tweetIds.slice(0, 12)) {
      const blockStart = html.indexOf(`data-tweet-id="${id}"`);
      if (blockStart === -1) continue;

      const nextTweetStart = html.indexOf("data-tweet-id=", blockStart + 20);
      const block = nextTweetStart > -1
        ? html.slice(blockStart, nextTweetStart)
        : html.slice(blockStart, blockStart + 3000);

      const textMatch = block.match(/<p[^>]*(?:Tweet-text|tweet-text|e-entry-title|dir="ltr")[^>]*>([\s\S]*?)<\/p>/i);
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

  // Strategy 2: Embedded JSON (React hydration data)
  if (posts.length === 0) {
    // Try multiple JSON patterns
    const jsonPatterns = [
      /<script[^>]*>\s*window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?})\s*;?\s*<\/script>/,
      /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
    ];

    for (const pattern of jsonPatterns) {
      const scriptMatch = html.match(pattern);
      if (!scriptMatch) continue;
      try {
        const data = JSON.parse(scriptMatch[1]);
        const entries = findTweetArray(data);
        if (entries && entries.length > 0) {
          for (const entry of entries.slice(0, 12)) {
            posts.push({
              id: String(entry.id_str || entry.id || posts.length),
              imageUrl: "",
              caption: String(entry.full_text || entry.text || ""),
              likesCount: entry.favorite_count ?? entry.likes ?? 0,
              commentsCount: entry.reply_count ?? entry.replies ?? 0,
              timestamp: entry.created_at || "",
              isVideo: false,
            });
          }
          break;
        }
      } catch {
        // JSON parse failed
      }
    }
  }

  // Strategy 3: Generic article extraction
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findTweetArray(obj: any): any[] | null {
  if (!obj || typeof obj !== "object") return null;
  // Check known paths
  const paths = [
    obj?.entries,
    obj?.tweets,
    obj?.props?.pageProps?.timeline?.entries,
    obj?.props?.pageProps?.tweets,
  ];
  for (const arr of paths) {
    if (Array.isArray(arr) && arr.length > 0) return arr;
  }
  // Recursive search for any array with tweet-like objects
  for (const value of Object.values(obj)) {
    if (Array.isArray(value) && value.length > 0 && value[0]?.id_str) return value;
    if (typeof value === "object") {
      const found = findTweetArray(value);
      if (found) return found;
    }
  }
  return null;
}

/* ─── Method 3: Syndication profile ─── */

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
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
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

    const recentPosts = parseTweetsFromHtml(html);

    console.log(`[twitter] Syndication → followers=${followersMatch[1]}, tweets=${recentPosts.length}`);

    return {
      handle: username,
      displayName: username,
      bio: "",
      avatarUrl: "",
      followersCount: parseFormattedNumber(followersMatch[1]),
      followingCount: followingMatch ? parseFormattedNumber(followingMatch[1]) : 0,
      postsCount: 0,
      verified: false,
      recentPosts,
    };
  } catch {
    return null;
  }
}

/* ─── Utils ─── */

function parseFormattedNumber(str: string): number {
  const clean = str.replace(/,/g, "").trim();
  const match = clean.match(/^([\d.]+)\s*([KMB])?$/i);
  if (match) {
    const num = parseFloat(match[1]);
    const multipliers: Record<string, number> = { K: 1_000, M: 1_000_000, B: 1_000_000_000 };
    const mult = match[2] ? multipliers[match[2].toUpperCase()] || 1 : 1;
    return Math.round(num * mult);
  }
  return parseInt(clean) || 0;
}
