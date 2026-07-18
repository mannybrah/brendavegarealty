"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { StudioShell } from "@/components/studio/StudioShell";
import { StagePill } from "@/components/studio/crm/StagePill";
import { ContactRow } from "@/components/studio/crm/ContactListItem";
import { STAGES, STAGE_LABELS, Stage } from "@/lib/crm/normalize";
import type { DealRow, MilestoneRow } from "@/lib/crm/portalTypes";

interface EventRow {
  id: string;
  contact_id: string;
  kind: string;
  body: string;
  meta: string | null;
  created_at: string;
}

interface TaskRow {
  id: string;
  contact_id: string | null;
  deal_id: string | null;
  milestone_id: string | null;
  title: string;
  due_at: string | null;
  done_at: string | null;
  notified_at: string | null;
  created_at: string;
}

const EVENT_ICON: Record<string, string> = {
  lead_submission: "📥",
  note: "📝",
  call: "📞",
  text: "💬",
  email: "✉️",
  stage_change: "🔁",
  task_done: "✅",
  deal: "🏠",
  system: "⚙️",
};

function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const sec = Math.max(0, (now.getTime() - then.getTime()) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 7 * 86400) return `${Math.floor(sec / 86400)}d ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function parseTags(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}

export default function ContactDetailPage() {
  return (
    <StudioShell title="Contact" backHref="/studio/crm">
      <Suspense fallback={<div className="font-body text-sm text-charcoal-light">Loading…</div>}>
        <ContactDetail />
      </Suspense>
    </StudioShell>
  );
}

function ContactDetail() {
  const router = useRouter();
  const id = useSearchParams().get("id");

  const [contact, setContact] = useState<ContactRow | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [dealProgress, setDealProgress] = useState<Record<string, { done: number; total: number }>>({});
  const [notFound, setNotFound] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showDealSheet, setShowDealSheet] = useState(false);

  function load(signal?: AbortSignal) {
    if (!id) return;
    fetch(`/api/studio/crm/contacts/${id}`, { credentials: "include", cache: "no-store", signal })
      .then((r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((j: { contact: ContactRow; events: EventRow[]; tasks: TaskRow[]; deals: DealRow[] } | null) => {
        if (j) {
          setContact(j.contact);
          setEvents(j.events ?? []);
          setTasks(j.tasks ?? []);
          setDeals(j.deals ?? []);
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

  // Deal progress ("done/total" milestones) isn't included on the list-deals
  // response, so we fetch it lazily per deal via GET /deals/:id. A contact
  // typically has 0-2 deals, so this stays cheap; we skip deals we've
  // already fetched counts for.
  useEffect(() => {
    if (deals.length === 0) return;
    const controller = new AbortController();
    deals.forEach((d) => {
      if (dealProgress[d.id]) return;
      fetch(`/api/studio/crm/deals/${d.id}`, { credentials: "include", cache: "no-store", signal: controller.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((j: { milestones: MilestoneRow[] } | null) => {
          if (!j) return;
          const total = j.milestones.length;
          const done = j.milestones.filter((m) => m.status === "done").length;
          setDealProgress((prev) => ({ ...prev, [d.id]: { done, total } }));
        })
        .catch((e) => {
          if (e instanceof DOMException && e.name === "AbortError") return;
        });
    });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deals]);

  if (!id) return <div className="font-body text-sm text-charcoal-light">Missing contact id.</div>;
  if (notFound) {
    return (
      <div className="space-y-4">
        <div className="font-body text-sm text-charcoal-light">This contact doesn&apos;t exist anymore.</div>
        <Link href="/studio/crm" className="font-ui text-xs tracking-wider uppercase text-teal">
          &larr; Back to Clients
        </Link>
      </div>
    );
  }
  if (!contact) return <div className="font-body text-sm text-charcoal-light">Loading…</div>;

  const name = `${contact.first_name} ${contact.last_name}`.trim() || "No name";

  async function patchContact(body: Record<string, unknown>): Promise<ContactRow | null> {
    let r: Response;
    try {
      r = await fetch(`/api/studio/crm/contacts/${id}`, {
        method: "PATCH",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      setErr("Network error — check your connection and try again.");
      return null;
    }
    if (!r.ok) {
      setErr("Something went wrong — try again.");
      return null;
    }
    const j = (await r.json()) as { contact: ContactRow };
    return j.contact;
  }

  async function changeStage(next: Stage) {
    if (!contact || next === contact.stage) return;
    const prev = contact;
    setErr(null);
    setContact({ ...contact, stage: next });
    const updated = await patchContact({ stage: next });
    if (!updated) {
      setContact(prev);
      return;
    }
    setContact(updated);
    load();
  }

  async function archive() {
    await changeStage("archived");
  }

  async function remove() {
    if (!confirm(`Delete ${name}? This can't be undone.`)) return;
    await fetch(`/api/studio/crm/contacts/${id}`, { method: "DELETE", credentials: "include" }).catch(() => null);
    router.push("/studio/crm");
  }

  return (
    <div className="space-y-6">
      {err && <div className="font-body text-sm text-red-600">{err}</div>}

      {/* 1. Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h1 className="font-display font-normal text-xl text-navy truncate">{name}</h1>
          <StagePill stage={contact.stage} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <ActionLink href={contact.phone ? `tel:${contact.phone}` : null} icon="📞" label="Call" />
          <ActionLink href={contact.phone ? `sms:${contact.phone}` : null} icon="💬" label="Text" />
          <ActionLink href={contact.email ? `mailto:${contact.email}` : null} icon="✉️" label="Email" />
        </div>
      </div>

      {/* 2. Stage stepper */}
      <div className="flex gap-2 overflow-x-auto -mx-5 px-5">
        {STAGES.map((s) => (
          <button
            key={s}
            onClick={() => changeStage(s)}
            className={`shrink-0 font-ui text-xs tracking-wider uppercase px-4 py-2 rounded-full transition-colors ${
              contact.stage === s ? "bg-navy text-cream" : "bg-white text-charcoal-light border border-navy/10"
            }`}
          >
            {STAGE_LABELS[s]}
          </button>
        ))}
      </div>

      {/* 3. Details card */}
      <DetailsCard contact={contact} onSaved={setContact} onError={setErr} />

      {/* 4. Deals */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Deals</h2>
          <button onClick={() => setShowDealSheet(true)} className="font-ui text-[0.65rem] tracking-wider uppercase text-teal">
            + Start deal
          </button>
        </div>
        {deals.length === 0 && (
          <div className="font-body text-sm text-charcoal-light">No deals yet.</div>
        )}
        <div className="space-y-2">
          {deals.map((d) => {
            const progress = dealProgress[d.id];
            return (
              <Link
                key={d.id}
                href={`/studio/crm/deal?id=${d.id}`}
                className="block bg-white rounded-2xl border border-navy/5 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg shrink-0">{d.side === "buyer" ? "🏠" : "💰"}</span>
                    <span className="font-body text-sm text-navy truncate">
                      {d.property_address || "No address yet"}
                    </span>
                  </div>
                  <span className="font-ui text-[0.6rem] tracking-wider uppercase text-charcoal-light shrink-0">
                    {d.status}
                  </span>
                </div>
                {progress && (
                  <div className="mt-2 font-ui text-[0.65rem] text-charcoal-light">
                    {progress.done}/{progress.total} milestones
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {/* 5. Tasks */}
      <TasksCard id={id} tasks={tasks} setTasks={setTasks} onTaskDone={load} />

      {/* 6. Timeline */}
      <TimelineCard id={id} events={events} setEvents={setEvents} onLogged={load} />

      {/* 7. Footer */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={archive}
          disabled={contact.stage === "archived"}
          className="flex-1 bg-white border border-navy/10 text-charcoal-light font-ui text-xs tracking-wider uppercase py-3.5 rounded-xl disabled:opacity-50"
        >
          {contact.stage === "archived" ? "Archived" : "Archive"}
        </button>
        <button
          onClick={remove}
          className="flex-1 bg-white border border-red-200 text-red-600 font-ui text-xs tracking-wider uppercase py-3.5 rounded-xl"
        >
          Delete
        </button>
      </div>

      {showDealSheet && (
        <StartDealSheet
          contactId={id}
          defaultSide={contact.type === "seller" ? "seller" : "buyer"}
          onClose={() => setShowDealSheet(false)}
          onCreated={(dealId) => router.push(`/studio/crm/deal?id=${dealId}`)}
        />
      )}
    </div>
  );
}

function ActionLink({ href, icon, label }: { href: string | null; icon: string; label: string }) {
  const base =
    "flex-1 flex flex-col items-center gap-1 py-3 rounded-xl font-ui text-[0.65rem] tracking-wider uppercase";
  if (!href) {
    return (
      <span className={`${base} bg-navy/5 text-charcoal-light/40 cursor-not-allowed`} aria-disabled="true">
        <span className="text-lg">{icon}</span>
        {label}
      </span>
    );
  }
  return (
    <a href={href} className={`${base} bg-white border border-navy/10 text-navy active:scale-[0.98] transition-transform`}>
      <span className="text-lg">{icon}</span>
      {label}
    </a>
  );
}

// ============================================================
// 3. Details card
// ============================================================

interface DetailsForm {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  type: string;
  tags: string;
  notes: string;
}

function formFromContact(c: ContactRow): DetailsForm {
  return {
    firstName: c.first_name,
    lastName: c.last_name,
    phone: c.phone ?? "",
    email: c.email ?? "",
    type: c.type ?? "",
    tags: parseTags(c.tags).join(", "),
    notes: c.notes ?? "",
  };
}

function DetailsCard({
  contact,
  onSaved,
  onError,
}: {
  contact: ContactRow;
  onSaved: (c: ContactRow) => void;
  onError: (msg: string | null) => void;
}) {
  const [form, setForm] = useState<DetailsForm>(() => formFromContact(contact));
  const [saving, setSaving] = useState(false);

  // Only reset the form from server data when we land on a *different*
  // contact — not on every background refresh (stage change, task done,
  // etc.) which would otherwise clobber in-progress edits.
  useEffect(() => {
    setForm(formFromContact(contact));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact.id]);

  const saved = formFromContact(contact);
  const dirty =
    form.firstName !== saved.firstName ||
    form.lastName !== saved.lastName ||
    form.phone !== saved.phone ||
    form.email !== saved.email ||
    form.type !== saved.type ||
    form.tags !== saved.tags ||
    form.notes !== saved.notes;

  async function save() {
    onError(null);
    setSaving(true);
    let r: Response;
    try {
      r = await fetch(`/api/studio/crm/contacts/${contact.id}`, {
        method: "PATCH",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          type: form.type.trim() || null,
          tags: form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          notes: form.notes,
        }),
      });
    } catch {
      onError("Network error — check your connection and try again.");
      setSaving(false);
      return;
    }
    setSaving(false);
    if (!r.ok) {
      onError("Save failed — try again.");
      return;
    }
    const j = (await r.json()) as { contact: ContactRow };
    onSaved(j.contact);
  }

  const field = "mt-2 w-full bg-white border border-navy/10 rounded-xl p-3 font-body text-sm focus:outline-none focus:border-teal";
  const label = "font-ui text-xs tracking-wider uppercase text-charcoal-light";

  return (
    <section className="bg-white rounded-2xl border border-navy/5 p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className={label}>First name</span>
          <input
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            className={field}
          />
        </label>
        <label className="block">
          <span className={label}>Last name</span>
          <input
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            className={field}
          />
        </label>
      </div>

      <label className="block">
        <span className={label}>Phone</span>
        <input
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          type="tel"
          className={field}
        />
      </label>

      <label className="block">
        <span className={label}>Email</span>
        <input
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          type="email"
          className={field}
        />
      </label>

      <label className="block">
        <span className={label}>Type</span>
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={field}>
          <option value="">Not set</option>
          <option value="buyer">Buyer</option>
          <option value="seller">Seller</option>
          <option value="both">Both</option>
          <option value="other">Other</option>
        </select>
      </label>

      <label className="block">
        <span className={label}>Tags</span>
        <input
          value={form.tags}
          onChange={(e) => setForm({ ...form, tags: e.target.value })}
          placeholder="first-time buyer, referral"
          className={field}
        />
        <p className="mt-1 font-body font-light text-xs text-charcoal-light">Comma-separated.</p>
      </label>

      <label className="block">
        <span className={label}>Background notes</span>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={4}
          className={field}
        />
      </label>

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
// 4. Start-deal sheet
// ============================================================

function StartDealSheet({
  contactId,
  defaultSide,
  onClose,
  onCreated,
}: {
  contactId: string;
  defaultSide: "buyer" | "seller";
  onClose: () => void;
  onCreated: (dealId: string) => void;
}) {
  const [side, setSide] = useState<"buyer" | "seller">(defaultSide);
  const [address, setAddress] = useState("");
  const [targetCloseDate, setTargetCloseDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    setBusy(true);
    let r: Response;
    try {
      r = await fetch("/api/studio/crm/deals", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          side,
          propertyAddress: address.trim() || undefined,
          targetCloseDate: targetCloseDate || undefined,
        }),
      });
    } catch {
      setErr("Network error — check your connection and try again.");
      setBusy(false);
      return;
    }
    if (!r.ok) {
      setErr("Something went wrong — try again.");
      setBusy(false);
      return;
    }
    const j = (await r.json()) as { deal: DealRow };
    onCreated(j.deal.id);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-navy/40" onClick={onClose}>
      <div
        className="w-full sm:max-w-sm bg-cream rounded-t-3xl sm:rounded-3xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-display font-normal text-lg text-navy">Start a deal</div>

        <div className="flex gap-2">
          {(["buyer", "seller"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSide(s)}
              className={`flex-1 font-ui text-xs tracking-wider uppercase py-3 rounded-xl transition-colors ${
                side === s ? "bg-navy text-cream" : "bg-white text-charcoal-light border border-navy/10"
              }`}
            >
              {s === "buyer" ? "🏠 Buyer" : "💰 Seller"}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Property address</span>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Optional"
            className="mt-2 w-full bg-white border border-navy/10 rounded-xl p-3 font-body text-sm focus:outline-none focus:border-teal"
          />
        </label>

        <label className="block">
          <span className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Target close date</span>
          <input
            value={targetCloseDate}
            onChange={(e) => setTargetCloseDate(e.target.value)}
            type="date"
            className="mt-2 w-full bg-white border border-navy/10 rounded-xl p-3 font-body text-sm focus:outline-none focus:border-teal"
          />
        </label>

        {err && <div className="text-sm text-red-600 font-body">{err}</div>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-white border border-navy/10 text-charcoal-light font-ui text-xs tracking-wider uppercase py-3.5 rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="flex-1 bg-teal text-white font-ui font-medium text-xs tracking-wider uppercase py-3.5 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            {busy ? "Starting…" : "Start deal"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 5. Tasks
// ============================================================

function TasksCard({
  id,
  tasks,
  setTasks,
  onTaskDone,
}: {
  id: string;
  tasks: TaskRow[];
  setTasks: React.Dispatch<React.SetStateAction<TaskRow[]>>;
  onTaskDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [busy, setBusy] = useState(false);

  async function toggle(t: TaskRow) {
    const nextDone = !t.done_at;
    const prev = t;
    setTasks((cur) => cur.map((x) => (x.id === t.id ? { ...x, done_at: nextDone ? new Date().toISOString() : null } : x)));
    let r: Response | null;
    try {
      r = await fetch(`/api/studio/crm/tasks/${t.id}`, {
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
      setTasks((cur) => cur.map((x) => (x.id === t.id ? prev : x)));
      return;
    }
    if (nextDone) onTaskDone();
  }

  async function addTask() {
    if (!title.trim()) return;
    setBusy(true);
    let r: Response | null;
    try {
      r = await fetch("/api/studio/crm/tasks", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), dueAt: dueAt || undefined, contactId: id }),
      });
    } catch {
      r = null;
    }
    setBusy(false);
    if (r && r.ok) {
      const j = (await r.json()) as { task: TaskRow };
      setTasks((cur) => [j.task, ...cur]);
      setTitle("");
      setDueAt("");
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-navy/5 p-4 space-y-3">
      <h2 className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Tasks</h2>

      {tasks.length === 0 && <div className="font-body text-sm text-charcoal-light">No tasks yet.</div>}

      <div className="space-y-2">
        {tasks.map((t) => (
          <label key={t.id} className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={!!t.done_at} onChange={() => toggle(t)} className="w-4 h-4 shrink-0 accent-teal" />
            <span className={`font-body text-sm flex-1 min-w-0 truncate ${t.done_at ? "line-through text-charcoal-light" : "text-navy"}`}>
              {t.title}
            </span>
            {t.due_at && <span className="font-ui text-[0.65rem] text-charcoal-light shrink-0">{t.due_at.slice(0, 10)}</span>}
          </label>
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="Add a task…"
          className="flex-1 min-w-0 bg-cream border border-navy/10 rounded-xl px-3 py-2.5 font-body text-sm focus:outline-none focus:border-teal"
        />
        <input
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          type="date"
          className="shrink-0 w-[130px] bg-cream border border-navy/10 rounded-xl px-2 py-2.5 font-body text-xs focus:outline-none focus:border-teal"
        />
        <button
          onClick={addTask}
          disabled={busy || !title.trim()}
          className="shrink-0 bg-navy text-cream font-ui text-xs tracking-wider uppercase px-4 py-2.5 rounded-xl disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </section>
  );
}

// ============================================================
// 6. Timeline
// ============================================================

const NOTE_KINDS = [
  { kind: "note", label: "Note" },
  { kind: "call", label: "Call" },
  { kind: "text", label: "Text" },
  { kind: "email", label: "Email" },
] as const;

function TimelineCard({
  id,
  events,
  setEvents,
  onLogged,
}: {
  id: string;
  events: EventRow[];
  setEvents: React.Dispatch<React.SetStateAction<EventRow[]>>;
  onLogged: () => void;
}) {
  const [kind, setKind] = useState<(typeof NOTE_KINDS)[number]["kind"]>("note");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function log() {
    if (!body.trim()) return;
    setBusy(true);
    let r: Response | null;
    try {
      r = await fetch(`/api/studio/crm/contacts/${id}/events`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, body: body.trim() }),
      });
    } catch {
      r = null;
    }
    setBusy(false);
    if (r && r.ok) {
      const j = (await r.json()) as { event: EventRow };
      setEvents((cur) => [j.event, ...cur]);
      setBody("");
      setKind("note");
      onLogged();
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-navy/5 p-4 space-y-4">
      <h2 className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Timeline</h2>

      <div className="space-y-2">
        <div className="flex gap-2">
          {NOTE_KINDS.map((k) => (
            <button
              key={k.kind}
              onClick={() => setKind(k.kind)}
              className={`flex-1 font-ui text-[0.65rem] tracking-wider uppercase py-2 rounded-lg transition-colors ${
                kind === k.kind ? "bg-navy text-cream" : "bg-cream text-charcoal-light border border-navy/10"
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder={`Log a ${kind}…`}
          className="w-full bg-cream border border-navy/10 rounded-xl p-3 font-body text-sm focus:outline-none focus:border-teal"
        />
        <button
          onClick={log}
          disabled={busy || !body.trim()}
          className="w-full bg-teal text-white font-ui font-medium text-xs tracking-wider uppercase py-2.5 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          {busy ? "Logging…" : `Log ${kind}`}
        </button>
      </div>

      <div className="space-y-3 divide-y divide-navy/5">
        {events.length === 0 && <div className="font-body text-sm text-charcoal-light pt-1">No activity yet.</div>}
        {events.map((e) => (
          <div key={e.id} className="flex items-start gap-3 pt-3 first:pt-0">
            <span className="text-base shrink-0">{EVENT_ICON[e.kind] ?? "•"}</span>
            <div className="min-w-0 flex-1">
              <div className="font-body text-sm text-navy whitespace-pre-wrap break-words">{e.body}</div>
              <div className="font-ui text-[0.6rem] tracking-wider uppercase text-charcoal-light mt-1">
                {relativeTime(e.created_at)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
