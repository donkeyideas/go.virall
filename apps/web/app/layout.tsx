import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import {
  Instrument_Serif,
  Fraunces,
  Manrope,
  Inter,
  JetBrains_Mono,
} from 'next/font/google';
import { JsonLd, organizationSchema, websiteSchema } from '../lib/seo/json-ld';
import './globals.css';

const GA_MEASUREMENT_ID = 'G-P1HL4ZZ8QK';

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Static default theme so the root layout stays cacheable (no cookie read =
  // marketing/legal/blog can be statically prerendered / ISR for anonymous SEO
  // traffic). Authenticated routes apply the user's saved theme in
  // (dashboard)/layout.tsx, which is dynamic by design.
  return (
    <html
      lang="en"
      data-theme="neon-editorial"
      className={`${instrumentSerif.variable} ${fraunces.variable} ${manrope.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
      </head>
      <body>
        <JsonLd data={organizationSchema()} />
        <JsonLd data={websiteSchema()} />
        {children}
      </body>
    </html>
  );
}
