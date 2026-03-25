/**
 * Twitch Public Profile Scraper
 *
 * Strategy:
 *   1. Twitch GQL public API (no auth, uses client ID from web app)
 *   2. Profile page meta tags fallback
 *
 * No API key required — uses Twitch's web client ID.
 */

export interface TwitchProfileData {
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  verified: boolean;
  isLive?: boolean;
  totalViews?: number;
}

const FETCH_TIMEOUT_MS = 15_000;

// Twitch's public web client ID (used by the web player)
const TWITCH_CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";

export async function scrapeTwitchProfile(
  handle: string,
): Promise<TwitchProfileData | null> {
  const cleanHandle = handle.replace(/^@/, "").trim().toLowerCase();
  if (!cleanHandle) return null;

  console.log(`[twitch] Scraping profile for ${cleanHandle}...`);

  // Strategy 1: GQL API (most reliable)
  const gqlData = await fetchViaGQL(cleanHandle);
  if (gqlData) return gqlData;

  // Strategy 2: Profile page meta tags
  const pageData = await fetchViaPage(cleanHandle);
  if (pageData) return pageData;

  console.log(`[twitch] No data for ${cleanHandle}`);
  return null;
}

async function fetchViaGQL(
  login: string,
): Promise<TwitchProfileData | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const body = JSON.stringify([
      {
        operationName: "ChannelRoot_AboutPanel",
        variables: { channelLogin: login, skipSchedule: true },
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash:
              "6089531acef6c09ece01b440c41978f4c8dc60cb4fa0571a4571571d55b0c367",
          },
        },
      },
    ]);

    const res = await fetch("https://gql.twitch.tv/gql", {
      method: "POST",
      headers: {
        "Client-ID": TWITCH_CLIENT_ID,
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return null;

    const json = await res.json();
    const user = json?.[0]?.data?.user;
    if (!user) return null;

    const profile: TwitchProfileData = {
      handle: user.login || login,
      displayName: user.displayName || login,
      bio: user.description || "",
      avatarUrl: user.profileImageURL || "",
      followersCount: user.followers?.totalCount ?? 0,
      followingCount: 0,
      postsCount: 0,
      verified:
        user.roles?.isPartner ?? user.roles?.isAffiliate ?? false,
      isLive: user.stream !== null,
      totalViews: user.profileViewCount ?? 0,
    };

    console.log(
      `[twitch] GQL → followers=${profile.followersCount}, partner=${profile.verified}`,
    );
    return profile;
  } catch (err) {
    console.log(`[twitch] GQL failed:`, err);

    // Fallback: simpler GQL query
    return fetchViaSimpleGQL(login);
  }
}

async function fetchViaSimpleGQL(
  login: string,
): Promise<TwitchProfileData | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const body = JSON.stringify({
      query: `query {
        user(login: "${login}") {
          id
          login
          displayName
          description
          profileImageURL(width: 300)
          followers { totalCount }
          roles { isPartner isAffiliate }
          stream { id }
        }
      }`,
    });

    const res = await fetch("https://gql.twitch.tv/gql", {
      method: "POST",
      headers: {
        "Client-ID": TWITCH_CLIENT_ID,
        "Content-Type": "application/json",
      },
      body,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return null;

    const json = await res.json();
    const user = json?.data?.user;
    if (!user) return null;

    const profile: TwitchProfileData = {
      handle: user.login || login,
      displayName: user.displayName || login,
      bio: user.description || "",
      avatarUrl: user.profileImageURL || "",
      followersCount: user.followers?.totalCount ?? 0,
      followingCount: 0,
      postsCount: 0,
      verified:
        user.roles?.isPartner ?? user.roles?.isAffiliate ?? false,
      isLive: user.stream !== null,
    };

    console.log(
      `[twitch] Simple GQL → followers=${profile.followersCount}`,
    );
    return profile;
  } catch {
    return null;
  }
}

async function fetchViaPage(
  login: string,
): Promise<TwitchProfileData | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(`https://www.twitch.tv/${encodeURIComponent(login)}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);

    if (!res.ok) return null;

    const html = await res.text();

    const ogDesc = extractMeta(html, "og:description");
    const ogTitle = extractMeta(html, "og:title");
    const ogImage = extractMeta(html, "og:image");

    if (!ogTitle && !ogDesc) return null;

    // Twitch og:description: "Streamer description..."
    // og:title: "DisplayName - Twitch"
    const displayName = ogTitle
      ? ogTitle.replace(/\s*[-–]\s*Twitch.*$/i, "").trim()
      : login;

    // Try to find follower count in page
    const followersMatch = html.match(
      /([\d,.]+[KMB]?)\s*(?:followers|Followers)/i,
    );

    const profile: TwitchProfileData = {
      handle: login,
      displayName,
      bio: ogDesc || "",
      avatarUrl: ogImage || "",
      followersCount: followersMatch
        ? parseCount(followersMatch[1])
        : 0,
      followingCount: 0,
      postsCount: 0,
      verified: false,
    };

    console.log(
      `[twitch] Page → name="${displayName}", followers=${profile.followersCount}`,
    );
    return profile;
  } catch {
    return null;
  }
}

function extractMeta(html: string, tag: string): string {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<meta[^>]*(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["']`,
    "i",
  );
  const match = html.match(pattern);
  return match ? match[1] : "";
}

function parseCount(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.trim().replace(/,/g, "");
  const match = cleaned.match(/^([\d.]+)\s*([KMB])?$/i);
  if (match) {
    const value = parseFloat(match[1]);
    const multipliers: Record<string, number> = {
      K: 1_000,
      M: 1_000_000,
      B: 1_000_000_000,
    };
    const mult = match[2]
      ? multipliers[match[2].toUpperCase()] || 1
      : 1;
    return Math.round(value * mult);
  }
  return parseInt(cleaned) || 0;
}
