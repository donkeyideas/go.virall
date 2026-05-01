import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@govirall/db/admin';
import { JsonLd } from '../../../../lib/seo/json-ld';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  cover_url: string | null;
  tags: string[] | null;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string;
  updated_at: string;
}

async function getPost(slug: string): Promise<BlogPost | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('blog_posts')
    .select('id, title, slug, excerpt, body, cover_url, tags, seo_title, seo_description, published_at, updated_at')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  return data as BlogPost | null;
}

async function getRelatedPosts(currentSlug: string): Promise<{ title: string; slug: string }[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('blog_posts')
    .select('title, slug')
    .eq('status', 'published')
    .neq('slug', currentSlug)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(3);

  return (data ?? []) as { title: string; slug: string }[];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: 'Post Not Found' };

  const title = post.seo_title || post.title;
  const description = post.seo_description || post.excerpt || `${post.title} - Go Virall Blog`;

  return {
    title,
    description,
    keywords: post.tags ?? undefined,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: post.published_at,
      modifiedTime: post.updated_at,
      ...(post.cover_url ? { images: [{ url: post.cover_url }] } : {}),
    },
    alternates: { canonical: `/blog/${post.slug}` },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const related = await getRelatedPosts(slug);

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt ?? undefined,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    image: post.cover_url ?? undefined,
    author: {
      '@type': 'Organization',
      name: 'Go Virall',
      url: 'https://www.govirall.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Go Virall',
      url: 'https://www.govirall.com',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://www.govirall.com/blog/${post.slug}`,
    },
    keywords: post.tags?.join(', '),
  };

  return (
    <main>
      <JsonLd data={articleSchema} />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 28px' }}>
        {/* Back to blog */}
        <Link
          href="/blog"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 28,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            letterSpacing: '.1em',
            color: 'var(--hot, #e63946)',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          &larr; BACK TO BLOG
        </Link>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 28, flexWrap: 'wrap' }}>
            {post.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  letterSpacing: '.12em',
                  padding: '5px 12px',
                  border: '1.5px solid var(--ink)',
                  borderRadius: 999,
                  opacity: 0.7,
                  fontWeight: 600,
                }}
              >
                {tag.toUpperCase()}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h1
          style={{
            fontFamily: "'Fraunces', serif",
            fontWeight: 900,
            fontSize: 'clamp(32px, 5vw, 52px)',
            lineHeight: 1.1,
            letterSpacing: '-.02em',
            marginTop: 20,
          }}
        >
          {post.title}
        </h1>

        {/* Author + Date */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 18,
            paddingBottom: 28,
            borderBottom: '1px solid var(--rule, #e0ddd4)',
          }}
        >
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              letterSpacing: '.08em',
              opacity: 0.6,
            }}
          >
            Go Virall Team
          </span>
          <span style={{ opacity: 0.3 }}>&middot;</span>
          <time
            dateTime={post.published_at}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              letterSpacing: '.08em',
              opacity: 0.6,
            }}
          >
            {new Date(post.published_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
        </div>

        {/* Excerpt */}
        {post.excerpt && (
          <p
            style={{
              fontSize: 19,
              lineHeight: 1.65,
              marginTop: 32,
              fontFamily: "'Fraunces', serif",
              fontWeight: 400,
              fontStyle: 'italic',
              opacity: 0.8,
            }}
          >
            {post.excerpt}
          </p>
        )}

        {/* Cover Image */}
        {post.cover_url && (
          <div style={{ marginTop: 32 }}>
            <img
              src={post.cover_url}
              alt={post.title}
              style={{
                width: '100%',
                borderRadius: 16,
                border: '1.5px solid var(--ink)',
                objectFit: 'cover',
                maxHeight: 420,
              }}
            />
          </div>
        )}

        {/* Body */}
        <article
          className="blog-body"
          style={{ marginTop: 40, paddingBottom: 60 }}
          dangerouslySetInnerHTML={{ __html: post.body }}
        />

        {/* Related Posts */}
        {related.length > 0 && (
          <section
            style={{
              paddingTop: 48,
              paddingBottom: 60,
              borderTop: '1.5px solid var(--ink)',
            }}
          >
            <h3
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                letterSpacing: '.2em',
                opacity: 0.5,
                marginBottom: 20,
              }}
            >
              MORE FROM THE BLOG
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/blog/${r.slug}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '18px 0',
                    borderBottom: '1px solid var(--rule, #e0ddd4)',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Fraunces', serif",
                      fontWeight: 700,
                      fontSize: 18,
                      letterSpacing: '-.01em',
                    }}
                  >
                    {r.title}
                  </span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 12,
                      opacity: 0.5,
                    }}
                  >
                    &rarr;
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* CTA */}
      <section
        style={{
          padding: '60px 28px',
          background: 'var(--ink)',
          color: 'var(--paper)',
          textAlign: 'center',
        }}
      >
        <h3
          style={{
            fontFamily: "'Fraunces', serif",
            fontWeight: 900,
            fontStyle: 'italic',
            fontSize: 'clamp(28px, 4vw, 48px)',
            letterSpacing: '-.02em',
            marginBottom: 16,
          }}
        >
          Ready to grow smarter?
        </h3>
        <p style={{ fontSize: 15, opacity: 0.7, maxWidth: 420, margin: '0 auto 28px' }}>
          Start your fintech creator analytics free trial. Viral scoring, AI Studio, and audience intelligence included.
        </p>
        <Link
          href="/signup"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '14px 28px',
            border: '1.5px solid var(--lime)',
            borderRadius: 999,
            fontWeight: 600,
            fontSize: 15,
            background: 'var(--lime)',
            color: 'var(--ink)',
            textDecoration: 'none',
          }}
        >
          Start free &rarr;
        </Link>
      </section>
    </main>
  );
}
