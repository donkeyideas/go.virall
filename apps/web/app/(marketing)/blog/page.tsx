import type { Metadata } from 'next';
import Link from 'next/link';
import { createAdminClient } from '@govirall/db/admin';

export const metadata: Metadata = {
  title: 'Blog | Fintech Creator Insights & Social Media Strategy',
  description:
    'Expert guides on fintech content strategy, social media analytics, viral predictions, and financial influencer growth insights. Tips to grow your audience across 7 platforms.',
  keywords: [
    'fintech creator blog',
    'social media strategy',
    'content creator tips',
    'fintech content strategy AI',
    'financial influencer growth insights',
    'viral content tips',
    'creator economy blog',
  ],
};

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_url: string | null;
  tags: string[] | null;
  published_at: string;
}

async function getPublishedPosts(): Promise<BlogPost[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('blog_posts')
    .select('id, title, slug, excerpt, cover_url, tags, published_at')
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false });

  return (data ?? []) as BlogPost[];
}

export default async function BlogPage() {
  const posts = await getPublishedPosts();

  return (
    <main>
      {/* Hero */}
      <section style={{ padding: '100px 28px 60px', maxWidth: 900, margin: '0 auto' }}>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            letterSpacing: '.2em',
            opacity: 0.5,
            marginBottom: 20,
          }}
        >
          BLOG &amp; GUIDES
        </div>
        <h1
          style={{
            fontFamily: "'Fraunces', serif",
            fontWeight: 300,
            fontStyle: 'italic',
            fontSize: 'clamp(48px, 8vw, 96px)',
            lineHeight: 0.9,
            letterSpacing: '-.03em',
          }}
        >
          Creator{' '}
          <span style={{ fontWeight: 900, fontStyle: 'normal' }}>intelligence,</span>
          <br />
          written down.
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
          Expert guides on fintech content strategy, social media analytics, and
          financial influencer growth insights. Everything you need to grow
          smarter across 7 platforms.
        </p>
      </section>

      {/* Posts Grid */}
      <section style={{ padding: '0 28px 80px' }}>
        {posts.length === 0 ? (
          <div
            style={{
              maxWidth: 900,
              margin: '0 auto',
              padding: '60px 0',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: 24,
                fontWeight: 500,
                fontStyle: 'italic',
                opacity: 0.5,
              }}
            >
              Coming soon. We&apos;re writing our first posts.
            </p>
            <p style={{ fontSize: 14, opacity: 0.4, marginTop: 12 }}>
              In the meantime, explore our{' '}
              <Link href="/product" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>
                product features
              </Link>{' '}
              or{' '}
              <Link href="/intelligence" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>
                intelligence platform
              </Link>
              .
            </p>
          </div>
        ) : (
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
                  transition: 'transform 120ms ease, box-shadow 120ms ease',
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
                    {post.tags && post.tags.length > 0 && (
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 10,
                          letterSpacing: '.12em',
                          padding: '4px 10px',
                          border: '1px solid var(--ink)',
                          borderRadius: 999,
                          opacity: 0.6,
                        }}
                      >
                        {post.tags[0].toUpperCase()}
                      </span>
                    )}
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
                    <p
                      style={{
                        fontSize: 14,
                        lineHeight: 1.6,
                        opacity: 0.7,
                      }}
                    >
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
        )}
      </section>
    </main>
  );
}
