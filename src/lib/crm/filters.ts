import { SMART_LISTS } from "./smartLists";

export type SortKey = "name" | "last_communication" | "last_activity" | "created" | "stage";
export interface DayRule {
  op: "over" | "within" | "never";
  days: number;
}

export interface ContactFilters {
  q: string;
  stages: string[];
  tagsAny: string[];
  tagsNone: string[];
  source: string | null;
  type: string | null;
  lastComm: DayRule | null;
  created: DayRule | null;
  list: string | null;
  sort: SortKey;
  dir: "asc" | "desc";
  limit: number;
}

export const SORT_KEYS: SortKey[] = ["name", "last_communication", "last_activity", "created", "stage"];
export const SORT_LABELS: Record<SortKey, string> = {
  name: "Name",
  last_communication: "Last communication",
  last_activity: "Last activity",
  created: "Date added",
  stage: "Stage",
};

function csv(v: string | null): string[] {
  return (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function dayRule(v: string | null): DayRule | null {
  if (!v) return null;
  if (v === "never") return { op: "never", days: 0 };
  const m = v.match(/^(over|within):(\d+)$/);
  return m ? { op: m[1] as "over" | "within", days: Number(m[2]) } : null;
}

export function emptyFilters(): ContactFilters {
  return {
    q: "",
    stages: [],
    tagsAny: [],
    tagsNone: [],
    source: null,
    type: null,
    lastComm: null,
    created: null,
    list: null,
    sort: "last_activity",
    dir: "desc",
    limit: 500,
  };
}

export function parseFilters(params: URLSearchParams): ContactFilters {
  const sortRaw = params.get("sort");
  const limitRaw = Number(params.get("limit"));
  return {
    q: (params.get("q") ?? "").trim(),
    stages: csv(params.get("stages")),
    tagsAny: csv(params.get("tagsAny")),
    tagsNone: csv(params.get("tagsNone")),
    source: params.get("source")?.trim() || null,
    type: params.get("type")?.trim() || null,
    lastComm: dayRule(params.get("lastComm")),
    created: dayRule(params.get("created")),
    list: params.get("list")?.trim() || null,
    sort: SORT_KEYS.includes(sortRaw as SortKey) ? (sortRaw as SortKey) : "last_activity",
    dir: params.get("dir") === "asc" ? "asc" : "desc",
    limit: Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(1000, Math.floor(limitRaw)) : 500,
  };
}

function escapeLike(raw: string): string {
  return raw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function isoDaysAgo(nowIso: string, days: number): string {
  return new Date(new Date(nowIso).getTime() - days * 86400000).toISOString();
}

function marks(n: number): string {
  return Array.from({ length: n }, () => "?").join(", ");
}

// Merges a smart list's filter under explicit params (explicit non-empty wins).
export function effectiveFilters(f: ContactFilters): ContactFilters {
  if (!f.list) return f;
  const list = SMART_LISTS.find((l) => l.id === f.list);
  if (!list) return f;
  const base = list.filter;
  return {
    ...f,
    stages: f.stages.length ? f.stages : (base.stages ?? []),
    tagsAny: f.tagsAny.length ? f.tagsAny : (base.tagsAny ?? []),
    tagsNone: f.tagsNone.length ? f.tagsNone : (base.tagsNone ?? []),
    lastComm: f.lastComm ?? base.lastComm ?? null,
    created: f.created ?? base.created ?? null,
  };
}

// SQL fragments assume `contacts c LEFT JOIN stages s ON s.id = c.stage`.
export function buildContactQuery(
  filters: ContactFilters,
  nowIso: string
): { where: string; binds: unknown[]; orderBy: string } {
  const f = effectiveFilters(filters);
  const cond: string[] = [];
  const binds: unknown[] = [];

  if (f.q) {
    const p = `%${escapeLike(f.q)}%`;
    // Phone numbers are stored digits-only, so "(408) 555" or "408-555" can
    // never match the raw query. Strip the query to digits and compare that
    // instead whenever there are enough of them to be a phone fragment.
    const digits = f.q.replace(/\D/g, "");
    const phonePattern = digits.length >= 3 ? `%${digits}%` : p;
    cond.push(
      "(c.first_name LIKE ? ESCAPE '\\' OR c.last_name LIKE ? ESCAPE '\\'" +
        // "maria vega" is the natural header query and matches neither column alone.
        " OR (c.first_name || ' ' || c.last_name) LIKE ? ESCAPE '\\'" +
        " OR c.email LIKE ? ESCAPE '\\' OR c.phone LIKE ? ESCAPE '\\'" +
        " OR EXISTS (SELECT 1 FROM phones p WHERE p.contact_id = c.id AND p.number LIKE ? ESCAPE '\\')" +
        " OR EXISTS (SELECT 1 FROM emails e WHERE e.contact_id = c.id AND e.address LIKE ? ESCAPE '\\')" +
        " OR EXISTS (SELECT 1 FROM relationships r WHERE r.contact_id = c.id AND (r.first_name LIKE ? ESCAPE '\\' OR r.last_name LIKE ? ESCAPE '\\')))"
    );
    binds.push(p, p, p, p, phonePattern, phonePattern, p, p, p);
  }
  if (f.stages.length) {
    cond.push(`c.stage IN (${marks(f.stages.length)})`);
    binds.push(...f.stages);
  }
  if (f.tagsAny.length) {
    cond.push(
      `EXISTS (SELECT 1 FROM contact_tags ct WHERE ct.contact_id = c.id AND ct.tag_id IN (${marks(f.tagsAny.length)}))`
    );
    binds.push(...f.tagsAny);
  }
  if (f.tagsNone.length) {
    cond.push(
      `NOT EXISTS (SELECT 1 FROM contact_tags ct WHERE ct.contact_id = c.id AND ct.tag_id IN (${marks(f.tagsNone.length)}))`
    );
    binds.push(...f.tagsNone);
  }
  if (f.source) {
    cond.push("c.source = ?");
    binds.push(f.source);
  }
  if (f.type) {
    cond.push("c.type = ?");
    binds.push(f.type);
  }
  if (f.lastComm) {
    if (f.lastComm.op === "never") cond.push("c.last_communication_at IS NULL");
    else if (f.lastComm.op === "over") {
      cond.push("(c.last_communication_at IS NULL OR c.last_communication_at < ?)");
      binds.push(isoDaysAgo(nowIso, f.lastComm.days));
    } else {
      cond.push("c.last_communication_at >= ?");
      binds.push(isoDaysAgo(nowIso, f.lastComm.days));
    }
  }
  if (f.created) {
    if (f.created.op === "within") {
      cond.push("c.created_at >= ?");
      binds.push(isoDaysAgo(nowIso, f.created.days));
    } else if (f.created.op === "over") {
      cond.push("c.created_at < ?");
      binds.push(isoDaysAgo(nowIso, f.created.days));
    }
  }

  const dir = f.dir.toUpperCase();
  const orderBy =
    f.sort === "name"
      ? `ORDER BY c.first_name COLLATE NOCASE ${dir}, c.last_name COLLATE NOCASE ${dir}`
      : f.sort === "stage"
        ? `ORDER BY s.sort_order ${dir}, c.last_activity_at DESC`
        : f.sort === "created"
          ? `ORDER BY c.created_at ${dir}`
          : f.sort === "last_communication"
            ? // Ascending = oldest first, and "never contacted" is older than anything.
              `ORDER BY (c.last_communication_at IS NULL) ${dir === "ASC" ? "DESC" : "ASC"}, c.last_communication_at ${dir}`
            : `ORDER BY c.last_activity_at ${dir}`;

  return { where: cond.length ? `WHERE ${cond.join(" AND ")}` : "", binds, orderBy };
}

export function filtersToParams(f: Partial<ContactFilters>): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.stages?.length) p.set("stages", f.stages.join(","));
  if (f.tagsAny?.length) p.set("tagsAny", f.tagsAny.join(","));
  if (f.tagsNone?.length) p.set("tagsNone", f.tagsNone.join(","));
  if (f.source) p.set("source", f.source);
  if (f.type) p.set("type", f.type);
  if (f.lastComm) p.set("lastComm", f.lastComm.op === "never" ? "never" : `${f.lastComm.op}:${f.lastComm.days}`);
  if (f.created) p.set("created", `${f.created.op}:${f.created.days}`);
  if (f.list) p.set("list", f.list);
  if (f.sort) p.set("sort", f.sort);
  if (f.dir) p.set("dir", f.dir);
  return p;
}

export function activeFilterCount(f: ContactFilters): number {
  let n = 0;
  if (f.stages.length) n++;
  if (f.tagsAny.length) n++;
  if (f.tagsNone.length) n++;
  if (f.source) n++;
  if (f.type) n++;
  if (f.lastComm) n++;
  if (f.created) n++;
  return n;
}
