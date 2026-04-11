import type { Metadata } from "next";
import { Playfair_Display, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

const ibmSans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const ibmMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Go Virall — Social Intelligence Platform",
    template: "%s | Go Virall",
  },
  description:
    "Go Virall is the AI-powered social intelligence platform that helps creators and influencers grow their audience, analyze performance, and land brand deals.",
  metadataBase: new URL("https://www.govirall.com"),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: "/apple-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "Go Virall",
    title: "Go Virall — Social Intelligence Platform",
    description:
      "AI-powered social media analytics, growth strategies, and brand deal management for creators and influencers.",
    url: "https://www.govirall.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "Go Virall — Social Intelligence Platform",
    description:
      "AI-powered social media analytics, growth strategies, and brand deal management for creators and influencers.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${ibmSans.variable} ${ibmMono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh flex flex-col">
        {children}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-P1HL4ZZ8QK"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-P1HL4ZZ8QK');
          `}
        </Script>
      </body>
    </html>
  );
}
