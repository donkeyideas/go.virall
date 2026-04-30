'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Input, AccountPicker } from '@govirall/ui-web';
import { createPost, updatePost } from '@/lib/actions/posts';

const PLATFORM_TABS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'x', label: 'X' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'twitch', label: 'Twitch' },
];

const PLATFORM_FORMATS: Record<string, { label: string; id: string }[]> = {
  instagram: [
    { label: 'Reel', id: 'reel' },
    { label: 'Carousel', id: 'carousel' },
    { label: 'Story', id: 'story' },
    { label: 'Static', id: 'static' },
  ],
  tiktok: [
    { label: 'Short', id: 'short' },
    { label: 'Long video', id: 'long-video' },
    { label: 'Carousel', id: 'carousel' },
  ],
  youtube: [
    { label: 'Short', id: 'short' },
    { label: 'Long video', id: 'long-video' },
  ],
  linkedin: [
    { label: 'Static', id: 'static' },
    { label: 'Article', id: 'article' },
    { label: 'Carousel', id: 'carousel' },
  ],
  x: [
    { label: 'Static', id: 'static' },
    { label: 'Thread', id: 'thread' },
  ],
  facebook: [
    { label: 'Reel', id: 'reel' },
    { label: 'Story', id: 'story' },
    { label: 'Static', id: 'static' },
  ],
  twitch: [
    { label: 'Static', id: 'static' },
  ],
};

const CAPTION_LIMITS: Record<string, number> = {
  instagram: 2200,
  tiktok: 4000,
  youtube: 5000,
  linkedin: 3000,
  x: 280,
  facebook: 63206,
  twitch: 300,
};

type Signal = {
  key: string;
  label: string;
  value: number;
  status: 'good' | 'ok' | 'bad';
  tip: string;
};

type ScoreResult = {
  score: number;
  confidence: number;
  signals: Signal[];
  improvements: Array<{ label: string; delta: number; action: string }>;
};

type Draft = {
  id: string;
  platform: string;
  format: string;
  hook: string;
  caption: string;
  hashtags: string[];
  status: string;
};

type ConnectedPlatform = {
  id: string;
  platform: string;
  platform_username: string;
  follower_count: number | null;
};

type Props = {
  theme: string;
  draft?: Draft;
  mission?: string | null;
  connectedPlatforms?: ConnectedPlatform[];
};

export function ComposeClient({ theme, draft, mission, connectedPlatforms = [] }: Props) {
  const isEditorial = theme === 'neon-editorial';
  const isNeumorphic = theme === 'neumorphic';

  const [draftId, setDraftId] = useState<string | null>(draft?.id ?? null);
  const [platform, setPlatform] = useState(draft?.platform ?? 'instagram');
  const [format, setFormat] = useState(draft?.format ?? 'reel');
  const [hook, setHook] = useState(draft?.hook ?? '');
  const [caption, setCaption] = useState(draft?.caption ?? '');
  const [hashtags, setHashtags] = useState<string[]>(draft?.hashtags ?? []);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [scoring, setScoring] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Platform-specific formats and limits
  const formatChips = PLATFORM_FORMATS[platform] ?? PLATFORM_FORMATS.instagram;
  const captionLimit = CAPTION_LIMITS[platform] ?? 2200;
  const captionLen = (hook + ' ' + caption).trim().length;
  const charPct = Math.min(captionLen / captionLimit, 1);
  const charColor = charPct > 0.95 ? 'var(--color-bad, #ef4444)' : charPct > 0.8 ? 'var(--color-warn, #f59e0b)' : 'var(--color-good, #22c55e)';

  function handlePlatformChange(p: string) {
    setPlatform(p);
    // Reset format to first available for the new platform
    const formats = PLATFORM_FORMATS[p] ?? PLATFORM_FORMATS.instagram;
    if (!formats.some((f) => f.id === format)) {
      setFormat(formats[0]?.id ?? 'static');
    }
  }
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const cardStyle: React.CSSProperties = isEditorial
    ? { border: '1.5px solid var(--ink)', borderRadius: 20, background: 'var(--paper)', padding: 24 }
    : isNeumorphic
    ? { borderRadius: 24, background: 'var(--surface, var(--bg))', padding: 24, boxShadow: 'var(--out-md)' }
    : {
        background: 'var(--glass, rgba(255,255,255,.06))',
        backdropFilter: 'blur(24px) saturate(1.2)',
        border: 'none',
        borderRadius: 20,
        padding: 24,
        boxShadow: '0 20px 60px -20px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.08)',
      };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'transparent',
    color: 'var(--fg)',
    outline: 'none',
    resize: 'none',
    border: 'none',
    fontSize: 14,
    lineHeight: 1.7,
    fontFamily: 'inherit',
  };

  // Debounced scoring
  const triggerScore = useCallback(() => {
    if (!hook.trim()) {
      setScoreResult(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setScoring(true);
      try {
        const res = await fetch('/api/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform, format, hook, caption, hashtags }),
        });
        const json = await res.json();
        if (json.data) setScoreResult(json.data);
      } catch {
        // silently fail
      } finally {
        setScoring(false);
      }
    }, 400);
  }, [platform, format, hook, caption, hashtags]);

  useEffect(() => {
    triggerScore();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [triggerScore]);

  // Save draft with explicit values (avoids stale state after setState)
  async function saveDraft(h: string, c: string, p: string, f: string, ht: string[], showMsg = true) {
    const formData = new FormData();
    formData.set('hook', h);
    formData.set('caption', c);
    formData.set('platform', p);
    formData.set('format', f);
    formData.set('hashtags', ht.join(','));
    formData.set('status', 'draft');

    const result = draftId
      ? await updatePost(draftId, formData)
      : await createPost(formData);

    if (!result.error && !draftId && result.data?.id) {
      setDraftId(result.data.id);
    }
    if (showMsg) {
      setSaveMessage(result.error || 'Draft saved');
      setTimeout(() => setSaveMessage(''), 3000);
    }
    return result;
  }

  async function handleSaveDraft() {
    setSaving(true);
    setSaveMessage('');
    await saveDraft(hook, caption, platform, format, hashtags);
    setSaving(false);
  }

  async function handleSchedule() {
    if (!scheduleDate || !scheduleTime) return;
    if (!hook.trim()) {
      setSaveMessage('Write a hook before scheduling');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }
    setSaving(true);
    setSaveMessage('');
    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
    const formData = new FormData();
    formData.set('hook', hook);
    formData.set('caption', caption);
    formData.set('platform', platform);
    formData.set('format', format);
    formData.set('hashtags', hashtags.join(','));
    formData.set('status', 'scheduled');
    formData.set('scheduled_at', scheduledAt);

    const result = draftId
      ? await updatePost(draftId, formData)
      : await createPost(formData);

    if (!result.error && !draftId && result.data?.id) {
      setDraftId(result.data.id);
    }
    setSaveMessage(result.error || 'Post scheduled');
    setTimeout(() => setSaveMessage(''), 3000);
    if (!result.error) setShowSchedule(false);
    setSaving(false);
  }

  async function handlePublishNow() {
    if (!hook.trim()) {
      setSaveMessage('Write a hook before publishing');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }
    setSaving(true);
    setSaveMessage('');
    const formData = new FormData();
    formData.set('hook', hook);
    formData.set('caption', caption);
    formData.set('platform', platform);
    formData.set('format', format);
    formData.set('hashtags', hashtags.join(','));
    formData.set('status', 'published');
    formData.set('scheduled_at', new Date().toISOString());

    const result = draftId
      ? await updatePost(draftId, formData)
      : await createPost(formData);

    if (!result.error && !draftId && result.data?.id) {
      setDraftId(result.data.id);
    }
    setSaveMessage(result.error || 'Post published');
    setTimeout(() => setSaveMessage(''), 3000);
    setSaving(false);
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenError('');
    try {
      // Find the connected account — prefer explicit selection, fall back to platform match
      const account = selectedAccountId
        ? connectedPlatforms.find((a) => a.id === selectedAccountId)
        : connectedPlatforms.find((a) => a.platform === platform);
      const topic = hook.trim() || caption.trim() || (mission ? `content about ${mission}` : `trending ${platform} content`);
      const res = await fetch('/api/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          contentType: 'captions',
          topic,
          tone: 'engaging',
          count: 1,
          platformAccountId: account?.id ?? undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setGenError(json.error?.message || json.error || `Error ${res.status}`);
      } else {
        const captions = json.data?.data?.captions;
        if (captions && captions.length > 0) {
          const generated = captions[0];
          // Extract first sentence as hook, rest as caption
          const fullText: string = generated.text || '';
          const sentences = fullText.split(/(?<=[.!?])\s+/);
          let newHook: string;
          let newCaption: string;
          if (sentences.length > 1) {
            newHook = sentences[0];
            newCaption = sentences.slice(1).join(' ');
          } else {
            newHook = fullText.slice(0, 80);
            newCaption = fullText;
          }
          const tags: string[] = generated.hashtags || [];
          const newHashtags = tags.map((t: string) => t.replace(/^#/, ''));

          setHook(newHook);
          setCaption(newCaption);
          setHashtags(newHashtags);

          // Auto-save generated content so it persists
          await saveDraft(newHook, newCaption, platform, format, newHashtags, false);
        }
      }
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'Network error');
    }
    setGenerating(false);
  }

  const score = scoreResult?.score ?? null;
  const signals = scoreResult?.signals ?? [];
  const improvements = scoreResult?.improvements ?? [];

  const statusColor = (status: string) => {
    if (status === 'good') return 'var(--color-good, #22c55e)';
    if (status === 'ok') return 'var(--color-warn, #f59e0b)';
    return 'var(--color-bad, #ef4444)';
  };

  const circumference = 2 * Math.PI * 50;
  const dashOffset = score !== null ? circumference - (circumference * score) / 100 : circumference;

  return (
    <>
      {/* Page heading */}
      <div style={{ marginBottom: 32 }}>
        {isEditorial && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.18em', marginBottom: 10, color: 'var(--muted)' }}>
            WORKSPACE · COMPOSE
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
            <>Compose <span style={{ fontWeight: 900, fontStyle: 'normal' }}>& Score.</span></>
          ) : (
            'Compose & Score'
          )}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 10, lineHeight: 1.5 }}>
          Write or generate platform-optimized content with live viral scoring. Pick your platform, choose a format, and let AI help you craft the perfect post.
        </p>
      </div>

      <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: isEditorial ? 18 : 20 }}>
        {/* Left panel: Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <AccountPicker
            accounts={connectedPlatforms}
            selectedAccountId={selectedAccountId}
            onSelect={(accountId, accountPlatform) => {
              setSelectedAccountId(accountId);
              if (accountPlatform) handlePlatformChange(accountPlatform);
            }}
            theme={theme}
            label="Posting as"
          />

          {/* Platform selector */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PLATFORM_TABS.map((p) => (
              <button
                key={p.id}
                onClick={() => handlePlatformChange(p.id)}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: platform === p.id ? 600 : 400,
                  borderRadius: isNeumorphic ? 16 : 12,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all .2s',
                  ...(platform === p.id
                    ? isEditorial
                      ? { background: 'var(--ink)', color: '#fff' }
                      : isNeumorphic
                      ? { background: 'var(--surface, var(--bg))', color: 'var(--fg)', boxShadow: 'var(--in-sm)' }
                      : { background: 'var(--color-primary)', color: '#fff' }
                    : isEditorial
                    ? { background: 'transparent', color: 'var(--muted)' }
                    : isNeumorphic
                    ? { background: 'var(--surface, var(--bg))', color: 'var(--muted)', boxShadow: 'var(--out-sm)' }
                    : { background: 'rgba(255,255,255,.04)', color: 'var(--muted)' }),
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Format chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {formatChips.map((f) => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                style={{
                  padding: '5px 14px',
                  fontSize: 12,
                  borderRadius: 999,
                  cursor: 'pointer',
                  transition: 'all .2s',
                  ...(format === f.id
                    ? isEditorial
                      ? { border: '1.5px solid var(--ink)', background: 'var(--paper)', color: 'var(--ink)', fontWeight: 600 }
                      : isNeumorphic
                      ? { border: '1px solid transparent', background: 'var(--surface, var(--bg))', color: 'var(--fg)', boxShadow: 'var(--in-sm)', fontWeight: 600 }
                      : { border: '1px solid var(--color-primary)', background: 'rgba(139,92,246,.12)', color: 'var(--color-primary)', fontWeight: 600 }
                    : isEditorial
                    ? { border: '1px solid var(--rule, rgba(0,0,0,.15))', background: 'transparent', color: 'var(--muted)' }
                    : isNeumorphic
                    ? { border: '1px solid transparent', background: 'var(--surface, var(--bg))', color: 'var(--muted)', boxShadow: 'var(--out-sm)' }
                    : { border: '1px solid var(--line)', background: 'transparent', color: 'var(--muted)' }),
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* AI Generate */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              width: '100%',
              height: 48,
              fontSize: 14,
              fontWeight: 600,
              borderRadius: isNeumorphic ? 16 : 14,
              border: 'none',
              cursor: generating ? 'wait' : 'pointer',
              transition: 'all .2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              opacity: generating ? 0.7 : 1,
              ...(isEditorial
                ? { background: 'var(--ink)', color: 'var(--bg)' }
                : isNeumorphic
                ? { background: 'var(--bg)', color: 'var(--color-primary)', boxShadow: 'var(--out-md)' }
                : { background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: '#fff', boxShadow: '0 4px 24px -4px rgba(139,92,246,.4)' }),
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={generating ? { animation: 'spin 1s linear infinite' } : undefined}
            >
              <path d="M12 3v3m0 12v3m9-9h-3M6 12H3m15.36-5.36l-2.12 2.12M8.76 15.24l-2.12 2.12m12.72 0l-2.12-2.12M8.76 8.76L6.64 6.64" />
            </svg>
            {generating ? 'Generating...' : 'Generate'}
            {generating && (
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            )}
          </button>
          {genError && (
            <div style={{
              padding: '10px 16px', borderRadius: 12, fontSize: 13,
              background: 'rgba(239,68,68,.12)', color: 'var(--color-bad, #ef4444)',
            }}>
              {genError}
            </div>
          )}

          {/* Hook field */}
          <div style={cardStyle}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase' as const, color: 'var(--muted)', marginBottom: 14 }}>
              Hook
            </label>
            <input
              type="text"
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              placeholder="Your opening line — make it count..."
              style={{
                ...inputStyle,
                fontFamily: 'var(--font-display)',
                fontSize: isEditorial ? 26 : 22,
                fontWeight: isEditorial ? 300 : 400,
                fontStyle: isEditorial ? 'italic' : 'normal',
              }}
            />
          </div>

          {/* Caption */}
          <div style={cardStyle}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase' as const, color: 'var(--muted)', marginBottom: 14 }}>
              Caption
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write your caption..."
              rows={6}
              style={inputStyle}
            />
            {/* Character count bar */}
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                flex: 1, height: 4, borderRadius: 2,
                background: isEditorial ? 'var(--rule, rgba(0,0,0,.1))' : 'rgba(255,255,255,.08)',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  width: `${charPct * 100}%`,
                  background: charColor,
                  transition: 'width .3s, background .3s',
                }} />
              </div>
              <span style={{
                fontSize: 11, fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums',
                color: charColor, whiteSpace: 'nowrap',
              }}>
                {captionLen.toLocaleString()} / {captionLimit.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Hashtag input */}
          <div style={cardStyle}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase' as const, color: 'var(--muted)', marginBottom: 14 }}>
              Hashtags
            </label>
            {hashtags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {hashtags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 12px',
                      fontSize: 12,
                      borderRadius: 999,
                      ...(isEditorial
                        ? { background: 'var(--ink)', color: '#fff' }
                        : isNeumorphic
                        ? { background: 'var(--surface, var(--bg))', color: 'var(--fg)', boxShadow: 'var(--in-sm)' }
                        : { background: 'rgba(139,92,246,.15)', color: 'var(--color-primary)' }),
                    }}
                  >
                    #{tag}
                    <button
                      onClick={() => setHashtags(hashtags.filter((t) => t !== tag))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.6, fontSize: 14, lineHeight: 1 }}
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            )}
            <Input
              placeholder="Type a hashtag and press Enter..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const value = (e.target as HTMLInputElement).value.trim().replace('#', '');
                  if (value && !hashtags.includes(value)) {
                    setHashtags([...hashtags, value]);
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {['creator', 'contentcreator', 'growthhacking', 'socialmedia', 'viral', 'trending']
                .filter((s) => !hashtags.includes(s))
                .map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setHashtags([...hashtags, suggestion])}
                    style={{
                      padding: '4px 12px',
                      fontSize: 12,
                      borderRadius: 999,
                      cursor: 'pointer',
                      transition: 'all .2s',
                      ...(isEditorial
                        ? { border: '1px dashed var(--rule, rgba(0,0,0,.2))', background: 'transparent', color: 'var(--muted)' }
                        : isNeumorphic
                        ? { border: '1px dashed var(--line)', background: 'transparent', color: 'var(--muted)' }
                        : { border: '1px dashed var(--line)', background: 'transparent', color: 'var(--muted)' }),
                    }}
                  >
                    #{suggestion}
                  </button>
                ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              style={{
                flex: 1,
                height: 44,
                fontSize: 14,
                fontWeight: 600,
                borderRadius: isNeumorphic ? 14 : 12,
                cursor: saving ? 'wait' : 'pointer',
                transition: 'all .15s',
                opacity: saving ? 0.6 : 1,
                ...(isEditorial
                  ? { border: '1.5px solid var(--ink)', background: 'transparent', color: 'var(--ink)' }
                  : isNeumorphic
                  ? { border: 'none', background: 'var(--surface, var(--bg))', color: 'var(--fg)', boxShadow: 'var(--out-sm)' }
                  : { border: '1px solid var(--line)', background: 'rgba(255,255,255,.06)', color: 'var(--fg)' }),
              }}
            >
              {saving ? 'Saving...' : 'Save draft'}
            </button>
            <button
              onClick={() => setShowSchedule(!showSchedule)}
              disabled={saving}
              style={{
                flex: 1,
                height: 44,
                fontSize: 14,
                fontWeight: 600,
                borderRadius: isNeumorphic ? 14 : 12,
                cursor: saving ? 'wait' : 'pointer',
                transition: 'all .15s',
                opacity: saving ? 0.6 : 1,
                ...(isEditorial
                  ? showSchedule
                    ? { border: '1.5px solid var(--ink)', background: 'var(--ink)', color: 'var(--bg)' }
                    : { border: '1.5px solid var(--ink)', background: 'transparent', color: 'var(--ink)' }
                  : isNeumorphic
                  ? showSchedule
                    ? { border: 'none', background: 'var(--bg)', color: 'var(--color-primary)', boxShadow: 'var(--in-sm)' }
                    : { border: 'none', background: 'var(--surface, var(--bg))', color: 'var(--fg)', boxShadow: 'var(--out-sm)' }
                  : showSchedule
                    ? { background: 'rgba(139,92,246,.15)', border: '1px solid var(--violet, #8b5cf6)', color: 'var(--fg)' }
                    : { border: 'none', background: 'linear-gradient(135deg, #8b5cf6, #ff71a8)', color: '#fff' }),
              }}
            >
              Schedule
            </button>
            {saveMessage && (
              <span style={{
                fontSize: 13, fontWeight: 500,
                color: saveMessage === 'Draft saved' || saveMessage === 'Post scheduled'
                  ? 'var(--color-good)' : 'var(--color-bad)',
              }}>
                {saveMessage}
              </span>
            )}
          </div>

          {/* Inline Schedule Panel */}
          {showSchedule && (
            <div style={{
              ...cardStyle,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              ...(isEditorial
                ? { borderStyle: 'dashed' }
                : isNeumorphic
                ? { boxShadow: 'var(--in-sm)' }
                : { border: '1px solid rgba(139,92,246,.25)' }),
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary, var(--fg))' }}>
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>Schedule post</span>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 140 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted, var(--fg))', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Date</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    style={{
                      height: 40,
                      padding: '0 12px',
                      fontSize: 14,
                      borderRadius: isNeumorphic ? 12 : 10,
                      color: 'var(--fg)',
                      fontFamily: 'inherit',
                      ...(isEditorial
                        ? { border: '1.5px solid var(--ink)', background: 'transparent' }
                        : isNeumorphic
                        ? { border: 'none', boxShadow: 'var(--in-sm)', background: 'var(--surface, var(--bg))' }
                        : { border: '1px solid var(--line)', background: 'rgba(255,255,255,.06)' }),
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 120 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted, var(--fg))', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Time</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    style={{
                      height: 40,
                      padding: '0 12px',
                      fontSize: 14,
                      borderRadius: isNeumorphic ? 12 : 10,
                      color: 'var(--fg)',
                      fontFamily: 'inherit',
                      ...(isEditorial
                        ? { border: '1.5px solid var(--ink)', background: 'transparent' }
                        : isNeumorphic
                        ? { border: 'none', boxShadow: 'var(--in-sm)', background: 'var(--surface, var(--bg))' }
                        : { border: '1px solid var(--line)', background: 'rgba(255,255,255,.06)' }),
                    }}
                  />
                </div>
              </div>
              {scheduleDate && scheduleTime && (
                <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
                  Scheduled for {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handleSchedule}
                  disabled={saving || !scheduleDate || !scheduleTime || !hook.trim()}
                  style={{
                    height: 38,
                    padding: '0 24px',
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: isNeumorphic ? 14 : 12,
                    border: 'none',
                    cursor: saving || !scheduleDate || !scheduleTime || !hook.trim() ? 'not-allowed' : 'pointer',
                    opacity: saving || !scheduleDate || !scheduleTime || !hook.trim() ? 0.45 : 1,
                    transition: 'all .15s',
                    ...(isEditorial
                      ? { background: 'var(--ink)', color: 'var(--bg)' }
                      : isNeumorphic
                      ? { background: 'var(--bg)', color: 'var(--color-primary)', boxShadow: 'var(--out-sm)' }
                      : { background: 'linear-gradient(135deg, #8b5cf6, #ff71a8)', color: '#fff' }),
                  }}
                >
                  {saving ? 'Scheduling...' : 'Confirm schedule'}
                </button>
                <button
                  onClick={() => setShowSchedule(false)}
                  style={{
                    height: 38,
                    padding: '0 16px',
                    fontSize: 13,
                    fontWeight: 500,
                    borderRadius: isNeumorphic ? 14 : 12,
                    cursor: 'pointer',
                    background: 'transparent',
                    color: 'var(--muted)',
                    border: 'none',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right panel: Viral Score Lab */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={cardStyle}>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: isEditorial ? 900 : 500,
                fontStyle: isEditorial ? 'italic' : 'normal',
                fontSize: isEditorial ? 26 : 20,
                color: isEditorial ? 'var(--ink)' : 'var(--fg)',
                marginBottom: 24,
              }}
            >
              Viral Score Lab{isEditorial ? '.' : ''}
            </h2>

            {/* Score ring */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
              {isNeumorphic ? (
                <NeumorphicViralGauge score={score} scoring={scoring} confidence={scoreResult?.confidence ?? 0} />
              ) : (
              <div style={{ position: 'relative', width: 140, height: 140, marginBottom: 8 }}>
                <svg viewBox="0 0 120 120" width="140" height="140">
                  <circle
                    cx="60" cy="60" r="50" fill="none"
                    stroke={isEditorial ? 'var(--rule, rgba(0,0,0,.1))' : 'var(--line, rgba(255,255,255,.1))'}
                    strokeWidth="8"
                  />
                  {score !== null && (
                    <circle
                      cx="60" cy="60" r="50" fill="none"
                      stroke={isEditorial ? 'var(--ink)' : 'url(#score-grad)'}
                      strokeWidth="8"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                      strokeLinecap="round"
                      transform="rotate(-90 60 60)"
                      style={{ transition: 'stroke-dashoffset .7s ease' }}
                    />
                  )}
                  <defs>
                    <linearGradient id="score-grad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="var(--violet, #8b5cf6)" />
                      <stop offset="100%" stopColor="var(--rose, #ff71a8)" />
                    </linearGradient>
                  </defs>
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: isEditorial ? 300 : 400,
                      fontStyle: isEditorial ? 'italic' : 'normal',
                      fontSize: 42,
                      letterSpacing: '-.04em',
                      color: 'var(--fg)',
                      lineHeight: 1,
                    }}
                  >
                    {scoring ? '...' : score ?? '--'}
                  </span>
                </div>
              </div>
              )}
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                {score === null
                  ? 'Start writing to see your score'
                  : `Confidence: ${Math.round((scoreResult?.confidence ?? 0) * 100)}%`}
              </p>
            </div>

            {/* Signal grid */}
            <div className="grid-form-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
              {(signals.length > 0
                ? signals
                : [
                    { key: 'hook', label: 'Hook Strength', value: 0, status: 'bad' as const, tip: '' },
                    { key: 'caption', label: 'Caption Quality', value: 0, status: 'bad' as const, tip: '' },
                    { key: 'format', label: 'Format Fit', value: 0, status: 'bad' as const, tip: '' },
                    { key: 'timing', label: 'Timing', value: 0, status: 'bad' as const, tip: '' },
                    { key: 'consistency', label: 'Consistency', value: 0, status: 'bad' as const, tip: '' },
                    { key: 'engagement', label: 'Engagement', value: 0, status: 'bad' as const, tip: '' },
                  ]
              ).map((signal) => (
                <div
                  key={signal.key}
                  title={signal.tip}
                  style={{
                    padding: '10px 12px',
                    borderRadius: isNeumorphic ? 16 : 12,
                    ...(isEditorial
                      ? { background: 'var(--paper-2, rgba(0,0,0,.03))' }
                      : isNeumorphic
                      ? { background: 'var(--surface, var(--bg))', boxShadow: 'var(--in-sm)' }
                      : { background: 'rgba(255,255,255,.04)' }),
                  }}
                >
                  <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{signal.label}</p>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      fontFamily: 'var(--font-display)',
                      fontVariantNumeric: 'tabular-nums',
                      color: signals.length > 0 ? statusColor(signal.status) : 'var(--muted)',
                    }}
                  >
                    {signals.length > 0 ? signal.value : '--'}
                  </p>
                </div>
              ))}
            </div>

            {/* Improvements */}
            <h3
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '.18em',
                textTransform: 'uppercase' as const,
                color: 'var(--muted)',
                marginBottom: 12,
              }}
            >
              Top Improvements
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {improvements.length > 0 ? (
                improvements.map((imp, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '12px 14px',
                      borderRadius: isNeumorphic ? 16 : 12,
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 12,
                      ...(isEditorial
                        ? { background: 'var(--paper-2, rgba(0,0,0,.03))' }
                        : isNeumorphic
                        ? { background: 'var(--surface, var(--bg))', boxShadow: 'var(--out-sm)' }
                        : { background: 'rgba(255,255,255,.04)' }),
                    }}
                  >
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{imp.label}</p>
                      <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{imp.action}</p>
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        fontFamily: 'var(--font-display)',
                        fontVariantNumeric: 'tabular-nums',
                        color: 'var(--color-good, #22c55e)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      +{imp.delta} pts
                    </span>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    padding: 20,
                    borderRadius: isNeumorphic ? 16 : 12,
                    textAlign: 'center',
                    ...(isEditorial
                      ? { background: 'var(--paper-2, rgba(0,0,0,.03))' }
                      : isNeumorphic
                      ? { background: 'var(--surface, var(--bg))', boxShadow: 'var(--in-sm)' }
                      : { background: 'rgba(255,255,255,.04)' }),
                  }}
                >
                  <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                    Write a hook and caption to get improvement suggestions
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function NeumorphicViralGauge({ score, scoring, confidence }: { score: number | null; scoring: boolean; confidence: number }) {
  const s = score ?? 0;
  const r = 55;
  const sweepAngle = 270;
  const startAngle = 135;
  const scoreAngle = (s / 100) * sweepAngle;
  const endAngle = startAngle + scoreAngle;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const startX = r * Math.cos(toRad(startAngle));
  const startY = r * Math.sin(toRad(startAngle));
  const endX = r * Math.cos(toRad(endAngle));
  const endY = r * Math.sin(toRad(endAngle));
  const largeArc = scoreAngle > 180 ? 1 : 0;

  return (
    <div
      style={{
        width: 140,
        height: 140,
        borderRadius: '50%',
        background: 'var(--surface, var(--bg))',
        boxShadow: 'var(--in-md, var(--in-sm))',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
      }}
    >
      <svg viewBox="-70 -70 140 140" style={{ width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id="viral-arc-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8098db" />
            <stop offset="100%" stopColor="#5a78d0" />
          </linearGradient>
        </defs>
        {score !== null && (
          <>
            <path
              d={`M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY}`}
              fill="none"
              stroke="url(#viral-arc-grad)"
              strokeWidth="6"
              strokeLinecap="round"
              opacity="0.95"
            />
            <circle cx={endX} cy={endY} r="5" fill="#5a78d0" />
            <circle cx={endX} cy={endY} r="2.5" fill="#eef2f7" />
          </>
        )}
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 18,
          borderRadius: '50%',
          background: 'var(--surface, var(--bg))',
          boxShadow: 'var(--out-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', fontWeight: 500, fontSize: 36, color: 'var(--ink, var(--fg))', letterSpacing: -1, lineHeight: 1 }}>
          {scoring ? '...' : score ?? '--'}
        </span>
      </div>
    </div>
  );
}
