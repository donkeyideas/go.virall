import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@govirall/db/admin';
import { JsonLd, breadcrumbSchema } from '../../../../../lib/seo/json-ld';

export const revalidate = 3600;
export const dynamicParams = true;

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.govirall.com';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_url: string | null;
  tags: string[] | null;
  published_at: string;
}

/**
 * Tag chips link to the lowercased tag (see blog index + post pages), but tags
 * are stored in their original case in the DB. Resolve the canonical (stored)
 * casing for a lowercased slug so the case-sensitive `@>` contains query matches.
 */
async function getCanonicalTag(tagLower: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('blog_posts')
    .select('tags')
    .eq('status', 'published')
    .not('published_at', 'is', null);

  for (const row of (data ?? []) as { tags: string[] | null }[]) {
    for (const t of row.tags ?? []) {
      if (t.toLowerCase() === tagLower) return t;
    }
  }
  return null;
}

async function getPostsByTag(canonicalTag: string): Promise<BlogPost[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('blog_posts')
    .select('id, title, slug, excerpt, cover_url, tags, published_at')
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .contains('tags', [canonicalTag])
    .order('published_at', { ascending: false });

  return (data ?? []) as BlogPost[];
}

export async function generateStaticParams() {
  const admin = createAdminClient();
  const { data } = await admin
    .from('blog_posts')
    .select('tags')
    .eq('status', 'published')
    .not('published_at', 'is', null);

  const tags = new Set<string>();
  for (const row of (data ?? []) as { tags: string[] | null }[]) {
    for (const t of row.tags ?? []) {
      if (t.trim()) tags.add(t.toLowerCase());
    }
  }

  return Array.from(tags).map((tag) => ({ tag: encodeURIComponent(tag) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag } = await params;
  const tagLower = decodeURIComponent(tag).toLowerCase();
  const canonical = await getCanonicalTag(tagLower);
  if (!canonical) return { title: 'Topic Not Found' };

  const title = `${canonical} Guides & Insights | Go Virall Blog`;
  const description = `Expert ${canonical.toLowerCase()} articles, strategies, and growth insights for creators. Browse every Go Virall blog post tagged ${canonical.toLowerCase()}.`;

  return {
    title,
    description,
    alternates: { canonical: `/blog/tag/${encodeURIComponent(tagLower)}` },
    openGraph: { title, description, type: 'website' },
  };
}

export default async function BlogTagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;
  const tagLower = decodeURIComponent(tag).toLowerCase();

  const canonical = await getCanonicalTag(tagLower);
  if (!canonical) notFound();

  const posts = await getPostsByTag(canonical);
  // Avoid thin pages — a cluster needs at least one published post.
  if (posts.length === 0) notFound();

  const crumbs = breadcrumbSchema([
    { name: 'Home', url: `${BASE}/` },
    { name: 'Blog', url: `${BASE}/blog` },
    { name: canonical, url: `${BASE}/blog/tag/${encodeURIComponent(tagLower)}` },
  ]);

  return (
    <main>
      <JsonLd data={crumbs} />

      {/* Hero */}
      <section style={{ padding: '100px 28px 40px', maxWidth: 900, margin: '0 auto' }}>
        <Link
          href="/blog"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 24,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            letterSpacing: '.1em',
            color: 'var(--hot, #e63946)',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          &larr; ALL POSTS
        </Link>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            letterSpacing: '.2em',
            opacity: 0.5,
            marginBottom: 20,
          }}
        >
          TOPIC &middot; {canonical.toUpperCase()}
        </div>
        <h1
          style={{
            fontFamily: "'Fraunces', serif",
            fontWeight: 300,
            fontStyle: 'italic',
            fontSize: 'clamp(40px, 7vw, 80px)',
            lineHeight: 0.95,
            letterSpacing: '-.03em',
          }}
        >
          <span style={{ fontWeight: 900, fontStyle: 'normal' }}>{canonical}</span>
          <br />
          guides &amp; insights.
        </h1>
        <p
          style={{
            fontSize: 16,
            lineHeight: 1.6,
            maxWidth: 560,
            marginTop: 28,
            color: '#555',
          }}
        >
          Every Go Virall article on {canonical.toLowerCase()} — strategies, analytics,
          and growth insights for fintech creators across 7 platforms.
        </p>
      </section>

      {/* Posts Grid */}
      <section style={{ padding: '0 28px 80px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 20,
            maxWidth: 960,
            margin: '0 auto',
          }}
        >
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              style={{
                border: '1.5px solid var(--ink)',
                borderRadius: 16,
                padding: 28,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 260,
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 14,
                  }}
                >
                  <time
                    dateTime={post.published_at}
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      letterSpacing: '.1em',
                      opacity: 0.5,
                    }}
                  >
                    {new Date(post.published_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </time>
                </div>
                <h2
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontWeight: 900,
                    fontSize: 24,
                    letterSpacing: '-.02em',
                    lineHeight: 1.15,
                    marginBottom: 10,
                  }}
                >
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.7 }}>
                    {post.excerpt}
                  </p>
                )}
              </div>
              <div
                style={{
                  marginTop: 20,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  letterSpacing: '.1em',
                  opacity: 0.6,
                }}
              >
                READ &rarr;
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Cluster -> product internal links */}
      <section
        style={{
          padding: '60px 28px',
          borderTop: '1.5px solid var(--ink)',
          maxWidth: 900,
          margin: '0 auto',
        }}
      >
        <h3
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            letterSpacing: '.2em',
            opacity: 0.5,
            marginBottom: 24,
          }}
        >
          PUT IT INTO PRACTICE
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 20,
          }}
        >
          {[
            { href: '/product', label: 'Product', copy: 'Viral scoring, AI Studio, and cross-platform creator metrics.' },
            { href: '/intelligence', label: 'Intelligence', copy: 'AI content strategy and financial influencer growth insights.' },
            { href: '/pricing', label: 'Pricing', copy: 'Start your fintech creator analytics free trial. No card required.' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                border: '1.5px solid var(--ink)',
                borderRadius: 16,
                padding: 24,
                textDecoration: 'none',
                color: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <span
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontWeight: 900,
                  fontSize: 22,
                  letterSpacing: '-.02em',
                }}
              >
                {link.label}
              </span>
              <span style={{ fontSize: 13, lineHeight: 1.5, opacity: 0.7 }}>{link.copy}</span>
              <span
                style={{
                  marginTop: 8,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  letterSpacing: '.1em',
                  opacity: 0.6,
                }}
              >
                EXPLORE &rarr;
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
