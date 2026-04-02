import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://govirall.com";

export const metadata: Metadata = {
  title: {
    default: "Go Virall — Social Intelligence Platform for Creators",
    template: "%s | Go Virall",
  },
  description:
    "Go Virall is the social intelligence platform that helps influencers and content creators grow faster with deep analytics, smart content strategy, audience intelligence, and revenue tracking across Instagram, TikTok, YouTube, X, and LinkedIn.",
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Go Virall — Social Intelligence Platform for Creators",
    description:
      "Smart social media analytics, content strategy, viral score prediction, and growth tools for influencers and creators across Instagram, TikTok, YouTube, X, and LinkedIn.",
    url: SITE_URL,
    siteName: "Go Virall",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Go Virall — Social Intelligence Platform showing analytics dashboard, smart strategist chat, and content strategy tools",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Go Virall — Social Intelligence Platform for Creators",
    description:
      "Smart analytics and content strategy for influencers. Grow faster on Instagram, TikTok, YouTube, X, and LinkedIn.",
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
    "social media analytics",
    "creator tools",
    "influencer analytics",
    "smart content strategy",
    "social media growth",
    "Instagram analytics",
    "TikTok analytics",
    "YouTube analytics",
    "viral content predictor",
    "audience intelligence",
    "creator monetization",
    "social media management",
    "Go Virall",
    "social intelligence platform",
  ],
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
