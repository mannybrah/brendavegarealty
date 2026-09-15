import { PALETTE_KEYS, PaletteKey } from "./stages";

export function formatPhone(digits: string): string {
  if (/^\d{10}$/.test(digits)) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return digits;
}

export function formatPrice(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const sec = Math.max(0, (now.getTime() - then.getTime()) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 7 * 86400) return `${Math.floor(sec / 86400)}d ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function relativeShort(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const sec = Math.max(0, (now.getTime() - then.getTime()) / 1000);
  if (sec < 60) return "now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  if (sec < 7 * 86400) return `${Math.floor(sec / 86400)}d`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function exactTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function daysSince(iso: string, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 86400000));
}

export function lastCommunicationLabel(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "No communication yet";
  const d = daysSince(iso, now);
  if (d === 0) return "Last communication today";
  if (d === 1) return "Last communication 1 day ago";
  return `Last communication ${d} days ago`;
}

// Short form for list rows: "today" | "3d" | "2mo" | "1y" | "never"
export function lastCommShort(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "never";
  const d = daysSince(iso, now);
  if (d === 0) return "today";
  if (d < 30) return `${d}d`;
  if (d < 365) return `${Math.floor(d / 30)}mo`;
  return `${Math.floor(d / 365)}y`;
}

export function initials(first: string, last: string): string {
  const s = `${first.trim().charAt(0)}${last.trim().charAt(0)}`.toUpperCase();
  return s || "?";
}

export function displayName(first: string, last: string, fallback = "No name"): string {
  return `${first} ${last}`.trim() || fallback;
}

export function avatarColor(name: string): PaletteKey {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const keys = PALETTE_KEYS.filter((k) => k !== "gray");
  return keys[h % keys.length];
}

// due_at is Pacific-naive: "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM".
export function formatDue(due: string | null): string {
  if (!due) return "";
  const [date, time] = due.split("T");
  const d = new Date(`${date}T00:00:00`);
  const label = Number.isNaN(d.getTime()) ? date : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (!time) return label;
  const [hh, mm] = time.split(":").map(Number);
  const ampm = hh >= 12 ? "pm" : "am";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${label} · ${h12}:${String(mm).padStart(2, "0")} ${ampm}`;
}

// Today's date in Pacific time as "YYYY-MM-DD" (client-side twin of the
// worker's pacificToday()).
export function pacificTodayClient(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
