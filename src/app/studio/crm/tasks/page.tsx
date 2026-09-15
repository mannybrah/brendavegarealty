"use client";

// Tasks — Today / Overdue / Upcoming / Done. Server-side views (the worker
// decides what "today" means in Pacific time), so every tab change refetches.
// Completing a task is optimistic (the row leaves the list immediately) and
// reverts with an inline error if the PATCH fails.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CrmShell } from "@/components/studio/crm/CrmShell";
import {
  Btn,
  Card,
  EmptyState,
  ErrorText,
  SegmentedTabs,
  Spinner,
  TagBubble,
  crmJson,
  inputCls,
  selectCls,
} from "@/components/studio/crm/ui";
import {
  TASK_TYPES,
  TASK_TYPE_ICONS,
  TASK_TYPE_LABELS,
  type ContactListRow,
  type TaskListRow,
  type TaskType,
} from "@/lib/crm/types";
import { displayName, formatDue, relativeTime } from "@/lib/crm/format";

type TaskView = "today" | "overdue" | "upcoming" | "done";

interface TaskCounts {
  today: number;
  overdue: number;
  upcoming: number;
}

interface TaskListResponse {
  tasks: TaskListRow[];
  today: string;
  counts: TaskCounts;
}

interface PickedContact {
  id: string;
  name: string;
}

const EMPTY_COUNTS: TaskCounts = { today: 0, overdue: 0, upcoming: 0 };

const EMPTY_COPY: Record<TaskView, string> = {
  today: "Nothing due today. Add a task above or get ahead of tomorrow.",
  overdue: "Nothing overdue. Well done.",
  upcoming: "Nothing scheduled ahead yet.",
  done: "No completed tasks yet.",
};

function isAbort(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { name?: string }).name === "AbortError";
}

function errMessage(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

function typeIcon(type: string | null): string {
  const icons = TASK_TYPE_ICONS as Record<string, string>;
  return (type && icons[type]) || TASK_TYPE_ICONS.other;
}

export default function CrmTasksPage() {
  return (
    <CrmShell title="Tasks">
      <TasksInner />
    </CrmShell>
  );
}

function TasksInner() {
  const [view, setView] = useState<TaskView>("today");
  const [tasks, setTasks] = useState<TaskListRow[] | null>(null);
  const [counts, setCounts] = useState<TaskCounts>(EMPTY_COUNTS);
  // The view whose response we are currently showing; anything else means a
  // fetch for the selected view is still in flight.
  const [loadedView, setLoadedView] = useState<TaskView | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);

  // Single-flight: every load aborts its own prior in-flight request so an
  // older response can never overwrite state from a newer one.
  const controllerRef = useRef<AbortController | null>(null);

  const load = useCallback((v: TaskView) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    crmJson<TaskListResponse>(`/api/studio/crm/tasks?view=${v}`, { signal: controller.signal })
      .then((j) => {
        setTasks(j.tasks ?? []);
        setCounts(j.counts ?? EMPTY_COUNTS);
        setLoadedView(v);
      })
      .catch((e: unknown) => {
        if (isAbort(e)) return;
        setTasks([]);
        setErr(errMessage(e, "Couldn't load tasks. Try again."));
        setLoadedView(v);
      });
  }, []);

  useEffect(() => {
    load(view);
    return () => controllerRef.current?.abort();
  }, [view, load]);

  async function setDone(task: TaskListRow, done: boolean) {
    const prevTasks = tasks;
    const prevCounts = counts;
    setErr(null);
    // The row always leaves the current tab: completed on today/overdue/
    // upcoming, reopened on done.
    setTasks((cur) => (cur ?? []).filter((t) => t.id !== task.id));
    if (view !== "done") {
      setCounts((c) => ({ ...c, [view]: Math.max(0, c[view] - 1) }));
    }
    try {
      await crmJson(`/api/studio/crm/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ done }),
      });
    } catch (e: unknown) {
      setTasks(prevTasks);
      setCounts(prevCounts);
      setErr(errMessage(e, "Couldn't update. Try again."));
      return;
    }
    load(view);
  }

  async function moveOverdue() {
    setErr(null);
    setMoving(true);
    try {
      await crmJson(`/api/studio/crm/tasks/move-overdue`, { method: "POST" });
    } catch (e: unknown) {
      setErr(errMessage(e, "Couldn't move overdue tasks. Try again."));
      setMoving(false);
      return;
    }
    setMoving(false);
    load(view);
  }

  const rows = tasks ?? [];
  const loading = loadedView !== view;

  return (
    <div className="space-y-4">
      <QuickAdd onAdded={() => load(view)} />

      <SegmentedTabs<TaskView>
        tabs={[
          { key: "today", label: "Today", count: counts.today },
          { key: "overdue", label: "Overdue", count: counts.overdue },
          { key: "upcoming", label: "Upcoming", count: counts.upcoming },
          { key: "done", label: "Done" },
        ]}
        value={view}
        onChange={setView}
      />

      {err && <ErrorText>{err}</ErrorText>}

      {view === "overdue" && rows.length > 0 && (
        <div className="flex justify-end">
          <Btn variant="secondary" onClick={moveOverdue} disabled={moving}>
            {moving ? "Moving…" : "Move all to today"}
          </Btn>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : rows.length === 0 ? (
        <Card className="px-4 py-6">
          <EmptyState>{EMPTY_COPY[view]}</EmptyState>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul>
            {rows.map((t) => (
              <TaskItem key={t.id} task={t} view={view} onSetDone={setDone} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function TaskItem({
  task,
  view,
  onSetDone,
}: {
  task: TaskListRow;
  view: TaskView;
  onSetDone: (t: TaskListRow, done: boolean) => void;
}) {
  const isDone = view === "done";
  const due = formatDue(task.due_at);
  return (
    <li className="flex items-start gap-3 px-4 py-3 border-b border-navy/5 last:border-b-0">
      <input
        type="checkbox"
        checked={isDone}
        onChange={() => onSetDone(task, !isDone)}
        aria-label={isDone ? `Reopen ${task.title}` : `Complete ${task.title}`}
        className="mt-1 w-4 h-4 shrink-0 accent-gold cursor-pointer"
      />
      <span aria-hidden className="mt-0.5 shrink-0 text-sm leading-5">
        {typeIcon(task.type)}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`font-body text-sm leading-5 ${isDone ? "text-charcoal-light line-through" : "text-navy"}`}>
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-body font-light text-xs">
          {task.contact_id && task.contact_name && (
            <Link href={`/studio/crm/contact?id=${task.contact_id}`} className="text-teal hover:text-navy">
              {task.contact_name}
            </Link>
          )}
          {task.deal_address && <span className="text-charcoal-light truncate max-w-[16rem]">{task.deal_address}</span>}
          {due && (
            <span className={view === "overdue" ? "text-red-700" : "text-charcoal-light"}>
              {view === "overdue" ? `Due ${due}` : due}
            </span>
          )}
          {isDone && task.done_at && <span className="text-charcoal-light">Done {relativeTime(task.done_at)}</span>}
        </div>
      </div>
      {isDone && (
        <Btn variant="ghost" className="shrink-0" onClick={() => onSetDone(task, false)}>
          Undo
        </Btn>
      )}
    </li>
  );
}

// ------------------------------------------------------------
// Quick add bar
// ------------------------------------------------------------
function QuickAdd({ onAdded }: { onAdded: () => void }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TaskType>("follow_up");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [contact, setContact] = useState<PickedContact | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function add() {
    const t = title.trim();
    if (!t || busy) return;
    setErr(null);
    setBusy(true);
    // due_at is Pacific-naive: date alone, or date + time when both are set.
    const dueAt = date ? (time ? `${date}T${time}` : date) : undefined;
    try {
      await crmJson(`/api/studio/crm/tasks`, {
        method: "POST",
        body: JSON.stringify({ title: t, type, dueAt, contactId: contact?.id }),
      });
    } catch (e: unknown) {
      // Keep the draft so nothing typed is lost.
      setErr(errMessage(e, "Couldn't save. Try again."));
      setBusy(false);
      return;
    }
    setTitle("");
    setDate("");
    setTime("");
    setContact(null);
    setBusy(false);
    onAdded();
  }

  return (
    <Card className="p-3 lg:p-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void add();
            }
          }}
          placeholder="Add a task…"
          aria-label="Task title"
          className={`${inputCls} lg:flex-[2_1_0%]`}
        />
        <div className="flex gap-2 lg:contents">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TaskType)}
            aria-label="Task type"
            className={`${selectCls} flex-1 min-w-[7.5rem] lg:w-36 lg:flex-none`}
          >
            {TASK_TYPES.map((k) => (
              <option key={k} value={k}>
                {TASK_TYPE_LABELS[k]}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Due date"
            className={`${inputCls} flex-1 lg:w-40 lg:flex-none`}
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            aria-label="Due time"
            className={`${inputCls} flex-1 lg:w-32 lg:flex-none`}
          />
        </div>
        <ContactPicker value={contact} onChange={setContact} className="lg:flex-1 lg:min-w-0" />
        <Btn onClick={add} disabled={busy || !title.trim()} className="shrink-0">
          {busy ? "Adding…" : "Add"}
        </Btn>
      </div>
      {!date && time && (
        <p className="mt-2 font-body font-light text-xs text-charcoal-light">Pick a date to use that time.</p>
      )}
      {err && (
        <div className="mt-2">
          <ErrorText>{err}</ErrorText>
        </div>
      )}
    </Card>
  );
}

// Typeahead against /contacts?q=, debounced 250ms; a pick becomes a removable
// chip holding the contactId.
function ContactPicker({
  value,
  onChange,
  className = "",
}: {
  value: PickedContact | null;
  onChange: (c: PickedContact | null) => void;
  className?: string;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PickedContact[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  // Derived, so an emptied query hides stale names without a state write.
  const visible = q.trim().length < 1 ? [] : results;

  useEffect(() => {
    const term = q.trim();
    if (value || term.length < 1) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      crmJson<{ contacts: ContactListRow[] }>(`/api/studio/crm/contacts?q=${encodeURIComponent(term)}&limit=8`, {
        signal: controller.signal,
      })
        .then((j) => {
          setResults((j.contacts ?? []).map((c) => ({ id: c.id, name: displayName(c.first_name, c.last_name) })));
          setOpen(true);
        })
        .catch((e: unknown) => {
          if (isAbort(e)) return;
          setResults([]);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, value]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function pick(c: PickedContact) {
    onChange(c);
    setQ("");
    setResults([]);
    setOpen(false);
  }

  if (value) {
    return (
      <div className={`flex items-center ${className}`}>
        <TagBubble
          name={value.name}
          onRemove={() => {
            onChange(null);
            setQ("");
          }}
        />
      </div>
    );
  }

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => visible.length > 0 && setOpen(true)}
        placeholder="Link a contact…"
        aria-label="Link a contact"
        className={inputCls}
      />
      {open && visible.length > 0 && (
        <ul className="absolute z-40 left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto bg-white border border-navy/10 rounded-xl shadow-[0_8px_24px_rgba(15,29,53,0.12)]">
          {visible.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => pick(c)}
                className="w-full text-left px-3 py-2 font-body text-sm text-navy hover:bg-navy/5"
              >
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
