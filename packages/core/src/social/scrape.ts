/**
 * Unified social profile scraper dispatcher.
 * Scrapes public profile data by username — no OAuth required.
 */

export interface ScrapedPost {
  id: string;
  imageUrl: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  timestamp: string;
  isVideo: boolean;
}

export interface ScrapedProfile {
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  verified: boolean;
  recentPosts: ScrapedPost[];
  platformData?: Record<string, unknown>;
}

/**
 * Scrape a public social profile by platform + username.
 * Returns null if the profile can't be found or scraped.
 */
export async function scrapeProfile(
  platform: string,
  handle: string,
): Promise<ScrapedProfile | null> {
  const clean = extractHandle(handle, platform);
  if (!clean) return null;

  try {
    switch (platform) {
      case 'instagram': {
        const { scrapeInstagramProfile } = await import('./scrapers/instagram');
        return await scrapeInstagramProfile(clean);
      }
      case 'tiktok': {
        const { scrapeTikTokProfile } = await import('./scrapers/tiktok');
        const d = await scrapeTikTokProfile(clean);
        if (!d) return null;
        return { ...d, platformData: { hearts: d.hearts } };
      }
      case 'youtube': {
        const { scrapeYouTubeProfile } = await import('./scrapers/youtube');
        const d = await scrapeYouTubeProfile(clean);
        if (!d) return null;
        return { ...d, platformData: { totalViews: d.totalViews, channelId: d.channelId } };
      }
      case 'x': {
        const { scrapeTwitterProfile } = await import('./scrapers/twitter');
        return await scrapeTwitterProfile(clean);
      }
      case 'linkedin': {
        const { scrapeLinkedInProfile } = await import('./scrapers/linkedin');
        const d = await scrapeLinkedInProfile(clean);
        if (!d) return null;
        return { ...d, platformData: { profileType: d.profileType, jobTitle: d.jobTitle } };
      }
      case 'facebook': {
        const { scrapeFacebookProfile } = await import('./scrapers/facebook');
        return await scrapeFacebookProfile(clean);
      }
      case 'twitch': {
        const { scrapeTwitchProfile } = await import('./scrapers/twitch');
        const d = await scrapeTwitchProfile(clean);
        if (!d) return null;
        return { ...d, platformData: { isLive: d.isLive, totalViews: d.totalViews } };
      }
      default:
        return null;
    }
  } catch (err) {
    console.error(`[scrapeProfile] ${platform}/@${clean} failed:`, err);
    return null;
  }
}

/**
 * Calculate engagement rate from scraped posts.
 */
export function calcEngagement(posts: ScrapedPost[], followers: number) {
  if (!posts.length || !followers || followers <= 0) {
    return { engagementRate: null, avgLikes: null, avgComments: null };
  }
  const totalLikes = posts.reduce((s, p) => s + (p.likesCount || 0), 0);
  const totalComments = posts.reduce((s, p) => s + (p.commentsCount || 0), 0);
  const avgLikes = Math.round(totalLikes / posts.length);
  const avgComments = Math.round(totalComments / posts.length);
  const engagementRate =
    Math.round(((avgLikes + avgComments) / followers) * 100 * 100) / 100;
  return { engagementRate, avgLikes, avgComments };
}

/**
 * Extract a clean handle from a URL or raw input.
 * "https://www.instagram.com/hbomax/?hl=en" → "hbomax"
 * "@hbomax" → "hbomax"
 */
export function extractHandle(raw: string, _platform?: string): string {
  const trimmed = raw.trim().replace(/^@/, '');
  if (!trimmed) return '';

  try {
    const url = new URL(
      trimmed.startsWith('http') ? trimmed : `https://${trimmed}`,
    );
    const hostPatterns: Record<string, RegExp> = {
      instagram: /instagram\.com/,
      tiktok: /tiktok\.com/,
      youtube: /youtube\.com|youtu\.be/,
      x: /twitter\.com|x\.com/,
      linkedin: /linkedin\.com/,
      facebook: /facebook\.com|fb\.com/,
      twitch: /twitch\.tv/,
    };
    const matchesPlatform = Object.values(hostPatterns).some((r) =>
      r.test(url.hostname),
    );
    if (matchesPlatform) {
      const segments = url.pathname.split('/').filter(Boolean);
      const skipPrefixes = ['in', 'channel', 'c', 'user', 'pin', 'videos', 'company'];
      const handleSegment = segments.find(
        (s) => !skipPrefixes.includes(s.toLowerCase()),
      );
      if (handleSegment) return handleSegment.replace(/^@/, '');
    }
  } catch {
    // Not a URL — use as-is
  }
  return trimmed;
}
