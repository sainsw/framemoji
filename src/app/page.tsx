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
    <main id="main" className="shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <DailyGame />
    </main>
  );
}
