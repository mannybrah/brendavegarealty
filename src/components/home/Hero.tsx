import Link from "next/link";

// Cinematic still: a real photograph from one of Brenda's own listings, with a single
// slow "settle" on load (see .hero-settle in globals.css, disabled for reduced motion).
// It is a still image on purpose: no autoplay video, nothing that loops.
export function Hero() {
  return (
    <section className="relative -mt-[72px] min-h-[100svh] flex items-end overflow-hidden bg-navy">
      {/* eslint-disable-next-line @next/next/no-img-element -- static export; same srcset as the preload in app/page.tsx */}
      <img
        src="/images/home/hero.jpg"
        srcSet="/images/home/hero-sm.jpg 900w, /images/home/hero.jpg 1600w"
        sizes="100vw"
        alt="Sunlit living room with vaulted ceilings in a Morgan Hill home represented by Brenda Vega"
        width={1600}
        height={1066}
        fetchPriority="high"
        decoding="async"
        className="hero-settle absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/45 to-navy/25" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-r from-navy/50 to-transparent" aria-hidden="true" />

      <div className="relative w-full max-w-[1280px] mx-auto px-6 desktop:px-10 pt-40 pb-16 desktop:pb-24">
        <p className="hero-rise font-body font-medium text-[0.68rem] tracking-[0.38em] uppercase text-gold-light mb-6">
          Brenda Vega &middot; REALTOR&reg; &middot; Silicon Valley
        </p>
        <h1 className="hero-rise hero-rise-2 font-display font-light text-cream leading-[1.02] text-[clamp(2.7rem,7.2vw,6rem)] max-w-[13ch]">
          A place to belong. <em className="text-gold-light">A move to remember.</em>
        </h1>
        <div className="hero-rise hero-rise-3 mt-10 flex flex-wrap gap-4">
          <Link
            href="/contact#schedule"
            className="inline-flex items-center justify-center h-[52px] px-8 bg-gold text-navy font-ui font-medium text-[0.78rem] tracking-[0.14em] uppercase hover:bg-gold-light transition-colors"
          >
            Start a conversation
          </Link>
          <Link
            href="/home-clarity"
            className="inline-flex items-center justify-center h-[52px] px-8 border border-cream/60 text-cream font-ui font-medium text-[0.78rem] tracking-[0.14em] uppercase hover:bg-cream hover:text-navy transition-colors"
          >
            Explore Home Clarity
          </Link>
        </div>
        <p className="hero-rise hero-rise-3 mt-10 font-body font-light text-xs text-cream/60">
          Pictured:{" "}
          <Link href="/listings/15540-armsby-ln" className="underline underline-offset-4 hover:text-cream">
            15540 Armsby Ln, Morgan Hill
          </Link>
        </p>
      </div>
    </section>
  );
}
