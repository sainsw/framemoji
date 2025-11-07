import type { Metadata } from "next";
import "@/styles/globals.css";
import SiteFooter from "./components/site-footer";

export const metadata: Metadata = {
  title: "Emovi — Emoji Movie Trivia",
  description: "Guess the movie from emojis",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
