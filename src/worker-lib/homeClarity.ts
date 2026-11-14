// Brenda Vega's Home Clarity: disclosure upload intake + Brenda's studio inbox.
//
// Public flow (two steps so the browser can show real transfer progress):
//   POST /api/home-clarity/intakes            lead fields -> draft + upload token
//   PUT  /api/home-clarity/intakes/:id/file   the PDF -> private R2, draft becomes "received"
// A lead only exists for Brenda once the file has actually been stored and checked.
// Nothing here analyzes the document: Brenda runs the report herself and records her
// progress from the studio.
import { Env } from "./env";
import { jsonResponse } from "./http";
import { ingestLead } from "./crm";
import { sendPushToAll } from "./push";
import { checkRateLimit } from "../lib/rate-limit";
import {
  CONTACT_STATUSES,
  HC_CONSENT_VERSION,
  HC_DEFAULT_MAX_MB,
  REPORT_STATUSES,
  agentStatusLabel,
  cleanReportUrl,
  hasPdfSignature,
  inboxBucket,
  maxBytes,
  validateIntake,
  type ContactStatus,
  type ReportStatus,
} from "../lib/homeClarity";
import { siteConfig } from "../data/site";
import { buildHcEmail, type HcIntakeRow } from "../lib/homeClarityEmail";

export type { HcIntakeRow };

const DRAFT_TTL_MINUTES = 120;
const DEFAULT_RETENTION_DAYS = 90;
const MAX_DELIVERY_ATTEMPTS = 5;


function enabled(env: Env): boolean {
  return env.HC_ENABLED === "true";
}

function maxMb(env: Env): number {
  const n = Number(env.HC_MAX_FILE_MB);
  return Number.isFinite(n) && n > 0 && n <= 95 ? n : HC_DEFAULT_MAX_MB;
}

function retentionDays(env: Env): number {
  const n = Number(env.HC_RETENTION_DAYS);
  return Number.isFinite(n) && n >= 1 ? n : DEFAULT_RETENTION_DAYS;
}

function fileKey(id: string): string {
  return `home-clarity/${id}/disclosure.pdf`;
}

function hex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
}

/**
 * Upload token for one draft: an HMAC of the intake id, so it is unguessable, scoped to
 * that single intake, and can be re-issued for a repeated request without storing it.
 */
async function uploadToken(env: Env, id: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`hc-upload:${env.STUDIO_PASSWORD}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return hex(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(id))));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function authorizedIntake(request: Request, env: Env, id: string): Promise<HcIntakeRow | null> {
  const header = request.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const expected = await uploadToken(env, id);
  // Knowing an id is not enough: the token must match before any row is read
  if (!token || !timingSafeEqual(token, expected)) return null;
  return env.CRM_DB.prepare("SELECT * FROM hc_intakes WHERE id = ?1").bind(id).first<HcIntakeRow>();
}

function logEvent(event: string, details: Record<string, unknown> = {}): void {
  // Operational counters only: no names, emails, addresses or tokens
  console.log(JSON.stringify({ t: new Date().toISOString(), scope: "home-clarity", event, ...details }));
}

// ============================================================
// Public: create draft
// ============================================================

export async function handleHcCreate(request: Request, env: Env): Promise<Response> {
  if (!enabled(env)) return jsonResponse({ error: "unavailable" }, 503);
  if (!env.STUDIO_PASSWORD) return jsonResponse({ error: "unavailable" }, 503);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: "bad_request" }, 400);
  }
  if (!body || typeof body !== "object") return jsonResponse({ error: "bad_request" }, 400);

  // Honeypot: a field real people never see or fill
  if (typeof body.website === "string" && body.website.trim() !== "") {
    logEvent("honeypot");
    return jsonResponse({ error: "bad_request" }, 400);
  }

  const result = validateIntake(body, maxMb(env));
  if (!result.ok) return jsonResponse({ error: "invalid", fields: result.errors }, 400);
  const input = result.value;

  // Same submission again (double click, retry after a dropped response)
  const existing = await env.CRM_DB.prepare("SELECT * FROM hc_intakes WHERE idempotency_key = ?1")
    .bind(input.idempotencyKey)
    .first<HcIntakeRow>();
  if (existing) {
    if (existing.email !== input.email) return jsonResponse({ error: "bad_request" }, 400);
    return jsonResponse({
      id: existing.id,
      state: existing.state,
      uploadToken: await uploadToken(env, existing.id),
      maxBytes: maxBytes(maxMb(env)),
      replayed: true,
    });
  }

  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const day = new Date().toISOString().slice(0, 10);
  const [ipLimit, emailLimit, dayLimit] = await Promise.all([
    checkRateLimit(env.STUDIO_KV, `hc:rl:ip:${await sha256Hex(ip)}`, 6, 3600),
    checkRateLimit(env.STUDIO_KV, `hc:rl:email:${await sha256Hex(input.email)}`, 4, 86400),
    checkRateLimit(env.STUDIO_KV, `hc:rl:day:${day}`, Number(env.HC_DAILY_LIMIT) || 60, 86400),
  ]);
  if (!ipLimit.allowed || !emailLimit.allowed || !dayLimit.allowed) {
    logEvent("rate_limited", { ip: !ipLimit.allowed, email: !emailLimit.allowed, day: !dayLimit.allowed });
    return jsonResponse({ error: "rate_limited" }, 429);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  try {
    await env.CRM_DB.prepare(
      `INSERT INTO hc_intakes (id, idempotency_key, state, property_address, full_name, email, phone, preferred_contact,
         agent_status, questions, consent_version, consent_at, source_page, utm, file_name, file_bytes, created_at, updated_at)
       VALUES (?1, ?2, 'awaiting_upload', ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?11, ?11)`
    )
      .bind(
        id,
        input.idempotencyKey,
        input.propertyAddress,
        input.fullName,
        input.email,
        input.phone,
        input.preferredContact,
        input.agentStatus,
        input.questions,
        HC_CONSENT_VERSION,
        now,
        input.sourcePage,
        input.utm ? JSON.stringify(input.utm) : null,
        input.fileName,
        input.fileBytes
      )
      .run();
  } catch (err) {
    // Lost a race with an identical request: answer with the winner
    const winner = await env.CRM_DB.prepare("SELECT * FROM hc_intakes WHERE idempotency_key = ?1")
      .bind(input.idempotencyKey)
      .first<HcIntakeRow>();
    if (!winner) {
      logEvent("create_error", { error: String(err).slice(0, 120) });
      return jsonResponse({ error: "server_error" }, 500);
    }
    return jsonResponse({
      id: winner.id,
      state: winner.state,
      uploadToken: await uploadToken(env, winner.id),
      maxBytes: maxBytes(maxMb(env)),
      replayed: true,
    });
  }

  logEvent("draft_created");
  return jsonResponse(
    { id, state: "awaiting_upload", uploadToken: await uploadToken(env, id), maxBytes: maxBytes(maxMb(env)) },
    201
  );
}

// ============================================================
// Public: upload the PDF (finalizes the request)
// ============================================================

export async function handleHcUpload(id: string, request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  // Refusals discard the request body first (streamed, never buffered) so the response is
  // delivered cleanly instead of racing a half-sent upload
  const refuse = async (body: object, status: number) => {
    await request.body?.pipeTo(new WritableStream()).catch(() => {});
    return jsonResponse(body, status);
  };

  const intake = await authorizedIntake(request, env, id);
  if (!intake) return refuse({ error: "unauthorized" }, 401);

  if (intake.state === "received") return refuse({ id, state: "received", replayed: true }, 200);
  if (intake.state !== "awaiting_upload") return refuse({ error: "expired" }, 410);
  if (!enabled(env)) return refuse({ error: "unavailable" }, 503);

  const limit = maxBytes(maxMb(env));
  const declared = Number(request.headers.get("Content-Length"));
  if (!Number.isFinite(declared) || declared <= 0) return refuse({ error: "empty_file" }, 422);
  if (declared > limit) return refuse({ error: "too_large", maxBytes: limit }, 413);
  if (!request.body) return jsonResponse({ error: "empty_file" }, 422);

  const key = fileKey(id);
  let stored: R2Object | null;
  try {
    stored = await env.MEDIA.put(key, request.body, { httpMetadata: { contentType: "application/pdf" } });
  } catch (err) {
    logEvent("upload_store_error", { error: String(err).slice(0, 120) });
    return jsonResponse({ error: "upload_failed" }, 502);
  }

  // Check what was actually stored, not what the browser said about it
  const size = stored?.size ?? 0;
  if (size <= 0) {
    await env.MEDIA.delete(key);
    return jsonResponse({ error: "empty_file" }, 422);
  }
  if (size > limit) {
    await env.MEDIA.delete(key);
    return jsonResponse({ error: "too_large", maxBytes: limit }, 413);
  }
  const head = await env.MEDIA.get(key, { range: { offset: 0, length: Math.min(size, 1024) } });
  const headBytes = head ? new Uint8Array(await head.arrayBuffer()) : new Uint8Array(0);
  if (!hasPdfSignature(headBytes)) {
    // The draft stays open so the buyer can choose the right file
    await env.MEDIA.delete(key);
    logEvent("rejected_not_pdf");
    return jsonResponse({ error: "not_pdf" }, 422);
  }

  const now = new Date().toISOString();
  const claim = await env.CRM_DB.prepare(
    `UPDATE hc_intakes SET state = 'received', file_key = ?1, file_bytes = ?2, received_at = ?3, updated_at = ?3
     WHERE id = ?4 AND state = 'awaiting_upload'`
  )
    .bind(key, size, now, id)
    .run();
  if (!claim.meta.changes) {
    // A parallel upload of the same request finished first
    return jsonResponse({ id, state: "received", replayed: true });
  }

  // From here the request is accepted. Follow-on work must never undo that.
  ctx.waitUntil(afterReceived(env, { ...intake, state: "received", file_key: key, file_bytes: size, received_at: now }));
  logEvent("received", { bytes: size });
  return jsonResponse({ id, state: "received" });
}

async function afterReceived(env: Env, intake: HcIntakeRow): Promise<void> {
  try {
    const lines = [
      `Home Clarity disclosure upload: ${intake.property_address}`,
      `Agent status: ${agentStatusLabel(intake.agent_status)}`,
      `Prefers: ${intake.preferred_contact}`,
    ];
    if (intake.questions) lines.push(`Questions: ${intake.questions}`);
    const { contactId } = await ingestLead(env, {
      name: intake.full_name,
      email: intake.email,
      phone: intake.phone,
      source: "home-clarity",
      message: lines.join(" | "),
      meta: { homeClarityId: intake.id, agentStatus: intake.agent_status, preferredContact: intake.preferred_contact },
    });
    await env.CRM_DB.prepare("UPDATE hc_intakes SET crm_contact_id = ?1 WHERE id = ?2").bind(contactId, intake.id).run();
  } catch (err) {
    logEvent("crm_sync_error", { error: String(err).slice(0, 120) });
  }

  await sendPushToAll(env, {
    title: "New Home Clarity request",
    body: `${intake.full_name} uploaded disclosures`,
    url: `/studio/home-clarity?id=${intake.id}`,
  }).catch(() => {});

  const now = new Date().toISOString();
  await env.CRM_DB.batch(
    ["buyer_receipt", "agent_new_request"].map((kind) =>
      env.CRM_DB.prepare(
        "INSERT OR IGNORE INTO hc_deliveries (id, intake_id, kind, status, attempts, created_at) VALUES (?1, ?2, ?3, 'pending', 0, ?4)"
      ).bind(crypto.randomUUID(), intake.id, kind, now)
    )
  );
  await processDeliveries(env, intake.id);
}

export async function handleHcStatus(id: string, request: Request, env: Env): Promise<Response> {
  const intake = await authorizedIntake(request, env, id);
  if (!intake) return jsonResponse({ error: "unauthorized" }, 401);
  return jsonResponse({ id, state: intake.state, receivedAt: intake.received_at });
}

// ============================================================
// Email outbox
// ============================================================

function siteUrl(env: Env): string {
  return (env.SITE_URL || `https://${siteConfig.domain}`).replace(/\/+$/, "");
}

interface DeliveryRow {
  id: string;
  intake_id: string;
  kind: string;
  status: string;
  attempts: number;
}

/** Send pending/failed emails. Safe to call repeatedly: each (intake, kind) sends at most once. */
export async function processDeliveries(env: Env, intakeId?: string): Promise<{ sent: number; failed: number; skipped: number }> {
  const out = { sent: 0, failed: 0, skipped: 0 };
  const { results } = intakeId
    ? await env.CRM_DB.prepare(
        "SELECT id, intake_id, kind, status, attempts FROM hc_deliveries WHERE intake_id = ?1 AND status IN ('pending','failed') AND attempts < ?2"
      )
        .bind(intakeId, MAX_DELIVERY_ATTEMPTS)
        .all<DeliveryRow>()
    : await env.CRM_DB.prepare(
        "SELECT id, intake_id, kind, status, attempts FROM hc_deliveries WHERE status IN ('pending','failed') AND attempts < ?1 ORDER BY created_at LIMIT 20"
      )
        .bind(MAX_DELIVERY_ATTEMPTS)
        .all<DeliveryRow>();

  for (const delivery of results ?? []) {
    const intake = await env.CRM_DB.prepare("SELECT * FROM hc_intakes WHERE id = ?1").bind(delivery.intake_id).first<HcIntakeRow>();
    const email = intake ? buildHcEmail(delivery.kind, intake, siteUrl(env)) : null;
    if (!intake || !email) {
      await env.CRM_DB.prepare("UPDATE hc_deliveries SET status = 'skipped', last_error = 'nothing to send' WHERE id = ?1").bind(delivery.id).run();
      out.skipped++;
      continue;
    }
    // Email is optional: with no provider key the request still lands in the studio inbox
    if (!env.RESEND_API_KEY || !env.HC_FROM_EMAIL) {
      await env.CRM_DB.prepare("UPDATE hc_deliveries SET status = 'skipped', last_error = 'email not configured' WHERE id = ?1").bind(delivery.id).run();
      out.skipped++;
      continue;
    }
    const realTo = email.to === "buyer" ? intake.email : env.HC_NOTIFY_EMAIL || "";
    // Staging: every message goes to the sink, never to a buyer or to Brenda
    const to = env.HC_EMAIL_SINK || realTo;
    if (!to) {
      await env.CRM_DB.prepare("UPDATE hc_deliveries SET status = 'skipped', last_error = 'no recipient configured' WHERE id = ?1").bind(delivery.id).run();
      out.skipped++;
      continue;
    }

    // Claim the attempt first so two overlapping runs cannot both send
    const claim = await env.CRM_DB.prepare(
      "UPDATE hc_deliveries SET attempts = attempts + 1 WHERE id = ?1 AND attempts = ?2 AND status IN ('pending','failed')"
    )
      .bind(delivery.id, delivery.attempts)
      .run();
    if (!claim.meta.changes) continue;

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `hc-${delivery.id}`,
        },
        body: JSON.stringify({
          from: env.HC_FROM_EMAIL,
          to: [to],
          reply_to: env.HC_REPLY_TO || siteConfig.agent.email,
          subject: email.subject,
          html: email.html,
        }),
      });
      if (!res.ok) throw new Error(`provider ${res.status}`);
      const data = (await res.json().catch(() => ({}))) as { id?: string };
      await env.CRM_DB.prepare(
        "UPDATE hc_deliveries SET status = 'sent', provider_id = ?1, sent_at = ?2, last_error = NULL WHERE id = ?3"
      )
        .bind(data.id ?? null, new Date().toISOString(), delivery.id)
        .run();
      out.sent++;
    } catch (err) {
      // A failed email never changes the request itself; the cron retries it
      await env.CRM_DB.prepare("UPDATE hc_deliveries SET status = 'failed', last_error = ?1 WHERE id = ?2")
        .bind(String(err).slice(0, 200), delivery.id)
        .run();
      out.failed++;
    }
  }
  return out;
}

// ============================================================
// Cron: abandoned drafts, retention, email retries
// ============================================================

export async function runHomeClaritySweep(env: Env): Promise<{ expired: number; purged: number }> {
  const out = { expired: 0, purged: 0 };
  try {
    const now = new Date().toISOString();
    const draftCutoff = new Date(Date.now() - DRAFT_TTL_MINUTES * 60_000).toISOString();
    const drafts = await env.CRM_DB.prepare(
      "SELECT id FROM hc_intakes WHERE state = 'awaiting_upload' AND created_at < ?1 LIMIT 100"
    )
      .bind(draftCutoff)
      .all<{ id: string }>();
    for (const draft of drafts.results ?? []) {
      await env.MEDIA.delete(fileKey(draft.id));
      await env.CRM_DB.prepare("UPDATE hc_intakes SET state = 'expired', updated_at = ?1 WHERE id = ?2 AND state = 'awaiting_upload'")
        .bind(now, draft.id)
        .run();
      out.expired++;
    }

    const retentionCutoff = new Date(Date.now() - retentionDays(env) * 86_400_000).toISOString();
    const old = await env.CRM_DB.prepare(
      "SELECT id, file_key FROM hc_intakes WHERE state = 'received' AND file_key IS NOT NULL AND file_deleted_at IS NULL AND received_at < ?1 LIMIT 100"
    )
      .bind(retentionCutoff)
      .all<{ id: string; file_key: string }>();
    for (const row of old.results ?? []) {
      await env.MEDIA.delete(row.file_key);
      await env.CRM_DB.prepare("UPDATE hc_intakes SET file_deleted_at = ?1, updated_at = ?1 WHERE id = ?2").bind(now, row.id).run();
      out.purged++;
    }

    await processDeliveries(env);
  } catch (err) {
    logEvent("sweep_error", { error: String(err).slice(0, 160) });
  }
  return out;
}

// ============================================================
// Studio inbox (all handlers are wrapped in requireStudio by the router)
// ============================================================

function listItem(row: HcIntakeRow) {
  return {
    id: row.id,
    propertyAddress: row.property_address,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    preferredContact: row.preferred_contact,
    agentStatus: row.agent_status,
    reportStatus: row.report_status,
    contactStatus: row.contact_status,
    reviewedAt: row.reviewed_at,
    receivedAt: row.received_at,
    bucket: inboxBucket(row),
  };
}

export async function handleHcList(env: Env): Promise<Response> {
  const { results } = await env.CRM_DB.prepare(
    "SELECT * FROM hc_intakes WHERE state = 'received' ORDER BY received_at DESC LIMIT 300"
  ).all<HcIntakeRow>();
  const items = (results ?? []).map(listItem);
  const counts: Record<string, number> = { all: items.length, new: 0, in_progress: 0, ready: 0, contacted: 0, done: 0 };
  for (const item of items) counts[item.bucket]++;
  return jsonResponse({ items, counts, enabled: enabled(env), retentionDays: retentionDays(env) });
}

export async function handleHcGet(id: string, env: Env): Promise<Response> {
  const row = await env.CRM_DB.prepare("SELECT * FROM hc_intakes WHERE id = ?1 AND state = 'received'").bind(id).first<HcIntakeRow>();
  if (!row) return jsonResponse({ error: "not found" }, 404);
  const [notes, deliveries] = await Promise.all([
    env.CRM_DB.prepare("SELECT id, body, created_at FROM hc_notes WHERE intake_id = ?1 ORDER BY created_at DESC").bind(id).all(),
    env.CRM_DB.prepare("SELECT kind, status, attempts, last_error, sent_at FROM hc_deliveries WHERE intake_id = ?1").bind(id).all(),
  ]);
  return jsonResponse({
    intake: {
      ...listItem(row),
      questions: row.questions,
      consentVersion: row.consent_version,
      consentAt: row.consent_at,
      sourcePage: row.source_page,
      utm: row.utm ? JSON.parse(row.utm) : null,
      fileName: row.file_name,
      fileBytes: row.file_bytes,
      fileAvailable: !!row.file_key && !row.file_deleted_at,
      fileDeletedAt: row.file_deleted_at,
      reportUrl: row.report_url,
      crmContactId: row.crm_contact_id,
    },
    notes: notes.results ?? [],
    deliveries: deliveries.results ?? [],
  });
}

export async function handleHcPatch(id: string, request: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }
  const row = await env.CRM_DB.prepare("SELECT * FROM hc_intakes WHERE id = ?1 AND state = 'received'").bind(id).first<HcIntakeRow>();
  if (!row) return jsonResponse({ error: "not found" }, 404);

  const sets: string[] = [];
  const binds: unknown[] = [];
  const set = (column: string, value: unknown) => {
    binds.push(value);
    sets.push(`${column} = ?${binds.length}`);
  };

  if (body.reportStatus !== undefined) {
    if (!REPORT_STATUSES.includes(body.reportStatus as ReportStatus)) return jsonResponse({ error: "invalid reportStatus" }, 400);
    set("report_status", body.reportStatus);
  }
  if (body.contactStatus !== undefined) {
    if (!CONTACT_STATUSES.includes(body.contactStatus as ContactStatus)) return jsonResponse({ error: "invalid contactStatus" }, 400);
    set("contact_status", body.contactStatus);
  }
  if (body.reportUrl !== undefined) {
    const url = body.reportUrl === null || body.reportUrl === "" ? null : cleanReportUrl(body.reportUrl);
    if (body.reportUrl && !url) return jsonResponse({ error: "Enter a full link starting with https://" }, 400);
    set("report_url", url);
  }
  // Only this authenticated action can mark a report as personally reviewed
  if (body.reviewed !== undefined) set("reviewed_at", body.reviewed === true ? new Date().toISOString() : null);

  if (sets.length === 0) return jsonResponse({ error: "nothing to update" }, 400);
  set("updated_at", new Date().toISOString());
  binds.push(id);
  await env.CRM_DB.prepare(`UPDATE hc_intakes SET ${sets.join(", ")} WHERE id = ?${binds.length}`).bind(...binds).run();
  return handleHcGet(id, env);
}

export async function handleHcNoteCreate(id: string, request: Request, env: Env): Promise<Response> {
  let body: { body?: unknown };
  try {
    body = (await request.json()) as { body?: unknown };
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }
  const text = typeof body.body === "string" ? body.body.trim().slice(0, 4000) : "";
  if (!text) return jsonResponse({ error: "note is empty" }, 400);
  const row = await env.CRM_DB.prepare("SELECT id FROM hc_intakes WHERE id = ?1 AND state = 'received'").bind(id).first();
  if (!row) return jsonResponse({ error: "not found" }, 404);
  await env.CRM_DB.prepare("INSERT INTO hc_notes (id, intake_id, body, created_at) VALUES (?1, ?2, ?3, ?4)")
    .bind(crypto.randomUUID(), id, text, new Date().toISOString())
    .run();
  return handleHcGet(id, env);
}

export async function handleHcFileGet(id: string, env: Env): Promise<Response> {
  const row = await env.CRM_DB.prepare("SELECT file_key, file_name, file_deleted_at FROM hc_intakes WHERE id = ?1 AND state = 'received'")
    .bind(id)
    .first<{ file_key: string | null; file_name: string | null; file_deleted_at: string | null }>();
  if (!row || !row.file_key || row.file_deleted_at) return jsonResponse({ error: "not found" }, 404);
  const obj = await env.MEDIA.get(row.file_key);
  if (!obj) return jsonResponse({ error: "not found" }, 404);
  // ASCII-only fallback name; the stored name was already stripped of path characters
  const safeName = (row.file_name || "disclosure.pdf").replace(/[^A-Za-z0-9._ -]/g, "_");
  return new Response(obj.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Content-Length": String(obj.size),
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function handleHcFileDelete(id: string, env: Env): Promise<Response> {
  const row = await env.CRM_DB.prepare("SELECT file_key FROM hc_intakes WHERE id = ?1 AND state = 'received'")
    .bind(id)
    .first<{ file_key: string | null }>();
  if (!row) return jsonResponse({ error: "not found" }, 404);
  if (row.file_key) await env.MEDIA.delete(row.file_key);
  const now = new Date().toISOString();
  await env.CRM_DB.prepare("UPDATE hc_intakes SET file_deleted_at = COALESCE(file_deleted_at, ?1), updated_at = ?1 WHERE id = ?2").bind(now, id).run();
  return handleHcGet(id, env);
}

export async function handleHcResend(id: string, env: Env): Promise<Response> {
  // Re-open failed/skipped emails for one request (e.g. after email was configured)
  await env.CRM_DB.prepare(
    "UPDATE hc_deliveries SET status = 'pending', attempts = 0, last_error = NULL WHERE intake_id = ?1 AND status IN ('failed','skipped')"
  )
    .bind(id)
    .run();
  await processDeliveries(env, id);
  return handleHcGet(id, env);
}

/** Public: lets the form show itself as open or paused without guessing. */
export function handleHcConfig(env: Env): Response {
  return jsonResponse({ enabled: enabled(env), maxBytes: maxBytes(maxMb(env)), maxMb: maxMb(env) });
}
