// Public lead intake → CRM. Dedupes against every phone/email on file
// (including relationships'), resurfaces archived contacts, and guarantees one
// open "Respond to …" task per contact. Studio handlers live in crmContacts /
// crmEvents / crmTasks / crmStages / crmTags / crmDashboard.
import { Env } from "./env";
import { pacificToday } from "./time";
import { normalizeEmail, normalizePhone, splitName } from "../lib/crm/normalize";
import { writeEmails, writePhones } from "./crmContacts";

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
    existing = await env.CRM_DB.prepare(
      `SELECT c.id, c.stage FROM contacts c WHERE
         (?1 IS NOT NULL AND (c.email = ?1 OR EXISTS (SELECT 1 FROM emails e WHERE e.contact_id = c.id AND e.address = ?1)))
         OR (?2 IS NOT NULL AND (c.phone = ?2 OR EXISTS (SELECT 1 FROM phones p WHERE p.contact_id = c.id AND p.number = ?2)))
       ORDER BY c.last_activity_at DESC LIMIT 1`
    )
      .bind(email, phone)
      .first<{ id: string; stage: string }>();
  }

  let contactId: string;
  let contactName: string;
  let created = false;

  if (existing) {
    contactId = existing.id;
    const stageClause = existing.stage === "archived" ? ", stage = 'new'" : "";
    const statements = [
      env.CRM_DB.prepare(
        "INSERT INTO events (id, contact_id, kind, body, meta, created_at) VALUES (?1, ?2, 'lead_submission', ?3, ?4, ?5)"
      ).bind(crypto.randomUUID(), contactId, eventBody, meta, now),
      env.CRM_DB.prepare(`UPDATE contacts SET last_activity_at = ?1, updated_at = ?1${stageClause} WHERE id = ?2`).bind(
        now,
        contactId
      ),
    ];
    // A returning lead who typed a number/address we do not have yet: keep it
    // as a secondary row instead of burying it in the event meta. Same
    // INSERT ... WHERE NOT EXISTS shape the CSV import uses.
    if (phone) {
      statements.push(
        env.CRM_DB.prepare(
          `INSERT INTO phones (id, contact_id, relationship_id, number, label, is_primary, is_bad, sort_order, created_at)
           SELECT ?1, ?2, NULL, ?3, 'mobile', CASE WHEN EXISTS (SELECT 1 FROM phones WHERE contact_id = ?2 AND relationship_id IS NULL) THEN 0 ELSE 1 END, 0, 99, ?4
           WHERE NOT EXISTS (SELECT 1 FROM phones WHERE contact_id = ?2 AND number = ?3)`
        ).bind(crypto.randomUUID(), contactId, phone, now)
      );
    }
    if (email) {
      statements.push(
        env.CRM_DB.prepare(
          `INSERT INTO emails (id, contact_id, relationship_id, address, label, is_primary, is_bad, sort_order, created_at)
           SELECT ?1, ?2, NULL, ?3, 'personal', CASE WHEN EXISTS (SELECT 1 FROM emails WHERE contact_id = ?2 AND relationship_id IS NULL) THEN 0 ELSE 1 END, 0, 99, ?4
           WHERE NOT EXISTS (SELECT 1 FROM emails WHERE contact_id = ?2 AND address = ?3)`
        ).bind(crypto.randomUUID(), contactId, email, now)
      );
    }
    await env.CRM_DB.batch(statements);
    const row = await env.CRM_DB.prepare("SELECT first_name, last_name FROM contacts WHERE id = ?1")
      .bind(contactId)
      .first<{ first_name: string; last_name: string }>();
    contactName = row ? `${row.first_name} ${row.last_name}`.trim() || input.name.trim() : input.name.trim();
  } else {
    contactId = crypto.randomUUID();
    contactName = input.name.trim();
    const phones = phone ? [{ number: phone, label: "mobile", isPrimary: true, isBad: false }] : [];
    const emails = email ? [{ address: email, label: "personal", isPrimary: true, isBad: false }] : [];
    await env.CRM_DB.batch([
      env.CRM_DB.prepare(
        `INSERT INTO contacts (id, first_name, last_name, email, phone, type, stage, source, notes, price, timeframe, address, last_communication_at, created_at, updated_at, last_activity_at)
         VALUES (?1, ?2, ?3, ?4, ?5, NULL, 'new', ?6, '', NULL, NULL, '', NULL, ?7, ?7, ?7)`
      ).bind(contactId, firstName, lastName, email, phone, input.source, now),
      ...writePhones(env, contactId, null, phones, now),
      ...writeEmails(env, contactId, null, emails, now),
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
      "INSERT INTO tasks (id, contact_id, deal_id, milestone_id, title, type, due_at, done_at, notified_at, created_at) VALUES (?1, ?2, NULL, NULL, ?3, 'call', ?4, NULL, NULL, ?5)"
    )
      .bind(crypto.randomUUID(), contactId, taskTitle, pacificToday(), now)
      .run();
  }

  return { contactId, contactName, created };
}
