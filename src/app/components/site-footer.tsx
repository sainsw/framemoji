import { PrideAvatar } from "./pride-avatar";
import { AVATAR_VERSION, FOOTER_START_YEAR } from "../../lib/assets";

export default function SiteFooter() {
  const year = new Date().getFullYear();
  const span = year > FOOTER_START_YEAR ? `${FOOTER_START_YEAR}–${year}` : `${FOOTER_START_YEAR}`;
  return (
    <footer className="site-footer shell">
      <div className="site-footer-inner">
        <a className="site-footer-who" href="https://ainsworth.dev" target="_blank" rel="noopener noreferrer">
          <PrideAvatar>
            <picture>
              <source srcSet={`/images/avatar-${AVATAR_VERSION}.webp`} type="image/webp" />
              <img
                src={`/images/avatar-${AVATAR_VERSION}.jpg`}
                alt="Sam Ainsworth"
                width={44}
                height={44}
                loading="lazy"
                style={{ width: 44, height: 44, borderRadius: 9999 }}
              />
            </picture>
          </PrideAvatar>
          <span>
            <strong>Made in Manchester by Sam Ainsworth</strong>
            ainsworth.dev
          </span>
        </a>
        <nav className="site-footer-links" aria-label="Elsewhere">
          <a href="https://github.com/sainsw/framemoji" target="_blank" rel="noopener noreferrer">
            Source on GitHub
          </a>
          <a href="https://ainsworth.dev" target="_blank" rel="noopener noreferrer">
            More projects
          </a>
        </nav>
      </div>
      <p className="site-footer-legal">
        © Sam Ainsworth {span}. Film data and posters from TMDB.
      </p>
    </footer>
  );
}
