"use client";

// Sort control for the People list. Picking the active key flips direction,
// picking another key uses that key's natural default direction.

import { useEffect, useRef, useState } from "react";
import { SORT_KEYS, SORT_LABELS, type SortKey } from "@/lib/crm/filters";

export const DEFAULT_SORT_DIR: Record<SortKey, "asc" | "desc"> = {
  name: "asc",
  // Ascending = least recently contacted first, which is the useful default.
  last_communication: "asc",
  last_activity: "desc",
  created: "desc",
  stage: "asc",
};

export function SortMenu({
  sort,
  dir,
  onChange,
}: {
  sort: SortKey;
  dir: "asc" | "desc";
  onChange: (sort: SortKey, dir: "asc" | "desc") => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(key: SortKey) {
    setOpen(false);
    if (key === sort) onChange(key, dir === "asc" ? "desc" : "asc");
    else onChange(key, DEFAULT_SORT_DIR[key]);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 bg-white border border-navy/20 text-navy hover:border-navy/40 font-ui text-xs tracking-wider uppercase rounded-md px-3 py-2.5 transition-colors whitespace-nowrap"
      >
        <span className="text-charcoal-light">Sort</span>
        <span className="hidden sm:inline">{SORT_LABELS[sort]}</span>
        <span aria-hidden="true">{dir === "asc" ? "↑" : "↓"}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1 z-50 bg-white border border-navy/10 rounded-lg shadow-lg min-w-[220px] py-1"
        >
          {SORT_KEYS.map((k) => {
            const active = k === sort;
            return (
              <button
                key={k}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => pick(k)}
                className={`w-full flex items-center justify-between gap-3 text-left font-body text-sm px-4 py-2.5 hover:bg-cream ${
                  active ? "text-navy" : "text-charcoal"
                }`}
              >
                <span>{SORT_LABELS[k]}</span>
                {active && (
                  <span className="text-teal" aria-hidden="true">
                    {dir === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
