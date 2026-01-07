/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Framemoji social preview";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://framemoji.ainsworth.dev";
const siteHost = siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");

// Convert emoji to Twemoji CDN URL (PNG, not SVG - Satori doesn't support SVG images)
function getTwemojiUrl(emoji: string): string {
  const codePoint = [...emoji]
    .map((char) => char.codePointAt(0)?.toString(16))
    .filter(Boolean)
    .join("-");
  return `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/${codePoint}.png`;
}

function Emoji({ char, size = 40 }: { char: string; size?: number }) {
  return <img src={getTwemojiUrl(char)} alt={char} width={size} height={size} />;
}

export async function GET() {
  // Load Geist font
  const geistBold = await fetch(
    "https://cdn.jsdelivr.net/npm/@fontsource/geist-sans@5.0.3/files/geist-sans-latin-700-normal.woff"
  ).then((res) => res.arrayBuffer());

  const geistRegular = await fetch(
    "https://cdn.jsdelivr.net/npm/@fontsource/geist-sans@5.0.3/files/geist-sans-latin-400-normal.woff"
  ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "60px",
          backgroundColor: "#09090b",
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(251, 146, 60, 0.25), transparent), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(239, 68, 68, 0.2), transparent), radial-gradient(ellipse 50% 30% at 0% 100%, rgba(168, 85, 247, 0.2), transparent)",
          color: "#fafafa",
          fontFamily: "Geist",
        }}
      >
        {/* Hero emoji row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 48,
          }}
        >
          <Emoji char="🎬" size={100} />
          <div style={{ width: 24 }} />
          <Emoji char="🍿" size={100} />
          <div style={{ width: 24 }} />
          <Emoji char="🎥" size={100} />
          <div style={{ width: 24 }} />
          <Emoji char="🌟" size={100} />
          <div style={{ width: 24 }} />
          <Emoji char="🎭" size={100} />
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 96,
            fontWeight: 700,
            letterSpacing: -3,
            marginBottom: 20,
            background: "linear-gradient(135deg, #fff 0%, #a1a1aa 100%)",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Framemoji
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            color: "#a1a1aa",
            textAlign: "center",
            maxWidth: 700,
            lineHeight: 1.4,
          }}
        >
          Guess the movie from the emoji. A new puzzle every day.
        </div>

        {/* Footer URL */}
        <div
          style={{
            position: "absolute",
            bottom: 50,
            left: 60,
            display: "flex",
            alignItems: "center",
            opacity: 0.5,
          }}
        >
          <span style={{ fontSize: 24, letterSpacing: 1 }}>{siteHost}</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Geist",
          data: geistBold,
          style: "normal",
          weight: 700,
        },
        {
          name: "Geist",
          data: geistRegular,
          style: "normal",
          weight: 400,
        },
      ],
    }
  );
}
