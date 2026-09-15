"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CrmShell } from "@/components/studio/crm/CrmShell";
import { useStages } from "@/components/studio/crm/StagesContext";
import { StagePill } from "@/components/studio/crm/StagePill";
import { paletteFor } from "@/components/studio/crm/stageColors";
import { Btn, EmptyState, ErrorText, Sheet, TagBubble, crmFetch } from "@/components/studio/crm/ui";
import { relativeShort } from "@/lib/crm/format";
import { clearListNav } from "@/lib/crm/nav";
import type { ContactListRow, StageRow } from "@/lib/crm/types";

// The pipeline shows every working stage except "archived" — archived
// contacts are parked, not part of the active pipeline.
function pipelineStages(stages: StageRow[]): StageRow[] {
  return stages.filter((s) => s.id !== "archived");
}

function groupByStage(contacts: ContactListRow[]): Record<string, ContactListRow[]> {
  const grouped: Record<string, ContactListRow[]> = {};
  for (const c of contacts) {
    if (c.stage === "archived") continue;
    (grouped[c.stage] ??= []).push(c);
  }
  return grouped;
}

export default function CrmPipelinePage() {
  return (
    <CrmShell title="Pipeline">
      <PipelineInner />
    </CrmShell>
  );
}

function PipelineInner() {
  const { stages, loading: stagesLoading } = useStages();
  const [contacts, setContacts] = useState<ContactListRow[] | null>(null);
  const [sheetContact, setSheetContact] = useState<ContactListRow | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // Single-flight guard: every call aborts the prior in-flight request so an
  // older response can never overwrite state from a newer one (mount effect
  // and moveStage() both call this same function).
  const fetchControllerRef = useRef<AbortController | null>(null);

  function fetchContacts() {
    fetchControllerRef.current?.abort();
    const controller = new AbortController();
    fetchControllerRef.current = controller;
    crmFetch(`/api/studio/crm/contacts?limit=1000`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { contacts: [] }))
      .then((j: { contacts: ContactListRow[] }) => setContacts(j.contacts ?? []))
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setContacts([]);
      });
  }

  useEffect(() => {
    fetchContacts();
    return () => fetchControllerRef.current?.abort();
  }, []);

  const board = pipelineStages(stages);
  const grouped = groupByStage(contacts ?? []);

  async function moveStage(contact: ContactListRow, stage: string) {
    if (stage === contact.stage) return;
    setErr(null);
    const prev = contacts;
    setContacts((cur) => (cur ?? []).map((c) => (c.id === contact.id ? { ...c, stage } : c)));
    setSheetContact(null);
    let r: Response | null;
    try {
      r = await crmFetch(`/api/studio/crm/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
    } catch {
      r = null;
    }
    if (!r || !r.ok) {
      setContacts(prev);
      setErr("Couldn't move that contact. Try again.");
      return;
    }
    fetchContacts();
  }

  const loading = contacts === null || stagesLoading;

  return (
    <div className="space-y-4">
      {err && <ErrorText>{err}</ErrorText>}

      {loading && <div className="font-body text-sm text-charcoal-light">Loading…</div>}

      {!loading && (
        <>
          {/* Mobile: stacked collapsible stage sections */}
          <div className="md:hidden space-y-3">
            {board.map((stage) => (
              <StageSection
                key={stage.id}
                stage={stage}
                contacts={grouped[stage.id] ?? []}
                onTapCard={setSheetContact}
              />
            ))}
          </div>

          {/* Desktop: the stage count is dynamic, so the columns scroll
              horizontally (FUB-style board) instead of wrapping. The negative
              margin bleeds into the main's padding without using 100vw, which
              on Windows/Linux includes the scrollbar and scrolls the page. */}
          <div className="hidden md:block -mx-4 lg:-mx-6 px-4 lg:px-6">
            <div className="flex gap-2 overflow-x-auto pb-3">
              {board.map((stage) => {
                const items = grouped[stage.id] ?? [];
                const c = paletteFor(stage.color);
                return (
                  <div
                    key={stage.id}
                    className="w-[240px] shrink-0 bg-white rounded-lg border border-navy/5 shadow-[0_1px_3px_rgba(15,29,53,0.06)] overflow-hidden"
                    style={{ borderTop: `3px solid ${c.accent}` }}
                  >
                    <div className="flex items-center justify-between px-2 py-2">
                      <span className="font-ui text-xs tracking-wider uppercase text-navy truncate">
                        {stage.name}
                      </span>
                      <span
                        className={`font-ui text-[0.65rem] shrink-0 px-1.5 py-0.5 rounded-full ${c.bg} ${c.text}`}
                      >
                        {items.length}
                      </span>
                    </div>
                    <div className="max-h-[70vh] overflow-y-auto space-y-2 p-2 pt-0">
                      {items.length === 0 && (
                        <div className="font-body text-xs text-charcoal-light/60 px-1">Empty</div>
                      )}
                      {items.map((item) => (
                        <PipelineCard key={item.id} contact={item} onTap={() => setSheetContact(item)} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {board.length === 0 && <EmptyState>No stages yet. Add one in Settings.</EmptyState>}
        </>
      )}

      <StageSheet
        contact={sheetContact}
        stages={stages}
        onClose={() => setSheetContact(null)}
        onMove={(stage) => sheetContact && moveStage(sheetContact, stage)}
      />
    </div>
  );
}

function StageSection({
  stage,
  contacts,
  onTapCard,
}: {
  stage: StageRow;
  contacts: ContactListRow[];
  onTapCard: (c: ContactListRow) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const hasItems = contacts.length > 0;
  const c = paletteFor(stage.color);

  return (
    <section
      className="bg-[#FCFBF7] rounded-lg border border-navy/10 shadow-[0_1px_3px_rgba(15,29,53,0.06)] overflow-hidden"
      style={{ borderTop: `3px solid ${c.accent}` }}
    >
      <button
        onClick={() => hasItems && setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3"
        disabled={!hasItems}
      >
        <span className="font-ui text-xs tracking-wider uppercase text-navy">{stage.name}</span>
        <span className="flex items-center gap-2">
          <span className={`font-ui text-[0.65rem] px-1.5 py-0.5 rounded-full ${c.bg} ${c.text}`}>
            {contacts.length}
          </span>
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
          {contacts.map((item) => (
            <PipelineCard key={item.id} contact={item} onTap={() => onTapCard(item)} />
          ))}
        </div>
      )}
    </section>
  );
}

function PipelineCard({ contact, onTap }: { contact: ContactListRow; onTap: () => void }) {
  const name = `${contact.first_name} ${contact.last_name}`.trim() || "No name";
  const tags = (contact.tags ?? []).slice(0, 2);
  return (
    <button
      onClick={onTap}
      className="w-full text-left bg-cream md:bg-white border border-navy/5 rounded-xl p-3 active:scale-[0.98] transition-transform"
    >
      <div className="font-body text-sm text-navy truncate">{name}</div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {tags.map((t) => (
            <TagBubble key={t.id} name={t.name} />
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mt-1.5 gap-2">
        <span className="font-ui text-[0.6rem] tracking-wider uppercase text-charcoal-light truncate">
          {contact.source || "·"}
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
  stages,
  onClose,
  onMove,
}: {
  contact: ContactListRow | null;
  stages: StageRow[];
  onClose: () => void;
  onMove: (stage: string) => void;
}) {
  const name = contact ? `${contact.first_name} ${contact.last_name}`.trim() || "No name" : "";
  return (
    <Sheet
      open={contact !== null}
      onClose={onClose}
      title={name}
      footer={
        <Btn variant="secondary" className="w-full" onClick={onClose}>
          Cancel
        </Btn>
      }
    >
      {contact && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 min-w-0">
            <StagePill stageId={contact.stage} />
          </div>

          <Link
            href={`/studio/crm/contact?id=${contact.id}`}
            // People owns the list-nav snapshot; the board is not a list.
            onClick={() => clearListNav()}
            className="block w-full text-center bg-white border border-navy/20 text-navy font-ui text-xs tracking-wider uppercase py-3 rounded-md"
          >
            Open contact
          </Link>

          <div>
            <div className="font-ui text-xs tracking-wider uppercase text-charcoal-light mb-2">Move to…</div>
            <div className="flex flex-wrap gap-2">
              {stages.map((s) => {
                const c = paletteFor(s.color);
                const isCurrent = s.id === contact.stage;
                return (
                  <button
                    key={s.id}
                    onClick={() => onMove(s.id)}
                    disabled={isCurrent}
                    className={`font-ui text-xs tracking-wider uppercase px-4 py-2 rounded-full border transition-colors ${
                      isCurrent ? "opacity-60 cursor-default" : `bg-white ${c.text} ${c.border} active:scale-[0.98]`
                    }`}
                    style={
                      isCurrent ? { backgroundColor: c.solid.bg, borderColor: c.solid.bg, color: c.solid.text } : undefined
                    }
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Sheet>
  );
}
