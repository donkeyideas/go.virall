"use client";

import { useRouter } from "next/navigation";

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
};

const font = "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

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
        e.currentTarget.style.borderColor = "rgba(139,92,246,0.15)";
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
          background: "rgba(139,92,246,0.1)",
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
              background: "rgba(139,92,246,0.3)",
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

export default function WelcomePage() {
  const router = useRouter();

  const selectView = (mode: "modern" | "editorial") => {
    localStorage.setItem("viewMode", mode);
    document.documentElement.classList.toggle("modern-view", mode === "modern");
    router.push("/dashboard");
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
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div
          style={{
            fontWeight: 800,
            fontSize: 28,
            color: C.primary,
            marginBottom: 24,
            letterSpacing: -0.5,
          }}
        >
          Go<span style={{ color: C.textSecondary }}>Viral</span>
        </div>
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

      <p
        style={{
          marginTop: 32,
          fontSize: 13,
          color: C.textSecondary,
          opacity: 0.7,
        }}
      >
        You can change your view anytime from the dashboard settings.
      </p>
    </div>
  );
}
