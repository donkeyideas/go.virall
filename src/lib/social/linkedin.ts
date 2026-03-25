/**
 * LinkedIn Public Profile Scraper
 *
 * Scrapes public profile page for JSON-LD structured data.
 * No API key required. Uses bot UA to get rich JSON-LD data.
 *
 * LinkedIn serves JSON-LD in a @graph array format with:
 *   - Person / Organization type with interactionStatistic (followers)
 *   - Article / DiscussionForumPosting entries (recent posts)
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

export interface LinkedInProfileData {
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  verified: boolean;
  profileType?: "personal" | "company";
  jobTitle?: string;
  recentPosts: SocialPost[];
}

const FETCH_TIMEOUT_MS = 15_000;

export async function scrapeLinkedInProfile(
  handle: string,
): Promise<LinkedInProfileData | null> {
  const cleanHandle = handle.replace(/^@/, "").trim();
  if (!cleanHandle) return null;

  // Detect if explicitly a company
  const isExplicitCompany =
    cleanHandle.includes("/company/") ||
    handle.toLowerCase().includes("company");

  // Build URL list to try (company pages are common, so try both)
  const slug = encodeURIComponent(
    cleanHandle.replace(/.*company\//, "").replace(/\/.*/, ""),
  );
  const urlsToTry = isExplicitCompany
    ? [`https://www.linkedin.com/company/${slug}/`]
    : [
        `https://www.linkedin.com/in/${slug}/`,
        `https://www.linkedin.com/company/${slug}/`,
      ];

  for (const profileUrl of urlsToTry) {
    console.log(`[linkedin] Trying ${profileUrl}...`);
    const result = await fetchLinkedInPage(profileUrl, cleanHandle);
    if (result && (result.followersCount > 0 || result.displayName !== cleanHandle)) {
      return result;
    }
  }

  console.log(`[linkedin] All URLs failed for ${cleanHandle}`);
  return null;
}

async function fetchLinkedInPage(
  profileUrl: string,
  cleanHandle: string,
): Promise<LinkedInProfileData | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(profileUrl, {
      headers: {
        "User-Agent": "facebookexternalhit/1.1",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);

    if (!res.ok) return null;

    const html = await res.text();

    // Strategy 1: JSON-LD @graph format (rich data)
    const jsonLdMatch = html.match(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/,
    );

    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        const graph = jsonLd["@graph"] || (Array.isArray(jsonLd) ? jsonLd : [jsonLd]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const personEntity = graph.find((e: any) =>
          e["@type"] === "Person" ||
          e["@type"] === "Organization" ||
          e["@type"] === "Corporation",
        );

        if (personEntity) {
          let followersCount = 0;
          const stats = personEntity.interactionStatistic;
          if (stats) {
            const statArray = Array.isArray(stats) ? stats : [stats];
            for (const stat of statArray) {
              if (
                stat.interactionType?.includes("FollowAction") ||
                stat.name === "Follows"
              ) {
                followersCount = stat.userInteractionCount ?? 0;
              }
            }
          }

          if (followersCount === 0) {
            const htmlFollowers = html.match(/(\d[\d,]*)\s*(?:followers|connections|seguidores)/i);
            if (htmlFollowers) followersCount = parseCount(htmlFollowers[1]);
          }

          const avatarUrl =
            personEntity.image?.contentUrl ||
            personEntity.image?.url ||
            personEntity.logo?.contentUrl ||
            personEntity.logo?.url ||
            "";

          const recentPosts: SocialPost[] = [];
          for (const entry of graph) {
            const entryType = entry["@type"];
            if (entryType === "Article" || entryType === "DiscussionForumPosting") {
              recentPosts.push({
                id: entry.url || String(recentPosts.length),
                imageUrl: entry.image?.url || "",
                caption: entry.headline || entry.text?.slice(0, 200) || "",
                likesCount: entry.interactionStatistic?.userInteractionCount ?? 0,
                commentsCount: 0,
                timestamp: entry.datePublished || "",
                isVideo: false,
              });
            }
          }

          const isCompanyEntity =
            personEntity["@type"] === "Organization" ||
            personEntity["@type"] === "Corporation";

          const profile: LinkedInProfileData = {
            handle: cleanHandle,
            displayName: decodeEntities(personEntity.name || cleanHandle),
            bio: decodeEntities(
              personEntity.description ||
              (Array.isArray(personEntity.jobTitle)
                ? personEntity.jobTitle.join(", ")
                : personEntity.jobTitle || ""),
            ),
            avatarUrl,
            followersCount,
            followingCount: 0,
            postsCount: recentPosts.length,
            verified: false,
            profileType: isCompanyEntity ? "company" : "personal",
            jobTitle: Array.isArray(personEntity.jobTitle)
              ? personEntity.jobTitle[0]
              : personEntity.jobTitle,
            recentPosts: recentPosts.slice(0, 12),
          };

          // If no posts from JSON-LD, try to extract from HTML
          if (recentPosts.length === 0) {
            const htmlPosts = extractPostsFromHtml(html);
            if (htmlPosts.length > 0) {
              profile.recentPosts = htmlPosts.slice(0, 12);
              profile.postsCount = htmlPosts.length;
            }
          }

          console.log(
            `[linkedin] JSON-LD → ${profile.profileType}, followers=${profile.followersCount}, posts=${profile.recentPosts.length}`,
          );
          return profile;
        }
      } catch {
        // JSON-LD parse failed
      }
    }

    // Strategy 2: og: meta tags fallback
    const ogDesc = extractMeta(html, "og:description");
    const ogTitle = extractMeta(html, "og:title");
    const ogImage = extractMeta(html, "og:image");

    const followersHtml = html.match(
      /(\d[\d,]*)\s*(?:followers|connections)/i,
    );

    if (ogTitle && ogTitle.toLowerCase() !== "linkedin") {
      const name = ogTitle
        .replace(/\s*[|–-]\s*LinkedIn.*$/i, "")
        .trim();

      console.log(
        `[linkedin] Meta fallback → name="${name}", followers=${followersHtml?.[1] || 0}`,
      );

      return {
        handle: cleanHandle,
        displayName: decodeEntities(name || cleanHandle),
        bio: ogDesc || "",
        avatarUrl: ogImage || "",
        followersCount: followersHtml ? parseCount(followersHtml[1]) : 0,
        followingCount: 0,
        postsCount: 0,
        verified: false,
        recentPosts: [],
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Try to extract recent activity/posts from LinkedIn HTML.
 * LinkedIn HTML contains post previews in various formats depending on
 * whether it's a personal profile or company page.
 */
function extractPostsFromHtml(html: string): SocialPost[] {
  const posts: SocialPost[] = [];

  // Strategy 1: Look for "data-urn" post elements
  const urnPattern = /data-urn="urn:li:activity:(\d+)"/g;
  let urnMatch;
  while ((urnMatch = urnPattern.exec(html)) !== null && posts.length < 12) {
    const urn = urnMatch[1];
    const blockStart = urnMatch.index;
    const nextUrnStart = html.indexOf("data-urn=", blockStart + 20);
    const block = nextUrnStart > -1
      ? html.slice(blockStart, nextUrnStart)
      : html.slice(blockStart, blockStart + 2000);

    const textMatch = block.match(/<span[^>]*>([\s\S]{20,500}?)<\/span>/);
    const imgMatch = block.match(/<img[^>]*src="(https:\/\/media\.licdn\.com\/[^"]+)"/);

    posts.push({
      id: `activity-${urn}`,
      imageUrl: imgMatch ? imgMatch[1] : "",
      caption: textMatch
        ? decodeEntities(textMatch[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
        : "",
      likesCount: 0,
      commentsCount: 0,
      timestamp: "",
      isVideo: false,
    });
  }

  // Strategy 2: Look for share/update content in HTML comments or data attributes
  if (posts.length === 0) {
    const sharePattern = /<div[^>]*(?:feed-shared|update-components)[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
    let shareMatch;
    while ((shareMatch = sharePattern.exec(html)) !== null && posts.length < 12) {
      const block = shareMatch[1];
      const textMatch = block.match(/>([^<]{30,300})</);
      if (textMatch) {
        posts.push({
          id: String(posts.length),
          imageUrl: "",
          caption: decodeEntities(textMatch[1].trim()),
          likesCount: 0,
          commentsCount: 0,
          timestamp: "",
          isVideo: false,
        });
      }
    }
  }

  return posts;
}

function extractMeta(html: string, tag: string): string {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patternA = new RegExp(
    `<meta[^>]*(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["']`,
    "i",
  );
  const matchA = html.match(patternA);
  if (matchA) return decodeEntities(matchA[1]);

  const patternB = new RegExp(
    `<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["']`,
    "i",
  );
  const matchB = html.match(patternB);
  if (matchB) return decodeEntities(matchB[1]);

  return "";
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) =>
      String.fromCodePoint(parseInt(dec, 10)),
    )
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function parseCount(str: string): number {
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
