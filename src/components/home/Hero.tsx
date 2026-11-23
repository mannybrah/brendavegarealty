import Link from "next/link";
import { HeroMotionToggle } from "./HeroMotionToggle";

// Cinematic still: a real photograph from one of Brenda's own listings, with a single
// slow "settle" on load (see .ed-hero-photo in editorial.css, off for reduced motion).
// It is a still image on purpose: no autoplay video, nothing that loops.
//
// The hero has a minimum height, not a fixed one, and the caption row sits in normal
// flow at the bottom, so the caption can never collide with the button on short screens.
export function Hero() {
  return (
    <section className="ed ed-hero">
      {/* eslint-disable-next-line @next/next/no-img-element -- static export; same srcset as the preload in app/page.tsx */}
      <img
        src="/images/home/hero-dining.jpg"
        srcSet="/images/home/hero-dining-sm.jpg 900w, /images/home/hero-dining.jpg 1600w"
        sizes="100vw"
        alt="Sunlit dining room framed by trees at 15540 Armsby Lane, Morgan Hill"
        width={1600}
        height={1066}
        fetchPriority="high"
        decoding="async"
        className="ed-hero-photo"
      />

      <div className="ed-hero-copy">
        <p className="ed-kicker">Campbell &amp; the Bay Area</p>
        <h1>
          A place to belong.
          <br />
          <em>A move to remember.</em>
        </h1>
        <p className="ed-hero-lede">
          Thoughtful real estate guidance.
          <br />
          For the life you&rsquo;re ready to live.
        </p>
        <div className="ed-hero-actions">
          <a className="ed-button" href="#properties">
            Discover your next chapter <span aria-hidden="true">↗</span>
          </a>
          <Link className="ed-hero-quiet" href="/home-clarity">
            Explore Home Clarity
          </Link>
        </div>
      </div>

      <div className="ed-hero-bottom">
        <div>
          LOCAL KNOWLEDGE. PERSONAL ATTENTION.
          <small>
            Featured photography &middot;{" "}
            <Link href="/listings/15540-armsby-ln">15540 Armsby Lane, Morgan Hill</Link>
          </small>
        </div>
        <HeroMotionToggle />
      </div>
    </section>
  );
}
