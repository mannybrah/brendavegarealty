import { Env } from "./env";
import { jsonResponse } from "./http";
import { listingChecklist } from "./listingChecklist";
import type { ChecklistRow } from "../lib/crm/portalTypes";

export type { ChecklistRow };

// ============================================================
// Checklist items
// ============================================================

export async function handleChecklistCreate(dealId: string, request: Request, env: Env): Promise<Response> {
  const deal = await env.CRM_DB.prepare("SELECT id FROM deals WHERE id = ?1").bind(dealId).first();
  if (!deal) return jsonResponse({ error: "not found" }, 404);

  let body: { title?: string; phase?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }

  const hasSingleItem = typeof body.title === "string" && body.title.trim();

  if (!hasSingleItem) {
    const existingCount = await env.CRM_DB.prepare("SELECT COUNT(*) AS c FROM checklist_items WHERE deal_id = ?1")
      .bind(dealId)
      .first<{ c: number }>();
    if (existingCount && existingCount.c > 0) {
      return jsonResponse({ error: "checklist already seeded" }, 409);
    }

    const now = new Date().toISOString();
    const items = listingChecklist();
    const statements = items.map((item, index) =>
      env.CRM_DB.prepare(
        `INSERT INTO checklist_items (id, deal_id, phase, title, done_at, sort_order, created_at)
         VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?6)`
      ).bind(crypto.randomUUID(), dealId, item.phase, item.title, index, now)
    );
    await env.CRM_DB.batch(statements);

    const checklist = await env.CRM_DB.prepare(
      "SELECT * FROM checklist_items WHERE deal_id = ?1 ORDER BY phase ASC, sort_order ASC"
    )
      .bind(dealId)
      .all<ChecklistRow>();
    return jsonResponse({ checklist: checklist.results ?? [] }, 201);
  }

  const title = (body.title as string).trim();
  const phase = typeof body.phase === "number" ? body.phase : 0;

  const maxRow = await env.CRM_DB.prepare("SELECT MAX(sort_order) AS m FROM checklist_items WHERE deal_id = ?1 AND phase = ?2")
    .bind(dealId, phase)
    .first<{ m: number | null }>();
  const sortOrder = maxRow && maxRow.m !== null ? maxRow.m + 1 : 0;

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.CRM_DB.prepare(
    `INSERT INTO checklist_items (id, deal_id, phase, title, done_at, sort_order, created_at)
     VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?6)`
  )
    .bind(id, dealId, phase, title, sortOrder, now)
    .run();

  const item = await env.CRM_DB.prepare("SELECT * FROM checklist_items WHERE id = ?1").bind(id).first<ChecklistRow>();
  return jsonResponse({ item }, 201);
}

export async function handleChecklistPatch(id: string, request: Request, env: Env): Promise<Response> {
  const existing = await env.CRM_DB.prepare("SELECT * FROM checklist_items WHERE id = ?1").bind(id).first<ChecklistRow>();
  if (!existing) return jsonResponse({ error: "not found" }, 404);

  let body: { done?: boolean; title?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }

  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : existing.title;
  const doneAt = typeof body.done === "boolean" ? (body.done ? new Date().toISOString() : null) : existing.done_at;

  await env.CRM_DB.prepare("UPDATE checklist_items SET title=?1, done_at=?2 WHERE id=?3").bind(title, doneAt, id).run();

  const item = await env.CRM_DB.prepare("SELECT * FROM checklist_items WHERE id = ?1").bind(id).first<ChecklistRow>();
  return jsonResponse({ item });
}

export async function handleChecklistDelete(id: string, env: Env): Promise<Response> {
  const existing = await env.CRM_DB.prepare("SELECT id FROM checklist_items WHERE id = ?1").bind(id).first();
  if (!existing) return jsonResponse({ error: "not found" }, 404);

  await env.CRM_DB.prepare("DELETE FROM checklist_items WHERE id = ?1").bind(id).run();
  return jsonResponse({ ok: true });
}

export async function handleChecklistDeleteAll(dealId: string, env: Env): Promise<Response> {
  const deal = await env.CRM_DB.prepare("SELECT id FROM deals WHERE id = ?1").bind(dealId).first();
  if (!deal) return jsonResponse({ error: "not found" }, 404);

  await env.CRM_DB.prepare("DELETE FROM checklist_items WHERE deal_id = ?1").bind(dealId).run();
  return jsonResponse({ ok: true });
}
