'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

/* ---------- types ---------- */
interface CROData {
  croScore: number;
  funnel: {
    totalUsers: number;
    activatedUsers: number;
    paidOrgs: number;
    activationRate: number;
    paidConversionRate: number;
  };
  engagement: {
    totalProfiles: number;
    totalAnalyses: number;
    avgProfilesPerUser: number;
  };
  monthlyData: Array<{
    month: string;
    signups: number;
    activated?: number;
    paid?: number;
  }>;
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    category: string;
  }>;
  ctaChecklist: Array<{
    page: string;
    cta: string;
    priority: 'high' | 'medium' | 'low';
    status: 'optimized' | 'needs_work' | 'missing';
  }>;
}

/* ---------- helpers ---------- */
const tooltipStyle = {
  backgroundColor: '#112240',
  border: '1px solid rgba(75,156,211,0.2)',
  borderRadius: 8,
  padding: '8px 12px',
  color: '#E8F0FA',
  fontSize: 11,
  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
};

function CROScoreCircle({ score }: { score: number }) {
  const s = score ?? 0;
  const color = s >= 80 ? '#4ade80' : s >= 60 ? '#4B9CD3' : s >= 40 ? '#FFB84D' : '#ef4444';
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (s / 100) * circ;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg className="w-36 h-36 -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-light text-ink">{score}</span>
          <span className="text-xs text-ink-muted">CRO Score</span>
        </div>
      </div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  const cls =
    priority === 'high'
      ? 'bg-editorial-red/10 text-editorial-red'
      : priority === 'medium'
        ? 'bg-editorial-gold/10 text-editorial-gold'
        : 'bg-editorial-blue/10 text-editorial-blue';
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold capitalize ${cls}`}>
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'optimized'
      ? 'bg-editorial-green/10 text-editorial-green'
      : status === 'needs_work'
        ? 'bg-editorial-gold/10 text-editorial-gold'
        : 'bg-editorial-red/10 text-editorial-red';
  const label = status === 'needs_work' ? 'Needs Work' : status === 'missing' ? 'Missing' : 'Optimized';
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

/* ---------- component ---------- */
export default function CROTab() {
  const [data, setData] = useState<CROData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCRO = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/seo-geo/cro');
      if (res.ok) {
        const raw = await res.json();
        // Map API field names to component expectations
        setData({
          ...raw,
          funnel: {
            ...raw.funnel,
            paidConversionRate: raw.funnel?.paidConvRate ?? raw.funnel?.paidConversionRate ?? 0,
            activationRate: raw.funnel?.activationRate ?? 0,
          },
          engagement: raw.engagementMetrics ?? raw.engagement ?? { totalProfiles: 0, totalAnalyses: 0, avgProfilesPerUser: 0 },
        });
      }
    } catch {
      /* ignore */
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchCRO(); }, [fetchCRO]);

  /* ---------- loading ---------- */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 rounded-full border-2 border-ink/10 border-t-editorial-gold animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="border border-rule bg-surface-card p-8 text-center">
        <h3 className="text-lg font-semibold text-ink mb-2">No CRO Data Available</h3>
        <p className="text-sm text-ink-muted max-w-sm mx-auto">
          CRO data could not be loaded. Please try again later.
        </p>
      </div>
    );
  }

  /* ---------- render ---------- */
  return (
    <div className="space-y-6">
      {/* Top row: CRO Score + Funnel Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CRO Score */}
        <div className="border border-rule bg-surface-card p-6 flex items-center justify-center">
          <CROScoreCircle score={data.croScore} />
        </div>

        {/* Funnel Metrics */}
        <div className="lg:col-span-2 border border-rule bg-surface-card">
          <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Conversion Funnel</h3>
            <p className="text-xs text-ink-muted mt-0.5">Signup &rarr; Connect Social Profile &rarr; Upgrade to Paid</p>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <div className="font-mono text-2xl font-bold text-ink">{formatNumber(data.funnel.totalUsers)}</div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">Total Users</div>
            </div>
            <div>
              <div className="font-mono text-2xl font-bold text-ink">{formatNumber(data.funnel.activatedUsers)}</div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">Activated Users</div>
            </div>
            <div>
              <div className="font-mono text-2xl font-bold text-ink">{formatNumber(data.funnel.paidOrgs)}</div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">Paid Orgs</div>
            </div>
            <div>
              <div className="font-mono text-2xl font-bold text-editorial-gold">{(data.funnel.activationRate ?? 0).toFixed(1)}%</div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">Activation Rate</div>
            </div>
            <div>
              <div className="font-mono text-2xl font-bold text-editorial-green">{(data.funnel.paidConversionRate ?? 0).toFixed(1)}%</div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">Paid Conv. Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* User Funnel Visualization */}
      <div className="border border-rule bg-surface-card">
        <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">User Funnel</h3>
        </div>
        <div className="p-4 space-y-3">
          {[
            { label: 'Total Users', value: data.funnel.totalUsers, color: 'bg-editorial-blue', pct: 100 },
            { label: 'Activated (connected profile)', value: data.funnel.activatedUsers, color: 'bg-editorial-gold', pct: data.funnel.totalUsers > 0 ? (data.funnel.activatedUsers / data.funnel.totalUsers) * 100 : 0 },
            { label: 'Paid Subscribers', value: data.funnel.paidOrgs, color: 'bg-editorial-green', pct: data.funnel.totalUsers > 0 ? (data.funnel.paidOrgs / data.funnel.totalUsers) * 100 : 0 },
          ].map(step => (
            <div key={step.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-ink">{step.label}</span>
                <span className="text-xs font-mono text-ink-muted">{step.value.toLocaleString()} ({step.pct.toFixed(1)}%)</span>
              </div>
              <div className="w-full h-4 bg-ink/5 rounded overflow-hidden">
                <div className={`h-full rounded ${step.color} transition-all`} style={{ width: `${Math.max(step.pct, 2)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Engagement Metrics */}
      <div className="border border-rule bg-surface-card">
        <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Engagement Metrics</h3>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <div className="font-mono text-2xl font-bold text-ink">{formatNumber(data.engagement.totalProfiles)}</div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">Total Profiles</div>
          </div>
          <div>
            <div className="font-mono text-2xl font-bold text-ink">{formatNumber(data.engagement.totalAnalyses)}</div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">Total Analyses</div>
          </div>
          <div>
            <div className="font-mono text-2xl font-bold text-editorial-blue">{(data.engagement.avgProfilesPerUser ?? 0).toFixed(1)}</div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">Avg Profiles per User</div>
          </div>
        </div>
      </div>

      {/* Growth KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-rule bg-surface-card p-5">
          <div className="font-mono text-2xl font-bold text-editorial-blue">
            {(data.engagement.avgProfilesPerUser ?? 0).toFixed(1)}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">Avg Profiles / User</div>
          <p className="text-xs text-ink-muted mt-2">Higher values indicate deeper platform adoption</p>
        </div>
        <div className="border border-rule bg-surface-card p-5">
          <div className="font-mono text-2xl font-bold text-editorial-gold">
            {data.engagement.totalProfiles > 0 ? (data.engagement.totalAnalyses / data.engagement.totalProfiles).toFixed(1) : '0.0'}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">Analyses / Profile</div>
          <p className="text-xs text-ink-muted mt-2">Average number of analyses run per connected profile</p>
        </div>
        <div className="border border-rule bg-surface-card p-5">
          <div className="font-mono text-2xl font-bold text-editorial-red">
            {(100 - (data.funnel.activationRate ?? 0)).toFixed(1)}%
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">Funnel Drop-off</div>
          <p className="text-xs text-ink-muted mt-2">Users who signed up but never connected a profile</p>
        </div>
      </div>

      {/* Monthly Signups Chart */}
      {data.monthlyData && data.monthlyData.length > 0 && (() => {
        const hasActivated = data.monthlyData.some(d => d.activated !== undefined);
        const hasPaid = data.monthlyData.some(d => d.paid !== undefined);
        return (
          <div className="border border-rule bg-surface-card">
            <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Monthly Signups</h3>
            </div>
            <div className="p-4 min-w-0">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule, #ddd)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#6B5D8E', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#6B5D8E', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="signups" fill="#FFB84D" radius={[4, 4, 0, 0]} name="Signups" />
                  {hasActivated && <Bar dataKey="activated" fill="#4ade80" radius={[4, 4, 0, 0]} name="Activated" />}
                  {hasPaid && <Bar dataKey="paid" fill="#4B9CD3" radius={[4, 4, 0, 0]} name="Paid" />}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })()}

      {/* CRO Recommendations */}
      {data.recommendations && data.recommendations.length > 0 && (
        <div className="border border-rule bg-surface-card">
          <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">CRO Recommendations</h3>
          </div>
          <div className="divide-y divide-ink/5">
            {data.recommendations.map((rec) => (
              <div key={rec.id} className="p-4 space-y-1">
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={rec.priority} />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">{rec.title}</span>
                  <span className="text-xs text-ink-muted ml-auto">{rec.category}</span>
                </div>
                <p className="text-sm text-ink-muted">{rec.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA Optimization Checklist */}
      {data.ctaChecklist && data.ctaChecklist.length > 0 && (
        <div className="border border-rule bg-surface-card">
          <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">CTA Optimization Checklist</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rule">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">Page</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">CTA</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {data.ctaChecklist.map((item, i) => (
                  <tr key={i} className="hover:bg-ink/[0.02] transition-colors">
                    <td className="px-4 py-3 text-ink">{item.page}</td>
                    <td className="px-4 py-3 text-ink-muted">{item.cta}</td>
                    <td className="px-4 py-3"><PriorityBadge priority={item.priority} /></td>
                    <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
