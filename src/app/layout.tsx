import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import SiteFooter from "./components/site-footer";
import LiquidGlassFilters from "./components/LiquidGlassFilters";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "Framemoji — Emoji Based Movie Guessing Game",
    template: "%s · Framemoji",
  },
  description: "Guess the movie from emoji. One movie, ten emoji — play daily.",
  applicationName: "Framemoji",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Framemoji",
    title: "Framemoji — Emoji Based Movie Guessing Game",
    description: "Guess the movie from emoji. One movie, ten emoji — play daily.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Framemoji — Emoji Based Movie Guessing Game",
    description: "Guess the movie from emoji. One movie, ten emoji — play daily.",
    creator: "@samainsworth",
  },
  robots: {
    index: true,
    follow: true,
  },
  themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#0b0c10" }],
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* Client-side: inject SVG filter with displacement map for refraction */}
        <LiquidGlassFilters />
        {/* Global SVG filters for liquid-glass effects */}
        <svg width="0" height="0" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden="true">
          <defs>
            {/* Subtle noise for glass grain */}
            <filter id="glass-noise" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="1" seed="3" stitchTiles="stitch" result="noise"/>
              <feColorMatrix in="noise" type="saturate" values="0" result="mono"/>
              <feComponentTransfer>
                <feFuncA type="table" tableValues="0 0.08" />
              </feComponentTransfer>
            </filter>
            {/* Optional gooey merge for rounded highlights (not applied to text) */}
            <filter id="liquid-soft" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
              <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
              <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8" result="goo" />
              <feBlend in="SourceGraphic" in2="goo" />
            </filter>
          </defs>
        </svg>
        <a className="skip-link" href="#main">Skip to content</a>
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
