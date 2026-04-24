/**
 * Platform character limits and content format definitions.
 * Used by the content generator to enforce per-platform constraints.
 */

export const PLATFORM_CHAR_LIMITS: Record<
  string,
  { caption: number; bio: number; label: string }
> = {
  instagram: { caption: 2200, bio: 150, label: 'Instagram' },
  tiktok: { caption: 4000, bio: 80, label: 'TikTok' },
  youtube: { caption: 5000, bio: 1000, label: 'YouTube' },
  linkedin: { caption: 3000, bio: 2600, label: 'LinkedIn' },
  x: { caption: 280, bio: 160, label: 'X' },
  facebook: { caption: 63206, bio: 101, label: 'Facebook' },
  twitch: { caption: 300, bio: 300, label: 'Twitch' },
};

export const PLATFORM_CONTENT_FORMATS: Record<string, string[]> = {
  instagram: ['Reels', 'Carousels', 'Stories', 'Single Posts', 'Live'],
  tiktok: ['Short-form Video', 'Long-form Video (60s-3min)', 'Duets', 'Photo Carousels'],
  youtube: ['Shorts', 'Long-form Video', 'Live', 'Community Posts'],
  linkedin: ['Text Post', 'Article', 'Carousel (PDF)', 'Video', 'Newsletter'],
  x: ['Tweet', 'Thread', 'Video', 'Poll'],
  facebook: ['Reel', 'Story', 'Post', 'Live', 'Group Post'],
  twitch: ['Stream Title', 'Panel Description', 'Chat Command', 'Clip Title'],
};

export function getCharLimitNote(platform: string, type: 'caption' | 'bio'): string {
  const limits = PLATFORM_CHAR_LIMITS[platform];
  if (!limits) return '';
  const limit = type === 'bio' ? limits.bio : limits.caption;
  return `\nCHARACTER LIMIT: ${limits.label} allows a maximum of ${limit} characters per ${type}. You MUST keep each ${type} under ${limit} characters. Count carefully.`;
}

export function getContentFormats(platform: string): string[] {
  return PLATFORM_CONTENT_FORMATS[platform] ?? ['Post', 'Video', 'Story'];
}
