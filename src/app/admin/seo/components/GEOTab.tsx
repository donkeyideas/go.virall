'use client';

import { useState, useEffect } from 'react';

/* ---------- types ---------- */
interface BotStatus {
  name: string;
  userAgent: string;
  allowed: boolean;
  scope: string;
}

interface StructuredDataRow {
  pageType: string;
  schemaTypes: string[];
  hasCoverage: boolean;
  missing: string[];
}

interface ContentQualityMetric {
  label: string;
  value: number;
  max: number;
  description: string;
}

interface RSSFeed {
  url: string;
  title: string;
  itemCount: number;
  lastBuildDate: string | null;
  status: 'active' | 'error' | 'empty';
}

interface GEOData {
  geoScore: number;
  bots: BotStatus[];
  llmsTxt: string;
  structuredData: StructuredDataRow[];
  contentQuality: ContentQualityMetric[];
  rssFeeds: RSSFeed[];
}

/* ---------- helpers ---------- */
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

/* ========== component ========== */
export default function GEOTab({ onTabChange }: { onTabChange?: (tab: string) => void }) {
  const [data, setData] = useState<GEOData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [llmsTxt, setLlmsTxt] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/admin/seo-geo/geo');
      if (!res.ok) throw new Error('Failed to fetch GEO data');
      const raw = await res.json();

      // Transform API response to component shape
      const cq = raw.contentQuality || {};
      const totalPosts = cq.totalPosts || 0;
      const contentQualityMetrics: ContentQualityMetric[] = totalPosts > 0 ? [
        { label: 'Posts with Cover Images', value: cq.postsWithCoverImages || 0, max: totalPosts, description: 'Posts that have a cover/featured image' },
        { label: 'Posts with Tags', value: cq.postsWithTags || 0, max: totalPosts, description: 'Posts tagged for discoverability' },
        { label: 'Long-form Posts (1000+ words)', value: cq.postsOver1000Words || 0, max: totalPosts, description: 'In-depth content preferred by AI engines' },
        { label: 'Average Word Count', value: cq.avgWordCount || 0, max: 1500, description: 'Target 1000+ words for AI engine visibility' },
      ] : [];

      const structuredData: StructuredDataRow[] = (raw.structuredDataCoverage || []).map((s: any) => ({
        pageType: s.pageType,
        schemaTypes: s.schemaTypes || [],
        hasCoverage: s.hasSchema ?? false,
        missing: s.missingSchemas || [],
      }));

      const rss = raw.rssFeedStatus || {};
      const rssFeeds: RSSFeed[] = rss.exists ? [{
        url: rss.path || '/feed.xml',
        title: 'Blog RSS Feed',
        itemCount: rss.itemCount || 0,
        lastBuildDate: rss.lastBuildDate || null,
        status: 'active' as const,
      }] : [];

      const json: GEOData = {
        geoScore: raw.geoScore ?? 0,
        bots: raw.aiBots || [],
        llmsTxt: raw.llmsTxtContent || '',
        structuredData,
        contentQuality: contentQualityMetrics,
        rssFeeds,
      };

      setData(json);
      setLlmsTxt(json.llmsTxt || '');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveLlmsTxt = async () => {
    try {
      setIsSaving(true);
      setSaveMsg(null);
      const res = await fetch('/api/admin/seo-geo/geo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ llmsTxtContent: llmsTxt }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSaveMsg('Saved successfully');
      setTimeout(() => setSaveMsg(null), 3000);
    } catch {
      setSaveMsg('Error saving llms.txt');
    } finally {
      setIsSaving(false);
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

  /* ========== render ========== */
  return (
    <div className="space-y-6">
      {/* GEO score + Score Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GEO score */}
        <div className="border border-rule bg-surface-card flex flex-col items-center py-6">
          <ScoreCircle score={data.geoScore} label="GEO Score" />
          <p className="text-xs text-ink-muted mt-3 max-w-sm text-center px-4">
            Generative Engine Optimization measures how well your content is surfaced by AI engines like ChatGPT, Perplexity, and Google AI Overviews.
          </p>
        </div>

        {/* Score Breakdown */}
        <div className="border border-rule bg-surface-card">
          <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Score Breakdown</h3>
          </div>
          {(() => {
            const hasLlms = (data.llmsTxt || '').trim().length > 0;
            const botsAllowed = (data.bots || []).some(b => b.allowed);
            const sdTotal = (data.structuredData || []).length;
            const sdCovered = (data.structuredData || []).filter(r => r.hasCoverage).length;
            const sdPct = sdTotal > 0 ? sdCovered / sdTotal : 0;
            const hasRss = (data.rssFeeds || []).some(f => f.status === 'active');
            const cqMetrics = data.contentQuality || [];
            const avgWc = cqMetrics.find(m => m.label.includes('Word Count'));
            const hasWordCount = avgWc ? avgWc.value >= 500 : false;
            const tagMetric = cqMetrics.find(m => m.label.includes('Tags'));
            const hasTags = tagMetric && tagMetric.max > 0 ? tagMetric.value / tagMetric.max > 0.5 : false;
            const coverMetric = cqMetrics.find(m => m.label.includes('Cover'));
            const hasCovers = coverMetric && coverMetric.max > 0 ? coverMetric.value / coverMetric.max > 0.5 : false;

            const scoreFactors = [
              { label: 'Base Score', points: 50, max: 50 },
              { label: 'llms.txt', points: hasLlms ? 10 : 0, max: 10 },
              { label: 'AI Bots Allowed', points: botsAllowed ? 10 : 0, max: 10 },
              { label: 'Structured Data', points: sdPct >= 0.8 ? 10 : 0, max: 10 },
              { label: 'RSS Feed', points: hasRss ? 5 : 0, max: 5 },
              { label: 'Content Quality', points: hasWordCount ? 5 : 0, max: 5 },
              { label: 'Tag Coverage', points: hasTags ? 5 : 0, max: 5 },
              { label: 'Cover Images', points: hasCovers ? 5 : 0, max: 5 },
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

      {/* AI Bot Coverage visual grid */}
      {(data.bots || []).length > 0 && (
        <div className="border border-rule bg-surface-card">
          <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">AI Bot Coverage</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {data.bots.map((bot) => (
                <div key={bot.name} className="border border-rule bg-surface-base p-3 text-center">
                  <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${bot.allowed ? 'bg-editorial-green' : 'bg-editorial-red'}`} />
                  <p className="text-xs text-ink font-medium truncate">{bot.name}</p>
                  <p className="text-[10px] text-ink-muted">{bot.allowed ? 'Allowed' : 'Blocked'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI bot status */}
      <div className="border border-rule bg-surface-card">
        <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">AI Bot Access</h3>
          <p className="text-xs text-ink-muted mt-1">Which AI crawlers can access your content (via robots.txt)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rule">
                <th className="text-left p-3 text-ink-muted font-medium">Bot Name</th>
                <th className="text-left p-3 text-ink-muted font-medium">User-Agent</th>
                <th className="text-center p-3 text-ink-muted font-medium">Status</th>
                <th className="text-left p-3 text-ink-muted font-medium">Scope</th>
              </tr>
            </thead>
            <tbody>
              {(data.bots || []).map((bot, i) => (
                <tr key={i} className="border-b border-rule last:border-0">
                  <td className="p-3 text-ink font-medium">{bot.name}</td>
                  <td className="p-3 text-ink-muted font-mono text-xs">{bot.userAgent}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${bot.allowed ? 'bg-editorial-green/10 text-editorial-green' : 'bg-editorial-red/10 text-editorial-red'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${bot.allowed ? 'bg-editorial-green' : 'bg-editorial-red'}`} />
                      {bot.allowed ? 'Allowed' : 'Blocked'}
                    </span>
                  </td>
                  <td className="p-3 text-ink-muted text-xs">{bot.scope}</td>
                </tr>
              ))}
              {(data.bots || []).length === 0 && (
                <tr><td colSpan={4} className="p-4 text-center text-ink-muted text-xs">No bot data available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* llms.txt editor */}
      <div className="border border-rule bg-surface-card">
        <div className="border-b border-rule bg-surface-raised px-4 py-2.5 flex items-center justify-between">
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">llms.txt Editor</h3>
            <p className="text-xs text-ink-muted mt-1">Define how AI models should understand and represent your site</p>
          </div>
          <div className="flex items-center gap-3">
            {saveMsg && (
              <span className={`text-xs ${saveMsg.includes('Error') ? 'text-editorial-red' : 'text-editorial-green'}`}>
                {saveMsg}
              </span>
            )}
            <button onClick={handleSaveLlmsTxt} disabled={isSaving}
              className="px-4 py-2 bg-editorial-gold text-surface-cream text-[11px] font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50">
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
        <div className="p-4">
          <textarea
            value={llmsTxt}
            onChange={(e) => setLlmsTxt(e.target.value)}
            rows={14}
            className="w-full bg-surface-base border border-rule p-3 text-sm text-ink font-mono resize-y focus:outline-none focus:border-editorial-gold/30 placeholder:text-ink-muted/50"
            placeholder={"# llms.txt\n# Describe your site for AI models\n\n> Site name and purpose\n\n## Content guidelines\n- ..."}
          />
        </div>
      </div>

      {/* structured data coverage */}
      <div className="border border-rule bg-surface-card">
        <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Structured Data Coverage</h3>
          <p className="text-xs text-ink-muted mt-1">Schema.org markup detected across page types</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rule">
                <th className="text-left p-3 text-ink-muted font-medium">Page Type</th>
                <th className="text-left p-3 text-ink-muted font-medium">Schema Types</th>
                <th className="text-center p-3 text-ink-muted font-medium">Status</th>
                <th className="text-left p-3 text-ink-muted font-medium">Missing</th>
              </tr>
            </thead>
            <tbody>
              {(data.structuredData || []).map((row, i) => (
                <tr key={i} className="border-b border-rule last:border-0">
                  <td className="p-3 text-ink font-medium">{row.pageType}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {row.schemaTypes.map((s, j) => (
                        <span key={j} className="px-1.5 py-0.5 bg-editorial-blue/10 text-editorial-blue rounded text-xs">{s}</span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    {row.hasCoverage ? (
                      <span className="inline-block w-5 h-5 rounded-full bg-editorial-green/10 text-editorial-green text-xs leading-5 text-center">
                        &#10003;
                      </span>
                    ) : (
                      <span className="inline-block w-5 h-5 rounded-full bg-editorial-red/10 text-editorial-red text-xs leading-5 text-center">
                        &#10005;
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {row.missing.map((m, j) => (
                        <span key={j} className="px-1.5 py-0.5 bg-editorial-red/10 text-editorial-red rounded text-xs">{m}</span>
                      ))}
                      {row.missing.length === 0 && <span className="text-xs text-ink-muted">None</span>}
                    </div>
                  </td>
                </tr>
              ))}
              {(data.structuredData || []).length === 0 && (
                <tr><td colSpan={4} className="p-4 text-center text-ink-muted text-xs">No structured data found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Structured Data Coverage summary */}
      {(data.structuredData || []).length > 0 && (() => {
        const total = data.structuredData.length;
        const covered = data.structuredData.filter((r) => r.hasCoverage).length;
        const pct = total > 0 ? Math.round((covered / total) * 100) : 0;
        const barColor = pct >= 80 ? 'bg-editorial-green' : pct >= 50 ? 'bg-editorial-gold' : 'bg-editorial-red';
        return (
          <div className="border border-rule bg-surface-card">
            <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Schema Coverage</h3>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-ink">{covered} of {total} page types covered</span>
                <span className="text-xs font-mono text-ink-muted">{pct}%</span>
              </div>
              <div className="w-full h-3 bg-ink/5 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        );
      })()}

      {/* content quality metrics + RSS feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* content quality */}
        <div className="border border-rule bg-surface-card">
          <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Content Quality Metrics</h3>
          </div>
          <div className="p-4 space-y-4">
            {(data.contentQuality || []).map((metric, i) => {
              const pct = metric.max > 0 ? Math.round((metric.value / metric.max) * 100) : 0;
              const barColor = pct >= 80 ? 'bg-editorial-green' : pct >= 50 ? 'bg-editorial-gold' : 'bg-editorial-red';
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-ink">{metric.label}</span>
                    <span className="text-xs text-ink-muted">{metric.value} / {metric.max}</span>
                  </div>
                  <div className="w-full h-2 bg-ink/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5">{metric.description}</p>
                </div>
              );
            })}
            {(data.contentQuality || []).length === 0 && (
              <p className="text-xs text-ink-muted text-center py-4">No quality metrics available</p>
            )}
          </div>
        </div>

        {/* RSS feeds */}
        <div className="border border-rule bg-surface-card">
          <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">RSS Feeds</h3>
            <p className="text-xs text-ink-muted mt-1">Active feeds that AI engines and aggregators can consume</p>
          </div>
          <div className="p-4 space-y-3">
            {(data.rssFeeds || []).map((feed, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-surface-base border border-rule">
                <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${feed.status === 'active' ? 'bg-editorial-green' : feed.status === 'error' ? 'bg-editorial-red' : 'bg-editorial-gold'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink font-medium truncate">{feed.title || feed.url}</p>
                  <p className="text-xs text-ink-muted truncate">{feed.url}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-ink-muted">{feed.itemCount} items</span>
                    {feed.lastBuildDate && (
                      <span className="text-xs text-ink-muted">
                        Updated {new Date(feed.lastBuildDate).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${feed.status === 'active' ? 'bg-editorial-green/10 text-editorial-green' : feed.status === 'error' ? 'bg-editorial-red/10 text-editorial-red' : 'bg-editorial-gold/10 text-editorial-gold'}`}>
                  {feed.status}
                </span>
              </div>
            ))}
            {(data.rssFeeds || []).length === 0 && (
              <p className="text-xs text-ink-muted text-center py-4">No RSS feeds configured</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
