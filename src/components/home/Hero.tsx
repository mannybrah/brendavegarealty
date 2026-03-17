"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function Hero() {
  return (
    <section className="min-h-[calc(100vh-72px)] flex items-center px-6 py-16">
      <div className="max-w-[1200px] mx-auto grid desktop:grid-cols-2 gap-16 items-center w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.2, 0, 0, 1] }}
        >
          <span className="font-body font-medium text-[0.65rem] tracking-[0.4em] uppercase text-gold mb-5 block">
            Bay Area Real Estate Expert
          </span>
          <h1 className="font-display font-light text-[clamp(2.5rem,4vw,3.8rem)] leading-[1.1] text-navy mb-6">
            Your Next Chapter
            <br />
            Starts <em className="text-teal">Here</em>
          </h1>
          <p className="font-body font-light text-lg leading-relaxed text-charcoal-light mb-9 max-w-[460px]">
            Trusted by families across Campbell and the Bay Area to navigate the
            biggest decisions of their lives — with expertise, honesty, and
            heart.
          </p>
          <div className="flex gap-4 flex-wrap">
            <Link href="/contact#schedule">
              <Button variant="primary">Schedule a Call</Button>
            </Link>
            <Link href="/listings">
              <Button variant="outline">Browse Listings</Button>
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.2, 0, 0, 1] }}
          className="relative h-[400px] desktop:h-[500px] rounded-2xl overflow-hidden bg-gradient-to-br from-navy to-navy-light"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(200,165,91,0.15),transparent_50%),radial-gradient(circle_at_70%_30%,rgba(42,127,111,0.1),transparent_50%)]" />
          <div className="absolute inset-5 border border-gold/20 rounded-lg" />
          <span className="absolute bottom-8 left-8 font-body font-light text-sm text-gold/60 tracking-wider">
            Professional photo of Brenda
          </span>
        </motion.div>
      </div>
    </section>
  );
}
