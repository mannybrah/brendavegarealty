import { Env } from "./env";
import { jsonResponse } from "./http";
import { dealTemplate } from "./dealTemplates";
import { STAGE_LABELS, Stage } from "../lib/crm/normalize";

export interface DealRow {
  id: string;
  contact_id: string;
  side: string;
  property_address: string;
  status: string;
  target_close_date: string | null;
  portal_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface MilestoneRow {
  id: string;
  deal_id: string;
  title: string;
  kind: string;
  date: string | null;
  status: string;
  client_visible: number;
  notes: string;
  sort_order: number;
  reminded_day_before: string | null;
  reminded_day_of: string | null;
  created_at: string;
  updated_at: string;
}

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

export interface PortalData {
  deal: DealRow;
  contactFirstName: string;
  milestones: MilestoneRow[];
}

const SIDES = new Set(["buyer", "seller"]);
const DEAL_STATUSES = new Set(["active", "pending", "closed", "cancelled"]);
const MILESTONE_STATUSES = new Set(["upcoming", "done", "skipped"]);
const BASE62 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

// 22 chars base62 from crypto.getRandomValues — acceptable bias at this threat model.
function newPortalToken(): string {
  const bytes = new Uint8Array(22);
  crypto.getRandomValues(bytes);
  let token = "";
  for (let i = 0; i < bytes.length; i++) token += BASE62[bytes[i] % 62];
  return token;
}

// ============================================================
// Deals
// ============================================================

export async function handleDealCreate(request: Request, env: Env): Promise<Response> {
  let body: { contactId?: string; side?: string; propertyAddress?: string; targetCloseDate?: string | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }

  const contactId = typeof body.contactId === "string" ? body.contactId.trim() : "";
  if (!contactId) return jsonResponse({ error: "contactId is required" }, 400);

  const side = body.side;
  if (typeof side !== "string" || !SIDES.has(side)) {
    return jsonResponse({ error: "side must be buyer or seller" }, 400);
  }

  const contact = await env.CRM_DB.prepare("SELECT * FROM contacts WHERE id = ?1").bind(contactId).first<ContactRow>();
  if (!contact) return jsonResponse({ error: "not found" }, 404);

  const propertyAddress = typeof body.propertyAddress === "string" ? body.propertyAddress.trim() : "";
  const targetCloseDate =
    typeof body.targetCloseDate === "string" && body.targetCloseDate.trim() ? body.targetCloseDate.trim() : null;

  const dealId = crypto.randomUUID();
  const now = new Date().toISOString();

  const statements = [
    env.CRM_DB.prepare(
      `INSERT INTO deals (id, contact_id, side, property_address, status, target_close_date, portal_token, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, 'active', ?5, NULL, ?6, ?6)`
    ).bind(dealId, contactId, side, propertyAddress, targetCloseDate, now),
  ];

  const milestones = dealTemplate(side as "buyer" | "seller");
  milestones.forEach((m, index) => {
    statements.push(
      env.CRM_DB.prepare(
        `INSERT INTO milestones (id, deal_id, title, kind, date, status, client_visible, notes, sort_order, reminded_day_before, reminded_day_of, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, NULL, 'upcoming', ?5, '', ?6, NULL, NULL, ?7, ?7)`
      ).bind(crypto.randomUUID(), dealId, m.title, m.kind, m.clientVisible ? 1 : 0, index, now)
    );
  });

  const eventBody = `Started ${side} deal${propertyAddress ? ` — ${propertyAddress}` : ""}`;
  statements.push(
    env.CRM_DB.prepare(
      "INSERT INTO events (id, contact_id, kind, body, meta, created_at) VALUES (?1, ?2, 'deal', ?3, NULL, ?4)"
    ).bind(crypto.randomUUID(), contactId, eventBody, now)
  );

  if (contact.stage === "new" || contact.stage === "contacted") {
    statements.push(
      env.CRM_DB.prepare("UPDATE contacts SET stage = 'active', updated_at = ?1, last_activity_at = ?1 WHERE id = ?2").bind(
        now,
        contactId
      )
    );
    const stageBody = `${STAGE_LABELS[contact.stage as Stage]} → ${STAGE_LABELS.active}`;
    statements.push(
      env.CRM_DB.prepare(
        "INSERT INTO events (id, contact_id, kind, body, meta, created_at) VALUES (?1, ?2, 'stage_change', ?3, NULL, ?4)"
      ).bind(crypto.randomUUID(), contactId, stageBody, now)
    );
  } else {
    statements.push(
      env.CRM_DB.prepare("UPDATE contacts SET updated_at = ?1, last_activity_at = ?1 WHERE id = ?2").bind(now, contactId)
    );
  }

  await env.CRM_DB.batch(statements);

  const deal = await env.CRM_DB.prepare("SELECT * FROM deals WHERE id = ?1").bind(dealId).first<DealRow>();
  return jsonResponse({ deal }, 201);
}

export async function handleDealGet(id: string, env: Env): Promise<Response> {
  const deal = await env.CRM_DB.prepare("SELECT * FROM deals WHERE id = ?1").bind(id).first<DealRow>();
  if (!deal) return jsonResponse({ error: "not found" }, 404);

  const [milestones, contact] = await Promise.all([
    env.CRM_DB.prepare("SELECT * FROM milestones WHERE deal_id = ?1 ORDER BY sort_order ASC").bind(id).all<MilestoneRow>(),
    env.CRM_DB.prepare("SELECT * FROM contacts WHERE id = ?1").bind(deal.contact_id).first<ContactRow>(),
  ]);

  return jsonResponse({ deal, milestones: milestones.results ?? [], contact });
}

export async function handleDealPatch(id: string, request: Request, env: Env): Promise<Response> {
  const existing = await env.CRM_DB.prepare("SELECT * FROM deals WHERE id = ?1").bind(id).first<DealRow>();
  if (!existing) return jsonResponse({ error: "not found" }, 404);

  let body: { propertyAddress?: string; status?: string; targetCloseDate?: string | null; side?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }

  if (body.status !== undefined && !DEAL_STATUSES.has(body.status)) {
    return jsonResponse({ error: "status must be one of active, pending, closed, cancelled" }, 400);
  }
  if (body.side !== undefined && !SIDES.has(body.side)) {
    return jsonResponse({ error: "side must be buyer or seller" }, 400);
  }

  const propertyAddress = typeof body.propertyAddress === "string" ? body.propertyAddress.trim() : existing.property_address;
  const status = typeof body.status === "string" ? body.status : existing.status;
  const targetCloseDate =
    body.targetCloseDate !== undefined
      ? typeof body.targetCloseDate === "string" && body.targetCloseDate.trim()
        ? body.targetCloseDate.trim()
        : null
      : existing.target_close_date;
  const side = typeof body.side === "string" ? body.side : existing.side;

  const now = new Date().toISOString();
  const statements = [
    env.CRM_DB.prepare(
      "UPDATE deals SET property_address=?1, status=?2, target_close_date=?3, side=?4, updated_at=?5 WHERE id=?6"
    ).bind(propertyAddress, status, targetCloseDate, side, now, id),
  ];

  if (status === "closed" && status !== existing.status) {
    const contact = await env.CRM_DB.prepare("SELECT * FROM contacts WHERE id = ?1")
      .bind(existing.contact_id)
      .first<ContactRow>();
    if (contact && contact.stage !== "closed") {
      statements.push(
        env.CRM_DB.prepare("UPDATE contacts SET stage = 'closed', updated_at = ?1, last_activity_at = ?1 WHERE id = ?2").bind(
          now,
          existing.contact_id
        )
      );
      const stageBody = `${STAGE_LABELS[contact.stage as Stage]} → ${STAGE_LABELS.closed}`;
      statements.push(
        env.CRM_DB.prepare(
          "INSERT INTO events (id, contact_id, kind, body, meta, created_at) VALUES (?1, ?2, 'stage_change', ?3, NULL, ?4)"
        ).bind(crypto.randomUUID(), existing.contact_id, stageBody, now)
      );
    }
  }

  await env.CRM_DB.batch(statements);

  const deal = await env.CRM_DB.prepare("SELECT * FROM deals WHERE id = ?1").bind(id).first<DealRow>();
  return jsonResponse({ deal });
}

export async function handleDealDelete(id: string, env: Env): Promise<Response> {
  const existing = await env.CRM_DB.prepare("SELECT id FROM deals WHERE id = ?1").bind(id).first();
  if (!existing) return jsonResponse({ error: "not found" }, 404);

  await env.CRM_DB.batch([
    env.CRM_DB.prepare("DELETE FROM tasks WHERE deal_id = ?1").bind(id),
    env.CRM_DB.prepare("DELETE FROM milestones WHERE deal_id = ?1").bind(id),
    env.CRM_DB.prepare("DELETE FROM deals WHERE id = ?1").bind(id),
  ]);
  return jsonResponse({ ok: true });
}

// ============================================================
// Milestones
// ============================================================

export async function handleMilestoneCreate(dealId: string, request: Request, env: Env): Promise<Response> {
  const deal = await env.CRM_DB.prepare("SELECT id FROM deals WHERE id = ?1").bind(dealId).first();
  if (!deal) return jsonResponse({ error: "not found" }, 404);

  let body: { title?: string; date?: string | null; clientVisible?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return jsonResponse({ error: "title is required" }, 400);

  const date = typeof body.date === "string" && body.date.trim() ? body.date.trim() : null;
  const clientVisible = body.clientVisible === false ? 0 : 1;

  const maxRow = await env.CRM_DB.prepare("SELECT MAX(sort_order) AS m FROM milestones WHERE deal_id = ?1")
    .bind(dealId)
    .first<{ m: number | null }>();
  const sortOrder = maxRow && maxRow.m !== null ? maxRow.m + 1 : 0;

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.CRM_DB.prepare(
    `INSERT INTO milestones (id, deal_id, title, kind, date, status, client_visible, notes, sort_order, reminded_day_before, reminded_day_of, created_at, updated_at)
     VALUES (?1, ?2, ?3, 'custom', ?4, 'upcoming', ?5, '', ?6, NULL, NULL, ?7, ?7)`
  )
    .bind(id, dealId, title, date, clientVisible, sortOrder, now)
    .run();

  const milestone = await env.CRM_DB.prepare("SELECT * FROM milestones WHERE id = ?1").bind(id).first<MilestoneRow>();
  return jsonResponse({ milestone }, 201);
}

export async function handleMilestonePatch(id: string, request: Request, env: Env): Promise<Response> {
  const existing = await env.CRM_DB.prepare("SELECT * FROM milestones WHERE id = ?1").bind(id).first<MilestoneRow>();
  if (!existing) return jsonResponse({ error: "not found" }, 404);

  let body: {
    title?: string;
    date?: string | null;
    status?: string;
    clientVisible?: boolean;
    notes?: string;
    sortOrder?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }

  if (body.status !== undefined && !MILESTONE_STATUSES.has(body.status)) {
    return jsonResponse({ error: "status must be one of upcoming, done, skipped" }, 400);
  }

  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : existing.title;
  const status = typeof body.status === "string" ? body.status : existing.status;
  const clientVisible = typeof body.clientVisible === "boolean" ? (body.clientVisible ? 1 : 0) : existing.client_visible;
  const notes = typeof body.notes === "string" ? body.notes : existing.notes;
  const sortOrder = typeof body.sortOrder === "number" ? body.sortOrder : existing.sort_order;

  let date = existing.date;
  let dateChanged = false;
  if (body.date !== undefined) {
    const nextDate = typeof body.date === "string" && body.date.trim() ? body.date.trim() : null;
    if (nextDate !== existing.date) {
      date = nextDate;
      dateChanged = true;
    }
  }

  const remindedDayBefore = dateChanged ? null : existing.reminded_day_before;
  const remindedDayOf = dateChanged ? null : existing.reminded_day_of;

  const now = new Date().toISOString();
  await env.CRM_DB.prepare(
    `UPDATE milestones SET title=?1, date=?2, status=?3, client_visible=?4, notes=?5, sort_order=?6, reminded_day_before=?7, reminded_day_of=?8, updated_at=?9 WHERE id=?10`
  )
    .bind(title, date, status, clientVisible, notes, sortOrder, remindedDayBefore, remindedDayOf, now, id)
    .run();

  const milestone = await env.CRM_DB.prepare("SELECT * FROM milestones WHERE id = ?1").bind(id).first<MilestoneRow>();
  return jsonResponse({ milestone });
}

export async function handleMilestoneDelete(id: string, env: Env): Promise<Response> {
  const existing = await env.CRM_DB.prepare("SELECT id FROM milestones WHERE id = ?1").bind(id).first();
  if (!existing) return jsonResponse({ error: "not found" }, 404);

  await env.CRM_DB.prepare("DELETE FROM milestones WHERE id = ?1").bind(id).run();
  return jsonResponse({ ok: true });
}

// ============================================================
// Portal tokens
// ============================================================

export async function handlePortalEnable(dealId: string, env: Env): Promise<Response> {
  const existing = await env.CRM_DB.prepare("SELECT id FROM deals WHERE id = ?1").bind(dealId).first();
  if (!existing) return jsonResponse({ error: "not found" }, 404);

  const portalToken = newPortalToken();
  const now = new Date().toISOString();
  await env.CRM_DB.prepare("UPDATE deals SET portal_token = ?1, updated_at = ?2 WHERE id = ?3")
    .bind(portalToken, now, dealId)
    .run();

  return jsonResponse({ portalToken });
}

export async function handlePortalDisable(dealId: string, env: Env): Promise<Response> {
  const existing = await env.CRM_DB.prepare("SELECT id FROM deals WHERE id = ?1").bind(dealId).first();
  if (!existing) return jsonResponse({ error: "not found" }, 404);

  const now = new Date().toISOString();
  await env.CRM_DB.prepare("UPDATE deals SET portal_token = NULL, updated_at = ?1 WHERE id = ?2").bind(now, dealId).run();

  return jsonResponse({ ok: true });
}

export async function findDealByPortalToken(token: string, env: Env): Promise<PortalData | null> {
  const deal = await env.CRM_DB.prepare("SELECT * FROM deals WHERE portal_token = ?1").bind(token).first<DealRow>();
  if (!deal) return null;

  const [contact, milestones] = await Promise.all([
    env.CRM_DB.prepare("SELECT first_name FROM contacts WHERE id = ?1")
      .bind(deal.contact_id)
      .first<{ first_name: string }>(),
    env.CRM_DB.prepare("SELECT * FROM milestones WHERE deal_id = ?1 AND client_visible = 1 ORDER BY sort_order ASC")
      .bind(deal.id)
      .all<MilestoneRow>(),
  ]);

  return {
    deal,
    contactFirstName: contact?.first_name ?? "",
    milestones: milestones.results ?? [],
  };
}
