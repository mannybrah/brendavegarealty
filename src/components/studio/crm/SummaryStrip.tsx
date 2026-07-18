"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface CrmSummary {
  newLeads: number;
  dueToday: number;
}

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
    <div className="flex items-center gap-4 bg-navy rounded-2xl px-5 py-3 mb-4">
      <Link
        href="/studio/crm"
        className="font-ui text-xs tracking-wider uppercase text-gold-light flex items-center gap-1.5"
      >
        <span>🔵</span> {summary.newLeads} new
      </Link>
      <span className="w-px h-4 bg-white/15" />
      <Link
        href="/studio/crm/tasks"
        className="font-ui text-xs tracking-wider uppercase text-gold-light flex items-center gap-1.5"
      >
        <span>✅</span> {summary.dueToday} due today
      </Link>
    </div>
  );
}
