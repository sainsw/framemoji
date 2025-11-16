import DailyGame from "@/components/DailyGame";

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
      <h1>🎬 Framemoji</h1>
      <p>One movie. Ten emoji. Play daily.</p>
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
