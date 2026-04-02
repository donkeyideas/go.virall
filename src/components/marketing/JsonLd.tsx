const SITE_URL = "https://govirall.com";

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Go Virall",
  url: SITE_URL,
  logo: `${SITE_URL}/icon-512.png`,
  description:
    "Go Virall is a social intelligence platform that provides deep analytics, content strategy, audience intelligence, revenue tracking, and viral score prediction for influencers and content creators across Instagram, TikTok, YouTube, X, and LinkedIn.",
  foundingDate: "2024",
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    url: SITE_URL,
  },
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Go Virall",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: SITE_URL,
  description:
    "Social intelligence platform with deep analytics, smart content strategy, audience intelligence, revenue tracking, viral score prediction, and trend detection for Instagram, TikTok, YouTube, X, and LinkedIn.",
  offers: [
    {
      "@type": "Offer",
      name: "Free",
      price: "0",
      priceCurrency: "USD",
      description:
        "1 connected platform, 10 smart analyses per month, 5 content generations, 5 chat messages per day",
    },
    {
      "@type": "Offer",
      name: "Creator",
      price: "29",
      priceCurrency: "USD",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "29",
        priceCurrency: "USD",
        billingDuration: "P1M",
      },
      description:
        "10 connected platforms, 200 smart analyses per month, real-time strategist, heat map scheduling, brand voice training",
    },
    {
      "@type": "Offer",
      name: "Pro",
      price: "59",
      priceCurrency: "USD",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "59",
        priceCurrency: "USD",
        billingDuration: "P1M",
      },
      description:
        "30 connected platforms, 1,000 smart analyses per month, unlimited brand deals CRM, 5 media kits, custom API access",
    },
  ],
  featureList: [
    "Cross-platform social media analytics for Instagram, TikTok, YouTube, X, and LinkedIn",
    "Smart content strategy and recommendations",
    "Audience intelligence with demographic and behavioral analysis",
    "Revenue and sponsorship tracking",
    "Viral score prediction",
    "Real-time trend detection",
    "Smart-generated captions and content ideas",
    "Heat map scheduling for optimal posting times",
  ],
};

export const FAQ_ITEMS = [
  {
    question: "What is Go Virall?",
    answer:
      "Go Virall is a social intelligence platform designed for influencers and content creators. It provides deep analytics across Instagram, TikTok, YouTube, X (Twitter), and LinkedIn, along with smart content strategy, audience intelligence, revenue tracking, and viral score prediction — helping creators turn raw social media data into actionable growth strategies.",
  },
  {
    question: "How much does Go Virall cost?",
    answer:
      "Go Virall offers three pricing tiers: Free ($0/month with 1 connected platform and 10 smart analyses), Creator ($29/month with 10 platforms and 200 smart analyses), and Pro ($59/month with 30 platforms and 1,000 smart analyses). All paid plans include a free trial. Annual billing saves 20%. No credit card is required for the free plan.",
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
      "Yes. Go Virall offers a completely free plan that includes 1 connected platform, 10 smart analyses per month, 5 content generations, and 5 chat messages per day. No credit card is required. Paid plans (Creator and Pro) also come with a free trial so you can test premium features before committing.",
  },
  {
    question: "How is Go Virall different from Hootsuite or Sprout Social?",
    answer:
      "Unlike general-purpose social media management tools, Go Virall is purpose-built for content creators and influencers. It offers smart viral score prediction, personalized content strategy, creator-specific revenue tracking for sponsorships and affiliate deals, and audience intelligence — features that generic tools don't provide. Go Virall also starts free, while most alternatives start at $49+/month.",
  },
  {
    question: "Is my data safe with Go Virall?",
    answer:
      "Yes. Go Virall uses 256-bit encryption for all data in transit and at rest. Platform connections use OAuth with read-only access, meaning Go Virall can never post, edit, or delete content on your behalf. You can disconnect any platform and delete your data at any time.",
  },
];

function buildFaqSchema(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Go Virall",
  url: SITE_URL,
  description:
    "Social intelligence platform for influencers and content creators.",
};

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Use Go Virall to Grow Your Social Media",
  description:
    "Get started with Go Virall in 3 simple steps to grow your social media audience and revenue.",
  step: [
    {
      "@type": "HowToStep",
      name: "Connect Your Accounts",
      text: "Link your Instagram, TikTok, YouTube, X, or LinkedIn accounts using secure OAuth. Read-only access means your data stays safe.",
    },
    {
      "@type": "HowToStep",
      name: "Get Smart Insights",
      text: "Go Virall analyzes your content performance, audience demographics, and engagement patterns to generate personalized growth strategies.",
    },
    {
      "@type": "HowToStep",
      name: "Create and Grow",
      text: "Use viral score predictions, optimal posting times, and smart content ideas to consistently grow your audience and revenue.",
    },
  ],
};

export function JsonLd({ faqItems }: { faqItems?: { question: string; answer: string }[] }) {
  const faqSchema = buildFaqSchema(faqItems ?? FAQ_ITEMS);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(howToSchema),
        }}
      />
    </>
  );
}
