"use client";

import Link from "next/link";
import { useListings } from "@/lib/useListings";
import { Listing, LISTING_STATUS_LABELS } from "@/lib/listing";

// "A closer look": one large photograph, then two staggered ones. Still driven by
// Brenda's live listing data: the address, city, status and photos are whatever her
// studio says they are right now. An active listing is featured first; otherwise the
// home pictured in the hero, with its real status shown. With no listings at all the
// section does not render.
const HERO_LISTING_SLUG = "15540-armsby-ln";

// Hand-picked gallery photographs (index into the listing's photos) and their captions,
// for listings where the choice has been made by eye. Any other listing falls back to
// two photos spread across its set, captioned plainly.
const CURATED_GALLERY: Record<string, { index: number; caption: string; alt: string }[]> = {
  "15540-armsby-ln": [
    { index: 3, caption: "Light, texture & room to breathe", alt: "Light-filled living room at 15540 Armsby Lane" },
    { index: 7, caption: "A connection to the outdoors", alt: "Dining space with windows facing the trees" },
  ],
};

function pickFeatured(listings: Listing[]): Listing | null {
  const withPhotos = listings.filter((l) => l.photoKeys.length > 0);
  if (withPhotos.length === 0) return null;
  const active = withPhotos.find((l) => l.status !== "sold");
  if (active) return active;
  // Nothing active: show the home pictured in the hero if it is still published,
  // otherwise the first listing the studio returns
  return withPhotos.find((l) => l.slug === HERO_LISTING_SLUG) ?? withPhotos[0];
}

function galleryFor(listing: Listing, cover: string): { key: string; caption: string; alt: string }[] {
  const curated = (CURATED_GALLERY[listing.slug] ?? [])
    .map((c) => ({ key: listing.photoKeys[c.index], caption: c.caption, alt: c.alt }))
    .filter((c) => c.key && c.key !== cover);
  if (curated.length === 2) return curated;

  const rest = listing.photoKeys.filter((k) => k !== cover);
  // Spread the picks so the pair is not two shots of one room
  const step = Math.max(1, Math.floor(rest.length / 3));
  return [rest[step], rest[step * 2]]
    .filter(Boolean)
    .map((key) => ({ key, caption: listing.address, alt: `Inside ${listing.address}` }));
}

export function FeaturedProperty() {
  const { listings, loading } = useListings();
  const listing = listings ? pickFeatured(listings) : null;

  if (!loading && !listing) return null;

  const cover = listing ? (listing.photoKeys[listing.coverIndex] ?? listing.photoKeys[0]) : null;
  const gallery = listing && cover ? galleryFor(listing, cover) : [];
  const href = listing ? `/listings/${listing.slug}` : "/listings";
  const sold = listing?.status === "sold";
  const facts = listing
    ? [
        listing.city,
        // An asking price is only shown while the home is actually on the market
        !sold && listing.price ? listing.price : null,
        listing.beds != null ? `${listing.beds} bed` : null,
        listing.baths != null ? `${listing.baths} bath` : null,
        listing.sqft != null ? `${listing.sqft.toLocaleString()} sq ft` : null,
      ].filter(Boolean)
    : [];

  return (
    <section className="ed ed-section" id="properties" aria-labelledby="featured-heading">
      <div className="ed-section-head">
        <div>
          <p className="ed-kicker">A closer look</p>
          <h2 id="featured-heading">
            Spaces with <em>soul.</em>
          </h2>
        </div>
        <Link className="ed-textlink" href="/listings">
          Explore Brenda&rsquo;s listings <span aria-hidden="true">↗</span>
        </Link>
      </div>

      <Link className="ed-feature" href={href} aria-label={listing ? `${listing.address}, ${listing.city}` : "Listings"}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- runtime R2 image, not optimizable at build
          <img src={`/media/${cover}`} alt={`${listing!.address}, ${listing!.city}`} loading="lazy" decoding="async" />
        ) : (
          // Reserves the photograph's space while the listing loads
          <span className="ed-feature-blank" />
        )}
        {listing && (
          <span className="ed-image-labels">
            <span className="ed-image-label">Property spotlight &middot; {listing.city}</span>
            <span className="ed-image-label ed-image-label-status">{LISTING_STATUS_LABELS[listing.status]}</span>
          </span>
        )}
      </Link>

      <div className="ed-property-caption">
        <div>
          <h3>{listing ? listing.address : " "}</h3>
          <p>{listing ? facts.join(" · ") : " "}</p>
        </div>
        <Link className="ed-textlink" href={href}>
          Explore the property &amp; current details <span aria-hidden="true">↗</span>
        </Link>
      </div>

      {gallery.length === 2 && (
        <div className="ed-gallery">
          {gallery.map((photo, i) => (
            <figure key={photo.key}>
              <Link className="ed-gallery-frame" href={href} tabIndex={-1} aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element -- runtime R2 image, not optimizable at build */}
                <img src={`/media/${photo.key}`} alt="" loading="lazy" decoding="async" />
              </Link>
              <figcaption>
                <span className="sr-only">{photo.alt}. </span>0{i + 1} / {photo.caption}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
