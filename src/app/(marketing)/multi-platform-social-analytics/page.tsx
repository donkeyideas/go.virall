import type { Metadata } from "next";
import { SeoLandingPage } from "@/components/marketing/SeoLandingPage";

export const metadata: Metadata = {
  title: "Multi-Platform Social Analytics for Creators — Go Virall",
  description:
    "Unify your social media analytics across Instagram, TikTok, YouTube, X, and LinkedIn in one dashboard. Go Virall provides multi-platform social analytics with cross-channel insights, audience demographics, and content performance tracking.",
  alternates: { canonical: "/multi-platform-social-analytics" },
  openGraph: {
    title: "Multi-Platform Social Analytics — Go Virall",
    description:
      "One dashboard for all your social media data. Cross-platform analytics, audience insights, and content performance for creators. Start free.",
    url: "https://govirall.com/multi-platform-social-analytics",
  },
};

export default function MultiPlatformAnalyticsPage() {
  return (
    <SeoLandingPage
      badge="Multi-Platform Social Analytics"
      h1="Multi-Platform Social"
      h1Highlight="Analytics"
      subtitle="Stop switching between five different analytics panels. Go Virall unifies your Instagram, TikTok, YouTube, X, and LinkedIn data into one powerful dashboard."
      introParagraphs={[
        "Managing a presence across multiple social platforms is the reality for every modern creator. But checking analytics separately on Instagram Insights, TikTok Analytics, YouTube Studio, X Analytics, and LinkedIn — that's hours wasted every week. <strong>Multi-platform social analytics</strong> from Go Virall consolidates all your data into a single, unified dashboard.",
        "Go Virall doesn't just aggregate numbers — it <strong>cross-references your performance across platforms</strong> to surface insights you'd never find in native analytics alone. Discover which platform drives the most engaged followers, compare content performance across channels, and identify opportunities to repurpose high-performing content from one platform to another.",
        "Our multi-platform analytics include <strong>follower growth tracking, engagement rate analysis, content performance rankings, audience demographics comparison, revenue attribution, and AI-powered growth recommendations</strong> — all updated in real-time. Whether you're active on two platforms or all five, Go Virall gives you the complete picture.",
      ]}
      features={[
        { title: "Unified Dashboard", description: "All five platforms — Instagram, TikTok, YouTube, X, and LinkedIn — displayed in one clean, real-time dashboard. No more tab-switching or spreadsheet consolidation." },
        { title: "Cross-Platform Comparison", description: "Compare engagement rates, follower growth, and content performance side-by-side across all your platforms. Identify your strongest channels instantly." },
        { title: "Audience Demographics per Platform", description: "Understand how your audiences differ across platforms. See demographic breakdowns including age, gender, location, and interests for each connected channel." },
        { title: "AI Content Recommendations", description: "Get AI-powered content ideas and strategy recommendations based on your cross-platform performance data. Identify which content formats work best on each channel." },
        { title: "Platform-Specific Metrics", description: "Track platform-specific KPIs: Instagram Reels views, TikTok watch time, YouTube subscriber conversion, X impressions, and LinkedIn post reach — all in one place." },
        { title: "Consolidated Reporting", description: "Generate professional cross-platform reports for brand deals and sponsorship pitches. Show aggregate reach, engagement, and audience data across your entire presence." },
      ]}
      comparisonTitle="Go Virall vs Other Platforms"
      comparisonRows={[
        { feature: "5 platforms in one dashboard", gv: true, others: "CreatorIQ, Upfluence (enterprise); Social Blade (surface data)" },
        { feature: "AI content generation", gv: true, others: "Not available" },
        { feature: "AI chat assistant", gv: true, others: "Upfluence (Jaice AI) only" },
        { feature: "Content calendar", gv: true, others: "CreatorIQ, Upfluence" },
        { feature: "Media kit builder", gv: true, others: "Not available" },
        { feature: "Mobile app", gv: true, others: "Not available" },
        { feature: "Built for individual creators", gv: true, others: "Enterprise or brand-focused" },
        { feature: "Free plan", gv: "$0/mo", others: "Social Blade (free); others enterprise pricing" },
      ]}
      faq={[
        { question: "What is multi-platform social analytics?", answer: "Multi-platform social analytics means tracking and analyzing your social media performance across multiple networks from a single tool. Instead of checking Instagram Insights, TikTok Analytics, and YouTube Studio separately, you see everything in one unified dashboard with cross-platform comparisons and insights." },
        { question: "Which platforms does Go Virall support?", answer: "Go Virall supports Instagram, TikTok, YouTube, X (formerly Twitter), and LinkedIn — the five major platforms for content creators. All connections use secure OAuth with read-only access." },
        { question: "Can I compare my performance across platforms?", answer: "Yes. Go Virall provides side-by-side comparisons of engagement rates, follower growth, content performance, and audience demographics across all your connected platforms. You can identify which channels drive the most value for your brand." },
        { question: "How is Go Virall different from HypeAuditor or CreatorIQ?", answer: "HypeAuditor analyzes public profile data without accessing your private metrics. CreatorIQ is an enterprise influencer marketing platform for brands at $1,000+/month. Go Virall connects directly to your accounts via OAuth for deep authenticated analytics, includes AI content strategy and viral prediction, and starts free — built specifically for individual creators." },
        { question: "Is my data safe when connecting multiple platforms?", answer: "Absolutely. Go Virall uses secure OAuth connections with read-only access for every platform. We never gain the ability to post, edit, or delete content on your behalf. All data is encrypted with 256-bit encryption." },
      ]}
      ctaHeading="Unify Your Analytics"
      ctaHighlight="Today"
      ctaSub="One dashboard. Five platforms. Unlimited insights. Start free."
      breadcrumbName="Multi-Platform Social Analytics"
      breadcrumbUrl="/multi-platform-social-analytics"
    />
  );
}
