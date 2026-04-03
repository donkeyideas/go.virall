"use client";

import Link from "next/link";
import { useState, useActionState } from "react";
import { signIn } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";

const C = {
  bg: "#1A1035",
  card: "#2A1B54",
  cardElevated: "#33225E",
  primary: "#FFB84D",
  secondary: "#FFD280",
  purple: "#8B5CF6",
  text: "#F0ECF8",
  textSecondary: "#8A7AAE",
  border: "rgba(139,92,246,0.15)",
  inputBg: "#221548",
  error: "#EF4444",
};

const font = "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: C.inputBg,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: "14px 16px",
  fontSize: 14,
  color: C.text,
  outline: "none",
  fontFamily: font,
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: C.textSecondary,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 6,
};

export default function LoginPage() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string } | undefined, formData: FormData) => {
      return await signIn(formData);
    },
    undefined,
  );

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setGoogleLoading(false);
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 420,
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 20,
        padding: "40px 36px",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 8 }}>
          Welcome back
        </h2>
        <p style={{ fontSize: 14, color: C.textSecondary }}>
          Sign in to your dashboard
        </p>
      </div>

      {/* Social login buttons */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            background: C.inputBg,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "12px 16px",
            fontSize: 14,
            fontWeight: 600,
            color: C.text,
            cursor: googleLoading ? "not-allowed" : "pointer",
            opacity: googleLoading ? 0.6 : 1,
            fontFamily: font,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          {googleLoading ? "Redirecting..." : "Google"}
        </button>
        <button
          type="button"
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            background: C.inputBg,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "12px 16px",
            fontSize: 14,
            fontWeight: 600,
            color: C.text,
            cursor: "pointer",
            fontFamily: font,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-1.55 4.31-3.74 4.25z" />
          </svg>
          Apple
        </button>
      </div>

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div style={{ flex: 1, height: 1, background: C.border }} />
        <span style={{ fontSize: 12, color: C.textSecondary, fontWeight: 500 }}>or continue with email</span>
        <div style={{ flex: 1, height: 1, background: C.border }} />
      </div>

      <form action={formAction}>
        {state?.error && (
          <div
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: 13,
              color: C.error,
              marginBottom: 16,
            }}
          >
            {state.error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Email</label>
          <input
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Password</label>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="••••••••"
            style={inputStyle}
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          style={{
            width: "100%",
            background: C.primary,
            color: C.bg,
            border: "none",
            borderRadius: 10,
            padding: "14px 24px",
            fontSize: 15,
            fontWeight: 700,
            cursor: isPending ? "not-allowed" : "pointer",
            opacity: isPending ? 0.6 : 1,
            fontFamily: font,
          }}
        >
          {isPending ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: C.textSecondary }}>
        Don&apos;t have an account?{" "}
        <Link href="/signup" style={{ color: C.primary, textDecoration: "none", fontWeight: 600 }}>
          Sign up
        </Link>
      </p>
    </div>
  );
}
