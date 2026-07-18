// Pure reminder-selection logic for the CRM push cron. Kept dependency-free
// (no worker types, no push library) so it's safely import-able from jest.

export interface ReminderNow {
  date: string; // "YYYY-MM-DD" (Pacific)
  hhmm: string; // "HH:MM" (Pacific, 24h, zero-padded)
  hour: number; // 0-23 (Pacific)
}

export interface ReminderTask {
  id: string;
  title: string;
  due_at: string | null;
  notified_at: string | null;
  done_at: string | null;
}

export interface ReminderMilestone {
  id: string;
  deal_id: string;
  title: string;
  date: string | null;
  status: string;
  reminded_day_before: string | null;
  reminded_day_of: string | null;
}

export interface SelectRemindersResult {
  dueTaskIds: string[];
  dayBefore: string[];
  dayOf: string[];
}

// "YYYY-MM-DD" + 1 day, UTC-safe (noon anchor avoids DST/local-midnight
// edge cases when this ever runs somewhere other than UTC).
export function tomorrow(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function selectReminders(
  now: ReminderNow,
  tasks: ReminderTask[],
  milestones: ReminderMilestone[]
): SelectRemindersResult {
  const dueTaskIds: string[] = [];
  for (const t of tasks) {
    if (t.due_at === null || t.done_at !== null || t.notified_at !== null) continue;
    const hasTime = t.due_at.includes("T");
    const isDue = hasTime
      ? t.due_at <= `${now.date}T${now.hhmm}`
      : t.due_at <= now.date && now.hour >= 8;
    if (isDue) dueTaskIds.push(t.id);
  }

  const dayBefore: string[] = [];
  const dayOf: string[] = [];
  const tmrw = tomorrow(now.date);
  for (const m of milestones) {
    if (m.status !== "upcoming" || m.date === null) continue;
    if (m.date === tmrw && now.hour >= 9 && !m.reminded_day_before) {
      dayBefore.push(m.id);
    }
    if (m.date === now.date && now.hour >= 8 && !m.reminded_day_of) {
      dayOf.push(m.id);
    }
  }

  return { dueTaskIds, dayBefore, dayOf };
}
