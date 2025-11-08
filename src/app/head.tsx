export default function Head() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Framemoji",
    url: base,
    description: "Guess the movie from emoji. One movie, ten emoji — play daily.",
  };
  return (
    <>
      <link rel="preconnect" href="https://ainsworth.dev" crossOrigin="" />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
