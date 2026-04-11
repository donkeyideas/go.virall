'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

/* ---------- types ---------- */
interface SessionRow { date: string; sessions: number }
interface SourceRow  { source: string; sessions: number }
interface DeviceBreakdown { device: string; sessions: number }
interface TopPageRow { page: string; views: number; avgTime: number }
interface TopCountryRow { country: string; sessions: number }
interface HourlyRow { hour: number; sessions: number }

interface TrafficData {
  totals: {
    sessions: number;
    users: number;
    pageViews: number;
    bounceRate: number;
    newUsers: number;
    returningUsers: number;
    avgSessionDuration: number;
  };
  sessionsOverTime: SessionRow[];
  trafficSources: SourceRow[];
  deviceBreakdown: DeviceBreakdown[];
  topPages: TopPageRow[];
  topCountries: TopCountryRow[];
  hourlyTraffic: HourlyRow[];
}

/* ---------- constants ---------- */
const tooltipStyle = { backgroundColor: '#112240', border: '1px solid rgba(75,156,211,0.2)', borderRadius: 8, padding: '8px 12px', color: '#E8F0FA', fontSize: 11, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' };
const RANGE_OPTIONS: { label: string; value: string }[] = [
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
  { label: '1y', value: '365d' },
];
const DEVICE_COLORS = ['#FFB84D', '#4B9CD3', '#4ade80', '#a78bfa', '#ef4444'];

/* ---------- helpers ---------- */
function fmtNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function fmtDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/* ========== component ========== */
export default function TrafficTab({ onTabChange }: { onTabChange?: (tab: string) => void }) {
  const [data, setData] = useState<TrafficData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState('30d');

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/analytics/ga?range=${range}`);
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.error || 'Failed to fetch analytics data');
      }
      const raw = await res.json();
      // Map API field names to component expectations
      setData({
        totals: raw.kpis ?? raw.totals ?? { sessions: 0, users: 0, pageViews: 0, bounceRate: 0, newUsers: 0, returningUsers: 0, avgSessionDuration: 0 },
        sessionsOverTime: raw.trafficOverTime ?? raw.sessionsOverTime ?? [],
        trafficSources: raw.trafficSources ?? [],
        deviceBreakdown: raw.deviceBreakdown ?? [],
        topPages: (raw.topPages ?? []).map((p: any) => ({ page: p.page, views: p.views ?? 0, avgTime: p.avgTime ?? p.uniqueViews ?? 0 })),
        topCountries: raw.geographicData ?? raw.topCountries ?? [],
        hourlyTraffic: (raw.hourlyTraffic ?? []).map((h: any) => ({ hour: typeof h.hour === 'string' ? parseInt(h.hour) : h.hour, sessions: h.sessions ?? 0 })),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [range]);

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
        <h3 className="text-lg font-semibold text-ink mb-2">Unable to Load Traffic Data</h3>
        <p className="text-sm text-ink-muted mb-4 max-w-md mx-auto">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 bg-editorial-gold text-surface-cream text-[11px] font-bold uppercase tracking-wider hover:opacity-90">
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  /* --- chart transforms --- */
  const sessionsChart = (data.sessionsOverTime || []).map((r) => ({
    date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    sessions: r.sessions,
  }));

  const sourcesChart = (data.trafficSources || []).slice(0, 8);

  const deviceData = (data.deviceBreakdown || []).map((d, i) => ({
    ...d,
    fill: DEVICE_COLORS[i % DEVICE_COLORS.length],
  }));

  const hourlyChart = (data.hourlyTraffic || []).map((h) => ({
    hour: `${h.hour.toString().padStart(2, '0')}:00`,
    sessions: h.sessions,
  }));

  /* ========== render ========== */
  return (
    <div className="space-y-6">
      {/* range selector */}
      <div className="flex items-center justify-end">
        <div className="flex gap-1 border border-rule bg-surface-card p-1">
          {RANGE_OPTIONS.map((o) => (
            <button key={o.value} onClick={() => setRange(o.value)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${range === o.value ? 'bg-editorial-gold text-surface-cream' : 'text-ink-muted hover:text-ink'}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Sessions', value: fmtNum(data.totals.sessions), color: 'text-editorial-blue' },
          { label: 'Users', value: fmtNum(data.totals.users), color: 'text-editorial-gold' },
          { label: 'Page Views', value: fmtNum(data.totals.pageViews), color: 'text-editorial-green' },
          { label: 'Bounce Rate', value: (data.totals.bounceRate * 100).toFixed(1) + '%', color: data.totals.bounceRate > 0.6 ? 'text-editorial-red' : 'text-ink' },
        ].map((kpi) => (
          <div key={kpi.label} className="border border-rule bg-surface-card p-5">
            <div className={`font-mono text-3xl font-bold ${kpi.color}`}>{kpi.value}</div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* secondary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'New Users', value: fmtNum(data.totals.newUsers), color: 'text-editorial-green' },
          { label: 'Returning Users', value: fmtNum(data.totals.returningUsers), color: 'text-editorial-blue' },
          { label: 'Avg Session Duration', value: fmtDuration(data.totals.avgSessionDuration), color: 'text-ink' },
        ].map((kpi) => (
          <div key={kpi.label} className="border border-rule bg-surface-card p-5">
            <div className={`font-mono text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* sessions area chart */}
      {sessionsChart.length > 0 && (
        <div className="border border-rule bg-surface-card">
          <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Sessions Over Time</h3>
          </div>
          <div className="p-4 min-w-0">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={sessionsChart}>
                <defs>
                  <linearGradient id="sessionsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4B9CD3" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4B9CD3" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule, #ddd)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#6B5D8E', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6B5D8E', fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="sessions" stroke="#4B9CD3" strokeWidth={2} fillOpacity={1} fill="url(#sessionsGrad)" name="Sessions" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* traffic sources + device donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* sources bar chart */}
        {sourcesChart.length > 0 && (
          <div className="border border-rule bg-surface-card">
            <div className="border-b border-rule bg-surface-raised px-4 py-2.5"><h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Traffic Sources</h3></div>
            <div className="p-4 min-w-0">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={sourcesChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule, #ddd)" vertical={false} />
                  <XAxis type="number" tick={{ fill: '#6B5D8E', fontSize: 11 }} />
                  <YAxis type="category" dataKey="source" tick={{ fill: '#6B5D8E', fontSize: 11 }} width={100} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="sessions" fill="#FFB84D" radius={[0, 4, 4, 0]} name="Sessions" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* device donut */}
        {deviceData.length > 0 && (
          <div className="border border-rule bg-surface-card">
            <div className="border-b border-rule bg-surface-raised px-4 py-2.5"><h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Device Breakdown</h3></div>
            <div className="p-4 min-w-0 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={deviceData} dataKey="sessions" nameKey="device" cx="50%" cy="50%"
                    innerRadius={60} outerRadius={100} paddingAngle={3} strokeWidth={0}>
                    {deviceData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* top pages + top countries tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* top pages */}
        <div className="border border-rule bg-surface-card">
          <div className="border-b border-rule bg-surface-raised px-4 py-2.5"><h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Top Pages</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rule">
                  <th className="text-left p-3 text-ink-muted font-medium">Page</th>
                  <th className="text-right p-3 text-ink-muted font-medium">Views</th>
                  <th className="text-right p-3 text-ink-muted font-medium">Avg Time</th>
                </tr>
              </thead>
              <tbody>
                {(data.topPages || []).slice(0, 10).map((p, i) => (
                  <tr key={i} className="border-b border-rule last:border-0">
                    <td className="p-3 text-ink truncate max-w-[250px]" title={p.page}>{p.page}</td>
                    <td className="p-3 text-right text-ink">{p.views.toLocaleString()}</td>
                    <td className="p-3 text-right text-ink-muted">{fmtDuration(p.avgTime)}</td>
                  </tr>
                ))}
                {(data.topPages || []).length === 0 && (
                  <tr><td colSpan={3} className="p-4 text-center text-ink-muted text-xs">No page data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* top countries */}
        <div className="border border-rule bg-surface-card">
          <div className="border-b border-rule bg-surface-raised px-4 py-2.5"><h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Top Countries</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rule">
                  <th className="text-left p-3 text-ink-muted font-medium">Country</th>
                  <th className="text-right p-3 text-ink-muted font-medium">Sessions</th>
                </tr>
              </thead>
              <tbody>
                {(data.topCountries || []).slice(0, 10).map((c, i) => (
                  <tr key={i} className="border-b border-rule last:border-0">
                    <td className="p-3 text-ink">{c.country}</td>
                    <td className="p-3 text-right text-ink">{c.sessions.toLocaleString()}</td>
                  </tr>
                ))}
                {(data.topCountries || []).length === 0 && (
                  <tr><td colSpan={2} className="p-4 text-center text-ink-muted text-xs">No country data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* hourly traffic */}
      {hourlyChart.length > 0 && (
        <div className="border border-rule bg-surface-card">
          <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Hourly Traffic Pattern</h3>
          </div>
          <div className="p-4 min-w-0">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={hourlyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule, #ddd)" vertical={false} />
                <XAxis dataKey="hour" tick={{ fill: '#6B5D8E', fontSize: 10 }} interval={2} />
                <YAxis tick={{ fill: '#6B5D8E', fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="sessions" fill="#4B9CD3" radius={[3, 3, 0, 0]} name="Sessions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
