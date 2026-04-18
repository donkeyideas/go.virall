"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Inbox,
  PenTool,
  BarChart3,
  Briefcase,
  Settings,
  BookOpen,
  Sun,
  Moon,
  LogOut,
  Bell,
  User,
  CreditCard,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useViewMode } from "@/lib/contexts/view-mode";
import { signOut } from "@/lib/actions/auth";
import { useEffect, useState } from "react";
import { NotificationModal } from "@/components/dashboard/NotificationModal";

const ALL_NAV_ITEMS = [
  { label: "Overview", href: "/dashboard", icon: Home },
  { label: "Mission", href: "/dashboard/mission", icon: Target },
  { label: "Profiles", href: "/dashboard/profiles", icon: User },
  { label: "Inbox", href: "/dashboard/inbox", icon: Inbox },
  { label: "Content", href: "/dashboard/content", icon: PenTool },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Business", href: "/dashboard/business", icon: Briefcase },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Guide", href: "/dashboard/guide", icon: BookOpen },
];

interface ModernNavProps {
  userName: string | null;
  avatarUrl?: string | null;
  showLogout: boolean;
  unreadCount?: number;
  notifications?: Array<{ id: string; title: string; body: string | null; type: string; is_read: boolean; created_at: string }>;
  accountType?: "creator" | "brand";
}

export function ModernNav({ userName, avatarUrl, showLogout, unreadCount = 0, notifications = [], accountType = "creator" }: ModernNavProps) {
  const pathname = usePathname();
  const { viewMode, setViewMode } = useViewMode();
  const [dark, setDark] = useState(true);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const isDark = stored ? stored === "dark" : true;
    setDark(isDark);
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: "var(--color-surface-inset)",
        borderBottom: "1px solid rgba(var(--accent-rgb),0.12)",
        fontFamily:
          "-apple-system,'Segoe UI','Helvetica Neue',Arial,sans-serif",
      }}
    >
      {/* Row 1 */}
      <div
        className="flex items-center justify-between px-6"
        style={{
          height: 56,
          borderBottom: "1px solid rgba(var(--accent-rgb),0.06)",
        }}
      >
        {/* Logo */}
        <div
          style={{
            fontWeight: 800,
            fontSize: 22,
            letterSpacing: -0.5,
            color: "var(--color-editorial-accent, var(--color-editorial-red))",
            flexShrink: 0,
          }}
        >
          Go
          <span style={{ color: "var(--color-ink-secondary)" }}>Virall</span>
        </div>

        {/* Right actions */}
        <div className="flex items-center" style={{ gap: 10 }}>
          {/* Search */}
          <input
            readOnly
            placeholder="Search..."
            className="hidden sm:block"
            style={{
              background: "var(--color-surface-card)",
              border: "1px solid rgba(var(--accent-rgb),0.12)",
              borderRadius: 8,
              padding: "7px 14px",
              fontSize: 12,
              color: "var(--color-ink-secondary)",
              width: 200,
              outline: "none",
              fontFamily: "inherit",
            }}
          />

          {/* View toggle */}
          <button
            onClick={() =>
              setViewMode(viewMode === "modern" ? "editorial" : "modern")
            }
            style={{
              background: "var(--color-surface-card)",
              color: "var(--color-ink-secondary)",
              border: "1px solid rgba(var(--accent-rgb),0.12)",
              borderRadius: 8,
              padding: "6px 14px",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {viewMode === "modern" ? "Editorial View" : "Modern View"}
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "var(--color-surface-card)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              border: "none",
              color: "var(--color-ink-secondary)",
            }}
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Notifications */}
          <button
            type="button"
            onClick={() => { setNotifOpen(true); setAvatarOpen(false); }}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "var(--color-surface-card)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              cursor: "pointer",
              color: "var(--color-ink-secondary)",
              border: "none",
            }}
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: 2,
                  right: 2,
                  background: "var(--color-modern-error, #EF4444)",
                  color: "white",
                  fontSize: 8,
                  fontWeight: 800,
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid var(--color-surface-inset)",
                }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </div>
            )}
          </button>

          <NotificationModal
            open={notifOpen}
            onClose={() => setNotifOpen(false)}
            notifications={notifications}
            unreadCount={unreadCount}
            basePath="/dashboard"
          />

          {/* Avatar */}
          <div style={{ position: "relative" }}>
            <div
              onClick={() => setAvatarOpen((prev) => !prev)}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: avatarUrl
                  ? "transparent"
                  : "linear-gradient(135deg, var(--color-editorial-red), var(--color-editorial-blue))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                fontWeight: 800,
                color: "#0B1928",
                cursor: "pointer",
                overflow: "hidden",
              }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                initials
              )}
            </div>

            {/* Dropdown */}
            {avatarOpen && (
              <>
                {/* Invisible backdrop to close on outside click */}
                <div
                  style={{ position: "fixed", inset: 0, zIndex: 99 }}
                  onClick={() => setAvatarOpen(false)}
                />
                <div
                  style={{
                    position: "absolute",
                    top: 40,
                    right: 0,
                    background: "var(--color-surface-card)",
                    border: "1px solid rgba(var(--accent-rgb),0.12)",
                    borderRadius: 10,
                    minWidth: 180,
                    padding: 8,
                    boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
                    zIndex: 100,
                  }}
                >
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setAvatarOpen(false)}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-ink-secondary hover:bg-editorial-blue/8 hover:text-ink"
                  >
                    <User size={14} />
                    My Profile
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setAvatarOpen(false)}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-ink-secondary hover:bg-editorial-blue/8 hover:text-ink"
                  >
                    <Settings size={14} />
                    Settings
                  </Link>
                  <Link
                    href="/dashboard/settings?tab=billing"
                    onClick={() => setAvatarOpen(false)}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-ink-secondary hover:bg-editorial-blue/8 hover:text-ink"
                  >
                    <CreditCard size={14} />
                    Billing
                  </Link>
                  <div
                    style={{
                      height: 1,
                      background: "rgba(var(--accent-rgb),0.08)",
                      margin: "4px 0",
                    }}
                  />
                  {showLogout && (
                    <button
                      type="button"
                      onClick={() => { setAvatarOpen(false); signOut(); }}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs hover:bg-editorial-blue/8"
                      style={{ color: "var(--color-modern-error, #EF4444)" }}
                    >
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Navigation */}
      <div
        className="scrollbar-none"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 44,
          padding: "0 24px",
          overflowX: "auto",
          gap: 0,
        }}
      >
        {ALL_NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "0 12px",
                height: 44,
                fontSize: 12,
                fontWeight: isActive ? 700 : 600,
                color: isActive
                  ? "#facc15"
                  : "var(--color-ink-secondary)",
                textDecoration: "none",
                cursor: "pointer",
                position: "relative",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              <Icon
                size={14}
                style={{ flexShrink: 0 }}
              />
              {item.label}
              {isActive && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 8,
                    right: 8,
                    height: 2,
                    background: "#facc15",
                    borderRadius: "2px 2px 0 0",
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
