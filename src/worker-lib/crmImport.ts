import { Env } from "./env";
import { jsonResponse } from "./http";
import { normalizeEmail, normalizePhone, STAGES, Stage } from "../lib/crm/normalize";
import { ImportContact } from "../lib/crm/csv";

const MAX_ROWS = 2000;
const STAGE_SET = STAGES as readonly string[];

interface ExistingContactRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  type: string | null;
  stage: string;
  tags: string;
  notes: string;
}

function isValidRow(row: ImportContact): boolean {
  const hasName = Boolean((row.firstName ?? "").trim() || (row.lastName ?? "").trim());
  const hasEmail = Boolean(row.email && row.email.trim());
  const hasPhone = Boolean(row.phone && row.phone.trim());
  return hasName || hasEmail || hasPhone;
}

function mergeTags(existingTagsJson: string, incoming: string[]): string {
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

export async function handleImport(request: Request, env: Env): Promise<Response> {
  let body: { contacts?: ImportContact[] };
  try {
    body = (await request.json()) as { contacts?: ImportContact[] };
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }

  if (!Array.isArray(body.contacts)) {
    return jsonResponse({ error: "contacts must be an array" }, 400);
  }
  if (body.contacts.length > MAX_ROWS) {
    return jsonResponse({ error: `contacts exceeds max of ${MAX_ROWS} rows` }, 400);
  }

  let created = 0;
  let merged = 0;
  let skipped = 0;

  for (const raw of body.contacts) {
    const firstName = typeof raw.firstName === "string" ? raw.firstName.trim() : "";
    const lastName = typeof raw.lastName === "string" ? raw.lastName.trim() : "";
    const email = normalizeEmail(raw.email);
    const phone = normalizePhone(raw.phone);
    const stage: Stage = typeof raw.stage === "string" && STAGE_SET.includes(raw.stage) ? (raw.stage as Stage) : "new";
    const tags = Array.isArray(raw.tags) ? raw.tags.filter((t) => typeof t === "string") : [];
    const notes = typeof raw.notes === "string" ? raw.notes : "";
    const createdAt = typeof raw.createdAt === "string" && raw.createdAt.trim() ? raw.createdAt.trim() : null;

    const row: ImportContact = { firstName, lastName, email, phone, stage, source: "import", tags, notes, createdAt };

    if (!isValidRow(row)) {
      skipped++;
      continue;
    }

    let existing: ExistingContactRow | null = null;
    if (email || phone) {
      const clauses: string[] = [];
      const binds: unknown[] = [];
      if (email) {
        clauses.push("(email IS NOT NULL AND email = ?)");
        binds.push(email);
      }
      if (phone) {
        clauses.push("(phone IS NOT NULL AND phone = ?)");
        binds.push(phone);
      }
      existing = await env.CRM_DB.prepare(
        `SELECT id, first_name, last_name, email, phone, type, stage, tags, notes FROM contacts WHERE ${clauses.join(
          " OR "
        )} LIMIT 1`
      )
        .bind(...binds)
        .first<ExistingContactRow>();
    }

    const now = new Date().toISOString();

    if (existing) {
      const nextFirstName = existing.first_name && existing.first_name.trim() ? existing.first_name : firstName;
      const nextLastName = existing.last_name && existing.last_name.trim() ? existing.last_name : lastName;
      const nextEmail = existing.email ?? email;
      const nextPhone = existing.phone ?? phone;
      const nextNotes = notes ? (existing.notes ? `${existing.notes}\n${notes}` : notes) : existing.notes;
      const nextTags = mergeTags(existing.tags, tags);

      await env.CRM_DB.prepare(
        `UPDATE contacts SET first_name=?1, last_name=?2, email=?3, phone=?4, tags=?5, notes=?6, updated_at=?7, last_activity_at=?7 WHERE id=?8`
      )
        .bind(nextFirstName, nextLastName, nextEmail, nextPhone, nextTags, nextNotes, now, existing.id)
        .run();
      merged++;
    } else {
      const id = crypto.randomUUID();
      const createdIso = createdAt || now;
      await env.CRM_DB.prepare(
        `INSERT INTO contacts (id, first_name, last_name, email, phone, type, stage, source, tags, notes, created_at, updated_at, last_activity_at)
         VALUES (?1, ?2, ?3, ?4, ?5, NULL, ?6, 'import', ?7, ?8, ?9, ?9, ?9)`
      )
        .bind(id, firstName, lastName, email, phone, stage, JSON.stringify(tags), notes, createdIso)
        .run();
      created++;
    }
  }

  return jsonResponse({ created, merged, skipped });
}
