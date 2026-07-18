// Pacific-time helpers. Local/server dates (task due_at, milestone dates) are
// stored as naive Pacific dates/times, not UTC ISO timestamps.

function pacificParts(): Record<string, string> {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date());
  const out: Record<string, string> = {};
  for (const p of parts) out[p.type] = p.value;
  return out;
}

// "YYYY-MM-DD" in America/Los_Angeles.
export function pacificToday(): string {
  const p = pacificParts();
  return `${p.year}-${p.month}-${p.day}`;
}

// Full Pacific date + time-of-day breakdown, for callers that need the hour.
export function pacificNow(): { date: string; hhmm: string; hour: number } {
  const p = pacificParts();
  // Intl's 24h "hour12: false" reports midnight as "24" in some environments;
  // normalize to 0.
  const hour = Number(p.hour) % 24;
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    hhmm: `${p.hour.padStart(2, "0")}:${p.minute}`,
    hour,
  };
}
