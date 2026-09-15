import { Env } from "./env";
import { jsonResponse } from "./http";
import { CALL_OUTCOMES, CALL_OUTCOME_LABELS, CallOutcome } from "../lib/crm/types";
import type { EventRow } from "../lib/crm/types";

const EDITABLE = new Set(["note", "call", "text", "email"]);
const COMM = new Set(["call", "text", "email"]);

export async function recomputeLastCommunication(env: Env, contactId: string): Promise<void> {
  await env.CRM_DB.prepare(
    "UPDATE contacts SET last_communication_at = (SELECT MAX(created_at) FROM events WHERE contact_id = ?1 AND kind IN ('call','text','email')) WHERE id = ?1"
  )
    .bind(contactId)
    .run();
}

function parseOutcome(kind: string, raw: unknown): { ok: true; outcome: string | null } | { ok: false } {
  if (raw === undefined || raw === null || raw === "") return { ok: true, outcome: null };
  if (kind !== "call") return { ok: false };
  if (typeof raw === "string" && (CALL_OUTCOMES as readonly string[]).includes(raw)) return { ok: true, outcome: raw };
  return { ok: false };
}

export async function handleEventCreate(contactId: string, request: Request, env: Env): Promise<Response> {
  const existing = await env.CRM_DB.prepare("SELECT id FROM contacts WHERE id = ?1").bind(contactId).first();
  if (!existing) return jsonResponse({ error: "not found" }, 404);

  let body: { kind?: string; body?: string; outcome?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }
  if (typeof body.kind !== "string" || !EDITABLE.has(body.kind)) {
    return jsonResponse({ error: "kind must be one of note, call, text, email" }, 400);
  }
  const parsed = parseOutcome(body.kind, body.outcome);
  if (!parsed.ok) return jsonResponse({ error: "invalid outcome" }, 400);
  let text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text && parsed.outcome) text = CALL_OUTCOME_LABELS[parsed.outcome as CallOutcome];
  if (!text) return jsonResponse({ error: "body is required" }, 400);

  const eventId = crypto.randomUUID();
  const now = new Date().toISOString();
  const isComm = COMM.has(body.kind);
  await env.CRM_DB.batch([
    env.CRM_DB.prepare(
      "INSERT INTO events (id, contact_id, kind, body, meta, outcome, starred, updated_at, created_at) VALUES (?1, ?2, ?3, ?4, NULL, ?5, 0, NULL, ?6)"
    ).bind(eventId, contactId, body.kind, text, parsed.outcome, now),
    isComm
      ? env.CRM_DB.prepare(
          "UPDATE contacts SET last_activity_at = ?1, updated_at = ?1, last_communication_at = ?1 WHERE id = ?2"
        ).bind(now, contactId)
      : env.CRM_DB.prepare("UPDATE contacts SET last_activity_at = ?1, updated_at = ?1 WHERE id = ?2").bind(now, contactId),
  ]);

  const event = await env.CRM_DB.prepare("SELECT * FROM events WHERE id = ?1").bind(eventId).first<EventRow>();
  return jsonResponse({ event }, 201);
}

export async function handleEventPatch(id: string, request: Request, env: Env): Promise<Response> {
  const existing = await env.CRM_DB.prepare("SELECT * FROM events WHERE id = ?1").bind(id).first<EventRow>();
  if (!existing) return jsonResponse({ error: "not found" }, 404);

  let body: { body?: string; outcome?: string | null; starred?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }

  let text = existing.body;
  let outcome = existing.outcome;
  let contentChanged = false;
  if (body.body !== undefined || body.outcome !== undefined) {
    if (!EDITABLE.has(existing.kind)) return jsonResponse({ error: "this entry can't be edited" }, 400);
    if (body.body !== undefined) {
      const t = typeof body.body === "string" ? body.body.trim() : "";
      if (!t) return jsonResponse({ error: "body is required" }, 400);
      if (t !== text) {
        text = t;
        contentChanged = true;
      }
    }
    if (body.outcome !== undefined) {
      const parsed = parseOutcome(existing.kind, body.outcome);
      if (!parsed.ok) return jsonResponse({ error: "invalid outcome" }, 400);
      if (parsed.outcome !== outcome) {
        outcome = parsed.outcome;
        contentChanged = true;
      }
    }
  }
  const starred = typeof body.starred === "boolean" ? (body.starred ? 1 : 0) : existing.starred;
  const updatedAt = contentChanged ? new Date().toISOString() : existing.updated_at;

  await env.CRM_DB.prepare("UPDATE events SET body=?1, outcome=?2, starred=?3, updated_at=?4 WHERE id=?5")
    .bind(text, outcome, starred, updatedAt, id)
    .run();
  const event = await env.CRM_DB.prepare("SELECT * FROM events WHERE id = ?1").bind(id).first<EventRow>();
  return jsonResponse({ event });
}

export async function handleEventDelete(id: string, env: Env): Promise<Response> {
  const existing = await env.CRM_DB.prepare("SELECT * FROM events WHERE id = ?1").bind(id).first<EventRow>();
  if (!existing) return jsonResponse({ error: "not found" }, 404);
  if (!EDITABLE.has(existing.kind)) return jsonResponse({ error: "this entry can't be deleted" }, 400);
  await env.CRM_DB.prepare("DELETE FROM events WHERE id = ?1").bind(id).run();
  if (COMM.has(existing.kind)) await recomputeLastCommunication(env, existing.contact_id);
  return jsonResponse({ ok: true });
}
