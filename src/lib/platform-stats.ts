/**
 * Platform-specific profile stat definitions.
 *
 * Each platform gets exactly 4 stats displayed in the profile header.
 * The config specifies where to read each value (top-level SocialProfile
 * field or nested platform_data JSONB) and how to format it.
 */

import type { SocialPlatform, SocialProfile } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlatformStatDef {
  /** Display label (e.g. "Subscribers", "Likes") */
  label: string;
  /** Lucide icon name */
  icon: string;
  /** Field key on SocialProfile (top-level) */
  profileKey?: keyof SocialProfile;
  /** Field key on platform_data JSONB (if value comes from there) */
  platformDataKey?: string;
  /** How to format the value */
  format: "compact" | "percent" | "boolean";
}

// ---------------------------------------------------------------------------
// Per-platform stat definitions
// ---------------------------------------------------------------------------

export const PLATFORM_STATS: Record<SocialPlatform, PlatformStatDef[]> = {
  instagram: [
    { label: "Posts", icon: "file-text", profileKey: "posts_count", format: "compact" },
    { label: "Followers", icon: "users", profileKey: "followers_count", format: "compact" },
    { label: "Following", icon: "user-plus", profileKey: "following_count", format: "compact" },
    { label: "Avg Likes", icon: "heart", profileKey: "_avg_likes" as keyof SocialProfile, format: "compact" },
  ],
  tiktok: [
    { label: "Following", icon: "user-plus", profileKey: "following_count", format: "compact" },
    { label: "Followers", icon: "users", profileKey: "followers_count", format: "compact" },
    { label: "Likes", icon: "heart", platformDataKey: "hearts", format: "compact" },
    { label: "Avg Likes", icon: "heart", profileKey: "_avg_likes" as keyof SocialProfile, format: "compact" },
  ],
  youtube: [
    { label: "Videos", icon: "play-circle", profileKey: "posts_count", format: "compact" },
    { label: "Subscribers", icon: "users", profileKey: "followers_count", format: "compact" },
    { label: "Total Views", icon: "eye", platformDataKey: "totalViews", format: "compact" },
    { label: "Avg Likes", icon: "heart", profileKey: "_avg_likes" as keyof SocialProfile, format: "compact" },
  ],
  twitter: [
    { label: "Posts", icon: "file-text", profileKey: "posts_count", format: "compact" },
    { label: "Followers", icon: "users", profileKey: "followers_count", format: "compact" },
    { label: "Following", icon: "user-plus", profileKey: "following_count", format: "compact" },
    { label: "Avg Likes", icon: "heart", profileKey: "_avg_likes" as keyof SocialProfile, format: "compact" },
  ],
  linkedin: [
    { label: "Posts", icon: "file-text", profileKey: "posts_count", format: "compact" },
    { label: "Connections", icon: "users", profileKey: "followers_count", format: "compact" },
    { label: "Following", icon: "user-plus", profileKey: "following_count", format: "compact" },
    { label: "Avg Likes", icon: "heart", profileKey: "_avg_likes" as keyof SocialProfile, format: "compact" },
  ],
  threads: [
    { label: "Replies", icon: "message-circle", profileKey: "posts_count", format: "compact" },
    { label: "Followers", icon: "users", profileKey: "followers_count", format: "compact" },
    { label: "Following", icon: "user-plus", profileKey: "following_count", format: "compact" },
    { label: "Avg Likes", icon: "heart", profileKey: "_avg_likes" as keyof SocialProfile, format: "compact" },
  ],
  pinterest: [
    { label: "Pins", icon: "pin", profileKey: "posts_count", format: "compact" },
    { label: "Followers", icon: "users", profileKey: "followers_count", format: "compact" },
    { label: "Monthly Views", icon: "eye", profileKey: "following_count", format: "compact" },
    { label: "Avg Likes", icon: "heart", profileKey: "_avg_likes" as keyof SocialProfile, format: "compact" },
  ],
  twitch: [
    { label: "Total Views", icon: "eye", platformDataKey: "totalViews", format: "compact" },
    { label: "Followers", icon: "users", profileKey: "followers_count", format: "compact" },
    { label: "Following", icon: "user-plus", profileKey: "following_count", format: "compact" },
    { label: "Live", icon: "radio", platformDataKey: "isLive", format: "boolean" },
  ],
};

// ---------------------------------------------------------------------------
// Helper: resolve stat values for a profile
// ---------------------------------------------------------------------------

export interface ResolvedStat {
  label: string;
  icon: string;
  value: string;
}

export function resolveStatsForProfile(
  profile: SocialProfile,
  formatCompact: (n: number) => string,
): ResolvedStat[] {
  const defs = PLATFORM_STATS[profile.platform] ?? PLATFORM_STATS.instagram;
  const pd = (profile.platform_data ?? {}) as Record<string, unknown>;

  return defs.map((def) => {
    // Resolve raw value
    let raw: unknown;
    if (def.profileKey === ("_avg_likes" as keyof SocialProfile)) {
      // Compute avg likes from recent_posts JSONB
      const posts = (profile as unknown as { recent_posts?: { likesCount?: number }[] }).recent_posts;
      if (posts?.length) {
        const total = posts.reduce((s, p) => s + (p.likesCount || 0), 0);
        raw = Math.round(total / posts.length);
      }
    } else if (def.platformDataKey) {
      raw = pd[def.platformDataKey];
    } else if (def.profileKey) {
      raw = profile[def.profileKey];
    }

    // Format
    let value: string;
    switch (def.format) {
      case "percent":
        value = typeof raw === "number" && raw > 0 ? `${raw}%` : "---";
        break;
      case "boolean":
        value = raw === true ? "Yes" : raw === false ? "No" : "---";
        break;
      case "compact":
      default:
        value =
          typeof raw === "number" && raw > 0 ? formatCompact(raw) : "---";
        break;
    }

    return { label: def.label, icon: def.icon, value };
  });
}
