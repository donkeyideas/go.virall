import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://govirall.com";

export const metadata: Metadata = {
  title: {
    default:
      "Go Virall — Best Analytics for Content Creators | Social Intelligence Platform",
    template: "%s | Go Virall",
  },
  description:
    "Go Virall is the best analytics platform for content creators. Multi-platform social analytics, content optimization software, Instagram analytics for influencers, TikTok performance tracking, audience demographics tools, and AI-powered content strategy — all in one social intelligence platform. Free plan available.",
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title:
      "Go Virall — Best Analytics for Content Creators | Multi-Platform Social Analytics",
    description:
      "The social intelligence platform built for creators. Multi-platform analytics, content optimization, viral score prediction, audience demographics, and AI content strategy across Instagram, TikTok, YouTube, X, and LinkedIn. Start free.",
    url: SITE_URL,
    siteName: "Go Virall",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Go Virall — Best analytics for content creators with multi-platform social analytics dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Go Virall — Best Analytics for Content Creators",
    description:
      "Multi-platform social analytics, content optimization, and AI-powered strategy for creators. Free plan available.",
    images: ["/og-image.png"],
    creator: "@govirall",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  keywords: [
    "best analytics for content creators",
    "content optimization software",
    "multi-platform social analytics",
    "social intelligence platform",
    "Instagram analytics for influencers",
    "creator economy fintech",
    "TikTok performance tracking",
    "audience demographics tool",
    "audience analytics tools",
    "creator business intelligence",
    "content strategy software",
    "influencer marketing analytics",
    "social media analytics",
    "creator tools",
    "influencer analytics",
    "viral content predictor",
    "creator monetization",
    "Go Virall",
  ],
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
