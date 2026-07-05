"use client";

import { useEffect, useState } from "react";
import { HomeState } from "./feed";

let cached: Promise<HomeState | null> | null = null;

function fetchHomeState(): Promise<HomeState | null> {
  if (!cached) {
    cached = fetch("/api/public/home-state")
      .then((r) => (r.ok ? (r.json() as Promise<HomeState>) : null))
      .catch(() => null);
  }
  return cached;
}

export function useHomeState(): { data: HomeState | null; loading: boolean } {
  const [data, setData] = useState<HomeState | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    fetchHomeState().then((d) => {
      if (!alive) return;
      setData(d);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);
  return { data, loading };
}
