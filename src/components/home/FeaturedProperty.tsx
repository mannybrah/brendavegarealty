"use client";

import Link from "next/link";
import { useListings } from "@/lib/useListings";
import { Listing, LISTING_STATUS_LABELS } from "@/lib/listing";

// Featured property + editorial gallery, driven entirely by Brenda's live listing data:
// status, price and photos are whatever her studio says they are right now. An active
// listing is featured first; otherwise the most recently published one, with its real
// status shown. With no listings at all the section does not render.
const HERO_LISTING_SLUG = "15540-armsby-ln";

function pickFeatured(listings: Listing[]): Listing | null {
  const withPhotos = listings.filter((l) => l.photoKeys.length > 0);
  if (withPhotos.length === 0) return null;
  const active = withPhotos.find((l) => l.status !== "sold");
  if (active) return active;
  // Nothing active: show the home pictured in the hero if it is still published,
  // otherwise the first listing the studio returns
  return withPhotos.find((l) => l.slug === HERO_LISTING_SLUG) ?? withPhotos[0];
}

function galleryKeys(listing: Listing): string[] {
  const cover = listing.photoKeys[listing.coverIndex] ?? listing.photoKeys[0];
  const rest = listing.photoKeys.filter((k) => k !== cover);
  // Spread picks across the set so the gallery is not five shots of one room
  const step = Math.max(1, Math.floor(rest.length / 4));
  const picks = [0, 1, 2, 3].map((i) => rest[i * step]).filter(Boolean);
  return [cover, ...picks];
}

export function FeaturedProperty() {
  const { listings, loading } = useListings();
  const listing = listings ? pickFeatured(listings) : null;

  if (!loading && !listing) return null;

  const keys = listing ? galleryKeys(listing) : [];
  const facts = listing
    ? [
        listing.beds != null ? `${listing.beds} bed` : null,
        listing.baths != null ? `${listing.baths} bath` : null,
        listing.sqft != null ? `${listing.sqft.toLocaleString()} sq ft` : null,
      ].filter(Boolean)
    : [];

  return (
    <section className="bg-cream px-6 desktop:px-10 py-20 desktop:py-28" aria-labelledby="featured-heading">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex flex-col desktop:flex-row desktop:items-end desktop:justify-between gap-6 mb-10 desktop:mb-14">
          <div>
            <p className="font-body font-medium text-[0.68rem] tracking-[0.38em] uppercase text-gold mb-5">
              Featured property
            </p>
            <h2 id="featured-heading" className="font-display font-light text-navy leading-[1.05] text-[clamp(2.2rem,4.6vw,4rem)]">
              {listing ? listing.address : " "}
            </h2>
            {listing && (
              <p className="font-body font-light text-base text-charcoal-light mt-4">
                {[listing.city, ...facts].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <Link
            href="/listings"
            className="self-start desktop:self-auto font-ui font-medium text-[0.76rem] tracking-[0.14em] uppercase text-navy border-b border-gold pb-1 hover:text-teal transition-colors"
          >
            View all listings &rarr;
          </Link>
        </div>

        {/* Fixed aspect ratios reserve the space before the photos arrive */}
        <div className="grid gap-3 desktop:gap-4 desktop:grid-cols-[3fr_2fr]">
          <Link
            href={listing ? `/listings/${listing.slug}` : "/listings"}
            className="group relative block aspect-[3/2] overflow-hidden bg-navy/10"
          >
            {keys[0] && (
              // eslint-disable-next-line @next/next/no-img-element -- runtime R2 image, not optimizable at build
              <img
                src={`/media/${keys[0]}`}
                alt={`${listing!.address}, ${listing!.city}`}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]"
              />
            )}
            {listing && (
              <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-navy/85 to-transparent flex items-end justify-between gap-4">
                <div>
                  <span className="inline-block bg-gold text-navy font-ui font-medium text-[0.68rem] tracking-[0.14em] uppercase px-3 py-1.5">
                    {LISTING_STATUS_LABELS[listing.status]}
                  </span>
                  {listing.price && (
                    <p className="font-display font-normal text-2xl text-cream mt-3">{listing.price}</p>
                  )}
                </div>
                <span className="font-ui font-medium text-[0.72rem] tracking-[0.14em] uppercase text-cream">
                  View the home &rarr;
                </span>
              </div>
            )}
          </Link>
          <div className="grid grid-cols-2 gap-3 desktop:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Link
                key={i}
                href={listing ? `/listings/${listing.slug}` : "/listings"}
                className="group relative block aspect-[4/3] desktop:aspect-auto overflow-hidden bg-navy/10"
                tabIndex={-1}
                aria-hidden="true"
              >
                {keys[i] && (
                  // eslint-disable-next-line @next/next/no-img-element -- runtime R2 image, not optimizable at build
                  <img
                    src={`/media/${keys[i]}`}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
                  />
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
