"use client";

import { useEffect, useState } from "react";
import { Listing } from "./listing";

let cached: Promise<Listing[] | null> | null = null;

function fetchListings(): Promise<Listing[] | null> {
  if (!cached) {
    cached = fetch("/api/public/listings")
      .then((r) => (r.ok ? (r.json() as Promise<{ listings: Listing[] }>).then((d) => d.listings) : null))
      .catch(() => null);
  }
  return cached;
}

export function useListings(): { listings: Listing[] | null; loading: boolean } {
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    fetchListings().then((d) => {
      if (!alive) return;
      setListings(d);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);
  return { listings, loading };
}
