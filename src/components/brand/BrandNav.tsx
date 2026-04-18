"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Search as SearchIcon,
  MessageSquare,
  Megaphone,
  FileText,
  Handshake,
  CreditCard,
  BarChart3,
  Settings,
  Sun,
  Moon,
  Bell,
  LogOut,
  User,
  Building2,
  Sparkles,
  Shield,
  CalendarDays,
} from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { useEffect, useState } from "react";
import { NotificationModal } from "@/components/dashboard/NotificationModal";

const brandNavItems = [
  { label: "Overview", href: "/brand", icon: Home },
  { label: "Discover", href: "/brand/discover", icon: SearchIcon },
  { label: "Matches", href: "/brand/matches", icon: Sparkles },
  { label: "Messages", href: "/brand/messages", icon: MessageSquare },
  { label: "Campaigns", href: "/brand/campaigns", icon: Megaphone },
  { label: "Calendar", href: "/brand/calendar", icon: CalendarDays },
  { label: "Proposals", href: "/brand/proposals", icon: FileText },
  { label: "Deals", href: "/brand/deals", icon: Handshake },
  { label: "Payments", href: "/brand/payments", icon: CreditCard },
  { label: "Analytics", href: "/brand/analytics", icon: BarChart3 },
  { label: "Trust Score", href: "/brand/trust-score", icon: Shield },
  { label: "Settings", href: "/brand/settings", icon: Settings },
];

interface BrandNavProps {
  userName: string | null;
  companyName: string | null;
  companyLogoUrl?: string | null;
  showLogout: boolean;
  unreadCount?: number;
  unreadSupportCount?: number;
  notifications?: Array<{ id: string; title: string; body: string | null; type: string; is_read: boolean; created_at: string }>;
}

export function BrandNav({
  userName,
  companyName,
  companyLogoUrl,
  showLogout,
  unreadCount = 0,
  unreadSupportCount = 0,
  notifications = [],
}: BrandNavProps) {
  const pathname = usePathname();
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

  const initials = (companyName || userName)
    ? (companyName || userName)!
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
        borderBottom: "1px solid rgba(75,156,211,0.12)",
        fontFamily:
          "-apple-system,'Segoe UI','Helvetica Neue',Arial,sans-serif",
      }}
    >
      {/* Row 1: Logo, Search, Actions */}
      <div
        className="flex items-center justify-between px-6"
        style={{
          height: 56,
          borderBottom: "1px solid rgba(75,156,211,0.06)",
        }}
      >
        {/* Logo + Badge */}
        <div className="flex items-center" style={{ gap: 10, flexShrink: 0 }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: 22,
              letterSpacing: -0.5,
              color: "var(--color-editorial-red)",
            }}
          >
            Go
            <span style={{ color: "var(--color-ink-secondary)" }}>Virall</span>
          </div>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1.2,
              color: "rgba(75,156,211,0.8)",
            }}
          >
            for Brands
          </span>
        </div>

        {/* Right actions */}
        <div className="flex items-center" style={{ gap: 10 }}>
          {/* Search */}
          <input
            readOnly
            placeholder="Search creators, campaigns..."
            className="hidden sm:block"
            style={{
              background: "var(--color-surface-card)",
              border: "1px solid rgba(75,156,211,0.12)",
              borderRadius: 8,
              padding: "7px 14px",
              fontSize: 12,
              color: "var(--color-ink-secondary)",
              width: 240,
              outline: "none",
              fontFamily: "inherit",
            }}
          />

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
            basePath="/brand"
          />

          {/* Avatar dropdown */}
          <div style={{ position: "relative" }}>
            <div
              onClick={() => setAvatarOpen((prev) => !prev)}
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: companyLogoUrl
                  ? "var(--color-surface-card)"
                  : "linear-gradient(135deg, var(--color-editorial-red), rgba(75,156,211,0.9))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                fontWeight: 800,
                color: "#ffffff",
                cursor: "pointer",
                overflow: "hidden",
              }}
            >
              {companyLogoUrl ? (
                <img
                  src={companyLogoUrl}
                  alt={companyName || "Company logo"}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                initials
              )}
            </div>

            {avatarOpen && (
              <>
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
                    border: "1px solid rgba(75,156,211,0.12)",
                    borderRadius: 10,
                    minWidth: 200,
                    padding: 8,
                    boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
                    zIndex: 100,
                  }}
                >
                  {/* Company label */}
                  {companyName && (
                    <div
                      style={{
                        padding: "6px 12px 8px",
                        borderBottom: "1px solid rgba(75,156,211,0.08)",
                        marginBottom: 4,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--color-ink)",
                        }}
                      >
                        {companyName}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--color-ink-secondary)",
                          marginTop: 1,
                        }}
                      >
                        Brand Account
                      </div>
                    </div>
                  )}

                  <Link
                    href="/brand/settings"
                    onClick={() => setAvatarOpen(false)}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-ink-secondary hover:bg-editorial-blue/8 hover:text-ink"
                  >
                    <Building2 size={14} />
                    Company Profile
                  </Link>
                  <Link
                    href="/brand/settings"
                    onClick={() => setAvatarOpen(false)}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-ink-secondary hover:bg-editorial-blue/8 hover:text-ink"
                  >
                    <Settings size={14} />
                    Settings
                  </Link>
                  <Link
                    href="/brand/payments"
                    onClick={() => setAvatarOpen(false)}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-ink-secondary hover:bg-editorial-blue/8 hover:text-ink"
                  >
                    <CreditCard size={14} />
                    Billing
                  </Link>
                  <Link
                    href="/dashboard"
                    onClick={() => setAvatarOpen(false)}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-ink-secondary hover:bg-editorial-blue/8 hover:text-ink"
                  >
                    <User size={14} />
                    Switch to Creator
                  </Link>
                  <div
                    style={{
                      height: 1,
                      background: "rgba(75,156,211,0.08)",
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

      {/* Row 2: Navigation tabs */}
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
        {brandNavItems.map((item) => {
          const isActive =
            item.href === "/brand"
              ? pathname === "/brand"
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
                  ? "var(--color-editorial-red)"
                  : "var(--color-ink-secondary)",
                textDecoration: "none",
                cursor: "pointer",
                position: "relative",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              <Icon size={14} style={{ flexShrink: 0 }} />
              {item.label}
              {item.label === "Settings" && unreadSupportCount > 0 && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: 16,
                    minWidth: 16,
                    padding: "0 4px",
                    background: "var(--color-editorial-red)",
                    color: "#ffffff",
                    fontSize: 9,
                    fontWeight: 800,
                    borderRadius: 8,
                    marginLeft: 2,
                  }}
                >
                  {unreadSupportCount > 9 ? "9+" : unreadSupportCount}
                </span>
              )}
              {isActive && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 8,
                    right: 8,
                    height: 2,
                    background: "var(--color-editorial-red)",
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
