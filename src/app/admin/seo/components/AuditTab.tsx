'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line,
  BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

/* ---------- types ---------- */
interface AuditIssue {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  recommendation: string;
}

interface AuditCheck {
  name: string;
  passed: boolean;
  issue?: AuditIssue;
}

interface AuditCategory {
  name: string;
  score: number;
  checks: AuditCheck[];
  issues: AuditIssue[];
}

interface AuditData {
  id: string;
  overallScore: number;
  technicalScore: number;
  contentScore: number;
  performanceScore: number;
  geoScore: number;
  totalIssues: number;
  criticalIssues: number;
  warningIssues: number;
  infoIssues: number;
  summary: string;
  categories: AuditCategory[];
  createdAt: string;
}

interface AuditHistoryEntry {
  overallScore: number;
  technicalScore: number;
  contentScore: number;
  performanceScore: number;
  geoScore: number;
  createdAt: string;
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

function ScoreGauge({ score, label, size = 96 }: { score: number; label: string; size?: number }) {
  const color = score >= 80 ? '#4ade80' : score >= 60 ? '#4B9CD3' : score >= 40 ? '#FFB84D' : '#ef4444';
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="-rotate-90" style={{ width: size, height: size }} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
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

function SeverityBadge({ severity }: { severity: 'critical' | 'warning' | 'info' }) {
  const cls =
    severity === 'critical'
      ? 'bg-editorial-red/10 text-editorial-red'
      : severity === 'warning'
        ? 'bg-editorial-gold/10 text-editorial-gold'
        : 'bg-editorial-blue/10 text-editorial-blue';
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold capitalize ${cls}`}>
      {severity}
    </span>
  );
}

/* ---------- component ---------- */
export default function AuditTab() {
  const [audit, setAudit] = useState<AuditData | null>(null);
  const [history, setHistory] = useState<AuditHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const fetchAudit = useCallback(async () => {
    try {
      setIsLoading(true);
      const [auditRes, historyRes] = await Promise.all([
        fetch('/api/admin/seo-geo/audit'),
        fetch('/api/admin/seo-geo/audit/history'),
      ]);
      if (auditRes.ok) {
        const d = await auditRes.json();
        const raw = d.audit || d;
        if (raw && raw.id) {
          setAudit({
            id: raw.id,
            overallScore: raw.overall_score ?? raw.overallScore ?? 0,
            technicalScore: raw.technical_score ?? raw.technicalScore ?? 0,
            contentScore: raw.content_score ?? raw.contentScore ?? 0,
            performanceScore: raw.performance_score ?? raw.performanceScore ?? 0,
            geoScore: raw.geo_score ?? raw.geoScore ?? 0,
            totalIssues: raw.total_issues ?? raw.totalIssues ?? 0,
            criticalIssues: raw.critical_issues ?? raw.criticalIssues ?? 0,
            warningIssues: raw.warning_issues ?? raw.warningIssues ?? 0,
            infoIssues: raw.info_issues ?? raw.infoIssues ?? 0,
            summary: raw.summary || '',
            categories: raw.categories || [],
            createdAt: raw.created_at || raw.createdAt || '',
          });
        }
      }
      if (historyRes.ok) {
        const h = await historyRes.json();
        setHistory(h.audits ?? (Array.isArray(h) ? h : h.history ?? []));
      }
    } catch {
      /* ignore */
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAudit(); }, [fetchAudit]);

  const handleRunAudit = async () => {
    try {
      setIsRunning(true);
      const res = await fetch('/api/admin/seo-geo/audit', { method: 'POST' });
      if (res.ok) await fetchAudit();
    } catch {
      /* ignore */
    } finally {
      setIsRunning(false);
    }
  };

  /* ---------- loading ---------- */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 rounded-full border-2 border-ink/10 border-t-editorial-gold animate-spin" />
      </div>
    );
  }

  /* ---------- no audit yet ---------- */
  if (!audit) {
    return (
      <div className="border border-rule bg-surface-card p-8 text-center">
        <h3 className="text-lg font-semibold text-ink mb-2">No Audit Data Yet</h3>
        <p className="text-sm text-ink-muted mb-4 max-w-sm mx-auto">
          Run your first SEO &amp; GEO audit to see detailed health scores and recommendations.
        </p>
        <button
          onClick={handleRunAudit}
          disabled={isRunning}
          className="px-4 py-2 bg-editorial-gold text-surface-cream text-[11px] font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50"
        >
          {isRunning ? 'Running Audit...' : 'Run First Audit'}
        </button>
      </div>
    );
  }

  /* ---------- chart data ---------- */
  const historyChart = history.map((h) => ({
    date: new Date(h.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    overall: h.overallScore,
    technical: h.technicalScore,
    content: h.contentScore,
    performance: h.performanceScore,
    geo: h.geoScore,
  }));

  /* ---------- render ---------- */
  return (
    <div className="space-y-6">
      {/* Score gauges */}
      <div className="border border-rule bg-surface-card">
        <div className="border-b border-rule bg-surface-raised px-4 py-2.5 flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Audit Scores</h3>
          <button
            onClick={handleRunAudit}
            disabled={isRunning}
            className="px-4 py-2 bg-editorial-gold text-surface-cream text-[11px] font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50"
          >
            {isRunning ? 'Running...' : 'Run New Audit'}
          </button>
        </div>
        <div className="p-6 flex flex-wrap items-center justify-center gap-8">
          <ScoreGauge score={audit.overallScore} label="Overall" size={112} />
          <ScoreGauge score={audit.technicalScore} label="Technical" />
          <ScoreGauge score={audit.contentScore} label="Content" />
          <ScoreGauge score={audit.performanceScore} label="Performance" />
          <ScoreGauge score={audit.geoScore} label="GEO" />
        </div>
      </div>

      {/* Category Score Bar Chart */}
      <div className="border border-rule bg-surface-card">
        <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Category Scores</h3>
        </div>
        <div className="p-4 min-w-0">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={[
                { name: 'Technical', score: audit.technicalScore, fill: '#4B9CD3' },
                { name: 'Content', score: audit.contentScore, fill: '#a78bfa' },
                { name: 'Performance', score: audit.performanceScore, fill: '#ef4444' },
                { name: 'GEO', score: audit.geoScore, fill: '#4ade80' },
              ]}
              layout="horizontal"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule, #ddd)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#6B5D8E', fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#6B5D8E', fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="score" name="Score" radius={[4, 4, 0, 0]}>
                {['#4B9CD3', '#a78bfa', '#ef4444', '#4ade80'].map((color, index) => (
                  <Cell key={index} fill={color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary */}
      <div className="border border-rule bg-surface-card p-4">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-2">Summary</h3>
        {audit.summary && <p className="text-sm text-ink-muted mb-3">{audit.summary}</p>}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-editorial-red" />
            <span className="text-sm text-ink">{audit.criticalIssues} Critical</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-editorial-gold" />
            <span className="text-sm text-ink">{audit.warningIssues} Warnings</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-editorial-blue" />
            <span className="text-sm text-ink">{audit.infoIssues} Info</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-ink-muted">{audit.totalIssues} total issues</span>
          </div>
        </div>
      </div>

      {/* Severity Distribution */}
      {audit.totalIssues > 0 && (() => {
        const maxCount = Math.max(audit.criticalIssues, audit.warningIssues, audit.infoIssues, 1);
        const severityRows = [
          { label: 'Critical', count: audit.criticalIssues, color: 'bg-editorial-red' },
          { label: 'Warning', count: audit.warningIssues, color: 'bg-editorial-gold' },
          { label: 'Info', count: audit.infoIssues, color: 'bg-editorial-blue' },
        ];
        return (
          <div className="border border-rule bg-surface-card">
            <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Severity Distribution</h3>
            </div>
            <div className="p-4 space-y-3">
              {severityRows.map((row) => {
                const pct = maxCount > 0 ? Math.round((row.count / maxCount) * 100) : 0;
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
        );
      })()}

      {/* Category breakdown */}
      {audit.categories && audit.categories.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Category Breakdown</h3>
          {audit.categories.map((cat) => {
            const passed = cat.checks.filter((c) => c.passed).length;
            const failed = cat.checks.filter((c) => !c.passed).length;
            const isExpanded = expandedCategory === cat.name;
            return (
              <div key={cat.name} className="border border-rule bg-surface-card">
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : cat.name)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-ink/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">{cat.name}</span>
                    <span className="text-xs text-ink-muted">Score: {cat.score}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-editorial-green">{passed} passed</span>
                    {failed > 0 && <span className="text-xs text-editorial-red">{failed} failed</span>}
                    <svg
                      className={`w-4 h-4 text-ink-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-rule p-4 space-y-4">
                    {/* Checks */}
                    {cat.checks.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Checks</p>
                        {cat.checks.map((check, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            {check.passed ? (
                              <span className="text-editorial-green">&#10003;</span>
                            ) : (
                              <span className="text-editorial-red">&#10007;</span>
                            )}
                            <span className={check.passed ? 'text-ink-muted' : 'text-ink'}>{check.name}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Issues */}
                    {cat.issues.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Issues</p>
                        {cat.issues.map((issue, i) => (
                          <div key={i} className="bg-ink/[0.02] p-3 space-y-1">
                            <div className="flex items-center gap-2">
                              <SeverityBadge severity={issue.severity} />
                              <span className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">{issue.title}</span>
                            </div>
                            <p className="text-sm text-ink-muted">{issue.description}</p>
                            {issue.recommendation && (
                              <p className="text-sm text-editorial-blue">
                                <span className="font-semibold">Recommendation:</span> {issue.recommendation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Audit history chart */}
      {historyChart.length > 1 && (
        <div className="border border-rule bg-surface-card">
          <div className="border-b border-rule bg-surface-raised px-4 py-2.5">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-ink-muted">Audit History</h3>
          </div>
          <div className="p-4 min-w-0">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={historyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule, #ddd)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#6B5D8E', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#6B5D8E', fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="overall" stroke="#FFB84D" strokeWidth={2} name="Overall" dot={{ fill: '#FFB84D' }} />
                <Line type="monotone" dataKey="technical" stroke="#4B9CD3" strokeWidth={2} name="Technical" dot={{ fill: '#4B9CD3' }} />
                <Line type="monotone" dataKey="content" stroke="#a78bfa" strokeWidth={2} name="Content" dot={{ fill: '#a78bfa' }} />
                <Line type="monotone" dataKey="performance" stroke="#ef4444" strokeWidth={2} name="Performance" dot={{ fill: '#ef4444' }} />
                <Line type="monotone" dataKey="geo" stroke="#4ade80" strokeWidth={2} name="GEO" dot={{ fill: '#4ade80' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Last audit timestamp */}
      <p className="text-xs text-ink-muted text-center">
        Last audit: {new Date(audit.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
      </p>
    </div>
  );
}
