"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  Users,
  Building2,
  CreditCard,
  Bell,
  Tag,
  FileText,
  Search,
  Key,
  Activity,
  Brain,
  Sparkles,
  BookOpen,
  Share2,
  History,
  Map,
  Briefcase,
  MailOpen,
  Mail,
  Globe,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Overview", icon: BarChart3, href: "/admin" },
  { label: "Users", icon: Users, href: "/admin/users" },
  { label: "Organizations", icon: Building2, href: "/admin/orgs" },
  { label: "Billing", icon: CreditCard, href: "/admin/billing" },
  { label: "Notifications", icon: Bell, href: "/admin/notifications" },
  { label: "Subscriptions", icon: Tag, href: "/admin/subscriptions" },
  { label: "Content", icon: FileText, href: "/admin/content" },
  { label: "Search & AI", icon: Search, href: "/admin/search-ai" },
  { label: "API Management", icon: Key, href: "/admin/api" },
  { label: "System Health", icon: Activity, href: "/admin/health" },
  { label: "SEO", icon: Globe, href: "/admin/seo" },
  { label: "Analytics", icon: BarChart3, href: "/admin/analytics" },
  { label: "Data Intelligence", icon: Brain, href: "/admin/data-intelligence" },
  { label: "AI Intelligence", icon: Sparkles, href: "/admin/ai-intelligence" },
  { label: "Blog", icon: BookOpen, href: "/admin/blog" },
  { label: "Social Posts", icon: Share2, href: "/admin/social-posts" },
  { label: "Changelog", icon: History, href: "/admin/changelog" },
  { label: "Roadmap", icon: Map, href: "/admin/roadmap" },
  { label: "Careers", icon: Briefcase, href: "/admin/careers" },
  { label: "Email Templates", icon: MailOpen, href: "/admin/email-templates" },
  { label: "Contacts", icon: Mail, href: "/admin/contacts" },
] as const;

export function AdminNav({ unreadContacts }: { unreadContacts: number }) {
  const pathname = usePathname();

  return (
    <nav style={{ display: "flex", flexDirection: "column", gap: 2, padding: "8px 0" }}>
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 20px",
              fontSize: 13,
              fontWeight: isActive ? 700 : 500,
              letterSpacing: 0.3,
              textDecoration: "none",
              transition: "all 0.15s",
              borderLeft: `3px solid ${isActive ? "var(--color-editorial-red)" : "transparent"}`,
              background: isActive ? "var(--color-surface-raised)" : "transparent",
              color: isActive ? "var(--color-ink)" : "var(--color-ink-muted)",
            }}
          >
            <Icon size={18} style={{ flexShrink: 0 }} />
            <span>{item.label}</span>
            {item.label === "Contacts" && unreadContacts > 0 && (
              <span
                style={{
                  marginLeft: "auto",
                  display: "flex",
                  height: 20,
                  minWidth: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--color-editorial-red)",
                  color: "var(--color-surface-cream)",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "0 4px",
                  borderRadius: 4,
                }}
              >
                {unreadContacts}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
