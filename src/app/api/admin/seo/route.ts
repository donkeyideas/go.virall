import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

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

    const admin = createAdminClient()
    const { data: seoSettings, error: fetchError } = await admin
      .from('admin_settings')
      .select('key, value')
      .like('key', 'seo_%')

    if (fetchError) {
      console.error('Failed to fetch SEO settings from DB:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch SEO settings' }, { status: 500 })
    }

    console.log('SEO settings GET: found', seoSettings?.length ?? 0, 'rows')

    const settings: Record<string, string> = {}
    for (const setting of seoSettings ?? []) {
      const key = setting.key.replace('seo_', '')
      if (key.includes('secret') && setting.value) {
        settings[key] = '••••••••' + setting.value.slice(-4)
      } else {
        settings[key] = setting.value || ''
      }
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Failed to fetch SEO settings:', error)
    return NextResponse.json({ error: 'Failed to fetch SEO settings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await verifyAdmin()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const settings = body.settings || body
    const admin = createAdminClient()

    console.log('SEO settings POST: received keys:', Object.keys(settings))

    const savedKeys: string[] = []
    const skippedKeys: string[] = []
    const failedKeys: string[] = []

    for (const [key, value] of Object.entries(settings)) {
      const strValue = String(value || '')
      if (strValue.startsWith('••••')) {
        skippedKeys.push(key)
        continue
      }

      const dbKey = `seo_${key}`

      // Delete existing row first
      const { error: delError } = await admin.from('admin_settings').delete().eq('key', dbKey)
      if (delError) {
        console.error(`Failed to delete setting ${dbKey}:`, delError)
      }

      // Insert fresh row
      const { error: insError } = await admin.from('admin_settings').insert({
        key: dbKey,
        value: strValue,
        updated_at: new Date().toISOString(),
      })

      if (insError) {
        console.error(`Failed to insert setting ${dbKey}:`, insError)
        failedKeys.push(dbKey)
      } else {
        savedKeys.push(dbKey)
      }
    }

    // Verification: read back what we just wrote
    const { data: verify } = await admin
      .from('admin_settings')
      .select('key, value')
      .like('key', 'seo_%')
    console.log('SEO settings POST verification:', verify?.map(s => `${s.key}=${(s.value || '').substring(0, 30)}`))
    console.log('SEO settings POST result:', { saved: savedKeys.length, skipped: skippedKeys.length, failed: failedKeys.length })

    if (failedKeys.length > 0) {
      return NextResponse.json({ error: `Failed to save: ${failedKeys.join(', ')}`, success: false }, { status: 500 })
    }

    return NextResponse.json({ success: true, saved: savedKeys.length })
  } catch (error) {
    console.error('Failed to save SEO settings:', error)
    return NextResponse.json({ error: 'Failed to save SEO settings' }, { status: 500 })
  }
}
