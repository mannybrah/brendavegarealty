import { Env } from "./env";
import { jsonResponse } from "./http";
import { pacificToday } from "./time";
import {
  normalizeEmail,
  normalizePhone,
  splitName,
  STAGES,
  STAGE_LABELS,
  Stage,
} from "../lib/crm/normalize";

interface ContactRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  type: string | null;
  stage: string;
  source: string | null;
  tags: string;
  notes: string;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
}

const STAGE_SET = STAGES as readonly string[];

// Escapes %, _ and the escape character itself for a LIKE pattern that will
// be used with ESCAPE '\'.
function escapeLike(raw: string): string {
  return raw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

// ============================================================
// Summary
// ============================================================

export async function handleCrmSummary(env: Env): Promise<Response> {
  const today = pacificToday();
  const [newLeadsRow, dueTodayRow] = await Promise.all([
    env.CRM_DB.prepare("SELECT COUNT(*) AS n FROM contacts WHERE stage = 'new'").first<{ n: number }>(),
    env.CRM_DB.prepare("SELECT COUNT(*) AS n FROM tasks WHERE done_at IS NULL AND due_at <= ?1")
      .bind(`${today}T23:59`)
      .first<{ n: number }>(),
  ]);
  return jsonResponse({ newLeads: newLeadsRow?.n ?? 0, dueToday: dueTodayRow?.n ?? 0 });
}

// ============================================================
// Contacts
// ============================================================

export async function handleContactList(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  const stage = url.searchParams.get("stage")?.trim();

  const conditions: string[] = [];
  const binds: unknown[] = [];
  if (q) {
    const pattern = `%${escapeLike(q)}%`;
    conditions.push(
      "(first_name LIKE ? ESCAPE '\\' OR last_name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR phone LIKE ? ESCAPE '\\')"
    );
    binds.push(pattern, pattern, pattern, pattern);
  }
  if (stage) {
    conditions.push("stage = ?");
    binds.push(stage);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const stmt = env.CRM_DB.prepare(
    `SELECT * FROM contacts ${where} ORDER BY last_activity_at DESC LIMIT 500`
  ).bind(...binds);
  const { results } = await stmt.all<ContactRow>();
  return jsonResponse({ contacts: results ?? [] });
}

export async function handleContactCreate(request: Request, env: Env): Promise<Response> {
  let body: { name?: string; email?: string; phone?: string; type?: string; stage?: string; notes?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return jsonResponse({ error: "name is required" }, 400);

  const { firstName, lastName } = splitName(name);
  const email = normalizeEmail(body.email);
  const phone = normalizePhone(body.phone);
  const type = typeof body.type === "string" && body.type.trim() ? body.type.trim() : null;
  const stage: Stage = typeof body.stage === "string" && STAGE_SET.includes(body.stage) ? (body.stage as Stage) : "new";
  const notes = typeof body.notes === "string" ? body.notes : "";

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.CRM_DB.batch([
    env.CRM_DB.prepare(
      `INSERT INTO contacts (id, first_name, last_name, email, phone, type, stage, source, tags, notes, created_at, updated_at, last_activity_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'manual', '[]', ?8, ?9, ?9, ?9)`
    ).bind(id, firstName, lastName, email, phone, type, stage, notes, now),
    env.CRM_DB.prepare(
      `INSERT INTO events (id, contact_id, kind, body, meta, created_at) VALUES (?1, ?2, 'system', 'Contact created', NULL, ?3)`
    ).bind(crypto.randomUUID(), id, now),
  ]);

  const contact = await env.CRM_DB.prepare("SELECT * FROM contacts WHERE id = ?1").bind(id).first<ContactRow>();
  return jsonResponse({ contact }, 201);
}

export async function handleContactGet(id: string, env: Env): Promise<Response> {
  const contact = await env.CRM_DB.prepare("SELECT * FROM contacts WHERE id = ?1").bind(id).first<ContactRow>();
  if (!contact) return jsonResponse({ error: "not found" }, 404);

  const [events, tasks, deals] = await Promise.all([
    env.CRM_DB.prepare("SELECT * FROM events WHERE contact_id = ?1 ORDER BY created_at DESC LIMIT 200").bind(id).all(),
    env.CRM_DB.prepare(
      "SELECT * FROM tasks WHERE contact_id = ?1 ORDER BY (done_at IS NULL) DESC, due_at ASC"
    ).bind(id).all(),
    env.CRM_DB.prepare("SELECT * FROM deals WHERE contact_id = ?1 ORDER BY created_at DESC").bind(id).all(),
  ]);

  return jsonResponse({
    contact,
    events: events.results ?? [],
    tasks: tasks.results ?? [],
    deals: deals.results ?? [],
  });
}

export async function handleContactPatch(id: string, request: Request, env: Env): Promise<Response> {
  const existing = await env.CRM_DB.prepare("SELECT * FROM contacts WHERE id = ?1").bind(id).first<ContactRow>();
  if (!existing) return jsonResponse({ error: "not found" }, 404);

  let body: {
    firstName?: string;
    lastName?: string;
    email?: string | null;
    phone?: string | null;
    type?: string | null;
    stage?: string;
    tags?: string[];
    notes?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }

  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : existing.first_name;
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : existing.last_name;
  const email = body.email !== undefined ? normalizeEmail(body.email) : existing.email;
  const phone = body.phone !== undefined ? normalizePhone(body.phone) : existing.phone;
  const type = body.type !== undefined ? body.type : existing.type;
  const notes = typeof body.notes === "string" ? body.notes : existing.notes;
  const tags =
    Array.isArray(body.tags) && body.tags.every((t) => typeof t === "string")
      ? JSON.stringify(body.tags)
      : existing.tags;

  let stage = existing.stage;
  let stageChanged = false;
  if (typeof body.stage === "string" && STAGE_SET.includes(body.stage) && body.stage !== existing.stage) {
    stage = body.stage;
    stageChanged = true;
  }

  const now = new Date().toISOString();
  const lastActivityAt = stageChanged ? now : existing.last_activity_at;

  const statements = [
    env.CRM_DB.prepare(
      `UPDATE contacts SET first_name=?1, last_name=?2, email=?3, phone=?4, type=?5, stage=?6, tags=?7, notes=?8, updated_at=?9, last_activity_at=?10 WHERE id=?11`
    ).bind(firstName, lastName, email, phone, type, stage, tags, notes, now, lastActivityAt, id),
  ];
  if (stageChanged) {
    const stageBody = `${STAGE_LABELS[existing.stage as Stage]} → ${STAGE_LABELS[stage as Stage]}`;
    statements.push(
      env.CRM_DB.prepare(
        `INSERT INTO events (id, contact_id, kind, body, meta, created_at) VALUES (?1, ?2, 'stage_change', ?3, NULL, ?4)`
      ).bind(crypto.randomUUID(), id, stageBody, now)
    );
  }
  await env.CRM_DB.batch(statements);

  const contact = await env.CRM_DB.prepare("SELECT * FROM contacts WHERE id = ?1").bind(id).first<ContactRow>();
  return jsonResponse({ contact });
}

export async function handleContactDelete(id: string, env: Env): Promise<Response> {
  const existing = await env.CRM_DB.prepare("SELECT id FROM contacts WHERE id = ?1").bind(id).first();
  if (!existing) return jsonResponse({ error: "not found" }, 404);

  await env.CRM_DB.batch([
    env.CRM_DB.prepare("DELETE FROM milestones WHERE deal_id IN (SELECT id FROM deals WHERE contact_id = ?1)").bind(id),
    env.CRM_DB.prepare("DELETE FROM checklist_items WHERE deal_id IN (SELECT id FROM deals WHERE contact_id = ?1)").bind(id),
    env.CRM_DB.prepare("DELETE FROM tasks WHERE deal_id IN (SELECT id FROM deals WHERE contact_id = ?1)").bind(id),
    env.CRM_DB.prepare("DELETE FROM deals WHERE contact_id = ?1").bind(id),
    env.CRM_DB.prepare("DELETE FROM tasks WHERE contact_id = ?1").bind(id),
    env.CRM_DB.prepare("DELETE FROM events WHERE contact_id = ?1").bind(id),
    env.CRM_DB.prepare("DELETE FROM contacts WHERE id = ?1").bind(id),
  ]);
  return jsonResponse({ ok: true });
}

// ============================================================
// Events
// ============================================================

const EVENT_KINDS = new Set(["note", "call", "text", "email"]);

export async function handleEventCreate(id: string, request: Request, env: Env): Promise<Response> {
  const existing = await env.CRM_DB.prepare("SELECT id FROM contacts WHERE id = ?1").bind(id).first();
  if (!existing) return jsonResponse({ error: "not found" }, 404);

  let body: { kind?: string; body?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }
  if (typeof body.kind !== "string" || !EVENT_KINDS.has(body.kind)) {
    return jsonResponse({ error: "kind must be one of note, call, text, email" }, 400);
  }
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) return jsonResponse({ error: "body is required" }, 400);

  const eventId = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.CRM_DB.batch([
    env.CRM_DB.prepare(
      "INSERT INTO events (id, contact_id, kind, body, meta, created_at) VALUES (?1, ?2, ?3, ?4, NULL, ?5)"
    ).bind(eventId, id, body.kind, text, now),
    env.CRM_DB.prepare("UPDATE contacts SET last_activity_at = ?1, updated_at = ?1 WHERE id = ?2").bind(now, id),
  ]);

  const event = await env.CRM_DB.prepare("SELECT * FROM events WHERE id = ?1").bind(eventId).first();
  return jsonResponse({ event }, 201);
}

// ============================================================
// Tasks
// ============================================================

interface TaskRow {
  id: string;
  contact_id: string | null;
  deal_id: string | null;
  milestone_id: string | null;
  title: string;
  due_at: string | null;
  done_at: string | null;
  notified_at: string | null;
  created_at: string;
}

export async function handleTaskList(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const view = url.searchParams.get("view") === "done" ? "done" : "open";

  const selectBase = `
    SELECT tasks.*,
      CASE WHEN contacts.id IS NOT NULL THEN TRIM(contacts.first_name || ' ' || contacts.last_name) ELSE NULL END AS contact_name,
      deals.property_address AS deal_address
    FROM tasks
    LEFT JOIN contacts ON contacts.id = tasks.contact_id
    LEFT JOIN deals ON deals.id = tasks.deal_id
  `;

  const stmt =
    view === "done"
      ? env.CRM_DB.prepare(`${selectBase} WHERE tasks.done_at IS NOT NULL ORDER BY tasks.done_at DESC LIMIT 100`)
      : env.CRM_DB.prepare(
          `${selectBase} WHERE tasks.done_at IS NULL ORDER BY (tasks.due_at IS NULL) ASC, tasks.due_at ASC`
        );

  const { results } = await stmt.all<TaskRow & { contact_name: string | null; deal_address: string | null }>();
  return jsonResponse({ tasks: results ?? [], today: pacificToday() });
}

export async function handleTaskCreate(request: Request, env: Env): Promise<Response> {
  let body: { title?: string; dueAt?: string | null; contactId?: string | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return jsonResponse({ error: "title is required" }, 400);

  const dueAt = typeof body.dueAt === "string" && body.dueAt.trim() ? body.dueAt.trim() : null;
  const contactId = typeof body.contactId === "string" && body.contactId.trim() ? body.contactId.trim() : null;

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.CRM_DB.prepare(
    "INSERT INTO tasks (id, contact_id, deal_id, milestone_id, title, due_at, done_at, notified_at, created_at) VALUES (?1, ?2, NULL, NULL, ?3, ?4, NULL, NULL, ?5)"
  )
    .bind(id, contactId, title, dueAt, now)
    .run();

  const task = await env.CRM_DB.prepare("SELECT * FROM tasks WHERE id = ?1").bind(id).first<TaskRow>();
  return jsonResponse({ task }, 201);
}

export async function handleTaskPatch(id: string, request: Request, env: Env): Promise<Response> {
  const existing = await env.CRM_DB.prepare("SELECT * FROM tasks WHERE id = ?1").bind(id).first<TaskRow>();
  if (!existing) return jsonResponse({ error: "not found" }, 404);

  let body: { title?: string; dueAt?: string | null; done?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }

  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : existing.title;
  const dueAt = body.dueAt !== undefined ? (typeof body.dueAt === "string" && body.dueAt.trim() ? body.dueAt.trim() : null) : existing.due_at;

  const now = new Date().toISOString();
  let doneAt = existing.done_at;
  const statements = [];

  if (body.done === true && !existing.done_at) {
    doneAt = now;
    if (existing.contact_id) {
      statements.push(
        env.CRM_DB.prepare(
          "INSERT INTO events (id, contact_id, kind, body, meta, created_at) VALUES (?1, ?2, 'task_done', ?3, NULL, ?4)"
        ).bind(crypto.randomUUID(), existing.contact_id, title, now),
        env.CRM_DB.prepare("UPDATE contacts SET last_activity_at = ?1, updated_at = ?1 WHERE id = ?2").bind(
          now,
          existing.contact_id
        )
      );
    }
  } else if (body.done === false) {
    doneAt = null;
  }

  statements.unshift(
    env.CRM_DB.prepare("UPDATE tasks SET title=?1, due_at=?2, done_at=?3 WHERE id=?4").bind(title, dueAt, doneAt, id)
  );

  await env.CRM_DB.batch(statements);

  const task = await env.CRM_DB.prepare("SELECT * FROM tasks WHERE id = ?1").bind(id).first<TaskRow>();
  return jsonResponse({ task });
}

export async function handleTaskDelete(id: string, env: Env): Promise<Response> {
  const existing = await env.CRM_DB.prepare("SELECT id FROM tasks WHERE id = ?1").bind(id).first();
  if (!existing) return jsonResponse({ error: "not found" }, 404);

  await env.CRM_DB.prepare("DELETE FROM tasks WHERE id = ?1").bind(id).run();
  return jsonResponse({ ok: true });
}

// ============================================================
// Lead ingest (dedupe/merge core — used by public intake + CSV import)
// ============================================================

export interface IngestLeadInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  source: string;
  message?: string;
  meta?: Record<string, unknown>;
}

export interface IngestLeadResult {
  contactId: string;
  contactName: string;
  created: boolean;
}

export async function ingestLead(env: Env, input: IngestLeadInput): Promise<IngestLeadResult> {
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  const { firstName, lastName } = splitName(input.name);
  const now = new Date().toISOString();
  const eventBody = input.message && input.message.trim() ? input.message.trim() : `Lead from ${input.source}`;
  const meta = input.meta ? JSON.stringify(input.meta) : null;

  let existing: { id: string; stage: string } | null = null;
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
    existing = await env.CRM_DB.prepare(`SELECT id, stage FROM contacts WHERE ${clauses.join(" OR ")} LIMIT 1`)
      .bind(...binds)
      .first<{ id: string; stage: string }>();
  }

  let contactId: string;
  let contactName: string;
  let created = false;

  if (existing) {
    contactId = existing.id;
    const stageClause = existing.stage === "archived" ? ", stage = 'new'" : "";
    await env.CRM_DB.batch([
      env.CRM_DB.prepare(
        "INSERT INTO events (id, contact_id, kind, body, meta, created_at) VALUES (?1, ?2, 'lead_submission', ?3, ?4, ?5)"
      ).bind(crypto.randomUUID(), contactId, eventBody, meta, now),
      env.CRM_DB.prepare(`UPDATE contacts SET last_activity_at = ?1, updated_at = ?1${stageClause} WHERE id = ?2`).bind(
        now,
        contactId
      ),
    ]);
    const row = await env.CRM_DB.prepare("SELECT first_name, last_name FROM contacts WHERE id = ?1")
      .bind(contactId)
      .first<{ first_name: string; last_name: string }>();
    contactName = row ? `${row.first_name} ${row.last_name}`.trim() || input.name.trim() : input.name.trim();
  } else {
    contactId = crypto.randomUUID();
    contactName = input.name.trim();
    await env.CRM_DB.batch([
      env.CRM_DB.prepare(
        `INSERT INTO contacts (id, first_name, last_name, email, phone, type, stage, source, tags, notes, created_at, updated_at, last_activity_at)
         VALUES (?1, ?2, ?3, ?4, ?5, NULL, 'new', ?6, '[]', '', ?7, ?7, ?7)`
      ).bind(contactId, firstName, lastName, email, phone, input.source, now),
      env.CRM_DB.prepare(
        "INSERT INTO events (id, contact_id, kind, body, meta, created_at) VALUES (?1, ?2, 'lead_submission', ?3, ?4, ?5)"
      ).bind(crypto.randomUUID(), contactId, eventBody, meta, now),
    ]);
    created = true;
  }

  // Auto-task: exactly one open "Respond to …" task per contact at a time.
  const openRespond = await env.CRM_DB.prepare(
    "SELECT id FROM tasks WHERE contact_id = ?1 AND title LIKE 'Respond to %' AND done_at IS NULL LIMIT 1"
  )
    .bind(contactId)
    .first();
  if (!openRespond) {
    const taskTitle = `Respond to ${firstName || input.name.trim()}`;
    await env.CRM_DB.prepare(
      "INSERT INTO tasks (id, contact_id, deal_id, milestone_id, title, due_at, done_at, notified_at, created_at) VALUES (?1, ?2, NULL, NULL, ?3, ?4, NULL, NULL, ?5)"
    )
      .bind(crypto.randomUUID(), contactId, taskTitle, pacificToday(), now)
      .run();
  }

  return { contactId, contactName, created };
}
