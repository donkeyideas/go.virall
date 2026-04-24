'use server';

import { requireAdmin, writeAuditLog } from './index';
import { crawlSite } from '@govirall/core';
import { scoreAll } from '@govirall/core';
import { generateIssues } from '@govirall/core';
import type { SeoAuditResult } from '@govirall/core';

/**
 * Runs a full SEO audit against the live site.
 * Crawls pages, scores them, and generates issues/recommendations.
 */
export async function runSeoAudit(): Promise<
  { success: true; data: SeoAuditResult } | { success: false; error: string }
> {
  try {
    const { user, admin } = await requireAdmin();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.govirall.com';

    // Crawl the site
    const pages = await crawlSite(baseUrl, 30);

    if (pages.length === 0) {
      return { success: false, error: 'Could not crawl any pages. Check if the site is accessible.' };
    }

    // Check for robots.txt and sitemap.xml
    let hasRobotsTxt = false;
    let hasSitemap = false;
    try {
      const robotsRes = await fetch(`${baseUrl}/robots.txt`, { signal: AbortSignal.timeout(5000) });
      hasRobotsTxt = robotsRes.ok;
    } catch { /* ignore */ }
    try {
      const sitemapRes = await fetch(`${baseUrl}/sitemap.xml`, { signal: AbortSignal.timeout(5000) });
      hasSitemap = sitemapRes.ok;
    } catch { /* ignore */ }

    // Score everything
    const { scores, scoreBreakdowns } = scoreAll(pages, hasRobotsTxt, hasSitemap);

    // Generate issues
    const issues = generateIssues(pages);

    const healthyPages = pages.filter((p) => p.status >= 200 && p.status < 400).length;
    const criticalIssues = issues.filter((i) => i.severity === 'error').length;

    const result: SeoAuditResult = {
      crawledAt: new Date().toISOString(),
      baseUrl,
      pages,
      scores,
      scoreBreakdowns,
      issues,
      summary: {
        totalPages: pages.length,
        healthyPages,
        pagesWithErrors: pages.length - healthyPages,
        totalIssues: issues.length,
        criticalIssues,
      },
    };

    // Log the audit action
    await writeAuditLog(admin, user.id, 'seo_audit_run', 'seo', undefined, {
      pagesScanned: pages.length,
      overallScore: scores.overall,
    });

    return { success: true, data: result };
  } catch (err) {
    console.error('[SEO Audit] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
