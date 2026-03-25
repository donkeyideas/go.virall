"use client";

import { useState, useTransition, useMemo } from "react";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  getOrgDetails,
  updateOrgPlan,
  deleteOrganization,
} from "@/lib/actions/admin";
import type { OrgRow } from "@/types";

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

function PlanBadge({ plan }: { plan: string }) {
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

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "active"
      ? "text-editorial-green"
      : status === "trialing"
        ? "text-editorial-gold"
        : status === "canceled"
          ? "text-editorial-red"
          : "text-ink-muted";
  return (
    <span className={`text-[11px] font-bold uppercase tracking-widest ${color}`}>
      {status}
    </span>
  );
}

type OrgDetailsData = {
  organization: Record<string, unknown> | null;
  members: Array<{
    id: string;
    full_name: string | null;
    role: string;
    system_role: string;
    created_at: string;
  }>;
  socialProfiles: Array<{
    id: string;
    platform: string;
    handle: string;
    followers_count: number;
    engagement_rate: number | null;
  }>;
  deals: Array<{
    id: string;
    brand_name: string;
    status: string;
    total_value: number | null;
    created_at: string;
  }>;
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    start_date: string | null;
    end_date: string | null;
    budget: number | null;
  }>;
};

function OrgExpandedRow({
  org,
  details,
  isLoading,
  onPlanChange,
  onDelete,
  isPending,
}: {
  org: OrgRow;
  details: OrgDetailsData | null;
  isLoading: boolean;
  onPlanChange: (orgId: string, plan: string) => void;
  onDelete: (orgId: string) => void;
  isPending: boolean;
}) {
  return (
    <tr>
      <td colSpan={9} className="border-b border-rule bg-surface-raised px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4 gap-2">
            <Loader2 size={18} className="animate-spin text-ink-muted" />
            <span className="text-sm text-ink-muted">Loading details...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            {/* Members */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-2">
                Members ({details?.members.length ?? 0})
              </p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {details?.members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between">
                    <span className="text-sm text-ink">
                      {m.full_name ?? "Unknown"}
                    </span>
                    <span className="font-mono text-[11px] text-ink-muted">
                      {m.role}
                    </span>
                  </div>
                ))}
                {(!details?.members || details.members.length === 0) && (
                  <p className="text-sm text-ink-muted">No members</p>
                )}
              </div>
            </div>

            {/* Social Profiles */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-2">
                Social Profiles ({details?.socialProfiles.length ?? 0})
              </p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {details?.socialProfiles.map((sp) => (
                  <div key={sp.id} className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mr-1.5">
                        {sp.platform}
                      </span>
                      <span className="font-mono text-sm text-ink">
                        @{sp.handle}
                      </span>
                    </div>
                    <span className="font-mono text-sm text-ink-secondary">
                      {sp.followers_count.toLocaleString()}
                    </span>
                  </div>
                ))}
                {(!details?.socialProfiles || details.socialProfiles.length === 0) && (
                  <p className="text-sm text-ink-muted">No profiles</p>
                )}
              </div>
            </div>

            {/* Deals */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-2">
                Deals ({details?.deals.length ?? 0})
              </p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {details?.deals.map((d) => (
                  <div key={d.id} className="flex items-center justify-between">
                    <span className="text-sm text-ink">{d.brand_name}</span>
                    <div className="flex items-center gap-2">
                      {d.total_value != null && (
                        <span className="font-mono text-xs text-editorial-green">
                          ${d.total_value.toLocaleString()}
                        </span>
                      )}
                      <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                        {d.status}
                      </span>
                    </div>
                  </div>
                ))}
                {(!details?.deals || details.deals.length === 0) && (
                  <p className="text-sm text-ink-muted">No deals</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-2">
                Actions
              </p>
              <div className="space-y-3">
                {/* Change Plan */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-ink-muted block mb-1">
                    Plan
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      defaultValue={org.plan}
                      onChange={(e) => onPlanChange(org.id, e.target.value)}
                      disabled={isPending}
                      className="border border-rule bg-transparent px-2 py-1 text-xs font-mono text-ink focus:outline-none focus:border-ink disabled:opacity-50"
                    >
                      <option value="free">free</option>
                      <option value="pro">pro</option>
                      <option value="business">business</option>
                      <option value="enterprise">enterprise</option>
                    </select>
                    {isPending && (
                      <Loader2 size={20} className="animate-spin text-ink-muted" />
                    )}
                  </div>
                </div>

                {/* Stripe */}
                {org.stripe_customer_id && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-1">
                      Stripe
                    </p>
                    <p className="font-mono text-sm text-ink-secondary truncate">
                      {org.stripe_customer_id}
                    </p>
                  </div>
                )}

                {/* Delete */}
                <div>
                  <button
                    onClick={() => onDelete(org.id)}
                    disabled={isPending}
                    className="flex items-center gap-1.5 border border-editorial-red/30 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-editorial-red hover:bg-editorial-red/5 transition-colors disabled:opacity-40"
                  >
                    <Trash2 size={10} />
                    Delete Organization
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </td>
    </tr>
  );
}

export function OrgsClient({ orgs }: { orgs: OrgRow[] }) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, OrgDetailsData>>({});
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return orgs;
    const q = search.toLowerCase();
    return orgs.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.slug?.toLowerCase().includes(q) ||
        o.plan.toLowerCase().includes(q) ||
        o.subscription_status.toLowerCase().includes(q),
    );
  }, [orgs, search]);

  async function handleToggleExpand(orgId: string) {
    if (expandedId === orgId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(orgId);

    // Fetch details if not cached
    if (!expandedDetails[orgId]) {
      setLoadingDetails(orgId);
      try {
        const details = await getOrgDetails(orgId);
        setExpandedDetails((prev) => ({ ...prev, [orgId]: details as OrgDetailsData }));
      } catch {
        // silently fail, row will show empty
      } finally {
        setLoadingDetails(null);
      }
    }
  }

  function handlePlanChange(orgId: string, plan: string) {
    setActionError(null);
    startTransition(async () => {
      const result = await updateOrgPlan(orgId, plan);
      if (result.error) {
        setActionError(result.error);
      }
    });
  }

  function handleDelete(orgId: string) {
    const org = orgs.find((o) => o.id === orgId);
    const confirmed = window.confirm(
      `Are you sure you want to delete "${org?.name ?? "this organization"}"? This action cannot be undone.`,
    );
    if (!confirmed) return;

    setActionError(null);
    startTransition(async () => {
      const result = await deleteOrganization(orgId);
      if (result.error) {
        setActionError(result.error);
      } else {
        setExpandedId(null);
      }
    });
  }

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-ink mb-1">
        Organizations
      </h1>
      <p className="text-xs text-ink-muted mb-4">
        {orgs.length} total organization{orgs.length !== 1 ? "s" : ""}
      </p>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 mb-6">
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">{orgs.length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Total Orgs</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-editorial-gold">{orgs.filter(o => o.plan !== 'free').length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Paid</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-editorial-green">{orgs.filter(o => o.subscription_status === 'active').length}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Active</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">{orgs.reduce((a, o) => a + o.member_count, 0)}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Total Members</div>
        </div>
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">{orgs.reduce((a, o) => a + o.profile_count, 0)}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">Total Profiles</div>
        </div>
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
          placeholder="Search organizations by name, slug, plan, status..."
          className="w-full border border-rule bg-transparent py-2.5 pl-9 pr-4 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink font-mono"
        />
      </div>

      {/* Error */}
      {actionError && (
        <div className="mb-4 border border-editorial-red bg-editorial-red/5 px-4 py-2 text-xs text-editorial-red">
          {actionError}
        </div>
      )}

      {/* Table */}
      <div className="border border-rule overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-rule bg-surface-raised">
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted w-8" />
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Name
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Slug
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Plan
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Status
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted text-right">
                Members
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted text-right">
                Profiles
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted text-right">
                Deals
              </th>
              <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted">
                Created
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-8 text-center text-sm text-ink-muted"
                >
                  {search
                    ? "No organizations match your search."
                    : "No organizations found."}
                </td>
              </tr>
            ) : (
              filtered.map((org) => {
                const isExpanded = expandedId === org.id;
                return (
                  <>
                    <tr
                      key={org.id}
                      onClick={() => handleToggleExpand(org.id)}
                      className="border-b border-rule hover:bg-surface-raised/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-2.5 text-ink-muted">
                        {isExpanded ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-sm font-medium text-ink whitespace-nowrap">
                        {org.name}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-ink-muted whitespace-nowrap">
                        {org.slug ?? "--"}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <PlanBadge plan={org.plan} />
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <StatusBadge status={org.subscription_status} />
                      </td>
                      <td className="px-4 py-2.5 font-mono text-sm text-ink-secondary text-right whitespace-nowrap">
                        {org.member_count}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-sm text-ink-secondary text-right whitespace-nowrap">
                        {org.profile_count}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-sm text-ink-secondary text-right whitespace-nowrap">
                        {org.deal_count}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-ink-muted whitespace-nowrap">
                        {timeAgo(org.created_at)}
                      </td>
                    </tr>
                    {isExpanded && (
                      <OrgExpandedRow
                        key={`${org.id}-detail`}
                        org={org}
                        details={expandedDetails[org.id] ?? null}
                        isLoading={loadingDetails === org.id}
                        onPlanChange={handlePlanChange}
                        onDelete={handleDelete}
                        isPending={isPending}
                      />
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination placeholder */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-ink-muted font-mono">
          Showing {filtered.length} of {orgs.length} organizations
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled
            className="border border-rule px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted disabled:opacity-40"
          >
            Previous
          </button>
          <button
            disabled
            className="border border-rule px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-muted disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
