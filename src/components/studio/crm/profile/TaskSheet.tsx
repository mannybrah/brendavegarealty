"use client";

import { useState } from "react";
import type { TaskRow } from "@/lib/crm/types";
import { TASK_TYPES, TASK_TYPE_ICONS, TASK_TYPE_LABELS } from "@/lib/crm/types";
import type { TaskType } from "@/lib/crm/types";
import { Btn, ErrorText, Field, Sheet, crmJson, inputCls, selectCls } from "@/components/studio/crm/ui";

interface Props {
  open: boolean;
  contactId: string;
  onClose: () => void;
  onCreated: (task: TaskRow) => void;
}

// Mount the form only while open so its state starts fresh every time.
export function TaskSheet(props: Props) {
  if (!props.open) return null;
  return <TaskForm {...props} />;
}

function TaskForm({ contactId, onClose, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TaskType>("follow_up");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!title.trim()) {
      setErr("Give the task a title.");
      return;
    }
    setErr(null);
    setBusy(true);
    const dueAt = date ? (time ? `${date}T${time}` : date) : undefined;
    try {
      const j = await crmJson<{ task: TaskRow }>("/api/studio/crm/tasks", {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), type, dueAt, contactId }),
      });
      onCreated(j.task);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="New task"
      footer={
        <div className="flex gap-3">
          <Btn variant="secondary" onClick={onClose} className="flex-1" disabled={busy}>
            Cancel
          </Btn>
          <Btn onClick={save} className="flex-1" disabled={busy}>
            {busy ? "Saving…" : "Add task"}
          </Btn>
        </div>
      }
    >
      <Field label="Title">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
          }}
          placeholder="Call about the Willow Glen listing"
          className={inputCls}
          autoFocus
          autoComplete="off"
        />
      </Field>
      <Field label="Type">
        <select value={type} onChange={(e) => setType(e.target.value as TaskType)} className={selectCls}>
          {TASK_TYPES.map((t) => (
            <option key={t} value={t}>
              {TASK_TYPE_ICONS[t]} {TASK_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Time" hint={!date && time ? "Pick a date too." : undefined}>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
        </Field>
      </div>
      <ErrorText>{err}</ErrorText>
    </Sheet>
  );
}
