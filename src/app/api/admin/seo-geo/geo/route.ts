import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getGeoAnalysis } from '@/lib/seo/geo-analysis'

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

export async function GET() {
  try {
    const userId = await verifyAdmin()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const analysis = await getGeoAnalysis()
    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Error fetching GEO analysis:', error)
    return NextResponse.json({ error: 'Failed to fetch GEO analysis' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await verifyAdmin()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { llmsTxtContent } = body
    if (typeof llmsTxtContent !== 'string') {
      return NextResponse.json({ error: 'Invalid llms.txt content' }, { status: 400 })
    }

    const admin = createAdminClient()
    await admin.from('admin_settings').upsert(
      { key: 'seo_geo_llms_txt_content', value: llmsTxtContent, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating llms.txt:', error)
    return NextResponse.json({ error: 'Failed to update llms.txt' }, { status: 500 })
  }
}
