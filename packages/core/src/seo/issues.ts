import type { PageAudit, SeoIssue } from './types';

export function generateIssues(pages: PageAudit[]): SeoIssue[] {
  const issues: SeoIssue[] = [];

  for (const page of pages) {
    /* --- SEO --- */
    if (!page.title) {
      issues.push({
        severity: 'error',
        category: 'seo',
        message: `Missing title tag`,
        page: page.path,
        suggestion: 'Add a descriptive <title> tag between 30-60 characters.',
      });
    } else if (page.titleLength < 30) {
      issues.push({
        severity: 'warning',
        category: 'seo',
        message: `Title too short (${page.titleLength} chars)`,
        page: page.path,
        suggestion: 'Expand the title to 30-60 characters for better search visibility.',
      });
    } else if (page.titleLength > 60) {
      issues.push({
        severity: 'warning',
        category: 'seo',
        message: `Title too long (${page.titleLength} chars)`,
        page: page.path,
        suggestion: 'Shorten the title to under 60 characters to avoid truncation in SERPs.',
      });
    }

    if (!page.description) {
      issues.push({
        severity: 'error',
        category: 'seo',
        message: `Missing meta description`,
        page: page.path,
        suggestion: 'Add a meta description of 120-160 characters summarizing the page.',
      });
    } else if (page.descriptionLength < 120) {
      issues.push({
        severity: 'warning',
        category: 'seo',
        message: `Meta description too short (${page.descriptionLength} chars)`,
        page: page.path,
        suggestion: 'Expand the description to 120-160 characters.',
      });
    } else if (page.descriptionLength > 160) {
      issues.push({
        severity: 'info',
        category: 'seo',
        message: `Meta description slightly long (${page.descriptionLength} chars)`,
        page: page.path,
        suggestion: 'Consider trimming to 160 characters to avoid SERP truncation.',
      });
    }

    if (page.h1Count === 0) {
      issues.push({
        severity: 'error',
        category: 'seo',
        message: `Missing H1 tag`,
        page: page.path,
        suggestion: 'Add a single H1 heading that describes the main content.',
      });
    } else if (page.h1Count > 1) {
      issues.push({
        severity: 'warning',
        category: 'seo',
        message: `Multiple H1 tags (${page.h1Count})`,
        page: page.path,
        suggestion: 'Use only one H1 per page. Demote extras to H2.',
      });
    }

    if (!page.hasOgImage) {
      issues.push({
        severity: 'warning',
        category: 'seo',
        message: `Missing OG image`,
        page: page.path,
        suggestion: 'Add an og:image meta tag for better social sharing previews.',
      });
    }

    if (!page.hasCanonical) {
      issues.push({
        severity: 'warning',
        category: 'seo',
        message: `Missing canonical URL`,
        page: page.path,
        suggestion: 'Add a canonical link to prevent duplicate content issues.',
      });
    }

    /* --- Technical --- */
    if (page.status >= 400) {
      issues.push({
        severity: 'error',
        category: 'technical',
        message: `HTTP ${page.status} error`,
        page: page.path,
        suggestion: `Fix the server error or remove links to this page.`,
      });
    }

    if (!page.hasViewport) {
      issues.push({
        severity: 'error',
        category: 'technical',
        message: `Missing viewport meta tag`,
        page: page.path,
        suggestion: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.',
      });
    }

    /* --- Content --- */
    if (page.wordCount < 100 && page.path !== '/') {
      issues.push({
        severity: 'warning',
        category: 'content',
        message: `Thin content (${page.wordCount} words)`,
        page: page.path,
        suggestion: 'Add more content to reach at least 300 words for SEO value.',
      });
    }

    if (page.h2Count === 0 && page.wordCount > 200) {
      issues.push({
        severity: 'info',
        category: 'content',
        message: `No H2 subheadings`,
        page: page.path,
        suggestion: 'Break content into sections with H2 subheadings for readability and SEO.',
      });
    }

    if (page.imagesWithoutAlt > 0) {
      issues.push({
        severity: 'warning',
        category: 'content',
        message: `${page.imagesWithoutAlt} image(s) missing alt text`,
        page: page.path,
        suggestion: 'Add descriptive alt text to all images for accessibility and SEO.',
      });
    }

    /* --- AEO --- */
    if (!page.hasSchemaOrg && page.path === '/') {
      issues.push({
        severity: 'error',
        category: 'aeo',
        message: `Homepage missing structured data`,
        page: page.path,
        suggestion: 'Add Organization, WebSite, and SoftwareApplication JSON-LD schemas.',
      });
    }

    /* --- GEO --- */
    if (!page.hasOgTitle || !page.hasOgDescription) {
      issues.push({
        severity: 'warning',
        category: 'geo',
        message: `Incomplete OpenGraph tags`,
        page: page.path,
        suggestion: 'Add og:title and og:description for better AI engine citation.',
      });
    }

    /* --- CRO --- */
    if (page.path === '/' && !page.hasCtaButton) {
      issues.push({
        severity: 'error',
        category: 'cro',
        message: `Homepage missing call-to-action`,
        page: page.path,
        suggestion: 'Add a clear CTA button (e.g., "Start Free", "Sign Up").',
      });
    }

    if (page.loadTimeMs && page.loadTimeMs > 3000) {
      issues.push({
        severity: 'warning',
        category: 'cro',
        message: `Slow page load (${Math.round(page.loadTimeMs / 1000)}s)`,
        page: page.path,
        suggestion: 'Optimize images, reduce JavaScript, and enable caching.',
      });
    }
  }

  // Check for duplicate titles across pages
  const titleMap = new Map<string, string[]>();
  for (const p of pages) {
    if (p.title) {
      const existing = titleMap.get(p.title) ?? [];
      existing.push(p.path);
      titleMap.set(p.title, existing);
    }
  }
  for (const [title, paths] of titleMap) {
    if (paths.length > 1) {
      issues.push({
        severity: 'warning',
        category: 'technical',
        message: `Duplicate title "${title}" on ${paths.length} pages`,
        suggestion: `Make each page title unique. Found on: ${paths.join(', ')}`,
      });
    }
  }

  // Check for site-wide AEO issues
  const anyFaq = pages.some((p) => p.hasFaqSchema);
  if (!anyFaq) {
    issues.push({
      severity: 'warning',
      category: 'aeo',
      message: 'No FAQPage schema found on any page',
      suggestion: 'Add FAQPage JSON-LD to your FAQ page for rich results in search and AI answers.',
    });
  }

  const anyBreadcrumb = pages.some((p) => p.hasBreadcrumbSchema);
  if (!anyBreadcrumb) {
    issues.push({
      severity: 'info',
      category: 'geo',
      message: 'No BreadcrumbList schema found',
      suggestion: 'Add breadcrumb structured data to help search engines understand site hierarchy.',
    });
  }

  // Sort: errors first, then warnings, then info
  const severityOrder: Record<string, number> = { error: 0, warning: 1, info: 2 };
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return issues;
}
