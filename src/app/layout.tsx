import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import SiteFooter from "./components/site-footer";

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
        <a className="skip-link" href="#main">Skip to content</a>
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
