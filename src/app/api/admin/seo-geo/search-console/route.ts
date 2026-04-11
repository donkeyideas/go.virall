import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isGSCConnected, getSearchAnalytics, getSitemapStatus, getGSCSiteUrl } from '@/lib/seo/search-console'

async function verifyAdmin(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('system_role').eq('id', user.id).single()
  if (!profile || !['admin', 'superadmin'].includes(profile.system_role)) return null
  return user.id
}

export async function GET(request: NextRequest) {
  try {
    const userId = await verifyAdmin()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const connected = await isGSCConnected()
    if (!connected) return NextResponse.json({ connected: false, message: 'Google Search Console is not connected. Go to Settings and click "Connect Google Search Console" to complete the OAuth flow.' })

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'overview'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const rowLimit = parseInt(searchParams.get('rowLimit') || '25')

    try {
      if (!startDate || !endDate) {
        const end = new Date()
        end.setDate(end.getDate() - 3)
        const start = new Date(end)
        start.setDate(start.getDate() - 28)
        return await fetchGSCData(type, start.toISOString().split('T')[0], end.toISOString().split('T')[0], rowLimit)
      }
      return await fetchGSCData(type, startDate, endDate, rowLimit)
    } catch (innerError: any) {
      console.error('GSC data fetch error:', innerError?.message)
      // If credentials exist but query fails, treat as not properly connected
      return NextResponse.json({
        connected: false,
        message: 'Search Console credentials are saved but the connection is not active. Please click "Connect Google Search Console" in Settings to complete the OAuth flow.',
      })
    }
  } catch (error: any) {
    console.error('Error fetching GSC data:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch Search Console data'
    const siteUrl = await getGSCSiteUrl().catch(() => null)

    if (error?.isTokenError || message.includes('INVALID_REFRESH_TOKEN') || message.includes('invalid_grant')) {
      return NextResponse.json(
        { error: 'invalid_grant', message: 'Your Search Console connection has expired. Please reconnect.', debugSiteUrl: siteUrl, needsReconnect: true },
        { status: 401 }
      )
    }

    return NextResponse.json({ error: message, debugSiteUrl: siteUrl }, { status: 500 })
  }
}

async function fetchGSCData(type: string, startDate: string, endDate: string, rowLimit: number) {
  switch (type) {
    case 'overview': {
      const [dateData, queryData, pageData, countryData, deviceData] = await Promise.all([
        getSearchAnalytics({ startDate, endDate, dimensions: ['date'], rowLimit: 90 }),
        getSearchAnalytics({ startDate, endDate, dimensions: ['query'], rowLimit }),
        getSearchAnalytics({ startDate, endDate, dimensions: ['page'], rowLimit }),
        getSearchAnalytics({ startDate, endDate, dimensions: ['country'], rowLimit: 10 }),
        getSearchAnalytics({ startDate, endDate, dimensions: ['device'], rowLimit: 5 }),
      ])

      return NextResponse.json({
        connected: true,
        totals: dateData.totals,
        dateData: dateData.rows.map((r) => ({ date: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position })),
        queries: queryData.rows.map((r) => ({ query: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: Math.round(r.position * 10) / 10 })),
        pages: pageData.rows.map((r) => ({ page: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: Math.round(r.position * 10) / 10 })),
        countries: countryData.rows.map((r) => ({ country: r.keys[0], clicks: r.clicks, impressions: r.impressions })),
        devices: deviceData.rows.map((r) => ({ device: r.keys[0], clicks: r.clicks, impressions: r.impressions })),
      })
    }

    case 'queries':
      return NextResponse.json({
        connected: true,
        data: (await getSearchAnalytics({ startDate, endDate, dimensions: ['query'], rowLimit })).rows.map((r) => ({
          query: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: Math.round(r.position * 10) / 10,
        })),
      })

    case 'pages':
      return NextResponse.json({
        connected: true,
        data: (await getSearchAnalytics({ startDate, endDate, dimensions: ['page'], rowLimit })).rows.map((r) => ({
          page: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: Math.round(r.position * 10) / 10,
        })),
      })

    case 'sitemaps': {
      const sitemaps = await getSitemapStatus()
      return NextResponse.json({ connected: true, sitemaps })
    }

    default:
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }
}
