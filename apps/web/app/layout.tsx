import type { Metadata, Viewport } from 'next';
import {
  Instrument_Serif,
  Fraunces,
  Manrope,
  Inter,
  JetBrains_Mono,
} from 'next/font/google';
import { createServerClient } from '@govirall/db/server';
import { createAdminClient } from '@govirall/db/admin';
import { JsonLd, organizationSchema, websiteSchema } from '../lib/seo/json-ld';
import './globals.css';

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  variable: '--font-instrument-serif',
  weight: '400',
  style: ['normal', 'italic'],
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3600';

export const metadata: Metadata = {
  title: {
    default: 'Go Virall - The Creator OS',
    template: '%s | Go Virall',
  },
  description:
    'Social intelligence platform for creators. Viral score predictions, AI content studio, and audience analytics across 7 platforms.',
  metadataBase: new URL(BASE),
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'Go Virall',
    locale: 'en_US',
    title: 'Go Virall - The Creator OS',
    description:
      'Analytics, AI Studio, Viral Score & Audience Intelligence across 7 platforms. Free to start.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Go Virall - The Creator OS',
    description:
      'Social intelligence platform for creators. Score content 0-100 before you post.',
  },
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0618',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read user's saved theme if authenticated; fallback to neon-editorial for landing pages
  let theme = 'neon-editorial';
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const admin = createAdminClient();
      const { data } = await admin
        .from('users')
        .select('theme')
        .eq('id', user.id)
        .single();
      if (data?.theme) theme = data.theme;
    }
  } catch {
    // Not authenticated or DB error — use default
  }

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${instrumentSerif.variable} ${fraunces.variable} ${manrope.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <JsonLd data={organizationSchema()} />
        <JsonLd data={websiteSchema()} />
        {children}
      </body>
    </html>
  );
}
