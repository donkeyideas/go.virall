'use client';

import { useState } from 'react';
import { submitCustomPlanRequest } from '../../lib/actions/contact';

export function CustomPlanCard({ popular = false }: { popular?: boolean }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const result = await submitCustomPlanRequest({
      name: fd.get('name') as string,
      email: fd.get('email') as string,
      company: fd.get('company') as string,
      message: fd.get('message') as string,
    });

    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSent(true);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: popular ? '1px solid rgba(255,255,255,.3)' : '1px solid var(--ink)',
    borderRadius: 10,
    fontSize: 13,
    background: popular ? 'rgba(255,255,255,.08)' : 'transparent',
    color: 'inherit',
    outline: 'none',
    fontFamily: 'inherit',
  };

  return (
    <div
      style={{
        border: '1.5px solid var(--ink)',
        borderRadius: 20,
        padding: 28,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        background: popular ? 'var(--ink)' : 'var(--paper)',
        color: popular ? 'var(--paper)' : 'var(--ink)',
        position: 'relative',
        minHeight: 440,
        ...(popular ? { transform: 'translateY(-14px)' } : {}),
      }}
    >
      {popular && (
        <span
          style={{
            position: 'absolute',
            top: -11,
            left: 24,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            letterSpacing: '.15em',
            padding: '4px 10px',
            background: 'var(--lime)',
            color: 'var(--ink)',
            borderRadius: 999,
            fontWeight: 700,
          }}
        >
          ENTERPRISE
        </span>
      )}
      <div>
        <h5
          style={{
            fontFamily: "'Fraunces', serif",
            fontWeight: 900,
            fontSize: 32,
            letterSpacing: '-.02em',
          }}
        >
          Custom
        </h5>
        <div
          style={{
            fontFamily: "'Fraunces', serif",
            fontWeight: 900,
            fontStyle: 'italic',
            fontSize: 40,
            letterSpacing: '-.04em',
            lineHeight: 1,
            marginTop: 8,
          }}
        >
          Let&apos;s talk
        </div>
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.5, opacity: 0.8 }}>
        Tailored limits, dedicated support, and custom integrations for teams and agencies.
      </p>

      {sent ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '20px 0',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 900,
                fontSize: 24,
                marginBottom: 8,
              }}
            >
              Request sent
            </div>
            <p style={{ fontSize: 13, opacity: 0.7, lineHeight: 1.5 }}>
              We&apos;ll get back to you within 24 hours.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
          <input name="name" placeholder="Your name" required style={inputStyle} />
          <input name="email" type="email" placeholder="Email" required style={inputStyle} />
          <input name="company" placeholder="Company (optional)" style={inputStyle} />
          <textarea
            name="message"
            placeholder="Tell us about your needs..."
            required
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
          {error && (
            <p style={{ fontSize: 12, color: '#e55' }}>{error}</p>
          )}
          <div style={{ marginTop: 'auto' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                border: popular ? '1.5px solid var(--lime)' : '1.5px solid var(--ink)',
                borderRadius: 999,
                fontWeight: 600,
                fontSize: 13,
                background: popular ? 'var(--lime)' : 'transparent',
                color: popular ? 'var(--ink)' : 'var(--ink)',
                cursor: loading ? 'wait' : 'pointer',
                opacity: loading ? 0.6 : 1,
                fontFamily: 'inherit',
              }}
            >
              {loading ? 'Sending...' : 'Get in touch →'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
