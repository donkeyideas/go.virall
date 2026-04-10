import { createClient } from "@/lib/supabase/server";
import { Masthead } from "@/components/editorial/Masthead";
import { PaperHeader } from "@/components/editorial/PaperHeader";
import { PaperNav, type NavItem } from "@/components/editorial/PaperNav";
import { BottomBar } from "@/components/editorial/BottomBar";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ViewModeToggle } from "@/components/dashboard/ViewModeToggle";
import { getUnreadCount, getNotifications } from "@/lib/dal/notifications";
import { getSocialProfileCount } from "@/lib/dal/profiles";

const CREATOR_ONLY_PATHS = new Set(["/dashboard/smo-score", "/dashboard/recommendations", "/dashboard/goals"]);

const ALL_NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/dashboard" },
  { label: "Profiles", href: "/dashboard/profiles" },
  { label: "Inbox", href: "/dashboard/inbox" },
  { label: "Content", href: "/dashboard/content" },
  { label: "Analytics", href: "/dashboard/analytics" },
  { label: "Intelligence", href: "/dashboard/intelligence" },
  { label: "SMO Score", href: "/dashboard/smo-score" },
  { label: "Trust Score", href: "/dashboard/trust-score" },
  { label: "Recommendations", href: "/dashboard/recommendations" },
  { label: "Business", href: "/dashboard/business" },
  { label: "Goals", href: "/dashboard/goals" },
  { label: "Settings", href: "/dashboard/settings" },
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

  const [unreadCount, profileCount, notifications] = await Promise.all([
    getUnreadCount(),
    getSocialProfileCount(),
    getNotifications(10),
  ]);

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
      <PaperNav items={accountType === "brand" ? ALL_NAV_ITEMS.filter(i => !CREATOR_ONLY_PATHS.has(i.href)) : ALL_NAV_ITEMS} />

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
    >
      {children}
    </DashboardShell>
  );
}
