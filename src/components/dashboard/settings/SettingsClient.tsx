"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics/track";
import { AccountTab } from "./AccountTab";
import { ConnectedAccountsTab } from "./ConnectedAccountsTab";
import { BillingTab } from "./BillingTab";
import { NotificationsTab } from "./NotificationsTab";
import { MediaKitTab } from "./MediaKitTab";
import { TeamTab } from "./TeamTab";
import { ApiKeysTab } from "./ApiKeysTab";
import type { Profile, Organization, SocialProfile, UserPreferences, SubscriptionData, BillingInvoice } from "@/types";

const SETTINGS_TABS = [
  { key: "account", label: "Account" },
  { key: "connected", label: "Connected Accounts" },
  { key: "billing", label: "Subscription & Billing" },
  { key: "notifications", label: "Notifications" },
  { key: "media-kit", label: "Media Kit" },
  { key: "team", label: "Team" },
  { key: "api-keys", label: "AI API Keys" },
] as const;

interface SettingsClientProps {
  profile: Profile | null;
  organization: Organization | null;
  socialProfiles: SocialProfile[];
  userPreferences: UserPreferences | null;
  userEmail: string | null;
  subscription: SubscriptionData | null;
  invoices: BillingInvoice[];
}

export function SettingsClient({
  profile,
  organization,
  socialProfiles,
  userPreferences,
  userEmail,
  subscription,
  invoices,
}: SettingsClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeKey = searchParams.get("tab") || "account";
  const activeTab = SETTINGS_TABS.find((t) => t.key === activeKey) ?? SETTINGS_TABS[0];

  useEffect(() => {
    trackEvent("page_view", "settings");
  }, []);

  function switchTab(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h2 className="font-serif text-xl font-bold text-ink">Settings</h2>
        <p className="text-xs text-ink-secondary mt-0.5">
          Account, connected profiles, billing, notifications &amp; team
        </p>
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex items-center gap-1 overflow-x-auto border-b border-rule">
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => switchTab(tab.key)}
            className={cn(
              "relative whitespace-nowrap px-4 py-2.5 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] transition-colors",
              activeTab.key === tab.key
                ? "text-editorial-red after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-editorial-red after:content-['']"
                : "text-ink-secondary hover:text-ink",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      <div className="border border-rule bg-surface-card p-6">
        {activeTab.key === "account" && (
          <AccountTab profile={profile} userEmail={userEmail} />
        )}
        {activeTab.key === "connected" && (
          <ConnectedAccountsTab socialProfiles={socialProfiles} />
        )}
        {activeTab.key === "billing" && (
          <BillingTab
            organization={organization}
            subscription={subscription}
            invoices={invoices}
          />
        )}
        {activeTab.key === "notifications" && (
          <NotificationsTab userPreferences={userPreferences} />
        )}
        {activeTab.key === "media-kit" && (
          <MediaKitTab profile={profile} socialProfiles={socialProfiles} />
        )}
        {activeTab.key === "team" && (
          <TeamTab profile={profile} organization={organization} userEmail={userEmail} />
        )}
        {activeTab.key === "api-keys" && <ApiKeysTab />}
      </div>
    </div>
  );
}
