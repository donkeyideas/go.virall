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

    // Get latest audit
    const { data: latestAudit } = await admin
      .from('seo_audits')
      .select('id, overall_score, technical_score, content_score, performance_score, geo_score, total_issues, critical_issues, categories, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Get recommendation counts by status
    const { data: allRecs } = await admin
      .from('seo_recommendations')
      .select('status')

    const statusCounts = { open: 0, implemented: 0, dismissed: 0 }
    for (const r of allRecs ?? []) {
      if (r.status in statusCounts) statusCounts[r.status as keyof typeof statusCounts]++
    }

    // Estimate indexed pages
    const { count: publishedBlogs } = await admin.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'published')
    const { count: siteContentBlocks } = await admin.from('site_content').select('id', { count: 'exact', head: true })
    const estimatedIndexedPages = (publishedBlogs ?? 0) + (siteContentBlocks ?? 0) + 15

    // Get audit history for trend chart
    const { data: auditHistory } = await admin
      .from('seo_audits')
      .select('overall_score, technical_score, content_score, geo_score, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    // Issues by category from latest audit
    let issuesByCategory = null
    if (latestAudit?.categories) {
      const categories = latestAudit.categories as Record<string, { issues?: unknown[] }>
      issuesByCategory = {
        technical: categories.technical?.issues?.length || 0,
        content: categories.content?.issues?.length || 0,
        performance: categories.performance?.issues?.length || 0,
        geo: categories.geo?.issues?.length || 0,
      }
    }

    return NextResponse.json({
      latestAudit: latestAudit ? {
        id: latestAudit.id,
        overallScore: latestAudit.overall_score,
        technicalScore: latestAudit.technical_score,
        contentScore: latestAudit.content_score,
        performanceScore: latestAudit.performance_score,
        geoScore: latestAudit.geo_score,
        totalIssues: latestAudit.total_issues,
        criticalIssues: latestAudit.critical_issues,
        createdAt: latestAudit.created_at,
      } : null,
      statusCounts,
      estimatedIndexedPages,
      auditHistory: (auditHistory ?? []).reverse().map((a: any) => ({
        overallScore: a.overall_score,
        technicalScore: a.technical_score,
        contentScore: a.content_score,
        geoScore: a.geo_score,
        createdAt: a.created_at,
      })),
      issuesByCategory,
    })
  } catch (error) {
    console.error('Error fetching overview:', error)
    return NextResponse.json({ error: 'Failed to fetch overview' }, { status: 500 })
  }
}
