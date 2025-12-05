import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Framemoji social preview";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://framemoji.ainsworth.dev";
const siteHost = siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background:
            "radial-gradient(circle at 15% 20%, rgba(94, 234, 212, 0.35), transparent 30%), radial-gradient(circle at 85% 25%, rgba(244, 114, 182, 0.35), transparent 30%), radial-gradient(circle at 40% 80%, rgba(56, 189, 248, 0.35), transparent 28%), #0b0c10",
          color: "#e8f0ff",
          fontFamily: '"Inter", "Segoe UI", sans-serif',
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center", opacity: 0.7 }}>
          <span style={{ fontSize: 32 }}>🎬</span>
          <span style={{ fontSize: 28, letterSpacing: 2 }}>{siteHost}</span>
        </div>

        <div style={{ display: "grid", gap: 28 }}>
          <div style={{ fontSize: 92, fontWeight: 700, letterSpacing: -2 }}>Framemoji</div>
          <div style={{ fontSize: 36, maxWidth: 820, lineHeight: 1.3 }}>
            One movie. Ten emoji. Play a fresh guessing game every day.
          </div>
          <div style={{ display: "flex", gap: 12, fontSize: 40 }}>
            <span aria-hidden="true">🍿</span>
            <span aria-hidden="true">🧠</span>
            <span aria-hidden="true">🚀</span>
            <span aria-hidden="true">🎯</span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
