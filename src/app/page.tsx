import DailyGame from "@/components/DailyGame";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://framemoji.ainsworth.dev";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Framemoji",
  url: siteUrl,
  description: "Guess the movie from emoji. One movie, ten emoji — play daily.",
  applicationCategory: "GameApplication",
  operatingSystem: "Web",
  inLanguage: "en-GB",
  browserRequirements: "Requires JavaScript.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  creator: {
    "@type": "Person",
    name: "Sam Ainsworth",
    url: "https://ainsworth.dev",
  },
};

export default function HomePage() {
  return (
    <main
      id="main"
      style={{
        // Full width on mobile; on desktop ensure at least 1/3 of viewport
        width: "100%",
        maxWidth: "min(1200px, 100vw)",
        minWidth: "33vw",
        margin: "2rem auto",
        padding: "0 1rem",
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <h1>🎬 Framemoji</h1>
      <p>Guess the movie from emoji clues depicting the plot. Ten emoji, one film, play daily.</p>
      <DailyGame />
      <p style={{ textAlign: 'center', marginTop: '1rem', opacity: 0.85 }}>
        <a
          href="https://github.com/sainsw/framemoji"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'inherit' }}
        >
          Built
        </a>{' '}
        with <span role="img" aria-label="love">❤️</span> in Manchester, UK{' '}
        <span role="img" aria-label="bee">🐝</span>
        <span role="img" aria-label="United Kingdom flag" style={{ marginLeft: 4 }}>🇬🇧</span>
      </p>
    </main>
  );
}
