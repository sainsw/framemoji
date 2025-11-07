import { PrideAvatar } from "./pride-avatar";

export default function SiteFooter() {
  const now = new Date();
  const year = now.getFullYear();
  const span = year > 2024 ? `2024 - ${year}` : `${year}`;
  const text = `© Sam Ainsworth ${span}. All Rights Reserved.`;
  const AVATAR_VERSION = '56af89cb';
  return (
    <footer style={{ marginTop: "auto" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 1rem" }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '14px' }}>
          <div style={{ textAlign: 'center', width: '100%' }}>
            <a
              href="https://ainsworth.dev"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit ainsworth.dev"
              style={{ display: 'inline-block' }}
            >
              <PrideAvatar>
                <picture>
                  <source srcSet={`https://ainsworth.dev/images/home/avatar-${AVATAR_VERSION}.webp`} type="image/webp" />
                  <img
                    src={`https://ainsworth.dev/images/home/avatar-${AVATAR_VERSION}.jpg`}
                    alt="Sam Ainsworth"
                    width={80}
                    height={80}
                    loading="lazy"
                    style={{ height: 80, width: 80, borderRadius: '9999px', backgroundPosition: 'left bottom' }}
                  />
                </picture>
              </PrideAvatar>
            </a>
          </div>
          <div style={{ opacity: 0.7, fontSize: 13, textAlign: 'left' }}>{text}</div>
        </div>
      </div>
    </footer>
  );
}
