"use client";

import { useState } from "react";
import { ViewModeProvider, useViewMode } from "@/lib/contexts/view-mode";
import { ModernNav } from "@/components/dashboard/modern/ModernNav";
import { OnboardingModal } from "@/components/dashboard/OnboardingModal";

interface DashboardShellProps {
  children: React.ReactNode;
  editorialChrome: React.ReactNode;
  userName: string | null;
  showLogout: boolean;
  unreadCount?: number;
  hasProfiles?: boolean;
}

function ShellInner({
  children,
  editorialChrome,
  userName,
  showLogout,
  unreadCount = 0,
  hasProfiles = true,
}: DashboardShellProps) {
  const { viewMode } = useViewMode();
  const [showOnboarding, setShowOnboarding] = useState(!hasProfiles);

  if (viewMode === "modern") {
    return (
      <div className="flex min-h-dvh flex-col bg-surface-cream">
        <ModernNav userName={userName} showLogout={showLogout} unreadCount={unreadCount} />
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
