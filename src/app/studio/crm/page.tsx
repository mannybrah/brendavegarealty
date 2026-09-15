"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CrmShell } from "@/components/studio/crm/CrmShell";
import {
  Avatar,
  Btn,
  Card,
  ErrorText,
  SectionTitle,
  cardCls,
  crmJson,
  labelCls,
} from "@/components/studio/crm/ui";
import { EVENT_ICON, type EventRow } from "@/lib/crm/types";
import { displayName, relativeTime } from "@/lib/crm/format";
import { clearListNav } from "@/lib/crm/nav";

interface SmartListCount {
  id: string;
  name: string;
  description: string;
  count: number;
}

type RecentRow = EventRow & { contact_first: string; contact_last: string };

interface DashboardData {
  newLeads: number;
  unactioned: number;
  tasksToday: number;
  tasksOverdue: number;
  dealsClosing30: number;
  smartLists: SmartListCount[];
  recent: RecentRow[];
  today: string;
}

export default function CrmDashboardPage() {
  return (
    <CrmShell title="Dashboard">
      <DashboardInner />
    </CrmShell>
  );
}

function DashboardInner() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    crmJson<DashboardData>("/api/studio/crm/dashboard")
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setFailed(false);
    setAttempt((n) => n + 1);
  }, []);

  if (failed) {
    return (
      <div className="space-y-3">
        <ErrorText>{"Couldn't load the dashboard."}</ErrorText>
        <Btn variant="ghost" onClick={retry} className="px-0">
          Retry
        </Btn>
      </div>
    );
  }

  if (!data) return <div className="font-body text-sm text-charcoal-light">Loading…</div>;

  const needsContact = data.smartLists.find((l) => l.id === "needs_contact");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile
          href="/studio/crm/people?stages=new"
          caption="New leads"
          value={data.newLeads}
          sub={data.unactioned > 0 ? `${data.unactioned} unactioned` : "All actioned"}
          tone={data.unactioned > 0 ? "gold" : "muted"}
        />
        <Tile
          href="/studio/crm/tasks"
          caption="Tasks today"
          value={data.tasksToday}
          sub={data.tasksOverdue > 0 ? `${data.tasksOverdue} overdue` : "Nothing overdue"}
          tone={data.tasksOverdue > 0 ? "red" : "muted"}
        />
        <Tile
          href="/studio/crm/pipeline"
          caption="Deals closing"
          value={data.dealsClosing30}
          sub="Next 30 days"
          tone="muted"
        />
        <Tile
          href="/studio/crm/people?list=needs_contact"
          caption="Needs contact"
          value={needsContact?.count ?? 0}
          sub="Reach out today"
          tone="muted"
        />
      </div>

      <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-[1fr_1.4fr] lg:gap-6 lg:items-start">
        <section className="space-y-3">
          <SectionTitle>Smart lists</SectionTitle>
          <Card className="divide-y divide-navy/5 overflow-hidden">
            {data.smartLists.map((l) => (
              <Link
                key={l.id}
                href={`/studio/crm/people?list=${l.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-navy/[0.03] transition-colors"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-body text-sm text-navy">{l.name}</span>
                  <span className="block font-body font-light text-xs text-charcoal-light">{l.description}</span>
                </span>
                <span className="shrink-0 font-ui text-xs tabular-nums text-navy bg-navy/5 rounded-full px-2.5 py-1">
                  {l.count}
                </span>
              </Link>
            ))}
          </Card>
        </section>

        <section className="space-y-3">
          <SectionTitle>Recent activity</SectionTitle>
          <Card className="divide-y divide-navy/5 overflow-hidden">
            {data.recent.length === 0 && (
              <div className="px-4 py-3 font-body font-light text-sm text-charcoal-light">No activity yet.</div>
            )}
            {data.recent.slice(0, 15).map((e) => (
              <Link
                key={e.id}
                href={`/studio/crm/contact?id=${e.contact_id}`}
                // People is the only writer of the list-nav snapshot. Opening a
                // profile from here must drop it, or back/prev/next would walk
                // the last People list instead of returning to the dashboard.
                onClick={() => clearListNav()}
                className="flex items-start gap-3 px-4 py-3 hover:bg-navy/[0.03] transition-colors"
              >
                <Avatar first={e.contact_first} last={e.contact_last} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-display font-medium text-sm text-navy truncate">
                      {displayName(e.contact_first, e.contact_last)}
                    </span>
                    <span className="shrink-0 font-ui text-[0.65rem] text-charcoal-light">
                      {relativeTime(e.created_at)}
                    </span>
                  </span>
                  <span className="block font-body font-light text-xs text-charcoal-light truncate">
                    <span aria-hidden="true">{EVENT_ICON[e.kind] ?? "•"}</span> {preview(e.body)}
                  </span>
                </span>
              </Link>
            ))}
          </Card>
        </section>
      </div>
    </div>
  );
}

function preview(body: string | null): string {
  const b = (body ?? "").trim();
  return b.length > 80 ? `${b.slice(0, 80)}…` : b;
}

function Tile({
  href,
  caption,
  value,
  sub,
  tone,
}: {
  href: string;
  caption: string;
  value: number;
  sub: string;
  tone: "gold" | "red" | "muted";
}) {
  const subCls =
    tone === "gold" ? "text-gold" : tone === "red" ? "text-red-700" : "text-charcoal-light";
  return (
    <Link
      href={href}
      className={`${cardCls} block px-4 py-3 hover:border-navy/25 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold`}
    >
      <span className={`block ${labelCls}`}>{caption}</span>
      <span className="block font-display text-3xl text-navy leading-none mt-1.5 tabular-nums">{value}</span>
      <span className={`block font-body font-light text-xs mt-1.5 ${subCls}`}>{sub}</span>
    </Link>
  );
}
