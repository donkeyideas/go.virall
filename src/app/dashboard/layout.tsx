import { createClient } from "@/lib/supabase/server";
import { Masthead } from "@/components/editorial/Masthead";
import { PaperHeader } from "@/components/editorial/PaperHeader";
import { PaperNav, type NavItem } from "@/components/editorial/PaperNav";
import { BottomBar } from "@/components/editorial/BottomBar";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ViewModeToggle } from "@/components/dashboard/ViewModeToggle";
import { getUnreadCount, getNotifications } from "@/lib/dal/notifications";
import { getSocialProfileCount } from "@/lib/dal/profiles";
import { getUserPreferences } from "@/lib/dal/settings";
import type { FeatureFlags } from "@/components/dashboard/DashboardShell";

const BASE_NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/dashboard" },
  { label: "Mission", href: "/dashboard/mission" },
  { label: "Profiles", href: "/dashboard/profiles" },
  { label: "Content", href: "/dashboard/content" },
  { label: "Metrics", href: "/dashboard/metrics" },
  { label: "Strategy", href: "/dashboard/strategy" },
  { label: "Intelligence", href: "/dashboard/intelligence" },
  { label: "SMO Score", href: "/dashboard/smo-score" },
  { label: "Recommendations", href: "/dashboard/recommendations" },
  { label: "Settings", href: "/dashboard/settings" },
  { label: "Guide", href: "/dashboard/guide" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get user's display name and account type
  let userName: string | null = null;
  let avatarUrl: string | null = null;
  let accountType: "creator" | "brand" = "creator";
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, account_type")
      .eq("id", user.id)
      .single();
    userName = data?.full_name ?? null;
    avatarUrl = data?.avatar_url ?? null;
    accountType = (data?.account_type as "creator" | "brand") ?? "creator";
  }

  const [unreadCount, profileCount, notifications, userPrefs] = await Promise.all([
    getUnreadCount(),
    getSocialProfileCount(),
    getNotifications(10),
    getUserPreferences(),
  ]);

  const featureFlags: FeatureFlags = {
    feature_inbox: userPrefs?.feature_inbox ?? false,
    feature_business: userPrefs?.feature_business ?? false,
    feature_publish: userPrefs?.feature_publish ?? false,
    feature_hashtags: userPrefs?.feature_hashtags ?? false,
    feature_media_kit: userPrefs?.feature_media_kit ?? false,
    feature_team: userPrefs?.feature_team ?? false,
    feature_api_keys: userPrefs?.feature_api_keys ?? false,
    feature_growth: userPrefs?.feature_growth ?? false,
    feature_revenue: userPrefs?.feature_revenue ?? false,
    feature_strategy: userPrefs?.feature_strategy ?? false,
    feature_intelligence: userPrefs?.feature_intelligence ?? false,
    feature_trust_score: userPrefs?.feature_trust_score ?? false,
  };

  const today = new Date();
  const dateLine = today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const editorialChrome = (
    <div className="flex min-h-dvh flex-col bg-surface-cream">
      <Masthead
        showLogout={!!user}
        leftSlot={
          userName ? (
            <span className="font-sans text-[10px] font-medium uppercase tracking-widest text-surface-cream/70">
              {userName}
            </span>
          ) : null
        }
        actions={
          <ViewModeToggle className="border-surface-cream/20 bg-transparent text-surface-cream/70 hover:bg-surface-cream/10 hover:text-surface-cream h-7" />
        }
      />
      <PaperHeader
        dateLine={dateLine}
        title="Go Virall"
        accentText="Go"
        tagline="Social Intelligence Platform &middot; Growth Analytics &middot; Content Strategy"
      />
      <PaperNav items={(() => {
        const items = [...BASE_NAV_ITEMS];
        if (featureFlags.feature_inbox) {
          const idx = items.findIndex((i) => i.href === "/dashboard/profiles");
          items.splice(idx + 1, 0, { label: "Inbox", href: "/dashboard/inbox" });
        }
        if (featureFlags.feature_business) {
          const idx = items.findIndex((i) => i.href === "/dashboard/analytics");
          items.splice(idx + 1, 0, { label: "Business", href: "/dashboard/business" });
        }
        return items;
      })()} />

      <main className="dashboard-main mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>

      <BottomBar
        leftText="Go Virall — Social Intelligence Platform"
        rightText={`${today.getFullYear()} All rights reserved`}
      />
    </div>
  );

  return (
    <DashboardShell
      editorialChrome={editorialChrome}
      userName={userName}
      avatarUrl={avatarUrl}
      showLogout={!!user}
      unreadCount={unreadCount}
      hasProfiles={profileCount > 0}
      notifications={notifications}
      accountType={accountType}
      featureFlags={featureFlags}
    >
      {children}
    </DashboardShell>
  );
}
