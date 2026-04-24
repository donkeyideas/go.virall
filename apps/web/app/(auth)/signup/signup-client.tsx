'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signUp, signInWithOAuth } from '@/lib/actions/auth';

export default function SignUpClient() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError('');
    setSuccess('');
    const result = await signUp(formData);
    if (result?.error) {
      setError(result.error);
    } else if (result?.success) {
      setSuccess(result.message ?? 'Check your email to verify your account.');
    }
    setLoading(false);
  }

  async function handleOAuth(provider: 'google' | 'github') {
    const result = await signInWithOAuth(provider);
    if (result?.error) {
      setError(result.error);
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            letterSpacing: '.18em',
            marginBottom: 14,
            color: '#666',
          }}
        >
          NEW ACCOUNT
        </div>
        <h1
          style={{
            fontFamily: "'Fraunces', serif",
            fontWeight: 300,
            fontStyle: 'italic',
            fontSize: 'clamp(40px, 6vw, 56px)',
            lineHeight: 0.95,
            letterSpacing: '-.025em',
            color: 'var(--ink)',
          }}
        >
          Start{' '}
          <span style={{ fontWeight: 900, fontStyle: 'normal' }}>growing.</span>
        </h1>
        <p
          style={{
            fontSize: 15,
            color: '#555',
            marginTop: 10,
            lineHeight: 1.5,
          }}
        >
          Create your Go Virall account &mdash; free, no credit card
        </p>
      </div>

      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            borderRadius: 10,
            background: 'rgba(255,46,108,.08)',
            border: '1px solid rgba(255,46,108,.2)',
            color: 'var(--hot)',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            marginBottom: 16,
            padding: '16px',
            borderRadius: 10,
            background: 'var(--lime)',
            border: '1.5px solid var(--ink)',
            color: 'var(--ink)',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {success}
        </div>
      )}

      {/* Form */}
      <form action={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label
            htmlFor="displayName"
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '.06em',
              color: 'var(--ink)',
              marginBottom: 6,
            }}
          >
            Display name
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            placeholder="Your name"
            autoComplete="name"
            style={{
              width: '100%',
              padding: '14px 16px',
              border: '1.5px solid var(--ink)',
              borderRadius: 10,
              background: 'transparent',
              fontSize: 14,
              color: 'var(--ink)',
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label
            htmlFor="email"
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '.06em',
              color: 'var(--ink)',
              marginBottom: 6,
            }}
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            autoComplete="email"
            style={{
              width: '100%',
              padding: '14px 16px',
              border: '1.5px solid var(--ink)',
              borderRadius: 10,
              background: 'transparent',
              fontSize: 14,
              color: 'var(--ink)',
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label
            htmlFor="password"
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '.06em',
              color: 'var(--ink)',
              marginBottom: 6,
            }}
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Min. 8 characters"
            required
            minLength={8}
            autoComplete="new-password"
            style={{
              width: '100%',
              padding: '14px 16px',
              border: '1.5px solid var(--ink)',
              borderRadius: 10,
              background: 'transparent',
              fontSize: 14,
              color: 'var(--ink)',
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '16px 24px',
            border: '1.5px solid var(--ink)',
            borderRadius: 999,
            background: 'var(--ink)',
            color: 'var(--paper)',
            fontSize: 14,
            fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
            fontFamily: 'inherit',
            letterSpacing: '.02em',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Creating account...' : 'Create account \u2192'}
        </button>
      </form>

      {/* Divider */}
      <div
        style={{
          margin: '28px 0',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div style={{ flex: 1, height: 1, background: 'var(--ink)', opacity: 0.15 }} />
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            letterSpacing: '.18em',
            color: '#999',
          }}
        >
          OR
        </span>
        <div style={{ flex: 1, height: 1, background: 'var(--ink)', opacity: 0.15 }} />
      </div>

      {/* OAuth */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <button
          onClick={() => handleOAuth('google')}
          type="button"
          style={{
            padding: '14px 16px',
            border: '1.5px solid var(--ink)',
            borderRadius: 999,
            background: 'transparent',
            color: 'var(--ink)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Google
        </button>
        <button
          onClick={() => handleOAuth('github')}
          type="button"
          style={{
            padding: '14px 16px',
            border: '1.5px solid var(--ink)',
            borderRadius: 999,
            background: 'transparent',
            color: 'var(--ink)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          GitHub
        </button>
      </div>

      {/* Footer link */}
      <p
        style={{
          marginTop: 28,
          textAlign: 'center',
          fontSize: 14,
          color: '#555',
        }}
      >
        Already have an account?{' '}
        <Link
          href="/signin"
          style={{
            color: 'var(--ink)',
            fontWeight: 700,
            textDecoration: 'none',
            borderBottom: '1.5px solid var(--ink)',
            paddingBottom: 1,
          }}
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
