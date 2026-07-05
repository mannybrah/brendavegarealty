import { Env } from "./env";
import { jsonResponse } from "./http";
import { BlogDraft, BlogDraftPolished } from "../lib/blogStudio";
import {
  ARTICLE_SYSTEM,
  META_SYSTEM,
  META_OUTPUT_SCHEMA,
  buildArticlePrompt,
  buildMetaPrompt,
  parseArticleHtml,
  parseMetaResponse,
} from "../lib/blogPolish";

const DRAFT_PREFIX = "blogdraft:";
const PUBLISHED_KEY = "blog:published";

// Returns the response's text content, or an error Response ready to return.
async function callClaude(env: Env, body: Record<string, unknown>): Promise<string | Response> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text();
    console.log(JSON.stringify({ endpoint: "blog/polish", status: "error", api: res.status, detail: detail.slice(0, 300) }));
    return jsonResponse({ error: `AI request failed (${res.status}) — try again` }, 502);
  }
  const data = (await res.json()) as { content: Array<{ type: string; text?: string }>; stop_reason: string };
  if (data.stop_reason === "max_tokens") {
    return jsonResponse({ error: "The AI response was cut off — try again, or trim your notes a bit" }, 502);
  }
  return data.content.find((c) => c.type === "text")?.text ?? "";
}

async function getDraft(id: string, env: Env): Promise<BlogDraft | null> {
  const raw = await env.STUDIO_KV.get(DRAFT_PREFIX + id, "json");
  return raw && typeof raw === "object" ? (raw as BlogDraft) : null;
}

async function putDraft(draft: BlogDraft, env: Env): Promise<void> {
  await env.STUDIO_KV.put(DRAFT_PREFIX + draft.id, JSON.stringify(draft));
}

export async function handleBlogList(env: Env): Promise<Response> {
  const drafts: BlogDraft[] = [];
  let cursor: string | undefined = undefined;
  do {
    const page: KVNamespaceListResult<unknown, string> = await env.STUDIO_KV.list({
      prefix: DRAFT_PREFIX,
      cursor,
      limit: 1000,
    });
    cursor = page.list_complete ? undefined : page.cursor;
    await Promise.all(
      page.keys.map(async (k) => {
        const raw = await env.STUDIO_KV.get(k.name, "json");
        if (raw && typeof raw === "object") drafts.push(raw as BlogDraft);
      })
    );
  } while (cursor);
  drafts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return jsonResponse({ drafts });
}

export async function handleBlogCreate(request: Request, env: Env): Promise<Response> {
  let body: { title?: string; category?: string; rawNotes?: string; slug?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }
  const title = (body.title ?? "").trim();
  const slug = (body.slug ?? "").trim();
  if (!title || !slug || !/^[a-z0-9-]+$/.test(slug)) {
    return jsonResponse({ error: "title and valid slug required" }, 400);
  }
  const draft: BlogDraft = {
    id: crypto.randomUUID(),
    slug,
    title,
    category: (body.category ?? "Market Update").trim(),
    rawNotes: (body.rawNotes ?? "").trim(),
    status: "draft",
    createdAt: new Date().toISOString(),
  };
  await putDraft(draft, env);
  return jsonResponse({ draft });
}

export async function handleBlogGet(id: string, env: Env): Promise<Response> {
  const draft = await getDraft(id, env);
  if (!draft) return jsonResponse({ error: "not found" }, 404);
  return jsonResponse({ draft });
}

export async function handleBlogPatch(id: string, request: Request, env: Env): Promise<Response> {
  const draft = await getDraft(id, env);
  if (!draft) return jsonResponse({ error: "not found" }, 404);
  let body: Partial<BlogDraft> & { polished?: Partial<BlogDraftPolished> };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }
  if (typeof body.title === "string" && body.title.trim()) draft.title = body.title.trim();
  if (typeof body.category === "string" && body.category.trim()) draft.category = body.category.trim();
  if (typeof body.rawNotes === "string") draft.rawNotes = body.rawNotes;
  if (typeof body.heroImageKey === "string" && /^(feed|blog)\/[a-zA-Z0-9-]+\.(jpg|png|webp)$/.test(body.heroImageKey)) {
    draft.heroImageKey = body.heroImageKey;
  }
  if (typeof body.slug === "string" && /^[a-z0-9-]+$/.test(body.slug) && draft.status !== "published") {
    draft.slug = body.slug;
  }
  if (body.polished && draft.polished) {
    draft.polished = { ...draft.polished, ...body.polished };
  }
  await putDraft(draft, env);
  return jsonResponse({ draft });
}

export async function handleBlogDelete(id: string, env: Env): Promise<Response> {
  const draft = await getDraft(id, env);
  if (!draft) return jsonResponse({ error: "not found" }, 404);
  if (draft.status === "published") return jsonResponse({ error: "cannot delete a published post" }, 409);
  await env.STUDIO_KV.delete(DRAFT_PREFIX + id);
  return jsonResponse({ ok: true });
}

export async function handleBlogPolish(id: string, env: Env): Promise<Response> {
  const draft = await getDraft(id, env);
  if (!draft) return jsonResponse({ error: "not found" }, 404);
  if (!draft.rawNotes.trim()) return jsonResponse({ error: "add some notes first" }, 400);
  if (!env.ANTHROPIC_API_KEY || env.ANTHROPIC_API_KEY === "placeholder") {
    return jsonResponse({ error: "AI polish is not configured" }, 500);
  }
  // Step 1: the article as plain HTML (full length, no JSON escaping issues)
  const articleResult = await callClaude(env, {
    model: "claude-sonnet-5",
    max_tokens: 16000,
    system: ARTICLE_SYSTEM,
    messages: [{ role: "user", content: buildArticlePrompt(draft) }],
  });
  if (articleResult instanceof Response) return articleResult;
  let contentHtml: string;
  try {
    contentHtml = parseArticleHtml(articleResult);
  } catch (err) {
    console.log(JSON.stringify({ endpoint: "blog/polish", status: "error", step: "article", reason: String(err) }));
    return jsonResponse({ error: "AI returned an unusable draft — try again" }, 502);
  }
  // Step 2: metadata via structured outputs (guaranteed-valid JSON)
  const metaResult = await callClaude(env, {
    model: "claude-sonnet-5",
    max_tokens: 3000,
    thinking: { type: "disabled" },
    system: META_SYSTEM,
    output_config: { format: { type: "json_schema", schema: META_OUTPUT_SCHEMA } },
    messages: [{ role: "user", content: buildMetaPrompt(draft, contentHtml) }],
  });
  if (metaResult instanceof Response) return metaResult;
  try {
    draft.polished = { ...parseMetaResponse(metaResult), contentHtml };
  } catch (err) {
    console.log(JSON.stringify({ endpoint: "blog/polish", status: "error", step: "meta", reason: String(err) }));
    return jsonResponse({ error: "AI returned an unusable draft — try again" }, 502);
  }
  draft.status = draft.status === "published" ? "published" : "polished";
  await putDraft(draft, env);
  return jsonResponse({ draft });
}

async function dispatchDeploy(env: Env): Promise<boolean> {
  try {
    const r = await fetch(
      "https://api.github.com/repos/mannybrah/brendavegarealty/actions/workflows/daily-deploy.yml/dispatches",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.GITHUB_DISPATCH_TOKEN}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "bvr-studio-worker",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref: "main" }),
      }
    );
    return r.status === 204;
  } catch {
    return false;
  }
}

export async function handleBlogPublish(id: string, env: Env): Promise<Response> {
  const draft = await getDraft(id, env);
  if (!draft) return jsonResponse({ error: "not found" }, 404);
  if (!draft.polished) return jsonResponse({ error: "polish the draft before publishing" }, 400);
  draft.status = "published";
  draft.publishedAt =
    draft.publishedAt ??
    new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  await putDraft(draft, env);
  const publishedRaw = await env.STUDIO_KV.get(PUBLISHED_KEY, "json");
  const published: string[] = Array.isArray(publishedRaw) ? (publishedRaw as string[]) : [];
  if (!published.includes(id)) published.push(id);
  await env.STUDIO_KV.put(PUBLISHED_KEY, JSON.stringify(published));
  const dispatched = await dispatchDeploy(env);
  return jsonResponse({ draft, dispatched });
}
