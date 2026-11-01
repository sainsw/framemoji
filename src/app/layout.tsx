import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import { Inter } from "next/font/google";
import SiteFooter from "./components/site-footer";

import { Analytics } from "@vercel/analytics/next"

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-inter" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://framemoji.ainsworth.dev";
const siteName = "Framemoji";
const siteTitle = `${siteName} — Emoji Based Movie Guessing Game`;
const siteDescription = "Guess the movie from emoji. One movie, ten emoji — play daily.";
const socialImage = `${siteUrl}/og`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: `%s · ${siteName}`,
  },
  description: siteDescription,
  keywords: ["emoji movie game", "movie guessing game", "daily emoji quiz", "Framemoji"],
  applicationName: siteName,
  alternates: { canonical: siteUrl },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName,
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: socialImage,
        width: 1200,
        height: 630,
        type: "image/png",
        alt: `${siteName} social preview`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [socialImage],
    site: "@samainsworth",
    creator: "@samainsworth",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#000000" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Analytics />
        <a className="skip-link" href="#main">Skip to content</a>
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
