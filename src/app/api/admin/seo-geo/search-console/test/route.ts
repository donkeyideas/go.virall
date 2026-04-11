import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { testGSCConnection } from '@/lib/seo/search-console'

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

    const result = await testGSCConnection()
    return NextResponse.json(result)
  } catch (error) {
    console.error('GSC test error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Test failed', availableSites: [], siteAccessible: false, configuredSiteUrl: '' },
      { status: 500 }
    )
  }
}
