"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { StudioShell } from "@/components/studio/StudioShell";
import type { DealRow, MilestoneRow, ChecklistRow } from "@/lib/crm/portalTypes";

interface ContactSummary {
  id: string;
  first_name: string;
  last_name: string;
}

const DEAL_STATUSES = ["active", "pending", "closed", "cancelled"] as const;

const CHECKLIST_PHASE_LABELS: Record<number, string> = {
  1: "Listing kickoff",
  2: "Week before market",
  3: "Contract to close",
  4: "Marketing menu",
};
const CHECKLIST_PHASE_ORDER = [1, 2, 3, 4];

export default function DealPage() {
  return (
    <StudioShell title="Deal" backHref="/studio/crm">
      <Suspense fallback={<div className="font-body text-sm text-charcoal-light">Loading…</div>}>
        <DealDetail />
      </Suspense>
    </StudioShell>
  );
}

function DealDetail() {
  const id = useSearchParams().get("id");

  const [deal, setDeal] = useState<DealRow | null>(null);
  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);
  const [checklist, setChecklist] = useState<ChecklistRow[]>([]);
  const [contact, setContact] = useState<ContactSummary | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function load(signal?: AbortSignal) {
    if (!id) return;
    fetch(`/api/studio/crm/deals/${id}`, { credentials: "include", cache: "no-store", signal })
      .then((r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((j: { deal: DealRow; milestones: MilestoneRow[]; contact: ContactSummary; checklist: ChecklistRow[] } | null) => {
        if (j) {
          setDeal(j.deal);
          setMilestones(j.milestones ?? []);
          setContact(j.contact ?? null);
          setChecklist(j.checklist ?? []);
        }
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
      });
  }

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!id) return <div className="font-body text-sm text-charcoal-light">Missing deal id.</div>;
  if (notFound) {
    return (
      <div className="space-y-4">
        <div className="font-body text-sm text-charcoal-light">This deal doesn&apos;t exist anymore.</div>
        <Link href="/studio/crm" className="font-ui text-xs tracking-wider uppercase text-teal">
          &larr; Back to Clients
        </Link>
      </div>
    );
  }
  if (!deal) return <div className="font-body text-sm text-charcoal-light">Loading…</div>;

  const visible = milestones.filter((m) => m.client_visible);
  const visibleDone = visible.filter((m) => m.status === "done").length;
  const progressPct = visible.length > 0 ? Math.round((visibleDone / visible.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {err && <div className="font-body text-sm text-red-600">{err}</div>}

      {contact && (
        <Link
          href={`/studio/crm/contact?id=${contact.id}`}
          className="font-ui text-[0.65rem] tracking-wider uppercase text-teal"
        >
          &larr; {`${contact.first_name} ${contact.last_name}`.trim() || "Contact"}
        </Link>
      )}

      <DealHeaderCard deal={deal} onSaved={setDeal} onError={setErr} />

      {visible.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between font-ui text-[0.65rem] tracking-wider uppercase text-charcoal-light">
            <span>Client-visible progress</span>
            <span>
              {visibleDone}/{visible.length}
            </span>
          </div>
          <div className="h-2 bg-navy/5 rounded-full overflow-hidden">
            <div className="h-full bg-teal transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      <MilestonesCard dealId={deal.id} milestones={milestones} setMilestones={setMilestones} onError={setErr} onRefetch={load} />

      <ChecklistCard deal={deal} checklist={checklist} setChecklist={setChecklist} onError={setErr} />

      <PortalCard deal={deal} onUpdated={setDeal} onError={setErr} />
    </div>
  );
}

// ============================================================
// Header
// ============================================================

function DealHeaderCard({
  deal,
  onSaved,
  onError,
}: {
  deal: DealRow;
  onSaved: (d: DealRow) => void;
  onError: (msg: string | null) => void;
}) {
  const [address, setAddress] = useState(deal.property_address);
  const [targetCloseDate, setTargetCloseDate] = useState(deal.target_close_date ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAddress(deal.property_address);
    setTargetCloseDate(deal.target_close_date ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal.id]);

  const dirty = address !== deal.property_address || targetCloseDate !== (deal.target_close_date ?? "");

  async function patchDeal(body: Record<string, unknown>): Promise<DealRow | null> {
    let r: Response;
    try {
      r = await fetch(`/api/studio/crm/deals/${deal.id}`, {
        method: "PATCH",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      onError("Network error — check your connection and try again.");
      return null;
    }
    if (!r.ok) {
      onError("Something went wrong — try again.");
      return null;
    }
    const j = (await r.json()) as { deal: DealRow };
    return j.deal;
  }

  async function save() {
    onError(null);
    setSaving(true);
    const updated = await patchDeal({
      propertyAddress: address.trim(),
      targetCloseDate: targetCloseDate || null,
    });
    setSaving(false);
    if (updated) onSaved(updated);
  }

  async function changeStatus(next: string) {
    if (next === deal.status) return;
    onError(null);
    const prev = deal;
    onSaved({ ...deal, status: next });
    const updated = await patchDeal({ status: next });
    if (!updated) {
      onSaved(prev);
      return;
    }
    onSaved(updated);
  }

  const field =
    "mt-2 w-full bg-white border border-navy/10 rounded-xl p-3 font-body text-sm focus:outline-none focus:border-teal";
  const label = "font-ui text-xs tracking-wider uppercase text-charcoal-light";

  return (
    <section className="bg-white rounded-2xl border border-navy/5 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl leading-none">{deal.side === "buyer" ? "🏠" : "💰"}</span>
        <span className="font-ui text-xs tracking-wider uppercase text-charcoal-light">
          {deal.side === "buyer" ? "Buyer" : "Seller"} deal
        </span>
      </div>

      <label className="block">
        <span className={label}>Property address</span>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Optional"
          className={field}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className={label}>Status</span>
          <select value={deal.status} onChange={(e) => changeStatus(e.target.value)} className={field}>
            {DEAL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={label}>Target close</span>
          <input
            value={targetCloseDate}
            onChange={(e) => setTargetCloseDate(e.target.value)}
            type="date"
            className={field}
          />
        </label>
      </div>

      {dirty && (
        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-teal text-white font-ui font-medium text-sm tracking-wider uppercase py-3.5 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      )}
    </section>
  );
}

// ============================================================
// Milestones
// ============================================================

function MilestonesCard({
  dealId,
  milestones,
  setMilestones,
  onError,
  onRefetch,
}: {
  dealId: string;
  milestones: MilestoneRow[];
  setMilestones: React.Dispatch<React.SetStateAction<MilestoneRow[]>>;
  onError: (msg: string | null) => void;
  onRefetch: () => void;
}) {
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  async function patchMilestone(id: string, body: Record<string, unknown>): Promise<MilestoneRow | null> {
    let r: Response;
    try {
      r = await fetch(`/api/studio/crm/milestones/${id}`, {
        method: "PATCH",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      return null;
    }
    if (!r.ok) return null;
    const j = (await r.json()) as { milestone: MilestoneRow };
    return j.milestone;
  }

  async function toggleDone(m: MilestoneRow) {
    onError(null);
    const nextStatus = m.status === "done" ? "upcoming" : "done";
    const prev = milestones;
    setMilestones((cur) => cur.map((x) => (x.id === m.id ? { ...x, status: nextStatus } : x)));
    const updated = await patchMilestone(m.id, { status: nextStatus });
    if (!updated) {
      setMilestones(prev);
      onError("Couldn't update — try again.");
      return;
    }
    setMilestones((cur) => cur.map((x) => (x.id === m.id ? updated : x)));
  }

  async function skip(m: MilestoneRow) {
    onError(null);
    const prev = milestones;
    setMilestones((cur) => cur.map((x) => (x.id === m.id ? { ...x, status: "skipped" } : x)));
    const updated = await patchMilestone(m.id, { status: "skipped" });
    if (!updated) {
      setMilestones(prev);
      onError("Couldn't update — try again.");
      return;
    }
    setMilestones((cur) => cur.map((x) => (x.id === m.id ? updated : x)));
  }

  async function rename(m: MilestoneRow, title: string) {
    const trimmed = title.trim();
    if (!trimmed || trimmed === m.title) return;
    onError(null);
    const prev = milestones;
    setMilestones((cur) => cur.map((x) => (x.id === m.id ? { ...x, title: trimmed } : x)));
    const updated = await patchMilestone(m.id, { title: trimmed });
    if (!updated) {
      setMilestones(prev);
      onError("Couldn't rename — try again.");
      return;
    }
    setMilestones((cur) => cur.map((x) => (x.id === m.id ? updated : x)));
  }

  async function changeDate(m: MilestoneRow, date: string) {
    onError(null);
    const prev = milestones;
    const next = date || null;
    setMilestones((cur) => cur.map((x) => (x.id === m.id ? { ...x, date: next } : x)));
    const updated = await patchMilestone(m.id, { date: next });
    if (!updated) {
      setMilestones(prev);
      onError("Couldn't update — try again.");
      return;
    }
    setMilestones((cur) => cur.map((x) => (x.id === m.id ? updated : x)));
  }

  async function toggleVisible(m: MilestoneRow) {
    onError(null);
    const nextVisible = m.client_visible ? 0 : 1;
    const prev = milestones;
    setMilestones((cur) => cur.map((x) => (x.id === m.id ? { ...x, client_visible: nextVisible } : x)));
    const updated = await patchMilestone(m.id, { clientVisible: !!nextVisible });
    if (!updated) {
      setMilestones(prev);
      onError("Couldn't update — try again.");
      return;
    }
    setMilestones((cur) => cur.map((x) => (x.id === m.id ? updated : x)));
  }

  async function remove(m: MilestoneRow) {
    if (!confirm(`Delete "${m.title}"? This can't be undone.`)) return;
    onError(null);
    const prev = milestones;
    setMilestones((cur) => cur.filter((x) => x.id !== m.id));
    let r: Response | null;
    try {
      r = await fetch(`/api/studio/crm/milestones/${m.id}`, { method: "DELETE", credentials: "include", cache: "no-store" });
    } catch {
      r = null;
    }
    if (!r || !r.ok) {
      setMilestones(prev);
      onError("Couldn't delete — try again.");
    }
  }

  async function move(m: MilestoneRow, direction: -1 | 1) {
    const idx = milestones.findIndex((x) => x.id === m.id);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= milestones.length) return;
    const other = milestones[swapIdx];
    onError(null);
    const [a, b] = await Promise.all([
      patchMilestone(m.id, { sortOrder: other.sort_order }),
      patchMilestone(other.id, { sortOrder: m.sort_order }),
    ]);
    if (!a || !b) {
      onError("Couldn't reorder — try again.");
      if (a && !b) {
        // m's swap succeeded, other's failed — restore m's original sort_order
        await patchMilestone(m.id, { sortOrder: m.sort_order });
      } else if (b && !a) {
        // other's swap succeeded, m's failed — restore other's original sort_order
        await patchMilestone(other.id, { sortOrder: other.sort_order });
      }
    }
    onRefetch();
  }

  async function addStep() {
    const title = newTitle.trim();
    if (!title) return;
    onError(null);
    setAdding(true);
    let r: Response | null;
    try {
      r = await fetch(`/api/studio/crm/deals/${dealId}/milestones`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
    } catch {
      r = null;
    }
    setAdding(false);
    if (!r || !r.ok) {
      onError("Couldn't add that step — try again.");
      return;
    }
    const j = (await r.json()) as { milestone: MilestoneRow };
    setMilestones((cur) => [...cur, j.milestone]);
    setNewTitle("");
  }

  return (
    <section className="bg-white rounded-2xl border border-navy/5 divide-y divide-navy/5">
      <div className="p-4 pb-2">
        <h2 className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Milestones</h2>
      </div>
      {milestones.map((m, i) => (
        <MilestoneRowItem
          key={m.id}
          milestone={m}
          isFirst={i === 0}
          isLast={i === milestones.length - 1}
          onToggleDone={() => toggleDone(m)}
          onRename={(title) => rename(m, title)}
          onDateChange={(date) => changeDate(m, date)}
          onToggleVisible={() => toggleVisible(m)}
          onSkip={() => skip(m)}
          onDelete={() => remove(m)}
          onMoveUp={() => move(m, -1)}
          onMoveDown={() => move(m, 1)}
        />
      ))}
      <div className="flex gap-2 p-4">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addStep()}
          placeholder="+ Add step"
          className="flex-1 min-w-0 bg-cream border border-navy/10 rounded-xl px-3 py-2.5 font-body text-sm focus:outline-none focus:border-teal"
        />
        <button
          onClick={addStep}
          disabled={adding || !newTitle.trim()}
          className="shrink-0 bg-navy text-cream font-ui text-xs tracking-wider uppercase px-4 py-2.5 rounded-xl disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </section>
  );
}

function MilestoneRowItem({
  milestone,
  isFirst,
  isLast,
  onToggleDone,
  onRename,
  onDateChange,
  onToggleVisible,
  onSkip,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  milestone: MilestoneRow;
  isFirst: boolean;
  isLast: boolean;
  onToggleDone: () => void;
  onRename: (title: string) => void;
  onDateChange: (date: string) => void;
  onToggleVisible: () => void;
  onSkip: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(milestone.title);
  const [menuOpen, setMenuOpen] = useState(false);

  const done = milestone.status === "done";
  const skipped = milestone.status === "skipped";

  function startEdit() {
    setDraftTitle(milestone.title);
    setEditing(true);
  }

  function commitRename() {
    setEditing(false);
    onRename(draftTitle);
  }

  return (
    <div className={`flex items-center gap-2 p-3 ${milestone.client_visible ? "" : "opacity-50"}`}>
      <button
        onClick={onToggleDone}
        aria-label={done ? "Mark not done" : "Mark done"}
        className={`shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs ${
          done ? "bg-teal border-teal text-white" : "border-navy/20 text-transparent"
        }`}
      >
        ✓
      </button>

      {editing ? (
        <input
          autoFocus
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => e.key === "Enter" && commitRename()}
          className="flex-1 min-w-0 bg-cream border border-navy/10 rounded-lg px-2 py-1.5 font-body text-sm focus:outline-none focus:border-teal"
        />
      ) : (
        <button
          onClick={startEdit}
          className={`flex-1 min-w-0 text-left font-body text-sm truncate ${
            done ? "line-through text-charcoal-light" : skipped ? "italic text-charcoal-light" : "text-navy"
          }`}
        >
          {milestone.title}
        </button>
      )}

      <input
        type="date"
        value={milestone.date ? milestone.date.slice(0, 10) : ""}
        onChange={(e) => onDateChange(e.target.value)}
        className="shrink-0 w-[120px] bg-cream border border-navy/10 rounded-lg px-2 py-1.5 font-ui text-xs focus:outline-none focus:border-teal"
      />

      <button
        onClick={onToggleVisible}
        aria-label={milestone.client_visible ? "Hide from client" : "Show to client"}
        className="shrink-0 text-base"
      >
        {milestone.client_visible ? "👁" : "🙈"}
      </button>

      <div className="relative shrink-0">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="More actions"
          className="w-7 h-7 flex items-center justify-center text-charcoal-light"
        >
          ⋮
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-navy/10 rounded-xl shadow-lg py-1 w-36">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onSkip();
                }}
                className="w-full text-left px-3 py-2 font-body text-xs text-navy hover:bg-cream"
              >
                Skip
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onMoveUp();
                }}
                disabled={isFirst}
                className="w-full text-left px-3 py-2 font-body text-xs text-navy hover:bg-cream disabled:opacity-40"
              >
                ↑ Move up
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onMoveDown();
                }}
                disabled={isLast}
                className="w-full text-left px-3 py-2 font-body text-xs text-navy hover:bg-cream disabled:opacity-40"
              >
                ↓ Move down
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
                className="w-full text-left px-3 py-2 font-body text-xs text-red-600 hover:bg-cream"
              >
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Listing checklist
// ============================================================

function ChecklistCard({
  deal,
  checklist,
  setChecklist,
  onError,
}: {
  deal: DealRow;
  checklist: ChecklistRow[];
  setChecklist: React.Dispatch<React.SetStateAction<ChecklistRow[]>>;
  onError: (msg: string | null) => void;
}) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [newTitleByPhase, setNewTitleByPhase] = useState<Record<number, string>>({});
  const [adding, setAdding] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [removing, setRemoving] = useState(false);

  if (checklist.length === 0 && deal.side !== "seller") return null;

  const done = checklist.filter((i) => i.done_at).length;

  async function seed() {
    onError(null);
    setSeeding(true);
    let r: Response | null;
    try {
      r = await fetch(`/api/studio/crm/deals/${deal.id}/checklist`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch {
      r = null;
    }
    setSeeding(false);
    if (!r || !r.ok) {
      onError("Couldn't add the checklist — try again.");
      return;
    }
    const j = (await r.json()) as { checklist: ChecklistRow[] };
    setChecklist(j.checklist ?? []);
  }

  async function toggleDone(item: ChecklistRow) {
    onError(null);
    const nextDone = !item.done_at;
    const prev = checklist;
    setChecklist((cur) =>
      cur.map((x) => (x.id === item.id ? { ...x, done_at: nextDone ? new Date().toISOString() : null } : x))
    );
    let r: Response | null;
    try {
      r = await fetch(`/api/studio/crm/checklist/${item.id}`, {
        method: "PATCH",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: nextDone }),
      });
    } catch {
      r = null;
    }
    if (!r || !r.ok) {
      setChecklist(prev);
      onError("Couldn't update — try again.");
      return;
    }
    const j = (await r.json()) as { item: ChecklistRow };
    setChecklist((cur) => cur.map((x) => (x.id === item.id ? j.item : x)));
  }

  async function remove(item: ChecklistRow) {
    onError(null);
    const prev = checklist;
    setChecklist((cur) => cur.filter((x) => x.id !== item.id));
    let r: Response | null;
    try {
      r = await fetch(`/api/studio/crm/checklist/${item.id}`, { method: "DELETE", credentials: "include", cache: "no-store" });
    } catch {
      r = null;
    }
    if (!r || !r.ok) {
      setChecklist(prev);
      onError("Couldn't delete — try again.");
    }
  }

  async function addItem(phase: number) {
    const title = (newTitleByPhase[phase] ?? "").trim();
    if (!title) return;
    onError(null);
    setAdding(true);
    let r: Response | null;
    try {
      r = await fetch(`/api/studio/crm/deals/${deal.id}/checklist`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, phase }),
      });
    } catch {
      r = null;
    }
    setAdding(false);
    if (!r || !r.ok) {
      onError("Couldn't add that item — try again.");
      return;
    }
    const j = (await r.json()) as { item: ChecklistRow };
    setChecklist((cur) => [...cur, j.item]);
    setNewTitleByPhase((cur) => ({ ...cur, [phase]: "" }));
  }

  async function removeAll() {
    if (!confirm("Remove the entire checklist? This can't be undone.")) return;
    onError(null);
    setRemoving(true);
    const prev = checklist;
    setChecklist([]);
    let r: Response | null;
    try {
      r = await fetch(`/api/studio/crm/deals/${deal.id}/checklist`, {
        method: "DELETE",
        credentials: "include",
        cache: "no-store",
      });
    } catch {
      r = null;
    }
    setRemoving(false);
    if (!r || !r.ok) {
      setChecklist(prev);
      onError("Couldn't remove the checklist — try again.");
    }
  }

  if (checklist.length === 0) {
    return (
      <section className="bg-white rounded-2xl border border-navy/5 p-4 space-y-3">
        <h2 className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Listing checklist</h2>
        <button
          onClick={seed}
          disabled={seeding}
          className="w-full bg-teal text-white font-ui font-medium text-sm tracking-wider uppercase py-3.5 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          {seeding ? "Adding…" : "Add listing checklist"}
        </button>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-2xl border border-navy/5 divide-y divide-navy/5">
      <div className="p-4 pb-2 flex items-center justify-between">
        <h2 className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Listing checklist</h2>
        <span className="font-ui text-xs tracking-wider text-charcoal-light">
          {done}/{checklist.length}
        </span>
      </div>

      {CHECKLIST_PHASE_ORDER.map((phase) => {
        const items = checklist.filter((i) => i.phase === phase);
        const phaseDone = items.filter((i) => i.done_at).length;
        const isOpen = !!expanded[phase];
        return (
          <div key={phase}>
            <button
              onClick={() => setExpanded((cur) => ({ ...cur, [phase]: !cur[phase] }))}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <span className="font-ui text-sm text-navy">
                {isOpen ? "▾" : "▸"} {CHECKLIST_PHASE_LABELS[phase] ?? `Phase ${phase}`}
              </span>
              <span className="font-ui text-xs tracking-wider text-charcoal-light">
                {phaseDone}/{items.length}
              </span>
            </button>

            {isOpen && (
              <div className="divide-y divide-navy/5 border-t border-navy/5">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 px-4 py-2.5">
                    <button
                      onClick={() => toggleDone(item)}
                      aria-label={item.done_at ? "Mark not done" : "Mark done"}
                      className={`shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs ${
                        item.done_at ? "bg-teal border-teal text-white" : "border-navy/20 text-transparent"
                      }`}
                    >
                      ✓
                    </button>
                    <span
                      className={`flex-1 min-w-0 font-body text-sm ${
                        item.done_at ? "line-through text-charcoal-light" : "text-navy"
                      }`}
                    >
                      {item.title}
                    </span>
                    <button
                      onClick={() => remove(item)}
                      aria-label="Delete item"
                      className="shrink-0 w-6 h-6 flex items-center justify-center text-charcoal-light text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div className="flex gap-2 px-4 py-2.5">
                  <input
                    value={newTitleByPhase[phase] ?? ""}
                    onChange={(e) => setNewTitleByPhase((cur) => ({ ...cur, [phase]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && addItem(phase)}
                    placeholder="+ item"
                    className="flex-1 min-w-0 bg-cream border border-navy/10 rounded-xl px-3 py-2 font-body text-sm focus:outline-none focus:border-teal"
                  />
                  <button
                    onClick={() => addItem(phase)}
                    disabled={adding || !(newTitleByPhase[phase] ?? "").trim()}
                    className="shrink-0 bg-navy text-cream font-ui text-xs tracking-wider uppercase px-4 py-2 rounded-xl disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="p-4">
        <button
          onClick={removeAll}
          disabled={removing}
          className="w-full text-center font-ui text-xs tracking-wider uppercase text-red-600 py-2 disabled:opacity-60"
        >
          Remove checklist
        </button>
      </div>
    </section>
  );
}

// ============================================================
// Client portal
// ============================================================

function PortalCard({
  deal,
  onUpdated,
  onError,
}: {
  deal: DealRow;
  onUpdated: (d: DealRow) => void;
  onError: (msg: string | null) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const token = deal.portal_token;
  const relPath = token ? `/portal/${token}` : null;
  const fullUrl = token ? `https://brendavegarealty.com/portal/${token}` : null;

  async function create() {
    onError(null);
    setBusy(true);
    let r: Response | null;
    try {
      r = await fetch(`/api/studio/crm/deals/${deal.id}/portal`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
    } catch {
      r = null;
    }
    setBusy(false);
    if (!r || !r.ok) {
      onError("Couldn't create the portal link — try again.");
      return;
    }
    const j = (await r.json()) as { portalToken: string };
    onUpdated({ ...deal, portal_token: j.portalToken });
  }

  async function regenerate() {
    if (!confirm("Regenerate the portal link? The old link will stop working immediately.")) return;
    await create();
  }

  async function turnOff() {
    if (!confirm("Turn off the client portal? The link will stop working immediately.")) return;
    onError(null);
    setBusy(true);
    let r: Response | null;
    try {
      r = await fetch(`/api/studio/crm/deals/${deal.id}/portal`, {
        method: "DELETE",
        credentials: "include",
        cache: "no-store",
      });
    } catch {
      r = null;
    }
    setBusy(false);
    if (!r || !r.ok) {
      onError("Couldn't turn off the portal — try again.");
      return;
    }
    onUpdated({ ...deal, portal_token: null });
  }

  async function copy() {
    if (!fullUrl) return;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      onError("Couldn't copy — select and copy the link manually.");
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-navy/5 p-4 space-y-3">
      <h2 className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Client portal</h2>

      {!token && (
        <button
          onClick={create}
          disabled={busy}
          className="w-full bg-teal text-white font-ui font-medium text-sm tracking-wider uppercase py-3.5 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create client portal link"}
        </button>
      )}

      {token && (
        <div className="space-y-3">
          <button
            onClick={copy}
            className="w-full text-left bg-cream border border-navy/10 rounded-xl p-3 font-body text-xs text-navy break-all"
          >
            {fullUrl}
          </button>
          {copied && <div className="font-ui text-[0.65rem] tracking-wider uppercase text-teal">Copied ✓</div>}
          <div className="flex gap-2">
            <a
              href={relPath ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="flex-1 text-center bg-navy text-cream font-ui text-xs tracking-wider uppercase py-3 rounded-xl active:scale-[0.98] transition-transform"
            >
              Open
            </a>
            <button
              onClick={regenerate}
              disabled={busy}
              className="flex-1 bg-white border border-navy/10 text-navy font-ui text-xs tracking-wider uppercase py-3 rounded-xl disabled:opacity-60"
            >
              Regenerate
            </button>
            <button
              onClick={turnOff}
              disabled={busy}
              className="flex-1 bg-white border border-red-200 text-red-600 font-ui text-xs tracking-wider uppercase py-3 rounded-xl disabled:opacity-60"
            >
              Turn off
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
