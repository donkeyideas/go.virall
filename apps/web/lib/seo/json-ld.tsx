const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.govirall.com';

/* ---------- Schema builders ---------- */

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Go Virall',
    url: BASE,
    logo: `${BASE}/icon.png`,
    description:
      'The social intelligence platform for creators. Analytics, AI content studio, viral scoring, and audience insights across 7 platforms.',
    foundingDate: '2024',
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'info@donkeyideas.com',
      contactType: 'customer service',
    },
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Go Virall',
    url: BASE,
    description: 'The social intelligence platform for creators.',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${BASE}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function softwareAppSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Go Virall',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, iOS, Android',
    url: BASE,
    description:
      'Social intelligence platform for content creators. Viral score predictions, AI content studio, audience analytics, and SMO scoring across Instagram, TikTok, YouTube, X, LinkedIn, Facebook, and Twitch.',
    offers: [
      {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        name: 'Free',
        description: '1 connected account, 10 analyses/month, 5 content generations, 5 AI messages/day, Viral score',
      },
      {
        '@type': 'Offer',
        price: '29',
        priceCurrency: 'USD',
        name: 'Creator',
        description: 'Up to 10 accounts, unlimited analyses, unlimited content generations, full AI strategist access, audience intelligence, revenue tracking',
      },
    ],
    featureList: [
      'Viral Score 0-100',
      'AI Content Studio',
      'SMO Score',
      'Audience Intelligence',
      'Revenue Tracking',
      '7 Platform Support',
    ],
  };
}

/**
 * Product schema for the pricing page. Uses AggregateOffer (lowPrice/highPrice
 * derived from the plans) and per-plan Offers (same Offer shape as
 * softwareAppSchema). No aggregateRating — there's no real review data and
 * faking it risks a Google structured-data penalty.
 */
export function productSchema(plans: { name: string; priceMonthly: number }[]) {
  const prices = plans.map((p) => p.priceMonthly / 100);
  const lowPrice = prices.length ? Math.min(...prices) : 0;
  const highPrice = prices.length ? Math.max(...prices) : 0;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Go Virall',
    description:
      'Social intelligence platform for content creators. Viral score predictions, AI content studio, audience analytics, and SMO scoring across Instagram, TikTok, YouTube, X, LinkedIn, Facebook, and Twitch.',
    brand: { '@type': 'Brand', name: 'Go Virall' },
    url: `${BASE}/pricing`,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'USD',
      lowPrice: String(lowPrice),
      highPrice: String(highPrice),
      offerCount: plans.length,
      offers: plans.map((p) => ({
        '@type': 'Offer',
        name: p.name,
        price: String(p.priceMonthly / 100),
        priceCurrency: 'USD',
      })),
    },
  };
}

export function webPageSchema(title: string, description: string, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url,
    isPartOf: { '@type': 'WebSite', name: 'Go Virall', url: BASE },
  };
}

export function faqPageSchema(items: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/* ---------- Helper component ---------- */

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
