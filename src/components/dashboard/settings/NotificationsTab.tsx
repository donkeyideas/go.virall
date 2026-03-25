"use client";

import { useState, useTransition } from "react";
import { updateNotificationPreferences } from "@/lib/actions/settings";
import type { UserPreferences } from "@/types";

interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

function Toggle({ checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? "bg-editorial-green" : "bg-ink-faint"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-[18px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}

interface NotificationItem {
  key: string;
  label: string;
  description: string;
}

const EMAIL_NOTIFICATIONS: NotificationItem[] = [
  {
    key: "daily_digest",
    label: "Daily Performance Digest",
    description: "Summary of followers, engagement, and top posts",
  },
  {
    key: "brand_deal_updates",
    label: "Brand Deal Updates",
    description: "New messages, approvals, and payment notifications",
  },
  {
    key: "growth_milestones",
    label: "Growth Milestones",
    description: "Alerts when you hit follower or engagement goals",
  },
  {
    key: "weekly_report",
    label: "Weekly Performance Report",
    description: "Comprehensive weekly email with analytics and AI insights",
  },
  {
    key: "collab_opportunities",
    label: "New Collaboration Opportunities",
    description: "When brands match your profile on the marketplace",
  },
  {
    key: "marketing_updates",
    label: "Marketing & Product Updates",
    description: "New features, tips, and platform announcements",
  },
];

const INAPP_NOTIFICATIONS: NotificationItem[] = [
  {
    key: "deal_room_messages",
    label: "Deal Room Messages",
    description: "Real-time badge when new messages arrive",
  },
  {
    key: "campaign_reminders",
    label: "Campaign Deadline Reminders",
    description: "48h and 24h before deliverables are due",
  },
  {
    key: "ai_analysis_complete",
    label: "AI Analysis Complete",
    description: "When a requested deep analysis finishes processing",
  },
];

const DEFAULT_PREFS: Record<string, boolean> = {
  email_notifications: true,
  weekly_report: true,
  daily_digest: true,
  brand_deal_updates: true,
  growth_milestones: true,
  collab_opportunities: false,
  marketing_updates: false,
  deal_room_messages: true,
  campaign_reminders: true,
  ai_analysis_complete: true,
};

export function NotificationsTab({
  userPreferences,
}: {
  userPreferences: UserPreferences | null;
}) {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => {
    if (!userPreferences) return { ...DEFAULT_PREFS };
    const p: Record<string, boolean> = {};
    for (const key of Object.keys(DEFAULT_PREFS)) {
      p[key] =
        (userPreferences as unknown as Record<string, boolean>)[key] ??
        DEFAULT_PREFS[key];
    }
    return p;
  });

  const [isPending, startTransition] = useTransition();

  function handleToggle(key: string, value: boolean) {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);

    const fd = new FormData();
    for (const [k, v] of Object.entries(updated)) {
      fd.set(k, String(v));
    }

    startTransition(async () => {
      await updateNotificationPreferences(fd);
    });
  }

  return (
    <div>
      <h3 className="font-serif text-lg font-bold text-ink mb-6">
        Notification Preferences
      </h3>

      {/* Email Notifications */}
      <p className="editorial-overline mb-4">Email Notifications</p>
      <div className="space-y-0 mb-8">
        {EMAIL_NOTIFICATIONS.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between py-3.5 border-b border-rule last:border-b-0"
          >
            <div>
              <p className="text-sm font-semibold text-ink">{item.label}</p>
              <p className="text-xs text-ink-muted mt-0.5">
                {item.description}
              </p>
            </div>
            <Toggle
              checked={prefs[item.key] ?? false}
              onChange={(v) => handleToggle(item.key, v)}
              disabled={isPending}
            />
          </div>
        ))}
      </div>

      {/* In-App Notifications */}
      <p className="editorial-overline mb-4">In-App Notifications</p>
      <div className="space-y-0">
        {INAPP_NOTIFICATIONS.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between py-3.5 border-b border-rule last:border-b-0"
          >
            <div>
              <p className="text-sm font-semibold text-ink">{item.label}</p>
              <p className="text-xs text-ink-muted mt-0.5">
                {item.description}
              </p>
            </div>
            <Toggle
              checked={prefs[item.key] ?? false}
              onChange={(v) => handleToggle(item.key, v)}
              disabled={isPending}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
