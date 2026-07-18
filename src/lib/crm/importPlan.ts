import { Stage } from "./normalize";
import { ImportContact } from "./csv";

export interface ExistingContact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  tags: string;
  notes: string;
}

export interface NewContactRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  stage: Stage;
  source: string;
  tags: string;
  notes: string;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
}

export interface ContactUpdate {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  tags: string;
  notes: string;
  updated_at: string;
  last_activity_at: string;
}

export interface ImportPlan {
  inserts: NewContactRow[];
  updates: ContactUpdate[];
  created: number;
  merged: number;
  skipped: number;
}

type Target = { kind: "existing"; id: string } | { kind: "pending"; idx: number };

function mergeTagsJson(existingTagsJson: string, incoming: string[]): string {
  let existing: string[] = [];
  try {
    const parsed = JSON.parse(existingTagsJson);
    if (Array.isArray(parsed)) existing = parsed.filter((t) => typeof t === "string");
  } catch {
    existing = [];
  }
  const union = new Set([...existing, ...incoming]);
  return JSON.stringify([...union]);
}

function mergeNotes(current: string, incoming: string): string {
  if (!incoming) return current;
  return current ? `${current}\n${incoming}` : incoming;
}

function fillBlankName(current: string, incoming: string): string {
  return current && current.trim() ? current : incoming;
}

/**
 * Pure planning function for CRM contact imports. Given normalized rows,
 * a set of candidate existing contacts (already matched on email/phone by
 * the caller's bulk SELECT), and the current timestamp, produces the exact
 * set of INSERT/UPDATE rows to write — with intra-payload duplicates merged
 * into a single pending insert rather than emitted as separate rows.
 *
 * No I/O. `newId` is injected so tests can assert exact generated ids.
 */
export function planImport(
  rows: ImportContact[],
  existing: ExistingContact[],
  nowIso: string,
  newId: () => string
): ImportPlan {
  const emailIndex = new Map<string, Target>();
  const phoneIndex = new Map<string, Target>();
  const existingById = new Map(existing.map((e) => [e.id, e]));

  for (const e of existing) {
    if (e.email) emailIndex.set(e.email, { kind: "existing", id: e.id });
    if (e.phone) phoneIndex.set(e.phone, { kind: "existing", id: e.id });
  }

  const inserts: NewContactRow[] = [];
  const updatesById = new Map<string, ContactUpdate>();

  let created = 0;
  let merged = 0;
  let skipped = 0;

  for (const row of rows) {
    const firstName = (row.firstName ?? "").trim();
    const lastName = (row.lastName ?? "").trim();
    const email = row.email;
    const phone = row.phone;

    const hasName = Boolean(firstName || lastName);
    const hasEmail = Boolean(email);
    const hasPhone = Boolean(phone);

    if (!hasName && !hasEmail && !hasPhone) {
      skipped++;
      continue;
    }

    const tags = Array.isArray(row.tags) ? row.tags.filter((t) => typeof t === "string") : [];
    const notes = typeof row.notes === "string" ? row.notes : "";

    let target: Target | undefined;
    if (email && emailIndex.has(email)) target = emailIndex.get(email);
    if (!target && phone && phoneIndex.has(phone)) target = phoneIndex.get(phone);

    if (!target) {
      const id = newId();
      const createdAt = row.createdAt || nowIso;
      const insertRow: NewContactRow = {
        id,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        stage: row.stage,
        source: "import",
        tags: mergeTagsJson("[]", tags),
        notes,
        created_at: createdAt,
        updated_at: nowIso,
        last_activity_at: createdAt,
      };
      const idx = inserts.push(insertRow) - 1;
      const pendingTarget: Target = { kind: "pending", idx };
      if (email) emailIndex.set(email, pendingTarget);
      if (phone) phoneIndex.set(phone, pendingTarget);
      created++;
      continue;
    }

    if (target.kind === "pending") {
      const ins = inserts[target.idx];
      ins.first_name = fillBlankName(ins.first_name, firstName);
      ins.last_name = fillBlankName(ins.last_name, lastName);
      ins.email = ins.email ?? email;
      ins.phone = ins.phone ?? phone;
      ins.notes = mergeNotes(ins.notes, notes);
      ins.tags = mergeTagsJson(ins.tags, tags);
      if (email && !emailIndex.has(email)) emailIndex.set(email, target);
      if (phone && !phoneIndex.has(phone)) phoneIndex.set(phone, target);
      merged++;
      continue;
    }

    const base = existingById.get(target.id);
    if (!base) {
      // Shouldn't happen — the target was seeded from `existing` — but guard
      // defensively rather than throwing on malformed caller input.
      skipped++;
      continue;
    }
    let upd = updatesById.get(target.id);
    if (!upd) {
      upd = {
        id: target.id,
        first_name: base.first_name,
        last_name: base.last_name,
        email: base.email,
        phone: base.phone,
        tags: base.tags,
        notes: base.notes,
        updated_at: nowIso,
        last_activity_at: nowIso,
      };
    }
    upd.first_name = fillBlankName(upd.first_name, firstName);
    upd.last_name = fillBlankName(upd.last_name, lastName);
    upd.email = upd.email ?? email;
    upd.phone = upd.phone ?? phone;
    upd.notes = mergeNotes(upd.notes, notes);
    upd.tags = mergeTagsJson(upd.tags, tags);
    updatesById.set(target.id, upd);
    if (email && !emailIndex.has(email)) emailIndex.set(email, target);
    if (phone && !phoneIndex.has(phone)) phoneIndex.set(phone, target);
    merged++;
  }

  return { inserts, updates: [...updatesById.values()], created, merged, skipped };
}
