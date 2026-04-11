'use client';

import { useState, useEffect } from 'react';

/* ---------- types ---------- */
interface ContentStats {
  totalPosts: number;
  withMetaTitle: number;
  withMetaDescription: number;
  withTags: number;
  withCoverImage: number;
  longForm: number;
}

interface PlatformStats {
  socialProfiles: number;
  analyses: number;
}

interface ChecklistItem {
  label: string;
  done: boolean;
  category: string;
}

interface Recommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action?: string;
}

interface AEOData {
  aeoScore: number;
  contentStats: ContentStats;
  platformStats: PlatformStats;
  checklist: ChecklistItem[];
  recommendations: Recommendation[];
}

/* ---------- helpers ---------- */
function ScoreCircle({ score, label, size = 'lg' }: { score: number; label: string; size?: 'sm' | 'lg' }) {
  const color = score >= 80 ? '#4ade80' : score >= 60 ? '#4B9CD3' : score >= 40 ? '#FFB84D' : '#ef4444';
  const r = size === 'lg' ? 40 : 30;
  const svgSize = size === 'lg' ? 100 : 72;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const wrapperClass = size === 'lg' ? 'w-28 h-28' : 'w-[72px] h-[72px]';
  const textClass = size === 'lg' ? 'text-3xl' : 'text-xl';
  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${wrapperClass}`}>
        <svg className={`${wrapperClass} -rotate-90`} viewBox={`0 0 ${svgSize} ${svgSize}`}>
          <circle cx={svgSize / 2} cy={svgSize / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle cx={svgSize / 2} cy={svgSize / 2} r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`${textClass} font-light text-ink`}>{score}</span>
        </div>
      </div>
      <p className="text-sm text-ink-muted mt-2">{label}</p>
    </div>
  );
}

function pct(n: number, total: number) {
  if (total === 0) return '0%';
  return Math.round((n / total) * 100) + '%';
}

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-editorial-red/10 text-editorial-red',
  medium: 'bg-editorial-gold/10 text-editorial-gold',
  low: 'bg-editorial-blue/10 text-editorial-blue',
};

/* ========== component ========== */
export default function AEOTab({ onTabChange }: { onTabChange?: (tab: string) => void }) {
  const [data, setData] = useState<AEOData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/admin/seo-geo/aeo');
      if (!res.ok) throw new Error('Failed to fetch AEO data');
      const raw = await res.json();
      const cs = raw.contentStats || {};
      setData({
        aeoScore: raw.aeoScore ?? 0,
        contentStats: {
          totalPosts: cs.totalPosts ?? 0,
          withMetaTitle: cs.withMetaTitle ?? 0,
          withMetaDescription: cs.withMetaDesc ?? cs.withMetaDescription ?? 0,
          withTags: cs.withTags ?? 0,
          withCoverImage: cs.withCoverImage ?? 0,
          longForm: cs.longFormPosts ?? cs.longForm ?? 0,
        },
        platformStats: {
          socialProfiles: raw.platformStats?.totalProfiles ?? raw.platformStats?.socialProfiles ?? 0,
          analyses: raw.platformStats?.totalAnalyses ?? raw.platformStats?.analyses ?? 0,
        },
        checklist: (raw.checklist || []).map((c: any) => ({ label: c.label, done: c.done, category: c.category || '' })),
        recommendations: raw.recommendations || [],
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

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

  if (!data) return null;

  const cs = data.contentStats;
  const ps = data.platformStats;

  /* ========== render ========== */
  return (
    <div className="space-y-6">
      {/* AEO score + Score Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AEO score */}
        <div className="border border-rule bg-surface-card flex flex-col items-center py-6">
          <ScoreCircle score={data.aeoScore} label="AEO Score" />
          <p className="text-xs text-ink-muted mt-3 max-w-md text-center px-4">
            Answer Engine Optimization measures how well your content is structured to appear as direct answers in AI-powered search results and knowledge panels.
          </p>
        </div>

        {/* Score Breakdown */}
        <div className="border border-rule bg-surface-card">
          <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Score Breakdown</h3>
          </div>
          {(() => {
            const analysesPoints = ps.analyses >= 10 ? 15 : ps.analyses > 0 ? 8 : 0;
            const scoreFactors = [
              { label: 'llms.txt', points: data.checklist?.find(c => c.label?.toLowerCase().includes('llms'))?.done ? 15 : 0, max: 15 },
              { label: 'Content Analyses', points: analysesPoints, max: 15 },
              { label: 'Meta Titles', points: cs.totalPosts > 0 ? Math.round((cs.withMetaTitle / cs.totalPosts) * 20) : 5, max: 20 },
              { label: 'Meta Descriptions', points: cs.totalPosts > 0 ? Math.round((cs.withMetaDescription / cs.totalPosts) * 20) : 0, max: 20 },
              { label: 'Tags', points: cs.totalPosts > 0 ? Math.round((cs.withTags / cs.totalPosts) * 15) : 0, max: 15 },
              { label: 'Cover Images', points: cs.totalPosts > 0 ? Math.round((cs.withCoverImage / cs.totalPosts) * 10) : 0, max: 10 },
              { label: 'Long-form Content', points: cs.totalPosts > 0 ? Math.round((cs.longForm / cs.totalPosts) * 5) : 0, max: 5 },
            ];
            return (
              <div className="p-4 space-y-2.5">
                {scoreFactors.map(f => (
                  <div key={f.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-ink">{f.label}</span>
                      <span className="text-xs font-mono text-ink-muted">{f.points} / {f.max}</span>
                    </div>
                    <div className="w-full h-2 bg-ink/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${f.points >= f.max * 0.8 ? 'bg-editorial-green' : f.points >= f.max * 0.5 ? 'bg-editorial-gold' : 'bg-editorial-red'}`}
                        style={{ width: `${f.max > 0 ? (f.points / f.max) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-rule">
                  <span className="text-xs font-bold text-ink">Total</span>
                  <span className="text-xs font-mono font-bold text-ink">
                    {scoreFactors.reduce((s, f) => s + f.points, 0)} / {scoreFactors.reduce((s, f) => s + f.max, 0)}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* content stats */}
      <div className="border border-rule bg-surface-card">
        <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Content Stats</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-ink/5">
          {[
            { label: 'Total Posts', value: cs.totalPosts, sub: null, color: 'text-ink' },
            { label: 'With Meta Title', value: cs.withMetaTitle, sub: pct(cs.withMetaTitle, cs.totalPosts), color: 'text-editorial-green' },
            { label: 'With Meta Desc', value: cs.withMetaDescription, sub: pct(cs.withMetaDescription, cs.totalPosts), color: 'text-editorial-green' },
            { label: 'With Tags', value: cs.withTags, sub: pct(cs.withTags, cs.totalPosts), color: 'text-editorial-blue' },
            { label: 'With Cover Image', value: cs.withCoverImage, sub: pct(cs.withCoverImage, cs.totalPosts), color: 'text-editorial-blue' },
            { label: 'Long Form (1k+)', value: cs.longForm, sub: pct(cs.longForm, cs.totalPosts), color: 'text-editorial-gold' },
          ].map((stat) => (
            <div key={stat.label} className="p-4 text-center">
              <div className={`font-mono text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">{stat.label}</div>
              {stat.sub && <p className="text-xs text-ink-muted mt-1">{stat.sub}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* content completeness */}
      {cs.totalPosts > 0 && (() => {
        const contentBars = [
          { metric: 'Meta Title', pct: Math.round((cs.withMetaTitle / cs.totalPosts) * 100) },
          { metric: 'Meta Desc', pct: Math.round((cs.withMetaDescription / cs.totalPosts) * 100) },
          { metric: 'Tags', pct: Math.round((cs.withTags / cs.totalPosts) * 100) },
          { metric: 'Cover Image', pct: Math.round((cs.withCoverImage / cs.totalPosts) * 100) },
          { metric: 'Long Form', pct: Math.round((cs.longForm / cs.totalPosts) * 100) },
        ];
        return (
          <div className="border border-rule bg-surface-card">
            <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Content Completeness</h3>
            </div>
            <div className="p-4 space-y-3">
              {contentBars.map(bar => (
                <div key={bar.metric}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-ink">{bar.metric}</span>
                    <span className="text-xs font-mono text-ink-muted">{bar.pct}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-ink/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${bar.pct >= 80 ? 'bg-editorial-green' : bar.pct >= 50 ? 'bg-editorial-gold' : 'bg-editorial-red'}`}
                      style={{ width: `${bar.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* platform stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="border border-rule bg-surface-card p-5">
          <div className="font-mono text-3xl font-bold text-editorial-blue">{ps.socialProfiles}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">Social Profiles Connected</div>
          <p className="text-xs text-ink-muted mt-2">Linked profiles for cross-platform authority signals</p>
        </div>
        <div className="border border-rule bg-surface-card p-5">
          <div className="font-mono text-3xl font-bold text-editorial-gold">{ps.analyses}</div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">Content Analyses Run</div>
          <p className="text-xs text-ink-muted mt-2">AI-powered SEO analyses completed</p>
        </div>
      </div>

      {/* AEO checklist + recommendations side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* checklist */}
        <div className="border border-rule bg-surface-card">
          <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">AEO Checklist</h3>
            <p className="text-xs text-ink-muted mt-1">
              {data.checklist.filter((c) => c.done).length} of {data.checklist.length} completed
            </p>
          </div>
          <div className="p-4 space-y-2">
            {(data.checklist || []).map((item, i) => (
              <div key={i} className="flex items-start gap-3 py-2">
                <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${item.done ? 'bg-editorial-green/10 text-editorial-green' : 'bg-ink/5 text-ink-muted'}`}>
                  {item.done ? '\u2713' : '\u2013'}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm ${item.done ? 'text-ink' : 'text-ink-muted'}`}>{item.label}</p>
                  <p className="text-xs text-ink-muted">{item.category}</p>
                </div>
              </div>
            ))}
            {(data.checklist || []).length === 0 && (
              <p className="text-xs text-ink-muted text-center py-4">No checklist items</p>
            )}
          </div>
        </div>

        {/* recommendations */}
        <div className="border border-rule bg-surface-card">
          <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Recommendations</h3>
            <p className="text-xs text-ink-muted mt-1">Actions to improve your AEO score</p>
          </div>
          <div className="p-4 space-y-3">
            {(data.recommendations || []).map((rec, i) => (
              <div key={i} className="p-3 bg-surface-base border border-rule">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm text-ink font-medium">{rec.title}</p>
                  <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_STYLES[rec.priority] || PRIORITY_STYLES.low}`}>
                    {rec.priority}
                  </span>
                </div>
                <p className="text-xs text-ink-muted">{rec.description}</p>
                {rec.action && onTabChange && (
                  <button onClick={() => onTabChange(rec.action!)}
                    className="mt-2 text-xs text-editorial-gold hover:underline">
                    Take action &rarr;
                  </button>
                )}
              </div>
            ))}
            {(data.recommendations || []).length === 0 && (
              <p className="text-xs text-ink-muted text-center py-4">No recommendations at this time</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
