"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StudioShell } from "@/components/studio/StudioShell";
import { Listing, LISTING_STATUS_LABELS, ListingStatus } from "@/lib/listing";

const STATUS_STYLE: Record<ListingStatus, string> = {
  "just-listed": "bg-teal/15 text-teal",
  "open-house": "bg-gold/20 text-gold",
  pending: "bg-navy/10 text-navy/50",
  sold: "bg-charcoal/10 text-charcoal-light",
};

export default function ListingsListPage() {
  return (
    <StudioShell title="Listings" backHref="/studio">
      <ListingsList />
    </StudioShell>
  );
}

function ListingsList() {
  const [listings, setListings] = useState<Listing[] | null>(null);

  useEffect(() => {
    fetch("/api/studio/listing", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { listings: [] }))
      .then((j: { listings: Listing[] }) => setListings(j.listings))
      .catch(() => setListings([]));
  }, []);

  return (
    <div className="space-y-4">
      <Link
        href="/studio/listings/new"
        className="block w-full bg-teal text-white text-center font-ui font-medium text-sm tracking-wider uppercase py-4 rounded-xl active:scale-[0.98] transition-transform"
      >
        + Add a Listing
      </Link>
      {listings === null && <div className="font-body text-sm text-charcoal-light">Loading…</div>}
      {listings !== null && listings.length === 0 && (
        <div className="font-body text-sm text-charcoal-light">
          No listings yet. Paste a listing site URL to get started.
        </div>
      )}
      {listings !== null && listings.length > 0 && (
        <div className="bg-white rounded-2xl border border-navy/5 divide-y divide-navy/5">
          {listings.map((l) => {
            const coverKey = l.photoKeys[l.coverIndex] ?? l.photoKeys[0];
            return (
              <Link key={l.id} href={`/studio/listings/edit?id=${l.id}`} className="flex items-center gap-3 p-4">
                {coverKey ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/media/${coverKey}`} alt="" className="w-14 h-14 rounded-md object-cover shrink-0" />
                ) : (
                  <span className="w-14 h-14 rounded-md bg-navy/5 flex items-center justify-center shrink-0 text-xl">
                    🏡
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-body text-sm text-navy truncate">{l.address || "Untitled listing"}</div>
                  <div className="font-ui text-[0.65rem] tracking-wider uppercase text-charcoal-light mt-0.5 truncate">
                    {l.city}
                    {l.price ? ` · ${l.price}` : ""}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className={`font-ui text-[0.6rem] tracking-wider uppercase px-2.5 py-1 rounded-full ${STATUS_STYLE[l.status]}`}>
                      {LISTING_STATUS_LABELS[l.status]}
                    </span>
                    <span
                      className={`font-ui text-[0.6rem] tracking-wider uppercase px-2.5 py-1 rounded-full ${
                        l.live ? "bg-teal text-white" : "bg-navy/10 text-charcoal-light"
                      }`}
                    >
                      {l.live ? "Live" : "Draft"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
