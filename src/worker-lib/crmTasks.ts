import { Env } from "./env";
import { jsonResponse } from "./http";
import { pacificToday } from "./time";
import { TASK_TYPES } from "../lib/crm/types";
import type { TaskListRow, TaskRow } from "../lib/crm/types";

const BASE = `
  SELECT tasks.*,
    CASE WHEN contacts.id IS NOT NULL THEN TRIM(contacts.first_name || ' ' || contacts.last_name) ELSE NULL END AS contact_name,
    deals.property_address AS deal_address
  FROM tasks
  LEFT JOIN contacts ON contacts.id = tasks.contact_id
  LEFT JOIN deals ON deals.id = tasks.deal_id
`;

const VIEW_WHERE: Record<string, string> = {
  today: "tasks.done_at IS NULL AND substr(tasks.due_at,1,10) = ?1",
  overdue: "tasks.done_at IS NULL AND substr(tasks.due_at,1,10) < ?1",
  upcoming: "tasks.done_at IS NULL AND (tasks.due_at IS NULL OR substr(tasks.due_at,1,10) > ?1)",
  done: "tasks.done_at IS NOT NULL",
};
const VIEW_ORDER: Record<string, string> = {
  today: "ORDER BY tasks.due_at ASC, tasks.created_at ASC",
  overdue: "ORDER BY tasks.due_at ASC",
  upcoming: "ORDER BY (tasks.due_at IS NULL) ASC, tasks.due_at ASC, tasks.created_at DESC",
  done: "ORDER BY tasks.done_at DESC LIMIT 100",
};

function parseType(raw: unknown, fallback: string): string {
  return typeof raw === "string" && (TASK_TYPES as readonly string[]).includes(raw) ? raw : fallback;
}

function parseDue(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(v)) return v;
  return null;
}

export async function handleTaskList(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const viewRaw = url.searchParams.get("view") ?? "today";
  // Legacy "open" view (v1 clients) → today+overdue+upcoming = all open.
  const view = viewRaw in VIEW_WHERE ? viewRaw : viewRaw === "open" ? "open" : "today";
  const today = pacificToday();

  const listSql =
    view === "open"
      ? `${BASE} WHERE tasks.done_at IS NULL ORDER BY (tasks.due_at IS NULL) ASC, tasks.due_at ASC`
      : `${BASE} WHERE ${VIEW_WHERE[view]} ${VIEW_ORDER[view]}`;

  const [list, cToday, cOverdue, cUpcoming, cDone] = await Promise.all([
    env.CRM_DB.prepare(listSql).bind(today).all<TaskListRow>(),
    env.CRM_DB.prepare(`SELECT COUNT(*) AS n FROM tasks WHERE ${VIEW_WHERE.today}`).bind(today).first<{ n: number }>(),
    env.CRM_DB.prepare(`SELECT COUNT(*) AS n FROM tasks WHERE ${VIEW_WHERE.overdue}`).bind(today).first<{ n: number }>(),
    env.CRM_DB.prepare(`SELECT COUNT(*) AS n FROM tasks WHERE ${VIEW_WHERE.upcoming}`).bind(today).first<{ n: number }>(),
    // No bind: the done view's WHERE has no ?1 placeholder.
    env.CRM_DB.prepare("SELECT COUNT(*) AS n FROM tasks WHERE tasks.done_at IS NOT NULL").first<{ n: number }>(),
  ]);
  return jsonResponse({
    tasks: list.results ?? [],
    today,
    counts: {
      today: cToday?.n ?? 0,
      overdue: cOverdue?.n ?? 0,
      upcoming: cUpcoming?.n ?? 0,
      done: cDone?.n ?? 0,
    },
  });
}

export async function handleTaskCreate(request: Request, env: Env): Promise<Response> {
  let body: { title?: string; type?: string; dueAt?: string | null; contactId?: string | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return jsonResponse({ error: "title is required" }, 400);
  const type = parseType(body.type, "follow_up");
  const dueAt = parseDue(body.dueAt);
  const contactId = typeof body.contactId === "string" && body.contactId.trim() ? body.contactId.trim() : null;
  if (contactId) {
    const c = await env.CRM_DB.prepare("SELECT id FROM contacts WHERE id = ?1").bind(contactId).first();
    if (!c) return jsonResponse({ error: "contact not found" }, 404);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.CRM_DB.prepare(
    "INSERT INTO tasks (id, contact_id, deal_id, milestone_id, title, type, due_at, done_at, notified_at, created_at) VALUES (?1, ?2, NULL, NULL, ?3, ?4, ?5, NULL, NULL, ?6)"
  )
    .bind(id, contactId, title, type, dueAt, now)
    .run();
  const task = await env.CRM_DB.prepare("SELECT * FROM tasks WHERE id = ?1").bind(id).first<TaskRow>();
  return jsonResponse({ task }, 201);
}

export async function handleTaskPatch(id: string, request: Request, env: Env): Promise<Response> {
  const existing = await env.CRM_DB.prepare("SELECT * FROM tasks WHERE id = ?1").bind(id).first<TaskRow>();
  if (!existing) return jsonResponse({ error: "not found" }, 404);

  let body: { title?: string; type?: string; dueAt?: string | null; done?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }

  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : existing.title;
  const type = parseType(body.type, existing.type);
  // "" / null clears the due date on purpose; an unparseable string is a
  // client bug and must not silently wipe it.
  if (typeof body.dueAt === "string" && body.dueAt.trim() && parseDue(body.dueAt) === null) {
    return jsonResponse({ error: "invalid dueAt" }, 400);
  }
  const dueAt = body.dueAt !== undefined ? parseDue(body.dueAt) : existing.due_at;

  const now = new Date().toISOString();
  let doneAt = existing.done_at;
  const statements: D1PreparedStatement[] = [];

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
    env.CRM_DB.prepare("UPDATE tasks SET title=?1, type=?2, due_at=?3, done_at=?4 WHERE id=?5").bind(
      title,
      type,
      dueAt,
      doneAt,
      id
    )
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

export async function handleTasksMoveOverdueToToday(env: Env): Promise<Response> {
  const today = pacificToday();
  const res = await env.CRM_DB.prepare(
    "UPDATE tasks SET due_at = ?1 WHERE done_at IS NULL AND due_at IS NOT NULL AND substr(due_at,1,10) < ?1"
  )
    .bind(today)
    .run();
  return jsonResponse({ moved: res.meta?.changes ?? 0 });
}
