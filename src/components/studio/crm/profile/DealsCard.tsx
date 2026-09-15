"use client";

import Link from "next/link";
import type { DealWithProgress } from "@/lib/crm/types";
import { Card, EmptyState, SectionTitle } from "@/components/studio/crm/ui";

export function DealsCard({ deals, onStart }: { deals: DealWithProgress[]; onStart: () => void }) {
  return (
    <Card className="p-4 space-y-3">
      <SectionTitle
        count={deals.length || undefined}
        action={
          <button type="button" onClick={onStart} className="font-ui text-[0.65rem] tracking-wider uppercase text-teal hover:text-navy min-h-10 px-1">
            + Start deal
          </button>
        }
      >
        Deals
      </SectionTitle>

      {deals.length === 0 && <EmptyState>No deals yet.</EmptyState>}

      <div className="space-y-2">
        {deals.map((d) => {
          const pct = d.milestonesTotal > 0 ? Math.round((d.milestonesDone / d.milestonesTotal) * 100) : 0;
          return (
            <Link
              key={d.id}
              href={`/studio/crm/deal?id=${d.id}`}
              className="block bg-white rounded-xl border border-navy/10 p-3.5 hover:border-navy/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg shrink-0" aria-hidden="true">
                    {d.side === "buyer" ? "🏠" : "💰"}
                  </span>
                  <span className="font-body text-sm text-navy truncate">{d.property_address || "No address yet"}</span>
                </div>
                <span className="font-ui text-[0.6rem] tracking-wider uppercase text-charcoal-light shrink-0">{d.status}</span>
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <div className="flex-1 h-1 rounded-full bg-navy/10 overflow-hidden" aria-hidden="true">
                  <div className="h-full bg-gold rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="font-ui text-[0.65rem] text-charcoal-light tabular-nums shrink-0">
                  {d.milestonesDone}/{d.milestonesTotal} milestones
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
