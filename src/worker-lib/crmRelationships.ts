import { Env } from "./env";
import { jsonResponse } from "./http";
import { normalizeAddressInputs, normalizeEmailInputs, normalizePhoneInputs, AddressInput, PhoneInput, EmailInput } from "../lib/crm/contactsInput";
import type { AddressRow, EmailRow, PhoneRow, RelationshipFull, RelationshipRow } from "../lib/crm/types";
import { writeAddresses, writeEmails, writePhones } from "./crmContacts";

interface RelBody {
  firstName?: string;
  lastName?: string;
  type?: string;
  phones?: PhoneInput[];
  emails?: EmailInput[];
  addresses?: AddressInput[];
}

async function loadFull(env: Env, id: string): Promise<RelationshipFull | null> {
  const rel = await env.CRM_DB.prepare("SELECT * FROM relationships WHERE id = ?1").bind(id).first<RelationshipRow>();
  if (!rel) return null;
  const [p, e, a] = await Promise.all([
    env.CRM_DB.prepare("SELECT * FROM phones WHERE relationship_id = ?1 ORDER BY is_primary DESC, sort_order ASC")
      .bind(id)
      .all<PhoneRow>(),
    env.CRM_DB.prepare("SELECT * FROM emails WHERE relationship_id = ?1 ORDER BY is_primary DESC, sort_order ASC")
      .bind(id)
      .all<EmailRow>(),
    env.CRM_DB.prepare("SELECT * FROM addresses WHERE relationship_id = ?1 ORDER BY is_primary DESC, sort_order ASC")
      .bind(id)
      .all<AddressRow>(),
  ]);
  return { ...rel, phones: p.results ?? [], emails: e.results ?? [], addresses: a.results ?? [] };
}

export async function handleRelationshipCreate(contactId: string, request: Request, env: Env): Promise<Response> {
  const contact = await env.CRM_DB.prepare("SELECT id FROM contacts WHERE id = ?1").bind(contactId).first();
  if (!contact) return jsonResponse({ error: "not found" }, 404);
  let body: RelBody;
  try {
    body = (await request.json()) as RelBody;
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  if (!firstName && !lastName) return jsonResponse({ error: "name is required" }, 400);
  const type = typeof body.type === "string" ? body.type.trim().slice(0, 40) : "";
  const phones = normalizePhoneInputs(Array.isArray(body.phones) ? body.phones : []);
  const emails = normalizeEmailInputs(Array.isArray(body.emails) ? body.emails : []);
  const addresses = normalizeAddressInputs(Array.isArray(body.addresses) ? body.addresses : []);

  const countRow = await env.CRM_DB.prepare("SELECT COUNT(*) AS n FROM relationships WHERE contact_id = ?1")
    .bind(contactId)
    .first<{ n: number }>();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const label = `${firstName} ${lastName}`.trim();
  await env.CRM_DB.batch([
    env.CRM_DB.prepare(
      "INSERT INTO relationships (id, contact_id, first_name, last_name, type, sort_order, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)"
    ).bind(id, contactId, firstName, lastName, type, countRow?.n ?? 0, now),
    ...writePhones(env, contactId, id, phones, now),
    ...writeEmails(env, contactId, id, emails, now),
    ...writeAddresses(env, contactId, id, addresses, now),
    env.CRM_DB.prepare(
      "INSERT INTO events (id, contact_id, kind, body, meta, created_at) VALUES (?1, ?2, 'system', ?3, NULL, ?4)"
    ).bind(crypto.randomUUID(), contactId, `Added relationship: ${label}${type ? ` (${type})` : ""}`, now),
    env.CRM_DB.prepare("UPDATE contacts SET updated_at = ?1 WHERE id = ?2").bind(now, contactId),
  ]);
  return jsonResponse({ relationship: await loadFull(env, id) }, 201);
}

export async function handleRelationshipPatch(id: string, request: Request, env: Env): Promise<Response> {
  const existing = await env.CRM_DB.prepare("SELECT * FROM relationships WHERE id = ?1").bind(id).first<RelationshipRow>();
  if (!existing) return jsonResponse({ error: "not found" }, 404);
  let body: RelBody;
  try {
    body = (await request.json()) as RelBody;
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : existing.first_name;
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : existing.last_name;
  if (!firstName && !lastName) return jsonResponse({ error: "name is required" }, 400);
  const type = typeof body.type === "string" ? body.type.trim().slice(0, 40) : existing.type;
  const now = new Date().toISOString();
  const statements = [
    env.CRM_DB.prepare("UPDATE relationships SET first_name=?1, last_name=?2, type=?3, updated_at=?4 WHERE id=?5").bind(
      firstName,
      lastName,
      type,
      now,
      id
    ),
  ];
  if (Array.isArray(body.phones)) {
    statements.push(...writePhones(env, existing.contact_id, id, normalizePhoneInputs(body.phones), now));
  }
  if (Array.isArray(body.emails)) {
    statements.push(...writeEmails(env, existing.contact_id, id, normalizeEmailInputs(body.emails), now));
  }
  if (Array.isArray(body.addresses)) {
    statements.push(...writeAddresses(env, existing.contact_id, id, normalizeAddressInputs(body.addresses), now));
  }
  await env.CRM_DB.batch(statements);
  return jsonResponse({ relationship: await loadFull(env, id) });
}

export async function handleRelationshipDelete(id: string, env: Env): Promise<Response> {
  const existing = await env.CRM_DB.prepare("SELECT * FROM relationships WHERE id = ?1")
    .bind(id)
    .first<RelationshipRow>();
  if (!existing) return jsonResponse({ error: "not found" }, 404);
  const now = new Date().toISOString();
  const label = `${existing.first_name} ${existing.last_name}`.trim() || "relationship";
  await env.CRM_DB.batch([
    env.CRM_DB.prepare("DELETE FROM phones WHERE relationship_id = ?1").bind(id),
    env.CRM_DB.prepare("DELETE FROM emails WHERE relationship_id = ?1").bind(id),
    env.CRM_DB.prepare("DELETE FROM addresses WHERE relationship_id = ?1").bind(id),
    env.CRM_DB.prepare("DELETE FROM relationships WHERE id = ?1").bind(id),
    // Symmetric with create: the timeline records both sides of the change.
    env.CRM_DB.prepare(
      "INSERT INTO events (id, contact_id, kind, body, meta, created_at) VALUES (?1, ?2, 'system', ?3, NULL, ?4)"
    ).bind(
      crypto.randomUUID(),
      existing.contact_id,
      `Removed relationship: ${label}${existing.type ? ` (${existing.type})` : ""}`,
      now
    ),
    env.CRM_DB.prepare("UPDATE contacts SET updated_at = ?1 WHERE id = ?2").bind(now, existing.contact_id),
  ]);
  return jsonResponse({ ok: true });
}
