import { Env } from "./env";
import { jsonResponse } from "./http";
import { buildContactQuery, parseFilters } from "../lib/crm/filters";
import {
  normalizeAddressInputs,
  normalizeEmailInputs,
  normalizePhoneInputs,
  NormalizedAddress,
  NormalizedEmail,
  NormalizedPhone,
  AddressInput,
  PhoneInput,
  EmailInput,
} from "../lib/crm/contactsInput";
import { splitName } from "../lib/crm/normalize";
import { CONTACT_TYPES, TIMEFRAMES } from "../lib/crm/types";
import type {
  AddressRow,
  ContactRow,
  ContactListRow,
  DealWithProgress,
  EmailRow,
  EventRow,
  PhoneRow,
  RelationshipFull,
  RelationshipRow,
  TaskRow,
} from "../lib/crm/types";
import { getStages, stageName } from "./crmStages";
import { setContactTags, tagsForContacts } from "./crmTags";

// ============================================================
// Phone / email helpers (shared with relationships + intake + import)
// ============================================================

export function writePhones(
  env: Env,
  contactId: string,
  relationshipId: string | null,
  phones: NormalizedPhone[],
  now: string
): D1PreparedStatement[] {
  const del = relationshipId
    ? env.CRM_DB.prepare("DELETE FROM phones WHERE relationship_id = ?1").bind(relationshipId)
    : env.CRM_DB.prepare("DELETE FROM phones WHERE contact_id = ?1 AND relationship_id IS NULL").bind(contactId);
  return [
    del,
    ...phones.map((p, i) =>
      env.CRM_DB.prepare(
        "INSERT INTO phones (id, contact_id, relationship_id, number, label, is_primary, is_bad, sort_order, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"
      ).bind(crypto.randomUUID(), contactId, relationshipId, p.number, p.label, p.isPrimary ? 1 : 0, p.isBad ? 1 : 0, i, now)
    ),
  ];
}

export function writeEmails(
  env: Env,
  contactId: string,
  relationshipId: string | null,
  emails: NormalizedEmail[],
  now: string
): D1PreparedStatement[] {
  const del = relationshipId
    ? env.CRM_DB.prepare("DELETE FROM emails WHERE relationship_id = ?1").bind(relationshipId)
    : env.CRM_DB.prepare("DELETE FROM emails WHERE contact_id = ?1 AND relationship_id IS NULL").bind(contactId);
  return [
    del,
    ...emails.map((e, i) =>
      env.CRM_DB.prepare(
        "INSERT INTO emails (id, contact_id, relationship_id, address, label, is_primary, is_bad, sort_order, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"
      ).bind(crypto.randomUUID(), contactId, relationshipId, e.address, e.label, e.isPrimary ? 1 : 0, e.isBad ? 1 : 0, i, now)
    ),
  ];
}

export function writeAddresses(
  env: Env,
  contactId: string,
  relationshipId: string | null,
  addresses: NormalizedAddress[],
  now: string
): D1PreparedStatement[] {
  const del = relationshipId
    ? env.CRM_DB.prepare("DELETE FROM addresses WHERE relationship_id = ?1").bind(relationshipId)
    : env.CRM_DB.prepare("DELETE FROM addresses WHERE contact_id = ?1 AND relationship_id IS NULL").bind(contactId);
  return [
    del,
    ...addresses.map((a, i) =>
      env.CRM_DB.prepare(
        "INSERT INTO addresses (id, contact_id, relationship_id, label, address, is_primary, sort_order, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)"
      ).bind(crypto.randomUUID(), contactId, relationshipId, a.label, a.address, a.isPrimary ? 1 : 0, i, now)
    ),
  ];
}

export function primaryPhone(phones: NormalizedPhone[]): string | null {
  return phones.find((p) => p.isPrimary && !p.isBad)?.number ?? phones.find((p) => !p.isBad)?.number ?? null;
}
export function primaryEmail(emails: NormalizedEmail[]): string | null {
  return emails.find((e) => e.isPrimary && !e.isBad)?.address ?? emails.find((e) => !e.isBad)?.address ?? null;
}

// Rewrites the denormalized contacts.phone/email from the primary rows.
export async function syncPrimaries(env: Env, contactId: string): Promise<void> {
  const [p, e] = await Promise.all([
    env.CRM_DB.prepare(
      "SELECT number FROM phones WHERE contact_id = ?1 AND relationship_id IS NULL AND is_bad = 0 ORDER BY is_primary DESC, sort_order ASC LIMIT 1"
    )
      .bind(contactId)
      .first<{ number: string }>(),
    env.CRM_DB.prepare(
      "SELECT address FROM emails WHERE contact_id = ?1 AND relationship_id IS NULL AND is_bad = 0 ORDER BY is_primary DESC, sort_order ASC LIMIT 1"
    )
      .bind(contactId)
      .first<{ address: string }>(),
  ]);
  await env.CRM_DB.prepare("UPDATE contacts SET phone = ?1, email = ?2, updated_at = ?3 WHERE id = ?4")
    .bind(p?.number ?? null, e?.address ?? null, new Date().toISOString(), contactId)
    .run();
}

async function getContact(env: Env, id: string): Promise<ContactRow | null> {
  return env.CRM_DB.prepare("SELECT * FROM contacts WHERE id = ?1").bind(id).first<ContactRow>();
}

// ============================================================
// List
// ============================================================

export async function handleContactList(request: Request, env: Env): Promise<Response> {
  const filters = parseFilters(new URL(request.url).searchParams);
  const { where, binds, orderBy } = buildContactQuery(filters, new Date().toISOString());
  const sql = `SELECT c.* FROM contacts c LEFT JOIN stages s ON s.id = c.stage ${where} ${orderBy} LIMIT ${filters.limit}`;
  const [{ results }, countRows, totalRow] = await Promise.all([
    env.CRM_DB.prepare(sql).bind(...binds).all<ContactRow>(),
    env.CRM_DB.prepare("SELECT stage, COUNT(*) AS n FROM contacts GROUP BY stage").all<{ stage: string; n: number }>(),
    env.CRM_DB.prepare(`SELECT COUNT(*) AS n FROM contacts c LEFT JOIN stages s ON s.id = c.stage ${where}`)
      .bind(...binds)
      .first<{ n: number }>(),
  ]);
  const rows = results ?? [];
  const tagMap = await tagsForContacts(
    env,
    rows.map((r) => r.id)
  );
  const contacts: ContactListRow[] = rows.map((r) => ({ ...r, tags: tagMap.get(r.id) ?? [] }));
  const counts: Record<string, number> = {};
  for (const row of countRows.results ?? []) counts[row.stage] = row.n;
  return jsonResponse({ contacts, counts, total: totalRow?.n ?? 0 });
}

export async function handleSourceList(env: Env): Promise<Response> {
  const { results } = await env.CRM_DB.prepare(
    "SELECT source, COUNT(*) AS n FROM contacts WHERE source IS NOT NULL AND source <> '' GROUP BY source ORDER BY n DESC"
  ).all<{ source: string; n: number }>();
  return jsonResponse({ sources: results ?? [] });
}

// ============================================================
// Create
// ============================================================

interface CreateBody {
  firstName?: string;
  lastName?: string;
  name?: string;
  type?: string | null;
  stage?: string;
  source?: string;
  phones?: PhoneInput[];
  emails?: EmailInput[];
  addresses?: AddressInput[];
  phone?: string;
  email?: string;
  tags?: string[];
  notes?: string;
}

export async function handleContactCreate(request: Request, env: Env): Promise<Response> {
  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }

  let firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  let lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  if (!firstName && !lastName && typeof body.name === "string") {
    const split = splitName(body.name);
    firstName = split.firstName;
    lastName = split.lastName;
  }
  if (!firstName && !lastName) return jsonResponse({ error: "name is required" }, 400);

  const stages = await getStages(env);
  const stage = typeof body.stage === "string" && stages.some((s) => s.id === body.stage) ? body.stage : "new";
  const type =
    typeof body.type === "string" && (CONTACT_TYPES as readonly string[]).includes(body.type) ? body.type : null;
  const source = typeof body.source === "string" && body.source.trim() ? body.source.trim().slice(0, 60) : "manual";
  const notes = typeof body.notes === "string" ? body.notes : "";

  const phones = normalizePhoneInputs([
    ...(Array.isArray(body.phones) ? body.phones : []),
    ...(typeof body.phone === "string" && body.phone.trim() ? [{ number: body.phone }] : []),
  ]);
  const emails = normalizeEmailInputs([
    ...(Array.isArray(body.emails) ? body.emails : []),
    ...(typeof body.email === "string" && body.email.trim() ? [{ address: body.email }] : []),
  ]);

  const addresses = normalizeAddressInputs(Array.isArray(body.addresses) ? body.addresses : []);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.CRM_DB.batch([
    env.CRM_DB.prepare(
      `INSERT INTO contacts (id, first_name, last_name, email, phone, type, stage, source, notes, price, timeframe, last_communication_at, created_at, updated_at, last_activity_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, NULL, NULL, NULL, ?10, ?10, ?10)`
    ).bind(id, firstName, lastName, primaryEmail(emails), primaryPhone(phones), type, stage, source, notes, now),
    ...writePhones(env, id, null, phones, now),
    ...writeEmails(env, id, null, emails, now),
    ...writeAddresses(env, id, null, addresses, now),
    env.CRM_DB.prepare(
      "INSERT INTO events (id, contact_id, kind, body, meta, created_at) VALUES (?1, ?2, 'system', 'Contact created', NULL, ?3)"
    ).bind(crypto.randomUUID(), id, now),
  ]);
  const tags = Array.isArray(body.tags) ? await setContactTags(env, id, body.tags) : [];

  const contact = await getContact(env, id);
  return jsonResponse({ contact, tags }, 201);
}

// ============================================================
// Get (full bundle)
// ============================================================

export async function handleContactGet(id: string, env: Env): Promise<Response> {
  const contact = await getContact(env, id);
  if (!contact) return jsonResponse({ error: "not found" }, 404);

  const [phones, emails, addresses, relationships, tagMap, events, tasks, deals] = await Promise.all([
    env.CRM_DB.prepare(
      "SELECT * FROM phones WHERE contact_id = ?1 ORDER BY (relationship_id IS NULL) DESC, is_primary DESC, sort_order ASC"
    )
      .bind(id)
      .all<PhoneRow>(),
    env.CRM_DB.prepare(
      "SELECT * FROM emails WHERE contact_id = ?1 ORDER BY (relationship_id IS NULL) DESC, is_primary DESC, sort_order ASC"
    )
      .bind(id)
      .all<EmailRow>(),
    env.CRM_DB.prepare(
      "SELECT * FROM addresses WHERE contact_id = ?1 ORDER BY (relationship_id IS NULL) DESC, is_primary DESC, sort_order ASC"
    )
      .bind(id)
      .all<AddressRow>(),
    env.CRM_DB.prepare("SELECT * FROM relationships WHERE contact_id = ?1 ORDER BY sort_order ASC, created_at ASC")
      .bind(id)
      .all<RelationshipRow>(),
    tagsForContacts(env, [id]),
    env.CRM_DB.prepare("SELECT * FROM events WHERE contact_id = ?1 ORDER BY created_at DESC LIMIT 300")
      .bind(id)
      .all<EventRow>(),
    env.CRM_DB.prepare(
      "SELECT * FROM tasks WHERE contact_id = ?1 ORDER BY (done_at IS NULL) DESC, (due_at IS NULL) ASC, due_at ASC, created_at DESC"
    )
      .bind(id)
      .all<TaskRow>(),
    env.CRM_DB.prepare(
      `SELECT d.*,
         (SELECT COUNT(*) FROM milestones m WHERE m.deal_id = d.id) AS milestonesTotal,
         (SELECT COUNT(*) FROM milestones m WHERE m.deal_id = d.id AND m.status = 'done') AS milestonesDone
       FROM deals d WHERE d.contact_id = ?1 ORDER BY d.created_at DESC`
    )
      .bind(id)
      .all<DealWithProgress>(),
  ]);

  const allPhones = phones.results ?? [];
  const allEmails = emails.results ?? [];
  const allAddresses = addresses.results ?? [];
  const rels: RelationshipFull[] = (relationships.results ?? []).map((r) => ({
    ...r,
    phones: allPhones.filter((p) => p.relationship_id === r.id),
    emails: allEmails.filter((e) => e.relationship_id === r.id),
    addresses: allAddresses.filter((a) => a.relationship_id === r.id),
  }));

  return jsonResponse({
    contact,
    phones: allPhones.filter((p) => p.relationship_id === null),
    emails: allEmails.filter((e) => e.relationship_id === null),
    addresses: allAddresses.filter((a) => a.relationship_id === null),
    relationships: rels,
    tags: tagMap.get(id) ?? [],
    events: events.results ?? [],
    tasks: tasks.results ?? [],
    deals: deals.results ?? [],
  });
}

// ============================================================
// Patch
// ============================================================

interface PatchBody {
  firstName?: string;
  lastName?: string;
  type?: string | null;
  stage?: string;
  source?: string | null;
  price?: number | string | null;
  timeframe?: string | null;
  notes?: string;
  tags?: string[];
}

export async function handleContactPatch(id: string, request: Request, env: Env): Promise<Response> {
  const existing = await getContact(env, id);
  if (!existing) return jsonResponse({ error: "not found" }, 404);

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }

  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : existing.first_name;
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : existing.last_name;
  if (!firstName && !lastName) return jsonResponse({ error: "name is required" }, 400);

  let type = existing.type;
  if (body.type !== undefined) {
    if (body.type === null || body.type === "") type = null;
    else if ((CONTACT_TYPES as readonly string[]).includes(body.type)) type = body.type;
    else return jsonResponse({ error: "invalid type" }, 400);
  }

  let source = existing.source;
  if (body.source !== undefined) source = typeof body.source === "string" && body.source.trim() ? body.source.trim().slice(0, 60) : null;

  let price = existing.price;
  if (body.price !== undefined) {
    if (body.price === null || body.price === "") price = null;
    else {
      const n = typeof body.price === "string" ? Number(body.price.replace(/[^0-9.]/g, "")) : Number(body.price);
      if (!Number.isFinite(n) || n < 0) return jsonResponse({ error: "invalid price" }, 400);
      price = Math.round(n);
    }
  }

  let timeframe = existing.timeframe;
  if (body.timeframe !== undefined) {
    if (body.timeframe === null || body.timeframe === "") timeframe = null;
    else if ((TIMEFRAMES as readonly string[]).includes(body.timeframe)) timeframe = body.timeframe;
    else return jsonResponse({ error: "invalid timeframe" }, 400);
  }

  const notes = typeof body.notes === "string" ? body.notes : existing.notes;

  let stage = existing.stage;
  let stageChanged = false;
  const stages = await getStages(env);
  if (typeof body.stage === "string" && body.stage !== existing.stage) {
    if (!stages.some((s) => s.id === body.stage)) return jsonResponse({ error: "unknown stage" }, 400);
    stage = body.stage;
    stageChanged = true;
  }

  const now = new Date().toISOString();
  const lastActivityAt = stageChanged ? now : existing.last_activity_at;
  const statements = [
    env.CRM_DB.prepare(
      `UPDATE contacts SET first_name=?1, last_name=?2, type=?3, stage=?4, source=?5, price=?6, timeframe=?7, notes=?8, updated_at=?9, last_activity_at=?10 WHERE id=?11`
    ).bind(firstName, lastName, type, stage, source, price, timeframe, notes, now, lastActivityAt, id),
  ];
  if (stageChanged) {
    statements.push(
      env.CRM_DB.prepare(
        "INSERT INTO events (id, contact_id, kind, body, meta, created_at) VALUES (?1, ?2, 'stage_change', ?3, NULL, ?4)"
      ).bind(crypto.randomUUID(), id, `${stageName(stages, existing.stage)} → ${stageName(stages, stage)}`, now)
    );
  }
  await env.CRM_DB.batch(statements);

  let tags = (await tagsForContacts(env, [id])).get(id) ?? [];
  if (Array.isArray(body.tags)) tags = await setContactTags(env, id, body.tags);

  const contact = await getContact(env, id);
  return jsonResponse({ contact, tags });
}

// ============================================================
// Phones / emails (replace-all for the primary contact)
// ============================================================

export async function handlePhonesPut(id: string, request: Request, env: Env): Promise<Response> {
  const existing = await env.CRM_DB.prepare("SELECT id FROM contacts WHERE id = ?1").bind(id).first();
  if (!existing) return jsonResponse({ error: "not found" }, 404);
  let body: { phones?: PhoneInput[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }
  const phones = normalizePhoneInputs(Array.isArray(body.phones) ? body.phones : []);
  const now = new Date().toISOString();
  await env.CRM_DB.batch(writePhones(env, id, null, phones, now));
  await syncPrimaries(env, id);
  const [{ results }, contact] = await Promise.all([
    env.CRM_DB.prepare(
      "SELECT * FROM phones WHERE contact_id = ?1 AND relationship_id IS NULL ORDER BY is_primary DESC, sort_order ASC"
    )
      .bind(id)
      .all<PhoneRow>(),
    getContact(env, id),
  ]);
  return jsonResponse({ phones: results ?? [], contact });
}

export async function handleEmailsPut(id: string, request: Request, env: Env): Promise<Response> {
  const existing = await env.CRM_DB.prepare("SELECT id FROM contacts WHERE id = ?1").bind(id).first();
  if (!existing) return jsonResponse({ error: "not found" }, 404);
  let body: { emails?: EmailInput[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }
  const emails = normalizeEmailInputs(Array.isArray(body.emails) ? body.emails : []);
  const now = new Date().toISOString();
  await env.CRM_DB.batch(writeEmails(env, id, null, emails, now));
  await syncPrimaries(env, id);
  const [{ results }, contact] = await Promise.all([
    env.CRM_DB.prepare(
      "SELECT * FROM emails WHERE contact_id = ?1 AND relationship_id IS NULL ORDER BY is_primary DESC, sort_order ASC"
    )
      .bind(id)
      .all<EmailRow>(),
    getContact(env, id),
  ]);
  return jsonResponse({ emails: results ?? [], contact });
}

export async function handleAddressesPut(id: string, request: Request, env: Env): Promise<Response> {
  const existing = await env.CRM_DB.prepare("SELECT id FROM contacts WHERE id = ?1").bind(id).first();
  if (!existing) return jsonResponse({ error: "not found" }, 404);
  let body: { addresses?: AddressInput[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }
  const addresses = normalizeAddressInputs(Array.isArray(body.addresses) ? body.addresses : []);
  const now = new Date().toISOString();
  await env.CRM_DB.batch([
    ...writeAddresses(env, id, null, addresses, now),
    env.CRM_DB.prepare("UPDATE contacts SET updated_at = ?1 WHERE id = ?2").bind(now, id),
  ]);
  const { results } = await env.CRM_DB.prepare(
    "SELECT * FROM addresses WHERE contact_id = ?1 AND relationship_id IS NULL ORDER BY is_primary DESC, sort_order ASC"
  )
    .bind(id)
    .all<AddressRow>();
  return jsonResponse({ addresses: results ?? [] });
}

// ============================================================
// Delete
// ============================================================

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
    env.CRM_DB.prepare("DELETE FROM phones WHERE contact_id = ?1").bind(id),
    env.CRM_DB.prepare("DELETE FROM emails WHERE contact_id = ?1").bind(id),
    env.CRM_DB.prepare("DELETE FROM addresses WHERE contact_id = ?1").bind(id),
    env.CRM_DB.prepare("DELETE FROM relationships WHERE contact_id = ?1").bind(id),
    env.CRM_DB.prepare("DELETE FROM contact_tags WHERE contact_id = ?1").bind(id),
    env.CRM_DB.prepare("DELETE FROM contacts WHERE id = ?1").bind(id),
  ]);
  return jsonResponse({ ok: true });
}
