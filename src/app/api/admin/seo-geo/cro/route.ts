import { NextResponse } from 'next/server'
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
    const now = new Date()
    const sixMonthsAgo = new Date(now)
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    sixMonthsAgo.setDate(1)
    sixMonthsAgo.setHours(0, 0, 0, 0)

    const [
      totalUsersResult,
      paidOrgsResult,
      socialProfilesResult,
      socialAnalysesResult,
      recentUsersResult,
    ] = await Promise.all([
      admin.from('profiles').select('id', { count: 'exact', head: true }),
      admin.from('organizations').select('id', { count: 'exact', head: true }).neq('plan', 'free').eq('subscription_status', 'active'),
      admin.from('social_profiles').select('id', { count: 'exact', head: true }),
      admin.from('social_analyses').select('id', { count: 'exact', head: true }),
      admin.from('profiles').select('created_at').gte('created_at', sixMonthsAgo.toISOString()).order('created_at', { ascending: true }),
    ])

    const totalUsers = totalUsersResult.count ?? 0
    const paidOrgs = paidOrgsResult.count ?? 0
    const totalProfiles = socialProfilesResult.count ?? 0
    const totalAnalyses = socialAnalysesResult.count ?? 0

    // Users who connected at least 1 social profile
    const { data: usersWithProfiles } = await admin
      .from('social_profiles')
      .select('user_id')
    const activatedUsers = new Set((usersWithProfiles ?? []).map((p: any) => p.user_id)).size

    // Build monthly buckets
    const monthlyData: { month: string; signups: number; profiles: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now)
      start.setMonth(start.getMonth() - i)
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setMonth(end.getMonth() + 1)

      const monthLabel = start.toLocaleString('en-US', { month: 'short', year: '2-digit' })
      const signups = (recentUsersResult.data ?? []).filter(
        (u: any) => new Date(u.created_at) >= start && new Date(u.created_at) < end
      ).length
      monthlyData.push({ month: monthLabel, signups, profiles: 0 })
    }

    // Funnel metrics
    const activationRate = totalUsers > 0 ? Math.round((activatedUsers / totalUsers) * 100) : 0
    const paidConvRate = totalUsers > 0 ? Math.round((paidOrgs / totalUsers) * 100) : 0
    const avgProfilesPerUser = totalUsers > 0 ? Math.round((totalProfiles / totalUsers) * 10) / 10 : 0

    // CRO Score
    let score = 20 // base
    score += Math.min(40, activationRate * 0.5)
    score += Math.min(10, paidConvRate * 2)
    score += Math.min(10, Math.min(totalUsers / 100, 1) * 10)
    score += Math.min(10, Math.min(totalAnalyses / 50, 1) * 10)
    score += Math.min(10, Math.min(avgProfilesPerUser, 3) * 3.33)
    score = Math.round(Math.min(100, score))

    // CRO recommendations
    const recommendations: { priority: string; title: string; description: string }[] = []
    if (activationRate < 30) {
      recommendations.push({
        priority: 'high',
        title: 'Improve onboarding to first profile connection',
        description: `Only ${activationRate}% of users have connected a social profile. Add guided onboarding flow after signup.`,
      })
    }
    if (paidConvRate < 5) {
      recommendations.push({
        priority: 'medium',
        title: 'Improve upgrade conversion',
        description: `Paid conversion is ${paidConvRate}%. Add upgrade prompts at natural friction points (e.g., analysis limits, competitor tracking).`,
      })
    }
    if (avgProfilesPerUser < 2) {
      recommendations.push({
        priority: 'medium',
        title: 'Increase profiles per user',
        description: `Average ${avgProfilesPerUser} profiles/user. Encourage connecting multiple platforms with in-app prompts.`,
      })
    }

    // CTA checklist
    const ctas = [
      { page: 'Homepage', cta: 'Start Free', priority: 'high', status: 'live' },
      { page: 'Homepage', cta: 'See Demo', priority: 'high', status: 'live' },
      { page: 'Dashboard', cta: 'Connect Profile', priority: 'high', status: 'live' },
      { page: 'Dashboard', cta: 'Run Analysis', priority: 'high', status: 'live' },
      { page: 'Analysis Result', cta: 'Share Report', priority: 'medium', status: 'live' },
      { page: 'Pricing', cta: 'Upgrade', priority: 'high', status: 'live' },
      { page: 'Post-signup', cta: 'Connect first platform', priority: 'high', status: 'live' },
    ]

    return NextResponse.json({
      croScore: score,
      funnel: {
        totalUsers,
        activatedUsers,
        paidOrgs,
        activationRate,
        paidConvRate,
      },
      engagementMetrics: {
        totalProfiles,
        totalAnalyses,
        avgProfilesPerUser,
      },
      monthlyData,
      recommendations,
      ctas,
    })
  } catch (error) {
    console.error('[CRO] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch CRO data' }, { status: 500 })
  }
}
