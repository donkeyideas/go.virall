import { google, searchconsole_v1 } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { createAdminClient } from '@/lib/supabase/admin'

interface GSCCredentials {
  clientId: string
  clientSecret: string
  refreshToken: string
  siteUrl: string
}

interface GSCServiceAccountCredentials {
  credentials: any
  siteUrl: string
}

let cachedClient: searchconsole_v1.Searchconsole | null = null
let cachedCredentials: string | null = null

export function clearGSCCache(): void {
  cachedClient = null
  cachedCredentials = null
}

async function loadGSCSettings(): Promise<Record<string, string>> {
  const admin = createAdminClient()
  const { data: settings } = await admin
    .from('admin_settings')
    .select('key, value')
    .in('key', [
      'seo_gscClientId',
      'seo_gscClientSecret',
      'seo_gscRefreshToken',
      'seo_gscSiteUrl',
      'seo_googleAnalyticsCredentials',
    ])

  return Object.fromEntries((settings ?? []).map((s: any) => [s.key, s.value]))
}

async function loadGSCCredentials(): Promise<GSCCredentials | null> {
  const map = await loadGSCSettings()

  const clientId = map['seo_gscClientId']
  const clientSecret = map['seo_gscClientSecret']
  const refreshToken = map['seo_gscRefreshToken']
  const siteUrl = map['seo_gscSiteUrl']

  if (!clientId || !clientSecret || !refreshToken || !siteUrl) return null
  return { clientId, clientSecret, refreshToken, siteUrl }
}

async function loadServiceAccountCredentials(): Promise<GSCServiceAccountCredentials | null> {
  const map = await loadGSCSettings()

  const credentialsJson = map['seo_googleAnalyticsCredentials']
  const siteUrl = map['seo_gscSiteUrl']

  if (!credentialsJson || !siteUrl) return null

  try {
    const credentials = JSON.parse(credentialsJson)
    if (credentials.type !== 'service_account') return null
    return { credentials, siteUrl }
  } catch {
    return null
  }
}

function createGSCClient(credentials: GSCCredentials): searchconsole_v1.Searchconsole {
  const credKey = `oauth:${credentials.clientId}:${credentials.refreshToken}`
  if (cachedClient && cachedCredentials === credKey) return cachedClient

  const oauth2Client = new OAuth2Client(credentials.clientId, credentials.clientSecret)
  oauth2Client.setCredentials({ refresh_token: credentials.refreshToken })

  cachedClient = google.searchconsole({ version: 'v1', auth: oauth2Client })
  cachedCredentials = credKey
  return cachedClient
}

function createGSCClientFromServiceAccount(sa: GSCServiceAccountCredentials): searchconsole_v1.Searchconsole {
  const credKey = `sa:${sa.credentials.client_email}`
  if (cachedClient && cachedCredentials === credKey) return cachedClient

  const auth = new google.auth.GoogleAuth({
    credentials: sa.credentials,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  })

  cachedClient = google.searchconsole({ version: 'v1', auth })
  cachedCredentials = credKey
  return cachedClient
}

async function getGSCClientAndSiteUrl(): Promise<{ client: searchconsole_v1.Searchconsole; siteUrl: string } | null> {
  // Try OAuth first (if fully configured with refresh token)
  const oauthCreds = await loadGSCCredentials()
  if (oauthCreds) {
    return { client: createGSCClient(oauthCreds), siteUrl: oauthCreds.siteUrl }
  }

  // Fall back to service account
  const saCreds = await loadServiceAccountCredentials()
  if (saCreds) {
    return { client: createGSCClientFromServiceAccount(saCreds), siteUrl: saCreds.siteUrl }
  }

  return null
}

export async function isGSCConnected(): Promise<boolean> {
  // Only consider connected if OAuth refresh token exists (not just service account fallback)
  const oauthCreds = await loadGSCCredentials()
  return oauthCreds !== null
}

export async function getGSCSiteUrl(): Promise<string | null> {
  const oauthCreds = await loadGSCCredentials()
  if (oauthCreds) return oauthCreds.siteUrl
  const saCreds = await loadServiceAccountCredentials()
  return saCreds?.siteUrl || null
}

export interface GSCSearchAnalyticsRow {
  keys: string[]
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface GSCSearchAnalyticsResult {
  rows: GSCSearchAnalyticsRow[]
  totals: { clicks: number; impressions: number; ctr: number; position: number }
}

export async function getSearchAnalytics(
  options: {
    startDate: string
    endDate: string
    dimensions: ('query' | 'page' | 'country' | 'device' | 'date')[]
    rowLimit?: number
  },
  _retried = false
): Promise<GSCSearchAnalyticsResult> {
  const gsc = await getGSCClientAndSiteUrl()
  if (!gsc) throw new Error('Google Search Console is not configured')

  const { client, siteUrl } = gsc

  try {
    const response = await client.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: options.startDate,
        endDate: options.endDate,
        dimensions: options.dimensions,
        rowLimit: options.rowLimit || 25,
      },
    })

    const rows: GSCSearchAnalyticsRow[] = (response.data.rows || []).map((row) => ({
      keys: row.keys || [],
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    }))

    const totals = rows.reduce(
      (acc, row) => ({
        clicks: acc.clicks + row.clicks,
        impressions: acc.impressions + row.impressions,
        ctr: 0,
        position: 0,
      }),
      { clicks: 0, impressions: 0, ctr: 0, position: 0 }
    )

    if (totals.impressions > 0) totals.ctr = totals.clicks / totals.impressions
    if (rows.length > 0) {
      totals.position = rows.reduce((sum, r) => sum + r.position * r.impressions, 0) / (totals.impressions || 1)
    }

    return { rows, totals }
  } catch (error: any) {
    const msg = error?.message || ''
    const isTokenError =
      msg.includes('invalid_grant') ||
      msg.includes('invalid_client') ||
      msg.includes('Token has been expired or revoked') ||
      msg.includes('No access, refresh token') ||
      error?.code === 401

    clearGSCCache()

    if (!_retried && !isTokenError) return getSearchAnalytics(options, true)

    if (isTokenError) {
      const customError: any = new Error('INVALID_REFRESH_TOKEN')
      customError.isTokenError = true
      throw customError
    }
    throw error
  }
}

export async function getSitemapStatus(): Promise<
  Array<{ path: string; lastSubmitted: string | null; isPending: boolean; errors: number; warnings: number }>
> {
  const gsc = await getGSCClientAndSiteUrl()
  if (!gsc) throw new Error('Google Search Console is not configured')

  const { client, siteUrl } = gsc

  try {
    const response = await client.sitemaps.list({ siteUrl })
    return (response.data.sitemap || []).map((sm) => ({
      path: sm.path || '',
      lastSubmitted: sm.lastSubmitted || null,
      isPending: sm.isPending || false,
      errors: Number(sm.errors) || 0,
      warnings: Number(sm.warnings) || 0,
    }))
  } catch (error: any) {
    clearGSCCache()
    const msg = error?.message || ''
    if (msg.includes('invalid_grant') || msg.includes('Token has been expired or revoked') || error?.code === 401) {
      const customError: any = new Error('INVALID_REFRESH_TOKEN')
      customError.isTokenError = true
      throw customError
    }
    throw error
  }
}

export async function testGSCConnection(): Promise<{
  success: boolean
  error?: string
  configuredSiteUrl: string
  availableSites: Array<{ siteUrl: string; permissionLevel: string }>
  siteAccessible: boolean
}> {
  const gsc = await getGSCClientAndSiteUrl()
  if (!gsc) {
    return {
      success: false,
      error: 'Missing credentials. Configure either OAuth (Client ID + Secret) or a service account with a Site URL in Settings.',
      configuredSiteUrl: '',
      availableSites: [],
      siteAccessible: false,
    }
  }

  const { client, siteUrl } = gsc

  let availableSites: Array<{ siteUrl: string; permissionLevel: string }> = []
  try {
    const sitesResponse = await client.sites.list()
    availableSites = (sitesResponse.data.siteEntry || []).map((s) => ({
      siteUrl: s.siteUrl || '',
      permissionLevel: s.permissionLevel || 'unknown',
    }))
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      error: `Failed to list sites: ${msg}. Make sure the Search Console API is enabled in Google Cloud Console.`,
      configuredSiteUrl: siteUrl,
      availableSites: [],
      siteAccessible: false,
    }
  }

  const siteAccessible = availableSites.some((s) => s.siteUrl === siteUrl)
  if (!siteAccessible) {
    return {
      success: false,
      error: `Site URL "${siteUrl}" not found in your Search Console properties. Available: ${availableSites.map(s => s.siteUrl).join(', ')}`,
      configuredSiteUrl: siteUrl,
      availableSites,
      siteAccessible: false,
    }
  }

  let queryError: string | null = null
  try {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 7)
    await client.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        dimensions: ['date'],
        rowLimit: 1,
      },
    })
  } catch (err) {
    queryError = `Site URL matches but analytics query failed: ${err instanceof Error ? err.message : String(err)}`
  }

  if (queryError) {
    return { success: false, error: queryError, configuredSiteUrl: siteUrl, availableSites, siteAccessible: true }
  }

  return { success: true, configuredSiteUrl: siteUrl, availableSites, siteAccessible: true }
}

export function getOAuthUrl(clientId: string, clientSecret: string, redirectUri: string): string {
  const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri)
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/webmasters.readonly'],
  })
}

export async function exchangeCodeForTokens(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<{ refreshToken: string }> {
  const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri)
  const { tokens } = await oauth2Client.getToken(code)
  if (!tokens.refresh_token) {
    throw new Error('No refresh token received. Make sure to request offline access with consent prompt.')
  }
  return { refreshToken: tokens.refresh_token }
}
