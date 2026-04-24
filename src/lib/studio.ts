export interface WorkflowState {
  scriptReady?: boolean;
  recorded?: boolean;
  edited?: boolean;
  postedToYouTube?: boolean;
  youtubeUrl?: string | null;
  notes?: string;
  updatedAt?: string;
}

export interface StateResponse {
  state: Record<string, WorkflowState>;
}

export const WORKFLOW_STEPS = [
  { key: "scriptReady", label: "Script ready" },
  { key: "recorded", label: "Recorded" },
  { key: "edited", label: "Edited" },
  { key: "postedToYouTube", label: "Posted to YouTube" },
] as const;

export type WorkflowKey = (typeof WORKFLOW_STEPS)[number]["key"];

export function stepsDone(s: WorkflowState | undefined): number {
  if (!s) return 0;
  let n = 0;
  for (const step of WORKFLOW_STEPS) if (s[step.key]) n += 1;
  return n;
}

export function isComplete(s: WorkflowState | undefined): boolean {
  return stepsDone(s) === WORKFLOW_STEPS.length;
}

// Week helpers — weeks start on Monday
export function mondayOf(dateStr: string): Date {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  m.setHours(0, 0, 0, 0);
  return m;
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function isPastDue(publishDate: string, s: WorkflowState | undefined): boolean {
  if (isComplete(s)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(publishDate + "T00:00:00");
  return d < today;
}

export function isPublished(publishDate: string): boolean {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const d = new Date(publishDate + "T00:00:00");
  return d <= today;
}
