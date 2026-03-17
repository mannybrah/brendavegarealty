import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";
import { SectionLabel } from "@/components/ui/SectionLabel";
import Link from "next/link";

const placeholderListings = [
  { id: "1", address: "123 Main St, Campbell", price: "$1,250,000", beds: 3, baths: 2, sqft: "1,800" },
  { id: "2", address: "456 Oak Ave, San Jose", price: "$985,000", beds: 4, baths: 3, sqft: "2,200" },
  { id: "3", address: "789 Elm Dr, Los Gatos", price: "$2,100,000", beds: 4, baths: 3, sqft: "2,800" },
];

export function FeaturedListings() {
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
          {placeholderListings.map((listing, i) => (
            <AnimateOnScroll key={listing.id} delay={i * 0.1}>
              <div className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                <div className="h-48 bg-gradient-to-br from-navy to-navy-light relative">
                  <span className="absolute top-4 left-4 bg-gold text-navy font-ui font-medium text-xs tracking-wider px-3 py-1 rounded-full">
                    Featured
                  </span>
                </div>
                <div className="p-5">
                  <div className="font-display font-semibold text-xl text-navy mb-1">
                    {listing.price}
                  </div>
                  <div className="font-body font-light text-sm text-charcoal-light mb-3">
                    {listing.address}
                  </div>
                  <div className="flex gap-4 text-xs font-body text-charcoal-light">
                    <span>{listing.beds} bed</span>
                    <span>{listing.baths} bath</span>
                    <span>{listing.sqft} sqft</span>
                  </div>
                </div>
              </div>
            </AnimateOnScroll>
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
