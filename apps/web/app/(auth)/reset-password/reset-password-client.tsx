'use client';

import { useState } from 'react';
import Link from 'next/link';
import { resetPassword } from '@/lib/actions/auth';

export default function ResetPasswordClient() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError('');
    setSuccess('');
    const result = await resetPassword(formData);
    if (result?.error) {
      setError(result.error);
    } else if (result?.success) {
      setSuccess(result.message ?? 'Check your email for a reset link.');
    }
    setLoading(false);
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
          ACCOUNT RECOVERY
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
          Reset your{' '}
          <span style={{ fontWeight: 900, fontStyle: 'normal' }}>password.</span>
        </h1>
        <p
          style={{
            fontSize: 15,
            color: '#555',
            marginTop: 10,
            lineHeight: 1.5,
          }}
        >
          Enter your email and we&apos;ll send you a reset link.
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
            padding: '12px 16px',
            borderRadius: 10,
            background: 'rgba(0,180,100,.08)',
            border: '1px solid rgba(0,180,100,.2)',
            color: '#00a060',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {success}
        </div>
      )}

      {/* Form */}
      <form action={handleSubmit}>
        <div style={{ marginBottom: 24 }}>
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
          {loading ? 'Sending...' : 'Send reset link'}
        </button>
      </form>

      {/* Footer link */}
      <p
        style={{
          marginTop: 28,
          textAlign: 'center',
          fontSize: 14,
          color: '#555',
        }}
      >
        Remember your password?{' '}
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
