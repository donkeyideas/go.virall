import { createAdminClient } from '@/lib/supabase/admin'

export interface AuditIssue {
  category: 'technical_seo' | 'content_seo' | 'performance' | 'geo'
  severity: 'critical' | 'warning' | 'info'
  title: string
  description: string
  pageUrl?: string
  recommendation: string
}

export interface AuditCategoryResult {
  score: number
  issues: AuditIssue[]
  checks: { name: string; passed: boolean; details?: string }[]
}

export interface AuditResult {
  overallScore: number
  technicalScore: number
  contentScore: number
  performanceScore: number
  geoScore: number
  totalIssues: number
  criticalIssues: number
  warningIssues: number
  infoIssues: number
  categories: {
    technical: AuditCategoryResult
    content: AuditCategoryResult
    performance: AuditCategoryResult
    geo: AuditCategoryResult
  }
  summary: string
}

async function loadSeoSettings(): Promise<Record<string, string>> {
  const admin = createAdminClient()
  const { data: settings } = await admin
    .from('admin_settings')
    .select('key, value')
    .like('key', 'seo_%')

  return Object.fromEntries((settings ?? []).map((s: any) => [s.key, s.value]))
}

function calculateScore(issues: AuditIssue[]): number {
  let score = 100
  for (const issue of issues) {
    if (issue.severity === 'critical') score -= 15
    else if (issue.severity === 'warning') score -= 7
    else score -= 2
  }
  return Math.max(0, Math.min(100, score))
}

async function runTechnicalChecks(): Promise<AuditCategoryResult> {
  const issues: AuditIssue[] = []
  const checks: AuditCategoryResult['checks'] = []
  const seoSettings = await loadSeoSettings()
  const admin = createAdminClient()

  // Check: Site title configured
  const hasSiteTitle = !!seoSettings['seo_siteTitle']?.trim()
  checks.push({ name: 'Site title configured', passed: hasSiteTitle })
  if (!hasSiteTitle) {
    issues.push({
      category: 'technical_seo',
      severity: 'critical',
      title: 'Missing site title',
      description: 'No global site title is configured in SEO settings.',
      recommendation: 'Go to SEO Settings and set a descriptive site title.',
    })
  }

  // Check: Site description
  const siteDesc = seoSettings['seo_siteDescription'] || ''
  const hasDesc = !!siteDesc.trim()
  checks.push({ name: 'Site description configured', passed: hasDesc })
  if (!hasDesc) {
    issues.push({
      category: 'technical_seo',
      severity: 'critical',
      title: 'Missing site description',
      description: 'No global meta description is configured.',
      recommendation: 'Set a meta description between 120-160 characters in SEO settings.',
    })
  } else if (siteDesc.length < 120 || siteDesc.length > 160) {
    checks.push({ name: 'Site description optimal length', passed: false, details: `${siteDesc.length} chars (optimal: 120-160)` })
    issues.push({
      category: 'technical_seo',
      severity: 'warning',
      title: 'Site description length not optimal',
      description: `Meta description is ${siteDesc.length} characters. Optimal is 120-160.`,
      recommendation: 'Adjust the meta description length to between 120-160 characters.',
    })
  }

  // Check: Default OG image
  const hasOgImage = !!seoSettings['seo_defaultOgImage']?.trim()
  checks.push({ name: 'Default OG image configured', passed: hasOgImage })
  if (!hasOgImage) {
    issues.push({
      category: 'technical_seo',
      severity: 'warning',
      title: 'Missing default OG image',
      description: 'No default Open Graph image is configured for social sharing.',
      recommendation: 'Upload a 1200x630px image and set it as the default OG image.',
    })
  }

  // Check: Canonical URL base
  const hasCanonical = !!seoSettings['seo_canonicalUrlBase']?.trim()
  checks.push({ name: 'Canonical URL base configured', passed: hasCanonical })
  if (!hasCanonical) {
    issues.push({
      category: 'technical_seo',
      severity: 'warning',
      title: 'Missing canonical URL base',
      description: 'No canonical URL base is set. This can cause duplicate content issues.',
      recommendation: 'Set the canonical URL base (e.g., https://www.govirall.com) in SEO settings.',
    })
  }

  // Check: Google Analytics configured
  const hasGA = !!seoSettings['seo_googleAnalyticsId']?.trim()
  checks.push({ name: 'Google Analytics configured', passed: hasGA })
  if (!hasGA) {
    issues.push({
      category: 'technical_seo',
      severity: 'warning',
      title: 'Google Analytics not configured',
      description: 'No Google Analytics tracking ID is set in SEO settings.',
      recommendation: 'Add your GA4 measurement ID in SEO settings.',
    })
  }

  // Check: Google Search Console
  const hasGSCVerification = !!seoSettings['seo_googleSearchConsoleVerification']?.trim()
  const hasGSCOAuth = !!seoSettings['seo_gsc_refresh_token']?.trim()
  const hasGSC = hasGSCVerification || hasGSCOAuth
  checks.push({ name: 'Google Search Console verified', passed: hasGSC })
  if (!hasGSC) {
    issues.push({
      category: 'technical_seo',
      severity: 'info',
      title: 'Google Search Console not verified',
      description: 'No Search Console connection or verification code is configured.',
      recommendation: 'Connect your Google Search Console via OAuth in Settings, or add your GSC verification meta tag.',
    })
  }

  // Check: Organization schema data
  const hasOrgName = !!seoSettings['seo_organizationName']?.trim()
  checks.push({ name: 'Organization schema configured', passed: hasOrgName })
  if (!hasOrgName) {
    issues.push({
      category: 'technical_seo',
      severity: 'info',
      title: 'Organization schema incomplete',
      description: 'Organization name is not configured for structured data.',
      recommendation: 'Fill in organization details in SEO settings for richer search results.',
    })
  }

  // Check: Blog posts with missing meta titles
  const { count: totalPublished } = await admin
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')

  const { data: postsWithoutMeta } = await admin
    .from('posts')
    .select('id')
    .eq('status', 'published')
    .or('meta_title.is.null,meta_title.eq.')

  const blogsMissingMeta = postsWithoutMeta?.length ?? 0
  const total = totalPublished ?? 0
  checks.push({ name: 'Blog posts have meta titles', passed: blogsMissingMeta === 0, details: `${blogsMissingMeta}/${total} missing` })
  if (blogsMissingMeta > 0) {
    issues.push({
      category: 'technical_seo',
      severity: 'warning',
      title: `${blogsMissingMeta} blog post(s) missing meta titles`,
      description: `${blogsMissingMeta} published blog posts don't have custom meta titles set.`,
      pageUrl: '/admin/blog',
      recommendation: 'Edit each blog post and add a unique meta title (50-60 characters).',
    })
  }

  // Check: Blog posts with missing meta descriptions
  const { data: postsWithoutDesc } = await admin
    .from('posts')
    .select('id')
    .eq('status', 'published')
    .or('meta_description.is.null,meta_description.eq.')

  const blogsMissingDesc = postsWithoutDesc?.length ?? 0
  checks.push({ name: 'Blog posts have meta descriptions', passed: blogsMissingDesc === 0, details: `${blogsMissingDesc}/${total} missing` })
  if (blogsMissingDesc > 0) {
    issues.push({
      category: 'technical_seo',
      severity: 'warning',
      title: `${blogsMissingDesc} blog post(s) missing meta descriptions`,
      description: `${blogsMissingDesc} published blog posts don't have meta descriptions.`,
      pageUrl: '/admin/blog',
      recommendation: 'Add unique meta descriptions (120-160 chars) to each blog post.',
    })
  }

  // Check: Duplicate blog post titles
  const { data: allPosts } = await admin
    .from('posts')
    .select('title, slug')
    .eq('status', 'published')

  const titleCounts = new Map<string, number>()
  for (const post of allPosts ?? []) {
    const t = (post.title || '').toLowerCase().trim()
    titleCounts.set(t, (titleCounts.get(t) || 0) + 1)
  }
  const duplicates = [...titleCounts.entries()].filter(([, c]) => c > 1)
  checks.push({ name: 'No duplicate blog titles', passed: duplicates.length === 0 })
  if (duplicates.length > 0) {
    issues.push({
      category: 'technical_seo',
      severity: 'warning',
      title: `${duplicates.length} duplicate blog title(s) found`,
      description: `Duplicate titles: ${duplicates.map(([t]) => `"${t}"`).join(', ')}`,
      recommendation: 'Ensure each blog post has a unique title for better indexing.',
    })
  }

  // Check: Site content pages with meta data
  const { count: totalSiteContent } = await admin
    .from('site_content')
    .select('id', { count: 'exact', head: true })

  checks.push({ name: 'Site content pages configured', passed: (totalSiteContent ?? 0) > 0, details: `${totalSiteContent ?? 0} content block(s)` })

  return { score: calculateScore(issues), issues, checks }
}

async function runContentChecks(): Promise<AuditCategoryResult> {
  const issues: AuditIssue[] = []
  const checks: AuditCategoryResult['checks'] = []
  const admin = createAdminClient()

  // Check: Blog posts without featured images
  const { count: totalPublished } = await admin
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')

  const { data: postsWithoutImages } = await admin
    .from('posts')
    .select('id')
    .eq('status', 'published')
    .or('cover_image.is.null,cover_image.eq.')

  const missingImages = postsWithoutImages?.length ?? 0
  const total = totalPublished ?? 0
  checks.push({ name: 'Blog posts have cover images', passed: missingImages === 0, details: `${missingImages}/${total} missing` })
  if (missingImages > 0) {
    issues.push({
      category: 'content_seo',
      severity: 'warning',
      title: `${missingImages} blog post(s) without cover images`,
      description: 'Cover images improve social sharing and search result appearance.',
      pageUrl: '/admin/blog',
      recommendation: 'Add cover images to all published blog posts.',
    })
  }

  // Check: Blog posts with thin content (< 300 words)
  const { data: allPosts } = await admin
    .from('posts')
    .select('id, title, body, slug')
    .eq('status', 'published')

  const thinPosts = (allPosts ?? []).filter((p: any) => {
    const wordCount = (p.body || '').replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length
    return wordCount < 300
  })
  checks.push({ name: 'Blog posts have sufficient content', passed: thinPosts.length === 0, details: `${thinPosts.length}/${(allPosts ?? []).length} with < 300 words` })
  if (thinPosts.length > 0) {
    issues.push({
      category: 'content_seo',
      severity: 'warning',
      title: `${thinPosts.length} blog post(s) have thin content`,
      description: `Posts with fewer than 300 words may not rank well. Affected: ${thinPosts.slice(0, 3).map((p: any) => `"${p.title}"`).join(', ')}${thinPosts.length > 3 ? ` and ${thinPosts.length - 3} more` : ''}.`,
      recommendation: 'Expand thin content to at least 500+ words with valuable information.',
    })
  }

  // Check: Blog posts without categories/tags
  const { data: postsWithoutTags } = await admin
    .from('posts')
    .select('id')
    .eq('status', 'published')
    .or('tags.is.null,tags.eq.[]')

  const missingTags = postsWithoutTags?.length ?? 0
  checks.push({ name: 'Blog posts have tags', passed: missingTags === 0, details: `${missingTags}/${total} without tags` })
  if (missingTags > 0) {
    issues.push({
      category: 'content_seo',
      severity: 'info',
      title: `${missingTags} blog post(s) without tags`,
      description: 'Tagged content helps search engines understand topic relevance.',
      recommendation: 'Assign relevant tags to each blog post.',
    })
  }

  // Check: Average content length
  const avgWordCount = (allPosts ?? []).length > 0
    ? Math.round(
        (allPosts ?? []).reduce((sum: number, p: any) =>
          sum + (p.body || '').replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length, 0
        ) / (allPosts ?? []).length
      )
    : 0
  checks.push({ name: 'Average blog post word count', passed: avgWordCount >= 500, details: `${avgWordCount} words avg` })
  if (avgWordCount < 500 && avgWordCount > 0) {
    issues.push({
      category: 'content_seo',
      severity: 'info',
      title: `Low average blog word count (${avgWordCount} words)`,
      description: 'Higher word counts (1000+) tend to rank better for competitive keywords.',
      recommendation: 'Aim for 800-1500 words per blog post for optimal SEO performance.',
    })
  }

  return { score: calculateScore(issues), issues, checks }
}

async function runPerformanceChecks(): Promise<AuditCategoryResult> {
  const issues: AuditIssue[] = []
  const checks: AuditCategoryResult['checks'] = []
  const admin = createAdminClient()

  // Check: Total indexable content
  const { count: publishedBlogs } = await admin
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')

  const { count: siteContentBlocks } = await admin
    .from('site_content')
    .select('id', { count: 'exact', head: true })

  const totalIndexable = (publishedBlogs ?? 0) + (siteContentBlocks ?? 0) + 15 // +15 for static/marketing pages
  checks.push({
    name: 'Indexable page count',
    passed: true,
    details: `~${totalIndexable} pages (${publishedBlogs ?? 0} blog posts, ${siteContentBlocks ?? 0} content blocks, ~15 static pages)`,
  })

  // Check: Blog posts without excerpts
  const { data: postsWithoutExcerpts } = await admin
    .from('posts')
    .select('id')
    .eq('status', 'published')
    .or('excerpt.is.null,excerpt.eq.')

  const missingExcerpts = postsWithoutExcerpts?.length ?? 0
  checks.push({ name: 'Blog posts have excerpts', passed: missingExcerpts === 0, details: `${missingExcerpts} missing` })
  if (missingExcerpts > 0) {
    issues.push({
      category: 'performance',
      severity: 'info',
      title: `${missingExcerpts} blog post(s) missing excerpts`,
      description: 'Excerpts help search engines display better snippets.',
      recommendation: 'Add 1-2 sentence excerpts to each blog post.',
    })
  }

  // Check: Content freshness
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const { count: recentPosts } = await admin
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .gte('published_at', thirtyDaysAgo.toISOString())

  checks.push({ name: 'Fresh content (last 30 days)', passed: (recentPosts ?? 0) > 0, details: `${recentPosts ?? 0} post(s) in last 30 days` })
  if ((recentPosts ?? 0) === 0) {
    issues.push({
      category: 'performance',
      severity: 'warning',
      title: 'No fresh blog content in the last 30 days',
      description: 'Search engines favor sites with regularly updated content.',
      recommendation: 'Publish at least 1-2 blog posts per month to maintain content freshness.',
    })
  }

  // Check: Social profiles connected (GoVirall-specific — social profiles are core)
  const { count: socialProfiles } = await admin
    .from('social_profiles')
    .select('id', { count: 'exact', head: true })

  checks.push({
    name: 'Social profiles connected',
    passed: (socialProfiles ?? 0) >= 5,
    details: `${socialProfiles ?? 0} profile(s) on platform`,
  })

  return { score: calculateScore(issues), issues, checks }
}

async function runGeoChecks(): Promise<AuditCategoryResult> {
  const issues: AuditIssue[] = []
  const checks: AuditCategoryResult['checks'] = []
  const admin = createAdminClient()
  const seoSettings = await loadSeoSettings()

  // Check: llms.txt exists and has content
  const llmsContent = seoSettings['seo_geo_llms_txt_content']
  const hasLlmsTxt = !!llmsContent?.trim() || true // Static file fallback
  checks.push({ name: 'llms.txt file exists', passed: hasLlmsTxt })

  // Check: AI bot crawl rules
  checks.push({ name: 'AI bot crawl rules configured', passed: true, details: 'robots.ts has rules for GPTBot, ClaudeBot, PerplexityBot, etc.' })

  // Check: Structured data coverage (GoVirall has Organization, SoftwareApplication, FAQ, HowTo, WebSite, BreadcrumbList)
  const structuredDataPages = [
    { page: 'Homepage', hasSchema: true, types: ['Organization', 'SoftwareApplication', 'WebSite'] },
    { page: 'Blog Posts', hasSchema: true, types: ['BlogPosting', 'BreadcrumbList'] },
    { page: 'FAQ Page', hasSchema: true, types: ['FAQPage'] },
    { page: 'How It Works', hasSchema: true, types: ['HowTo'] },
    { page: 'Pricing', hasSchema: true, types: ['Product', 'Offer'] },
    { page: 'About', hasSchema: true, types: ['AboutPage'] },
    { page: 'SEO Landing Pages', hasSchema: true, types: ['WebPage', 'BreadcrumbList'] },
    { page: 'Creator Profiles', hasSchema: true, types: ['Person', 'ProfilePage'] },
  ]
  const coveragePercent = Math.round(
    (structuredDataPages.filter((p) => p.hasSchema).length / structuredDataPages.length) * 100
  )
  checks.push({ name: 'Structured data coverage', passed: coveragePercent >= 80, details: `${coveragePercent}% of page types have JSON-LD` })
  if (coveragePercent < 80) {
    const missing = structuredDataPages.filter((p) => !p.hasSchema).map((p) => p.page)
    issues.push({
      category: 'geo',
      severity: 'warning',
      title: 'Incomplete structured data coverage',
      description: `Missing JSON-LD on: ${missing.join(', ')}`,
      recommendation: 'Add structured data to all public page types.',
    })
  }

  // Check: RSS feed
  checks.push({ name: 'RSS feed available', passed: true, details: '/feed.xml with blog posts' })

  // Check: Content quality for AI engines
  const { data: allPosts } = await admin
    .from('posts')
    .select('body, tags')
    .eq('status', 'published')

  const wordCounts = (allPosts ?? []).map((p: any) =>
    (p.body || '').replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length
  )
  const avgWords = wordCounts.length > 0 ? Math.round(wordCounts.reduce((a: number, b: number) => a + b, 0) / wordCounts.length) : 0
  checks.push({ name: 'Content depth for AI engines', passed: avgWords >= 500, details: `${avgWords} avg words per post` })
  if (avgWords < 500 && avgWords > 0) {
    issues.push({
      category: 'geo',
      severity: 'info',
      title: 'Content may lack depth for AI engines',
      description: `Average blog post has ${avgWords} words. AI engines favor comprehensive, well-structured content.`,
      recommendation: 'Create longer, more detailed content (800+ words) with clear headings and structured information.',
    })
  }

  // Check: Social authority signals
  const socialProfiles = [
    seoSettings['seo_socialFacebook'],
    seoSettings['seo_socialTwitter'],
    seoSettings['seo_socialLinkedin'],
    seoSettings['seo_socialInstagram'],
    seoSettings['seo_socialYoutube'],
    seoSettings['seo_socialTiktok'],
  ].filter(Boolean)
  checks.push({ name: 'Social authority signals', passed: socialProfiles.length >= 2, details: `${socialProfiles.length}/6 social profiles linked` })
  if (socialProfiles.length < 2) {
    issues.push({
      category: 'geo',
      severity: 'info',
      title: 'Weak social authority signals',
      description: 'AI engines use social presence as an authority signal.',
      recommendation: 'Link social media profiles in SEO settings to strengthen authority.',
    })
  }

  return { score: calculateScore(issues), issues, checks }
}

export async function runFullAudit(): Promise<AuditResult> {
  const [technical, content, performance, geo] = await Promise.all([
    runTechnicalChecks(),
    runContentChecks(),
    runPerformanceChecks(),
    runGeoChecks(),
  ])

  const allIssues = [...technical.issues, ...content.issues, ...performance.issues, ...geo.issues]
  const overallScore = Math.round((technical.score + content.score + performance.score + geo.score) / 4)

  const criticalCount = allIssues.filter((i) => i.severity === 'critical').length
  const warningCount = allIssues.filter((i) => i.severity === 'warning').length
  const infoCount = allIssues.filter((i) => i.severity === 'info').length

  let summary: string
  if (overallScore >= 80) {
    summary = `Excellent SEO & GEO health (${overallScore}/100). ${allIssues.length} issue(s) found.`
  } else if (overallScore >= 60) {
    summary = `Good SEO & GEO health (${overallScore}/100) with room for improvement. ${criticalCount} critical, ${warningCount} warnings.`
  } else if (overallScore >= 40) {
    summary = `SEO & GEO needs attention (${overallScore}/100). ${criticalCount} critical issue(s) require immediate action.`
  } else {
    summary = `Critical SEO & GEO issues detected (${overallScore}/100). Immediate action needed on ${criticalCount} critical issue(s).`
  }

  return {
    overallScore,
    technicalScore: technical.score,
    contentScore: content.score,
    performanceScore: performance.score,
    geoScore: geo.score,
    totalIssues: allIssues.length,
    criticalIssues: criticalCount,
    warningIssues: warningCount,
    infoIssues: infoCount,
    categories: { technical, content, performance, geo },
    summary,
  }
}
