'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

/* ---------- types ---------- */
interface SEOSettings {
  /* Global SEO */
  siteTitle: string;
  siteDescription: string;
  defaultOgImage: string;
  twitterCardType: string;
  canonicalUrlBase: string;
  /* Analytics & Verification */
  googleAnalyticsId: string;
  googleAnalyticsPropertyId: string;
  googleAnalyticsCredentials: string;
  googleSearchConsoleVerification: string;
  /* Google Search Console API */
  gscClientId: string;
  gscClientSecret: string;
  gscSiteUrl: string;
  gscConnected: boolean;
  /* Organization Schema */
  organizationName: string;
  organizationLogo: string;
  organizationDescription: string;
  organizationContactInfo: string;
  /* Social Media Profiles */
  socialFacebook: string;
  socialTwitter: string;
  socialLinkedin: string;
  socialInstagram: string;
  socialYoutube: string;
  socialTiktok: string;
}

interface GSCTestResult {
  success: boolean;
  sites?: string[];
  error?: string;
}

const defaultSettings: SEOSettings = {
  siteTitle: '',
  siteDescription: '',
  defaultOgImage: '',
  twitterCardType: 'summary_large_image',
  canonicalUrlBase: '',
  googleAnalyticsId: '',
  googleAnalyticsPropertyId: '',
  googleAnalyticsCredentials: '',
  googleSearchConsoleVerification: '',
  gscClientId: '',
  gscClientSecret: '',
  gscSiteUrl: '',
  gscConnected: false,
  organizationName: '',
  organizationLogo: '',
  organizationDescription: '',
  organizationContactInfo: '',
  socialFacebook: '',
  socialTwitter: '',
  socialLinkedin: '',
  socialInstagram: '',
  socialYoutube: '',
  socialTiktok: '',
};

/* ---------- sub-components ---------- */
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-rule bg-surface-card p-5">
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-4">{title}</p>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-ink-muted mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputClass = 'w-full px-3 py-2 border border-rule bg-surface-cream text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-editorial-gold/30 transition-colors';
const textareaClass = `${inputClass} resize-none`;

/* ---------- component ---------- */
export default function SettingsTab() {
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState<SEOSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [gscTestResult, setGscTestResult] = useState<GSCTestResult | null>(null);
  const [isTestingGSC, setIsTestingGSC] = useState(false);
  const [isConnectingGSC, setIsConnectingGSC] = useState(false);
  const [gscNotice, setGscNotice] = useState('');

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/seo');
      if (res.ok) {
        const data = await res.json();
        const s = data.settings ?? data;
        // gscConnected is derived from whether a refresh token exists (masked tokens start with •••• and mean it IS connected)
        const hasRefreshToken = !!(s.gscRefreshToken && s.gscRefreshToken !== '');
        setSettings({ ...defaultSettings, ...s, gscConnected: hasRefreshToken || s.gscConnected === 'true' || s.gscConnected === true });
      }
    } catch {
      /* ignore */
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  /* Check for GSC OAuth callback */
  useEffect(() => {
    if (searchParams.get('gsc') === 'connected') {
      setGscNotice('Google Search Console connected successfully.');
      setSettings((prev) => ({ ...prev, gscConnected: true }));
    }
  }, [searchParams]);

  /* ---------- handlers ---------- */
  const update = (key: keyof SEOSettings, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaveMessage('');
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveMessage('');
      // Exclude derived/OAuth-managed fields from save
      const { gscConnected, ...settingsToSave } = settings;
      const res = await fetch('/api/admin/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsToSave),
      });
      if (res.ok) {
        setSaveMessage('Settings saved successfully.');
      } else {
        setSaveMessage('Failed to save settings. Please try again.');
      }
    } catch {
      setSaveMessage('Error saving settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGSCConnect = async () => {
    try {
      setIsConnectingGSC(true);
      // Save credentials to DB first so the auth route can read them
      const { gscConnected, ...settingsToSave } = settings;
      await fetch('/api/admin/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsToSave),
      });
      // Now get the OAuth URL from the auth route
      const res = await fetch('/api/admin/seo-geo/search-console/auth');
      if (res.ok) {
        const { authUrl } = await res.json();
        if (authUrl) {
          window.location.href = authUrl;
          return;
        }
      }
      setIsConnectingGSC(false);
    } catch {
      setIsConnectingGSC(false);
    }
  };

  const handleGSCDisconnect = async () => {
    try {
      setIsConnectingGSC(true);
      const res = await fetch('/api/admin/seo-geo/search-console/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect' }),
      });
      if (res.ok) {
        setSettings((prev) => ({ ...prev, gscConnected: false }));
        setGscNotice('Google Search Console disconnected.');
        setGscTestResult(null);
      }
    } catch {
      /* ignore */
    } finally {
      setIsConnectingGSC(false);
    }
  };

  const handleGSCTest = async () => {
    try {
      setIsTestingGSC(true);
      setGscTestResult(null);
      const res = await fetch('/api/admin/seo-geo/search-console/test');
      if (res.ok) {
        setGscTestResult(await res.json());
      } else {
        setGscTestResult({ success: false, error: 'Test request failed.' });
      }
    } catch {
      setGscTestResult({ success: false, error: 'Connection error.' });
    } finally {
      setIsTestingGSC(false);
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

  const descLength = settings.siteDescription.length;

  /* ---------- render ---------- */
  return (
    <div className="space-y-6">
      {/* 1. Global SEO Settings */}
      <SectionCard title="Global SEO Settings">
        <Field label="Site Title">
          <input
            type="text"
            value={settings.siteTitle}
            onChange={(e) => update('siteTitle', e.target.value)}
            placeholder="GoVirall - Social Media Intelligence"
            className={inputClass}
          />
        </Field>
        <Field label="Site Description">
          <div className="relative">
            <textarea
              value={settings.siteDescription}
              onChange={(e) => update('siteDescription', e.target.value)}
              placeholder="AI-powered social media analytics and growth platform."
              rows={3}
              maxLength={300}
              className={textareaClass}
            />
            <span className={`absolute bottom-2 right-3 text-xs ${descLength > 160 ? 'text-editorial-red' : 'text-ink-muted'}`}>
              {descLength}/160
            </span>
          </div>
        </Field>
        <Field label="Default OG Image URL">
          <input
            type="text"
            value={settings.defaultOgImage}
            onChange={(e) => update('defaultOgImage', e.target.value)}
            placeholder="https://govirall.com/og-image.png"
            className={inputClass}
          />
        </Field>
        <Field label="Twitter Card Type">
          <select
            value={settings.twitterCardType}
            onChange={(e) => update('twitterCardType', e.target.value)}
            className={inputClass}
          >
            <option value="summary">summary</option>
            <option value="summary_large_image">summary_large_image</option>
            <option value="app">app</option>
            <option value="player">player</option>
          </select>
        </Field>
        <Field label="Canonical URL Base">
          <input
            type="text"
            value={settings.canonicalUrlBase}
            onChange={(e) => update('canonicalUrlBase', e.target.value)}
            placeholder="https://govirall.com"
            className={inputClass}
          />
        </Field>
      </SectionCard>

      {/* 2. Analytics & Verification */}
      <SectionCard title="Analytics & Verification">
        <Field label="Google Analytics Measurement ID (for tracking script)">
          <input
            type="text"
            value={settings.googleAnalyticsId}
            onChange={(e) => update('googleAnalyticsId', e.target.value)}
            placeholder="G-XXXXXXXXXX"
            className={inputClass}
          />
          <p className="text-xs text-ink-muted mt-1">Used for the GA tracking script on your site.</p>
        </Field>
        <Field label="GA4 Property ID (for Traffic analytics)">
          <input
            type="text"
            value={settings.googleAnalyticsPropertyId}
            onChange={(e) => update('googleAnalyticsPropertyId', e.target.value)}
            placeholder="123456789"
            className={inputClass}
          />
          <p className="text-xs text-ink-muted mt-1">Numeric Property ID from GA4 Admin → Property Settings. Required for the Traffic tab.</p>
        </Field>
        <Field label="GA4 Service Account Credentials (JSON)">
          <textarea
            value={settings.googleAnalyticsCredentials}
            onChange={(e) => update('googleAnalyticsCredentials', e.target.value)}
            placeholder='{"type": "service_account", "project_id": "...", ...}'
            rows={4}
            className={textareaClass}
          />
          <p className="text-xs text-ink-muted mt-1">
            Service account JSON from Google Cloud Console. Required for the Traffic tab.
            Create at: Google Cloud → IAM → Service Accounts → Create → Add GA4 Viewer role → Keys → Add JSON key.
          </p>
        </Field>
        <Field label="Google Search Console Verification">
          <input
            type="text"
            value={settings.googleSearchConsoleVerification}
            onChange={(e) => update('googleSearchConsoleVerification', e.target.value)}
            placeholder="HTML meta tag verification code"
            className={inputClass}
          />
        </Field>
      </SectionCard>

      {/* 3. Google Search Console API */}
      <SectionCard title="Google Search Console API">
        {gscNotice && (
          <div className="p-3 bg-editorial-green/10 border border-editorial-green/20 text-sm text-editorial-green">
            {gscNotice}
          </div>
        )}

        {settings.gscConnected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-editorial-green" />
              <span className="text-sm text-editorial-green font-semibold">Connected</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleGSCTest}
                disabled={isTestingGSC}
                className="px-4 py-2 bg-ink/5 text-ink text-[11px] font-bold uppercase tracking-wider hover:bg-ink/10 disabled:opacity-50"
              >
                {isTestingGSC ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                onClick={handleGSCDisconnect}
                disabled={isConnectingGSC}
                className="px-4 py-2 bg-editorial-red/10 text-editorial-red text-[11px] font-bold uppercase tracking-wider hover:bg-editorial-red/20 disabled:opacity-50"
              >
                {isConnectingGSC ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>

            {gscTestResult && (
              <div className={`p-3 text-sm ${
                gscTestResult.success
                  ? 'bg-editorial-green/10 border border-editorial-green/20 text-editorial-green'
                  : 'bg-editorial-red/10 border border-editorial-red/20 text-editorial-red'
              }`}>
                {gscTestResult.success ? (
                  <div className="space-y-2">
                    <p>Connection successful.</p>
                    {gscTestResult.sites && gscTestResult.sites.length > 0 && (
                      <div>
                        <p className="font-semibold">Available sites:</p>
                        <ul className="list-disc list-inside mt-1">
                          {gscTestResult.sites.map((site, i) => (
                            <li key={i}>{site}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p>{gscTestResult.error || 'Connection test failed.'}</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Client ID">
              <input
                type="text"
                value={settings.gscClientId}
                onChange={(e) => update('gscClientId', e.target.value)}
                placeholder="OAuth 2.0 Client ID"
                className={inputClass}
              />
            </Field>
            <Field label="Client Secret">
              <input
                type="password"
                value={settings.gscClientSecret}
                onChange={(e) => update('gscClientSecret', e.target.value)}
                placeholder="OAuth 2.0 Client Secret"
                className={inputClass}
              />
            </Field>
            <Field label="Site URL">
              <input
                type="text"
                value={settings.gscSiteUrl}
                onChange={(e) => update('gscSiteUrl', e.target.value)}
                placeholder="https://govirall.com"
                className={inputClass}
              />
            </Field>
            <button
              onClick={handleGSCConnect}
              disabled={isConnectingGSC || !settings.gscClientId || !settings.gscClientSecret}
              className="px-4 py-2 bg-editorial-gold text-surface-cream text-[11px] font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50"
            >
              {isConnectingGSC ? 'Connecting...' : 'Connect Google Search Console'}
            </button>
          </div>
        )}
      </SectionCard>

      {/* 4. Organization Schema */}
      <SectionCard title="Organization Schema">
        <Field label="Organization Name">
          <input
            type="text"
            value={settings.organizationName}
            onChange={(e) => update('organizationName', e.target.value)}
            placeholder="GoVirall Inc."
            className={inputClass}
          />
        </Field>
        <Field label="Organization Logo URL">
          <input
            type="text"
            value={settings.organizationLogo}
            onChange={(e) => update('organizationLogo', e.target.value)}
            placeholder="https://govirall.com/logo.png"
            className={inputClass}
          />
        </Field>
        <Field label="Organization Description">
          <textarea
            value={settings.organizationDescription}
            onChange={(e) => update('organizationDescription', e.target.value)}
            placeholder="Brief description of your organization for structured data."
            rows={3}
            className={textareaClass}
          />
        </Field>
        <Field label="Contact Info">
          <input
            type="text"
            value={settings.organizationContactInfo}
            onChange={(e) => update('organizationContactInfo', e.target.value)}
            placeholder="support@govirall.com"
            className={inputClass}
          />
        </Field>
      </SectionCard>

      {/* 5. Social Media Profiles */}
      <SectionCard title="Social Media Profiles">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Facebook">
            <input
              type="text"
              value={settings.socialFacebook}
              onChange={(e) => update('socialFacebook', e.target.value)}
              placeholder="https://facebook.com/govirall"
              className={inputClass}
            />
          </Field>
          <Field label="Twitter / X">
            <input
              type="text"
              value={settings.socialTwitter}
              onChange={(e) => update('socialTwitter', e.target.value)}
              placeholder="https://twitter.com/govirall"
              className={inputClass}
            />
          </Field>
          <Field label="LinkedIn">
            <input
              type="text"
              value={settings.socialLinkedin}
              onChange={(e) => update('socialLinkedin', e.target.value)}
              placeholder="https://linkedin.com/company/govirall"
              className={inputClass}
            />
          </Field>
          <Field label="Instagram">
            <input
              type="text"
              value={settings.socialInstagram}
              onChange={(e) => update('socialInstagram', e.target.value)}
              placeholder="https://instagram.com/govirall"
              className={inputClass}
            />
          </Field>
          <Field label="YouTube">
            <input
              type="text"
              value={settings.socialYoutube}
              onChange={(e) => update('socialYoutube', e.target.value)}
              placeholder="https://youtube.com/@govirall"
              className={inputClass}
            />
          </Field>
          <Field label="TikTok">
            <input
              type="text"
              value={settings.socialTiktok}
              onChange={(e) => update('socialTiktok', e.target.value)}
              placeholder="https://tiktok.com/@govirall"
              className={inputClass}
            />
          </Field>
        </div>
      </SectionCard>

      {/* 6. Sitemap */}
      <SectionCard title="Sitemap">
        <div className="flex items-center gap-3">
          <p className="text-sm text-ink-muted">
            Your sitemap is automatically generated and available at:
          </p>
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-editorial-blue hover:underline font-medium"
          >
            /sitemap.xml
          </a>
        </div>
      </SectionCard>

      {/* Save button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-editorial-gold text-surface-cream text-[11px] font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save All Settings'}
        </button>
        {saveMessage && (
          <span className={`text-sm ${saveMessage.includes('success') ? 'text-editorial-green' : 'text-editorial-red'}`}>
            {saveMessage}
          </span>
        )}
      </div>
    </div>
  );
}
