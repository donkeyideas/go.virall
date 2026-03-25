/**
 * In-process cache for recent posts.
 *
 * Uses globalThis to persist across Next.js server renders in dev mode.
 * Also attempts to read/write from the `recent_posts` JSONB column in
 * social_profiles when available.
 */

interface CachedPost {
  id: string;
  imageUrl: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  timestamp: string;
  isVideo: boolean;
}

type PostsMap = Record<string, CachedPost[]>;

const g = globalThis as unknown as { __gv_posts_cache?: PostsMap };
if (!g.__gv_posts_cache) g.__gv_posts_cache = {};

export function getCachedPosts(profileId: string): CachedPost[] {
  return g.__gv_posts_cache![profileId] ?? [];
}

export function setCachedPosts(profileId: string, posts: CachedPost[]): void {
  g.__gv_posts_cache![profileId] = posts;
}

export function getAllCachedPosts(): PostsMap {
  return g.__gv_posts_cache!;
}
