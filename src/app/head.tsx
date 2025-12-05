const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://framemoji.ainsworth.dev";
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Framemoji",
  url: siteUrl,
  description: "Emoji-powered movie guessing game with a fresh puzzle every day.",
  applicationCategory: "Game",
  operatingSystem: "Web",
  inLanguage: "en-GB",
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

export default function Head() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </>
  );
}
