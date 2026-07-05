"use client";

import Link from "next/link";
import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { useListings } from "@/lib/useListings";
import { ListingCard } from "@/components/listings/ListingCard";

export function FeaturedListings() {
  const { listings } = useListings();
  const active = (listings ?? []).filter((l) => l.status !== "sold").slice(0, 3);

  if (active.length === 0) return null;

  return (
    <section className="py-20 px-6">
      <div className="max-w-[1200px] mx-auto">
        <AnimateOnScroll>
          <SectionLabel>Featured Properties</SectionLabel>
          <h2 className="font-display font-light text-[clamp(2rem,4vw,3.2rem)] text-navy mt-4 mb-12 leading-tight">
            Latest <em className="text-teal italic">listings</em>
          </h2>
        </AnimateOnScroll>

        <div className="grid tablet:grid-cols-2 desktop:grid-cols-3 gap-6">
          {active.map((listing, i) => (
            <ListingCard key={listing.id} listing={listing} index={i} />
          ))}
        </div>

        <AnimateOnScroll>
          <div className="text-center mt-8">
            <Link
              href="/listings"
              className="font-ui font-medium text-xs tracking-wider uppercase text-charcoal-light hover:text-gold transition-colors"
            >
              View All Listings &rarr;
            </Link>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
