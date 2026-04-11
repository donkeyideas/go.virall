import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

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
    const { data: audits } = await admin
      .from('seo_audits')
      .select('id, overall_score, technical_score, content_score, performance_score, geo_score, total_issues, critical_issues, warning_issues, info_issues, created_at')
      .order('created_at', { ascending: false })
      .limit(30)

    return NextResponse.json({
      audits: (audits ?? []).reverse().map((a: any) => ({
        id: a.id,
        overallScore: a.overall_score,
        technicalScore: a.technical_score,
        contentScore: a.content_score,
        performanceScore: a.performance_score,
        geoScore: a.geo_score,
        totalIssues: a.total_issues,
        criticalIssues: a.critical_issues,
        warningIssues: a.warning_issues,
        infoIssues: a.info_issues,
        createdAt: a.created_at,
      })),
    })
  } catch (error) {
    console.error('Error fetching audit history:', error)
    return NextResponse.json({ error: 'Failed to fetch audit history' }, { status: 500 })
  }
}
