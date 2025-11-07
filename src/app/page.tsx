import DailyGame from "@/components/DailyGame";

export default function HomePage() {
  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>🎬 Emovi</h1>
      <p>Daily challenge. Same movie for everyone, UTC midnight reset.</p>
      <DailyGame />
      <footer style={{ marginTop: "3rem", opacity: 0.8 }}>
        <small>Built with love in Manchester, UK 🐝❤️🇬🇧</small>
      </footer>
    </main>
  );
}
