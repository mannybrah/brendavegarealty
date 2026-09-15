import { splitName, normalizeEmail, normalizePhone } from "./normalize";

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

export type ImportField =
  | "firstName"
  | "lastName"
  | "name"
  | "email"
  | "phone"
  | "stage"
  | "source"
  | "tags"
  | "notes"
  | "createdAt";

const HEADER_MAP: Record<string, ImportField> = {
  "first name": "firstName",
  "last name": "lastName",
  "name": "name",
  "full name": "name",
  "email": "email",
  "emails": "email",
  "email address": "email",
  "email 1": "email",
  "phone": "phone",
  "phones": "phone",
  "phone number": "phone",
  "phone 1": "phone",
  "mobile": "phone",
  "stage": "stage",
  "source": "source",
  "lead source": "source",
  "tags": "tags",
  "background": "notes",
  "notes": "notes",
  "note": "notes",
  "created": "createdAt",
  "created at": "createdAt",
  "date added": "createdAt",
};

export function autoMapColumns(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headers.forEach((raw, index) => {
    const key = raw.trim().toLowerCase();
    const field = HEADER_MAP[key];
    if (field && !(field in map)) map[field] = index;
  });
  return map;
}

export interface ImportContact {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  stage: string;
  source: string;
  tags: string[];
  notes: string;
  createdAt: string | null;
}

// Maps stage vocab from Follow Up Boss / brokerage exports to v2 stage ids.
const STAGE_MAP: Record<string, string> = {
  "lead": "new",
  "new": "new",
  "hot prospect": "contacted",
  "spoke with customer": "contacted",
  "contacted": "contacted",
  "attempted contact": "attempted_contact",
  "appointment set": "appointment_set",
  "met with customer": "appointment_set",
  "nurture": "nurture",
  "active client": "active",
  "active": "active",
  "showing homes": "active",
  "listing agreement": "active",
  "active listing": "active",
  "submitting offers": "active",
  "pending": "under_contract",
  "under contract": "under_contract",
  "closed": "closed",
  "past client": "sphere",
  "sphere": "sphere",
  "trash": "archived",
  "archived": "archived",
  "rejected": "archived",
};

function normalizeStageKey(raw: string | undefined): string {
  return (raw ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function mapStage(raw: string | undefined): string {
  const key = normalizeStageKey(raw);
  const exact = STAGE_MAP[key];
  if (exact) return exact;

  if (key.startsWith("sphere")) return "sphere";
  if (key.includes("attempted")) return "attempted_contact";
  if (key.includes("appointment") || key.includes("appt")) return "appointment_set";
  if (key.includes("nurture")) return "nurture";
  if (key.includes("contacted")) return "contacted";
  if (key.includes("under contract") || key.includes("pending")) return "under_contract";
  if (key.startsWith("farm")) return "sphere";
  if (key.startsWith("lead")) return "new";

  return "new";
}

function firstValue(raw: string | undefined): string {
  if (!raw) return "";
  return raw.split(",")[0]?.trim() ?? "";
}

function get(row: string[], map: Record<string, number>, field: ImportField): string | undefined {
  const idx = map[field];
  if (idx === undefined) return undefined;
  return row[idx];
}

export function rowsToImportContacts(rows: string[][], map: Record<string, number>): ImportContact[] {
  const contacts: ImportContact[] = [];

  for (const row of rows) {
    let firstName = (get(row, map, "firstName") ?? "").trim();
    let lastName = (get(row, map, "lastName") ?? "").trim();

    if (map.firstName === undefined && map.lastName === undefined) {
      const fullName = (get(row, map, "name") ?? "").trim();
      if (fullName) {
        const split = splitName(fullName);
        firstName = split.firstName;
        lastName = split.lastName;
      }
    }

    const emailRaw = get(row, map, "email");
    const email = normalizeEmail(firstValue(emailRaw));

    const phoneRaw = get(row, map, "phone");
    const phone = normalizePhone(firstValue(phoneRaw));

    if (!email && !phone && !firstName && !lastName) continue;

    const stage = mapStage(get(row, map, "stage"));

    const tagsRaw = (get(row, map, "tags") ?? "").trim();
    const tags = tagsRaw
      ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const background = (get(row, map, "notes") ?? "").trim();
    const originalSource = (get(row, map, "source") ?? "").trim();

    const noteParts: string[] = [];
    if (background) noteParts.push(background);
    if (originalSource) noteParts.push(`Source: ${originalSource}`);
    const notes = noteParts.join(" | ");

    const createdAtRaw = (get(row, map, "createdAt") ?? "").trim();
    const createdAt = createdAtRaw ? createdAtRaw : null;

    contacts.push({
      firstName,
      lastName,
      email,
      phone,
      stage,
      source: "import",
      tags,
      notes,
      createdAt,
    });
  }

  return contacts;
}
