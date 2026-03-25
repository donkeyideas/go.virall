/**
 * Pinterest Public Profile Scraper
 *
 * Scrapes public Pinterest profile page for meta tags and embedded JSON.
 * No API key required.
 */

export interface PinterestProfileData {
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  verified: boolean;
}

const FETCH_TIMEOUT_MS = 15_000;

export async function scrapePinterestProfile(
  handle: string,
): Promise<PinterestProfileData | null> {
  const cleanHandle = handle.replace(/^@/, "").trim();
  if (!cleanHandle) return null;

  console.log(`[pinterest] Scraping profile for ${cleanHandle}...`);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(
      `https://www.pinterest.com/${encodeURIComponent(cleanHandle)}/`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: controller.signal,
        redirect: "follow",
      },
    );
    clearTimeout(timer);

    if (!res.ok) {
      console.log(`[pinterest] Returned ${res.status} for ${cleanHandle}`);
      return null;
    }

    const html = await res.text();

    // Try to extract __NEXT_DATA__ or initial state JSON
    const nextDataMatch = html.match(
      /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i,
    );

    if (nextDataMatch) {
      try {
        const data = JSON.parse(nextDataMatch[1]);
        const userData =
          data?.props?.pageProps?.userData ||
          data?.props?.initialReduxState?.users;

        if (userData) {
          // Pinterest stores user data in different structures
          const user =
            typeof userData === "object" && !Array.isArray(userData)
              ? Object.values(userData)[0] as Record<string, unknown>
              : userData;

          if (user && typeof user === "object") {
            const profile: PinterestProfileData = {
              handle: cleanHandle,
              displayName:
                String(
                  (user as Record<string, unknown>).full_name ||
                    (user as Record<string, unknown>).username ||
                    cleanHandle,
                ),
              bio: String((user as Record<string, unknown>).about || ""),
              avatarUrl: String(
                (user as Record<string, unknown>).image_xlarge_url ||
                  (user as Record<string, unknown>).image_large_url ||
                  "",
              ),
              followersCount:
                Number((user as Record<string, unknown>).follower_count) || 0,
              followingCount:
                Number((user as Record<string, unknown>).following_count) || 0,
              postsCount:
                Number((user as Record<string, unknown>).pin_count) || 0,
              verified:
                Boolean((user as Record<string, unknown>).is_verified) || false,
            };

            console.log(
              `[pinterest] __NEXT_DATA__ → followers=${profile.followersCount}, pins=${profile.postsCount}`,
            );
            return profile;
          }
        }
      } catch {
        // JSON parse failed
      }
    }

    // Fallback: embedded JSON in script tags
    const scriptMatch = html.match(
      /<script[^>]*data-relay-response="true"[^>]*>([\s\S]*?)<\/script>/,
    );

    if (scriptMatch) {
      try {
        const data = JSON.parse(scriptMatch[1]);
        const user =
          data?.response?.data?.userV2 || data?.response?.data?.user;

        if (user) {
          const profile: PinterestProfileData = {
            handle: cleanHandle,
            displayName: user.fullName || user.username || cleanHandle,
            bio: user.about || user.websiteUrl || "",
            avatarUrl: user.imageLargeUrl || "",
            followersCount: user.followerCount ?? 0,
            followingCount: user.followingCount ?? 0,
            postsCount: user.pinCount ?? 0,
            verified: user.isVerifiedMerchant ?? false,
          };

          console.log(
            `[pinterest] Relay → followers=${profile.followersCount}`,
          );
          return profile;
        }
      } catch {
        // JSON parse failed
      }
    }

    // Fallback: meta tags
    const ogDesc = extractMeta(html, "og:description");
    const ogTitle = extractMeta(html, "og:title");
    const ogImage = extractMeta(html, "og:image");

    // Pinterest description: "See what Name (username) has discovered..."
    // or profile-specific with follower counts
    const followersMatch =
      ogDesc.match(/([\d,.]+[KMB]?)\s*(?:followers|Followers)/i) ||
      html.match(/([\d,.]+[KMB]?)\s*(?:followers|Followers)/i);
    const pinsMatch =
      ogDesc.match(/([\d,.]+[KMB]?)\s*(?:pins|Pins)/i) ||
      html.match(/([\d,.]+[KMB]?)\s*(?:pins|Pins)/i);

    const displayName = ogTitle
      ? ogTitle.replace(/\s*\(.*?\).*$/, "").replace(/\s*[|–-]\s*Pinterest.*$/i, "").trim()
      : cleanHandle;

    if (followersMatch || displayName !== cleanHandle) {
      const profile: PinterestProfileData = {
        handle: cleanHandle,
        displayName,
        bio: "",
        avatarUrl: ogImage || "",
        followersCount: followersMatch
          ? parseCount(followersMatch[1])
          : 0,
        followingCount: 0,
        postsCount: pinsMatch ? parseCount(pinsMatch[1]) : 0,
        verified: false,
      };

      console.log(
        `[pinterest] Meta → followers=${profile.followersCount}`,
      );
      return profile;
    }

    console.log(
      `[pinterest] No data for ${cleanHandle}`,
    );
    return null;
  } catch (err) {
    console.log(`[pinterest] Scrape failed for ${cleanHandle}:`, err);
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
