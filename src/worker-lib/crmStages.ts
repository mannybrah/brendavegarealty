import { Env } from "./env";
import { jsonResponse } from "./http";
import { isPaletteKey, isSystemStage, nextStageId } from "../lib/crm/stages";
import type { StageRow } from "../lib/crm/types";

export async function getStages(env: Env): Promise<StageRow[]> {
  const { results } = await env.CRM_DB.prepare("SELECT * FROM stages ORDER BY sort_order ASC").all<StageRow>();
  return results ?? [];
}

export function stageName(stages: StageRow[], id: string): string {
  return stages.find((s) => s.id === id)?.name ?? id;
}

export async function handleStageList(env: Env): Promise<Response> {
  return jsonResponse({ stages: await getStages(env) });
}

export async function handleStageCreate(request: Request, env: Env): Promise<Response> {
  let body: { name?: string; color?: string; description?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 40) : "";
  if (!name) return jsonResponse({ error: "name is required" }, 400);
  if (!isPaletteKey(body.color)) return jsonResponse({ error: "color must be a palette key" }, 400);
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 140) : "";

  const stages = await getStages(env);
  const id = nextStageId(
    stages.map((s) => s.id),
    name
  );
  const now = new Date().toISOString();
  const sortOrder = (stages[stages.length - 1]?.sort_order ?? -1) + 1;
  await env.CRM_DB.prepare(
    "INSERT INTO stages (id, name, description, color, sort_order, is_system, created_at) VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6)"
  )
    .bind(id, name, description, body.color, sortOrder, now)
    .run();
  const stage = await env.CRM_DB.prepare("SELECT * FROM stages WHERE id = ?1").bind(id).first<StageRow>();
  return jsonResponse({ stage }, 201);
}

export async function handleStagePatch(id: string, request: Request, env: Env): Promise<Response> {
  const existing = await env.CRM_DB.prepare("SELECT * FROM stages WHERE id = ?1").bind(id).first<StageRow>();
  if (!existing) return jsonResponse({ error: "not found" }, 404);
  let body: { name?: string; color?: string; description?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 40) : existing.name;
  if (body.color !== undefined && !isPaletteKey(body.color)) {
    return jsonResponse({ error: "color must be a palette key" }, 400);
  }
  const color = body.color ?? existing.color;
  const description =
    typeof body.description === "string" ? body.description.trim().slice(0, 140) : existing.description;
  await env.CRM_DB.prepare("UPDATE stages SET name=?1, color=?2, description=?3 WHERE id=?4")
    .bind(name, color, description, id)
    .run();
  const stage = await env.CRM_DB.prepare("SELECT * FROM stages WHERE id = ?1").bind(id).first<StageRow>();
  return jsonResponse({ stage });
}

export async function handleStageReorder(request: Request, env: Env): Promise<Response> {
  let body: { ids?: string[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }
  const stages = await getStages(env);
  const ids = Array.isArray(body.ids) ? body.ids.filter((v): v is string => typeof v === "string") : [];
  const current = new Set(stages.map((s) => s.id));
  if (ids.length !== current.size || ids.some((i) => !current.has(i)) || new Set(ids).size !== ids.length) {
    return jsonResponse({ error: "ids must be a permutation of all stage ids" }, 400);
  }
  await env.CRM_DB.batch(
    ids.map((sid, i) => env.CRM_DB.prepare("UPDATE stages SET sort_order = ?1 WHERE id = ?2").bind(i, sid))
  );
  return jsonResponse({ stages: await getStages(env) });
}

export async function handleStageDelete(id: string, request: Request, env: Env): Promise<Response> {
  if (isSystemStage(id)) return jsonResponse({ error: "system stages can't be deleted" }, 400);
  const stages = await getStages(env);
  const target = stages.find((s) => s.id === id);
  if (!target) return jsonResponse({ error: "not found" }, 404);
  const reassign = new URL(request.url).searchParams.get("reassign") ?? "";
  const dest = stages.find((s) => s.id === reassign);
  if (!dest || dest.id === id) return jsonResponse({ error: "reassign must be another existing stage id" }, 400);

  const { results } = await env.CRM_DB.prepare("SELECT id FROM contacts WHERE stage = ?1").bind(id).all<{ id: string }>();
  const moved = results ?? [];
  const now = new Date().toISOString();
  const statements = [
    env.CRM_DB.prepare("UPDATE contacts SET stage = ?1, updated_at = ?2 WHERE stage = ?3").bind(dest.id, now, id),
    ...moved.map((c) =>
      env.CRM_DB.prepare(
        "INSERT INTO events (id, contact_id, kind, body, meta, created_at) VALUES (?1, ?2, 'stage_change', ?3, NULL, ?4)"
      ).bind(crypto.randomUUID(), c.id, `${target.name} → ${dest.name} (stage removed)`, now)
    ),
    env.CRM_DB.prepare("DELETE FROM stages WHERE id = ?1").bind(id),
  ];
  for (let i = 0; i < statements.length; i += 100) await env.CRM_DB.batch(statements.slice(i, i + 100));
  return jsonResponse({ ok: true, moved: moved.length });
}
