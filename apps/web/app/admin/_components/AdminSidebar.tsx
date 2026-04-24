'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Package,
  FileText,
  Share2,
  Mail,
  Bell,
  LifeBuoy,
  LayoutGrid,
  BarChart3,
  Brain,
  Database,
  Search,
  Key,
  Flag,
  Heart,
  History,
  ScrollText,
  ArrowLeft,
} from 'lucide-react';

const S = 15;

const NAV_GROUPS: { label: string; items: { href: string; icon: ReactNode; label: string }[] }[] = [
  {
    label: 'Overview',
    items: [
      { href: '/admin', icon: <LayoutDashboard size={S} />, label: 'Dashboard' },
    ],
  },
  {
    label: 'Data',
    items: [
      { href: '/admin/users', icon: <Users size={S} />, label: 'Users' },
      { href: '/admin/billing', icon: <CreditCard size={S} />, label: 'Billing & Revenue' },
      { href: '/admin/subscriptions', icon: <Package size={S} />, label: 'Subscriptions' },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/admin/blog', icon: <FileText size={S} />, label: 'Blog & Guides' },
      { href: '/admin/social', icon: <Share2 size={S} />, label: 'Social Posts' },
      { href: '/admin/email-templates', icon: <Mail size={S} />, label: 'Email Templates' },
      { href: '/admin/notifications', icon: <Bell size={S} />, label: 'Notifications' },
      { href: '/admin/contacts', icon: <LifeBuoy size={S} />, label: 'Support Tickets' },
      { href: '/admin/content', icon: <LayoutGrid size={S} />, label: 'Content Manager' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { href: '/admin/analytics', icon: <BarChart3 size={S} />, label: 'Platform Analytics' },
      { href: '/admin/ai', icon: <Brain size={S} />, label: 'AI Intelligence' },
      { href: '/admin/data', icon: <Database size={S} />, label: 'Data Intelligence' },
      { href: '/admin/seo', icon: <Search size={S} />, label: 'SEO' },
      { href: '/admin/api', icon: <Key size={S} />, label: 'API Management' },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/admin/flags', icon: <Flag size={S} />, label: 'Feature Flags' },
      { href: '/admin/health', icon: <Heart size={S} />, label: 'System Health' },
      { href: '/admin/changelog', icon: <History size={S} />, label: 'Changelog' },
      { href: '/admin/audit', icon: <ScrollText size={S} />, label: 'Audit Log' },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <aside
      style={{
        width: 220,
        background: 'var(--admin-surface, #1a1b20)',
        borderRight: '1px solid var(--admin-border, #2a2b33)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflowY: 'auto',
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '20px 18px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: 'Fraunces, serif',
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--fg, #e2e4ea)',
            letterSpacing: '-0.02em',
          }}
        >
          Go Virall
        </span>
        <span
          style={{
            fontSize: 9,
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            color: '#fff',
            background: 'var(--admin-red, #c0392b)',
            padding: '2px 6px',
            borderRadius: 3,
          }}
        >
          ADMIN
        </span>
      </div>

      {/* Nav Groups */}
      <nav style={{ flex: 1, padding: '4px 0' }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} style={{ marginBottom: 4 }}>
            <div
              style={{
                padding: '10px 18px 4px',
                fontSize: 9,
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase' as const,
                color: 'var(--admin-muted, #6b6e7b)',
              }}
            >
              {group.label}
            </div>
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '7px 18px 7px 14px',
                    fontSize: 13,
                    color: active
                      ? 'var(--fg, #e2e4ea)'
                      : 'var(--admin-muted, #6b6e7b)',
                    textDecoration: 'none',
                    borderLeft: active
                      ? '3px solid var(--admin-red, #c0392b)'
                      : '3px solid transparent',
                    background: active
                      ? 'var(--admin-surface-2, #1f2128)'
                      : 'transparent',
                    transition: 'all 0.15s',
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  <span style={{ width: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: '12px 18px 16px',
          borderTop: '1px solid var(--admin-border, #2a2b33)',
        }}
      >
        <Link
          href="/dashboard"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            color: 'var(--admin-muted, #6b6e7b)',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={14} />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    </aside>
  );
}
