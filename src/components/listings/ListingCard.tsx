"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Listing, LISTING_STATUS_LABELS } from "@/lib/listing";

interface ListingCardProps {
  listing: Listing;
  index?: number;
  compact?: boolean;
  muted?: boolean;
}

export function ListingCard({ listing, index = 0, compact = false, muted = false }: ListingCardProps) {
  const reduced = useReducedMotion();
  const coverKey = listing.photoKeys[listing.coverIndex] ?? listing.photoKeys[0];

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.2, 0, 0, 1] }}
    >
      <Link
        href={`/listings/${listing.slug}`}
        className={`group block bg-white rounded-md overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all ${
          muted ? "opacity-75" : ""
        }`}
      >
        <div
          className={`relative bg-gradient-to-br from-navy to-navy-light ${compact ? "h-32" : "h-48"}`}
        >
          {coverKey && (
            // eslint-disable-next-line @next/next/no-img-element -- runtime R2 image, not optimizable at build
            <img
              src={`/media/${coverKey}`}
              alt={listing.address}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )}
          <span className="absolute top-4 left-4 bg-gold text-navy font-ui font-medium text-xs tracking-wider px-3 py-1 rounded-full">
            {LISTING_STATUS_LABELS[listing.status]}
          </span>
        </div>
        <div className={compact ? "p-4" : "p-5"}>
          <div className={`font-display font-semibold text-navy mb-1 ${compact ? "text-lg" : "text-xl"}`}>
            {listing.price || "Price upon request"}
          </div>
          <div className="font-body font-light text-sm text-charcoal-light mb-3">
            {listing.address}
            {listing.city ? `, ${listing.city}` : ""}
          </div>
          {(listing.beds != null || listing.baths != null || listing.sqft != null) && (
            <div className="flex gap-4 text-xs font-body text-charcoal-light">
              {listing.beds != null && <span>{listing.beds} bed</span>}
              {listing.baths != null && <span>{listing.baths} bath</span>}
              {listing.sqft != null && <span>{listing.sqft.toLocaleString()} sqft</span>}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
