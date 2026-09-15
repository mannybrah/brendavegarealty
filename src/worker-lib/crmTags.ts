import { Env } from "./env";
import { jsonResponse } from "./http";
import type { TagRow } from "../lib/crm/types";

function cleanNames(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names ?? []) {
    if (typeof raw !== "string") continue;
    const n = raw.trim().slice(0, 64);
    if (!n) continue;
    const key = n.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }
  return out;
}

function marks(n: number): string {
  return Array.from({ length: n }, () => "?").join(", ");
}

// Get-or-create by name (case-insensitive). Returns rows in the order of the
// cleaned input names.
export async function ensureTags(env: Env, names: string[]): Promise<TagRow[]> {
  const wanted = cleanNames(names);
  if (wanted.length === 0) return [];
  const found = new Map<string, TagRow>();
  for (let i = 0; i < wanted.length; i += 100) {
    const chunk = wanted.slice(i, i + 100);
    const { results } = await env.CRM_DB.prepare(
      `SELECT id, name FROM tags WHERE name COLLATE NOCASE IN (${marks(chunk.length)})`
    )
      .bind(...chunk)
      .all<TagRow>();
    for (const t of results ?? []) found.set(t.name.toLowerCase(), t);
  }
  const now = new Date().toISOString();
  const inserts = wanted.filter((n) => !found.has(n.toLowerCase())).map((n) => ({ id: crypto.randomUUID(), name: n }));
  if (inserts.length) {
    for (let i = 0; i < inserts.length; i += 100) {
      await env.CRM_DB.batch(
        inserts
          .slice(i, i + 100)
          .map((t) =>
            env.CRM_DB.prepare("INSERT OR IGNORE INTO tags (id, name, created_at) VALUES (?1, ?2, ?3)").bind(
              t.id,
              t.name,
              now
            )
          )
      );
      // Re-read so a row that lost an INSERT OR IGNORE race still resolves.
      const chunk = inserts.slice(i, i + 100);
      const { results } = await env.CRM_DB.prepare(
        `SELECT id, name FROM tags WHERE name COLLATE NOCASE IN (${marks(chunk.length)})`
      )
        .bind(...chunk.map((t) => t.name))
        .all<TagRow>();
      for (const t of results ?? []) found.set(t.name.toLowerCase(), t);
    }
  }
  return wanted.map((n) => found.get(n.toLowerCase())).filter((t): t is TagRow => Boolean(t));
}

// Replace-all for one contact. Returns the final tag rows.
export async function setContactTags(env: Env, contactId: string, names: string[]): Promise<TagRow[]> {
  const tags = await ensureTags(env, names);
  const now = new Date().toISOString();
  await env.CRM_DB.batch([
    env.CRM_DB.prepare("DELETE FROM contact_tags WHERE contact_id = ?1").bind(contactId),
    ...tags.map((t) =>
      env.CRM_DB.prepare(
        "INSERT OR IGNORE INTO contact_tags (contact_id, tag_id, created_at) VALUES (?1, ?2, ?3)"
      ).bind(contactId, t.id, now)
    ),
  ]);
  return tags;
}

// Statements that ADD tags to a contact (no delete) — for import merges.
export function addContactTagStatements(env: Env, contactId: string, tags: TagRow[], now: string): D1PreparedStatement[] {
  return tags.map((t) =>
    env.CRM_DB.prepare("INSERT OR IGNORE INTO contact_tags (contact_id, tag_id, created_at) VALUES (?1, ?2, ?3)").bind(
      contactId,
      t.id,
      now
    )
  );
}

export async function tagsForContacts(env: Env, ids: string[]): Promise<Map<string, TagRow[]>> {
  const map = new Map<string, TagRow[]>();
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    if (!chunk.length) continue;
    const { results } = await env.CRM_DB.prepare(
      `SELECT ct.contact_id, t.id, t.name FROM contact_tags ct JOIN tags t ON t.id = ct.tag_id
       WHERE ct.contact_id IN (${marks(chunk.length)}) ORDER BY t.name COLLATE NOCASE`
    )
      .bind(...chunk)
      .all<{ contact_id: string; id: string; name: string }>();
    for (const r of results ?? []) {
      const list = map.get(r.contact_id) ?? [];
      list.push({ id: r.id, name: r.name });
      map.set(r.contact_id, list);
    }
  }
  return map;
}

export async function handleTagList(env: Env): Promise<Response> {
  const { results } = await env.CRM_DB.prepare(
    `SELECT t.id, t.name, COUNT(ct.contact_id) AS count FROM tags t
     LEFT JOIN contact_tags ct ON ct.tag_id = t.id GROUP BY t.id ORDER BY t.name COLLATE NOCASE`
  ).all<{ id: string; name: string; count: number }>();
  return jsonResponse({ tags: results ?? [] });
}

export async function handleTagPatch(id: string, request: Request, env: Env): Promise<Response> {
  const existing = await env.CRM_DB.prepare("SELECT id, name FROM tags WHERE id = ?1").bind(id).first<TagRow>();
  if (!existing) return jsonResponse({ error: "not found" }, 404);
  let body: { name?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 64) : "";
  if (!name) return jsonResponse({ error: "name is required" }, 400);

  const other = await env.CRM_DB.prepare("SELECT id, name FROM tags WHERE name = ?1 COLLATE NOCASE AND id <> ?2")
    .bind(name, id)
    .first<TagRow>();
  if (other) {
    // Merge into the surviving tag: re-point links, drop dupes, delete this tag.
    const now = new Date().toISOString();
    await env.CRM_DB.batch([
      env.CRM_DB.prepare(
        "INSERT OR IGNORE INTO contact_tags (contact_id, tag_id, created_at) SELECT contact_id, ?1, ?2 FROM contact_tags WHERE tag_id = ?3"
      ).bind(other.id, now, id),
      env.CRM_DB.prepare("DELETE FROM contact_tags WHERE tag_id = ?1").bind(id),
      env.CRM_DB.prepare("DELETE FROM tags WHERE id = ?1").bind(id),
    ]);
    return jsonResponse({ tag: other, merged: true });
  }
  await env.CRM_DB.prepare("UPDATE tags SET name = ?1 WHERE id = ?2").bind(name, id).run();
  return jsonResponse({ tag: { id, name }, merged: false });
}

export async function handleTagDelete(id: string, env: Env): Promise<Response> {
  const existing = await env.CRM_DB.prepare("SELECT id FROM tags WHERE id = ?1").bind(id).first();
  if (!existing) return jsonResponse({ error: "not found" }, 404);
  await env.CRM_DB.batch([
    env.CRM_DB.prepare("DELETE FROM contact_tags WHERE tag_id = ?1").bind(id),
    env.CRM_DB.prepare("DELETE FROM tags WHERE id = ?1").bind(id),
  ]);
  return jsonResponse({ ok: true });
}
