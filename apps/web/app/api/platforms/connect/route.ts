import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@govirall/db/server';
import { buildOAuthUrl, isPlatformConfigured, OAUTH_CONFIGS } from '@govirall/core';

/**
 * GET /api/platforms/connect?platform=instagram
 * Redirects the user to the platform's OAuth authorization page.
 */
export async function GET(req: NextRequest) {
  // Auth check
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/signin', req.url));
  }

  const platform = req.nextUrl.searchParams.get('platform');
  if (!platform || !OAUTH_CONFIGS[platform]) {
    return NextResponse.redirect(
      new URL('/settings#platforms', req.url),
    );
  }

  // Check if platform OAuth is configured
  if (!isPlatformConfigured(platform)) {
    // Redirect back to settings with an error message
    const url = new URL('/settings', req.url);
    url.hash = 'platforms';
    url.searchParams.set('error', `${OAUTH_CONFIGS[platform].label} API keys are not configured. Add ${OAUTH_CONFIGS[platform].clientIdEnv} and ${OAUTH_CONFIGS[platform].clientSecretEnv} to your environment variables.`);
    return NextResponse.redirect(url);
  }

  // Build state with user ID + platform for callback verification
  const state = Buffer.from(
    JSON.stringify({ userId: user.id, platform, ts: Date.now() }),
  ).toString('base64url');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const redirectUri = `${appUrl}/api/platforms/callback`;

  const authUrl = buildOAuthUrl(platform, redirectUri, state);
  if (!authUrl) {
    return NextResponse.redirect(new URL('/settings#platforms', req.url));
  }

  return NextResponse.redirect(authUrl);
}
