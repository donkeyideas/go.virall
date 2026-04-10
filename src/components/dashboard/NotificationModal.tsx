"use client";

import { useState, useTransition } from "react";
import { X, Bell, CheckCheck, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/dal/notifications";

interface Notification {
  id: string;
  title: string;
  body: string | null;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationModalProps {
  open: boolean;
  onClose: () => void;
  notifications: Notification[];
  unreadCount: number;
  /** Base path for proposal links — "/dashboard" or "/brand" */
  basePath?: string;
}

function getNotificationLink(type: string, basePath: string): string {
  if (type.startsWith("proposal")) return `${basePath === "/brand" ? "/brand/proposals" : "/dashboard/business?tab=proposals"}`;
  if (type.startsWith("deal")) return `${basePath === "/brand" ? "/brand/deals" : "/dashboard/business?tab=deals"}`;
  if (type === "message") return `${basePath === "/brand" ? "/brand/messages" : "/dashboard/inbox"}`;
  return basePath;
}

function formatNotifTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function NotificationModal({
  open,
  onClose,
  notifications,
  unreadCount,
  basePath = "/dashboard",
}: NotificationModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  function handleNotificationClick(notif: Notification) {
    const link = getNotificationLink(notif.type, basePath);
    if (!notif.is_read) {
      startTransition(async () => {
        await markNotificationRead(notif.id);
      });
    }
    onClose();
    router.push(link);
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsRead();
    });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 200,
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(460px, 90vw)",
          maxHeight: "70vh",
          background: "var(--color-surface-card)",
          border: "1px solid rgba(75,156,211,0.15)",
          borderRadius: 16,
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
          zIndex: 201,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid rgba(75,156,211,0.1)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Bell size={18} style={{ color: "var(--color-editorial-red)" }} />
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-ink)" }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#4B9CD3",
                  background: "rgba(75,156,211,0.1)",
                  padding: "2px 10px",
                  borderRadius: 10,
                }}
              >
                {unreadCount} new
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={isPending}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#4B9CD3",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: 6,
                  fontFamily: "inherit",
                }}
              >
                <CheckCheck size={13} />
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "rgba(75,156,211,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                cursor: "pointer",
                color: "var(--color-ink-secondary)",
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Notification list */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {notifications.length === 0 ? (
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "rgba(75,156,211,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 14px",
                }}
              >
                <Bell size={22} style={{ color: "var(--color-ink-secondary)" }} />
              </div>
              <p style={{ fontSize: 13, color: "var(--color-ink-secondary)", fontWeight: 500 }}>
                No notifications yet
              </p>
              <p style={{ fontSize: 11, color: "var(--color-ink-muted)", marginTop: 4 }}>
                You'll see proposal updates, messages, and deal activity here
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "14px 20px",
                  borderBottom: "1px solid rgba(75,156,211,0.06)",
                  background: n.is_read ? "transparent" : "rgba(75,156,211,0.04)",
                  cursor: "pointer",
                  width: "100%",
                  textAlign: "left",
                  border: "none",
                  borderBlockEnd: "1px solid rgba(75,156,211,0.06)",
                  fontFamily: "inherit",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(75,156,211,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = n.is_read ? "transparent" : "rgba(75,156,211,0.04)";
                }}
              >
                {/* Unread dot */}
                <div style={{ paddingTop: 5, flexShrink: 0, width: 8 }}>
                  {!n.is_read && (
                    <div
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: "var(--color-editorial-red)",
                      }}
                    />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: n.is_read ? 500 : 700,
                      color: "var(--color-ink)",
                      marginBottom: 3,
                    }}
                  >
                    {n.title}
                  </div>
                  {n.body && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--color-ink-secondary)",
                        lineHeight: 1.5,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {n.body}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--color-ink-muted)",
                      marginTop: 4,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {formatNotifTime(n.created_at)}
                    <ExternalLink size={9} style={{ opacity: 0.5 }} />
                    <span style={{ opacity: 0.5 }}>
                      {n.type.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}
