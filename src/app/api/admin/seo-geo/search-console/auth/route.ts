import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getOAuthUrl, exchangeCodeForTokens, clearGSCCache } from '@/lib/seo/search-console'

export const dynamic = 'force-dynamic'

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
    const code = searchParams.get('code')

    const admin = createAdminClient()
    const { data: settings } = await admin
      .from('admin_settings')
      .select('key, value')
      .in('key', ['seo_gscClientId', 'seo_gscClientSecret'])

    const map = Object.fromEntries((settings ?? []).map((s: any) => [s.key, s.value]))
    const clientId = map['seo_gscClientId']
    const clientSecret = map['seo_gscClientSecret']

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'GSC Client ID and Client Secret must be configured in Settings first' }, { status: 400 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.govirall.com'
    const redirectUri = `${baseUrl}/api/admin/seo-geo/search-console/auth`

    if (code) {
      const { refreshToken } = await exchangeCodeForTokens(clientId, clientSecret, code, redirectUri)

      await admin.from('admin_settings').upsert(
        { key: 'seo_gscRefreshToken', value: refreshToken, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      )

      return NextResponse.redirect(new URL('/admin/seo?tab=settings&gsc=connected', baseUrl))
    }

    const authUrl = getOAuthUrl(clientId, clientSecret, redirectUri)
    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('GSC auth error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Authentication failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await verifyAdmin()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    if (body.action === 'disconnect') {
      const admin = createAdminClient()
      await admin.from('admin_settings').delete().eq('key', 'seo_gscRefreshToken')
      clearGSCCache()
      return NextResponse.json({ success: true, message: 'GSC disconnected' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('GSC disconnect error:', error)
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
  }
}
