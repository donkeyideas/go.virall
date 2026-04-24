import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@govirall/db/admin';
import { OAUTH_CONFIGS } from '@govirall/core';

/**
 * GET /api/platforms/callback?code=...&state=...
 * Handles the OAuth callback, exchanges code for token, saves the platform account.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const stateParam = req.nextUrl.searchParams.get('state');
  const errorParam = req.nextUrl.searchParams.get('error');

  const settingsUrl = new URL('/settings', req.url);
  settingsUrl.hash = 'platforms';

  // Handle OAuth errors
  if (errorParam) {
    settingsUrl.searchParams.set('error', `OAuth denied: ${errorParam}`);
    return NextResponse.redirect(settingsUrl);
  }

  if (!code || !stateParam) {
    settingsUrl.searchParams.set('error', 'Missing authorization code.');
    return NextResponse.redirect(settingsUrl);
  }

  // Decode state
  let state: { userId: string; platform: string; ts: number };
  try {
    state = JSON.parse(Buffer.from(stateParam, 'base64url').toString());
  } catch {
    settingsUrl.searchParams.set('error', 'Invalid state parameter.');
    return NextResponse.redirect(settingsUrl);
  }

  // Validate state age (10 min max)
  if (Date.now() - state.ts > 10 * 60 * 1000) {
    settingsUrl.searchParams.set('error', 'Authorization expired. Please try again.');
    return NextResponse.redirect(settingsUrl);
  }

  const config = OAUTH_CONFIGS[state.platform];
  if (!config) {
    settingsUrl.searchParams.set('error', 'Unknown platform.');
    return NextResponse.redirect(settingsUrl);
  }

  const clientId = process.env[config.clientIdEnv];
  const clientSecret = process.env[config.clientSecretEnv];
  if (!clientId || !clientSecret) {
    settingsUrl.searchParams.set('error', 'Platform API keys not configured.');
    return NextResponse.redirect(settingsUrl);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const redirectUri = `${appUrl}/api/platforms/callback`;

  try {
    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(config, code, clientId, clientSecret, redirectUri, stateParam);

    // Fetch user profile from platform
    const profile = await fetchPlatformProfile(config, tokenData.access_token, clientId);

    // Upsert platform account in DB
    const admin = createAdminClient();
    const { error: dbError } = await admin
      .from('platform_accounts')
      .upsert(
        {
          user_id: state.userId,
          platform: state.platform,
          platform_user_id: profile.id,
          platform_username: profile.username,
          platform_display_name: profile.displayName,
          avatar_url: profile.avatarUrl,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token ?? null,
          token_expires_at: tokenData.expires_in
            ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
            : null,
          scopes: config.scopes,
          follower_count: profile.followerCount ?? null,
          sync_status: 'healthy',
          connected_at: new Date().toISOString(),
          disconnected_at: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,platform' },
      );

    if (dbError) {
      settingsUrl.searchParams.set('error', `Failed to save: ${dbError.message}`);
      return NextResponse.redirect(settingsUrl);
    }

    settingsUrl.searchParams.set('connected', state.platform);
    return NextResponse.redirect(settingsUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token exchange failed.';
    settingsUrl.searchParams.set('error', message);
    return NextResponse.redirect(settingsUrl);
  }
}

/* ── Token exchange ────────────────────────────────── */

async function exchangeCodeForToken(
  config: (typeof OAUTH_CONFIGS)[string],
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  state: string,
): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
  const body: Record<string, string> = {
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  };

  // Platform-specific token request differences
  if (config.platform === 'tiktok') {
    body.client_key = clientId;
    body.client_secret = clientSecret;
  } else if (config.platform === 'x') {
    body.client_id = clientId;
    body.code_verifier = state; // PKCE plain
  } else {
    body.client_id = clientId;
    body.client_secret = clientSecret;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  // X uses Basic auth
  if (config.platform === 'x') {
    headers['Authorization'] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
  }

  // Twitch requires client_id header
  if (config.platform === 'twitch') {
    headers['Client-Id'] = clientId;
  }

  const res = await fetch(config.tokenUrl, {
    method: 'POST',
    headers,
    body: new URLSearchParams(body).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }

  const data = await res.json();

  // TikTok nests under data
  if (config.platform === 'tiktok' && data.data) {
    return {
      access_token: data.data.access_token,
      refresh_token: data.data.refresh_token,
      expires_in: data.data.expires_in,
    };
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  };
}

/* ── Profile fetch ─────────────────────────────────── */

type PlatformProfile = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  followerCount: number | null;
};

async function fetchPlatformProfile(
  config: (typeof OAUTH_CONFIGS)[string],
  accessToken: string,
  clientId: string,
): Promise<PlatformProfile> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };

  // Twitch requires Client-Id header
  if (config.platform === 'twitch') {
    headers['Client-Id'] = clientId;
  }

  const res = await fetch(config.profileUrl, { headers });
  if (!res.ok) {
    throw new Error(`Profile fetch failed (${res.status})`);
  }
  const data = await res.json();

  // Normalize per-platform response shapes
  switch (config.platform) {
    case 'instagram': {
      return {
        id: data.id,
        username: data.username ?? data.name ?? 'unknown',
        displayName: data.name ?? null,
        avatarUrl: data.profile_picture_url ?? null,
        followerCount: data.followers_count ?? null,
      };
    }
    case 'tiktok': {
      const user = data.data?.user ?? {};
      return {
        id: user.open_id ?? user.union_id ?? 'unknown',
        username: user.display_name ?? 'unknown',
        displayName: user.display_name ?? null,
        avatarUrl: user.avatar_url ?? null,
        followerCount: user.follower_count ?? null,
      };
    }
    case 'youtube': {
      const channel = data.items?.[0];
      return {
        id: channel?.id ?? 'unknown',
        username: channel?.snippet?.title ?? 'unknown',
        displayName: channel?.snippet?.title ?? null,
        avatarUrl: channel?.snippet?.thumbnails?.default?.url ?? null,
        followerCount: parseInt(channel?.statistics?.subscriberCount ?? '0', 10) || null,
      };
    }
    case 'linkedin': {
      return {
        id: data.sub ?? data.id ?? 'unknown',
        username: data.name ?? data.email ?? 'unknown',
        displayName: data.name ?? null,
        avatarUrl: data.picture ?? null,
        followerCount: null,
      };
    }
    case 'x': {
      const user = data.data ?? data;
      return {
        id: user.id ?? 'unknown',
        username: user.username ?? 'unknown',
        displayName: user.name ?? null,
        avatarUrl: user.profile_image_url ?? null,
        followerCount: user.public_metrics?.followers_count ?? null,
      };
    }
    case 'facebook': {
      return {
        id: data.id ?? 'unknown',
        username: data.name ?? 'unknown',
        displayName: data.name ?? null,
        avatarUrl: data.picture?.data?.url ?? null,
        followerCount: null,
      };
    }
    case 'twitch': {
      const user = data.data?.[0] ?? {};
      return {
        id: user.id ?? 'unknown',
        username: user.login ?? user.display_name ?? 'unknown',
        displayName: user.display_name ?? null,
        avatarUrl: user.profile_image_url ?? null,
        followerCount: null,
      };
    }
    default: {
      return {
        id: data.id ?? 'unknown',
        username: data.username ?? data.name ?? 'unknown',
        displayName: data.name ?? null,
        avatarUrl: null,
        followerCount: null,
      };
    }
  }
}
