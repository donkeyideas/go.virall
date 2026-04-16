"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  Home,
  Users,
  Mail,
  PenTool,
  BarChart3,
  Briefcase,
  Settings,
  Sparkles,
  ArrowRight,
  Calendar,
  Hash,
  TrendingUp,
  Brain,

  Gauge,
  Shield,
  Lightbulb,
  Handshake,
  FileText,
  Search,
  DollarSign,
  LineChart,
  Target,
  User,
  Link2,
  CreditCard,
  Bell,
  Palette,
  UserPlus,
  Pencil,
} from "lucide-react";
import { trackEvent } from "@/lib/analytics/track";
import { useViewMode } from "@/lib/contexts/view-mode";

/* ─── Types ─── */

interface FeatureCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}

interface Section {
  key: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  cards: FeatureCard[];
}

/* ─── Section data ─── */

const SECTIONS: Section[] = [
  {
    key: "overview",
    icon: <Home size={18} />,
    title: "Overview",
    subtitle:
      "Your dashboard home — a snapshot of everything happening across your connected profiles.",
    cards: [
      {
        icon: <TrendingUp size={16} />,
        title: "Social Intelligence Brief",
        description:
          "AI-generated summary of your top growth opportunities, engagement trends, and action items across all profiles.",
        href: "/dashboard",
      },
      {
        icon: <BarChart3 size={16} />,
        title: "Metrics Snapshot",
        description:
          "Follower counts, engagement rates, and recent post performance at a glance. Click any profile to drill into details.",
        href: "/dashboard",
      },
      {
        icon: <Shield size={16} />,
        title: "Trust Score",
        description:
          "Your platform reputation score based on deal completion rate, response time, and consistency.",
        href: "/dashboard",
      },
    ],
  },
  {
    key: "mission",
    icon: <Target size={18} />,
    title: "Mission",
    subtitle:
      "Your default ambition. Chosen at signup, editable here. Every AI analysis, recommendation, and content suggestion is tailored to this goal.",
    cards: [
      {
        icon: <Target size={16} />,
        title: "Primary Goal",
        description:
          "The ambition you chose at onboarding — Grow Audience, Make Money, Build Brand, or Drive Traffic. The platform uses this to personalize everything.",
        href: "/dashboard/mission",
      },
      {
        icon: <Pencil size={16} />,
        title: "Per-Profile Goals",
        description:
          "Detailed goals for each connected social profile — target follower count, timeframe, monetization channel, posting cadence. Feeds directly into Growth Tips, Content Strategy, and 30-Day Plans.",
        href: "/dashboard/mission",
      },
      {
        icon: <Sparkles size={16} />,
        title: "AI-Suggested Goals",
        description:
          "Let the AI suggest realistic goals based on your current metrics, niche, and audience data. Hit the Sparkles button on any per-profile goal.",
        href: "/dashboard/mission",
      },
    ],
  },
  {
    key: "profiles",
    icon: <Users size={18} />,
    title: "Profiles",
    subtitle:
      "Connect and manage your social media accounts. This is the first step — everything else depends on it.",
    cards: [
      {
        icon: <Link2 size={16} />,
        title: "Connect Accounts",
        description:
          "Link Instagram, TikTok, YouTube, Twitter/X, LinkedIn, Threads, Pinterest, or Twitch via secure OAuth. Your credentials are never stored.",
        href: "/dashboard/profiles",
      },
      {
        icon: <BarChart3 size={16} />,
        title: "Profile Analytics",
        description:
          "Each connected profile shows followers, engagement rate, recent posts, and growth trends pulled directly from the platform.",
        href: "/dashboard/profiles",
      },
    ],
  },
  {
    key: "inbox",
    icon: <Mail size={18} />,
    title: "Inbox",
    subtitle:
      "Notifications and alerts from across the platform — deal updates, analysis results, and system messages.",
    cards: [
      {
        icon: <Bell size={16} />,
        title: "Notifications",
        description:
          "Stay on top of deal inquiries, completed analyses, and important account updates. Unread count shows in the nav.",
        href: "/dashboard/inbox",
      },
    ],
  },
  {
    key: "content",
    icon: <PenTool size={18} />,
    title: "Content Hub",
    subtitle:
      "Create, schedule, and discover content — powered by AI that knows your niche and platform.",
    cards: [
      {
        icon: <Sparkles size={16} />,
        title: "AI Studio",
        description:
          "Generate captions, post ideas, content calendars, scripts, bios, and hashtag sets. Select a profile first — the AI uses your real data to personalize output.",
        href: "/dashboard/content?tab=ai-studio",
      },
      {
        icon: <Calendar size={16} />,
        title: "Publish",
        description:
          "Schedule posts, manage drafts, and track what's been published. See your content calendar alongside active brand deal deadlines.",
        href: "/dashboard/content?tab=publish",
      },
      {
        icon: <Hash size={16} />,
        title: "Hashtags",
        description:
          "Discover trending topics and hashtag sets organized by category. Filter by platform and niche to find what's working right now.",
        href: "/dashboard/content?tab=hashtags",
      },
    ],
  },
  {
    key: "analytics",
    icon: <BarChart3 size={18} />,
    title: "Analytics Hub",
    subtitle:
      "Deep performance data, AI strategy, and competitive intelligence — all in one place.",
    cards: [
      {
        icon: <LineChart size={16} />,
        title: "Metrics",
        description:
          "Cross-platform performance dashboard: top posts, engagement trends, follower growth charts, and platform comparisons.",
        href: "/dashboard/analytics?tab=metrics",
      },
      {
        icon: <TrendingUp size={16} />,
        title: "Strategy",
        description:
          "AI-powered growth tips, content strategy plans, 30-day action plans, and optimized hashtag sets tailored to your profile.",
        href: "/dashboard/analytics?tab=strategy",
      },
      {
        icon: <Brain size={16} />,
        title: "Intelligence",
        description:
          "Audience demographics, competitor analysis with strengths/weaknesses, and network collaboration opportunities.",
        href: "/dashboard/analytics?tab=intelligence",
      },
      {
        icon: <Gauge size={16} />,
        title: "SMO Score",
        description:
          "Social Media Optimization score — rates your profile's completeness, posting consistency, engagement quality, and growth trajectory.",
        href: "/dashboard/analytics?tab=smo-score",
      },
      {
        icon: <Shield size={16} />,
        title: "Trust Score",
        description:
          "Reputation metric based on deal completion, response time, and consistency. Higher scores unlock better brand opportunities.",
        href: "/dashboard/analytics?tab=trust-score",
      },
      {
        icon: <Lightbulb size={16} />,
        title: "Recommendations",
        description:
          "AI-generated next steps and action items based on your latest analyses. Prioritized by impact and effort.",
        href: "/dashboard/analytics?tab=recommendations",
      },
    ],
  },
  {
    key: "business",
    icon: <Briefcase size={18} />,
    title: "Business Hub",
    subtitle:
      "Manage brand partnerships, track revenue, and grow your creator business.",
    cards: [
      {
        icon: <Handshake size={16} />,
        title: "Deals",
        description:
          "Track brand deals through your pipeline — from inquiry to negotiation to completion. See deliverables, payments, and deadlines.",
        href: "/dashboard/business?tab=deals",
      },
      {
        icon: <FileText size={16} />,
        title: "Proposals",
        description:
          "Create and manage collaboration proposals with rate cards, deliverables, and terms. Send directly to brands.",
        href: "/dashboard/business?tab=proposals",
      },
      {
        icon: <Search size={16} />,
        title: "Opportunities",
        description:
          "AI-matched brand partnership opportunities based on your niche, audience size, and engagement metrics.",
        href: "/dashboard/business?tab=opportunities",
      },
      {
        icon: <DollarSign size={16} />,
        title: "Monetization",
        description:
          "Earnings forecasts and campaign ideas generated from your profile data. See estimated revenue potential per platform.",
        href: "/dashboard/business?tab=monetization",
      },
      {
        icon: <LineChart size={16} />,
        title: "Revenue",
        description:
          "Track actual earnings by source, view monthly revenue trends, payment history, and forecasted income.",
        href: "/dashboard/business?tab=revenue",
      },
    ],
  },
  {
    key: "settings",
    icon: <Settings size={18} />,
    title: "Settings",
    subtitle:
      "Account preferences, connected accounts, billing, notifications, media kit, and team management.",
    cards: [
      {
        icon: <User size={16} />,
        title: "Account",
        description:
          "Update your display name, email, avatar, and account type (creator or brand).",
        href: "/dashboard/settings",
      },
      {
        icon: <Link2 size={16} />,
        title: "Connected Accounts",
        description:
          "Manage OAuth connections to your social platforms. Reconnect or remove accounts.",
        href: "/dashboard/settings",
      },
      {
        icon: <CreditCard size={16} />,
        title: "Billing",
        description:
          "View your current plan, upgrade/downgrade, manage payment methods, and access invoices via Stripe.",
        href: "/dashboard/settings",
      },
      {
        icon: <Palette size={16} />,
        title: "Media Kit",
        description:
          "Build a public-facing media kit with your stats, rates, and portfolio. Share a custom link with brands.",
        href: "/dashboard/settings",
      },
      {
        icon: <UserPlus size={16} />,
        title: "Team",
        description:
          "Invite team members, assign roles (admin, editor, viewer), and manage access to your organization.",
        href: "/dashboard/settings",
      },
    ],
  },
];

/* ─── Component ─── */

interface GettingStartedClientProps {
  profileCount: number;
}

export function GettingStartedClient({ profileCount }: GettingStartedClientProps) {
  const { viewMode } = useViewMode();
  const isEditorial = viewMode === "editorial";

  // Accent colors: red for editorial, gold for modern
  const txt = isEditorial ? "text-editorial-red" : "text-editorial-gold";
  const bg = isEditorial ? "bg-editorial-red" : "bg-editorial-gold";
  const bgLight = isEditorial ? "bg-editorial-red/10" : "bg-editorial-gold/10";
  const bgBanner = isEditorial ? "bg-editorial-red/5" : "bg-editorial-gold/5";
  const border = isEditorial ? "border-editorial-red/40" : "border-editorial-gold/40";
  const hoverBorder = isEditorial ? "hover:border-editorial-red/40" : "hover:border-editorial-gold/40";
  const hoverTxt = isEditorial ? "group-hover:text-editorial-red" : "group-hover:text-editorial-gold";

  useEffect(() => {
    trackEvent("page_view", "platform-guide");
  }, []);

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <header className="mb-10 border-b-4 border-double border-rule-dark pb-6 text-center">
        <div className="mb-3 flex items-center justify-center gap-2">
          <Sparkles size={16} className={txt} />
          <span className={`font-sans text-[10px] font-bold uppercase tracking-[2px] ${txt}`}>
            Platform Guide
          </span>
          <Sparkles size={16} className={txt} />
        </div>
        <h1 className="font-serif text-[32px] font-black leading-none tracking-tight text-ink sm:text-[40px]">
          Your Guide to <span className="text-editorial-red">Go Virall</span>
        </h1>
        <p className="mt-3 font-serif text-[14px] italic text-ink-muted">
          Everything the platform offers — organized by section. Click any card to jump straight there.
        </p>
      </header>

      {/* Quick-start banner for new users */}
      {profileCount === 0 && (
        <div className={`mb-8 border ${border} ${bgBanner} px-5 py-4`}>
          <div className="flex items-start gap-3">
            <Sparkles size={18} className={`mt-0.5 shrink-0 ${txt}`} />
            <div>
              <h3 className="font-serif text-[15px] font-bold text-ink">
                First time here? Start by connecting a profile.
              </h3>
              <p className="mt-1 font-sans text-[12px] text-ink-secondary">
                Everything in Go Virall is powered by your social data. Connect at least one account to unlock Analytics, AI Studio, and Business tools.
              </p>
              <Link
                href="/dashboard/profiles"
                className={`mt-3 inline-flex items-center gap-2 ${bg} px-5 py-2 font-sans text-[11px] font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-90`}
              >
                Connect Your First Profile
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-10">
        {SECTIONS.map((section) => (
          <section key={section.key}>
            {/* Section header */}
            <div className="mb-4 flex items-center gap-3 border-b-2 border-ink pb-2">
              <div className={`flex h-8 w-8 items-center justify-center ${bgLight} ${txt}`}>
                {section.icon}
              </div>
              <div>
                <h2 className="font-serif text-[20px] font-bold leading-tight text-ink">
                  {section.title}
                </h2>
              </div>
            </div>
            <p className="mb-4 font-sans text-[13px] leading-relaxed text-ink-secondary">
              {section.subtitle}
            </p>

            {/* Feature cards grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {section.cards.map((card) => (
                <Link
                  key={card.title}
                  href={card.href}
                  className={`group border border-rule bg-surface-card p-4 transition-colors ${hoverBorder} hover:bg-surface-raised`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className={txt}>{card.icon}</span>
                    <h4 className={`font-sans text-[13px] font-bold text-ink ${hoverTxt}`}>
                      {card.title}
                    </h4>
                  </div>
                  <p className="font-sans text-[11px] leading-relaxed text-ink-muted">
                    {card.description}
                  </p>
                  <span className={`mt-3 inline-flex items-center gap-1 font-sans text-[10px] font-semibold uppercase tracking-wider ${txt} opacity-0 transition-opacity group-hover:opacity-100`}>
                    Open <ArrowRight size={10} />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-10 border-t-4 border-double border-rule-dark pt-4 text-center">
        <p className="font-sans text-[11px] text-ink-muted">
          You can access this guide anytime from the <span className={`font-semibold ${txt}`}>Guide</span> tab in the navigation.
        </p>
      </div>
    </div>
  );
}
