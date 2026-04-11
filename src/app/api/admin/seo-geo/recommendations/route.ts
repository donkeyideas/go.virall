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

export async function GET(request: NextRequest) {
  try {
    const userId = await verifyAdmin()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')

    const admin = createAdminClient()
    let query = admin.from('seo_recommendations').select('*').order('created_at', { ascending: false })
    if (status) query = query.eq('status', status)
    if (category) query = query.eq('category', category)

    const { data: recommendations } = await query

    // Count by status
    const { data: allRecs } = await admin.from('seo_recommendations').select('status')
    const statusCounts = { open: 0, implemented: 0, dismissed: 0 }
    for (const r of allRecs ?? []) {
      if (r.status in statusCounts) statusCounts[r.status as keyof typeof statusCounts]++
    }

    return NextResponse.json({ recommendations: recommendations ?? [], statusCounts })
  } catch (error) {
    console.error('Error fetching recommendations:', error)
    return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await verifyAdmin()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { id, status } = body
    if (!id || !status || !['open', 'implemented', 'dismissed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: updated, error } = await admin
      .from('seo_recommendations')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ recommendation: updated })
  } catch (error) {
    console.error('Error updating recommendation:', error)
    return NextResponse.json({ error: 'Failed to update recommendation' }, { status: 500 })
  }
}
