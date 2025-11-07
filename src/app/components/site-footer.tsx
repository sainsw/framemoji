import { PrideAvatar } from "./pride-avatar";

export default function SiteFooter() {
  const now = new Date();
  const year = now.getFullYear();
  const span = year > 2024 ? `2024 - ${year}` : `${year}`;
  const text = `© Sam Ainsworth ${span}. All Rights Reserved.`;
  const AVATAR_VERSION = '56af89cb';
  return (
    <footer style={{ marginTop: "auto" }}>
      {/* Match ainsworth.dev structure: relative h-64 container, inner absolute bottom container */}
      <div className="footer-shell" style={{ position: 'relative', height: 256 }}>
        <div className="footer-inner" style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 20 }}>
              <div style={{ width: '100%' }}>
                <a
                  className="footer-avatar-link"
                  href="https://ainsworth.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="go to my personal website"
                  style={{ display: 'block', marginBottom: 40, maxWidth: 'max-content' }}
                >
                  <PrideAvatar>
                    <picture>
                      <source srcSet={`https://ainsworth.dev/images/home/avatar-${AVATAR_VERSION}.webp`} type="image/webp" />
                      <img
                        src={`https://ainsworth.dev/images/home/avatar-${AVATAR_VERSION}.jpg`}
                        alt="my face"
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
        </div>
      </div>
    </footer>
  );
}
