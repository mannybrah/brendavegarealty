"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { StudioShell } from "@/components/studio/StudioShell";
import { CrmTabs } from "@/components/studio/crm/CrmTabs";
import { StagePill } from "@/components/studio/crm/StagePill";
import { ContactRow } from "@/components/studio/crm/ContactListItem";
import { STAGES, STAGE_LABELS, Stage } from "@/lib/crm/normalize";

// The pipeline shows every working stage except "archived" — archived
// contacts are parked, not part of the active pipeline.
const PIPELINE_STAGES = STAGES.filter((s) => s !== "archived");

function relativeShort(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const sec = Math.max(0, (now.getTime() - then.getTime()) / 1000);
  if (sec < 60) return "now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  if (sec < 7 * 86400) return `${Math.floor(sec / 86400)}d`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function groupByStage(contacts: ContactRow[]): Partial<Record<Stage, ContactRow[]>> {
  const grouped: Partial<Record<Stage, ContactRow[]>> = {};
  for (const c of contacts) {
    if (c.stage === "archived") continue;
    const key = c.stage as Stage;
    (grouped[key] ??= []).push(c);
  }
  return grouped;
}

export default function CrmPipelinePage() {
  return (
    <StudioShell title="Pipeline" backHref="/studio/crm">
      <PipelineInner />
    </StudioShell>
  );
}

function PipelineInner() {
  const [contacts, setContacts] = useState<ContactRow[] | null>(null);
  const [sheetContact, setSheetContact] = useState<ContactRow | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // Single-flight guard: every call aborts the prior in-flight request so an
  // older response can never overwrite state from a newer one (mount effect
  // and moveStage() both call this same function).
  const fetchControllerRef = useRef<AbortController | null>(null);

  function fetchContacts() {
    fetchControllerRef.current?.abort();
    const controller = new AbortController();
    fetchControllerRef.current = controller;
    fetch(`/api/studio/crm/contacts`, { credentials: "include", cache: "no-store", signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { contacts: [] }))
      .then((j: { contacts: ContactRow[] }) => setContacts(j.contacts ?? []))
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setContacts([]);
      });
  }

  useEffect(() => {
    fetchContacts();
    return () => fetchControllerRef.current?.abort();
  }, []);

  const grouped = groupByStage(contacts ?? []);

  async function moveStage(contact: ContactRow, stage: Stage) {
    if (stage === contact.stage) return;
    setErr(null);
    const prev = contacts;
    setContacts((cur) => (cur ?? []).map((c) => (c.id === contact.id ? { ...c, stage } : c)));
    setSheetContact(null);
    let r: Response | null;
    try {
      r = await fetch(`/api/studio/crm/contacts/${contact.id}`, {
        method: "PATCH",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
    } catch {
      r = null;
    }
    if (!r || !r.ok) {
      setContacts(prev);
      setErr("Couldn't move that contact — try again.");
      return;
    }
    fetchContacts();
  }

  return (
    <div className="space-y-4">
      <CrmTabs active="pipeline" />

      {err && <div className="font-body text-sm text-red-600">{err}</div>}

      {contacts === null && <div className="font-body text-sm text-charcoal-light">Loading…</div>}

      {contacts !== null && (
        <>
          {/* Mobile: stacked collapsible stage sections */}
          <div className="md:hidden space-y-3">
            {PIPELINE_STAGES.map((stage) => (
              <StageSection
                key={stage}
                stage={stage}
                contacts={grouped[stage] ?? []}
                onTapCard={setSheetContact}
              />
            ))}
          </div>

          {/* Desktop: full-bleed 6-column board */}
          <div className="hidden md:block w-screen relative left-1/2 -translate-x-1/2 px-4">
            <div className="grid grid-cols-6 gap-2">
              {PIPELINE_STAGES.map((stage) => {
                const items = grouped[stage] ?? [];
                return (
                  <div key={stage} className="min-w-0">
                    <div className="flex items-center justify-between px-1 mb-2">
                      <span className="font-ui text-xs tracking-wider uppercase text-navy truncate">
                        {STAGE_LABELS[stage]}
                      </span>
                      <span className="font-ui text-[0.65rem] text-charcoal-light shrink-0">{items.length}</span>
                    </div>
                    <div className="max-h-[70vh] overflow-y-auto space-y-2 pr-1">
                      {items.length === 0 && (
                        <div className="font-body text-xs text-charcoal-light/60 px-1">Empty</div>
                      )}
                      {items.map((c) => (
                        <PipelineCard key={c.id} contact={c} onTap={() => setSheetContact(c)} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {sheetContact && (
        <StageSheet
          contact={sheetContact}
          onClose={() => setSheetContact(null)}
          onMove={(stage) => moveStage(sheetContact, stage)}
        />
      )}
    </div>
  );
}

function StageSection({
  stage,
  contacts,
  onTapCard,
}: {
  stage: Stage;
  contacts: ContactRow[];
  onTapCard: (c: ContactRow) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const hasItems = contacts.length > 0;

  return (
    <section className="bg-white rounded-2xl border border-navy/5 overflow-hidden">
      <button
        onClick={() => hasItems && setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3"
        disabled={!hasItems}
      >
        <span className="font-ui text-xs tracking-wider uppercase text-navy">{STAGE_LABELS[stage]}</span>
        <span className="flex items-center gap-2">
          <span className="font-ui text-[0.65rem] text-charcoal-light">{contacts.length}</span>
          {hasItems && (
            <span
              className={`text-charcoal-light text-xs transition-transform ${collapsed ? "" : "rotate-180"}`}
            >
              ▾
            </span>
          )}
        </span>
      </button>
      {hasItems && !collapsed && (
        <div className="px-3 pb-3 space-y-2 border-t border-navy/5 pt-3">
          {contacts.map((c) => (
            <PipelineCard key={c.id} contact={c} onTap={() => onTapCard(c)} />
          ))}
        </div>
      )}
    </section>
  );
}

function PipelineCard({ contact, onTap }: { contact: ContactRow; onTap: () => void }) {
  const name = `${contact.first_name} ${contact.last_name}`.trim() || "No name";
  return (
    <button
      onClick={onTap}
      className="w-full text-left bg-cream md:bg-white border border-navy/5 rounded-xl p-3 active:scale-[0.98] transition-transform"
    >
      <div className="font-body text-sm text-navy truncate">{name}</div>
      <div className="flex items-center justify-between mt-1.5 gap-2">
        <span className="font-ui text-[0.6rem] tracking-wider uppercase text-charcoal-light truncate">
          {contact.source || "—"}
        </span>
        <span className="font-ui text-[0.6rem] text-charcoal-light shrink-0">
          {relativeShort(contact.last_activity_at)}
        </span>
      </div>
    </button>
  );
}

function StageSheet({
  contact,
  onClose,
  onMove,
}: {
  contact: ContactRow;
  onClose: () => void;
  onMove: (stage: Stage) => void;
}) {
  const name = `${contact.first_name} ${contact.last_name}`.trim() || "No name";
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-navy/40" onClick={onClose}>
      <div
        className="w-full sm:max-w-sm bg-cream rounded-t-3xl sm:rounded-3xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="font-display font-normal text-lg text-navy truncate">{name}</div>
          <StagePill stage={contact.stage} />
        </div>

        <Link
          href={`/studio/crm/contact?id=${contact.id}`}
          className="block w-full text-center bg-white border border-navy/10 text-navy font-ui text-xs tracking-wider uppercase py-3 rounded-xl"
        >
          Open contact
        </Link>

        <div>
          <div className="font-ui text-xs tracking-wider uppercase text-charcoal-light mb-2">Move to…</div>
          <div className="flex flex-wrap gap-2">
            {STAGES.map((s) => (
              <button
                key={s}
                onClick={() => onMove(s)}
                disabled={s === contact.stage}
                className={`font-ui text-xs tracking-wider uppercase px-4 py-2 rounded-full transition-colors ${
                  s === contact.stage
                    ? "bg-navy text-cream opacity-60 cursor-default"
                    : "bg-white text-charcoal-light border border-navy/10 active:scale-[0.98]"
                }`}
              >
                {STAGE_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-white border border-navy/10 text-charcoal-light font-ui text-xs tracking-wider uppercase py-3 rounded-xl"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
