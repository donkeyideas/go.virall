"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateFeaturePreferences } from "@/lib/actions/settings";
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

interface FeatureItem {
  key: string;
  label: string;
  description: string;
}

const NAV_FEATURES: FeatureItem[] = [
  {
    key: "feature_inbox",
    label: "Inbox",
    description: "Direct messages and chat with brands",
  },
  {
    key: "feature_business",
    label: "Business Hub",
    description: "Deals, proposals, revenue, and monetization tools",
  },
];

const CONTENT_FEATURES: FeatureItem[] = [
  {
    key: "feature_publish",
    label: "Publish",
    description: "Schedule and publish posts across platforms",
  },
  {
    key: "feature_hashtags",
    label: "Hashtags",
    description: "Trending hashtag research and suggestions",
  },
];

const ANALYTICS_FEATURES: FeatureItem[] = [
  {
    key: "feature_growth",
    label: "Growth",
    description: "Follower growth tracking, platform comparison, and milestone projections",
  },
  {
    key: "feature_revenue",
    label: "Revenue",
    description: "Earnings forecast, revenue sources, and recommended rates",
  },
  {
    key: "feature_strategy",
    label: "Strategy",
    description: "Growth tips, content strategy, 30-day plans, and hashtag analysis",
  },
  {
    key: "feature_intelligence",
    label: "Intelligence",
    description: "Audience demographics, competitor analysis, and network insights",
  },
  {
    key: "feature_trust_score",
    label: "Trust Score",
    description: "Account authenticity and credibility scoring",
  },
];

const SETTINGS_FEATURES: FeatureItem[] = [
  {
    key: "feature_media_kit",
    label: "Media Kit",
    description: "Shareable portfolio for brand partnerships",
  },
  {
    key: "feature_team",
    label: "Team",
    description: "Invite team members and manage roles",
  },
  {
    key: "feature_api_keys",
    label: "API Keys",
    description: "Manage your own AI provider keys",
  },
];

const FEATURE_KEYS = [
  "feature_inbox",
  "feature_business",
  "feature_publish",
  "feature_hashtags",
  "feature_media_kit",
  "feature_team",
  "feature_api_keys",
  "feature_growth",
  "feature_revenue",
  "feature_strategy",
  "feature_intelligence",
  "feature_trust_score",
];

export function FeaturesTab({
  userPreferences,
}: {
  userPreferences: UserPreferences | null;
}) {
  const router = useRouter();
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => {
    const p: Record<string, boolean> = {};
    for (const key of FEATURE_KEYS) {
      p[key] =
        (userPreferences as unknown as Record<string, boolean>)?.[key] ?? false;
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
      await updateFeaturePreferences(fd);
      router.refresh();
    });
  }

  const enabledCount = Object.values(prefs).filter(Boolean).length;

  return (
    <div>
      <h3 className="font-serif text-lg font-bold text-ink mb-1">
        Features
      </h3>
      <p className="text-xs text-ink-muted mb-6">
        Enable additional features as you need them. Changes take effect
        immediately.
        {enabledCount > 0 && (
          <span className="ml-2 text-editorial-green font-semibold">
            {enabledCount} enabled
          </span>
        )}
      </p>

      {/* Navigation Features */}
      <p className="editorial-overline mb-4">Navigation</p>
      <div className="space-y-0 mb-8">
        {NAV_FEATURES.map((item) => (
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

      {/* Content Tools */}
      <p className="editorial-overline mb-4">Content Tools</p>
      <div className="space-y-0 mb-8">
        {CONTENT_FEATURES.map((item) => (
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

      {/* Analytics */}
      <p className="editorial-overline mb-4">Analytics</p>
      <div className="space-y-0 mb-8">
        {ANALYTICS_FEATURES.map((item) => (
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

      {/* Settings Extras */}
      <p className="editorial-overline mb-4">Settings</p>
      <div className="space-y-0">
        {SETTINGS_FEATURES.map((item) => (
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
