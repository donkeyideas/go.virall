"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp } from "@/lib/actions/auth";

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

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238A7AAE' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 14px center",
  paddingRight: 36,
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

const NICHES = [
  "Beauty & Fashion",
  "Fitness & Health",
  "Food & Cooking",
  "Gaming",
  "Travel & Lifestyle",
  "Tech & Gadgets",
  "Business & Finance",
  "Education",
  "Entertainment & Comedy",
  "Music & Art",
  "Parenting & Family",
  "Sports",
  "Other",
];

const GOALS = [
  "Grow my audience",
  "Increase engagement",
  "Monetize my content",
  "Land brand deals",
  "Build a personal brand",
  "Track competitors",
  "Just exploring",
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string } | undefined, formData: FormData) => {
      return await signUp(formData);
    },
    undefined,
  );

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 480,
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 20,
        padding: "40px 36px",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 8 }}>
          Create your account
        </h2>
        <p style={{ fontSize: 14, color: C.textSecondary }}>
          Start your free 14-day trial. No credit card required.
        </p>
      </div>

      {/* Social login buttons */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
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
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Sign up with Google
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
        <span style={{ fontSize: 12, color: C.textSecondary, fontWeight: 500 }}>or sign up with email</span>
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

        {/* Row: First + Last name */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>First Name</label>
            <input
              name="firstName"
              type="text"
              required
              placeholder="Taylor"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Last Name</label>
            <input
              name="lastName"
              type="text"
              required
              placeholder="Kim"
              style={inputStyle}
            />
          </div>
        </div>

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

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Password</label>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="At least 6 characters"
            style={inputStyle}
          />
        </div>

        {/* Row: Niche + Goal */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Content Niche</label>
            <select name="niche" style={selectStyle} defaultValue="">
              <option value="" disabled>Select niche</option>
              {NICHES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Primary Goal</label>
            <select name="goal" style={selectStyle} defaultValue="">
              <option value="" disabled>Select goal</option>
              {GOALS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>

        {/* City + State */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>City</label>
            <input
              name="city"
              type="text"
              placeholder="Los Angeles"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>State</label>
            <select name="state" style={selectStyle} defaultValue="">
              <option value="" disabled>Select state</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* How did you hear */}
        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>
            How did you hear about us?{" "}
            <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
          </label>
          <select name="referralSource" style={selectStyle} defaultValue="">
            <option value="" disabled>Select one</option>
            <option value="social_media">Social Media</option>
            <option value="search">Google Search</option>
            <option value="friend">Friend / Referral</option>
            <option value="youtube">YouTube</option>
            <option value="blog">Blog / Article</option>
            <option value="other">Other</option>
          </select>
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
          {isPending ? "Creating account..." : "Create Account"}
        </button>

        <p style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: C.textSecondary, lineHeight: 1.6 }}>
          By creating an account, you agree to our{" "}
          <a href="#" style={{ color: C.primary, textDecoration: "none" }}>Terms</a> and{" "}
          <a href="#" style={{ color: C.primary, textDecoration: "none" }}>Privacy Policy</a>.
        </p>
      </form>

      <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: C.textSecondary }}>
        Already have an account?{" "}
        <Link href="/login" style={{ color: C.primary, textDecoration: "none", fontWeight: 600 }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
