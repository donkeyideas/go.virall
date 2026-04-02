import { createClient } from "@/lib/supabase/server";
import { Masthead } from "@/components/editorial/Masthead";
import { PaperHeader } from "@/components/editorial/PaperHeader";
import { PaperNav, type NavItem } from "@/components/editorial/PaperNav";
import { BottomBar } from "@/components/editorial/BottomBar";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ViewModeToggle } from "@/components/dashboard/ViewModeToggle";
import { getUnreadCount } from "@/lib/dal/notifications";
import { getSocialProfileCount } from "@/lib/dal/profiles";

const dashboardNavItems: NavItem[] = [
  { label: "Overview", href: "/dashboard" },
  { label: "Profiles", href: "/dashboard/profiles" },
  { label: "Chat", href: "/dashboard/chat" },
  { label: "Analytics", href: "/dashboard/analytics" },
  { label: "AI Studio", href: "/dashboard/ai-studio" },
  { label: "Strategy", href: "/dashboard/strategy" },
  { label: "Intelligence", href: "/dashboard/intelligence" },
  { label: "Monetization", href: "/dashboard/monetization" },
  { label: "SMO Score", href: "/dashboard/smo-score" },
  { label: "Recommendations", href: "/dashboard/recommendations" },
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

  // Get user's display name
  let userName: string | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    userName = data?.full_name ?? null;
  }

  const [unreadCount, profileCount] = await Promise.all([
    getUnreadCount(),
    getSocialProfileCount(),
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
      <PaperNav items={dashboardNavItems} />

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
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
      showLogout={!!user}
      unreadCount={unreadCount}
      hasProfiles={profileCount > 0}
    >
      {children}
    </DashboardShell>
  );
}
