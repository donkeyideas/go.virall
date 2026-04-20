"use client";

import React, { useState, useTransition, useMemo, useCallback } from "react";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Loader2,
  Trash2,
  X,
  Mail,
  Users,
  BarChart3,
  Briefcase,
  Shield,
  Calendar,
  Clock,
  Globe,
  CreditCard,
  Star,
} from "lucide-react";
import { updateUserRole, deleteUser, getUserDetails, toggleCompAccount } from "@/lib/actions/admin";
import type { UserRow } from "@/types";

/* ─── Helpers ─── */

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ─── Sub-components ─── */

function ProviderIcon({ provider }: { provider: string | null }) {
  if (provider === "google") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <svg width="14" height="14" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Google
      </span>
    );
  }
  if (provider === "apple") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-1.55 4.31-3.74 4.25z" />
        </svg>
        Apple
      </span>
    );
  }
  return <span>email</span>;
}

function PlanBadge({ plan }: { plan: string | null }) {
  if (!plan) return <span className="text-ink-muted">--</span>;
  const color =
    plan === "enterprise"
      ? "text-editorial-gold"
      : plan === "business"
        ? "text-editorial-blue"
        : plan === "pro"
          ? "text-editorial-green"
          : "text-ink-muted";
  return (
    <span className={`text-[11px] font-bold uppercase tracking-widest ${color}`}>
      {plan}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const color =
    role === "superadmin"
      ? "text-editorial-red"
      : role === "admin"
        ? "text-editorial-gold"
        : "text-ink-secondary";
  return (
    <span className={`text-[11px] font-bold uppercase tracking-widest ${color}`}>
      {role}
    </span>
  );
}

function AccountTypeBadge({ type }: { type: "creator" | "brand" }) {
  return (
    <span
      className={`text-[11px] font-bold uppercase tracking-widest ${
        type === "brand" ? "text-editorial-blue" : "text-ink-muted"
      }`}
    >
      {type}
    </span>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-ink-muted">--</span>;
  const color =
    status === "active"
      ? "text-editorial-green"
      : status === "trialing"
        ? "text-editorial-blue"
        : status === "past_due" || status === "canceled"
          ? "text-editorial-red"
          : "text-ink-muted";
  return (
    <span className={`text-[11px] font-bold uppercase tracking-widest ${color}`}>
      {status}
    </span>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="border border-rule bg-surface-card">
      <div className="flex items-center gap-2 border-b border-rule px-4 py-2.5">
        <Icon size={14} className="text-ink-muted" />
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between py-1.5 border-b border-rule/50 last:border-0">
      <span className="text-xs text-ink-muted">{label}</span>
      <span className={`text-xs text-ink text-right ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon }: { label: string; value: number | string; icon: React.ElementType }) {
  return (
    <div className="border border-rule bg-surface-card p-3 text-center">
      <Icon size={16} className="mx-auto mb-1 text-ink-muted" />
      <div className="font-mono text-xl font-bold text-ink">{typeof value === "number" ? value.toLocaleString() : value}</div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">{label}</div>
    </div>
  );
}

function PlatformIcon({ platform }: { platform: string }) {
  const colors: Record<string, string> = {
    instagram: "text-pink-500",
    tiktok: "text-ink",
    youtube: "text-red-500",
    twitter: "text-blue-400",
    linkedin: "text-blue-600",
    facebook: "text-blue-500",
  };
  return (
    <span className={`text-[11px] font-bold uppercase tracking-widest ${colors[platform] ?? "text-ink-muted"}`}>
      {platform}
    </span>
  );
}

/* ─── User Details Modal ─── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function UserDetailsModal({ details, onClose }: { details: any; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [compAccount, setCompAccount] = useState(details.profile.comp_account ?? false);

  const profile = details.profile;
  const org = details.organization;
  const usage = details.usage;

  function handleCompToggle(enabled: boolean) {
    setCompAccount(enabled);
    startTransition(async () => {
      const result = await toggleCompAccount(profile.id, enabled);
      if (result.error) {
        setCompAccount(!enabled); // revert
      }
    });
  }

  return (
    <>
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-rule bg-surface-cream px-5 py-4">
          <h2 className="font-serif text-xl font-bold text-ink">User Details</h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* Profile Header */}
          <div className="flex items-start gap-4">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="h-14 w-14 object-cover border border-rule"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center border border-rule bg-surface-inset text-lg font-bold text-ink-muted">
                {(profile.full_name ?? "?")[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-serif text-lg font-bold text-ink">{profile.full_name ?? "Unknown"}</h3>
                <RoleBadge role={profile.system_role} />
                <AccountTypeBadge type={profile.account_type ?? "creator"} />
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <Mail size={12} className="text-ink-muted" />
                <span className="font-mono text-xs text-ink-secondary">{profile.email ?? "No email"}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Globe size={12} className="text-ink-muted" />
                <span className="text-xs text-ink-secondary">
                  <ProviderIcon provider={profile.provider} />
                </span>
              </div>
            </div>
          </div>

          {/* KPI Grid */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <KpiCard label="Social Profiles" value={usage.socialProfiles} icon={Users} />
            <KpiCard label="Analyses" value={usage.analyses} icon={BarChart3} />
            <KpiCard label="Team Members" value={usage.members} icon={Users} />
            <KpiCard label="Deals" value={usage.deals} icon={Briefcase} />
          </div>

          {/* Social Profiles */}
          {details.socialProfiles.length > 0 && (
            <SectionCard title="Connected Profiles" icon={Users}>
              <div className="space-y-2">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {details.socialProfiles.map((sp: any) => (
                  <div key={sp.id} className="flex items-center justify-between border-b border-rule/50 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <PlatformIcon platform={sp.platform} />
                      <span className="font-mono text-xs text-ink">@{sp.handle}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-ink-muted">
                      <span className="font-mono">{(sp.followers_count ?? 0).toLocaleString()} followers</span>
                      {sp.engagement_rate != null && (
                        <span className="font-mono">{(sp.engagement_rate * 100).toFixed(1)}% eng</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Organization */}
          {org && (
            <SectionCard title="Organization" icon={Briefcase}>
              <div className="space-y-0">
                <InfoRow label="Name" value={org.name} />
                <InfoRow label="Slug" value={org.slug} mono />
                <InfoRow label="Plan" value={<PlanBadge plan={org.plan} />} />
                <InfoRow label="Status" value={<StatusBadge status={org.subscription_status} />} />
                <InfoRow label="Max Profiles" value={org.max_social_profiles ?? "--"} mono />
                {org.stripe_customer_id && (
                  <InfoRow label="Stripe Customer" value={org.stripe_customer_id.slice(0, 16) + "..."} mono />
                )}
                {org.stripe_subscription_id && (
                  <InfoRow label="Stripe Sub" value={org.stripe_subscription_id.slice(0, 16) + "..."} mono />
                )}
                <InfoRow label="Created" value={formatDate(org.created_at)} />
              </div>
            </SectionCard>
          )}

          {/* Account Info */}
          <SectionCard title="Account Info" icon={Shield}>
            <div className="space-y-0">
              <InfoRow label="Role" value={profile.role} mono />
              <InfoRow label="System Role" value={<RoleBadge role={profile.system_role} />} />
              <InfoRow label="Account Type" value={<AccountTypeBadge type={profile.account_type ?? "creator"} />} />
              <InfoRow label="Created" value={formatDate(profile.created_at)} />
              <InfoRow
                label="Last Sign In"
                value={profile.lastSignIn ? timeAgo(profile.lastSignIn) : "Never"}
              />
              <InfoRow label="Timezone" value={profile.timezone ?? "--"} mono />
              <InfoRow
                label="Onboarding"
                value={
                  <span className={profile.onboarding_completed ? "text-editorial-green" : "text-editorial-red"}>
                    {profile.onboarding_completed ? "Complete" : "Incomplete"}
                  </span>
                }
              />
              <InfoRow label="User ID" value={profile.id.slice(0, 12) + "..."} mono />
            </div>
          </SectionCard>

          {/* Billing & Subscription */}
          {org && (
            <SectionCard title="Billing & Subscription" icon={CreditCard}>
              <div className="space-y-0 mb-3">
                <InfoRow label="Plan" value={<PlanBadge plan={org.plan} />} />
                <InfoRow label="Status" value={<StatusBadge status={org.subscription_status} />} />
                {org.stripe_customer_id && (
                  <InfoRow label="Stripe Customer" value={org.stripe_customer_id.slice(0, 20) + "..."} mono />
                )}
              </div>
              {details.billingEvents.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-ink-muted mb-2">Payment History</p>
                  <div className="space-y-1.5">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {details.billingEvents.map((e: any) => (
                      <div key={e.id} className="flex items-center justify-between text-xs">
                        <span className="text-ink-secondary">{e.event_type.replace(/[._]/g, " ")}</span>
                        <div className="flex items-center gap-2">
                          {e.amount_cents != null && (
                            <span className="font-mono text-ink font-medium">
                              ${(e.amount_cents / 100).toFixed(2)}
                            </span>
                          )}
                          <span className="text-ink-muted font-mono text-[10px]">{timeAgo(e.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </SectionCard>
          )}

          {/* Complimentary Account */}
          <SectionCard title="Complimentary Account" icon={Star}>
            <div className="flex items-start gap-3">
              <button
                onClick={() => handleCompToggle(!compAccount)}
                disabled={isPending}
                className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors ${
                  compAccount
                    ? "border-editorial-green bg-editorial-green"
                    : "border-rule bg-surface-inset"
                } ${isPending ? "opacity-50" : ""}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                    compAccount ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
              <div>
                <p className="text-xs font-medium text-ink">
                  {compAccount ? "ACTIVE" : "Disabled"} — Unlimited plan access
                </p>
                <p className="text-[10px] text-ink-muted mt-0.5">
                  {compAccount
                    ? "This user has complimentary access. No billing required."
                    : "Enable to grant unlimited plan access at no charge."}
                </p>
              </div>
            </div>
          </SectionCard>

          {/* Recent Analyses */}
          {details.recentAnalyses.length > 0 && (
            <SectionCard title="Recent Analyses" icon={BarChart3}>
              <div className="space-y-1.5">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {details.recentAnalyses.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                        {a.analysis_type?.replace(/_/g, " ")}
                      </span>
                      {a.ai_provider && (
                        <span className="font-mono text-[10px] text-ink-muted">{a.ai_provider}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {a.tokens_used != null && a.tokens_used > 0 && (
                        <span className="font-mono text-[10px] text-ink-muted">{a.tokens_used.toLocaleString()} tok</span>
                      )}
                      <span className="font-mono text-[10px] text-ink-muted">{timeAgo(a.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Recent Activity (Audit Log) */}
          {details.recentActivity.length > 0 && (
            <SectionCard title="Recent Activity" icon={Clock}>
              <div className="space-y-1.5">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {details.recentActivity.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between text-xs">
                    <span className="text-ink-secondary">
                      {a.action?.replace(/_/g, " ")}
                      {a.resource_type && (
                        <span className="text-ink-muted"> ({a.resource_type.replace(/_/g, " ")})</span>
                      )}
                    </span>
                    <span className="font-mono text-[10px] text-ink-muted">{timeAgo(a.created_at)}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Deals */}
          {details.deals.length > 0 && (
            <SectionCard title="Recent Deals" icon={Briefcase}>
              <div className="space-y-1.5">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {details.deals.map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between text-xs">
                    <span className="text-ink">{d.brand_name}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${
                        d.status === "completed" ? "text-editorial-green"
                          : d.status === "active" ? "text-editorial-blue"
                          : "text-ink-muted"
                      }`}>{d.status}</span>
                      {d.total_value != null && (
                        <span className="font-mono text-ink">${d.total_value.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Actions */}
          <SectionCard title="Actions" icon={Shield}>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-ink-muted block mb-1">
                  System Role
                </label>
                <select
                  defaultValue={profile.system_role}
                  onChange={(e) => {
                    startTransition(async () => {
                      await updateUserRole(profile.id, e.target.value);
                    });
                  }}
                  disabled={isPending}
                  className="border border-rule bg-surface-card px-2 py-1 text-xs font-mono text-ink focus:outline-none focus:border-ink disabled:opacity-50 [&>option]:bg-surface-card [&>option]:text-ink"
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                  <option value="superadmin">superadmin</option>
                </select>
              </div>
              <button
                onClick={() => {
                  if (confirm(`Delete user "${profile.full_name ?? profile.email}"? This cannot be undone.`)) {
                    startTransition(async () => {
                      await deleteUser(profile.id);
                      onClose();
                    });
                  }
                }}
                disabled={isPending}
                className="flex items-center gap-1.5 border border-editorial-red/30 bg-editorial-red/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-editorial-red hover:bg-editorial-red/20 transition-colors disabled:opacity-50"
              >
                <Trash2 size={12} />
                Delete User
              </button>
            </div>
          </SectionCard>
        </div>
    </>
  );
}

/* ─── Main Component ─── */

type AccountFilter = "all" | "creator" | "brand";

export function UsersClient({ users }: { users: UserRow[] }) {
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState<AccountFilter>("all");
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  // User details modal state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [userDetails, setUserDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const filtered = useMemo(() => {
    let result = users;
    if (accountFilter !== "all") {
      result = result.filter((u) => u.account_type === accountFilter);
    }
    if (!search.trim()) return result;
    const q = search.toLowerCase();
    return result.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.org_name?.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.system_role.toLowerCase().includes(q),
    );
  }, [users, search, accountFilter]);

  const handleUserClick = useCallback(async (userId: string) => {
    setSelectedUserId(userId);
    setUserDetails(null);
    setDetailsLoading(true);
    try {
      const result = await getUserDetails(userId);
      if ("data" in result) {
        setUserDetails(result.data);
      } else {
        setActionError((result as { error: string }).error ?? "Failed to load user details");
      }
    } catch {
      setActionError("Failed to load user details");
    }
    setDetailsLoading(false);
  }, []);

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-ink mb-1">Users</h1>
      <p className="text-xs text-ink-muted mb-4">
        {users.length} total user{users.length !== 1 ? "s" : ""}
      </p>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 mb-6">
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">{users.length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Total Users</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-editorial-red">{users.filter(u => u.system_role === 'admin' || u.system_role === 'superadmin').length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Admins</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">{users.filter(u => u.org_name).length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">With Org</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">{users.filter(u => !u.provider || u.provider === 'email').length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Email Sign-ups</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-editorial-green">{users.filter(u => Date.now() - new Date(u.created_at).getTime() < 7 * 86400000).length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">New 7d</div>
        </div>
      </div>

      {/* Account Type Filter */}
      <div className="flex items-center gap-1 mb-4">
        {(["all", "creator", "brand"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setAccountFilter(tab)}
            className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest border transition-colors ${
              accountFilter === tab
                ? "border-ink bg-surface-raised text-ink"
                : "border-rule text-ink-muted hover:text-ink hover:border-ink"
            }`}
          >
            {tab === "all" ? "All" : tab === "creator" ? "Creators" : "Brands"}
            <span className="ml-1.5 font-mono text-[10px]">
              {tab === "all"
                ? users.length
                : users.filter((u) => u.account_type === tab).length}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users by name, email, org, role..."
          className="w-full border border-rule bg-transparent py-2.5 pl-9 pr-4 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
        />
      </div>

      {/* Error */}
      {actionError && (
        <div className="mb-4 border border-editorial-red bg-editorial-red/5 px-4 py-2 text-xs text-editorial-red">
          {actionError}
          <button onClick={() => setActionError(null)} className="ml-2 underline">dismiss</button>
        </div>
      )}

      {/* Table */}
      <div className="border border-rule overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-rule">
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Name
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Email
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Plan
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Type
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                System Role
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Provider
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Joined
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-ink-muted"
                >
                  {search ? "No users match your search." : "No users found."}
                </td>
              </tr>
            ) : (
              filtered.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => handleUserClick(user.id)}
                  className="border-b border-rule hover:bg-surface-raised/50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-2.5 text-sm font-medium text-ink whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="h-6 w-6 object-cover border border-rule" />
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center bg-surface-inset text-[10px] font-bold text-ink-muted border border-rule">
                          {(user.full_name ?? "?")[0]?.toUpperCase()}
                        </div>
                      )}
                      {user.full_name ?? "Unknown"}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-sm text-ink-secondary whitespace-nowrap">
                    {user.email ?? "--"}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <PlanBadge plan={user.org_plan} />
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <AccountTypeBadge type={user.account_type} />
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <RoleBadge role={user.system_role} />
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-ink-muted whitespace-nowrap">
                    <ProviderIcon provider={user.provider} />
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-ink-muted whitespace-nowrap">
                    {timeAgo(user.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-ink-muted font-mono">
          Showing {filtered.length} of {users.length} users
        </p>
      </div>

      {/* User Details Modal */}
      {selectedUserId && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-8 pb-8" onClick={() => { setSelectedUserId(null); setUserDetails(null); }}>
          <div className="relative w-full max-w-2xl border border-rule bg-surface-cream" onClick={(e) => e.stopPropagation()}>
            {detailsLoading ? (
              <div className="flex items-center justify-center p-16">
                <Loader2 size={32} className="animate-spin text-ink-muted" />
              </div>
            ) : userDetails ? (
              <UserDetailsModal
                details={userDetails}
                onClose={() => { setSelectedUserId(null); setUserDetails(null); }}
              />
            ) : (
              <div className="p-8 text-center text-sm text-ink-muted">
                Failed to load user details.
                <button onClick={() => { setSelectedUserId(null); setUserDetails(null); }} className="mt-2 block mx-auto underline">Close</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
