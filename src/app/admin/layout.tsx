import { redirect } from "next/navigation";
import Link from "next/link";
import { Shield, ArrowLeft, LogOut } from "lucide-react";
import { requireAdmin, getUnreadContactCount } from "@/lib/dal/admin";
import { AdminNav } from "./admin-nav";
import { AdminThemeToggle } from "./admin-theme-toggle";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminId = await requireAdmin();
  if (!adminId) redirect("/login");

  const unreadContacts = await getUnreadContactCount();

  return (
    <div className="admin-dark flex min-h-dvh flex-col bg-surface-cream">
      {/* Header */}
      <header
        style={{
          background: "var(--color-surface-inset)",
          borderBottom: "1px solid var(--color-rule)",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Shield size={18} style={{ color: "#FFB84D" }} />
          <span
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "var(--color-ink)",
              letterSpacing: 0.5,
              fontFamily: "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
            }}
          >
            Go<span style={{ color: "#FFB84D" }}>Virall</span>
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              color: "#4B9CD3",
              border: "1px solid rgba(75,156,211,0.3)",
              padding: "4px 10px",
              borderRadius: 6,
            }}
          >
            Admin
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link
            href="/dashboard"
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              color: "var(--color-ink-muted)",
              textDecoration: "none",
            }}
          >
            User Dashboard
          </Link>
          <AdminThemeToggle />
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 1.5,
                color: "var(--color-ink-muted)",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </form>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1 }}>
        {/* Sidebar */}
        <aside
          style={{
            width: 260,
            flexShrink: 0,
            borderRight: "1px solid var(--color-rule)",
            background: "var(--color-surface-card)",
            overflowY: "auto",
            position: "sticky",
            top: 0,
            height: "calc(100dvh - 53px)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <AdminNav unreadContacts={unreadContacts} />

          <div
            style={{
              marginTop: "auto",
              borderTop: "1px solid var(--color-rule)",
              padding: "16px 20px",
            }}
          >
            <Link
              href="/dashboard"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 1.5,
                color: "var(--color-ink-muted)",
                textDecoration: "none",
              }}
            >
              <ArrowLeft size={14} />
              Back to Dashboard
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main
          style={{
            flex: 1,
            padding: 32,
            overflowY: "auto",
            background: "var(--color-surface-cream)",
          }}
        >
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>{children}</div>
        </main>
      </div>
    </div>
  );
}
