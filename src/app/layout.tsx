import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { CURRENT_PATCH } from "@/lib/data";
import { SITE_NAME, SITE_TAGLINE, SITE_URL, absoluteUrl, webApplicationLd } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  // Makes every relative `alternates.canonical` / OG url in child pages
  // resolve to an absolute URL. Without it Next emits relative canonicals,
  // which crawlers treat inconsistently.
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    `Accurate, patch-versioned League of Legends: Wild Rift champion stats, item stats and build ` +
    `calculator. Currently patch ${CURRENT_PATCH}. Every value sourced from official Riot patch notes.`,
  applicationName: SITE_NAME,
  keywords: [
    "Wild Rift",
    "League of Legends Wild Rift",
    "Wild Rift builds",
    "Wild Rift items",
    "Wild Rift champion stats",
    "Wild Rift build calculator",
    "WR item stats",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: `Accurate, patch-versioned Wild Rift champion and item data. Patch ${CURRENT_PATCH}.`,
    url: absoluteUrl("/"),
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: `Accurate, patch-versioned Wild Rift champion and item data. Patch ${CURRENT_PATCH}.`,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  category: "games",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans">
        <script
          type="application/ld+json"
          // Site-wide structured data. Safe to inject: the payload is built
          // from our own constants, never from user or remote input.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webApplicationLd()) }}
        />
        {children}
      </body>
    </html>
  );
}
