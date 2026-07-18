import { Env } from "./env";
import { jsonResponse } from "./http";
import { normalizeEmail, normalizePhone, STAGES, Stage } from "../lib/crm/normalize";
import { ImportContact } from "../lib/crm/csv";
import { planImport, ExistingContact } from "../lib/crm/importPlan";

const MAX_ROWS = 2000;
const CHUNK_SIZE = 100;
const STAGE_SET = STAGES as readonly string[];

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function normalizeRow(raw: ImportContact): ImportContact {
  const firstName = typeof raw.firstName === "string" ? raw.firstName.trim() : "";
  const lastName = typeof raw.lastName === "string" ? raw.lastName.trim() : "";
  const email = normalizeEmail(raw.email);
  const phone = normalizePhone(raw.phone);
  const stage: Stage = typeof raw.stage === "string" && STAGE_SET.includes(raw.stage) ? (raw.stage as Stage) : "new";
  const tags = Array.isArray(raw.tags) ? raw.tags.filter((t) => typeof t === "string") : [];
  const notes = typeof raw.notes === "string" ? raw.notes : "";
  const createdAt = typeof raw.createdAt === "string" && raw.createdAt.trim() ? raw.createdAt.trim() : null;
  return { firstName, lastName, email, phone, stage, source: "import", tags, notes, createdAt };
}

async function fetchExistingCandidates(env: Env, emails: string[], phones: string[]): Promise<ExistingContact[]> {
  const byId = new Map<string, ExistingContact>();

  for (const emailChunk of chunk(emails, CHUNK_SIZE)) {
    if (emailChunk.length === 0) continue;
    const placeholders = emailChunk.map(() => "?").join(", ");
    const { results } = await env.CRM_DB.prepare(
      `SELECT id, first_name, last_name, email, phone, tags, notes FROM contacts WHERE email IN (${placeholders})`
    )
      .bind(...emailChunk)
      .all<ExistingContact>();
    for (const row of results ?? []) byId.set(row.id, row);
  }

  for (const phoneChunk of chunk(phones, CHUNK_SIZE)) {
    if (phoneChunk.length === 0) continue;
    const placeholders = phoneChunk.map(() => "?").join(", ");
    const { results } = await env.CRM_DB.prepare(
      `SELECT id, first_name, last_name, email, phone, tags, notes FROM contacts WHERE phone IN (${placeholders})`
    )
      .bind(...phoneChunk)
      .all<ExistingContact>();
    for (const row of results ?? []) byId.set(row.id, row);
  }

  return [...byId.values()];
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

  const rows = body.contacts.map(normalizeRow);

  const emails = [...new Set(rows.map((r) => r.email).filter((v): v is string => Boolean(v)))];
  const phones = [...new Set(rows.map((r) => r.phone).filter((v): v is string => Boolean(v)))];

  const existing = emails.length || phones.length ? await fetchExistingCandidates(env, emails, phones) : [];

  const nowIso = new Date().toISOString();
  const plan = planImport(rows, existing, nowIso, () => crypto.randomUUID());

  const statements = [
    ...plan.inserts.map((row) =>
      env.CRM_DB.prepare(
        `INSERT INTO contacts (id, first_name, last_name, email, phone, type, stage, source, tags, notes, created_at, updated_at, last_activity_at)
         VALUES (?1, ?2, ?3, ?4, ?5, NULL, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`
      ).bind(
        row.id,
        row.first_name,
        row.last_name,
        row.email,
        row.phone,
        row.stage,
        row.source,
        row.tags,
        row.notes,
        row.created_at,
        row.updated_at,
        row.last_activity_at
      )
    ),
    ...plan.updates.map((row) =>
      env.CRM_DB.prepare(
        `UPDATE contacts SET first_name=?1, last_name=?2, email=?3, phone=?4, tags=?5, notes=?6, updated_at=?7, last_activity_at=?8 WHERE id=?9`
      ).bind(row.first_name, row.last_name, row.email, row.phone, row.tags, row.notes, row.updated_at, row.last_activity_at, row.id)
    ),
  ];

  for (const statementChunk of chunk(statements, CHUNK_SIZE)) {
    if (statementChunk.length === 0) continue;
    await env.CRM_DB.batch(statementChunk);
  }

  return jsonResponse({ created: plan.created, merged: plan.merged, skipped: plan.skipped });
}
