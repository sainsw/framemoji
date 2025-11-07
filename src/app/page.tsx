import DailyGame from "@/components/DailyGame";

export default function HomePage() {
  return (
    <main id="main" style={{ maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>🎬 Emovi</h1>
      <p>One movie. Ten emoji. Play daily.</p>
      <DailyGame />
      <footer style={{ marginTop: "3rem", opacity: 0.8, textAlign: "center" }}>
        <small>Built with ❤️ in Manchester, UK 🐝🇬🇧</small>
      </footer>
    </main>
  );
}
