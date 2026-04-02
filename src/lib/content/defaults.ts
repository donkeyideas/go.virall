import type {
  HeroContent,
  TrustSignalsContent,
  AboutContent,
  PlatformsContent,
  HowItWorksContent,
  FeaturesContent,
  TestimonialsContent,
  PricingContent,
  FaqContent,
  CtaContent,
  FooterContent,
  HomeSectionName,
} from "@/types/site-content";

// ============================================================
// Homepage default content — used for DB seeding + fallback
// ============================================================

const hero: HeroContent = {
  badge: "Social Intelligence Platform",
  heading_line1: "STOP GUESSING.",
  heading_line2: "START GROWING.",
  subheading:
    "The social intelligence platform that turns raw data into viral content strategies. Built for creators who refuse to be average.",
  cta_text: "Start Free Trial",
  cta_subtitle: "No credit card required \u00b7 Free plan available forever",
};

const trust_signals: TrustSignalsContent = {
  items: [
    { icon: "Eye", text: "Read-Only Access" },
    { icon: "Lock", text: "256-bit Encryption" },
    { icon: "Clock", text: "Cancel Anytime" },
    { icon: "Shield", text: "SOC 2 Compliant" },
  ],
};

const about: AboutContent = {
  title_prefix: "WHAT IS",
  title_highlight: "GO VIRALL",
  body: "Go Virall is a social intelligence platform built for influencers, content creators, and social media professionals. It connects to Instagram, TikTok, YouTube, X (formerly Twitter), and LinkedIn to provide unified cross-platform analytics, smart content strategy, audience demographic intelligence, revenue tracking, and viral score prediction \u2014 helping creators turn raw social media data into actionable growth strategies.",
};

const platforms: PlatformsContent = {
  label: "Integrations",
  title_line1: "CONNECT YOUR PLATFORMS",
  title_line2: "IN SECONDS",
  subtitle:
    "Link your social accounts and start getting actionable insights immediately.",
  footnote:
    "Secure OAuth connection \u00b7 Read-only access \u00b7 Disconnect anytime",
};

const how_it_works: HowItWorksContent = {
  label: "How It Works",
  title_line1: "GET STARTED IN",
  title_line2: "3 SIMPLE STEPS",
  subtitle: "From sign-up to viral content in under 5 minutes.",
  steps: [
    {
      title: "Connect Your Accounts",
      description:
        "Link your Instagram, TikTok, YouTube, X, or LinkedIn accounts using secure OAuth. Read-only access means your data stays safe.",
    },
    {
      title: "Get Smart Insights",
      description:
        "Go Virall analyzes your content performance, audience demographics, and engagement patterns to generate personalized growth strategies.",
    },
    {
      title: "Create and Grow",
      description:
        "Use viral score predictions, optimal posting times, and smart content ideas to consistently grow your audience and revenue.",
    },
  ],
};

const features: FeaturesContent = {
  label: "Features",
  title_line1: "YOUR UNFAIR",
  title_line2: "ADVANTAGE",
  subtitle:
    "Every tool you need to dominate social media, powered by artificial intelligence that never sleeps.",
  items: [
    {
      icon: "BarChart3",
      title: "Deep Analytics",
      description:
        "Track every metric across every platform in real-time. Understand what drives engagement and revenue with granular data breakdowns.",
    },
    {
      icon: "Sun",
      title: "Smart Content Strategist",
      description:
        "Get personalized content recommendations, optimal posting times, and smart-generated captions tuned to your unique brand voice.",
    },
    {
      icon: "Users",
      title: "Audience Intelligence",
      description:
        "Know your audience better than they know themselves. Demographic breakdowns, interest mapping, and behavioral predictions.",
    },
    {
      icon: "CreditCard",
      title: "Revenue Tracking",
      description:
        "Monitor sponsorship deals, affiliate revenue, and product sales in one unified dashboard. Never miss a payment again.",
    },
    {
      icon: "CheckCircle",
      title: "Viral Score Predictor",
      description:
        "Our technology analyzes your content before you post and predicts its viral potential. Post with confidence, every time.",
    },
    {
      icon: "Activity",
      title: "Trend Detection",
      description:
        "Catch trends before they peak. Our technology scans millions of data points to surface emerging topics in your niche.",
    },
  ],
};

const testimonials: TestimonialsContent = {
  label: "Testimonials",
  title_line1: "WHAT CREATORS",
  title_line2: "ARE SAYING",
  subtitle:
    "See how creators are using Go Virall to level up their social media strategy.",
  items: [
    {
      quote:
        "Go Virall's smart strategist completely changed how I approach content. The viral score predictor takes the guesswork out of posting.",
      name: "Sarah C.",
      handle: "@sarahcreates",
      platform: "Instagram",
    },
    {
      quote:
        "I was posting blindly until I found Go Virall. Now I know exactly when to post, what to say, and how to grow.",
      name: "Marcus R.",
      handle: "@marcusrivera",
      platform: "TikTok",
    },
    {
      quote:
        "The audience intelligence feature alone is worth the price. I finally understand who's watching and what they want to see.",
      name: "Emma T.",
      handle: "@emmathompson",
      platform: "YouTube",
    },
  ],
};

const pricing: PricingContent = {
  label: "Pricing",
  title_line1: "INVEST IN",
  title_line2: "YOUR GROWTH",
  subtitle:
    "No hidden fees. No contracts. Cancel anytime. Start free and scale when you are ready.",
  footnote:
    "Need more? See all 5 plans on our full pricing page. Annual billing saves 20%.",
  tiers: [
    {
      tier: "Free",
      price: "$0",
      description:
        "Perfect for creators just getting started with data-driven content.",
      features: [
        "2 connected platforms",
        "10 AI analyses per month",
        "5 content generations per month",
        "5 chat messages per day",
        "7-day analytics trends",
      ],
      cta_text: "Get Started Free",
      is_primary: false,
      is_recommended: false,
    },
    {
      tier: "Creator",
      price: "$29",
      description:
        "For serious creators ready to accelerate their growth trajectory.",
      features: [
        "10 connected platforms",
        "200 smart analyses per month",
        "Real-time strategist",
        "Heat map scheduling",
        "Brand voice training",
      ],
      cta_text: "Start Free Trial",
      is_primary: true,
      is_recommended: true,
    },
    {
      tier: "Pro",
      price: "$59",
      description:
        "For power creators and growing teams managing multiple brands.",
      features: [
        "30 connected platforms",
        "1,000 smart analyses per month",
        "Unlimited brand deals CRM",
        "5 media kits + link pages",
        "Custom API access",
      ],
      cta_text: "Start Free Trial",
      is_primary: false,
      is_recommended: false,
    },
  ],
};

const faq: FaqContent = {
  label: "FAQ",
  title_line1: "FREQUENTLY ASKED",
  title_line2: "QUESTIONS",
  subtitle: "Everything you need to know about Go Virall.",
  items: [
    {
      question: "What is Go Virall?",
      answer:
        "Go Virall is a social intelligence platform designed for influencers and content creators. It provides deep analytics across Instagram, TikTok, YouTube, X (Twitter), and LinkedIn, along with smart content strategy, audience intelligence, revenue tracking, and viral score prediction \u2014 helping creators turn raw social media data into actionable growth strategies.",
    },
    {
      question: "How much does Go Virall cost?",
      answer:
        "Go Virall offers three pricing tiers: Free ($0/month with 2 connected platforms, 10 AI analyses, and 5 chat messages/day), Creator ($29/month with 10 platforms and 200 smart analyses), and Pro ($59/month with 30 platforms and 1,000 smart analyses). All paid plans include a free trial. Annual billing saves 20%. No credit card is required for the free plan.",
    },
    {
      question: "Which social media platforms does Go Virall support?",
      answer:
        "Go Virall integrates with five major social media platforms: Instagram, TikTok, YouTube, X (formerly Twitter), and LinkedIn. All connections use secure OAuth with read-only access, and you can disconnect any platform at any time.",
    },
    {
      question: "What is the Viral Score Predictor?",
      answer:
        "The Viral Score Predictor is Go Virall's smart analysis feature that evaluates your content before you post and predicts its viral potential. It scores content on a 0-100 scale and provides specific recommendations to improve performance, including optimal hashtags, posting time, and caption adjustments.",
    },
    {
      question: "How does the Smart Content Strategist work?",
      answer:
        "Go Virall's Smart Content Strategist analyzes your past 30 days of content performance and audience behavior to generate personalized recommendations. It suggests optimal posting times, content format ideas, captions tuned to your brand voice, trending topic alerts in your niche, and performance predictions for planned content.",
    },
    {
      question: "Can I try Go Virall for free?",
      answer:
        "Yes. Go Virall offers a completely free plan that includes 2 connected platforms, 10 AI analyses per month, 5 content generations, and 5 chat messages per day. No credit card is required. Paid plans (Creator and Pro) also come with a free trial so you can test premium features before committing.",
    },
    {
      question:
        "How is Go Virall different from Hootsuite or Sprout Social?",
      answer:
        "Unlike general-purpose social media management tools, Go Virall is purpose-built for content creators and influencers. It offers smart viral score prediction, personalized content strategy, creator-specific revenue tracking for sponsorships and affiliate deals, and audience intelligence \u2014 features that generic tools don't provide. Go Virall also starts free, while most alternatives start at $49+/month.",
    },
    {
      question: "Is my data safe with Go Virall?",
      answer:
        "Yes. Go Virall uses 256-bit encryption for all data in transit and at rest. Platform connections use OAuth with read-only access, meaning Go Virall can never post, edit, or delete content on your behalf. You can disconnect any platform and delete your data at any time.",
    },
  ],
};

const cta: CtaContent = {
  heading_prefix: "READY TO GO",
  heading_highlight: "VIRAL",
  subheading: "Stop guessing. Start growing. Your first analysis is free.",
  button_text: "Start Your Free Trial",
};

const footer: FooterContent = {
  description:
    "The social intelligence platform that transforms creators into cultural forces. Data-driven strategies, powerful insights.",
  copyright: "\u00a9 2026 Go Virall. All rights reserved.",
};

// ============================================================
// Export — map of section name → { content, sort_order }
// ============================================================

export const HOMEPAGE_DEFAULTS: Record<
  HomeSectionName,
  { content: Record<string, unknown>; sort_order: number }
> = {
  hero: { content: hero as unknown as Record<string, unknown>, sort_order: 1 },
  trust_signals: { content: trust_signals as unknown as Record<string, unknown>, sort_order: 2 },
  about: { content: about as unknown as Record<string, unknown>, sort_order: 3 },
  platforms: { content: platforms as unknown as Record<string, unknown>, sort_order: 4 },
  how_it_works: { content: how_it_works as unknown as Record<string, unknown>, sort_order: 5 },
  features: { content: features as unknown as Record<string, unknown>, sort_order: 6 },
  testimonials: { content: testimonials as unknown as Record<string, unknown>, sort_order: 7 },
  pricing: { content: pricing as unknown as Record<string, unknown>, sort_order: 8 },
  faq: { content: faq as unknown as Record<string, unknown>, sort_order: 9 },
  cta: { content: cta as unknown as Record<string, unknown>, sort_order: 10 },
  footer: { content: footer as unknown as Record<string, unknown>, sort_order: 11 },
};
