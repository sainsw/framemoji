import DailyGame from "@/components/DailyGame";

export default function HomePage() {
  return (
    <main id="main" style={{ maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>🎬 Framemoji</h1>
      <p>One movie. Ten emoji. Play daily.</p>
      <DailyGame />
    </main>
  );
}
