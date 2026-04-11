'use client';

import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OverviewData {
  latestAudit: {
    overallScore: number; technicalScore: number; contentScore: number;
    performanceScore: number; geoScore: number; totalIssues: number;
    criticalIssues: number; createdAt: string;
  } | null;
  statusCounts: { open: number; implemented: number; dismissed: number };
  estimatedIndexedPages: number;
  auditHistory: Array<{ overallScore: number; technicalScore: number; contentScore: number; geoScore: number; createdAt: string }>;
  issuesByCategory: { technical: number; content: number; performance: number; geo: number } | null;
}

interface AEOSummary {
  aeoScore: number;
  contentStats: {
    totalPosts: number;
    withMetaTitle: number;
    withMetaDesc?: number;
    withMetaDescription?: number;
    withTags: number;
    withCoverImage: number;
    longFormPosts?: number;
    longForm?: number;
  };
}

interface CROSummary {
  croScore: number;
  funnel: {
    totalUsers: number;
    activatedUsers: number;
    paidOrgs: number;
    activationRate: number;
    paidConvRate?: number;
    paidConversionRate?: number;
  };
}

/* ------------------------------------------------------------------ */
/*  Score circle gauge                                                 */
/* ------------------------------------------------------------------ */

function ScoreCircle({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? '#4ade80' : score >= 60 ? '#4B9CD3' : score >= 40 ? '#FFB84D' : '#ef4444';
  const circ = 2 * Math.PI * 40;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-light text-ink">{score}</span>
        </div>
      </div>
      <p className="text-sm text-ink-muted mt-2">{label}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Content Health progress bar                                        */
/* ------------------------------------------------------------------ */

function ProgressBar({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const color = pct >= 80 ? 'bg-editorial-green' : pct >= 50 ? 'bg-editorial-gold' : 'bg-red-500';
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-ink">{label}</span>
        <span className="text-xs text-ink-muted">{value}/{total} ({pct}%)</span>
      </div>
      <div className="w-full h-2 bg-ink/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared styles                                                      */
/* ------------------------------------------------------------------ */

const tooltipStyle = { backgroundColor: '#112240', border: '1px solid rgba(75,156,211,0.2)', borderRadius: 8, padding: '8px 12px', color: '#E8F0FA', fontSize: 11, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' };

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function OverviewTab({ onTabChange }: { onTabChange: (tab: string) => void }) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [aeo, setAeo] = useState<AEOSummary | null>(null);
  const [cro, setCro] = useState<CROSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningAudit, setIsRunningAudit] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setIsLoading(true);
      const [overviewResult, aeoResult, croResult] = await Promise.allSettled([
        fetch('/api/admin/seo-geo/overview').then(r => r.ok ? r.json() : null),
        fetch('/api/admin/seo-geo/aeo').then(r => r.ok ? r.json() : null),
        fetch('/api/admin/seo-geo/cro').then(r => r.ok ? r.json() : null),
      ]);
      if (overviewResult.status === 'fulfilled' && overviewResult.value) setData(overviewResult.value);
      if (aeoResult.status === 'fulfilled' && aeoResult.value) setAeo(aeoResult.value);
      if (croResult.status === 'fulfilled' && croResult.value) setCro(croResult.value);
    } catch {
      // fail silently — individual sections will just not render
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunAudit = async () => {
    try { setIsRunningAudit(true); const res = await fetch('/api/admin/seo-geo/audit', { method: 'POST' }); if (res.ok) await fetchAll(); }
    catch {} finally { setIsRunningAudit(false); }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-ink/10 border-t-editorial-gold animate-spin" /></div>;

  const issuesChart = data?.issuesByCategory ? [
    { category: 'Technical', count: data.issuesByCategory.technical },
    { category: 'Content', count: data.issuesByCategory.content },
    { category: 'Performance', count: data.issuesByCategory.performance },
    { category: 'GEO', count: data.issuesByCategory.geo },
  ] : [];

  const historyChart = (data?.auditHistory || []).map((a) => ({
    date: new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    overall: a.overallScore, technical: a.technicalScore, content: a.contentScore, geo: a.geoScore,
  }));

  /* Derive AEO content stats */
  const cs = aeo?.contentStats;
  const totalPosts = cs?.totalPosts ?? 0;
  const withMetaTitle = cs?.withMetaTitle ?? 0;
  const withMetaDesc = cs?.withMetaDesc ?? cs?.withMetaDescription ?? 0;
  const withCoverImage = cs?.withCoverImage ?? 0;
  const withTags = cs?.withTags ?? 0;
  const longFormPosts = cs?.longFormPosts ?? cs?.longForm ?? 0;

  /* Derive CRO funnel */
  const funnel = cro?.funnel;
  const funnelTotalUsers = funnel?.totalUsers ?? 0;
  const funnelActivated = funnel?.activatedUsers ?? 0;
  const funnelPaid = funnel?.paidOrgs ?? 0;
  const funnelActivationRate = funnel?.activationRate ?? 0;
  const funnelPaidRate = funnel?.paidConvRate ?? funnel?.paidConversionRate ?? 0;

  return (
    <div className="space-y-6">

      {/* ── KPI Grid (6 cards) ──────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* 1. SEO Health Score */}
        <div className="border border-rule bg-surface-card flex flex-col items-center py-5">
          <ScoreCircle score={data?.latestAudit?.overallScore ?? 0} label="SEO Health Score" />
        </div>

        {/* 2. GEO Score */}
        <div className="border border-rule bg-surface-card flex flex-col items-center py-5">
          <ScoreCircle score={data?.latestAudit?.geoScore ?? 0} label="GEO Score" />
        </div>

        {/* 3. AEO Score */}
        <div className="border border-rule bg-surface-card flex flex-col items-center py-5">
          <ScoreCircle score={aeo?.aeoScore ?? 0} label="AEO Score" />
        </div>

        {/* 4. CRO Score */}
        <div className="border border-rule bg-surface-card flex flex-col items-center py-5">
          <ScoreCircle score={cro?.croScore ?? 0} label="CRO Score" />
        </div>

        {/* 5. Indexed Pages */}
        <div className="border border-rule bg-surface-card p-5">
          <div className="font-mono text-3xl font-bold text-ink">{data?.estimatedIndexedPages ?? 0}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">Indexed Pages (est.)</div>
          <p className="text-xs text-ink-muted mt-2">Based on sitemap entries</p>
        </div>

        {/* 6. Open Recommendations */}
        <div className="border border-rule bg-surface-card p-5">
          <div className="font-mono text-3xl font-bold text-ink">{data?.statusCounts?.open ?? 0}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">Open Recommendations</div>
          <div className="flex gap-3 mt-2">
            <span className="text-xs text-editorial-green">{data?.statusCounts?.implemented ?? 0} done</span>
            <span className="text-xs text-ink-muted">{data?.statusCounts?.dismissed ?? 0} dismissed</span>
          </div>
        </div>
      </div>

      {/* ── Content Health ──────────────────────────────────────── */}
      {aeo && totalPosts > 0 && (
        <div className="border border-rule bg-surface-card">
          <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Content Health</span>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
            <ProgressBar label="Meta title coverage" value={withMetaTitle} total={totalPosts} />
            <ProgressBar label="Meta description coverage" value={withMetaDesc} total={totalPosts} />
            <ProgressBar label="Cover image coverage" value={withCoverImage} total={totalPosts} />
            <ProgressBar label="Tag coverage" value={withTags} total={totalPosts} />
            <ProgressBar label="Long-form content" value={longFormPosts} total={totalPosts} />
          </div>
        </div>
      )}

      {/* ── Conversion Funnel Summary ──────────────────────────── */}
      {cro && (
        <div className="border border-rule bg-surface-card">
          <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Conversion Funnel</span>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {/* Total Users */}
              <div className="border border-rule bg-surface-card p-4 text-center min-w-[120px]">
                <div className="font-mono text-3xl font-bold text-ink">{funnelTotalUsers}</div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">Total Users</div>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center px-1">
                <span className="text-ink-muted text-lg">&#8594;</span>
                <span className="text-[10px] text-ink-muted">{funnelActivationRate}%</span>
              </div>

              {/* Activated */}
              <div className="border border-rule bg-surface-card p-4 text-center min-w-[120px]">
                <div className="font-mono text-3xl font-bold text-ink">{funnelActivated}</div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">Activated</div>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center px-1">
                <span className="text-ink-muted text-lg">&#8594;</span>
                <span className="text-[10px] text-ink-muted">{funnelPaidRate}%</span>
              </div>

              {/* Paid */}
              <div className="border border-rule bg-surface-card p-4 text-center min-w-[120px]">
                <div className="font-mono text-3xl font-bold text-ink">{funnelPaid}</div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">Paid</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Charts: Score Trend + Issues by Category ───────────── */}
      {historyChart.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border border-rule bg-surface-card">
            <div className="border-b border-rule bg-surface-raised px-4 py-2.5"><span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Score Trend</span></div>
            <div className="p-4 min-w-0">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={historyChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule, #ddd)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#6B5D8E', fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#6B5D8E', fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="overall" stroke="#FFB84D" strokeWidth={2} name="Overall" dot={{ fill: '#FFB84D' }} />
                  <Line type="monotone" dataKey="geo" stroke="#4ade80" strokeWidth={2} name="GEO" dot={{ fill: '#4ade80' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="border border-rule bg-surface-card">
            <div className="border-b border-rule bg-surface-raised px-4 py-2.5"><span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Issues by Category</span></div>
            <div className="p-4 min-w-0">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={issuesChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule, #ddd)" vertical={false} />
                  <XAxis dataKey="category" tick={{ fill: '#6B5D8E', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#6B5D8E', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="#FFB84D" radius={[4, 4, 0, 0]} name="Issues" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── No Audit CTA ───────────────────────────────────────── */}
      {!data?.latestAudit && (
        <div className="border border-rule bg-surface-card p-8 text-center">
          <h3 className="text-lg font-semibold text-ink mb-2">No Audit Data Yet</h3>
          <p className="text-sm text-ink-muted mb-4 max-w-sm mx-auto">Run your first SEO & GEO audit to see health scores and recommendations.</p>
          <button onClick={handleRunAudit} disabled={isRunningAudit}
            className="px-4 py-2 bg-editorial-gold text-surface-cream text-[11px] font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50">
            {isRunningAudit ? 'Running Audit...' : 'Run First Audit'}
          </button>
        </div>
      )}

      {/* ── Quick Actions ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: isRunningAudit ? 'Running...' : 'Run New Audit', subtitle: 'Scan for SEO & GEO issues', onClick: handleRunAudit, disabled: isRunningAudit, color: '#FFB84D' },
          { title: 'View Recommendations', subtitle: `${data?.statusCounts?.open ?? 0} pending`, onClick: () => onTabChange('recommendations'), color: '#4B9CD3' },
          { title: 'Edit llms.txt', subtitle: 'Manage AI engine content', onClick: () => onTabChange('geo'), color: '#4ade80' },
          { title: 'Configure Settings', subtitle: 'SEO & GEO configuration', onClick: () => onTabChange('settings'), color: '#a78bfa' },
        ].map((a, i) => (
          <button key={i} onClick={a.onClick} disabled={a.disabled}
            className="p-4 border border-rule bg-surface-card hover:border-ink/10 transition-colors text-left disabled:opacity-50">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: a.color }} />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">{a.title}</p>
                <p className="text-xs text-ink-muted">{a.subtitle}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* ── Last Audit Timestamp ───────────────────────────────── */}
      {data?.latestAudit && (
        <p className="text-xs text-ink-muted text-center">
          Last audit: {new Date(data.latestAudit.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      )}
    </div>
  );
}
