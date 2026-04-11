'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

function TabLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 rounded-full border-2 border-ink/10 border-t-editorial-gold animate-spin" />
    </div>
  );
}

const OverviewTab        = dynamic(() => import('./components/OverviewTab'),        { loading: TabLoading });
const SearchConsoleTab   = dynamic(() => import('./components/SearchConsoleTab'),   { loading: TabLoading });
const TrafficTab         = dynamic(() => import('./components/TrafficTab'),         { loading: TabLoading });
const AuditTab           = dynamic(() => import('./components/AuditTab'),           { loading: TabLoading });
const GEOTab             = dynamic(() => import('./components/GEOTab'),             { loading: TabLoading });
const AEOTab             = dynamic(() => import('./components/AEOTab'),             { loading: TabLoading });
const CROTab             = dynamic(() => import('./components/CROTab'),             { loading: TabLoading });
const RecommendationsTab = dynamic(() => import('./components/RecommendationsTab'), { loading: TabLoading });
const SettingsTab        = dynamic(() => import('./components/SettingsTab'),        { loading: TabLoading });

const TABS = [
  { key: 'overview',        label: 'Overview' },
  { key: 'search-console',  label: 'Search Console' },
  { key: 'traffic',         label: 'Traffic' },
  { key: 'audit',           label: 'SEO Audit' },
  { key: 'geo',             label: 'GEO' },
  { key: 'aeo',             label: 'AEO' },
  { key: 'cro',             label: 'CRO' },
  { key: 'recommendations', label: 'Recommendations' },
  { key: 'settings',        label: 'Settings' },
];

function SeoContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const tabFromUrl   = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'overview');

  useEffect(() => {
    if (tabFromUrl && TABS.some((t) => t.key === tabFromUrl)) setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    router.push(`/admin/seo?tab=${tab}`, { scroll: false });
  };

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-ink">SEO, GEO, AEO &amp; CRO</h1>
        <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mt-1">
          Search, Generative, Answer Engine &amp; Conversion Rate Optimization
        </p>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-rule mb-6 overflow-x-auto">
        <div className="flex min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={[
                'px-4 py-2.5 text-[13px] whitespace-nowrap transition-colors -mb-px border-b-2',
                activeTab === tab.key
                  ? 'font-semibold border-editorial-gold text-editorial-gold'
                  : 'font-medium border-transparent text-ink-muted hover:text-ink',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'overview'        && <OverviewTab onTabChange={handleTabChange} />}
      {activeTab === 'search-console'  && <SearchConsoleTab onTabChange={handleTabChange} />}
      {activeTab === 'traffic'         && <TrafficTab onTabChange={handleTabChange} />}
      {activeTab === 'audit'           && <AuditTab />}
      {activeTab === 'geo'             && <GEOTab />}
      {activeTab === 'aeo'             && <AEOTab onTabChange={handleTabChange} />}
      {activeTab === 'cro'             && <CROTab />}
      {activeTab === 'recommendations' && <RecommendationsTab />}
      {activeTab === 'settings'        && <SettingsTab />}
    </>
  );
}

export default function AdminSeoPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 rounded-full border-2 border-ink/10 border-t-editorial-gold animate-spin" />
      </div>
    }>
      <SeoContent />
    </Suspense>
  );
}
