'use client';

import { useState, useEffect, useTransition } from 'react';
import { Input, Badge, ThemedSelect } from '@govirall/ui-web';
import { updateProfile, uploadAvatar, updateNotificationPrefs, deleteAccount, exportData } from '@/lib/actions/settings';
import { createSubscription, activateSubscription, cancelSubscription, getSubscriptionDetails } from '@/lib/actions/billing';
import { useRouter } from 'next/navigation';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripePromise } from '@/lib/stripe-client';

const TABS = [
  { id: 'account', label: 'Account' },
  { id: 'platforms', label: 'Connected Platforms' },
  { id: 'billing', label: 'Billing' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'api', label: 'API & Automations' },
  { id: 'danger', label: 'Danger Zone' },
];

const NOTIFICATION_KINDS = [
  { key: 'score_drops', label: 'Score drops' },
  { key: 'new_opportunities', label: 'New opportunities' },
  { key: 'deal_stage_changes', label: 'Deal stage changes' },
  { key: 'invoice_paid', label: 'Invoice paid' },
  { key: 'platform_sync_errors', label: 'Platform sync errors' },
  { key: 'weekly_wins', label: 'Weekly wins' },
];

type Profile = {
  display_name: string | null;
  handle: string | null;
  email: string | null;
  bio: string | null;
  timezone: string | null;
  theme: string | null;
  mission: string | null;
  notification_prefs: Record<string, boolean> | null;
  avatar_url: string | null;
} | null;

type Platform = {
  id: string;
  platform: string;
  platform_username: string | null;
  follower_count: number | null;
  sync_status: string;
};

type Subscription = {
  tier: string;
  status: string;
  current_period_end: string | null;
} | null;

export function SettingsClient({
  profile,
  platforms,
  subscription,
  theme: serverTheme,
  upgradePlan,
}: {
  profile: Profile;
  platforms: Platform[];
  subscription: Subscription;
  theme: string;
  upgradePlan?: { name: string; price: number; features: string[]; tier: string };
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState('account');
  const [activeTheme, setActiveTheme] = useState(serverTheme);
  const [platformMsg, setPlatformMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [addingPlatform, setAddingPlatform] = useState<string | null>(null);
  const [usernameInputs, setUsernameInputs] = useState<Record<string, string>>({});
  useEffect(() => {
    // Read hash for initial tab
    const hash = window.location.hash.slice(1);
    if (hash && TABS.some((t) => t.id === hash)) setActiveTab(hash);
    // Listen for hash changes (e.g. sidebar Upgrade button)
    function onHashChange() {
      const h = window.location.hash.slice(1);
      if (h && TABS.some((t) => t.id === h)) setActiveTab(h);
    }
    window.addEventListener('hashchange', onHashChange);
    // Read URL search params for platform connection messages
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const connected = params.get('connected');
    if (error) {
      setActiveTab('platforms');
      setPlatformMsg({ type: 'error', text: error });
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete('error');
      window.history.replaceState({}, '', url.pathname + url.hash);
    } else if (connected) {
      setActiveTab('platforms');
      setPlatformMsg({ type: 'success', text: `${connected.charAt(0).toUpperCase() + connected.slice(1)} connected successfully!` });
      const url = new URL(window.location.href);
      url.searchParams.delete('connected');
      window.history.replaceState({}, '', url.pathname + url.hash);
      startTransition(() => router.refresh());
    }
    // Sync with document theme set by DashboardShell
    const docTheme = document.documentElement.getAttribute('data-theme');
    if (docTheme && docTheme !== serverTheme) setActiveTheme(docTheme);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [serverTheme, router, startTransition]);
  const [saveMsg, setSaveMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>(() => {
    const prefs: Record<string, boolean> = {};
    for (const kind of NOTIFICATION_KINDS) {
      prefs[kind.key] = profile?.notification_prefs?.[kind.key] ?? true;
    }
    return prefs;
  });
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [timezone, setTimezone] = useState(profile?.timezone ?? 'America/New_York');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url ?? null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState('');
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState('');
  const [paymentModal, setPaymentModal] = useState<{
    clientSecret: string;
    subscriptionId: string;
    tier: string;
  } | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [manageModal, setManageModal] = useState<{
    tier: string;
    status: string;
    amountCents: number;
    interval: string;
    currentPeriodEnd: string | null;
    paymentMethod: { brand: string; last4: string; expMonth: number; expYear: number } | null;
    invoices: { id: string; date: string | null; amount: number; status: string; pdfUrl: string | null }[];
  } | null>(null);
  const [manageLoading, setManageLoading] = useState(false);

  async function handleUpgrade(tier: 'creator' | 'pro' | 'agency' = 'creator') {
    setBillingLoading(true);
    setBillingError('');
    try {
      const result = await createSubscription(tier);
      if (result.error) {
        setBillingError(result.error);
      } else if (result.clientSecret && result.subscriptionId) {
        setPaymentModal({
          clientSecret: result.clientSecret,
          subscriptionId: result.subscriptionId,
          tier,
        });
      }
    } catch {
      setBillingError('Network error. Please try again.');
    }
    setBillingLoading(false);
  }

  async function handleManageSubscription() {
    setManageLoading(true);
    setBillingError('');
    try {
      const result = await getSubscriptionDetails();
      if (result.error) {
        setBillingError(result.error);
      } else if (result.details) {
        setManageModal(result.details);
      }
    } catch {
      setBillingError('Network error. Please try again.');
    }
    setManageLoading(false);
  }

  async function handlePaymentSuccess(subscriptionId: string) {
    const result = await activateSubscription(subscriptionId);
    if (result.error) {
      setBillingError(result.error);
    }
    setPaymentModal(null);
    startTransition(() => router.refresh());
  }

  const isEditorial = activeTheme === 'neon-editorial';
  const isNeumorphic = activeTheme === 'neumorphic';

  const cardStyle: React.CSSProperties = isEditorial
    ? { border: '1.5px solid var(--ink)', borderRadius: 20, background: 'var(--paper)', padding: 28 }
    : isNeumorphic
    ? { borderRadius: 24, background: 'var(--surface, var(--bg))', padding: 28, boxShadow: 'var(--out-md)' }
    : {
        background: 'var(--glass, rgba(255,255,255,.06))',
        backdropFilter: 'blur(24px) saturate(1.2)',
        border: 'none',
        borderRadius: 20,
        padding: 28,
        boxShadow: '0 20px 60px -20px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.08)',
      };

  const innerItemStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderRadius: isNeumorphic ? 16 : 12,
    ...(isEditorial
      ? { background: 'var(--paper-2, rgba(0,0,0,.03))' }
      : isNeumorphic
      ? { background: 'var(--surface, var(--bg))', boxShadow: 'var(--in-sm)' }
      : { background: 'rgba(255,255,255,.04)' }),
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--fg)',
    marginBottom: 10,
  };

  const tabHeadingStyle: React.CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontWeight: isEditorial ? 900 : 500,
    fontStyle: isEditorial ? 'italic' : 'normal',
    fontSize: isEditorial ? 26 : 20,
    color: isEditorial ? 'var(--ink)' : 'var(--fg)',
    marginBottom: 24,
  };

  const btnPrimary: React.CSSProperties = {
    height: 40,
    padding: '0 20px',
    borderRadius: isNeumorphic ? 14 : 12,
    border: 'none',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all .15s',
    ...(isEditorial
      ? { background: 'var(--ink)', color: 'var(--bg)' }
      : isNeumorphic
      ? { background: 'var(--bg)', color: 'var(--color-primary)', boxShadow: 'var(--out-sm)' }
      : { background: 'linear-gradient(135deg, #8b5cf6, #ff71a8)', color: '#fff' }),
  };

  const btnSecondary: React.CSSProperties = {
    height: 36,
    padding: '0 16px',
    borderRadius: isNeumorphic ? 12 : 10,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all .15s',
    ...(isEditorial
      ? { background: 'var(--paper-2, rgba(0,0,0,.05))', color: 'var(--ink)', border: '1px solid var(--ink)' }
      : isNeumorphic
      ? { background: 'var(--bg)', color: 'var(--fg)', border: 'none', boxShadow: 'var(--out-sm)' }
      : { background: 'rgba(255,255,255,.08)', color: 'var(--fg)', border: 'none' }),
  };

  function switchTab(tabId: string) {
    setActiveTab(tabId);
    window.location.hash = tabId;
  }

  async function handleSaveProfile(formData: FormData) {
    setSaving(true);
    setSaveMsg('');
    const result = await updateProfile(formData);
    setSaving(false);
    if (result.error) {
      setSaveMsg(result.error);
    } else {
      setSaveMsg('Saved');
      startTransition(() => router.refresh());
      setTimeout(() => setSaveMsg(''), 3000);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview immediately
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Upload
    setAvatarUploading(true);
    setAvatarMsg('');
    const fd = new FormData();
    fd.append('avatar', file);
    const result = await uploadAvatar(fd);
    setAvatarUploading(false);
    if (result.error) {
      setAvatarMsg(result.error);
      setAvatarPreview(profile?.avatar_url ?? null);
    } else {
      setAvatarMsg('Avatar updated');
      if (result.avatarUrl) setAvatarPreview(result.avatarUrl);
      startTransition(() => router.refresh());
      setTimeout(() => setAvatarMsg(''), 3000);
    }
  }

  const [themeChanging, setThemeChanging] = useState(false);

  async function handleThemeChange(newTheme: string) {
    if (themeChanging || newTheme === activeTheme) return;
    setThemeChanging(true);

    // Capture current bg before any changes
    const currentBg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();

    // Create full-screen overlay for smooth crossfade
    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;inset:0;z-index:99999;background:${currentBg};opacity:0;transition:opacity 0.25s ease;pointer-events:all;`;
    document.body.appendChild(overlay);

    // Fade in overlay (hides current UI)
    overlay.getBoundingClientRect(); // force reflow
    overlay.style.opacity = '1';
    await new Promise(r => setTimeout(r, 250));

    // Switch theme behind the overlay
    setActiveTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);

    // Save to DB then refresh layout
    const formData = new FormData();
    formData.set('theme', newTheme);
    await updateProfile(formData);
    startTransition(() => router.refresh());

    // Let React re-render the new layout structure
    await new Promise(r => setTimeout(r, 300));

    // Fade out overlay to reveal new theme
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
    setTimeout(() => {
      overlay.remove();
      setThemeChanging(false);
    }, 250);
  }

  async function handleNotifToggle(key: string) {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    await updateNotificationPrefs(updated);
  }

  async function handleExport() {
    const result = await exportData();
    if (result.data) {
      const XLSX = (await import('xlsx')).default;
      const wb = XLSX.utils.book_new();

      // Profile sheet (single row)
      if (result.data.profile) {
        const ws = XLSX.utils.json_to_sheet([result.data.profile]);
        XLSX.utils.book_append_sheet(wb, ws, 'Profile');
      }
      // Platforms sheet
      if (result.data.platforms?.length) {
        const ws = XLSX.utils.json_to_sheet(result.data.platforms);
        XLSX.utils.book_append_sheet(wb, ws, 'Platforms');
      }
      // Posts sheet
      if (result.data.posts?.length) {
        const ws = XLSX.utils.json_to_sheet(result.data.posts);
        XLSX.utils.book_append_sheet(wb, ws, 'Posts');
      }
      // Deals sheet
      if (result.data.deals?.length) {
        const ws = XLSX.utils.json_to_sheet(result.data.deals);
        XLSX.utils.book_append_sheet(wb, ws, 'Deals');
      }
      // Invoices sheet
      if (result.data.invoices?.length) {
        const ws = XLSX.utils.json_to_sheet(result.data.invoices);
        XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
      }

      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `govirall-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  async function handleAddPlatform(platformId: string) {
    const username = usernameInputs[platformId]?.trim();
    if (!username) return;
    setAddingPlatform(platformId);
    setPlatformMsg(null);
    try {
      const res = await fetch('/api/platforms/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: platformId, username }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPlatformMsg({ type: 'error', text: json?.error?.message || 'Failed to add platform.' });
      } else {
        setPlatformMsg({ type: 'success', text: `${json.data?.profile?.displayName || username} connected with ${json.data?.profile?.followersCount?.toLocaleString() ?? 0} followers!` });
        setConnectingPlatform(null);
        setUsernameInputs((prev) => ({ ...prev, [platformId]: '' }));
        startTransition(() => router.refresh());
      }
    } catch {
      setPlatformMsg({ type: 'error', text: 'Network error. Please try again.' });
    }
    setAddingPlatform(null);
  }

  async function handleDelete() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    const result = await deleteAccount();
    if (result.error) {
      alert(result.error);
    } else {
      window.location.href = '/signin';
    }
  }

  return (
    <>
      {avatarUploading && <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>}
      {/* Page heading */}
      <div style={{ marginBottom: 32 }}>
        {isEditorial && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.18em', marginBottom: 10, color: 'var(--muted)' }}>
            ACCOUNT · SETTINGS
          </div>
        )}
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: isEditorial ? 300 : 400,
            fontStyle: isEditorial ? 'italic' : 'normal',
            fontSize: isEditorial ? 'clamp(40px, 5vw, 60px)' : 'clamp(32px, 4vw, 48px)',
            lineHeight: 0.95,
            letterSpacing: '-.025em',
            color: isEditorial ? 'var(--ink)' : 'var(--fg)',
          }}
        >
          {isEditorial ? (
            <>Settings<span style={{ fontWeight: 900, fontStyle: 'normal' }}>.</span></>
          ) : (
            'Settings'
          )}
        </h1>
      </div>

      <div className="settings-layout" style={{ display: 'flex', gap: 24 }}>
        {/* Left rail - tabs */}
        <nav className="nav-scroll settings-tabs" style={{ width: 180, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              style={{
                padding: '10px 16px',
                fontSize: 13,
                whiteSpace: 'nowrap',
                fontWeight: activeTab === tab.id ? 600 : 400,
                textAlign: 'left',
                borderRadius: isNeumorphic ? 16 : 12,
                cursor: 'pointer',
                border: 'none',
                transition: 'all .15s',
                ...(activeTab === tab.id
                  ? isEditorial
                    ? { background: 'var(--ink)', color: '#fff' }
                    : isNeumorphic
                    ? { background: 'var(--surface, var(--bg))', color: 'var(--fg)', boxShadow: 'var(--in-sm)' }
                    : { background: 'rgba(255,255,255,.08)', color: 'var(--fg)' }
                  : isEditorial
                  ? { background: 'transparent', color: 'var(--muted)' }
                  : isNeumorphic
                  ? { background: 'var(--surface, var(--bg))', color: 'var(--muted)', boxShadow: 'var(--out-sm)' }
                  : { background: 'transparent', color: 'var(--muted)' }),
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Right panel */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Account */}
          {activeTab === 'account' && (
            <div style={cardStyle}>
              <h2 style={tabHeadingStyle}>Account{isEditorial ? '.' : ''}</h2>
              {/* Avatar upload */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      background: avatarPreview
                        ? 'transparent'
                        : isEditorial
                        ? 'var(--hot, #ff3e88)'
                        : isNeumorphic
                        ? 'var(--surface, var(--bg))'
                        : 'linear-gradient(135deg, var(--rose, #c084fc), var(--amber, #f59e0b))',
                      border: isEditorial ? '1.5px solid var(--ink)' : isNeumorphic ? 'none' : '2px solid rgba(255,255,255,.15)',
                      boxShadow: isNeumorphic ? 'var(--out-sm)' : 'none',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 28,
                      fontWeight: 700,
                      color: '#fff',
                    }}
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      (profile?.display_name ?? '?').charAt(0).toUpperCase()
                    )}
                  </div>
                  {avatarUploading && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,.5)',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{ animation: 'spin .8s linear infinite' }}>
                        <path d="M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0 1 14.8-3.4L23 10M1 14l4.7 4.4A9 9 0 0 0 20.5 15" />
                      </svg>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <label
                    htmlFor="avatar-input"
                    style={{
                      display: 'inline-block',
                      padding: '8px 18px',
                      fontSize: 13,
                      fontWeight: 600,
                      borderRadius: isNeumorphic ? 12 : isEditorial ? 999 : 10,
                      cursor: 'pointer',
                      transition: 'all .15s',
                      ...(isEditorial
                        ? { background: 'transparent', border: '1.5px solid var(--ink)', color: 'var(--ink)' }
                        : isNeumorphic
                        ? { background: 'var(--surface, var(--bg))', boxShadow: 'var(--out-sm)', border: 'none', color: 'var(--fg)' }
                        : { background: 'rgba(255,255,255,.08)', border: '1px solid var(--line)', color: 'var(--fg)' }),
                    }}
                  >
                    {avatarPreview ? 'Change photo' : 'Upload photo'}
                  </label>
                  <input
                    id="avatar-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleAvatarChange}
                    style={{ display: 'none' }}
                  />
                  <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                    JPG, PNG, WebP, or GIF. Max 5 MB.
                  </p>
                  {avatarMsg && (
                    <p style={{ fontSize: 12, marginTop: 4, color: avatarMsg.includes('error') || avatarMsg.includes('Only') || avatarMsg.includes('must') ? 'var(--color-bad, #ef4444)' : 'var(--color-good, #22c55e)' }}>
                      {avatarMsg}
                    </p>
                  )}
                </div>
              </div>

              <form action={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                <div>
                  <label style={labelStyle}>Display name</label>
                  <Input name="display_name" defaultValue={profile?.display_name ?? ''} />
                </div>
                <div>
                  <label style={labelStyle}>Handle</label>
                  <Input name="handle" defaultValue={profile?.handle ?? ''} />
                  <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>Used for your public media kit URL</p>
                </div>
                <div>
                  <label style={labelStyle}>Bio</label>
                  <textarea
                    name="bio"
                    rows={3}
                    defaultValue={profile?.bio ?? ''}
                    style={{
                      width: '100%',
                      borderRadius: 14,
                      padding: '12px 16px',
                      font: 'inherit',
                      fontSize: 14,
                      color: 'var(--fg)',
                      background: 'var(--input-bg)',
                      border: '1px solid var(--input-border)',
                      boxShadow: 'var(--input-shadow, none)',
                      resize: 'none',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Timezone</label>
                  <ThemedSelect
                    name="timezone"
                    value={timezone}
                    onChange={setTimezone}
                    theme={activeTheme}
                    options={[
                      { group: 'Americas', options: [
                        'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
                        'America/Anchorage', 'Pacific/Honolulu', 'America/Phoenix',
                        'America/Toronto', 'America/Vancouver', 'America/Mexico_City',
                        'America/Bogota', 'America/Lima', 'America/Sao_Paulo', 'America/Argentina/Buenos_Aires',
                      ].map((tz) => ({ value: tz, label: tz.replace(/_/g, ' ') })) },
                      { group: 'Europe', options: [
                        'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid',
                        'Europe/Rome', 'Europe/Amsterdam', 'Europe/Stockholm', 'Europe/Moscow',
                        'Europe/Istanbul', 'Europe/Athens', 'Europe/Warsaw', 'Europe/Lisbon',
                      ].map((tz) => ({ value: tz, label: tz.replace(/_/g, ' ') })) },
                      { group: 'Asia & Pacific', options: [
                        'Asia/Dubai', 'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Singapore',
                        'Asia/Hong_Kong', 'Asia/Shanghai', 'Asia/Tokyo', 'Asia/Seoul',
                        'Asia/Jakarta', 'Asia/Manila', 'Australia/Sydney', 'Australia/Melbourne',
                        'Pacific/Auckland', 'Pacific/Fiji',
                      ].map((tz) => ({ value: tz, label: tz.replace(/_/g, ' ') })) },
                      { group: 'Africa & Middle East', options: [
                        'Africa/Cairo', 'Africa/Lagos', 'Africa/Johannesburg', 'Africa/Nairobi',
                        'Africa/Casablanca', 'Asia/Riyadh', 'Asia/Tehran',
                      ].map((tz) => ({ value: tz, label: tz.replace(/_/g, ' ') })) },
                    ]}
                  />
                </div>

                {/* Theme switcher */}
                <div>
                  <label style={labelStyle}>Theme</label>
                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    {[
                      { id: 'glassmorphic', label: 'Glassmorphic', desc: 'Dark aurora, frosted glass' },
                      { id: 'neon-editorial', label: 'Neon Editorial', desc: 'Cream paper, ink borders' },
                      { id: 'neumorphic', label: 'Neumorphic', desc: 'Soft gray, embossed' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleThemeChange(t.id)}
                        style={{
                          flex: 1,
                          padding: '14px 16px',
                          borderRadius: isNeumorphic ? 20 : 16,
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all .2s',
                          ...(activeTheme === t.id
                            ? isEditorial
                              ? { border: '2px solid var(--ink)', background: 'var(--paper-2, rgba(0,0,0,.03))' }
                              : isNeumorphic
                              ? { border: 'none', background: 'var(--surface, var(--bg))', boxShadow: 'var(--in-sm)' }
                              : { border: '2px solid var(--color-primary)', background: 'rgba(139,92,246,.1)' }
                            : isEditorial
                            ? { border: '1px solid var(--rule, rgba(0,0,0,.15))', background: 'transparent' }
                            : isNeumorphic
                            ? { border: 'none', background: 'var(--surface, var(--bg))', boxShadow: 'var(--out-sm)' }
                            : { border: '1px solid var(--line)', background: 'transparent' }),
                        }}
                      >
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>
                          {t.label}
                        </span>
                        <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)' }}>
                          {t.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                  <button type="submit" disabled={saving} style={{ ...btnPrimary, ...(saving ? { opacity: 0.6 } : {}) }}>
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                  {saveMsg && (
                    <span style={{ fontSize: 13, color: saveMsg === 'Saved' ? 'var(--color-good)' : 'var(--color-bad)' }}>
                      {saveMsg}
                    </span>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* Connected Platforms */}
          {activeTab === 'platforms' && (
            <div style={cardStyle}>
              <h2 style={tabHeadingStyle}>Connected Platforms{isEditorial ? '.' : ''}</h2>

              {/* Error / success banner */}
              {platformMsg && (
                <div
                  style={{
                    padding: '10px 16px',
                    borderRadius: 12,
                    marginBottom: 16,
                    fontSize: 13,
                    ...(platformMsg.type === 'error'
                      ? {
                          background: isNeumorphic ? 'var(--surface, var(--bg))' : 'rgba(239,68,68,.12)',
                          color: 'var(--color-bad, #ef4444)',
                          border: isEditorial ? '1px solid var(--hot, #ff5c3a)' : 'none',
                          boxShadow: isNeumorphic ? 'var(--in-sm)' : 'none',
                        }
                      : {
                          background: isNeumorphic ? 'var(--surface, var(--bg))' : 'rgba(34,197,94,.12)',
                          color: 'var(--color-good, #22c55e)',
                          border: isEditorial ? '1px solid var(--color-good, #22c55e)' : 'none',
                          boxShadow: isNeumorphic ? 'var(--in-sm)' : 'none',
                        }),
                  }}
                >
                  {platformMsg.text}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {([
                  { id: 'instagram', label: 'Instagram', placeholder: 'username or URL', color: '#E4405F',
                    icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg> },
                  { id: 'tiktok', label: 'TikTok', placeholder: '@username or URL', color: '#000000',
                    icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.41a8.16 8.16 0 004.77 1.52V7.48a4.85 4.85 0 01-1-.79z"/></svg> },
                  { id: 'youtube', label: 'YouTube', placeholder: '@channel or URL', color: '#FF0000',
                    icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> },
                  { id: 'linkedin', label: 'LinkedIn', placeholder: 'profile slug or URL', color: '#0A66C2',
                    icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
                  { id: 'x', label: 'X', placeholder: '@handle or URL', color: '#000000',
                    icon: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
                  { id: 'facebook', label: 'Facebook', placeholder: 'page name or URL', color: '#1877F2',
                    icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
                  { id: 'twitch', label: 'Twitch', placeholder: 'channel name or URL', color: '#9146FF',
                    icon: <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg> },
                ]).map(({ id: platformId, label, placeholder, color, icon }) => {
                  const connected = platforms.find((p) => p.platform === platformId);
                  const isAdding = addingPlatform === platformId;
                  const showInput = connectingPlatform === platformId;
                  return (
                    <div
                      key={platformId}
                      style={{
                        ...innerItemStyle,
                        display: 'flex',
                        flexDirection: showInput && !connected ? 'column' : 'row',
                        alignItems: showInput && !connected ? 'stretch' : 'center',
                        justifyContent: 'space-between',
                        gap: showInput && !connected ? 10 : 0,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ color: isEditorial ? 'var(--ink)' : color, display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>
                          {connected && (
                            <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                              @{connected.platform_username ?? platformId} · <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>{connected.follower_count?.toLocaleString() ?? 0}</span> followers
                            </span>
                          )}
                        </div>
                        {connected ? (
                          <span
                            style={{
                              height: 32, padding: '0 14px', borderRadius: 10,
                              fontSize: 13, fontWeight: 500,
                              display: 'inline-flex', alignItems: 'center',
                              ...(isEditorial
                                ? { background: 'var(--ink)', color: 'var(--bg)' }
                                : isNeumorphic
                                ? { background: 'var(--surface, var(--bg))', color: 'var(--color-good, #22c55e)', boxShadow: 'var(--out-sm)' }
                                : connected.sync_status === 'healthy'
                                ? { background: 'rgba(34,197,94,.12)', color: 'var(--color-good, #22c55e)' }
                                : { background: 'rgba(245,158,11,.12)', color: 'var(--color-warn, #f59e0b)' }),
                            }}
                          >
                            {connected.sync_status === 'healthy' ? 'Connected' : connected.sync_status}
                          </span>
                        ) : !showInput ? (
                          <button
                            onClick={() => { setConnectingPlatform(platformId); setPlatformMsg(null); }}
                            style={{
                              height: 32, padding: '0 14px', borderRadius: 10, border: 'none',
                              fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all .15s',
                              ...(isEditorial
                                ? { background: 'var(--ink)', color: 'var(--bg)' }
                                : isNeumorphic
                                ? { background: 'var(--surface, var(--bg))', color: 'var(--fg)', boxShadow: 'var(--out-sm)' }
                                : { background: 'rgba(255,255,255,.1)', color: 'var(--fg)' }),
                            }}
                          >
                            Connect
                          </button>
                        ) : (
                          <button
                            onClick={() => setConnectingPlatform(null)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--muted)' }}
                          >
                            Cancel
                          </button>
                        )}
                      </div>

                      {/* Username input row */}
                      {showInput && !connected && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input
                            type="text"
                            placeholder={placeholder}
                            value={usernameInputs[platformId] || ''}
                            onChange={(e) => setUsernameInputs((prev) => ({ ...prev, [platformId]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && usernameInputs[platformId]?.trim()) {
                                e.preventDefault();
                                handleAddPlatform(platformId);
                              }
                            }}
                            disabled={isAdding}
                            autoFocus
                            style={{
                              flex: 1, height: 36, padding: '0 12px', borderRadius: 10,
                              fontSize: 13, color: 'var(--fg)',
                              background: 'var(--input-bg, rgba(255,255,255,.06))',
                              border: isEditorial ? '1px solid var(--ink)' : '1px solid var(--input-border, rgba(255,255,255,.12))',
                              boxShadow: isNeumorphic ? 'var(--in-sm)' : 'none',
                              outline: 'none',
                            }}
                          />
                          <button
                            disabled={isAdding || !usernameInputs[platformId]?.trim()}
                            onClick={() => handleAddPlatform(platformId)}
                            style={{
                              height: 36, padding: '0 16px', borderRadius: 10, border: 'none',
                              fontSize: 13, fontWeight: 600, cursor: isAdding ? 'wait' : 'pointer',
                              transition: 'all .15s', whiteSpace: 'nowrap',
                              opacity: isAdding || !usernameInputs[platformId]?.trim() ? 0.6 : 1,
                              ...(isEditorial
                                ? { background: 'var(--ink)', color: 'var(--bg)' }
                                : isNeumorphic
                                ? { background: 'var(--bg)', color: 'var(--color-primary)', boxShadow: 'var(--out-sm)' }
                                : { background: 'linear-gradient(135deg, #8b5cf6, #ff71a8)', color: '#fff' }),
                            }}
                          >
                            {isAdding ? 'Adding…' : 'Add'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Billing */}
          {activeTab === 'billing' && (
            <div style={cardStyle}>
              <h2 style={tabHeadingStyle}>Billing{isEditorial ? '.' : ''}</h2>

              {/* Current plan banner */}
              <div style={{ ...innerItemStyle, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>
                    {subscription ? `${subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)} Plan` : 'Free Plan'}
                  </p>
                  {subscription && (
                    <Badge variant="good">{subscription.status}</Badge>
                  )}
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {subscription
                    ? subscription.status === 'canceling'
                      ? `Access until ${subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'period end'}`
                      : `Renews ${subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'soon'}`
                    : '10 viral scores per month. Upgrade for unlimited.'}
                </p>
              </div>

              {billingError && (
                <div style={{
                  padding: '10px 16px', borderRadius: 12, marginBottom: 16, fontSize: 13,
                  background: isNeumorphic ? 'var(--surface, var(--bg))' : 'rgba(239,68,68,.12)',
                  color: 'var(--color-bad, #ef4444)',
                  boxShadow: isNeumorphic ? 'var(--in-sm)' : 'none',
                }}>
                  {billingError}
                </div>
              )}

              {/* Upgrade card */}
              {!subscription && upgradePlan && (
                <div style={{ ...innerItemStyle, padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>{upgradePlan.name} Plan</p>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: isEditorial ? 900 : 500, color: 'var(--fg)' }}>
                      ${(upgradePlan.price / 100).toFixed(0)}<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--muted)' }}>/mo</span>
                    </p>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {upgradePlan.features.map((f) => (
                      <li key={f} style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: 'var(--color-good, #22c55e)', fontSize: 14 }}>&#10003;</span> {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleUpgrade(upgradePlan.tier as 'creator' | 'pro' | 'agency')}
                    disabled={billingLoading}
                    style={{ ...btnPrimary, width: '100%', height: 44, fontSize: 15, opacity: billingLoading ? 0.6 : 1, cursor: billingLoading ? 'wait' : 'pointer' }}
                  >
                    {billingLoading ? 'Loading...' : `Upgrade to ${upgradePlan.name}`}
                  </button>
                </div>
              )}

              {/* Manage / Cancel subscription buttons for active subscribers */}
              {subscription && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    onClick={handleManageSubscription}
                    disabled={manageLoading}
                    style={{ ...btnSecondary, opacity: manageLoading ? 0.6 : 1, cursor: manageLoading ? 'wait' : 'pointer' }}
                  >
                    {manageLoading ? 'Loading...' : 'Manage subscription'}
                  </button>
                  {subscription.status !== 'canceling' ? (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      style={{
                        ...btnSecondary,
                        color: 'var(--color-bad, #ef4444)',
                      }}
                    >
                      Cancel subscription
                    </button>
                  ) : (
                    <span style={{ fontSize: 13, color: 'var(--color-warn, #f59e0b)', alignSelf: 'center' }}>
                      Cancels {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'at period end'}
                    </span>
                  )}
                </div>
              )}

            </div>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div style={cardStyle}>
              <h2 style={tabHeadingStyle}>Notifications{isEditorial ? '.' : ''}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {NOTIFICATION_KINDS.map((kind) => (
                  <label
                    key={kind.key}
                    style={{
                      ...innerItemStyle,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: 13, color: 'var(--fg)' }}>{kind.label}</span>
                    <input
                      type="checkbox"
                      checked={notifPrefs[kind.key]}
                      onChange={() => handleNotifToggle(kind.key)}
                      style={{ accentColor: 'var(--color-primary)', width: 18, height: 18 }}
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* API */}
          {activeTab === 'api' && (
            <div style={cardStyle}>
              <h2 style={tabHeadingStyle}>API & Automations{isEditorial ? '.' : ''}</h2>
              <div style={innerItemStyle}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>Personal API Key</p>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
                  API key and webhook configuration will be available on Pro plans.
                </p>
                <button style={btnPrimary} onClick={() => switchTab('billing')}>Upgrade to unlock</button>
              </div>
            </div>
          )}

          {/* Danger Zone */}
          {activeTab === 'danger' && (
            <div style={{
              ...cardStyle,
              ...(isEditorial
                ? { borderColor: 'var(--hot, #ff5c3a)' }
                : !isNeumorphic
                ? { borderColor: 'var(--color-bad, #ef4444)' }
                : {}),
            }}>
              <h2 style={{ ...tabHeadingStyle, color: 'var(--color-bad, #ef4444)' }}>
                Danger Zone{isEditorial ? '.' : ''}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{
                  ...innerItemStyle,
                  border: isEditorial ? '1px solid var(--hot, #ff5c3a)' : isNeumorphic ? 'none' : '1px solid rgba(239,68,68,.3)',
                }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>Export your data</p>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
                    Download all your data as a JSON file.
                  </p>
                  <button onClick={handleExport} style={btnSecondary}>Export</button>
                </div>
                <div style={{
                  ...innerItemStyle,
                  border: isEditorial ? '1px solid var(--hot, #ff5c3a)' : isNeumorphic ? 'none' : '1px solid rgba(239,68,68,.3)',
                }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>Delete account</p>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
                    Permanently delete your account and all data. This cannot be undone.
                  </p>
                  <button
                    onClick={handleDelete}
                    style={{
                      ...btnSecondary,
                      ...(isEditorial
                        ? { background: 'var(--hot, #ff5c3a)', color: '#fff', border: 'none' }
                        : isNeumorphic
                        ? { color: 'var(--color-bad)' }
                        : { background: 'rgba(239,68,68,.15)', color: 'var(--color-bad)' }),
                    }}
                  >
                    {deleteConfirm ? 'Are you sure? Click again to confirm' : 'Delete my account'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Inline payment modal */}
      {paymentModal && (
        <PaymentModal
          clientSecret={paymentModal.clientSecret}
          subscriptionId={paymentModal.subscriptionId}
          tier={paymentModal.tier}
          onSuccess={() => handlePaymentSuccess(paymentModal.subscriptionId)}
          onClose={() => setPaymentModal(null)}
          isEditorial={isEditorial}
          isNeumorphic={isNeumorphic}
        />
      )}

      {/* Cancel confirmation modal */}
      {showCancelModal && (
        <ModalOverlay onClose={() => !cancelLoading && setShowCancelModal(false)} isEditorial={isEditorial} isNeumorphic={isNeumorphic}>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: isEditorial ? 900 : 500,
              fontStyle: isEditorial ? 'italic' : 'normal',
              fontSize: 22,
              color: isEditorial ? 'var(--ink)' : 'var(--fg)',
              marginBottom: 8,
            }}
          >
            Cancel subscription?
          </h3>
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 8 }}>
            You&apos;ll keep access to all Pro features until the end of your current billing period
            {subscription?.current_period_end
              ? ` (${new Date(subscription.current_period_end).toLocaleDateString()})`
              : ''}.
          </p>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
            You can resubscribe anytime.
          </p>

          {billingError && (
            <div style={{
              padding: '10px 14px', borderRadius: 10, marginBottom: 14, fontSize: 13,
              background: isNeumorphic ? 'var(--surface, var(--bg))' : 'rgba(239,68,68,.12)',
              color: 'var(--color-bad, #ef4444)',
              boxShadow: isNeumorphic ? 'var(--in-sm)' : 'none',
            }}>
              {billingError}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setShowCancelModal(false)}
              disabled={cancelLoading}
              style={{ ...btnSecondary, flex: 1, height: 42 }}
            >
              Keep subscription
            </button>
            <button
              onClick={async () => {
                setCancelLoading(true);
                setBillingError('');
                const result = await cancelSubscription();
                if (result.error) {
                  setBillingError(result.error);
                } else {
                  setShowCancelModal(false);
                  startTransition(() => router.refresh());
                }
                setCancelLoading(false);
              }}
              disabled={cancelLoading}
              style={{
                ...btnPrimary,
                flex: 1,
                height: 42,
                background: 'var(--color-bad, #ef4444)',
                color: '#fff',
                opacity: cancelLoading ? 0.7 : 1,
                cursor: cancelLoading ? 'wait' : 'pointer',
              }}
            >
              {cancelLoading ? 'Canceling...' : 'Yes, cancel'}
            </button>
          </div>
        </ModalOverlay>
      )}

      {/* Manage subscription modal */}
      {manageModal && (
        <ModalOverlay onClose={() => setManageModal(null)} isEditorial={isEditorial} isNeumorphic={isNeumorphic} wide>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: isEditorial ? 900 : 500,
              fontStyle: isEditorial ? 'italic' : 'normal',
              fontSize: 22,
              color: isEditorial ? 'var(--ink)' : 'var(--fg)',
              marginBottom: 24,
            }}
          >
            Manage subscription{isEditorial ? '.' : ''}
          </h3>

          {/* Plan info */}
          <div style={{ ...innerItemStyle, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 4 }}>Current plan</p>
                <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--fg)' }}>
                  {manageModal.tier.charAt(0).toUpperCase() + manageModal.tier.slice(1)}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 22, fontWeight: 600, color: 'var(--fg)' }}>
                  ${((manageModal.amountCents || 0) / 100).toFixed(0)}<span style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted)' }}>/{manageModal.interval || 'mo'}</span>
                </p>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {manageModal.status === 'canceling'
                    ? `Cancels ${manageModal.currentPeriodEnd ? new Date(manageModal.currentPeriodEnd).toLocaleDateString() : 'soon'}`
                    : `Renews ${manageModal.currentPeriodEnd ? new Date(manageModal.currentPeriodEnd).toLocaleDateString() : 'soon'}`}
                </p>
              </div>
            </div>
          </div>

          {/* Payment method */}
          <div style={{ ...innerItemStyle, marginBottom: 16 }}>
            <p style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>Payment method</p>
            {manageModal.paymentMethod ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  background: isEditorial ? 'var(--ink)' : isNeumorphic ? 'var(--bg)' : 'rgba(255,255,255,.1)',
                  color: isEditorial ? 'var(--paper)' : 'var(--fg)',
                  boxShadow: isNeumorphic ? 'var(--out-sm)' : 'none',
                }}>
                  {manageModal.paymentMethod.brand}
                </span>
                <span style={{ fontSize: 14, color: 'var(--fg)' }}>
                  &bull;&bull;&bull;&bull; {manageModal.paymentMethod.last4}
                </span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Exp {manageModal.paymentMethod.expMonth.toString().padStart(2, '0')}/{manageModal.paymentMethod.expYear}
                </span>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>No payment method on file</p>
            )}
          </div>

          {/* Invoice history */}
          <div style={{ ...innerItemStyle }}>
            <p style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 12 }}>Invoice history</p>
            {manageModal.invoices.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>No invoices yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {manageModal.invoices.map((inv) => (
                  <div key={inv.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', borderRadius: 8,
                    background: isEditorial ? 'var(--paper)' : isNeumorphic ? 'var(--bg)' : 'rgba(255,255,255,.03)',
                  }}>
                    <span style={{ fontSize: 13, color: 'var(--fg)' }}>
                      {inv.date ? new Date(inv.date).toLocaleDateString() : '—'}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>
                      ${(inv.amount / 100).toFixed(2)}
                    </span>
                    <Badge variant={inv.status === 'paid' ? 'good' : 'default'}>
                      {inv.status}
                    </Badge>
                    {inv.pdfUrl && (
                      <a
                        href={inv.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 12, color: 'var(--color-primary)', textDecoration: 'none' }}
                      >
                        PDF
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setManageModal(null)}
            style={{ ...btnSecondary, width: '100%', height: 42, marginTop: 20 }}
          >
            Close
          </button>
        </ModalOverlay>
      )}
    </>
  );
}

/* ── Inline Payment Modal ── */

const TIER_PRICES: Record<string, number> = { creator: 29 };

function ModalOverlay({
  children,
  onClose,
  isEditorial,
  isNeumorphic,
  wide,
}: {
  children: React.ReactNode;
  onClose: () => void;
  isEditorial: boolean;
  isNeumorphic: boolean;
  wide?: boolean;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,.55)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: wide ? 520 : 440,
          borderRadius: isNeumorphic ? 24 : 20,
          padding: 32,
          position: 'relative',
          ...(isEditorial
            ? { background: 'var(--paper, #f3efe6)', border: '2px solid var(--ink, #1a1a1a)' }
            : isNeumorphic
            ? { background: 'var(--surface, #e0e5ec)', boxShadow: 'var(--out-lg, 12px 12px 24px #b8bec7, -12px -12px 24px #fff)' }
            : { background: 'var(--glass-bg, #1a1128)', border: '1px solid rgba(255,255,255,.12)', boxShadow: '0 30px 80px -20px rgba(0,0,0,.6)' }),
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'none',
            border: 'none',
            fontSize: 20,
            cursor: 'pointer',
            color: 'var(--muted)',
            lineHeight: 1,
          }}
        >
          &#10005;
        </button>
        {children}
      </div>
    </div>
  );
}

function PaymentModal({
  clientSecret,
  subscriptionId,
  tier,
  onSuccess,
  onClose,
  isEditorial,
  isNeumorphic,
}: {
  clientSecret: string;
  subscriptionId: string;
  tier: string;
  onSuccess: () => void;
  onClose: () => void;
  isEditorial: boolean;
  isNeumorphic: boolean;
}) {
  const stripePromise = getStripePromise();
  if (!stripePromise) return null;

  const appearance: import('@stripe/stripe-js').Appearance = {
    theme: isEditorial ? 'stripe' : 'night',
    variables: {
      colorPrimary: isEditorial ? '#1a1a1a' : isNeumorphic ? '#6b7fa8' : '#8b5cf6',
      colorBackground: isEditorial ? '#f3efe6' : isNeumorphic ? '#e0e5ec' : '#1a1128',
      colorText: isEditorial ? '#1a1a1a' : isNeumorphic ? '#333' : '#f1f1f1',
      borderRadius: isNeumorphic ? '16px' : '12px',
      fontFamily: 'inherit',
    },
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,.55)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          borderRadius: isNeumorphic ? 24 : 20,
          padding: 32,
          position: 'relative',
          ...(isEditorial
            ? { background: 'var(--paper, #f3efe6)', border: '2px solid var(--ink, #1a1a1a)' }
            : isNeumorphic
            ? { background: 'var(--surface, #e0e5ec)', boxShadow: 'var(--out-lg, 12px 12px 24px #b8bec7, -12px -12px 24px #fff)' }
            : { background: 'var(--glass-bg, #1a1128)', border: '1px solid rgba(255,255,255,.12)', boxShadow: '0 30px 80px -20px rgba(0,0,0,.6)' }),
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'none',
            border: 'none',
            fontSize: 20,
            cursor: 'pointer',
            color: 'var(--muted)',
            lineHeight: 1,
          }}
        >
          &#10005;
        </button>

        {/* Header */}
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: isEditorial ? 900 : 500,
            fontStyle: isEditorial ? 'italic' : 'normal',
            fontSize: 22,
            color: isEditorial ? 'var(--ink)' : 'var(--fg)',
            marginBottom: 4,
          }}
        >
          Subscribe to Pro{isEditorial ? '.' : ''}
        </h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
          $29/month &middot; Cancel anytime
        </p>

        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance,
          }}
        >
          <PaymentForm
            subscriptionId={subscriptionId}
            onSuccess={onSuccess}
            isEditorial={isEditorial}
            isNeumorphic={isNeumorphic}
          />
        </Elements>
      </div>
    </div>
  );
}

function PaymentForm({
  subscriptionId,
  onSuccess,
  isEditorial,
  isNeumorphic,
}: {
  subscriptionId: string;
  onSuccess: () => void;
  isEditorial: boolean;
  isNeumorphic: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError('');

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message ?? 'Payment failed. Please try again.');
      setLoading(false);
      return;
    }

    // Payment succeeded — activate in DB
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement
        options={{
          layout: 'tabs',
        }}
      />

      {error && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 10,
          marginTop: 14,
          fontSize: 13,
          background: isNeumorphic ? 'var(--surface, var(--bg))' : 'rgba(239,68,68,.12)',
          color: 'var(--color-bad, #ef4444)',
          boxShadow: isNeumorphic ? 'var(--in-sm)' : 'none',
        }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        style={{
          marginTop: 20,
          width: '100%',
          height: 44,
          borderRadius: isNeumorphic ? 16 : 12,
          border: 'none',
          fontSize: 15,
          fontWeight: 600,
          cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.7 : 1,
          transition: 'all .15s',
          ...(isEditorial
            ? { background: 'var(--ink)', color: 'var(--bg)' }
            : isNeumorphic
            ? { background: 'var(--accent, var(--color-primary))', color: '#fff', boxShadow: 'var(--out-sm)' }
            : { background: 'linear-gradient(135deg, #8b5cf6, #ff71a8)', color: '#fff' }),
        }}
      >
        {loading ? 'Processing...' : 'Subscribe'}
      </button>

      <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 12 }}>
        Secured by Stripe. Your card details never touch our servers.
      </p>
    </form>
  );
}
