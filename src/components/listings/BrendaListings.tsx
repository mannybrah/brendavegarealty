"use client";

import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { useListings } from "@/lib/useListings";
import { ListingCard } from "@/components/listings/ListingCard";

export function BrendaListings() {
  const { listings } = useListings();
  const all = listings ?? [];

  if (all.length === 0) return null;

  const active = all.filter((l) => l.status !== "sold");
  const sold = all.filter((l) => l.status === "sold");

  return (
    <section className="py-20 px-6">
      <div className="max-w-[1200px] mx-auto">
        {active.length > 0 && (
          <>
            <AnimateOnScroll>
              <SectionLabel>Listings</SectionLabel>
              <h2 className="font-display font-light text-[clamp(2rem,4vw,3.2rem)] text-navy mt-4 mb-12 leading-tight">
                Brenda&apos;s <em className="text-teal italic">listings</em>
              </h2>
            </AnimateOnScroll>
            <div className="grid tablet:grid-cols-2 desktop:grid-cols-3 gap-6">
              {active.map((listing, i) => (
                <ListingCard key={listing.id} listing={listing} index={i} />
              ))}
            </div>
          </>
        )}

        {sold.length > 0 && (
          <div className={active.length > 0 ? "mt-20 pt-12 border-t border-gold/20" : ""}>
            <AnimateOnScroll>
              <SectionLabel>Sold</SectionLabel>
              <h3 className="font-display font-light text-2xl text-navy mt-4 mb-8 leading-tight">
                Recently <em className="text-teal italic">sold</em>
              </h3>
            </AnimateOnScroll>
            <div className="grid tablet:grid-cols-3 desktop:grid-cols-4 gap-4">
              {sold.map((listing, i) => (
                <ListingCard key={listing.id} listing={listing} index={i} compact muted />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
