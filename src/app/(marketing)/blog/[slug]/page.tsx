import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getPostBySlug, getPublishedPosts } from "@/lib/dal/public";
import { MarketingNav } from "@/components/marketing/Nav";
import { MarketingFooter } from "@/components/marketing/Footer";
import { ArrowLeft } from "lucide-react";

const C = {
  bg: "#0B1928",
  card: "#112240",
  primary: "#FFB84D",
  purple: "#4B9CD3",
  text: "#E8F0FA",
  textSecondary: "#8BACC8",
  border: "rgba(75,156,211,0.12)",
} as const;

const font = "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt ?? post.content.slice(0, 160),
    openGraph: {
      title: post.title,
      description: post.excerpt ?? post.content.slice(0, 160),
      type: "article",
      publishedTime: post.published_at ?? undefined,
    },
  };
}

export async function generateStaticParams() {
  const posts = await getPublishedPosts(100);
  return posts.map((post) => ({ slug: post.slug }));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  return (
    <main
      style={{
        fontFamily: font,
        background: C.bg,
        color: C.text,
        lineHeight: 1.6,
        minHeight: "100vh",
      }}
    >
      <MarketingNav />

      <article
        style={{
          maxWidth: 800,
          margin: "0 auto",
          padding: "140px 40px 100px",
        }}
      >
        <Link
          href="/blog"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: C.textSecondary,
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 500,
            marginBottom: 32,
          }}
        >
          <ArrowLeft size={16} /> Back to Blog
        </Link>

        <h1
          style={{
            fontSize: "clamp(32px, 5vw, 48px)",
            fontWeight: 800,
            letterSpacing: -1.5,
            lineHeight: 1.15,
            marginBottom: 16,
          }}
        >
          {post.title}
        </h1>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 48,
          }}
        >
          <span style={{ fontSize: 14, color: C.textSecondary }}>
            {formatDate(post.published_at || post.created_at)}
          </span>
          {post.tags.length > 0 && (
            <div style={{ display: "flex", gap: 8 }}>
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    padding: "4px 12px",
                    borderRadius: 100,
                    fontSize: 11,
                    background: "rgba(75,156,211,0.12)",
                    color: C.purple,
                    fontWeight: 600,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <style
          dangerouslySetInnerHTML={{
            __html: `
.bc h2 { font-size:1.75rem; font-weight:800; letter-spacing:-0.03em; line-height:1.25; margin:2.5rem 0 1rem; color:#E8F0FA; }
.bc h3 { font-size:1.3rem; font-weight:700; letter-spacing:-0.02em; line-height:1.3; margin:2rem 0 0.75rem; color:#E8F0FA; }
.bc h4 { font-size:1.1rem; font-weight:700; line-height:1.4; margin:1.5rem 0 0.5rem; color:#E8F0FA; }
.bc p { margin:0 0 1.25rem; font-size:1.065rem; line-height:1.85; color:#d4cce6; }
.bc a { color:#FFB84D; text-decoration:underline; text-underline-offset:3px; text-decoration-thickness:1px; }
.bc a:hover { color:#ffd280; }
.bc strong, .bc b { color:#E8F0FA; font-weight:700; }
.bc em, .bc i { font-style:italic; }
.bc ul, .bc ol { margin:0.5rem 0 1.5rem 1.5rem; padding:0; }
.bc ul { list-style-type:disc; }
.bc ol { list-style-type:decimal; }
.bc li { margin-bottom:0.5rem; font-size:1.065rem; line-height:1.75; color:#d4cce6; }
.bc li::marker { color:#4B9CD3; }
.bc blockquote { border-left:4px solid #4B9CD3; margin:1.5rem 0; padding:1rem 1.5rem; background:rgba(75,156,211,0.08); border-radius:0 12px 12px 0; font-style:italic; color:#c4b8e0; }
.bc blockquote p { margin-bottom:0; color:inherit; }
.bc img { max-width:100%; height:auto; border-radius:12px; margin:1.5rem 0; }
.bc hr { border:none; border-top:1px solid rgba(75,156,211,0.15); margin:2.5rem 0; }
.bc code { background:rgba(75,156,211,0.12); padding:0.15em 0.4em; border-radius:4px; font-size:0.9em; color:#c4b8e0; }
.bc pre { background:rgba(75,156,211,0.08); border:1px solid rgba(75,156,211,0.12); border-radius:12px; padding:1.25rem; overflow-x:auto; margin:1.5rem 0; }
.bc pre code { background:none; padding:0; }
.bc table { width:100%; border-collapse:collapse; margin:1.5rem 0; }
.bc th, .bc td { border:1px solid rgba(75,156,211,0.12); padding:0.75rem 1rem; text-align:left; font-size:0.95rem; }
.bc th { background:rgba(75,156,211,0.1); font-weight:700; color:#E8F0FA; }
.bc td { color:#d4cce6; }
.bc > h2:first-child { margin-top:0; }
`,
          }}
        />
        <div
          style={{
            fontSize: 17,
            lineHeight: 1.8,
            color: C.text,
          }}
          className="bc"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>

      <MarketingFooter />
    </main>
  );
}
