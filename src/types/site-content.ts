// ============================================================
// Site Content — Typed JSONB shapes for each homepage section
// ============================================================

export interface HeroContent {
  badge: string;
  heading_line1: string;
  heading_line2: string;
  subheading: string;
  cta_text: string;
  cta_subtitle: string;
}

export interface TrustSignalItem {
  icon: string;
  text: string;
}
export interface TrustSignalsContent {
  items: TrustSignalItem[];
}

export interface AboutContent {
  title_prefix: string;
  title_highlight: string;
  body: string;
}

export interface PlatformsContent {
  label: string;
  title_line1: string;
  title_line2: string;
  subtitle: string;
  footnote: string;
}

export interface HowItWorksStep {
  title: string;
  description: string;
}
export interface HowItWorksContent {
  label: string;
  title_line1: string;
  title_line2: string;
  subtitle: string;
  steps: HowItWorksStep[];
}

export interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}
export interface FeaturesContent {
  label: string;
  title_line1: string;
  title_line2: string;
  subtitle: string;
  items: FeatureItem[];
}

export interface TestimonialItem {
  quote: string;
  name: string;
  handle: string;
  platform: string;
}
export interface TestimonialsContent {
  label: string;
  title_line1: string;
  title_line2: string;
  subtitle: string;
  items: TestimonialItem[];
}

export interface PricingTier {
  tier: string;
  price: string;
  description: string;
  features: string[];
  cta_text: string;
  is_primary: boolean;
  is_recommended: boolean;
}
export interface PricingContent {
  label: string;
  title_line1: string;
  title_line2: string;
  subtitle: string;
  footnote: string;
  tiers: PricingTier[];
}

export interface FaqItem {
  question: string;
  answer: string;
}
export interface FaqContent {
  label: string;
  title_line1: string;
  title_line2: string;
  subtitle: string;
  items: FaqItem[];
}

export interface BrandFeatureItem {
  icon: string;
  title: string;
  description: string;
}
export interface BrandsContent {
  label: string;
  title_line1: string;
  title_line2: string;
  subtitle: string;
  cta_text: string;
  cta_href: string;
  items: BrandFeatureItem[];
}

export interface CtaContent {
  heading_prefix: string;
  heading_highlight: string;
  subheading: string;
  button_text: string;
}

export interface FooterContent {
  description: string;
  copyright: string;
}

// Section name → content type mapping
export type SectionContentMap = {
  hero: HeroContent;
  trust_signals: TrustSignalsContent;
  about: AboutContent;
  platforms: PlatformsContent;
  how_it_works: HowItWorksContent;
  features: FeaturesContent;
  testimonials: TestimonialsContent;
  pricing: PricingContent;
  brands: BrandsContent;
  faq: FaqContent;
  cta: CtaContent;
  footer: FooterContent;
};

export type HomeSectionName = keyof SectionContentMap;

// Human-readable labels for admin UI
export const SECTION_LABELS: Record<HomeSectionName, string> = {
  hero: "Hero Banner",
  trust_signals: "Trust Signals",
  about: "About Section",
  platforms: "Connect Platforms",
  how_it_works: "How It Works",
  features: "Features",
  testimonials: "Testimonials",
  pricing: "Pricing",
  brands: "For Brands",
  faq: "FAQ",
  cta: "Call to Action",
  footer: "Footer",
};

// Ordered section names for display
export const HOME_SECTIONS_ORDER: HomeSectionName[] = [
  "hero",
  "trust_signals",
  "about",
  "platforms",
  "how_it_works",
  "features",
  "testimonials",
  "pricing",
  "brands",
  "faq",
  "cta",
  "footer",
];
