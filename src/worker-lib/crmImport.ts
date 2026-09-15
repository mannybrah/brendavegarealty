import { Env } from "./env";
import { jsonResponse } from "./http";
import { normalizeEmail, normalizePhone } from "../lib/crm/normalize";
import { ImportContact } from "../lib/crm/csv";
import { planImport, ExistingContact } from "../lib/crm/importPlan";
import { getStages } from "./crmStages";
import { addContactTagStatements, ensureTags, tagsForContacts } from "./crmTags";
import { writeEmails, writePhones } from "./crmContacts";

const MAX_ROWS = 2000;
const CHUNK_SIZE = 100;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function normalizeRow(raw: ImportContact, validStages: Set<string>): ImportContact {
  const firstName = typeof raw.firstName === "string" ? raw.firstName.trim() : "";
  const lastName = typeof raw.lastName === "string" ? raw.lastName.trim() : "";
  const email = normalizeEmail(raw.email);
  const phone = normalizePhone(raw.phone);
  const stage = typeof raw.stage === "string" && validStages.has(raw.stage) ? raw.stage : "new";
  const tags = Array.isArray(raw.tags) ? raw.tags.filter((t) => typeof t === "string") : [];
  const notes = typeof raw.notes === "string" ? raw.notes : "";
  const createdAt = typeof raw.createdAt === "string" && raw.createdAt.trim() ? raw.createdAt.trim() : null;
  return { firstName, lastName, email, phone, stage, source: "import", tags, notes, createdAt };
}

interface ExistingRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  notes: string;
}

async function fetchExistingCandidates(env: Env, emails: string[], phones: string[]): Promise<ExistingContact[]> {
  const byId = new Map<string, ExistingRow>();

  for (const emailChunk of chunk(emails, CHUNK_SIZE)) {
    if (emailChunk.length === 0) continue;
    const placeholders = emailChunk.map(() => "?").join(", ");
    const { results } = await env.CRM_DB.prepare(
      `SELECT DISTINCT c.id, c.first_name, c.last_name, c.email, c.phone, c.notes FROM contacts c
       WHERE c.email IN (${placeholders}) OR EXISTS (SELECT 1 FROM emails e WHERE e.contact_id = c.id AND e.address IN (${placeholders}))`
    )
      .bind(...emailChunk, ...emailChunk)
      .all<ExistingRow>();
    for (const row of results ?? []) byId.set(row.id, row);
  }

  for (const phoneChunk of chunk(phones, CHUNK_SIZE)) {
    if (phoneChunk.length === 0) continue;
    const placeholders = phoneChunk.map(() => "?").join(", ");
    const { results } = await env.CRM_DB.prepare(
      `SELECT DISTINCT c.id, c.first_name, c.last_name, c.email, c.phone, c.notes FROM contacts c
       WHERE c.phone IN (${placeholders}) OR EXISTS (SELECT 1 FROM phones p WHERE p.contact_id = c.id AND p.number IN (${placeholders}))`
    )
      .bind(...phoneChunk, ...phoneChunk)
      .all<ExistingRow>();
    for (const row of results ?? []) byId.set(row.id, row);
  }

  const ids = [...byId.keys()];
  const tagMap = await tagsForContacts(env, ids);
  return ids.map((id) => {
    const row = byId.get(id)!;
    return { ...row, tags: (tagMap.get(id) ?? []).map((t) => t.name) };
  });
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

  const validStages = new Set((await getStages(env)).map((s) => s.id));
  const rows = body.contacts.map((r) => normalizeRow(r, validStages));

  const emails = [...new Set(rows.map((r) => r.email).filter((v): v is string => Boolean(v)))];
  const phones = [...new Set(rows.map((r) => r.phone).filter((v): v is string => Boolean(v)))];

  const existing = emails.length || phones.length ? await fetchExistingCandidates(env, emails, phones) : [];

  const nowIso = new Date().toISOString();
  const plan = planImport(rows, existing, nowIso, () => crypto.randomUUID());

  // Resolve every tag name once up front.
  const allTagNames = [...new Set([...plan.inserts, ...plan.updates].flatMap((r) => r.tags))];
  const tagRows = await ensureTags(env, allTagNames);
  const tagByName = new Map(tagRows.map((t) => [t.name.toLowerCase(), t]));
  const tagsFor = (names: string[]) =>
    names.map((n) => tagByName.get(n.toLowerCase())).filter((t): t is (typeof tagRows)[number] => Boolean(t));

  const statements: D1PreparedStatement[] = [];

  for (const row of plan.inserts) {
    statements.push(
      env.CRM_DB.prepare(
        `INSERT INTO contacts (id, first_name, last_name, email, phone, type, stage, source, notes, price, timeframe, address, last_communication_at, created_at, updated_at, last_activity_at)
         VALUES (?1, ?2, ?3, ?4, ?5, NULL, ?6, ?7, ?8, NULL, NULL, '', NULL, ?9, ?10, ?11)`
      ).bind(
        row.id,
        row.first_name,
        row.last_name,
        row.email,
        row.phone,
        row.stage,
        row.source,
        row.notes,
        row.created_at,
        row.updated_at,
        row.last_activity_at
      ),
      ...writePhones(
        env,
        row.id,
        null,
        row.phone ? [{ number: row.phone, label: "mobile", isPrimary: true, isBad: false }] : [],
        nowIso
      ),
      ...writeEmails(
        env,
        row.id,
        null,
        row.email ? [{ address: row.email, label: "personal", isPrimary: true, isBad: false }] : [],
        nowIso
      ),
      ...addContactTagStatements(env, row.id, tagsFor(row.tags), nowIso)
    );
  }

  for (const row of plan.updates) {
    statements.push(
      env.CRM_DB.prepare(
        `UPDATE contacts SET first_name=?1, last_name=?2, email=?3, phone=?4, notes=?5, updated_at=?6, last_activity_at=?7 WHERE id=?8`
      ).bind(row.first_name, row.last_name, row.email, row.phone, row.notes, row.updated_at, row.last_activity_at, row.id)
    );
    if (row.phone) {
      statements.push(
        env.CRM_DB.prepare(
          `INSERT INTO phones (id, contact_id, relationship_id, number, label, is_primary, is_bad, sort_order, created_at)
           SELECT ?1, ?2, NULL, ?3, 'mobile', CASE WHEN EXISTS (SELECT 1 FROM phones WHERE contact_id = ?2 AND relationship_id IS NULL) THEN 0 ELSE 1 END, 0, 99, ?4
           WHERE NOT EXISTS (SELECT 1 FROM phones WHERE contact_id = ?2 AND number = ?3)`
        ).bind(crypto.randomUUID(), row.id, row.phone, nowIso)
      );
    }
    if (row.email) {
      statements.push(
        env.CRM_DB.prepare(
          `INSERT INTO emails (id, contact_id, relationship_id, address, label, is_primary, is_bad, sort_order, created_at)
           SELECT ?1, ?2, NULL, ?3, 'personal', CASE WHEN EXISTS (SELECT 1 FROM emails WHERE contact_id = ?2 AND relationship_id IS NULL) THEN 0 ELSE 1 END, 0, 99, ?4
           WHERE NOT EXISTS (SELECT 1 FROM emails WHERE contact_id = ?2 AND address = ?3)`
        ).bind(crypto.randomUUID(), row.id, row.email, nowIso)
      );
    }
    statements.push(...addContactTagStatements(env, row.id, tagsFor(row.tags), nowIso));
  }

  for (const statementChunk of chunk(statements, CHUNK_SIZE)) {
    if (statementChunk.length === 0) continue;
    await env.CRM_DB.batch(statementChunk);
  }

  return jsonResponse({ created: plan.created, merged: plan.merged, skipped: plan.skipped });
}
