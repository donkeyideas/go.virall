import { createAdminClient } from '@/lib/supabase/admin'

export interface AiBotStatus {
  name: string
  userAgent: string
  allowed: boolean
  scope: string
}

export interface StructuredDataCoverage {
  pageType: string
  hasSchema: boolean
  schemaTypes: string[]
}

export interface ContentQualityMetrics {
  totalPosts: number
  avgWordCount: number
  postsOver1000Words: number
  postsWithTags: number
  postsWithCoverImages: number
}

export interface GeoAnalysisResult {
  aiBots: AiBotStatus[]
  llmsTxtContent: string
  llmsTxtSource: 'admin_settings' | 'static_file'
  structuredDataCoverage: StructuredDataCoverage[]
  contentQuality: ContentQualityMetrics
  rssFeedStatus: { exists: boolean; path: string }
  geoScore: number
}

const AI_BOTS: AiBotStatus[] = [
  { name: 'GPTBot (OpenAI)', userAgent: 'GPTBot', allowed: true, scope: 'Public pages only' },
  { name: 'ChatGPT-User', userAgent: 'ChatGPT-User', allowed: true, scope: 'Public pages only' },
  { name: 'ClaudeBot (Anthropic)', userAgent: 'ClaudeBot', allowed: true, scope: 'Public pages only' },
  { name: 'Claude-Web', userAgent: 'Claude-Web', allowed: true, scope: 'Public pages only' },
  { name: 'PerplexityBot', userAgent: 'PerplexityBot', allowed: true, scope: 'Public pages only' },
  { name: 'Google-Extended', userAgent: 'Google-Extended', allowed: true, scope: 'Public pages only' },
  { name: 'CCBot (Common Crawl)', userAgent: 'CCBot', allowed: true, scope: 'Public pages only' },
  { name: 'Applebot-Extended', userAgent: 'Applebot-Extended', allowed: true, scope: 'Public pages only' },
  { name: 'Cohere AI', userAgent: 'cohere-ai', allowed: true, scope: 'Public pages only' },
]

const STRUCTURED_DATA_COVERAGE: StructuredDataCoverage[] = [
  { pageType: 'Homepage', hasSchema: true, schemaTypes: ['Organization', 'SoftwareApplication', 'WebSite'] },
  { pageType: 'Blog Posts', hasSchema: true, schemaTypes: ['BlogPosting', 'BreadcrumbList'] },
  { pageType: 'FAQ Page', hasSchema: true, schemaTypes: ['FAQPage'] },
  { pageType: 'How It Works', hasSchema: true, schemaTypes: ['HowTo'] },
  { pageType: 'Pricing', hasSchema: true, schemaTypes: ['Product', 'Offer'] },
  { pageType: 'About', hasSchema: true, schemaTypes: ['AboutPage'] },
  { pageType: 'SEO Landing Pages', hasSchema: true, schemaTypes: ['WebPage', 'BreadcrumbList'] },
  { pageType: 'Creator Profiles', hasSchema: true, schemaTypes: ['Person', 'ProfilePage'] },
]

const DEFAULT_LLMS_TXT = `# GoVirall

> Social intelligence platform for creators and brands.

## Key Pages
- Homepage: https://www.govirall.com
- Blog: https://www.govirall.com/blog
- Pricing: https://www.govirall.com/pricing
- About: https://www.govirall.com/about

## API and Feeds
- Sitemap: https://www.govirall.com/sitemap.xml
- RSS Feed: https://www.govirall.com/feed.xml
`

export async function getGeoAnalysis(): Promise<GeoAnalysisResult> {
  const admin = createAdminClient()

  const { data: llmsSetting } = await admin
    .from('admin_settings')
    .select('value')
    .eq('key', 'seo_geo_llms_txt_content')
    .single()

  const llmsTxtContent = llmsSetting?.value || DEFAULT_LLMS_TXT
  const llmsTxtSource = llmsSetting?.value ? ('admin_settings' as const) : ('static_file' as const)

  // Get content quality metrics from blog posts
  const { data: allPosts } = await admin
    .from('posts')
    .select('content, tags, cover_image')
    .eq('status', 'published')

  const posts = allPosts ?? []
  const totalPosts = posts.length
  const wordCounts = posts.map((p: any) =>
    (p.content || '').replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length
  )
  const avgWordCount = wordCounts.length > 0
    ? Math.round(wordCounts.reduce((a: number, b: number) => a + b, 0) / wordCounts.length)
    : 0
  const postsOver1000Words = wordCounts.filter((w: number) => w >= 1000).length
  const postsWithTags = posts.filter((p: any) => p.tags && Array.isArray(p.tags) && p.tags.length > 0).length
  const postsWithCoverImages = posts.filter((p: any) => p.cover_image).length

  // Calculate GEO score
  let geoScore = 50
  geoScore += 10 // llms.txt exists
  geoScore += 10 // AI bots allowed
  const coveragePercent = STRUCTURED_DATA_COVERAGE.filter((s) => s.hasSchema).length / STRUCTURED_DATA_COVERAGE.length
  if (coveragePercent >= 0.8) geoScore += 10
  geoScore += 5 // RSS feed
  if (avgWordCount >= 500) geoScore += 5
  if (totalPosts > 0 && postsWithTags / totalPosts > 0.5) geoScore += 5
  if (totalPosts > 0 && postsWithCoverImages / totalPosts > 0.5) geoScore += 5
  geoScore = Math.min(100, geoScore)

  return {
    aiBots: AI_BOTS,
    llmsTxtContent,
    llmsTxtSource,
    structuredDataCoverage: STRUCTURED_DATA_COVERAGE,
    contentQuality: {
      totalPosts,
      avgWordCount,
      postsOver1000Words,
      postsWithTags,
      postsWithCoverImages,
    },
    rssFeedStatus: { exists: true, path: '/feed.xml' },
    geoScore,
  }
}
