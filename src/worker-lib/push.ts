import {
  buildPushPayload,
  type PushMessage,
  type PushSubscription as WebPushSubscription,
  type VapidKeys,
} from "@block65/webcrypto-web-push";
import { Env } from "./env";
import { jsonResponse } from "./http";
import { pacificNow } from "./time";
import { selectReminders, tomorrow } from "./reminders";

export { selectReminders, tomorrow };

const VAPID_SUBJECT = "https://brendavegarealty.com";

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  device_label: string;
  created_at: string;
  last_ok_at: string | null;
}

interface PushMsg {
  title: string;
  body: string;
  url: string;
  [key: string]: string;
}

function vapidKeys(env: Env): VapidKeys {
  return {
    subject: VAPID_SUBJECT,
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
  };
}

// ============================================================
// sendPushToAll — never throws
// ============================================================

export interface PushSendResult {
  attempted: number;
  delivered: number;
}

export async function sendPushToAll(env: Env, msg: PushMsg): Promise<PushSendResult> {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return { attempted: 0, delivered: 0 };

  let rows: PushSubscriptionRow[] = [];
  try {
    const { results } = await env.CRM_DB.prepare("SELECT * FROM push_subscriptions").all<PushSubscriptionRow>();
    rows = results ?? [];
  } catch (err) {
    console.error("sendPushToAll: failed to load subscriptions", err);
    return { attempted: 0, delivered: 0 };
  }

  const vapid = vapidKeys(env);
  const results = await Promise.all(rows.map((row) => sendPushToOne(env, row, msg, vapid)));
  const delivered = results.filter(Boolean).length;
  return { attempted: rows.length, delivered };
}

async function sendPushToOne(
  env: Env,
  row: PushSubscriptionRow,
  msg: PushMsg,
  vapid: VapidKeys
): Promise<boolean> {
  try {
    const subscription: WebPushSubscription = {
      endpoint: row.endpoint,
      expirationTime: null,
      keys: { p256dh: row.p256dh, auth: row.auth },
    };
    const message: PushMessage = { data: msg, options: { ttl: 60 } };
    const payload = await buildPushPayload(message, subscription, vapid);
    const res = await fetch(row.endpoint, payload);

    if (res.status === 404 || res.status === 410) {
      await env.CRM_DB.prepare("DELETE FROM push_subscriptions WHERE id = ?1").bind(row.id).run();
      return false;
    }
    if (res.ok) {
      await env.CRM_DB.prepare("UPDATE push_subscriptions SET last_ok_at = ?1 WHERE id = ?2")
        .bind(new Date().toISOString(), row.id)
        .run();
      return true;
    }
    console.error("sendPushToAll: push failed", { endpoint: row.endpoint, status: res.status });
    return false;
  } catch (err) {
    console.error("sendPushToAll: push error", { endpoint: row.endpoint, error: String(err) });
    return false;
  }
}

// ============================================================
// Route handlers
// ============================================================

export async function handlePushVapid(env: Env): Promise<Response> {
  return jsonResponse({ publicKey: env.VAPID_PUBLIC_KEY ?? null });
}

export async function handlePushSubscribe(request: Request, env: Env): Promise<Response> {
  let body: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
    deviceLabel?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }

  const endpoint = typeof body.endpoint === "string" ? body.endpoint.trim() : "";
  const p256dh = typeof body.keys?.p256dh === "string" ? body.keys.p256dh : "";
  const auth = typeof body.keys?.auth === "string" ? body.keys.auth : "";
  const deviceLabel = typeof body.deviceLabel === "string" ? body.deviceLabel.trim() : "";

  if (!endpoint || !p256dh || !auth) {
    return jsonResponse({ error: "endpoint and keys.p256dh/keys.auth are required" }, 400);
  }

  const now = new Date().toISOString();
  await env.CRM_DB.prepare(
    `INSERT INTO push_subscriptions (id, endpoint, p256dh, auth, device_label, created_at, last_ok_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL)
     ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, device_label = excluded.device_label`
  )
    .bind(crypto.randomUUID(), endpoint, p256dh, auth, deviceLabel, now)
    .run();

  return jsonResponse({ ok: true });
}

export async function handlePushUnsubscribe(request: Request, env: Env): Promise<Response> {
  let body: { endpoint?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }
  const endpoint = typeof body.endpoint === "string" ? body.endpoint.trim() : "";
  if (!endpoint) return jsonResponse({ error: "endpoint is required" }, 400);

  await env.CRM_DB.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?1").bind(endpoint).run();
  return jsonResponse({ ok: true });
}

export async function handlePushTest(env: Env): Promise<Response> {
  const { attempted, delivered } = await sendPushToAll(env, {
    title: "Brenda Vega Studio",
    body: "Push notifications are working.",
    url: "/studio",
  });
  return jsonResponse({ ok: true, attempted, delivered });
}

// ============================================================
// Reminder cron
// ============================================================

interface OpenTaskRow {
  id: string;
  title: string;
  due_at: string | null;
  notified_at: string | null;
  done_at: string | null;
}

interface UpcomingMilestoneRow {
  id: string;
  deal_id: string;
  title: string;
  date: string | null;
  status: string;
  reminded_day_before: string | null;
  reminded_day_of: string | null;
  deal_address: string | null;
}

export async function runReminderSweep(env: Env): Promise<void> {
  const now = pacificNow();

  let tasks: OpenTaskRow[] = [];
  let milestones: UpcomingMilestoneRow[] = [];
  try {
    const [taskRes, milestoneRes] = await Promise.all([
      env.CRM_DB.prepare(
        "SELECT id, title, due_at, notified_at, done_at FROM tasks WHERE due_at IS NOT NULL AND done_at IS NULL AND notified_at IS NULL"
      ).all<OpenTaskRow>(),
      env.CRM_DB.prepare(
        `SELECT milestones.id, milestones.deal_id, milestones.title, milestones.date, milestones.status,
                milestones.reminded_day_before, milestones.reminded_day_of, deals.property_address AS deal_address
         FROM milestones
         JOIN deals ON deals.id = milestones.deal_id
         WHERE milestones.status = 'upcoming' AND milestones.date IS NOT NULL`
      ).all<UpcomingMilestoneRow>(),
    ]);
    tasks = taskRes.results ?? [];
    milestones = milestoneRes.results ?? [];
  } catch (err) {
    console.error("runReminderSweep: failed to load candidates", err);
    return;
  }

  const { dueTaskIds, dayBefore, dayOf } = selectReminders(now, tasks, milestones);
  if (dueTaskIds.length === 0 && dayBefore.length === 0 && dayOf.length === 0) return;

  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const milestoneById = new Map(milestones.map((m) => [m.id, m]));
  const nowIso = new Date().toISOString();

  await Promise.all([
    ...dueTaskIds.map(async (id) => {
      const task = taskById.get(id);
      if (!task) return;
      try {
        const { delivered } = await sendPushToAll(env, {
          title: "Task due",
          body: task.title,
          url: "/studio/crm/tasks",
        });
        if (delivered < 1) return;
        await env.CRM_DB.prepare("UPDATE tasks SET notified_at = ?1 WHERE id = ?2").bind(nowIso, id).run();
      } catch (err) {
        console.error("runReminderSweep: task reminder failed", { id, error: String(err) });
      }
    }),
    ...dayBefore.map(async (id) => {
      const milestone = milestoneById.get(id);
      if (!milestone) return;
      try {
        const { delivered } = await sendPushToAll(env, {
          title: `Tomorrow: ${milestone.title}`,
          body: milestone.deal_address || "",
          url: `/studio/crm/deal?id=${milestone.deal_id}`,
        });
        if (delivered < 1) return;
        await env.CRM_DB.prepare("UPDATE milestones SET reminded_day_before = ?1 WHERE id = ?2")
          .bind(nowIso, id)
          .run();
      } catch (err) {
        console.error("runReminderSweep: milestone day-before reminder failed", { id, error: String(err) });
      }
    }),
    ...dayOf.map(async (id) => {
      const milestone = milestoneById.get(id);
      if (!milestone) return;
      try {
        const { delivered } = await sendPushToAll(env, {
          title: `Today: ${milestone.title}`,
          body: milestone.deal_address || "",
          url: `/studio/crm/deal?id=${milestone.deal_id}`,
        });
        if (delivered < 1) return;
        await env.CRM_DB.prepare("UPDATE milestones SET reminded_day_of = ?1 WHERE id = ?2")
          .bind(nowIso, id)
          .run();
      } catch (err) {
        console.error("runReminderSweep: milestone day-of reminder failed", { id, error: String(err) });
      }
    }),
  ]);
}
