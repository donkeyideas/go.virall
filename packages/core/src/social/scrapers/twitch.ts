/**
 * Twitch Public Profile Scraper
 *
 * 1. Twitch GQL API (no auth, uses web client ID)
 * 2. Profile page meta tags fallback
 */

import type { ScrapedProfile } from '../scrape';

export interface TwitchProfile extends ScrapedProfile {
  isLive?: boolean;
  totalViews?: number;
}

const FETCH_TIMEOUT_MS = 15_000;
const TWITCH_CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko';

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

/* eslint-disable @typescript-eslint/no-explicit-any */
async function fetchViaGQL(login: string): Promise<TwitchProfile | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const body = JSON.stringify([{
      operationName: 'ChannelRoot_AboutPanel',
      variables: { channelLogin: login, skipSchedule: true },
      extensions: { persistedQuery: { version: 1, sha256Hash: '6089531acef6c09ece01b440c41978f4c8dc60cb4fa0571a4571571d55b0c367' } },
    }]);
    const res = await fetch('https://gql.twitch.tv/gql', {
      method: 'POST',
      headers: { 'Client-ID': TWITCH_CLIENT_ID, 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      body, signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const json = await res.json();
    const user = json?.[0]?.data?.user;
    if (!user) return null;

    return {
      handle: user.login || login, displayName: user.displayName || login,
      bio: user.description || '', avatarUrl: user.profileImageURL || '',
      followersCount: user.followers?.totalCount ?? 0, followingCount: 0,
      postsCount: 0, verified: user.roles?.isPartner ?? user.roles?.isAffiliate ?? false,
      isLive: user.stream !== null, totalViews: user.profileViewCount ?? 0,
      recentPosts: [],
    };
  } catch {
    // Fallback: simpler GQL query
    try {
      const body = JSON.stringify({ query: `query { user(login: "${login}") { id login displayName description profileImageURL(width: 300) followers { totalCount } roles { isPartner isAffiliate } stream { id } } }` });
      const res = await fetch('https://gql.twitch.tv/gql', {
        method: 'POST',
        headers: { 'Client-ID': TWITCH_CLIENT_ID, 'Content-Type': 'application/json' },
        body,
      });
      if (!res.ok) return null;
      const json = await res.json();
      const user = json?.data?.user;
      if (!user) return null;
      return {
        handle: user.login || login, displayName: user.displayName || login,
        bio: user.description || '', avatarUrl: user.profileImageURL || '',
        followersCount: user.followers?.totalCount ?? 0, followingCount: 0,
        postsCount: 0, verified: user.roles?.isPartner ?? user.roles?.isAffiliate ?? false,
        isLive: user.stream !== null, recentPosts: [],
      };
    } catch { return null; }
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

async function fetchViaPage(login: string): Promise<TwitchProfile | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(`https://www.twitch.tv/${encodeURIComponent(login)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' },
      signal: ctrl.signal, redirect: 'follow',
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const html = await res.text();

    const esc = (tag: string) => tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const meta = (tag: string) => {
      const m = html.match(new RegExp(`<meta[^>]*(?:property|name)=["']${esc(tag)}["'][^>]*content=["']([^"']*)["']`, 'i'));
      return m ? m[1] : '';
    };

    const ogTitle = meta('og:title');
    const ogDesc = meta('og:description');
    const ogImage = meta('og:image');
    if (!ogTitle && !ogDesc) return null;

    const displayName = ogTitle ? ogTitle.replace(/\s*[-–]\s*Twitch.*$/i, '').trim() : login;
    const fMatch = html.match(/([\d,.]+[KMB]?)\s*(?:followers|Followers)/i);

    return {
      handle: login, displayName, bio: ogDesc || '',
      avatarUrl: ogImage || '', followersCount: fMatch ? parseCount(fMatch[1]) : 0,
      followingCount: 0, postsCount: 0, verified: false, recentPosts: [],
    };
  } catch { return null; }
}

export async function scrapeTwitchProfile(handle: string): Promise<TwitchProfile | null> {
  const clean = handle.replace(/^@/, '').trim().toLowerCase();
  if (!clean) return null;

  const gql = await fetchViaGQL(clean);
  if (gql) return gql;
  return await fetchViaPage(clean);
}
