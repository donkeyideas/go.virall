/* ---------- SEO Audit Types ---------- */

export type SeoIssueSeverity = 'error' | 'warning' | 'info';
export type SeoCategory = 'seo' | 'technical' | 'content' | 'aeo' | 'geo' | 'cro';

export interface SeoIssue {
  severity: SeoIssueSeverity;
  category: SeoCategory;
  message: string;
  page?: string;
  suggestion: string;
}

export interface ScoreBreakdown {
  score: number;
  maxScore: number;
  label: string;
  details: string[];
}

export interface PageAudit {
  url: string;
  path: string;
  status: number;
  title: string;
  titleLength: number;
  description: string;
  descriptionLength: number;
  h1: string;
  h1Count: number;
  h2Count: number;
  wordCount: number;
  imageCount: number;
  imagesWithAlt: number;
  imagesWithoutAlt: number;
  hasOgImage: boolean;
  hasOgTitle: boolean;
  hasOgDescription: boolean;
  hasCanonical: boolean;
  canonicalUrl: string;
  hasSchemaOrg: boolean;
  schemaTypes: string[];
  internalLinks: number;
  externalLinks: number;
  hasFaqSchema: boolean;
  hasHowToSchema: boolean;
  hasBreadcrumbSchema: boolean;
  hasOrganizationSchema: boolean;
  hasWebSiteSchema: boolean;
  hasSoftwareAppSchema: boolean;
  hasCtaButton: boolean;
  hasViewport: boolean;
  loadTimeMs?: number;
}

export interface SeoAuditResult {
  crawledAt: string;
  baseUrl: string;
  pages: PageAudit[];
  scores: {
    seo: number;
    technical: number;
    content: number;
    aeo: number;
    geo: number;
    cro: number;
    overall: number;
  };
  scoreBreakdowns: {
    seo: ScoreBreakdown[];
    technical: ScoreBreakdown[];
    content: ScoreBreakdown[];
    aeo: ScoreBreakdown[];
    geo: ScoreBreakdown[];
    cro: ScoreBreakdown[];
  };
  issues: SeoIssue[];
  summary: {
    totalPages: number;
    healthyPages: number;
    pagesWithErrors: number;
    totalIssues: number;
    criticalIssues: number;
  };
}
