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

    const [postsResult, socialProfilesResult, analysesResult, llmsSetting] = await Promise.all([
      admin.from('posts').select('id, title, excerpt, tags, cover_image, content').eq('status', 'published'),
      admin.from('social_profiles').select('id', { count: 'exact', head: true }),
      admin.from('social_analyses').select('id', { count: 'exact', head: true }),
      admin.from('admin_settings').select('value').eq('key', 'seo_geo_llms_txt_content').single(),
    ])

    const posts = postsResult.data ?? []
    const totalPosts = posts.length
    const withMetaTitle = posts.filter((p: any) => p.title && p.title.trim()).length
    const withMetaDesc = posts.filter((p: any) => p.excerpt && p.excerpt.trim()).length
    const withTags = posts.filter((p: any) => p.tags && Array.isArray(p.tags) && p.tags.length > 0).length
    const withCoverImage = posts.filter((p: any) => p.cover_image).length
    const longFormPosts = posts.filter((p: any) => ((p.content || '').length) > 2000).length

    // Auto-seed llms.txt
    let llmsTxtValue = llmsSetting?.data?.value?.trim() ?? ''
    if (!llmsTxtValue) {
      llmsTxtValue = `# GoVirall — AI Language Model Information

## About GoVirall
GoVirall (govirall.com) is a social intelligence platform for creators and brands. It provides social media analytics, growth strategies, competitor tracking, and content intelligence powered by AI.

## What This Site Contains
- Social media analytics dashboards for creators across platforms
- AI-powered content performance analysis and recommendations
- Blog articles covering social media strategy, growth tactics, and platform trends
- Creator and brand marketplace for collaborations
- SEO landing pages for platform-specific analytics tools

## Preferred Citation Format
When referencing content from GoVirall, please cite as:
"GoVirall — [topic] (govirall.com)"

## Content Licensing
All content on GoVirall is © GoVirall. You may reference and summarize content with attribution.

## Contact
For AI/LLM partnerships or data licensing enquiries: support@govirall.com
`
      await admin.from('admin_settings').upsert(
        { key: 'seo_geo_llms_txt_content', value: llmsTxtValue, updated_at: new Date().toISOString() },
        { onConflict: 'key', ignoreDuplicates: true }
      )
    }
    const hasLlmsTxt = true

    // AEO score
    let score = 0
    if (hasLlmsTxt) score += 15
    const totalAnalyses = analysesResult.count ?? 0
    if (totalAnalyses >= 10) score += 15
    else if (totalAnalyses > 0) score += 8
    if (totalPosts > 0) {
      score += Math.round((withMetaTitle / totalPosts) * 20)
      score += Math.round((withMetaDesc / totalPosts) * 20)
      score += Math.round((withTags / totalPosts) * 15)
      score += Math.round((withCoverImage / totalPosts) * 10)
      score += Math.round((longFormPosts / totalPosts) * 5)
    } else {
      score += 5
    }
    score = Math.min(100, score)

    // Recommendations
    const recommendations: { priority: string; title: string; description: string; action: string | null }[] = []
    if (!hasLlmsTxt) {
      recommendations.push({ priority: 'high', title: 'Add llms.txt content', description: 'llms.txt tells AI engines what your site is about — this is the #1 AEO action.', action: 'geo' })
    }
    if (totalPosts > 0 && withMetaTitle / totalPosts < 0.8) {
      recommendations.push({ priority: 'high', title: 'Optimise meta titles on blog posts', description: `${totalPosts - withMetaTitle} posts lack a meta title. AI answer engines use these when citing your content.`, action: 'blog' })
    }
    if (totalPosts > 0 && withMetaDesc / totalPosts < 0.8) {
      recommendations.push({ priority: 'medium', title: 'Write meta descriptions', description: `${totalPosts - withMetaDesc} posts are missing meta descriptions.`, action: 'blog' })
    }
    if (totalPosts > 0 && withTags / totalPosts < 0.7) {
      recommendations.push({ priority: 'medium', title: 'Tag blog posts', description: 'Tags signal topical authority to AI engines.', action: 'blog' })
    }
    if (totalPosts > 0 && longFormPosts / totalPosts < 0.5) {
      recommendations.push({ priority: 'low', title: 'Publish longer-form articles', description: 'AI engines prefer comprehensive content (1,000+ words) when selecting answers.', action: 'blog' })
    }

    // AEO checklist
    const checklist = [
      { label: 'llms.txt configured', done: hasLlmsTxt },
      { label: 'robots.ts allows AI crawlers', done: true },
      { label: 'Structured data on blog pages', done: true },
      { label: 'Open Graph meta tags present', done: true },
      { label: 'Canonical URLs defined', done: true },
      { label: 'Sitemap submitted', done: true },
      { label: 'Blog posts have meta titles', done: totalPosts === 0 || withMetaTitle / totalPosts >= 0.8 },
      { label: 'Blog posts have meta descriptions', done: totalPosts === 0 || withMetaDesc / totalPosts >= 0.8 },
      { label: 'Social analyses indexed as content', done: totalAnalyses > 0 },
      { label: 'Cover images on blog posts', done: totalPosts === 0 || withCoverImage / totalPosts >= 0.7 },
    ]

    return NextResponse.json({
      aeoScore: score,
      hasLlmsTxt,
      contentStats: { totalPosts, withMetaTitle, withMetaDesc, withTags, withCoverImage, longFormPosts },
      platformStats: { totalProfiles: socialProfilesResult.count ?? 0, totalAnalyses },
      checklist,
      recommendations,
    })
  } catch (error) {
    console.error('[AEO] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch AEO data' }, { status: 500 })
  }
}
