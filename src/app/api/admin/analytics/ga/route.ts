import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getGoogleAnalyticsData, formatGA4Data } from '@/lib/analytics/google-analytics'

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

    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '30d'

    const admin = createAdminClient()
    const { data: settings } = await admin
      .from('admin_settings')
      .select('key, value')
      .in('key', ['seo_googleAnalyticsPropertyId', 'seo_googleAnalyticsCredentials'])

    const map = Object.fromEntries((settings ?? []).map((s: any) => [s.key, s.value]))
    const propertyId = map['seo_googleAnalyticsPropertyId']
    const credentials = map['seo_googleAnalyticsCredentials']

    if (!propertyId) {
      return NextResponse.json({ error: 'GA4 numeric Property ID not configured. Go to SEO → Settings and enter your GA4 Property ID (numeric, not the G-XXXX measurement ID).' }, { status: 400 })
    }

    if (!credentials) {
      return NextResponse.json({ error: 'GA4 Service Account credentials not configured. Go to SEO → Settings and paste your service account JSON.' }, { status: 400 })
    }

    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    const gaReport = await getGoogleAnalyticsData(propertyId, startDateStr, endDateStr, credentials || undefined)
    const formattedData = formatGA4Data(gaReport, days)

    if (!formattedData) {
      return NextResponse.json({ error: 'No analytics data available' }, { status: 404 })
    }

    return NextResponse.json(formattedData)
  } catch (error) {
    console.error('GA API error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 })
  }
}
