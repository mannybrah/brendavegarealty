"use client";

import { useEffect, useState } from "react";

interface CrmSummary {
  newLeads: number;
  dueToday: number;
}

// Renders as two big gold serif numerals inside the navy "Clients" hero card
// on the studio dashboard. Renders nothing while loading or on error — the
// hero card's own title/description carry the card in that case.
export function SummaryStrip() {
  const [summary, setSummary] = useState<CrmSummary | null>(null);

  useEffect(() => {
    fetch("/api/studio/crm/summary", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: CrmSummary | null) => setSummary(j))
      .catch(() => {});
  }, []);

  if (!summary) return null;

  return (
    <div className="flex items-center gap-6 mt-2">
      <div>
        <div className="font-display text-3xl text-gold leading-none">{summary.newLeads}</div>
        <div className="font-ui text-[0.6rem] tracking-wider uppercase text-cream/60 mt-1">New leads</div>
      </div>
      <span className="w-px h-8 bg-white/15" />
      <div>
        <div className="font-display text-3xl text-gold leading-none">{summary.dueToday}</div>
        <div className="font-ui text-[0.6rem] tracking-wider uppercase text-cream/60 mt-1">Due today</div>
      </div>
    </div>
  );
}
