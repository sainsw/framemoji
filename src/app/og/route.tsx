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
    .filter((cp) => cp && cp !== "fe0f")
    .join("-");
  return `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/${codePoint}.png`;
}

function Emoji({ char, size = 40 }: { char: string; size?: number }) {
  return <img src={getTwemojiUrl(char)} alt={char} width={size} height={size} />;
}

// A real puzzle's first take (The Shawshank Redemption), the way the game opens: three frames shown.
const OPENING_TAKE = ["🧱", "👨‍💼", "🤝"];
const TAKES = [3, 2, 2, 2, 1];

export async function GET() {
  const [interSemi, interRegular] = await Promise.all([
    fetch("https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.18/files/inter-latin-600-normal.woff").then((r) =>
      r.arrayBuffer(),
    ),
    fetch("https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.18/files/inter-latin-400-normal.woff").then((r) =>
      r.arrayBuffer(),
    ),
  ]);

  // 1200 - 2 * 72 margin = 1056 = 10 frames + 5 * 8 inner gaps + 4 * 20 take gaps → frame 93.6
  const frame = 93.6;
  let idx = 0;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          backgroundColor: "#000000",
          color: "#ffffff",
          fontFamily: "Inter",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 30, fontWeight: 600 }}>
          <div style={{ display: "flex", marginRight: 16 }}>
            <div style={{ width: 12, height: 32, borderRadius: 3, backgroundColor: "#ffffff", marginRight: 4 }} />
            <div style={{ width: 12, height: 32, borderRadius: 3, backgroundColor: "#999999", marginRight: 4 }} />
            <div style={{ width: 12, height: 32, borderRadius: 3, backgroundColor: "#4d4d4d" }} />
          </div>
          Framemoji
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 600, letterSpacing: -2, lineHeight: 1.05 }}>Which film is this?</div>
          <div style={{ fontSize: 30, color: "#b4b4b4", marginTop: 18 }}>
            Ten emoji tell one film a day. You get five guesses.
          </div>
        </div>

        <div style={{ display: "flex" }}>
          {TAKES.map((n, ti) => (
            <div key={ti} style={{ display: "flex", marginRight: ti < TAKES.length - 1 ? 20 : 0 }}>
              {Array.from({ length: n }).map((_, k) => {
                const i = idx++;
                const glyph = OPENING_TAKE[i];
                return (
                  <div
                    key={k}
                    style={{
                      width: frame,
                      height: frame,
                      marginRight: k < n - 1 ? 8 : 0,
                      borderRadius: 12,
                      backgroundColor: glyph ? "#1a1a1a" : "#0f0f0f",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {glyph ? <Emoji char={glyph} size={58} /> : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#949494" }}>
          <span>{siteHost}</span>
          <span style={{ color: "#f2b33d" }}>5 of 5 guesses left</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Inter", data: interSemi, style: "normal", weight: 600 },
        { name: "Inter", data: interRegular, style: "normal", weight: 400 },
      ],
    },
  );
}
