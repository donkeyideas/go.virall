import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedPosts } from "@/lib/dal/public";
import { MarketingNav } from "@/components/marketing/Nav";
import { MarketingFooter } from "@/components/marketing/Footer";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Insights, tips, and strategies for social media growth from Go Virall.",
};

const C = {
  bg: "#1A1035",
  card: "#2A1B54",
  primary: "#FFB84D",
  purple: "#8B5CF6",
  text: "#F0ECF8",
  textSecondary: "#8A7AAE",
  border: "rgba(139,92,246,0.12)",
} as const;

const font = "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogPage() {
  const posts = await getPublishedPosts();

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

      <section
        style={{
          padding: "160px 40px 60px",
          textAlign: "center",
          maxWidth: 800,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "inline-block",
            background: "rgba(139,92,246,0.15)",
            border: "1px solid rgba(139,92,246,0.3)",
            color: C.purple,
            padding: "8px 20px",
            borderRadius: 100,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: "uppercase",
            marginBottom: 24,
          }}
        >
          Blog
        </div>
        <h1
          style={{
            fontSize: "clamp(36px, 5vw, 56px)",
            fontWeight: 800,
            letterSpacing: -2,
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          INSIGHTS &amp; <span style={{ color: C.primary }}>STRATEGIES</span>
        </h1>
        <p
          style={{
            fontSize: 18,
            color: C.textSecondary,
            maxWidth: 560,
            margin: "0 auto",
          }}
        >
          Tips, guides, and strategies to help you grow your social media
          presence and go viral.
        </p>
      </section>

      <section
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "0 40px 100px",
        }}
      >
        {posts.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 0",
              color: C.textSecondary,
              fontSize: 16,
            }}
          >
            No posts yet. Check back soon.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 24,
            }}
          >
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <article
                  style={{
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 20,
                    padding: 32,
                    height: "100%",
                    transition: "all 0.3s",
                  }}
                  className="lp-card-hover"
                >
                  <h2
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      letterSpacing: -0.5,
                      marginBottom: 12,
                      lineHeight: 1.3,
                    }}
                  >
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p
                      style={{
                        fontSize: 15,
                        color: C.textSecondary,
                        lineHeight: 1.7,
                        marginBottom: 20,
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {post.excerpt}
                    </p>
                  )}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    {post.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        style={{
                          padding: "4px 12px",
                          borderRadius: 100,
                          fontSize: 11,
                          background: "rgba(139,92,246,0.12)",
                          color: C.purple,
                          fontWeight: 600,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                    <span
                      style={{
                        fontSize: 13,
                        color: C.textSecondary,
                        marginLeft: "auto",
                      }}
                    >
                      {formatDate(post.published_at || post.created_at)}
                    </span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </section>

      <MarketingFooter />
    </main>
  );
}
