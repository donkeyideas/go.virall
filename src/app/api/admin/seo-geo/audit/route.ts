import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { runFullAudit } from '@/lib/seo/audit-engine'
import { generateRecommendations } from '@/lib/seo/recommendations-engine'

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
    const { data: latestAudit } = await admin
      .from('seo_audits')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({ audit: latestAudit })
  } catch (error) {
    console.error('Error fetching audit:', error)
    return NextResponse.json({ error: 'Failed to fetch audit' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const userId = await verifyAdmin()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const auditResult = await runFullAudit()
    const admin = createAdminClient()

    const { data: savedAudit, error: insertError } = await admin
      .from('seo_audits')
      .insert({
        overall_score: auditResult.overallScore,
        technical_score: auditResult.technicalScore,
        content_score: auditResult.contentScore,
        performance_score: auditResult.performanceScore,
        geo_score: auditResult.geoScore,
        total_issues: auditResult.totalIssues,
        critical_issues: auditResult.criticalIssues,
        warning_issues: auditResult.warningIssues,
        info_issues: auditResult.infoIssues,
        categories: auditResult.categories,
        summary: auditResult.summary,
      })
      .select()
      .single()

    if (insertError) throw insertError

    // Generate and save recommendations
    const recommendations = generateRecommendations(auditResult)

    // Clear old open recommendations
    await admin.from('seo_recommendations').delete().eq('status', 'open')

    if (recommendations.length > 0) {
      await admin.from('seo_recommendations').insert(
        recommendations.map((r) => ({
          audit_id: savedAudit.id,
          category: r.category,
          severity: r.severity,
          title: r.title,
          description: r.description,
          impact: r.impact,
          effort: r.effort,
          page_url: r.pageUrl || null,
        }))
      )
    }

    return NextResponse.json({ audit: savedAudit, recommendationsCount: recommendations.length })
  } catch (error) {
    console.error('Error running audit:', error)
    return NextResponse.json({ error: 'Failed to run audit' }, { status: 500 })
  }
}
