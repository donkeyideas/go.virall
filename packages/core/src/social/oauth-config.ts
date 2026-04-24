/**
 * OAuth configuration for each social platform.
 * Env vars must be set in .env.local for each platform you want to enable.
 */

export type OAuthPlatformConfig = {
  platform: string;
  label: string;
  authUrl: string;
  tokenUrl: string;
  profileUrl: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  scopes: string[];
  /** Extra query params for the auth URL */
  extraParams?: Record<string, string>;
};

export const OAUTH_CONFIGS: Record<string, OAuthPlatformConfig> = {
  instagram: {
    platform: 'instagram',
    label: 'Instagram',
    authUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
    profileUrl: 'https://graph.instagram.com/v21.0/me',
    clientIdEnv: 'FACEBOOK_APP_ID',
    clientSecretEnv: 'FACEBOOK_APP_SECRET',
    scopes: ['instagram_basic', 'instagram_manage_insights', 'pages_show_list'],
  },
  tiktok: {
    platform: 'tiktok',
    label: 'TikTok',
    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    profileUrl: 'https://open.tiktokapis.com/v2/user/info/',
    clientIdEnv: 'TIKTOK_CLIENT_KEY',
    clientSecretEnv: 'TIKTOK_CLIENT_SECRET',
    scopes: ['user.info.basic', 'user.info.stats', 'video.list'],
    extraParams: { response_type: 'code' },
  },
  youtube: {
    platform: 'youtube',
    label: 'YouTube',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    profileUrl: 'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    scopes: ['https://www.googleapis.com/auth/youtube.readonly'],
    extraParams: { access_type: 'offline', prompt: 'consent' },
  },
  linkedin: {
    platform: 'linkedin',
    label: 'LinkedIn',
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    profileUrl: 'https://api.linkedin.com/v2/userinfo',
    clientIdEnv: 'LINKEDIN_CLIENT_ID',
    clientSecretEnv: 'LINKEDIN_CLIENT_SECRET',
    scopes: ['openid', 'profile', 'email'],
  },
  x: {
    platform: 'x',
    label: 'X',
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    profileUrl: 'https://api.twitter.com/2/users/me?user.fields=public_metrics,profile_image_url',
    clientIdEnv: 'TWITTER_CLIENT_ID',
    clientSecretEnv: 'TWITTER_CLIENT_SECRET',
    scopes: ['tweet.read', 'users.read', 'offline.access'],
    extraParams: { code_challenge_method: 'plain' },
  },
  facebook: {
    platform: 'facebook',
    label: 'Facebook',
    authUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
    profileUrl: 'https://graph.facebook.com/v21.0/me?fields=id,name,picture',
    clientIdEnv: 'FACEBOOK_APP_ID',
    clientSecretEnv: 'FACEBOOK_APP_SECRET',
    scopes: ['public_profile', 'pages_show_list', 'pages_read_engagement'],
  },
  twitch: {
    platform: 'twitch',
    label: 'Twitch',
    authUrl: 'https://id.twitch.tv/oauth2/authorize',
    tokenUrl: 'https://id.twitch.tv/oauth2/token',
    profileUrl: 'https://api.twitch.tv/helix/users',
    clientIdEnv: 'TWITCH_CLIENT_ID',
    clientSecretEnv: 'TWITCH_CLIENT_SECRET',
    scopes: ['user:read:email'],
  },
};

/**
 * Build the OAuth authorization URL for a platform.
 * Returns null if the required env vars are not set.
 */
export function buildOAuthUrl(
  platform: string,
  redirectUri: string,
  state: string,
): string | null {
  const config = OAUTH_CONFIGS[platform];
  if (!config) return null;

  const clientId = process.env[config.clientIdEnv];
  if (!clientId) return null;

  const params = new URLSearchParams({
    client_id: config.platform === 'tiktok' ? '' : clientId,
    redirect_uri: redirectUri,
    scope: config.scopes.join(config.platform === 'tiktok' ? ',' : ' '),
    response_type: 'code',
    state,
    ...config.extraParams,
  });

  // TikTok uses client_key instead of client_id
  if (config.platform === 'tiktok') {
    params.delete('client_id');
    params.set('client_key', clientId);
  }

  // X/Twitter uses code_challenge = state for PKCE plain
  if (config.platform === 'x') {
    params.set('code_challenge', state);
  }

  return `${config.authUrl}?${params.toString()}`;
}

/**
 * Check if a platform's OAuth credentials are configured.
 */
export function isPlatformConfigured(platform: string): boolean {
  const config = OAUTH_CONFIGS[platform];
  if (!config) return false;
  return !!(process.env[config.clientIdEnv] && process.env[config.clientSecretEnv]);
}
