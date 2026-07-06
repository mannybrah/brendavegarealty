import { Env } from "./env";
import { corsHeaders, jsonResponse } from "./http";
import { deleteMediaKeys } from "./media";
import { Announcement, FeedPost, validateFeedInput } from "../lib/feed";

export const FEED_KEY = "feed:posts";
const ANNOUNCEMENT_KEY = "announcement:main";

// Exported for reuse by listing.ts (publish cross-post) — same KV shape/key.
export async function readFeed(env: Env): Promise<FeedPost[]> {
  const raw = await env.STUDIO_KV.get(FEED_KEY, "json");
  return Array.isArray(raw) ? (raw as FeedPost[]) : [];
}

export async function handleHomeState(env: Env): Promise<Response> {
  const [feedPosts, announcementRaw] = await Promise.all([
    readFeed(env),
    env.STUDIO_KV.get(ANNOUNCEMENT_KEY, "json"),
  ]);
  const announcement =
    announcementRaw && typeof announcementRaw === "object" ? (announcementRaw as Announcement) : null;
  return new Response(JSON.stringify({ announcement, feedPosts }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60",
      ...corsHeaders(),
    },
  });
}

export async function handleFeedCreate(request: Request, env: Env): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }
  const v = validateFeedInput(body);
  if (!v.ok) return jsonResponse({ error: v.error }, 400);
  const post: FeedPost = {
    id: crypto.randomUUID(),
    ...v.value,
    createdAt: new Date().toISOString(),
  };
  const posts = await readFeed(env);
  posts.unshift(post);
  await env.STUDIO_KV.put(FEED_KEY, JSON.stringify(posts));
  return jsonResponse({ post });
}

export async function handleFeedPatch(id: string, request: Request, env: Env): Promise<Response> {
  let body: { caption?: string; type?: string };
  try {
    body = (await request.json()) as { caption?: string; type?: string };
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }
  const posts = await readFeed(env);
  const post = posts.find((p) => p.id === id);
  if (!post) return jsonResponse({ error: "not found" }, 404);
  const merged = validateFeedInput({
    type: body.type ?? post.type,
    caption: body.caption ?? post.caption,
    imageKeys: post.imageKeys,
    link: (body as { link?: string }).link ?? post.link,
  });
  if (!merged.ok) return jsonResponse({ error: merged.error }, 400);
  post.type = merged.value.type;
  post.caption = merged.value.caption;
  if (merged.value.link) post.link = merged.value.link;
  else if ((body as { link?: string }).link === "") delete post.link;
  await env.STUDIO_KV.put(FEED_KEY, JSON.stringify(posts));
  return jsonResponse({ post });
}

export async function handleFeedDelete(id: string, env: Env): Promise<Response> {
  const posts = await readFeed(env);
  const idx = posts.findIndex((p) => p.id === id);
  if (idx === -1) return jsonResponse({ error: "not found" }, 404);
  const [removed] = posts.splice(idx, 1);
  await env.STUDIO_KV.put(FEED_KEY, JSON.stringify(posts));
  await deleteMediaKeys(removed.imageKeys, env);
  return jsonResponse({ ok: true });
}

export async function handleAnnouncementPut(request: Request, env: Env): Promise<Response> {
  let body: { text?: string; link?: string; active?: boolean };
  try {
    body = (await request.json()) as { text?: string; link?: string; active?: boolean };
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 200) : "";
  const active = body.active === true && text.length > 0;
  const announcement: Announcement = {
    text,
    link: typeof body.link === "string" && body.link.trim() ? body.link.trim() : undefined,
    active,
    updatedAt: new Date().toISOString(),
  };
  await env.STUDIO_KV.put(ANNOUNCEMENT_KEY, JSON.stringify(announcement));
  return jsonResponse({ announcement });
}
