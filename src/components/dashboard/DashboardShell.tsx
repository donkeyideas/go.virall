"use client";

import { useState } from "react";
import { ViewModeProvider, useViewMode } from "@/lib/contexts/view-mode";
import { ModernNav } from "@/components/dashboard/modern/ModernNav";
import { OnboardingModal } from "@/components/dashboard/OnboardingModal";

interface DashboardShellProps {
  children: React.ReactNode;
  editorialChrome: React.ReactNode;
  userName: string | null;
  avatarUrl?: string | null;
  showLogout: boolean;
  unreadCount?: number;
  hasProfiles?: boolean;
  notifications?: Array<{ id: string; title: string; body: string | null; type: string; is_read: boolean; created_at: string }>;
  accountType?: "creator" | "brand";
}

function ShellInner({
  children,
  editorialChrome,
  userName,
  avatarUrl,
  showLogout,
  unreadCount = 0,
  hasProfiles = true,
  notifications = [],
  accountType = "creator",
}: DashboardShellProps) {
  const { viewMode } = useViewMode();
  const [showOnboarding, setShowOnboarding] = useState(!hasProfiles);

  if (viewMode === "modern") {
    return (
      <div className="flex min-h-dvh flex-col bg-surface-cream">
        <ModernNav userName={userName} avatarUrl={avatarUrl} showLogout={showLogout} unreadCount={unreadCount} notifications={notifications} accountType={accountType} />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8" style={{ paddingTop: "calc(56px + 44px + 24px)" }}>
          {children}
        </main>
        {showOnboarding && (
          <OnboardingModal onClose={() => setShowOnboarding(false)} />
        )}
      </div>
    );
  }

  return <>{editorialChrome}</>;
}

export function DashboardShell(props: DashboardShellProps) {
  return (
    <ViewModeProvider>
      <ShellInner {...props} />
    </ViewModeProvider>
  );
}
