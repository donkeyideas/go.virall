"use client";

import { BrandNav } from "@/components/brand/BrandNav";

interface BrandShellProps {
  children: React.ReactNode;
  userName: string | null;
  companyName: string | null;
  companyLogoUrl?: string | null;
  showLogout: boolean;
  unreadCount?: number;
  unreadSupportCount?: number;
  notifications?: Array<{ id: string; title: string; body: string | null; type: string; is_read: boolean; created_at: string }>;
}

export function BrandShell({
  children,
  userName,
  companyName,
  companyLogoUrl,
  showLogout,
  unreadCount = 0,
  unreadSupportCount = 0,
  notifications = [],
}: BrandShellProps) {
  return (
    <div
      className="flex min-h-dvh flex-col"
      style={{ background: "var(--color-surface-cream)" }}
    >
      <BrandNav
        userName={userName}
        companyName={companyName}
        companyLogoUrl={companyLogoUrl}
        showLogout={showLogout}
        unreadCount={unreadCount}
        unreadSupportCount={unreadSupportCount}
        notifications={notifications}
      />
      <main
        className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8"
        style={{ paddingTop: "calc(56px + 44px + 24px)" }}
      >
        {children}
      </main>
    </div>
  );
}
