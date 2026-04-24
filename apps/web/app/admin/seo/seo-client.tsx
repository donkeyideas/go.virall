'use client';

import { useState, useCallback } from 'react';
import {
  Search,
  FileText,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  Copy,
} from 'lucide-react';
import { AdminStatCard } from '../_components/AdminStatCard';
import { AdminTabs } from '../_components/AdminTabs';
import { AdminTable, type AdminColumn } from '../_components/AdminTable';
import { runSeoAudit } from '../../../lib/actions/admin/seo';
import type { SeoAuditResult, ScoreBreakdown, SeoIssue, PageAudit, SeoCategory } from '@govirall/core';

/* ---------- Tabs ---------- */

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'pages', label: 'Pages' },
  { key: 'technical', label: 'Technical' },
  { key: 'content', label: 'Content' },
  { key: 'aeo', label: 'AEO' },
  { key: 'geo', label: 'GEO' },
  { key: 'cro', label: 'CRO' },
  { key: 'recommendations', label: 'Recommendations' },
];

/* ---------- Helpers ---------- */

function scoreColor(score: number): string {
  if (score >= 80) return 'var(--admin-green, #27ae60)';
  if (score >= 50) return 'var(--admin-amber, #e67e22)';
  return 'var(--admin-red, #c0392b)';
}

function scoreAccent(score: number): 'green' | 'red' {
  return score >= 60 ? 'green' : 'red';
}

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === 'error') return <XCircle size={14} color="var(--admin-red, #c0392b)" />;
  if (severity === 'warning') return <AlertTriangle size={14} color="var(--admin-amber, #e67e22)" />;
  return <Info size={14} color="var(--admin-muted, #6b6e7b)" />;
}

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    seo: '#3498db',
    technical: '#9b59b6',
    content: '#27ae60',
    aeo: '#e67e22',
    geo: '#1abc9c',
    cro: '#e74c3c',
  };
  return (
    <span
      style={{
        fontSize: 10,
        fontFamily: 'JetBrains Mono, monospace',
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        padding: '2px 8px',
        borderRadius: 3,
        background: `${colors[category] ?? '#555'}22`,
        color: colors[category] ?? '#555',
        border: `1px solid ${colors[category] ?? '#555'}44`,
      }}
    >
      {category}
    </span>
  );
}

function ScoreRing({ score, label, size = 80 }: { score: number; label: string; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = scoreColor(score);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--admin-surface-3, #282a35)" strokeWidth={6} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6} strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size >= 100 ? 28 : 22,
            fontFamily: 'Fraunces, serif',
            fontWeight: 900,
            color,
          }}
        >
          {score}
        </div>
      </div>
      <div
        style={{
          fontSize: 11,
          fontFamily: 'JetBrains Mono, monospace',
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--admin-muted, #6b6e7b)',
        }}
      >
        {label}
      </div>
    </div>
  );
}

function BreakdownList({ breakdowns }: { breakdowns: ScoreBreakdown[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {breakdowns.map((b) => (
        <div
          key={b.label}
          style={{
            padding: '14px 18px',
            background: 'var(--admin-surface, #1a1b20)',
            border: '1px solid var(--admin-border, #2a2b33)',
            borderRadius: 4,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg, #e2e4ea)' }}>{b.label}</span>
            <span
              style={{
                fontSize: 14,
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 700,
                color: scoreColor(Math.round((b.score / b.maxScore) * 100)),
              }}
            >
              {b.score}/{b.maxScore}
            </span>
          </div>
          {/* Progress bar */}
          <div style={{ height: 4, background: 'var(--admin-surface-3, #282a35)', borderRadius: 2, marginBottom: 8 }}>
            <div
              style={{
                height: '100%',
                width: `${Math.round((b.score / b.maxScore) * 100)}%`,
                background: scoreColor(Math.round((b.score / b.maxScore) * 100)),
                borderRadius: 2,
                transition: 'width 0.3s',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {b.details.map((d, i) => (
              <span key={i} style={{ fontSize: 12, color: 'var(--admin-muted, #6b6e7b)' }}>
                {d}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Main Component ---------- */

export function SeoClient() {
  const [tab, setTab] = useState('overview');
  const [audit, setAudit] = useState<SeoAuditResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<SeoCategory | 'all'>('all');
  const [copied, setCopied] = useState(false);

  const handleCopyAll = useCallback(() => {
    if (!audit) return;
    const issues = filter === 'all' ? audit.issues : audit.issues.filter((i) => i.category === filter);
    const text = issues
      .map((i) => `[${i.severity.toUpperCase()}] [${i.category.toUpperCase()}] ${i.message}${i.page ? ` (${i.page})` : ''}\n  Fix: ${i.suggestion}`)
      .join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [audit, filter]);

  const handleRunAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await runSeoAudit();
    setLoading(false);
    if (result.success) {
      setAudit(result.data);
    } else {
      setError(result.error);
    }
  }, []);

  /* ---------- Page columns ---------- */

  const pageColumns: AdminColumn<PageAudit>[] = [
    {
      key: 'path',
      header: 'Path',
      render: (row) => (
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--fg)' }}>
          {row.path}
        </span>
      ),
    },
    {
      key: 'title',
      header: 'Title',
      render: (row) => (
        <span style={{ fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
          {row.title || '--'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 12,
            color: row.status === 200 ? 'var(--admin-green)' : 'var(--admin-red)',
          }}
        >
          {row.status}
        </span>
      ),
      width: '70px',
    },
    {
      key: 'words',
      header: 'Words',
      render: (row) => (
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
          {row.wordCount}
        </span>
      ),
      width: '70px',
    },
    {
      key: 'schema',
      header: 'Schema',
      render: (row) => (
        <span style={{ fontSize: 12, color: row.hasSchemaOrg ? 'var(--admin-green)' : 'var(--admin-muted)' }}>
          {row.hasSchemaOrg ? `${row.schemaTypes.length} types` : 'None'}
        </span>
      ),
      width: '90px',
    },
    {
      key: 'og',
      header: 'OG',
      render: (row) => {
        const complete = row.hasOgTitle && row.hasOgDescription && row.hasOgImage;
        return (
          <span style={{ fontSize: 12, color: complete ? 'var(--admin-green)' : 'var(--admin-amber)' }}>
            {complete ? 'Full' : 'Partial'}
          </span>
        );
      },
      width: '70px',
    },
    {
      key: 'speed',
      header: 'Speed',
      render: (row) => (
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 12,
            color: (row.loadTimeMs ?? 0) < 2000 ? 'var(--admin-green)' : 'var(--admin-amber)',
          }}
        >
          {row.loadTimeMs ? `${(row.loadTimeMs / 1000).toFixed(1)}s` : '--'}
        </span>
      ),
      width: '70px',
    },
  ];

  /* ---------- Issue columns ---------- */

  const issueColumns: AdminColumn<SeoIssue & { id: string }>[] = [
    {
      key: 'severity',
      header: '',
      render: (row) => <SeverityIcon severity={row.severity} />,
      width: '30px',
    },
    {
      key: 'category',
      header: 'Category',
      render: (row) => <CategoryBadge category={row.category} />,
      width: '100px',
    },
    {
      key: 'message',
      header: 'Issue',
      render: (row) => (
        <div>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{row.message}</span>
          {row.page && (
            <span style={{ fontSize: 11, color: 'var(--admin-muted)', marginLeft: 8, fontFamily: 'JetBrains Mono, monospace' }}>
              {row.page}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'suggestion',
      header: 'Fix',
      render: (row) => (
        <span style={{ fontSize: 12, color: 'var(--admin-muted)' }}>{row.suggestion}</span>
      ),
    },
  ];

  /* ---------- Filtered issues ---------- */

  const filteredIssues = audit
    ? (filter === 'all' ? audit.issues : audit.issues.filter((i) => i.category === filter)).map((issue, i) => ({ ...issue, id: String(i) }))
    : [];

  /* ---------- Render ---------- */

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontFamily: 'Fraunces, serif',
              fontWeight: 700,
              color: 'var(--fg, #e2e4ea)',
              letterSpacing: '-0.02em',
            }}
          >
            SEO Command Center
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--admin-muted, #6b6e7b)' }}>
            SEO, AEO, GEO & CRO audit and optimization
          </p>
        </div>
        <button
          onClick={handleRunAudit}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            fontSize: 13,
            fontWeight: 600,
            background: loading ? 'var(--admin-surface-2, #1f2128)' : 'var(--admin-red, #c0392b)',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.7 : 1,
            fontFamily: 'inherit',
          }}
        >
          <RefreshCw size={14} style={loading ? { animation: 'spin 1s linear infinite' } : undefined} />
          {loading ? 'Scanning...' : 'Run Audit'}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: 4,
            marginBottom: 20,
            background: 'rgba(192,57,43,0.1)',
            border: '1px solid rgba(192,57,43,0.3)',
            color: 'var(--admin-red)',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* No audit yet */}
      {!audit && !loading && !error && (
        <div
          style={{
            padding: '60px 40px',
            textAlign: 'center',
            border: '1px solid var(--admin-border, #2a2b33)',
            borderRadius: 4,
            background: 'var(--admin-surface, #1a1b20)',
          }}
        >
          <Search size={40} color="var(--admin-muted, #6b6e7b)" />
          <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 700, fontSize: 22, marginTop: 16, color: 'var(--fg)' }}>
            No audit data yet
          </h2>
          <p style={{ fontSize: 14, color: 'var(--admin-muted)', maxWidth: 400, margin: '8px auto 0' }}>
            Click "Run Audit" to crawl your site and generate SEO, AEO, GEO, and CRO scores with detailed recommendations.
          </p>
        </div>
      )}

      {/* Loading state */}
      {loading && !audit && (
        <div
          style={{
            padding: '60px 40px',
            textAlign: 'center',
            border: '1px solid var(--admin-border, #2a2b33)',
            borderRadius: 4,
            background: 'var(--admin-surface, #1a1b20)',
          }}
        >
          <RefreshCw size={40} color="var(--admin-muted, #6b6e7b)" style={{ animation: 'spin 1s linear infinite' }} />
          <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 700, fontSize: 22, marginTop: 16, color: 'var(--fg)' }}>
            Crawling your site...
          </h2>
          <p style={{ fontSize: 14, color: 'var(--admin-muted)' }}>
            Scanning pages, analyzing schemas, and computing scores. This may take 30-60 seconds.
          </p>
        </div>
      )}

      {/* Audit Results */}
      {audit && (
        <>
          {/* Tabs */}
          <AdminTabs tabs={TABS} active={tab} onChange={setTab} />

          {/* ============ OVERVIEW ============ */}
          {tab === 'overview' && (
            <div>
              {/* Overall status */}
              <div
                style={{
                  padding: '14px 20px',
                  borderRadius: 4,
                  marginBottom: 24,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: audit.scores.overall >= 80 ? 'rgba(39,174,96,0.1)' : audit.scores.overall >= 50 ? 'rgba(230,126,34,0.1)' : 'rgba(192,57,43,0.1)',
                  border: `1px solid ${audit.scores.overall >= 80 ? 'rgba(39,174,96,0.3)' : audit.scores.overall >= 50 ? 'rgba(230,126,34,0.3)' : 'rgba(192,57,43,0.3)'}`,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: scoreColor(audit.scores.overall),
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 14, fontWeight: 500, color: scoreColor(audit.scores.overall) }}>
                  Overall Score: {audit.scores.overall}/100 -- {audit.scores.overall >= 80 ? 'Excellent' : audit.scores.overall >= 50 ? 'Needs Improvement' : 'Critical Issues'}
                </span>
                <span style={{ fontSize: 12, color: 'var(--admin-muted)', marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace' }}>
                  {new Date(audit.crawledAt).toLocaleString()} -- {audit.summary.totalPages} pages
                </span>
              </div>

              {/* Score rings */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16, marginBottom: 32 }}>
                <ScoreRing score={audit.scores.seo} label="SEO" />
                <ScoreRing score={audit.scores.technical} label="Technical" />
                <ScoreRing score={audit.scores.content} label="Content" />
                <ScoreRing score={audit.scores.aeo} label="AEO" />
                <ScoreRing score={audit.scores.geo} label="GEO" />
                <ScoreRing score={audit.scores.cro} label="CRO" />
              </div>

              {/* KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
                <AdminStatCard
                  label="Pages Scanned"
                  value={audit.summary.totalPages.toString()}
                  icon={<FileText size={18} />}
                  accent="green"
                />
                <AdminStatCard
                  label="Healthy Pages"
                  value={audit.summary.healthyPages.toString()}
                  icon={<CheckCircle size={18} />}
                  accent="green"
                />
                <AdminStatCard
                  label="Total Issues"
                  value={audit.summary.totalIssues.toString()}
                  icon={<AlertTriangle size={18} />}
                  accent={audit.summary.totalIssues > 0 ? 'red' : 'green'}
                />
                <AdminStatCard
                  label="Critical Issues"
                  value={audit.summary.criticalIssues.toString()}
                  icon={<XCircle size={18} />}
                  accent={audit.summary.criticalIssues > 0 ? 'red' : 'green'}
                />
              </div>

              {/* Top issues */}
              {audit.issues.length > 0 && (
                <div>
                  <h3
                    style={{
                      margin: '0 0 12px',
                      fontSize: 11,
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 600,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--admin-muted)',
                    }}
                  >
                    Top Issues
                  </h3>
                  <AdminTable
                    columns={issueColumns}
                    data={audit.issues.slice(0, 8).map((issue, i) => ({ ...issue, id: String(i) }))}
                    emptyMessage="No issues found"
                  />
                </div>
              )}
            </div>
          )}

          {/* ============ PAGES ============ */}
          {tab === 'pages' && (
            <div>
              <h3
                style={{
                  margin: '0 0 12px',
                  fontSize: 11,
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--admin-muted)',
                }}
              >
                Crawled Pages ({audit.pages.length})
              </h3>
              <AdminTable columns={pageColumns} data={audit.pages} emptyMessage="No pages crawled" />
            </div>
          )}

          {/* ============ TECHNICAL ============ */}
          {tab === 'technical' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <ScoreRing score={audit.scores.technical} label="Technical" size={100} />
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontFamily: 'Fraunces, serif', fontWeight: 700, color: 'var(--fg)' }}>
                    Technical SEO
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--admin-muted)' }}>
                    Server status, robots.txt, sitemap, canonical tags, HTTPS
                  </p>
                </div>
              </div>
              <BreakdownList breakdowns={audit.scoreBreakdowns.technical} />
            </div>
          )}

          {/* ============ CONTENT ============ */}
          {tab === 'content' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <ScoreRing score={audit.scores.content} label="Content" size={100} />
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontFamily: 'Fraunces, serif', fontWeight: 700, color: 'var(--fg)' }}>
                    Content Quality
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--admin-muted)' }}>
                    Word count, headings, alt text, internal linking
                  </p>
                </div>
              </div>
              <BreakdownList breakdowns={audit.scoreBreakdowns.content} />
            </div>
          )}

          {/* ============ AEO ============ */}
          {tab === 'aeo' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <ScoreRing score={audit.scores.aeo} label="AEO" size={100} />
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontFamily: 'Fraunces, serif', fontWeight: 700, color: 'var(--fg)' }}>
                    Answer Engine Optimization
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--admin-muted)' }}>
                    FAQ schema, structured data variety, AI-readable content
                  </p>
                </div>
              </div>
              <BreakdownList breakdowns={audit.scoreBreakdowns.aeo} />

              {/* Schema coverage map */}
              <div style={{ marginTop: 24 }}>
                <h3
                  style={{
                    margin: '0 0 12px',
                    fontSize: 11,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--admin-muted)',
                  }}
                >
                  Schema Coverage
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {[
                    { label: 'Organization', key: 'Organization' as const },
                    { label: 'WebSite', key: 'WebSite' as const },
                    { label: 'FAQPage', key: 'FAQPage' as const },
                    { label: 'SoftwareApp', key: 'SoftwareApplication' as const },
                    { label: 'BreadcrumbList', key: 'BreadcrumbList' as const },
                    { label: 'HowTo', key: 'HowTo' as const },
                  ].map((schema) => {
                    const found = audit.pages.some((p) => p.schemaTypes.includes(schema.key));
                    return (
                      <div
                        key={schema.key}
                        style={{
                          padding: '12px 16px',
                          background: 'var(--admin-surface, #1a1b20)',
                          border: `1px solid ${found ? 'rgba(39,174,96,0.3)' : 'var(--admin-border, #2a2b33)'}`,
                          borderRadius: 4,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        {found ? <CheckCircle size={16} color="var(--admin-green)" /> : <XCircle size={16} color="var(--admin-muted)" />}
                        <span style={{ fontSize: 13, color: found ? 'var(--fg)' : 'var(--admin-muted)' }}>{schema.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ============ GEO ============ */}
          {tab === 'geo' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <ScoreRing score={audit.scores.geo} label="GEO" size={100} />
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontFamily: 'Fraunces, serif', fontWeight: 700, color: 'var(--fg)' }}>
                    Generative Engine Optimization
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--admin-muted)' }}>
                    JSON-LD schemas, OpenGraph tags, content authority, breadcrumbs
                  </p>
                </div>
              </div>
              <BreakdownList breakdowns={audit.scoreBreakdowns.geo} />
            </div>
          )}

          {/* ============ CRO ============ */}
          {tab === 'cro' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <ScoreRing score={audit.scores.cro} label="CRO" size={100} />
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontFamily: 'Fraunces, serif', fontWeight: 700, color: 'var(--fg)' }}>
                    Conversion Rate Optimization
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--admin-muted)' }}>
                    CTAs, page speed, value proposition, mobile readiness
                  </p>
                </div>
              </div>
              <BreakdownList breakdowns={audit.scoreBreakdowns.cro} />
            </div>
          )}

          {/* ============ RECOMMENDATIONS ============ */}
          {tab === 'recommendations' && (
            <div>
              {/* Filter */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {(['all', 'seo', 'technical', 'content', 'aeo', 'geo', 'cro'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    style={{
                      padding: '6px 14px',
                      fontSize: 12,
                      fontWeight: filter === f ? 600 : 400,
                      background: filter === f ? 'var(--admin-surface-2, #1f2128)' : 'transparent',
                      color: filter === f ? 'var(--fg)' : 'var(--admin-muted)',
                      border: `1px solid ${filter === f ? 'var(--admin-red, #c0392b)' : 'var(--admin-border, #2a2b33)'}`,
                      borderRadius: 3,
                      cursor: 'pointer',
                      fontFamily: 'JetBrains Mono, monospace',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Issues summary + Copy All */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 24 }}>
                  <span style={{ fontSize: 12, color: 'var(--admin-red)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <XCircle size={14} /> {audit.issues.filter((i) => i.severity === 'error').length} errors
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--admin-amber, #e67e22)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertTriangle size={14} /> {audit.issues.filter((i) => i.severity === 'warning').length} warnings
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--admin-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Info size={14} /> {audit.issues.filter((i) => i.severity === 'info').length} info
                  </span>
                </div>
                <button
                  onClick={handleCopyAll}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    fontSize: 12,
                    fontWeight: 500,
                    background: copied ? 'rgba(39,174,96,0.15)' : 'var(--admin-surface-2, #1f2128)',
                    color: copied ? 'var(--admin-green, #27ae60)' : 'var(--fg, #e2e4ea)',
                    border: `1px solid ${copied ? 'rgba(39,174,96,0.3)' : 'var(--admin-border, #2a2b33)'}`,
                    borderRadius: 3,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s',
                  }}
                >
                  {copied ? <CheckCircle size={13} /> : <Copy size={13} />}
                  {copied ? 'Copied!' : 'Copy All'}
                </button>
              </div>

              <AdminTable
                columns={issueColumns}
                data={filteredIssues}
                emptyMessage="No issues in this category"
              />
            </div>
          )}
        </>
      )}

      {/* Spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
