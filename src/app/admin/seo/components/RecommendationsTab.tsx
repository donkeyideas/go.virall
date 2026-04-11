'use client';

import { useState, useEffect, useCallback } from 'react';

/* ---------- types ---------- */
interface Recommendation {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  impact: string;
  effort: string;
  category: string;
  status: 'open' | 'implemented' | 'dismissed';
}

interface RecommendationsData {
  recommendations: Recommendation[];
  counts: {
    all: number;
    open: number;
    implemented: number;
    dismissed: number;
  };
}

interface CrossTabInsight {
  source: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
}

type StatusFilter = 'all' | 'open' | 'implemented' | 'dismissed';

/* ---------- helpers ---------- */
function SeverityBadge({ severity }: { severity: 'critical' | 'warning' | 'info' }) {
  const cls =
    severity === 'critical'
      ? 'bg-red-500/10 text-red-400'
      : severity === 'warning'
        ? 'bg-editorial-gold/10 text-editorial-gold'
        : 'bg-blue-400/10 text-blue-400';
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {severity}
    </span>
  );
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-editorial-red/10 text-editorial-red',
  medium: 'bg-editorial-gold/10 text-editorial-gold',
  low: 'bg-editorial-blue/10 text-editorial-blue',
};

/* ---------- component ---------- */
export default function RecommendationsTab() {
  const [data, setData] = useState<RecommendationsData | null>(null);
  const [crossTab, setCrossTab] = useState<CrossTabInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchRecommendations = useCallback(async () => {
    try {
      setIsLoading(true);
      const [recsResult, aeoResult, croResult] = await Promise.allSettled([
        fetch('/api/admin/seo-geo/recommendations').then(r => r.ok ? r.json() : null),
        fetch('/api/admin/seo-geo/aeo').then(r => r.ok ? r.json() : null),
        fetch('/api/admin/seo-geo/cro').then(r => r.ok ? r.json() : null),
      ]);

      if (recsResult.status === 'fulfilled' && recsResult.value) {
        const json = recsResult.value;
        const sc = json.statusCounts ?? json.counts ?? { open: 0, implemented: 0, dismissed: 0 };
        setData({
          recommendations: json.recommendations ?? [],
          counts: {
            all: (sc.open ?? 0) + (sc.implemented ?? 0) + (sc.dismissed ?? 0),
            open: sc.open ?? 0,
            implemented: sc.implemented ?? 0,
            dismissed: sc.dismissed ?? 0,
          },
        });
      }

      // Collect cross-tab insights from AEO and CRO
      const insights: CrossTabInsight[] = [];
      if (aeoResult.status === 'fulfilled' && aeoResult.value?.recommendations) {
        for (const r of aeoResult.value.recommendations) {
          insights.push({ source: 'AEO', priority: r.priority ?? 'medium', title: r.title, description: r.description });
        }
      }
      if (croResult.status === 'fulfilled' && croResult.value?.recommendations) {
        for (const r of croResult.value.recommendations) {
          insights.push({ source: 'CRO', priority: r.priority ?? 'medium', title: r.title, description: r.description });
        }
      }
      setCrossTab(insights);
    } catch {
      /* ignore */
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecommendations(); }, [fetchRecommendations]);

  const handleUpdateStatus = async (id: string, newStatus: 'implemented' | 'dismissed') => {
    try {
      setUpdatingId(id);
      const res = await fetch('/api/admin/seo-geo/recommendations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) await fetchRecommendations();
    } catch {
      /* ignore */
    } finally {
      setUpdatingId(null);
    }
  };

  const recommendations = data?.recommendations ?? [];
  const counts = data?.counts ?? { all: 0, open: 0, implemented: 0, dismissed: 0 };
  const categories = Array.from(new Set(recommendations.map((r) => r.category))).sort();

  const filtered = recommendations.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
    return true;
  });

  const handleCopyAll = () => {
    const recs = filtered.length > 0 ? filtered : recommendations;
    const text = recs.map((r, i) =>
      `${i + 1}. [${r.severity.toUpperCase()}] ${r.title}\n   ${r.description}\n   Category: ${r.category} | Impact: ${r.impact} | Effort: ${r.effort} | Status: ${r.status}`
    ).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ---------- loading ---------- */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 rounded-full border-2 border-rule border-t-editorial-gold animate-spin" />
      </div>
    );
  }

  const statusTabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'open', label: 'Open', count: counts.open },
    { key: 'implemented', label: 'Done', count: counts.implemented },
    { key: 'dismissed', label: 'Dismissed', count: counts.dismissed },
  ];

  /* ---------- derived stats ---------- */
  const openRecs = recommendations.filter(r => r.status === 'open');
  const severityCounts = {
    critical: openRecs.filter(r => r.severity === 'critical').length,
    warning: openRecs.filter(r => r.severity === 'warning').length,
    info: openRecs.filter(r => r.severity === 'info').length,
  };
  const categoryMap: Record<string, number> = {};
  for (const r of openRecs) {
    categoryMap[r.category] = (categoryMap[r.category] || 0) + 1;
  }
  const categoryBreakdown = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);

  /* ---------- render ---------- */
  return (
    <div className="space-y-5">
      {/* Status counts overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statusTabs.map((tab) => (
          <div key={tab.key} className="border border-rule bg-surface-card p-5">
            <div className="font-mono text-3xl font-bold text-ink">{tab.count}</div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">{tab.label}</div>
          </div>
        ))}
      </div>

      {/* Severity + Category breakdown */}
      {openRecs.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Severity Distribution */}
          <div className="border border-rule bg-surface-card">
            <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
              <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Open by Severity</span>
            </div>
            <div className="p-4 space-y-3">
              {([
                { label: 'Critical', count: severityCounts.critical, color: 'bg-editorial-red' },
                { label: 'Warning', count: severityCounts.warning, color: 'bg-editorial-gold' },
                { label: 'Info', count: severityCounts.info, color: 'bg-editorial-blue' },
              ] as const).map((row) => {
                const maxCount = Math.max(severityCounts.critical, severityCounts.warning, severityCounts.info, 1);
                const pct = Math.round((row.count / maxCount) * 100);
                return (
                  <div key={row.label} className="flex items-center gap-3">
                    <span className="w-16 text-xs text-ink-muted text-right">{row.label}</span>
                    <div className="flex-1 h-3 bg-ink/5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${row.color}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-xs font-mono text-ink text-right">{row.count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category Distribution */}
          <div className="border border-rule bg-surface-card">
            <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
              <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Open by Category</span>
            </div>
            <div className="p-4 space-y-3">
              {categoryBreakdown.map(([cat, count]) => {
                const maxCat = categoryBreakdown[0]?.[1] ?? 1;
                const pct = Math.round((count / maxCat) * 100);
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="w-28 text-xs text-ink-muted text-right truncate" title={cat}>{cat}</span>
                    <div className="flex-1 h-3 bg-ink/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-editorial-gold" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-xs font-mono text-ink text-right">{count}</span>
                  </div>
                );
              })}
              {categoryBreakdown.length === 0 && (
                <p className="text-xs text-ink-muted text-center py-2">No open recommendations</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters + Copy All */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center border border-rule overflow-hidden">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                statusFilter === tab.key
                  ? 'bg-editorial-gold text-surface-cream'
                  : 'text-ink-muted hover:text-ink hover:bg-surface-card'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {categories.length > 1 && (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-rule bg-surface-card text-[12px] font-bold uppercase tracking-wider text-ink-muted focus:outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        )}

        <button
          onClick={handleCopyAll}
          disabled={recommendations.length === 0}
          className="ml-auto px-4 py-2 border border-rule text-[11px] font-bold uppercase tracking-wider text-ink-muted hover:text-editorial-gold hover:border-editorial-gold/30 transition-colors disabled:opacity-30"
        >
          {copied ? 'Copied!' : 'Copy All'}
        </button>
      </div>

      {/* Recommendation cards */}
      {filtered.length === 0 ? (
        <div className="border border-rule bg-surface-card p-8 text-center">
          <h3 className="text-sm font-bold text-ink mb-1">No Recommendations</h3>
          <p className="text-[12px] text-ink-muted">
            {statusFilter === 'all'
              ? 'Run an audit to generate SEO and GEO recommendations.'
              : `No ${statusFilter} recommendations found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((rec) => (
            <div key={rec.id} className="border border-rule bg-surface-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <SeverityBadge severity={rec.severity} />
                  <span className="text-sm font-bold text-ink">{rec.title}</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted whitespace-nowrap px-2 py-0.5 border border-rule">
                  {rec.category}
                </span>
              </div>

              <p className="text-[13px] text-ink-muted mt-2">{rec.description}</p>

              <div className="flex flex-wrap gap-4 mt-3">
                {rec.impact && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Impact:</span>
                    <span className="text-[12px] text-ink">{rec.impact}</span>
                  </div>
                )}
                {rec.effort && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Effort:</span>
                    <span className="text-[12px] text-ink">{rec.effort}</span>
                  </div>
                )}
              </div>

              {rec.status === 'open' && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-rule">
                  <button
                    onClick={() => handleUpdateStatus(rec.id, 'implemented')}
                    disabled={updatingId === rec.id}
                    className="px-4 py-1.5 bg-editorial-gold text-surface-cream text-[11px] font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50"
                  >
                    {updatingId === rec.id ? 'Updating...' : 'Mark Done'}
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(rec.id, 'dismissed')}
                    disabled={updatingId === rec.id}
                    className="px-4 py-1.5 border border-rule text-[11px] font-bold uppercase tracking-wider text-ink-muted hover:text-ink disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {rec.status !== 'open' && (
                <div className="mt-3 pt-3 border-t border-rule">
                  <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    rec.status === 'implemented'
                      ? 'bg-green-500/10 text-green-400'
                      : 'text-ink-muted'
                  }`}>
                    {rec.status}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Cross-tab Insights from AEO & CRO */}
      {crossTab.length > 0 && (
        <div className="border border-rule bg-surface-card">
          <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Insights from AEO &amp; CRO</span>
          </div>
          <div className="divide-y divide-ink/5">
            {crossTab.map((insight, i) => (
              <div key={i} className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${PRIORITY_COLORS[insight.priority] || PRIORITY_COLORS.medium}`}>
                    {insight.priority}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted px-2 py-0.5 border border-rule">
                    {insight.source}
                  </span>
                  <span className="text-sm font-bold text-ink">{insight.title}</span>
                </div>
                <p className="text-[13px] text-ink-muted">{insight.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
