import type { PageAudit } from './types';

/* ---------- HTML parsing helpers (no cheerio needed) ---------- */

function extractTag(html: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m = html.match(re);
  return m ? m[1].trim() : '';
}

function extractMeta(html: string, name: string): string {
  // Match both name= and property=
  const re = new RegExp(
    `<meta\\s+(?:[^>]*?(?:name|property)=["']${name}["'][^>]*?content=["']([^"']*?)["']|[^>]*?content=["']([^"']*?)["'][^>]*?(?:name|property)=["']${name}["'])`,
    'i',
  );
  const m = html.match(re);
  return m ? (m[1] ?? m[2] ?? '').trim() : '';
}

function extractCanonical(html: string): string {
  const re = /<link\s+[^>]*?rel=["']canonical["'][^>]*?href=["']([^"']*?)["']/i;
  const m = html.match(re);
  return m ? m[1].trim() : '';
}

function countTag(html: string, tag: string): number {
  const re = new RegExp(`<${tag}[\\s>]`, 'gi');
  return (html.match(re) ?? []).length;
}

function extractFirstTag(html: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m = html.match(re);
  return m ? m[1].replace(/<[^>]*>/g, '').trim() : '';
}

function countImages(html: string): { total: number; withAlt: number; withoutAlt: number } {
  const imgs = html.match(/<img\s[^>]*>/gi) ?? [];
  let withAlt = 0;
  let withoutAlt = 0;
  for (const img of imgs) {
    if (/alt=["'][^"']+["']/i.test(img)) {
      withAlt++;
    } else {
      withoutAlt++;
    }
  }
  return { total: imgs.length, withAlt, withoutAlt };
}

function countWords(html: string): number {
  // Strip all tags then count words
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text ? text.split(/\s+/).length : 0;
}

function extractSchemaTypes(html: string): string[] {
  const types: string[] = [];
  const scripts = html.match(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  for (const script of scripts) {
    const content = script.replace(/<[^>]*>/g, '');
    try {
      const data = JSON.parse(content);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item['@type']) {
          const t = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
          types.push(...t);
        }
      }
    } catch {
      // Invalid JSON-LD, skip
    }
  }
  return types;
}

function countLinks(html: string, baseUrl: string): { internal: number; external: number } {
  const links = html.match(/<a\s[^>]*href=["']([^"'#]*?)["']/gi) ?? [];
  let internal = 0;
  let external = 0;
  const base = new URL(baseUrl);
  for (const link of links) {
    const hrefMatch = link.match(/href=["']([^"'#]*?)["']/i);
    if (!hrefMatch) continue;
    const href = hrefMatch[1];
    if (!href || href === '' || href === '/') {
      internal++;
    } else if (href.startsWith('/') || href.startsWith(base.origin)) {
      internal++;
    } else if (href.startsWith('http')) {
      external++;
    }
  }
  return { internal, external };
}

function hasCtaButton(html: string): boolean {
  // Look for buttons or links with CTA-like text
  const ctaPatterns = /(?:sign\s*up|get\s*started|start\s*free|try\s*free|join|create\s*account|subscribe|buy|purchase)/i;
  const buttons = html.match(/<(?:button|a)\s[^>]*>[\s\S]*?<\/(?:button|a)>/gi) ?? [];
  return buttons.some((b) => ctaPatterns.test(b));
}

function hasViewportMeta(html: string): boolean {
  return /<meta\s[^>]*name=["']viewport["']/i.test(html);
}

/* ---------- Page audit ---------- */

async function auditPage(url: string, baseUrl: string): Promise<PageAudit | null> {
  try {
    const start = Date.now();
    const res = await fetch(url, {
      headers: { 'User-Agent': 'GoVirallSEOBot/1.0' },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });
    const loadTimeMs = Date.now() - start;
    const html = await res.text();

    const title = extractTag(html, 'title');
    const description = extractMeta(html, 'description');
    const h1 = extractFirstTag(html, 'h1');
    const imgs = countImages(html);
    const schemaTypes = extractSchemaTypes(html);
    const links = countLinks(html, baseUrl);
    const parsedUrl = new URL(url);

    return {
      url,
      path: parsedUrl.pathname,
      status: res.status,
      title,
      titleLength: title.length,
      description,
      descriptionLength: description.length,
      h1,
      h1Count: countTag(html, 'h1'),
      h2Count: countTag(html, 'h2'),
      wordCount: countWords(html),
      imageCount: imgs.total,
      imagesWithAlt: imgs.withAlt,
      imagesWithoutAlt: imgs.withoutAlt,
      hasOgImage: !!extractMeta(html, 'og:image'),
      hasOgTitle: !!extractMeta(html, 'og:title'),
      hasOgDescription: !!extractMeta(html, 'og:description'),
      hasCanonical: !!extractCanonical(html),
      canonicalUrl: extractCanonical(html),
      hasSchemaOrg: schemaTypes.length > 0,
      schemaTypes,
      internalLinks: links.internal,
      externalLinks: links.external,
      hasFaqSchema: schemaTypes.includes('FAQPage'),
      hasHowToSchema: schemaTypes.includes('HowTo'),
      hasBreadcrumbSchema: schemaTypes.includes('BreadcrumbList'),
      hasOrganizationSchema: schemaTypes.includes('Organization'),
      hasWebSiteSchema: schemaTypes.includes('WebSite'),
      hasSoftwareAppSchema: schemaTypes.includes('SoftwareApplication'),
      hasCtaButton: hasCtaButton(html),
      hasViewport: hasViewportMeta(html),
      loadTimeMs,
    };
  } catch {
    return null;
  }
}

/* ---------- Sitemap URL extraction ---------- */

async function getSitemapUrls(baseUrl: string): Promise<string[]> {
  try {
    const res = await fetch(`${baseUrl}/sitemap.xml`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const urls: string[] = [];
    const matches = xml.matchAll(/<loc>\s*(.*?)\s*<\/loc>/gi);
    for (const m of matches) {
      if (m[1]) urls.push(m[1]);
    }
    return urls;
  } catch {
    return [];
  }
}

/* ---------- Main crawler ---------- */

export async function crawlSite(baseUrl: string, maxPages = 30): Promise<PageAudit[]> {
  // Normalize base URL
  const base = baseUrl.replace(/\/$/, '');

  // Get URLs from sitemap
  const sitemapUrls = await getSitemapUrls(base);

  // Start with homepage + sitemap URLs
  const urlsToVisit = new Set<string>([base, ...sitemapUrls]);

  const pages: PageAudit[] = [];
  const visited = new Set<string>();

  for (const url of urlsToVisit) {
    if (visited.has(url) || pages.length >= maxPages) break;
    visited.add(url);

    const page = await auditPage(url, base);
    if (page) {
      pages.push(page);
    }
  }

  return pages;
}
