'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

/* ---------- types ---------- */
interface QueryRow { query: string; clicks: number; impressions: number; ctr: number; position: number }
interface PageRow  { page: string; clicks: number; impressions: number; ctr: number; position: number }
interface CountryRow { country: string; clicks: number; impressions: number }
interface DeviceRow  { device: string; clicks: number; impressions: number }
interface DateRow { date: string; clicks: number; impressions: number }

interface SearchConsoleData {
  connected: boolean;
  totals: { clicks: number; impressions: number; ctr: number; position: number };
  dateRows: DateRow[];
  topQueries: QueryRow[];
  topPages: PageRow[];
  countries: CountryRow[];
  devices: DeviceRow[];
}

/* ---------- constants ---------- */
const tooltipStyle = { backgroundColor: '#112240', border: '1px solid rgba(75,156,211,0.2)', borderRadius: 8, padding: '8px 12px', color: '#E8F0FA', fontSize: 11, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' };
const DATE_OPTIONS: { label: string; days: number }[] = [
  { label: '7 days', days: 7 },
  { label: '28 days', days: 28 },
  { label: '90 days', days: 90 },
];

/* ---------- helpers ---------- */
function fmtNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function fmtPct(n: number) {
  return (n * 100).toFixed(1) + '%';
}

/* ========== component ========== */
export default function SearchConsoleTab({ onTabChange }: { onTabChange?: (tab: string) => void }) {
  const [data, setData] = useState<SearchConsoleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(28);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const end = new Date();
      end.setDate(end.getDate() - 3);
      const start = new Date(end);
      start.setDate(start.getDate() - days);
      const startDate = start.toISOString().split('T')[0];
      const endDate = end.toISOString().split('T')[0];
      const res = await fetch(`/api/admin/seo-geo/search-console?type=overview&startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error('Failed to fetch Search Console data');
      const raw = await res.json();
      // Map API field names to component expectations
      setData({
        connected: raw.connected ?? false,
        totals: raw.totals ?? { clicks: 0, impressions: 0, ctr: 0, position: 0 },
        dateRows: raw.dateData ?? raw.dateRows ?? [],
        topQueries: raw.queries ?? raw.topQueries ?? [],
        topPages: raw.pages ?? raw.topPages ?? [],
        countries: raw.countries ?? [],
        devices: raw.devices ?? [],
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* --- loading --- */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 rounded-full border-2 border-ink/10 border-t-editorial-gold animate-spin" />
      </div>
    );
  }

  /* --- error --- */
  if (error) {
    return (
      <div className="border border-rule bg-surface-card p-8 text-center">
        <p className="text-sm text-editorial-red mb-3">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 bg-editorial-gold text-surface-cream text-[11px] font-bold uppercase tracking-wider hover:opacity-90">
          Retry
        </button>
      </div>
    );
  }

  /* --- not connected --- */
  if (data && !data.connected) {
    return (
      <div className="border border-rule bg-surface-card p-10 text-center">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-editorial-gold/10 flex items-center justify-center">
          <svg className="w-6 h-6 text-editorial-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-ink mb-2">Search Console Not Connected</h3>
        <p className="text-sm text-ink-muted mb-5 max-w-md mx-auto">
          Connect your Google Search Console account in Settings to see search performance data. GSC data is typically delayed by 3 days.
        </p>
        <button onClick={() => onTabChange?.('settings')} className="px-4 py-2 bg-editorial-gold text-surface-cream text-[11px] font-bold uppercase tracking-wider hover:opacity-90">
          Go to Settings
        </button>
      </div>
    );
  }

  if (!data) return null;

  /* --- chart data --- */
  const chartData = (data.dateRows || []).map((r) => ({
    date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    clicks: r.clicks,
    impressions: r.impressions,
  }));

  /* ========== render ========== */
  return (
    <div className="space-y-6">
      {/* date range selector */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-muted">Google Search Console data is typically delayed by 3 days.</p>
        <div className="flex gap-1 border border-rule bg-surface-card p-1">
          {DATE_OPTIONS.map((o) => (
            <button key={o.days} onClick={() => setDays(o.days)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${days === o.days ? 'bg-editorial-gold text-surface-cream' : 'text-ink-muted hover:text-ink'}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Clicks', value: fmtNum(data.totals.clicks), color: 'text-editorial-blue' },
          { label: 'Total Impressions', value: fmtNum(data.totals.impressions), color: 'text-editorial-gold' },
          { label: 'Average CTR', value: fmtPct(data.totals.ctr), color: 'text-editorial-green' },
          { label: 'Average Position', value: (data.totals.position ?? 0).toFixed(1), color: 'text-ink' },
        ].map((kpi) => (
          <div key={kpi.label} className="border border-rule bg-surface-card p-5">
            <div className={`font-mono text-3xl font-bold ${kpi.color}`}>{kpi.value}</div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* clicks / impressions chart */}
      {chartData.length > 0 && (
        <div className="border border-rule bg-surface-card">
          <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Clicks &amp; Impressions</h3>
          </div>
          <div className="p-4 min-w-0">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule, #ddd)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#6B5D8E', fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fill: '#6B5D8E', fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#6B5D8E', fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="#4B9CD3" strokeWidth={2} name="Clicks" dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="impressions" stroke="#FFB84D" strokeWidth={2} name="Impressions" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* top queries */}
        <div className="border border-rule bg-surface-card">
          <div className="border-b border-rule bg-surface-raised px-4 py-2.5"><h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Top Queries</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rule">
                  <th className="text-left p-3 text-ink-muted font-medium">Query</th>
                  <th className="text-right p-3 text-ink-muted font-medium">Clicks</th>
                  <th className="text-right p-3 text-ink-muted font-medium">Impr.</th>
                  <th className="text-right p-3 text-ink-muted font-medium">CTR</th>
                  <th className="text-right p-3 text-ink-muted font-medium">Pos.</th>
                </tr>
              </thead>
              <tbody>
                {(data.topQueries || []).slice(0, 10).map((q, i) => (
                  <tr key={i} className="border-b border-rule last:border-0">
                    <td className="p-3 text-ink truncate max-w-[200px]">{q.query}</td>
                    <td className="p-3 text-right text-ink">{q.clicks.toLocaleString()}</td>
                    <td className="p-3 text-right text-ink-muted">{q.impressions.toLocaleString()}</td>
                    <td className="p-3 text-right text-editorial-green">{fmtPct(q.ctr)}</td>
                    <td className="p-3 text-right text-ink-muted">{q.position.toFixed(1)}</td>
                  </tr>
                ))}
                {(data.topQueries || []).length === 0 && (
                  <tr><td colSpan={5} className="p-4 text-center text-ink-muted text-xs">No query data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* top pages */}
        <div className="border border-rule bg-surface-card">
          <div className="border-b border-rule bg-surface-raised px-4 py-2.5"><h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Top Pages</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rule">
                  <th className="text-left p-3 text-ink-muted font-medium">Page</th>
                  <th className="text-right p-3 text-ink-muted font-medium">Clicks</th>
                  <th className="text-right p-3 text-ink-muted font-medium">Impr.</th>
                  <th className="text-right p-3 text-ink-muted font-medium">CTR</th>
                  <th className="text-right p-3 text-ink-muted font-medium">Pos.</th>
                </tr>
              </thead>
              <tbody>
                {(data.topPages || []).slice(0, 10).map((p, i) => (
                  <tr key={i} className="border-b border-rule last:border-0">
                    <td className="p-3 text-ink truncate max-w-[200px]" title={p.page}>
                      {(() => { try { return new URL(p.page).pathname; } catch { return p.page; } })()}
                    </td>
                    <td className="p-3 text-right text-ink">{p.clicks.toLocaleString()}</td>
                    <td className="p-3 text-right text-ink-muted">{p.impressions.toLocaleString()}</td>
                    <td className="p-3 text-right text-editorial-green">{fmtPct(p.ctr)}</td>
                    <td className="p-3 text-right text-ink-muted">{p.position.toFixed(1)}</td>
                  </tr>
                ))}
                {(data.topPages || []).length === 0 && (
                  <tr><td colSpan={5} className="p-4 text-center text-ink-muted text-xs">No page data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* countries */}
        <div className="border border-rule bg-surface-card">
          <div className="border-b border-rule bg-surface-raised px-4 py-2.5"><h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Countries</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rule">
                  <th className="text-left p-3 text-ink-muted font-medium">Country</th>
                  <th className="text-right p-3 text-ink-muted font-medium">Clicks</th>
                  <th className="text-right p-3 text-ink-muted font-medium">Impressions</th>
                </tr>
              </thead>
              <tbody>
                {(data.countries || []).slice(0, 10).map((c, i) => (
                  <tr key={i} className="border-b border-rule last:border-0">
                    <td className="p-3 text-ink">{c.country}</td>
                    <td className="p-3 text-right text-ink">{c.clicks.toLocaleString()}</td>
                    <td className="p-3 text-right text-ink-muted">{c.impressions.toLocaleString()}</td>
                  </tr>
                ))}
                {(data.countries || []).length === 0 && (
                  <tr><td colSpan={3} className="p-4 text-center text-ink-muted text-xs">No country data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* devices */}
        <div className="border border-rule bg-surface-card">
          <div className="border-b border-rule bg-surface-raised px-4 py-2.5"><h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Devices</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rule">
                  <th className="text-left p-3 text-ink-muted font-medium">Device</th>
                  <th className="text-right p-3 text-ink-muted font-medium">Clicks</th>
                  <th className="text-right p-3 text-ink-muted font-medium">Impressions</th>
                </tr>
              </thead>
              <tbody>
                {(data.devices || []).map((d, i) => (
                  <tr key={i} className="border-b border-rule last:border-0">
                    <td className="p-3 text-ink capitalize">{d.device}</td>
                    <td className="p-3 text-right text-ink">{d.clicks.toLocaleString()}</td>
                    <td className="p-3 text-right text-ink-muted">{d.impressions.toLocaleString()}</td>
                  </tr>
                ))}
                {(data.devices || []).length === 0 && (
                  <tr><td colSpan={3} className="p-4 text-center text-ink-muted text-xs">No device data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
