"use client";

import { useMemo, useState } from "react";
import type { TaskRow } from "@/lib/crm/types";
import { TASK_TYPES, TASK_TYPE_ICONS } from "@/lib/crm/types";
import type { TaskType } from "@/lib/crm/types";
import { formatDue, pacificTodayClient } from "@/lib/crm/format";
import { Card, EmptyState, ErrorText, SectionTitle, crmJson } from "@/components/studio/crm/ui";
import { TaskSheet } from "./TaskSheet";

export type SetTasks = (fn: (prev: TaskRow[]) => TaskRow[]) => void;

function typeIcon(t: string): string {
  return (TASK_TYPES as readonly string[]).includes(t) ? TASK_TYPE_ICONS[t as TaskType] : "•";
}

function TaskLine({ task, today, onToggle }: { task: TaskRow; today: string; onToggle: (t: TaskRow) => void }) {
  const done = !!task.done_at;
  const overdue = !done && !!task.due_at && task.due_at.slice(0, 10) < today;
  return (
    <label className="flex items-center gap-3 min-h-11 py-1 cursor-pointer rounded-lg hover:bg-navy/5 px-1 -mx-1">
      <input type="checkbox" checked={done} onChange={() => onToggle(task)} className="w-5 h-5 shrink-0 accent-navy" aria-label={task.title} />
      <span className="text-base shrink-0 w-6 text-center" aria-hidden="true">
        {typeIcon(task.type)}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block font-body text-sm truncate ${done ? "line-through text-charcoal-light" : "text-navy"}`}>{task.title}</span>
        {task.due_at && (
          <span className={`block font-ui text-[0.6rem] tracking-wider uppercase ${overdue ? "text-red-700" : "text-charcoal-light"}`}>
            {overdue ? "Overdue · " : ""}
            {formatDue(task.due_at)}
          </span>
        )}
      </span>
    </label>
  );
}

export function TasksCard({
  contactId,
  tasks,
  setTasks,
  onTaskDone,
}: {
  contactId: string;
  tasks: TaskRow[];
  setTasks: SetTasks;
  onTaskDone: () => void;
}) {
  const [showDone, setShowDone] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const today = pacificTodayClient();

  const open = useMemo(
    () => tasks.filter((t) => !t.done_at).sort((a, b) => (a.due_at ?? "9999").localeCompare(b.due_at ?? "9999")),
    [tasks]
  );
  const done = useMemo(() => tasks.filter((t) => !!t.done_at).sort((a, b) => (a.done_at! < b.done_at! ? 1 : -1)), [tasks]);

  async function toggle(t: TaskRow) {
    const nextDone = !t.done_at;
    setErr(null);
    setTasks((cur) => cur.map((x) => (x.id === t.id ? { ...x, done_at: nextDone ? new Date().toISOString() : null } : x)));
    try {
      const j = await crmJson<{ task: TaskRow }>(`/api/studio/crm/tasks/${t.id}`, {
        method: "PATCH",
        body: JSON.stringify({ done: nextDone }),
      });
      if (j.task) setTasks((cur) => cur.map((x) => (x.id === t.id ? j.task : x)));
      if (nextDone) onTaskDone();
    } catch (e) {
      setTasks((cur) => cur.map((x) => (x.id === t.id ? t : x)));
      setErr(e instanceof Error ? e.message : "Couldn't update. Try again.");
    }
  }

  return (
    <Card className="p-4 space-y-3">
      <SectionTitle
        count={open.length || undefined}
        action={
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label="Add task"
            className="w-10 h-10 rounded-full flex items-center justify-center text-teal hover:bg-navy/5 text-xl leading-none"
          >
            +
          </button>
        }
      >
        Tasks
      </SectionTitle>

      <ErrorText>{err}</ErrorText>

      {open.length === 0 && <EmptyState>No open tasks.</EmptyState>}
      <div className="divide-y divide-navy/5">
        {open.map((t) => (
          <TaskLine key={t.id} task={t} today={today} onToggle={toggle} />
        ))}
      </div>

      {done.length > 0 && (
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            aria-expanded={showDone}
            className="font-ui text-[0.65rem] tracking-wider uppercase text-charcoal-light hover:text-navy min-h-10 px-1"
          >
            {showDone ? "Hide completed" : `Show completed (${done.length})`}
          </button>
          {showDone && (
            <div className="divide-y divide-navy/5">
              {done.map((t) => (
                <TaskLine key={t.id} task={t} today={today} onToggle={toggle} />
              ))}
            </div>
          )}
        </div>
      )}

      <TaskSheet
        open={sheetOpen}
        contactId={contactId}
        onClose={() => setSheetOpen(false)}
        onCreated={(task) => setTasks((cur) => [task, ...cur])}
      />
    </Card>
  );
}
