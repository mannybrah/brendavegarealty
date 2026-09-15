"use client";

import { useMemo, useState } from "react";
import type { EventRow } from "@/lib/crm/types";
import { ACTIVITY_EVENT_KINDS, CALL_OUTCOMES, CALL_OUTCOME_LABELS, EDITABLE_EVENT_KINDS, EVENT_ICON } from "@/lib/crm/types";
import type { CallOutcome } from "@/lib/crm/types";
import { exactTime, relativeTime } from "@/lib/crm/format";
import { EVENT_KIND_PALETTE, paletteFor } from "@/components/studio/crm/stageColors";
import { Btn, Chip, EmptyState, ErrorText, Menu, SegmentedTabs, crmJson } from "@/components/studio/crm/ui";
import type { SetEvents } from "./Composer";

type Tab = "all" | "note" | "call" | "text" | "email" | "activity" | "starred";

const EDITABLE = new Set<string>(EDITABLE_EVENT_KINDS);
const ACTIVITY = new Set<string>(ACTIVITY_EVENT_KINDS);

function matches(tab: Tab, e: EventRow): boolean {
  if (tab === "all") return true;
  if (tab === "starred") return !!e.starred;
  if (tab === "activity") return ACTIVITY.has(e.kind);
  return e.kind === tab;
}

function outcomeLabel(o: string | null): string | null {
  return o && (CALL_OUTCOMES as readonly string[]).includes(o) ? CALL_OUTCOME_LABELS[o as CallOutcome] : null;
}

// ------------------------------------------------------------
// Single item
// ------------------------------------------------------------
function TimelineItem({
  event,
  setEvents,
  pinned = false,
}: {
  event: EventRow;
  setEvents: SetEvents;
  pinned?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(event.body);
  const [draftOutcome, setDraftOutcome] = useState<CallOutcome | null>((event.outcome as CallOutcome | null) ?? null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const editable = EDITABLE.has(event.kind);
  const isTmp = event.id.startsWith("tmp-");
  const color = paletteFor(EVENT_KIND_PALETTE[event.kind] ?? "gray").accent;
  const badge = event.kind === "call" ? outcomeLabel(event.outcome) : null;

  async function toggleStar() {
    if (isTmp) return;
    const next = event.starred ? 0 : 1;
    setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, starred: next } : e)));
    try {
      const j = await crmJson<{ event: EventRow }>(`/api/studio/crm/events/${event.id}`, {
        method: "PATCH",
        body: JSON.stringify({ starred: !!next }),
      });
      setEvents((prev) => prev.map((e) => (e.id === event.id ? j.event : e)));
    } catch {
      setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, starred: event.starred } : e)));
    }
  }

  function startEdit() {
    setDraft(event.body);
    setDraftOutcome((event.outcome as CallOutcome | null) ?? null);
    setErr(null);
    setEditing(true);
  }

  async function saveEdit() {
    if (!draft.trim()) {
      setErr("Body is required.");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const patch: Record<string, unknown> = { body: draft.trim() };
      if (event.kind === "call") patch.outcome = draftOutcome ?? "";
      const j = await crmJson<{ event: EventRow }>(`/api/studio/crm/events/${event.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setEvents((prev) => prev.map((e) => (e.id === event.id ? j.event : e)));
      setEditing(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this entry? This can't be undone.")) return;
    const snapshot = event;
    setEvents((prev) => prev.filter((e) => e.id !== event.id));
    try {
      await crmJson(`/api/studio/crm/events/${event.id}`, { method: "DELETE" });
    } catch {
      setEvents((prev) => [snapshot, ...prev].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)));
    }
  }

  return (
    <div className={`flex items-start gap-3 relative ${isTmp ? "opacity-60" : ""}`}>
      <span
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 relative z-10 border-2 border-[#FCFBF7]"
        style={{ backgroundColor: `${color}26` }}
        aria-hidden="true"
      >
        {EVENT_ICON[event.kind] ?? "•"}
      </span>

      <div className="min-w-0 flex-1 pt-0.5">
        {editing ? (
          <div className="space-y-2">
            {event.kind === "call" && (
              <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5">
                {CALL_OUTCOMES.map((o) => (
                  <Chip
                    key={o}
                    active={draftOutcome === o}
                    onClick={() => setDraftOutcome(draftOutcome === o ? null : o)}
                    className="min-h-10 text-[0.65rem]"
                  >
                    {CALL_OUTCOME_LABELS[o]}
                  </Chip>
                ))}
              </div>
            )}
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              autoFocus
              className="w-full bg-white border border-navy/10 rounded-xl px-3 py-2.5 font-body text-sm text-navy focus:outline-none focus:border-teal"
            />
            <ErrorText>{err}</ErrorText>
            <div className="flex gap-2 justify-end">
              <Btn variant="secondary" onClick={() => setEditing(false)} disabled={busy} className="min-h-10">
                Cancel
              </Btn>
              <Btn onClick={saveEdit} disabled={busy} className="min-h-10">
                {busy ? "Saving…" : "Save"}
              </Btn>
            </div>
          </div>
        ) : (
          <>
            <div className="font-body text-sm text-navy whitespace-pre-wrap break-words leading-relaxed">{event.body}</div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {badge && (
                <span className="font-ui text-[0.6rem] tracking-wider uppercase rounded-full px-2 py-0.5 bg-teal/15 text-[#1f5c50]">
                  {badge}
                </span>
              )}
              <span className="font-ui text-[0.6rem] tracking-wider uppercase text-charcoal-light" title={exactTime(event.created_at)}>
                {relativeTime(event.created_at)}
                {event.updated_at && " · edited"}
                {pinned && " · pinned"}
              </span>
            </div>
          </>
        )}
      </div>

      {!editing && !isTmp && (
        <div className="flex items-center shrink-0 -mr-1">
          <button
            type="button"
            onClick={toggleStar}
            aria-pressed={!!event.starred}
            aria-label={event.starred ? "Unstar" : "Star"}
            className={`w-9 h-9 rounded-full flex items-center justify-center text-base hover:bg-navy/5 ${
              event.starred ? "text-gold" : "text-charcoal-light/50 hover:text-gold"
            }`}
          >
            {event.starred ? "★" : "☆"}
          </button>
          {editable && (
            <Menu
              items={[
                { label: "Edit", onClick: startEdit },
                { label: "Delete", onClick: remove, danger: true },
              ]}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Timeline
// ------------------------------------------------------------
export function Timeline({ events, setEvents }: { events: EventRow[]; setEvents: SetEvents }) {
  const [tab, setTab] = useState<Tab>("all");

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { all: events.length, note: 0, call: 0, text: 0, email: 0, activity: 0, starred: 0 };
    for (const e of events) {
      if (e.kind === "note" || e.kind === "call" || e.kind === "text" || e.kind === "email") c[e.kind]++;
      if (ACTIVITY.has(e.kind)) c.activity++;
      if (e.starred) c.starred++;
    }
    return c;
  }, [events]);

  const visible = useMemo(() => events.filter((e) => matches(tab, e)), [events, tab]);
  const starred = useMemo(() => (tab === "all" ? events.filter((e) => !!e.starred) : []), [events, tab]);

  const tabs = [
    { key: "all" as Tab, label: "All", count: counts.all },
    { key: "note" as Tab, label: "Notes", count: counts.note },
    { key: "call" as Tab, label: "Calls", count: counts.call },
    { key: "text" as Tab, label: "Texts", count: counts.text },
    { key: "email" as Tab, label: "Emails", count: counts.email },
    { key: "activity" as Tab, label: "Activity", count: counts.activity },
    { key: "starred" as Tab, label: "★", count: counts.starred },
  ];

  return (
    <div className="space-y-4">
      <SegmentedTabs tabs={tabs} value={tab} onChange={setTab} />

      {starred.length > 0 && (
        <div className="border-l-2 border-gold pl-3 space-y-4">
          <div className="font-ui text-[0.65rem] tracking-wider uppercase text-[#7a5f30]">★ Starred</div>
          {starred.map((e) => (
            <TimelineItem key={`pin-${e.id}`} event={e} setEvents={setEvents} pinned />
          ))}
        </div>
      )}

      <div className="relative space-y-5">
        {visible.length === 0 && <EmptyState>{tab === "all" ? "No activity yet." : "Nothing here yet."}</EmptyState>}
        {visible.length > 1 && <div className="absolute left-[15px] top-4 bottom-4 w-px bg-gold/30" aria-hidden="true" />}
        {visible.map((e) => (
          <TimelineItem key={e.id} event={e} setEvents={setEvents} />
        ))}
      </div>
    </div>
  );
}
