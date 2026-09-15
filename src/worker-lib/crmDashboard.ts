import { Env } from "./env";
import { jsonResponse } from "./http";
import { pacificToday } from "./time";
import { buildContactQuery, emptyFilters } from "../lib/crm/filters";
import { SMART_LISTS } from "../lib/crm/smartLists";

export interface SmartListCount {
  id: string;
  name: string;
  description: string;
  count: number;
}

export async function smartListCounts(env: Env): Promise<SmartListCount[]> {
  const nowIso = new Date().toISOString();
  return Promise.all(
    SMART_LISTS.map(async (l) => {
      const f = emptyFilters();
      f.list = l.id;
      const { where, binds } = buildContactQuery(f, nowIso);
      const row = await env.CRM_DB.prepare(
        `SELECT COUNT(*) AS n FROM contacts c LEFT JOIN stages s ON s.id = c.stage ${where}`
      )
        .bind(...binds)
        .first<{ n: number }>();
      return { id: l.id, name: l.name, description: l.description, count: row?.n ?? 0 };
    })
  );
}

export async function handleSmartLists(env: Env): Promise<Response> {
  return jsonResponse({ lists: await smartListCounts(env) });
}

export async function handleDashboard(env: Env): Promise<Response> {
  const today = pacificToday();
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const [lists, newLeads, unactioned, tasksToday, tasksOverdue, dealsClosing, recent] = await Promise.all([
    smartListCounts(env),
    env.CRM_DB.prepare("SELECT COUNT(*) AS n FROM contacts WHERE stage = 'new'").first<{ n: number }>(),
    env.CRM_DB.prepare("SELECT COUNT(*) AS n FROM contacts WHERE stage = 'new' AND last_communication_at IS NULL").first<{
      n: number;
    }>(),
    env.CRM_DB.prepare("SELECT COUNT(*) AS n FROM tasks WHERE done_at IS NULL AND substr(due_at,1,10) = ?1")
      .bind(today)
      .first<{ n: number }>(),
    env.CRM_DB.prepare("SELECT COUNT(*) AS n FROM tasks WHERE done_at IS NULL AND substr(due_at,1,10) < ?1")
      .bind(today)
      .first<{ n: number }>(),
    env.CRM_DB.prepare(
      "SELECT COUNT(*) AS n FROM deals WHERE status IN ('active','pending') AND target_close_date IS NOT NULL AND target_close_date BETWEEN ?1 AND ?2"
    )
      .bind(today, in30)
      .first<{ n: number }>(),
    env.CRM_DB.prepare(
      `SELECT e.*, c.first_name AS contact_first, c.last_name AS contact_last
       FROM events e JOIN contacts c ON c.id = e.contact_id
       WHERE e.kind <> 'system' ORDER BY e.created_at DESC LIMIT 15`
    ).all(),
  ]);
  return jsonResponse({
    newLeads: newLeads?.n ?? 0,
    unactioned: unactioned?.n ?? 0,
    tasksToday: tasksToday?.n ?? 0,
    tasksOverdue: tasksOverdue?.n ?? 0,
    dealsClosing30: dealsClosing?.n ?? 0,
    smartLists: lists,
    recent: recent.results ?? [],
    today,
  });
}

// Kept for the studio home "Clients" card.
export async function handleCrmSummary(env: Env): Promise<Response> {
  const today = pacificToday();
  const [newLeadsRow, dueRow] = await Promise.all([
    env.CRM_DB.prepare("SELECT COUNT(*) AS n FROM contacts WHERE stage = 'new'").first<{ n: number }>(),
    env.CRM_DB.prepare("SELECT COUNT(*) AS n FROM tasks WHERE done_at IS NULL AND substr(due_at,1,10) <= ?1")
      .bind(today)
      .first<{ n: number }>(),
  ]);
  return jsonResponse({ newLeads: newLeadsRow?.n ?? 0, dueToday: dueRow?.n ?? 0 });
}
