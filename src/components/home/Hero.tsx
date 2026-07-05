"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.2, 0, 0, 1] as const } },
};

// Ambient background video only on larger screens with motion allowed —
// phones and reduced-motion users get the golden-hour poster frame instead.
function AmbientBackground() {
  const reduced = useReducedMotion();
  const [playVideo, setPlayVideo] = useState(false);

  useEffect(() => {
    if (reduced) return;
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setPlayVideo(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [reduced]);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {playVideo ? (
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src="/videos/hero-ambient.mp4"
          poster="/videos/hero-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- static poster fallback
        <img
          src="/videos/hero-poster.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-navy/90 via-navy/75 to-navy/55" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-navy/60 to-transparent" />
    </div>
  );
}

export function Hero() {
  const reduced = useReducedMotion();
  return (
    <section className="relative min-h-[calc(100vh-72px)] flex items-center px-6 py-16">
      <AmbientBackground />
      <div className="relative max-w-[1200px] mx-auto grid desktop:grid-cols-2 gap-16 items-center w-full">
        <motion.div
          variants={container}
          initial={reduced ? false : "hidden"}
          animate="show"
        >
          <motion.span
            variants={item}
            className="font-body font-medium text-[0.65rem] tracking-[0.4em] uppercase text-gold mb-5 block"
          >
            Bay Area Real Estate Expert
          </motion.span>
          <motion.h1
            variants={item}
            className="font-display font-light text-[clamp(2.5rem,4vw,3.8rem)] leading-[1.1] text-cream mb-6"
          >
            Your Next Chapter
            <br />
            Starts <em className="text-gold">Here</em>
          </motion.h1>
          <motion.p
            variants={item}
            className="font-body font-light text-lg leading-relaxed text-cream/80 mb-9 max-w-[460px]"
          >
            Trusted by families across Campbell and the Bay Area to navigate the
            biggest decisions of their lives — with expertise, honesty, and
            heart.
          </motion.p>
          <motion.div variants={item} className="flex gap-4 flex-wrap">
            <Link href="/contact#schedule">
              <Button variant="gold">Schedule a Call</Button>
            </Link>
            <Link href="/listings">
              <Button
                variant="outline"
                className="text-cream! border-cream/40! hover:bg-cream/10! hover:border-cream/70! hover:text-cream!"
              >
                Browse Listings
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.2, 0, 0, 1] }}
          className="relative h-[400px] desktop:h-[500px] rounded-md overflow-hidden shadow-2xl shadow-navy/50"
        >
          <Image
            src="/images/brenda-headshot.jpg"
            alt="Brenda Vega — Bay Area Real Estate Agent"
            fill
            className="object-cover object-top"
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy/30 to-transparent" />
          <div className="absolute inset-5 border border-gold/30 rounded-sm" />
        </motion.div>
      </div>
    </section>
  );
}
