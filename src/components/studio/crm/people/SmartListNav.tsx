"use client";

// Smart list navigation. Desktop renders the 240px sidebar column; mobile
// renders the same items as a horizontal scroll chip row above the search.

import Link from "next/link";

export interface SmartListNavItem {
  id: string | null; // null = "All People"
  name: string;
  description?: string;
  count: number;
}

export function SmartListNav({
  items,
  activeId,
  hrefFor,
  variant,
}: {
  items: SmartListNavItem[];
  activeId: string | null;
  hrefFor: (id: string | null) => string;
  variant: "sidebar" | "chips";
}) {
  if (variant === "chips") {
    return (
      // pb-3/-mb-2 keeps the overlay scrollbar (iOS PWA) below the chips.
      <nav aria-label="Smart lists" className="flex gap-2 overflow-x-auto pb-3 -mb-2">
        {items.map((it) => {
          const active = it.id === activeId;
          return (
            <Link
              key={it.id ?? "all"}
              href={hrefFor(it.id)}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 font-ui text-xs tracking-wider uppercase px-3.5 py-2 rounded-full border transition-colors ${
                active ? "bg-navy text-gold border-navy" : "bg-white text-navy border-navy/20 hover:border-navy/40"
              }`}
            >
              {it.name}
              <span className="ml-1.5 tabular-nums opacity-70">{it.count}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav aria-label="Smart lists" className="sticky top-20">
      <div className="font-ui text-[0.65rem] tracking-wider uppercase text-charcoal-light px-3 mb-2">Lists</div>
      <ul className="space-y-0.5">
        {items.map((it) => {
          const active = it.id === activeId;
          return (
            <li key={it.id ?? "all"}>
              <Link
                href={hrefFor(it.id)}
                aria-current={active ? "page" : undefined}
                title={it.description}
                className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 transition-colors ${
                  active ? "bg-navy text-gold" : "text-navy hover:bg-navy/5"
                }`}
              >
                <span className="font-body text-sm truncate">{it.name}</span>
                <span
                  className={`font-ui text-[0.65rem] tabular-nums shrink-0 rounded-full px-1.5 py-0.5 ${
                    active ? "bg-white/10 text-gold" : "bg-navy/5 text-charcoal-light"
                  }`}
                >
                  {it.count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
