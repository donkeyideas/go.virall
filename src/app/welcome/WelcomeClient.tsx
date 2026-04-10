"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setAccountType } from "@/lib/actions/account";

const C = {
  bg: "#0B1928",
  card: "#112240",
  cardElevated: "#1A2F50",
  primary: "#FFB84D",
  secondary: "#FFD280",
  purple: "#4B9CD3",
  text: "#E8F0FA",
  textSecondary: "#8BACC8",
  border: "rgba(75,156,211,0.15)",
};

const font = "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

/* ------------------------------------------------------------------ */
/*  Reusable Card                                                      */
/* ------------------------------------------------------------------ */

function ViewCard({
  title,
  description,
  features,
  preview,
  onClick,
}: {
  title: string;
  description: string;
  features: string[];
  preview: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        minWidth: 280,
        maxWidth: 420,
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 20,
        padding: 0,
        cursor: "pointer",
        textAlign: "left",
        fontFamily: font,
        overflow: "hidden",
        transition: "transform 0.2s, border-color 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.borderColor = C.purple;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = "rgba(75,156,211,0.15)";
      }}
    >
      {/* Preview area */}
      <div
        style={{
          height: 200,
          background: C.cardElevated,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderBottom: `1px solid ${C.border}`,
          overflow: "hidden",
        }}
      >
        {preview}
      </div>

      {/* Content */}
      <div style={{ padding: "28px 28px 32px" }}>
        <h3
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: C.text,
            marginBottom: 8,
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontSize: 14,
            color: C.textSecondary,
            lineHeight: 1.6,
            marginBottom: 20,
          }}
        >
          {description}
        </p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {features.map((f) => (
            <li
              key={f}
              style={{
                fontSize: 13,
                color: C.textSecondary,
                padding: "5px 0",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ color: C.primary, fontSize: 14 }}>&#10003;</span>
              {f}
            </li>
          ))}
        </ul>

        <div
          style={{
            marginTop: 24,
            background: C.primary,
            color: C.bg,
            borderRadius: 10,
            padding: "12px 20px",
            fontSize: 14,
            fontWeight: 700,
            textAlign: "center",
          }}
        >
          Select {title}
        </div>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Account-type icons / previews                                      */
/* ------------------------------------------------------------------ */

function CreatorIcon() {
  return (
    <div
      style={{
        width: 120,
        height: 120,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {/* Central star */}
      <svg
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        stroke={C.primary}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
      {/* Sparkle top-right */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill={C.secondary}
        style={{ position: "absolute", top: 10, right: 10, opacity: 0.8 }}
      >
        <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41Z" />
      </svg>
      {/* Sparkle bottom-left */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill={C.purple}
        style={{ position: "absolute", bottom: 16, left: 14, opacity: 0.7 }}
      >
        <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41Z" />
      </svg>
    </div>
  );
}

function BrandIcon() {
  return (
    <div
      style={{
        width: 120,
        height: 120,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {/* Briefcase / building icon */}
      <svg
        width="64"
        height="64"
        viewBox="0 0 24 24"
        fill="none"
        stroke={C.primary}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        <line x1="12" y1="12" x2="12" y2="12.01" />
        <path d="M2 12h20" />
      </svg>
      {/* Accent circle top-right */}
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: C.purple,
          opacity: 0.6,
        }}
      />
      {/* Accent circle bottom-left */}
      <div
        style={{
          position: "absolute",
          bottom: 18,
          left: 16,
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: C.secondary,
          opacity: 0.5,
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  View-mode previews (Modern & Editorial)                            */
/* ------------------------------------------------------------------ */

function ModernPreview() {
  return (
    <div style={{ width: "85%", height: "80%", position: "relative" }}>
      {/* Top nav bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 10,
          padding: "6px 10px",
          background: "rgba(75,156,211,0.1)",
          borderRadius: 8,
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: 6,
            background: C.primary,
          }}
        />
        <div
          style={{
            width: 50,
            height: 6,
            borderRadius: 3,
            background: C.primary,
            opacity: 0.6,
          }}
        />
        <div style={{ flex: 1 }} />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: 30,
              height: 5,
              borderRadius: 3,
              background: "rgba(75,156,211,0.3)",
            }}
          />
        ))}
      </div>
      {/* Cards grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
        }}
      >
        {[C.purple, C.primary, "#34D399", "#F472B6"].map((color, i) => (
          <div
            key={i}
            style={{
              background: C.card,
              borderRadius: 10,
              padding: 10,
              border: `1px solid ${C.border}`,
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 6,
                background: color,
                opacity: 0.8,
                marginBottom: 6,
              }}
            />
            <div
              style={{
                width: "70%",
                height: 4,
                borderRadius: 2,
                background: "rgba(240,236,248,0.3)",
                marginBottom: 4,
              }}
            />
            <div
              style={{
                width: "50%",
                height: 4,
                borderRadius: 2,
                background: "rgba(240,236,248,0.15)",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function EditorialPreview() {
  return (
    <div
      style={{
        width: "85%",
        height: "80%",
        background: "#FDF6EC",
        borderRadius: 8,
        padding: 12,
        position: "relative",
      }}
    >
      {/* Masthead */}
      <div
        style={{
          textAlign: "center",
          borderBottom: "2px solid #1a1a1a",
          paddingBottom: 6,
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 14,
            fontWeight: 700,
            color: "#1a1a1a",
            letterSpacing: 2,
          }}
        >
          THE DAILY
        </div>
        <div style={{ fontSize: 7, color: "#666", marginTop: 2 }}>
          Vol. I &middot; Social Intelligence
        </div>
      </div>
      {/* Columns */}
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 9,
              fontWeight: 700,
              color: "#1a1a1a",
              marginBottom: 4,
            }}
          >
            BREAKING NEWS
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                width: `${80 - i * 8}%`,
                height: 3,
                borderRadius: 1,
                background: "#1a1a1a",
                opacity: 0.2 + i * 0.05,
                marginBottom: 3,
              }}
            />
          ))}
        </div>
        <div
          style={{
            width: 1,
            background: "#ddd",
          }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              width: "100%",
              height: 40,
              borderRadius: 4,
              background: "#E8D5B8",
              marginBottom: 6,
            }}
          />
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: `${90 - i * 10}%`,
                height: 3,
                borderRadius: 1,
                background: "#1a1a1a",
                opacity: 0.15,
                marginBottom: 3,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step indicator                                                     */
/* ------------------------------------------------------------------ */

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        marginBottom: 32,
      }}
    >
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? 32 : 10,
            height: 10,
            borderRadius: 5,
            background: i === current ? C.primary : i < current ? C.purple : C.border,
            transition: "all 0.3s ease",
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main client component                                              */
/* ------------------------------------------------------------------ */

export default function WelcomeClient() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [accountType, setAccountTypeState] = useState<"creator" | "brand" | null>(null);

  const handleAccountTypeSelect = (type: "creator" | "brand") => {
    setAccountTypeState(type);
    setStep(2);
  };

  const selectView = async (mode: "modern" | "editorial") => {
    if (!accountType) return;

    // Persist view mode
    localStorage.setItem("viewMode", mode);
    document.documentElement.classList.toggle("modern-view", mode === "modern");

    // Persist account type
    localStorage.setItem("accountType", accountType);
    await setAccountType(accountType);

    // Redirect based on account type
    if (accountType === "brand") {
      router.push("/brand");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: C.bg,
        fontFamily: font,
        padding: "40px 20px",
      }}
    >
      {/* Logo */}
      <div
        style={{
          fontWeight: 800,
          fontSize: 28,
          color: C.primary,
          marginBottom: 24,
          letterSpacing: -0.5,
        }}
      >
        Go<span style={{ color: C.textSecondary }}>Virall</span>
      </div>

      {/* Step indicator */}
      <StepIndicator current={step - 1} total={2} />

      {/* -------- STEP 1: Account Type -------- */}
      {step === 1 && (
        <>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h1
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: C.text,
                marginBottom: 12,
              }}
            >
              How will you use Go Virall?
            </h1>
            <p
              style={{
                fontSize: 16,
                color: C.textSecondary,
                maxWidth: 500,
                margin: "0 auto",
                lineHeight: 1.6,
              }}
            >
              Select your account type to get a personalized experience.
              You can change this later in your settings.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 24,
              flexWrap: "wrap",
              justifyContent: "center",
              maxWidth: 900,
              width: "100%",
            }}
          >
            <ViewCard
              title="I'm a Creator"
              description="For influencers, content creators, and personal brands looking to grow their social presence."
              features={[
                "Grow your audience",
                "AI-powered analytics",
                "Media kit builder",
                "Deal management",
              ]}
              preview={<CreatorIcon />}
              onClick={() => handleAccountTypeSelect("creator")}
            />
            <ViewCard
              title="I'm a Brand"
              description="For businesses and agencies looking to run influencer marketing campaigns effectively."
              features={[
                "Find creators",
                "Send proposals",
                "Manage campaigns",
                "Track ROI",
              ]}
              preview={<BrandIcon />}
              onClick={() => handleAccountTypeSelect("brand")}
            />
          </div>
        </>
      )}

      {/* -------- STEP 2: View Mode -------- */}
      {step === 2 && (
        <>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h1
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: C.text,
                marginBottom: 12,
              }}
            >
              Choose Your Dashboard View
            </h1>
            <p
              style={{
                fontSize: 16,
                color: C.textSecondary,
                maxWidth: 500,
                margin: "0 auto",
                lineHeight: 1.6,
              }}
            >
              Pick the layout that fits your style. You can switch between views
              anytime from your dashboard.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 24,
              flexWrap: "wrap",
              justifyContent: "center",
              maxWidth: 900,
              width: "100%",
            }}
          >
            <ViewCard
              title="Modern View"
              description="A clean, contemporary dashboard with card-based layouts and smooth animations."
              features={[
                "Dark purple theme",
                "Card-based analytics",
                "Modern sidebar navigation",
                "Streamlined interface",
              ]}
              preview={<ModernPreview />}
              onClick={() => selectView("modern")}
            />
            <ViewCard
              title="Editorial View"
              description="A newspaper-inspired layout that presents your data like a daily intelligence briefing."
              features={[
                "Classic newspaper aesthetic",
                "Column-based layout",
                "Serif typography",
                "Unique reading experience",
              ]}
              preview={<EditorialPreview />}
              onClick={() => selectView("editorial")}
            />
          </div>

          {/* Back button */}
          <button
            onClick={() => setStep(1)}
            style={{
              marginTop: 24,
              background: "transparent",
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: "10px 24px",
              color: C.textSecondary,
              fontSize: 14,
              fontFamily: font,
              cursor: "pointer",
              transition: "border-color 0.2s, color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = C.purple;
              e.currentTarget.style.color = C.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(75,156,211,0.15)";
              e.currentTarget.style.color = C.textSecondary;
            }}
          >
            &larr; Back to account type
          </button>
        </>
      )}

      <p
        style={{
          marginTop: 32,
          fontSize: 13,
          color: C.textSecondary,
          opacity: 0.7,
        }}
      >
        {step === 1
          ? "You can change your account type anytime from settings."
          : "You can change your view anytime from the dashboard settings."}
      </p>
    </div>
  );
}
