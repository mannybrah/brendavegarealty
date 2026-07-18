"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StudioShell } from "@/components/studio/StudioShell";
import { CrmTabs } from "@/components/studio/crm/CrmTabs";
import { ContactRow } from "@/components/studio/crm/ContactListItem";

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
  contact_name: string | null;
  deal_address: string | null;
}

function formatDueDate(dateStr: string): string {
  const d = new Date(`${dateStr.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr.slice(0, 10);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function CrmTasksPage() {
  return (
    <StudioShell title="Tasks" backHref="/studio/crm">
      <TasksInner />
    </StudioShell>
  );
}

function TasksInner() {
  const [openTasks, setOpenTasks] = useState<TaskRow[] | null>(null);
  const [doneTasks, setDoneTasks] = useState<TaskRow[] | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [showDone, setShowDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function fetchOpen(signal?: AbortSignal) {
    fetch(`/api/studio/crm/tasks?view=open`, { credentials: "include", cache: "no-store", signal })
      .then((r) => (r.ok ? r.json() : { tasks: [], today: null }))
      .then((j: { tasks: TaskRow[]; today: string }) => {
        setOpenTasks(j.tasks ?? []);
        setToday(j.today);
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setOpenTasks([]);
      });
  }

  function fetchDone(signal?: AbortSignal) {
    fetch(`/api/studio/crm/tasks?view=done`, { credentials: "include", cache: "no-store", signal })
      .then((r) => (r.ok ? r.json() : { tasks: [] }))
      .then((j: { tasks: TaskRow[] }) => setDoneTasks(j.tasks ?? []))
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setDoneTasks([]);
      });
  }

  function fetchAll() {
    fetchOpen();
    fetchDone();
  }

  useEffect(() => {
    const c1 = new AbortController();
    const c2 = new AbortController();
    fetchOpen(c1.signal);
    fetchDone(c2.signal);
    return () => {
      c1.abort();
      c2.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/studio/crm/contacts`, { credentials: "include", cache: "no-store", signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { contacts: [] }))
      .then((j: { contacts: ContactRow[] }) => setContacts(j.contacts ?? []))
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
      });
    return () => controller.abort();
  }, []);

  async function toggleTask(task: TaskRow) {
    const nextDone = !task.done_at;
    const prevOpen = openTasks;
    const prevDone = doneTasks;
    setErr(null);
    if (nextDone) {
      setOpenTasks((cur) => (cur ?? []).filter((t) => t.id !== task.id));
      setDoneTasks((cur) => [{ ...task, done_at: new Date().toISOString() }, ...(cur ?? [])]);
    } else {
      setDoneTasks((cur) => (cur ?? []).filter((t) => t.id !== task.id));
      setOpenTasks((cur) => [...(cur ?? []), { ...task, done_at: null }]);
    }
    let r: Response | null;
    try {
      r = await fetch(`/api/studio/crm/tasks/${task.id}`, {
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
      setOpenTasks(prevOpen);
      setDoneTasks(prevDone);
      setErr("Couldn't update — try again.");
      return;
    }
    fetchAll();
  }

  const loaded = openTasks !== null && doneTasks !== null && today !== null;
  const open = openTasks ?? [];
  const overdue = today ? open.filter((t) => t.due_at && t.due_at.slice(0, 10) < today) : [];
  const dueToday = today ? open.filter((t) => t.due_at && t.due_at.slice(0, 10) === today) : [];
  const upcoming = today ? open.filter((t) => t.due_at && t.due_at.slice(0, 10) > today) : [];
  const noDate = open.filter((t) => !t.due_at);

  return (
    <div className="space-y-4">
      <CrmTabs active="tasks" />

      <QuickAdd contacts={contacts} onAdded={fetchAll} />

      {err && <div className="font-body text-sm text-red-600">{err}</div>}

      {!loaded && <div className="font-body text-sm text-charcoal-light">Loading…</div>}

      {loaded && open.length === 0 && (doneTasks ?? []).length === 0 && (
        <div className="font-body text-sm text-charcoal-light">No tasks yet — add one above.</div>
      )}

      {loaded && (
        <>
          <TaskSection title="Overdue" tasks={overdue} accent onToggle={toggleTask} />
          <TaskSection title="Today" tasks={dueToday} onToggle={toggleTask} />
          <TaskSection title="Upcoming" tasks={upcoming} onToggle={toggleTask} />
          <TaskSection title="No date" tasks={noDate} onToggle={toggleTask} />

          {(doneTasks ?? []).length > 0 && (
            <section>
              <button
                onClick={() => setShowDone((v) => !v)}
                className="w-full flex items-center justify-between font-ui text-xs tracking-wider uppercase text-charcoal-light mb-2"
              >
                <span>Done ({(doneTasks ?? []).length})</span>
                <span className={`transition-transform ${showDone ? "rotate-180" : ""}`}>▾</span>
              </button>
              {showDone && (
                <div className="bg-white rounded-2xl border border-navy/5 divide-y divide-navy/5">
                  {(doneTasks ?? []).map((t) => (
                    <TaskItem key={t.id} task={t} onToggle={toggleTask} />
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function TaskSection({
  title,
  tasks,
  accent,
  onToggle,
}: {
  title: string;
  tasks: TaskRow[];
  accent?: boolean;
  onToggle: (t: TaskRow) => void;
}) {
  if (tasks.length === 0) return null;
  return (
    <section>
      <h2 className="font-ui text-xs tracking-wider uppercase text-charcoal-light mb-2">
        {title} ({tasks.length})
      </h2>
      <div className="bg-white rounded-2xl border border-navy/5 divide-y divide-navy/5">
        {tasks.map((t) => (
          <TaskItem key={t.id} task={t} accent={accent} onToggle={onToggle} />
        ))}
      </div>
    </section>
  );
}

function TaskItem({
  task,
  accent,
  onToggle,
}: {
  task: TaskRow;
  accent?: boolean;
  onToggle: (t: TaskRow) => void;
}) {
  const done = !!task.done_at;
  return (
    <div className={`flex items-center gap-3 p-4 ${accent && !done ? "border-l-4 border-red-400" : ""}`}>
      <input
        type="checkbox"
        checked={done}
        onChange={() => onToggle(task)}
        className="w-4 h-4 shrink-0 accent-teal"
      />
      <span
        className={`font-body text-sm flex-1 min-w-0 truncate ${done ? "line-through text-charcoal-light" : "text-navy"}`}
      >
        {task.title}
      </span>
      {task.contact_id && task.contact_name && (
        <Link
          href={`/studio/crm/contact?id=${task.contact_id}`}
          className="shrink-0 font-ui text-[0.6rem] tracking-wider uppercase bg-navy/5 text-navy px-2.5 py-1 rounded-full truncate max-w-[100px]"
        >
          {task.contact_name}
        </Link>
      )}
      {task.deal_id && (
        <Link
          href={`/studio/crm/deal?id=${task.deal_id}`}
          className="shrink-0 font-ui text-[0.6rem] tracking-wider uppercase bg-teal/10 text-teal px-2.5 py-1 rounded-full truncate max-w-[100px]"
        >
          {task.deal_address || "Deal"}
        </Link>
      )}
      {task.due_at && (
        <span className="font-ui text-[0.65rem] text-charcoal-light shrink-0">{formatDueDate(task.due_at)}</span>
      )}
    </div>
  );
}

function QuickAdd({ contacts, onAdded }: { contacts: ContactRow[]; onAdded: () => void }) {
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [contactId, setContactId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function add() {
    if (!title.trim()) return;
    setErr(null);
    setBusy(true);
    let r: Response | null;
    try {
      r = await fetch("/api/studio/crm/tasks", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          dueAt: dueAt || undefined,
          contactId: contactId || undefined,
        }),
      });
    } catch {
      r = null;
    }
    setBusy(false);
    if (r && r.ok) {
      setTitle("");
      setDueAt("");
      setContactId("");
      onAdded();
    } else {
      setErr("Couldn't save — try again.");
    }
  }

  return (
    <div className="sticky top-16 z-30 bg-cream -mx-5 px-5 pt-1 pb-3 space-y-2">
      <div className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add a task…"
          className="flex-1 min-w-0 bg-white border border-navy/10 rounded-xl px-4 py-3 font-body text-sm focus:outline-none focus:border-teal"
        />
        <button
          onClick={add}
          disabled={busy || !title.trim()}
          className="shrink-0 bg-teal text-white font-ui text-xs tracking-wider uppercase px-4 py-3 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          {busy ? "Adding…" : "+ Add"}
        </button>
      </div>
      <div className="flex gap-2">
        <input
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          type="date"
          className="flex-1 min-w-0 bg-white border border-navy/10 rounded-xl px-3 py-2.5 font-body text-xs focus:outline-none focus:border-teal"
        />
        <select
          value={contactId}
          onChange={(e) => setContactId(e.target.value)}
          className="flex-1 min-w-0 bg-white border border-navy/10 rounded-xl px-3 py-2.5 font-body text-xs focus:outline-none focus:border-teal"
        >
          <option value="">No contact</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {`${c.first_name} ${c.last_name}`.trim() || "No name"}
            </option>
          ))}
        </select>
      </div>
      {err && <div className="font-body text-xs text-red-600">{err}</div>}
    </div>
  );
}
