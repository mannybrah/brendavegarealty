# Mobile Studio, Live Feed & Design Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Brenda post Instagram-style feed updates, an announcement bar, and AI-polished blog posts from her iPhone via a redesigned `/studio` PWA — plus a site-wide animation polish pass.

**Architecture:** Static Next.js export served by a Cloudflare Worker. New content lives in KV (`STUDIO_KV`) and R2 (`bvr-media`); feed + announcement render at runtime via `/api/public/home-state`; blog posts publish to KV, trigger the GitHub Actions deploy via `workflow_dispatch`, and get merged into the static build by a prebuild script. Spec: `docs/superpowers/specs/2026-07-05-mobile-studio-feed-design.md`.

**Tech Stack:** Next.js 16 App Router (`output: "export"`), TypeScript, Tailwind v4, Framer Motion 12, Cloudflare Workers + KV + R2, Claude API (`claude-sonnet-5`), Jest + ts-jest.

## Global Constraints

- Repo: `C:\Users\DaVinci\Desktop\brendavegarealty` (git `mannybrah/brendavegarealty`, branch `main`). Deploy with `wrangler deploy` — NEVER `wrangler pages deploy`.
- Static export: Next middleware/API routes DO NOT run in production. All server logic goes in `src/worker.ts` + `src/worker-lib/`.
- Dynamic routes need `generateStaticParams` at build time. Runtime-created records (feed posts, blog drafts) must use **query params** (`/studio/blog/edit?id=…`), never dynamic path segments.
- KV namespace `STUDIO_KV` id `a5d099e3d9be4694859a6dbf009dd095`. Existing video-workflow keys are **bare slugs** (no prefix). All NEW keys contain `:` (`feed:posts`, `announcement`, `blogdraft:<id>`, `blog:published`). Existing list handlers must skip keys containing `:`.
- Brand tokens (Tailwind classes already defined): navy `#0F1D35`, gold `#C8A55B`, teal `#2A7F6F`, cream `#F8F5EF`. Fonts: `font-display` (Cormorant), `font-body`, `font-ui`.
- Existing blog categories (reuse verbatim): `Buying`, `Selling`, `Market Update`, `Neighborhoods`.
- Claude model: `claude-sonnet-5` via `https://api.anthropic.com/v1/messages`, header `anthropic-version: 2023-06-01`.
- All new animations respect `prefers-reduced-motion` (framer-motion `useReducedMotion`).
- Studio auth: reuse existing `requireStudio` HMAC-cookie gate. No new auth systems.
- Commit after every task. Commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Secrets that need values from DaVinci (flag, don't guess): `ANTHROPIC_API_KEY`, `GITHUB_DISPATCH_TOKEN` (fine-grained PAT, Actions read+write on this repo only), and confirming the repo's `CLOUDFLARE_API_TOKEN` has **Workers KV Storage: Read** permission.

---

### Task 1: Test infrastructure + shared domain modules

**Files:**
- Create: `jest.config.js`
- Create: `src/lib/feed.ts`
- Create: `src/lib/blogStudio.ts`
- Test: `src/lib/__tests__/feed.test.ts`, `src/lib/__tests__/blogStudio.test.ts`
- Modify: `package.json` (add `"test": "jest"` script)

**Interfaces:**
- Consumes: nothing (first task).
- Produces:
  - `FEED_TYPES: readonly ["update","just-listed","just-sold","open-house"]`, `type FeedType`, `FEED_TYPE_LABELS: Record<FeedType,string>`
  - `interface FeedPost { id: string; type: FeedType; caption: string; imageKeys: string[]; createdAt: string }`
  - `interface Announcement { text: string; link?: string; active: boolean; updatedAt: string }`
  - `interface HomeState { announcement: Announcement | null; feedPosts: FeedPost[] }`
  - `validateFeedInput(body: unknown): { ok: true; value: { type: FeedType; caption: string; imageKeys: string[] } } | { ok: false; error: string }`
  - `relativeTime(iso: string, now?: Date): string`
  - `BLOG_CATEGORIES: readonly ["Buying","Selling","Market Update","Neighborhoods"]`
  - `interface BlogDraftPolished { title: string; excerpt: string; metaDescription: string; keywords: string[]; contentHtml: string; videoScript: string }`
  - `interface BlogDraft { id: string; slug: string; title: string; category: string; rawNotes: string; heroImageKey?: string; polished?: BlogDraftPolished; status: "draft"|"polished"|"published"; createdAt: string; publishedAt?: string }`
  - `slugify(title: string): string`
  - `readTimeFromHtml(html: string): string` (e.g. `"6 min read"`)

- [ ] **Step 1: Create jest config and test script**

`jest.config.js`:
```js
/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
};
```

In `package.json` scripts add: `"test": "jest"`.

- [ ] **Step 2: Write failing tests**

`src/lib/__tests__/feed.test.ts`:
```ts
import { validateFeedInput, relativeTime } from "@/lib/feed";

describe("validateFeedInput", () => {
  it("accepts a valid post", () => {
    const r = validateFeedInput({ type: "just-listed", caption: "New in Campbell!", imageKeys: ["feed/a.jpg"] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.type).toBe("just-listed");
  });
  it("rejects unknown type", () => {
    expect(validateFeedInput({ type: "party", caption: "x", imageKeys: [] }).ok).toBe(false);
  });
  it("rejects empty caption when no images", () => {
    expect(validateFeedInput({ type: "update", caption: "  ", imageKeys: [] }).ok).toBe(false);
  });
  it("allows empty caption when there is an image", () => {
    expect(validateFeedInput({ type: "update", caption: "", imageKeys: ["feed/a.jpg"] }).ok).toBe(true);
  });
  it("caps images at 4 and caption at 1000 chars", () => {
    expect(validateFeedInput({ type: "update", caption: "x", imageKeys: ["a","b","c","d","e"] }).ok).toBe(false);
    expect(validateFeedInput({ type: "update", caption: "x".repeat(1001), imageKeys: [] }).ok).toBe(false);
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-07-05T20:00:00Z");
  it("minutes/hours/days", () => {
    expect(relativeTime("2026-07-05T19:58:00Z", now)).toBe("2m ago");
    expect(relativeTime("2026-07-05T17:00:00Z", now)).toBe("3h ago");
    expect(relativeTime("2026-07-03T20:00:00Z", now)).toBe("2d ago");
  });
  it("falls back to short date after 7 days", () => {
    expect(relativeTime("2026-06-01T00:00:00Z", now)).toBe("Jun 1");
  });
});
```

`src/lib/__tests__/blogStudio.test.ts`:
```ts
import { slugify, readTimeFromHtml } from "@/lib/blogStudio";

describe("slugify", () => {
  it("lowercases, strips punctuation, hyphenates", () => {
    expect(slugify("Saratoga vs. Monte Sereno: A Buyer's Guide!")).toBe("saratoga-vs-monte-sereno-a-buyers-guide");
  });
  it("collapses whitespace and trims hyphens", () => {
    expect(slugify("  Hello   World  ")).toBe("hello-world");
  });
});

describe("readTimeFromHtml", () => {
  it("computes minutes at 200 wpm, min 1", () => {
    expect(readTimeFromHtml("<p>word</p>")).toBe("1 min read");
    const words = Array(450).fill("word").join(" ");
    expect(readTimeFromHtml(`<h2>t</h2><p>${words}</p>`)).toBe("3 min read");
  });
});
```

- [ ] **Step 3: Run tests, verify they fail**

Run: `npx jest`
Expected: FAIL — cannot find module `@/lib/feed` / `@/lib/blogStudio`.

- [ ] **Step 4: Implement `src/lib/feed.ts`**

```ts
export const FEED_TYPES = ["update", "just-listed", "just-sold", "open-house"] as const;
export type FeedType = (typeof FEED_TYPES)[number];

export const FEED_TYPE_LABELS: Record<FeedType, string> = {
  update: "Update",
  "just-listed": "Just Listed",
  "just-sold": "Just Sold",
  "open-house": "Open House",
};

export interface FeedPost {
  id: string;
  type: FeedType;
  caption: string;
  imageKeys: string[];
  createdAt: string; // ISO
}

export interface Announcement {
  text: string;
  link?: string;
  active: boolean;
  updatedAt: string; // ISO
}

export interface HomeState {
  announcement: Announcement | null;
  feedPosts: FeedPost[];
}

export function validateFeedInput(
  body: unknown
): { ok: true; value: { type: FeedType; caption: string; imageKeys: string[] } } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "bad body" };
  const b = body as Record<string, unknown>;
  if (typeof b.type !== "string" || !(FEED_TYPES as readonly string[]).includes(b.type)) {
    return { ok: false, error: "invalid type" };
  }
  const caption = typeof b.caption === "string" ? b.caption.trim() : "";
  if (caption.length > 1000) return { ok: false, error: "caption too long" };
  const imageKeys = Array.isArray(b.imageKeys) ? b.imageKeys.filter((k): k is string => typeof k === "string") : [];
  if (imageKeys.length > 4) return { ok: false, error: "max 4 images" };
  if (!caption && imageKeys.length === 0) return { ok: false, error: "caption or image required" };
  return { ok: true, value: { type: b.type as FeedType, caption, imageKeys } };
}

export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const sec = Math.max(0, (now.getTime() - then.getTime()) / 1000);
  if (sec < 3600) return `${Math.max(1, Math.floor(sec / 60))}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 7 * 86400) return `${Math.floor(sec / 86400)}d ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
```

- [ ] **Step 5: Implement `src/lib/blogStudio.ts`**

```ts
export const BLOG_CATEGORIES = ["Buying", "Selling", "Market Update", "Neighborhoods"] as const;

export interface BlogDraftPolished {
  title: string;
  excerpt: string;
  metaDescription: string;
  keywords: string[];
  contentHtml: string;
  videoScript: string;
}

export interface BlogDraft {
  id: string;
  slug: string;
  title: string;
  category: string;
  rawNotes: string;
  heroImageKey?: string;
  polished?: BlogDraftPolished;
  status: "draft" | "polished" | "published";
  createdAt: string;
  publishedAt?: string; // YYYY-MM-DD Pacific
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function readTimeFromHtml(html: string): string {
  const words = html.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
}
```

- [ ] **Step 6: Run tests, verify pass**

Run: `npx jest`
Expected: PASS (all suites).

- [ ] **Step 7: Commit**

```bash
git add jest.config.js package.json src/lib/feed.ts src/lib/blogStudio.ts src/lib/__tests__
git commit -m "feat: add jest setup and feed/blog domain modules"
```

---

### Task 2: Worker plumbing — shared http module, Env, R2 binding

**Files:**
- Create: `src/worker-lib/http.ts`, `src/worker-lib/env.ts`
- Modify: `src/worker.ts` (delete local `corsHeaders`/`jsonResponse`/`Env`, import instead)
- Modify: `wrangler.toml` (R2 binding)
- Create: `.dev.vars` (local only — must be gitignored)
- Modify: `.gitignore` (add `.dev.vars`)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `src/worker-lib/env.ts` → `export interface Env { FOLLOW_UP_BOSS_API_KEY: string; STUDIO_PASSWORD: string; ANTHROPIC_API_KEY: string; GITHUB_DISPATCH_TOKEN: string; STUDIO_KV: KVNamespace; MEDIA: R2Bucket; ASSETS: Fetcher }`
  - `src/worker-lib/http.ts` → `corsHeaders(): Record<string,string>`, `jsonResponse(data: object, status?: number, extraHeaders?: Record<string,string>): Response`

- [ ] **Step 1: Create `src/worker-lib/env.ts`**

```ts
export interface Env {
  FOLLOW_UP_BOSS_API_KEY: string;
  STUDIO_PASSWORD: string;
  ANTHROPIC_API_KEY: string;
  GITHUB_DISPATCH_TOKEN: string;
  STUDIO_KV: KVNamespace;
  MEDIA: R2Bucket;
  ASSETS: Fetcher;
}
```

- [ ] **Step 2: Create `src/worker-lib/http.ts`** — move the two functions verbatim from `src/worker.ts:66-85`:

```ts
export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
  };
}

export function jsonResponse(data: object, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...corsHeaders(),
      ...extraHeaders,
    },
  });
}
```

(Note the added `PUT` in Allow-Methods.)

- [ ] **Step 3: Update `src/worker.ts`** — delete the local `interface Env` (lines 1–6) and the `corsHeaders`/`jsonResponse` definitions (lines 66–85); add at top:

```ts
import { Env } from "./worker-lib/env";
import { corsHeaders, jsonResponse } from "./worker-lib/http";
```

- [ ] **Step 4: Add R2 binding to `wrangler.toml`** (append):

```toml
[[r2_buckets]]
binding = "MEDIA"
bucket_name = "bvr-media"
```

- [ ] **Step 5: Create the bucket + local dev vars**

Run: `npx wrangler r2 bucket create bvr-media`
Expected: `Created bucket 'bvr-media'` (if it errors as existing, that's fine).

Create `.dev.vars`:
```
STUDIO_PASSWORD=devpass
ANTHROPIC_API_KEY=placeholder
GITHUB_DISPATCH_TOKEN=placeholder
```

Append `.dev.vars` to `.gitignore`.

- [ ] **Step 6: Typecheck + verify worker still boots**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `mkdir -p out && echo ok > out/index.html && npx wrangler dev --port 8787` (background), then `curl -s http://localhost:8787/api/studio/auth` → expect `{"authed":false,"configured":true}`. Stop wrangler.

- [ ] **Step 7: Commit**

```bash
git add src/worker-lib src/worker.ts wrangler.toml .gitignore
git commit -m "refactor: extract worker http/env modules, add R2 media binding"
```

---

### Task 3: Worker — media upload + serving (R2)

**Files:**
- Create: `src/worker-lib/media.ts`
- Modify: `src/worker.ts` (routes)

**Interfaces:**
- Consumes: `Env`, `jsonResponse` from Task 2.
- Produces:
  - `handleMediaUpload(request: Request, env: Env): Promise<Response>` — POST multipart form, fields `file` (image) and `kind` (`"feed"` | `"blog"`); returns `{ key: string }`.
  - `handleMediaGet(key: string, env: Env): Promise<Response>` — serves R2 object with 1-year immutable cache.
  - Public URL convention consumed by ALL later UI tasks: **`/media/<key>`**.

- [ ] **Step 1: Implement `src/worker-lib/media.ts`**

```ts
import { Env } from "./env";
import { jsonResponse } from "./http";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function handleMediaUpload(request: Request, env: Env): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonResponse({ error: "expected multipart form" }, 400);
  }
  const file = form.get("file");
  if (!(file instanceof File)) return jsonResponse({ error: "missing file" }, 400);
  if (file.size > MAX_BYTES) return jsonResponse({ error: "file too large (max 10 MB)" }, 413);
  const ext = ALLOWED[file.type];
  if (!ext) return jsonResponse({ error: `unsupported type ${file.type}` }, 415);
  const kind = form.get("kind") === "blog" ? "blog" : "feed";
  const key = `${kind}/${crypto.randomUUID()}.${ext}`;
  await env.MEDIA.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });
  return jsonResponse({ key });
}

export async function handleMediaGet(key: string, env: Env): Promise<Response> {
  const obj = await env.MEDIA.get(key);
  if (!obj) return new Response("not found", { status: 404 });
  return new Response(obj.body, {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export async function deleteMediaKeys(keys: string[], env: Env): Promise<void> {
  await Promise.all(keys.map((k) => env.MEDIA.delete(k)));
}
```

- [ ] **Step 2: Route in `src/worker.ts`** — add imports and, in `fetch` before the `env.ASSETS.fetch` fallthrough:

```ts
import { handleMediaUpload, handleMediaGet } from "./worker-lib/media";
```
```ts
    // Media (R2)
    const mediaMatch = url.pathname.match(/^\/media\/((?:feed|blog)\/[a-zA-Z0-9-]+\.(?:jpg|png|webp))$/);
    if (mediaMatch && request.method === "GET") {
      return handleMediaGet(mediaMatch[1], env);
    }
    if (url.pathname === "/api/studio/upload" && request.method === "POST") {
      return requireStudio(request, env, () => handleMediaUpload(request, env));
    }
```

- [ ] **Step 3: Verify with wrangler dev**

Run `npx wrangler dev --port 8787` (background), then:
```bash
curl -s -c /tmp/c.txt -X POST http://localhost:8787/api/studio/auth -H "Content-Type: application/json" -d '{"password":"devpass"}'
# any small jpg works; create one or reuse a repo image:
curl -s -b /tmp/c.txt -F "file=@public/images/brenda-headshot.jpg;type=image/jpeg" -F "kind=feed" http://localhost:8787/api/studio/upload
```
Expected: `{"key":"feed/<uuid>.jpg"}`. Then `curl -s -o /tmp/x.jpg -w "%{http_code} %{content_type}" http://localhost:8787/media/<that-key>` → `200 image/jpeg`. Unauthenticated upload (no cookie) → 401. Stop wrangler.

- [ ] **Step 4: Typecheck + commit**

Run: `npx tsc --noEmit` → clean.
```bash
git add src/worker-lib/media.ts src/worker.ts
git commit -m "feat: R2 media upload and serving endpoints"
```

---

### Task 4: Worker — feed CRUD, announcement, home-state + legacy key filtering

**Files:**
- Create: `src/worker-lib/feed.ts`
- Modify: `src/worker.ts` (routes + `:`-key filtering in `handleStudioStateList` and `handlePublicBlogState`)

**Interfaces:**
- Consumes: `FeedPost`, `Announcement`, `validateFeedInput` from `@/lib/feed` (import as `../lib/feed`); `deleteMediaKeys` from Task 3.
- Produces (routes consumed by UI tasks 8–11):
  - `GET /api/public/home-state` → `{ announcement: Announcement|null, feedPosts: FeedPost[] }`, `Cache-Control: public, max-age=60`
  - `POST /api/studio/feed` body `{type, caption, imageKeys}` → `{ post: FeedPost }`
  - `PATCH /api/studio/feed/<id>` body `{caption?, type?}` → `{ post: FeedPost }`
  - `DELETE /api/studio/feed/<id>` → `{ ok: true }` (deletes the post's R2 images)
  - `PUT /api/studio/announcement` body `{text, link?, active}` → `{ announcement: Announcement }`
  - KV keys: `feed:posts` (JSON `FeedPost[]`, newest first), `announcement` (JSON `Announcement`)

- [ ] **Step 1: Implement `src/worker-lib/feed.ts`**

```ts
import { Env } from "./env";
import { corsHeaders, jsonResponse } from "./http";
import { deleteMediaKeys } from "./media";
import { Announcement, FeedPost, validateFeedInput } from "../lib/feed";

const FEED_KEY = "feed:posts";
const ANNOUNCEMENT_KEY = "announcement";

async function readFeed(env: Env): Promise<FeedPost[]> {
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
  });
  if (!merged.ok) return jsonResponse({ error: merged.error }, 400);
  post.type = merged.value.type;
  post.caption = merged.value.caption;
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
```

- [ ] **Step 2: Route in `src/worker.ts`**

```ts
import {
  handleHomeState,
  handleFeedCreate,
  handleFeedPatch,
  handleFeedDelete,
  handleAnnouncementPut,
} from "./worker-lib/feed";
```
Add before ASSETS fallthrough:
```ts
    if (url.pathname === "/api/public/home-state" && request.method === "GET") {
      return handleHomeState(env);
    }
    if (url.pathname === "/api/studio/feed" && request.method === "POST") {
      return requireStudio(request, env, () => handleFeedCreate(request, env));
    }
    const feedMatch = url.pathname.match(/^\/api\/studio\/feed\/([a-f0-9-]+)$/);
    if (feedMatch && request.method === "PATCH") {
      return requireStudio(request, env, () => handleFeedPatch(feedMatch[1], request, env));
    }
    if (feedMatch && request.method === "DELETE") {
      return requireStudio(request, env, () => handleFeedDelete(feedMatch[1], env));
    }
    if (url.pathname === "/api/studio/announcement" && request.method === "PUT") {
      return requireStudio(request, env, () => handleAnnouncementPut(request, env));
    }
```

- [ ] **Step 3: Filter new namespaced keys out of the legacy listing handlers.** In BOTH `handleStudioStateList` and `handlePublicBlogState` in `src/worker.ts`, inside the `page.keys.map` callback, add as the first line:

```ts
        if (k.name.includes(":")) return;
```

(Existing video-workflow keys are bare slugs; every new key contains `:`. Without this, feed/blog KV records would appear as garbage rows in the video calendar.)

- [ ] **Step 4: Verify with wrangler dev**

With wrangler dev running and the auth cookie from Task 3:
```bash
curl -s -b /tmp/c.txt -X POST http://localhost:8787/api/studio/feed -H "Content-Type: application/json" -d '{"type":"just-listed","caption":"Stunning 3BR in Campbell","imageKeys":[]}'
curl -s http://localhost:8787/api/public/home-state
curl -s -b /tmp/c.txt -X PUT http://localhost:8787/api/studio/announcement -H "Content-Type: application/json" -d '{"text":"Open house Sat 1-4pm","active":true}'
curl -s http://localhost:8787/api/public/home-state
curl -s -b /tmp/c.txt -X GET http://localhost:8787/api/studio/state
```
Expected: post created with uuid; home-state shows post then announcement; `/api/studio/state` does NOT contain `feed:posts` or `announcement` keys. DELETE the test post and confirm `{ok:true}`.

- [ ] **Step 5: Typecheck, test, commit**

Run: `npx tsc --noEmit && npx jest` → clean/pass.
```bash
git add src/worker-lib/feed.ts src/worker.ts
git commit -m "feat: feed, announcement, and home-state worker endpoints"
```

---

### Task 5: Blog polish module (prompt + response parsing)

**Files:**
- Create: `src/lib/blogPolish.ts`
- Test: `src/lib/__tests__/blogPolish.test.ts`

**Interfaces:**
- Consumes: `BlogDraft`, `BlogDraftPolished` from `@/lib/blogStudio`.
- Produces:
  - `POLISH_SYSTEM: string`
  - `buildPolishPrompt(draft: Pick<BlogDraft,"title"|"category"|"rawNotes">): string`
  - `parsePolishResponse(text: string): BlogDraftPolished` (throws `Error` on malformed output)

- [ ] **Step 1: Write failing test** — `src/lib/__tests__/blogPolish.test.ts`:

```ts
import { buildPolishPrompt, parsePolishResponse } from "@/lib/blogPolish";

const valid = {
  title: "T", excerpt: "E", metaDescription: "M", keywords: ["a"],
  contentHtml: "<h2>x</h2><p>y</p>", videoScript: "V",
};

describe("parsePolishResponse", () => {
  it("parses plain JSON", () => {
    expect(parsePolishResponse(JSON.stringify(valid)).title).toBe("T");
  });
  it("strips markdown code fences", () => {
    expect(parsePolishResponse("```json\n" + JSON.stringify(valid) + "\n```").excerpt).toBe("E");
  });
  it("throws on missing fields", () => {
    expect(() => parsePolishResponse(JSON.stringify({ title: "T" }))).toThrow();
  });
  it("throws on non-JSON", () => {
    expect(() => parsePolishResponse("sorry, I can't")).toThrow();
  });
});

describe("buildPolishPrompt", () => {
  it("includes title, category, and notes", () => {
    const p = buildPolishPrompt({ title: "My Post", category: "Buying", rawNotes: "note text" });
    expect(p).toContain("My Post");
    expect(p).toContain("Buying");
    expect(p).toContain("note text");
  });
});
```

- [ ] **Step 2: Run, verify fail** — `npx jest blogPolish` → FAIL (module not found).

- [ ] **Step 3: Implement `src/lib/blogPolish.ts`**

```ts
import { BlogDraftPolished } from "./blogStudio";

export const POLISH_SYSTEM = `You are the ghostwriter for Brenda Vega, a Century 21 real estate agent based in Campbell, California, serving the South Bay (Campbell, San Jose, Los Gatos, Saratoga, Cupertino, Santa Clara) and Northern California.

Voice and structure rules, learned from her existing blog:
- First person, warm but expert. She often introduces herself early: "I'm Brenda Vega, your South Bay Realtor with Century 21."
- Specific and concrete: real street names, neighborhoods, school districts, and realistic dollar figures for the South Bay market.
- Use <h2> section headings (never <h1>), <p> paragraphs, <ul><li> lists, and <strong> for key numbers and takeaways. No inline styles, no images, no scripts.
- 900-1300 words.
- Always end with a personal call-to-action paragraph inviting the reader to reach out via brendavegarealty.com.
- The videoScript is a 30-60 second YouTube Short script with [HOOK - first 3 seconds], [BODY], and [CTA] sections, matching her existing scripts.

Respond with ONLY a JSON object (no prose, no markdown fences) with exactly these keys:
{"title": string, "excerpt": string (1-2 sentences), "metaDescription": string (max 155 chars), "keywords": string[] (5-8 SEO phrases), "contentHtml": string, "videoScript": string}`;

export function buildPolishPrompt(draft: { title: string; category: string; rawNotes: string }): string {
  return `Write a blog post for Brenda's website.

Working title: ${draft.title}
Category: ${draft.category}
Today's context: this will publish on her blog at brendavegarealty.com.

Brenda's rough notes (expand these into the full post; keep every specific fact she mentions, invent nothing that contradicts them):
---
${draft.rawNotes}
---

Return the JSON object now.`;
}

export function parsePolishResponse(text: string): BlogDraftPolished {
  let raw = text.trim();
  const fence = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) raw = fence[1];
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no JSON object in response");
  const obj = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  for (const key of ["title", "excerpt", "metaDescription", "contentHtml", "videoScript"]) {
    if (typeof obj[key] !== "string" || !(obj[key] as string).trim()) {
      throw new Error(`missing field: ${key}`);
    }
  }
  if (!Array.isArray(obj.keywords) || obj.keywords.some((k) => typeof k !== "string")) {
    throw new Error("missing field: keywords");
  }
  return {
    title: obj.title as string,
    excerpt: obj.excerpt as string,
    metaDescription: (obj.metaDescription as string).slice(0, 160),
    keywords: obj.keywords as string[],
    contentHtml: obj.contentHtml as string,
    videoScript: obj.videoScript as string,
  };
}
```

- [ ] **Step 4: Run, verify pass** — `npx jest blogPolish` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/blogPolish.ts src/lib/__tests__/blogPolish.test.ts
git commit -m "feat: blog polish prompt builder and response parser"
```

---

### Task 6: Worker — blog draft CRUD, Claude polish, publish + GitHub dispatch

**Files:**
- Create: `src/worker-lib/blog.ts`
- Modify: `src/worker.ts` (routes)

**Interfaces:**
- Consumes: `BlogDraft` from `@/lib/blogStudio`; `POLISH_SYSTEM`, `buildPolishPrompt`, `parsePolishResponse` from `@/lib/blogPolish`; `jsonResponse`; `Env`.
- Produces (routes consumed by Task 12 UI and Task 7 build script):
  - `GET /api/studio/blog` → `{ drafts: BlogDraft[] }` (sorted `createdAt` desc)
  - `POST /api/studio/blog` body `{title, category, rawNotes, slug}` → `{ draft: BlogDraft }`
  - `GET /api/studio/blog/<id>` → `{ draft: BlogDraft }`
  - `PATCH /api/studio/blog/<id>` body: any of `{title, category, rawNotes, slug, heroImageKey, polished: Partial<BlogDraftPolished>}` → `{ draft }`
  - `DELETE /api/studio/blog/<id>` → `{ ok: true }` (drafts only; 409 if published)
  - `POST /api/studio/blog/<id>/polish` → `{ draft }` (with `polished` filled, `status: "polished"`)
  - `POST /api/studio/blog/<id>/publish` → `{ draft, dispatched: boolean }`
  - KV: `blogdraft:<id>` (JSON `BlogDraft`), `blog:published` (JSON `string[]` of ids)

- [ ] **Step 1: Implement `src/worker-lib/blog.ts`**

```ts
import { Env } from "./env";
import { jsonResponse } from "./http";
import { BlogDraft, BlogDraftPolished } from "../lib/blogStudio";
import { POLISH_SYSTEM, buildPolishPrompt, parsePolishResponse } from "../lib/blogPolish";

const DRAFT_PREFIX = "blogdraft:";
const PUBLISHED_KEY = "blog:published";

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
  if (typeof body.heroImageKey === "string") draft.heroImageKey = body.heroImageKey;
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
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 8192,
      system: POLISH_SYSTEM,
      messages: [{ role: "user", content: buildPolishPrompt(draft) }],
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    console.log(JSON.stringify({ endpoint: "blog/polish", status: "error", api: res.status, detail: detail.slice(0, 300) }));
    return jsonResponse({ error: `AI request failed (${res.status}) — try again` }, 502);
  }
  const data = (await res.json()) as { content: Array<{ type: string; text?: string }> };
  const text = data.content.find((c) => c.type === "text")?.text ?? "";
  try {
    draft.polished = parsePolishResponse(text);
  } catch (err) {
    console.log(JSON.stringify({ endpoint: "blog/polish", status: "error", reason: String(err) }));
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
```

- [ ] **Step 2: Route in `src/worker.ts`**

```ts
import {
  handleBlogList,
  handleBlogCreate,
  handleBlogGet,
  handleBlogPatch,
  handleBlogDelete,
  handleBlogPolish,
  handleBlogPublish,
} from "./worker-lib/blog";
```
```ts
    if (url.pathname === "/api/studio/blog" && request.method === "GET") {
      return requireStudio(request, env, () => handleBlogList(env));
    }
    if (url.pathname === "/api/studio/blog" && request.method === "POST") {
      return requireStudio(request, env, () => handleBlogCreate(request, env));
    }
    const blogActionMatch = url.pathname.match(/^\/api\/studio\/blog\/([a-f0-9-]+)\/(polish|publish)$/);
    if (blogActionMatch && request.method === "POST") {
      return requireStudio(request, env, () =>
        blogActionMatch[2] === "polish"
          ? handleBlogPolish(blogActionMatch[1], env)
          : handleBlogPublish(blogActionMatch[1], env)
      );
    }
    const blogMatch = url.pathname.match(/^\/api\/studio\/blog\/([a-f0-9-]+)$/);
    if (blogMatch && request.method === "GET") {
      return requireStudio(request, env, () => handleBlogGet(blogMatch[1], env));
    }
    if (blogMatch && request.method === "PATCH") {
      return requireStudio(request, env, () => handleBlogPatch(blogMatch[1], request, env));
    }
    if (blogMatch && request.method === "DELETE") {
      return requireStudio(request, env, () => handleBlogDelete(blogMatch[1], env));
    }
```

- [ ] **Step 3: Verify CRUD with wrangler dev** (polish/publish return configured-error/false-dispatch with placeholder secrets — that's expected):

```bash
curl -s -b /tmp/c.txt -X POST http://localhost:8787/api/studio/blog -H "Content-Type: application/json" -d '{"title":"Test Post","category":"Buying","rawNotes":"some notes","slug":"test-post"}'
curl -s -b /tmp/c.txt http://localhost:8787/api/studio/blog
curl -s -b /tmp/c.txt -X POST http://localhost:8787/api/studio/blog/<id>/polish
```
Expected: create/list work; polish returns `{"error":"AI polish is not configured"}` (500) with placeholder key. DELETE the test draft.

- [ ] **Step 4: Set real secrets (NEEDS USER INPUT — pause and ask DaVinci)**

```bash
npx wrangler secret put ANTHROPIC_API_KEY     # DaVinci provides value
npx wrangler secret put GITHUB_DISPATCH_TOKEN # fine-grained PAT: repo mannybrah/brendavegarealty, Actions: Read and write
```
Optionally place real values in `.dev.vars` for a live local polish test.

- [ ] **Step 5: Typecheck, test, commit**

Run: `npx tsc --noEmit && npx jest` → clean/pass.
```bash
git add src/worker-lib/blog.ts src/worker.ts
git commit -m "feat: blog draft CRUD, Claude polish, publish with deploy dispatch"
```

---

### Task 7: Build integration — merge KV posts into the static build

**Files:**
- Create: `scripts/fetch-kv-posts.mjs`
- Create: `src/data/kv-posts.json` (initial content: `[]`)
- Modify: `src/data/blog-posts.ts` (merge)
- Modify: `package.json` (`prebuild` script)
- Modify: `.github/workflows/daily-deploy.yml` (env on build step)

**Interfaces:**
- Consumes: KV keys `blog:published` + `blogdraft:<id>` (Task 6 shapes); `BlogPost` interface in `src/data/blog-posts.ts`.
- Produces: `src/data/kv-posts.json` — array of `BlogPost`-shaped objects; `blogPosts` export now includes them, which automatically flows into the blog index, `[slug]` static pages, and the studio video calendar (`generateStaticParams` runs over the merged array).

- [ ] **Step 1: Create `scripts/fetch-kv-posts.mjs`**

```js
// Fetches published studio-authored blog posts from Cloudflare KV and writes
// src/data/kv-posts.json for the static build. Runs via package.json "prebuild".
// No creds (local dev) -> keeps the existing file. Creds present but API fails
// -> exits nonzero so CI fails instead of silently unpublishing posts.
import { writeFile } from "node:fs/promises";

const NS = "a5d099e3d9be4694859a6dbf009dd095";
const OUT = "src/data/kv-posts.json";
const token = process.env.KV_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
const account = process.env.CLOUDFLARE_ACCOUNT_ID;

if (!token || !account) {
  console.log("fetch-kv-posts: no Cloudflare creds; keeping existing kv-posts.json");
  process.exit(0);
}

async function kvGet(key) {
  const r = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/storage/kv/namespaces/${NS}/values/${encodeURIComponent(key)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`KV read ${key} failed: ${r.status} ${await r.text()}`);
  return r.json();
}

const publishedIds = (await kvGet("blog:published")) ?? [];
const posts = [];
for (const id of publishedIds) {
  const d = await kvGet(`blogdraft:${id}`);
  if (!d || d.status !== "published" || !d.polished || !d.publishedAt) continue;
  const p = d.polished;
  let content = p.contentHtml;
  if (d.heroImageKey) {
    const alt = p.title.replace(/"/g, "&quot;");
    content = `<p><img src="/media/${d.heroImageKey}" alt="${alt}" style="width:100%;border-radius:12px;" /></p>` + content;
  }
  const words = p.contentHtml.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  posts.push({
    slug: d.slug,
    title: p.title,
    excerpt: p.excerpt,
    category: d.category,
    date: d.publishedAt,
    readTime: `${Math.max(1, Math.ceil(words / 200))} min read`,
    metaDescription: p.metaDescription,
    keywords: p.keywords,
    content,
    videoScript: p.videoScript,
    youtubeEmbed: "",
  });
}
posts.sort((a, b) => b.date.localeCompare(a.date));
await writeFile(OUT, JSON.stringify(posts, null, 2) + "\n");
console.log(`fetch-kv-posts: wrote ${posts.length} post(s) to ${OUT}`);
```

- [ ] **Step 2: Create `src/data/kv-posts.json`** containing exactly:

```json
[]
```

- [ ] **Step 3: Merge in `src/data/blog-posts.ts`.** Add below the `BlogPost` interface:

```ts
import kvPostsData from "./kv-posts.json";
```
Change the array declaration `export const blogPosts: BlogPost[] = [` to `const authoredPosts: BlogPost[] = [`, and at the very end of the file (after the closing `];`) add:

```ts
const kvPosts = kvPostsData as BlogPost[];
const kvSlugs = new Set(kvPosts.map((p) => p.slug));
export const blogPosts: BlogPost[] = [
  ...kvPosts,
  ...authoredPosts.filter((p) => !kvSlugs.has(p.slug)),
];
```

Verify `tsconfig.json` has `"resolveJsonModule": true` (Next default) — add it under `compilerOptions` if missing.

- [ ] **Step 4: Wire prebuild + CI env.** In `package.json` scripts add:

```json
"prebuild": "node scripts/fetch-kv-posts.mjs",
```

In `.github/workflows/daily-deploy.yml`, change the build step to:

```yaml
      - name: Build Next.js static export
        run: npm run build
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

- [ ] **Step 5: Verify the token can read KV (NEEDS USER CHECK).** Run locally with the repo token (from GH secrets — DaVinci has it, or test via a manual workflow run):

```bash
CLOUDFLARE_API_TOKEN=<token> CLOUDFLARE_ACCOUNT_ID=e969636396415e5c326fac6e7ee83232 node scripts/fetch-kv-posts.mjs
```
Expected: `fetch-kv-posts: wrote 0 post(s)`. If 403: the token lacks **Workers KV Storage: Read** — create a new token with that permission and update the `CLOUDFLARE_API_TOKEN` repo secret (or add a `KV_API_TOKEN` secret and pass it in the workflow env).

- [ ] **Step 6: Full build + commit**

Run: `npm run build`
Expected: prebuild logs the kv-posts line, build succeeds, blog pages unchanged.

```bash
git add scripts/fetch-kv-posts.mjs src/data/kv-posts.json src/data/blog-posts.ts package.json .github/workflows/daily-deploy.yml
git commit -m "feat: merge KV-published blog posts into static build"
```

---

### Task 8: Public site — FeedSection, /updates, AnnouncementBar; remove stale event

**Files:**
- Create: `src/lib/useHomeState.ts`
- Create: `src/components/home/FeedSection.tsx`
- Create: `src/components/layout/AnnouncementBar.tsx`
- Create: `src/app/updates/page.tsx`
- Modify: `src/app/page.tsx` (swap `UpcomingEvent` → `FeedSection`)
- Modify: `src/components/layout/Navbar.tsx` (render `AnnouncementBar` inside the fixed `<header>`, above `<nav>`)
- Delete: `src/components/home/UpcomingEvent.tsx`

**Interfaces:**
- Consumes: `GET /api/public/home-state` (Task 4), `/media/<key>` (Task 3), `FeedPost`/`Announcement`/`FEED_TYPE_LABELS`/`relativeTime` from `@/lib/feed`.
- Produces: `useHomeState(): { data: HomeState | null; loading: boolean }` (module-level cached promise — Navbar and FeedSection share one fetch).

- [ ] **Step 1: Implement `src/lib/useHomeState.ts`**

```ts
"use client";

import { useEffect, useState } from "react";
import { HomeState } from "./feed";

let cached: Promise<HomeState | null> | null = null;

function fetchHomeState(): Promise<HomeState | null> {
  if (!cached) {
    cached = fetch("/api/public/home-state")
      .then((r) => (r.ok ? (r.json() as Promise<HomeState>) : null))
      .catch(() => null);
  }
  return cached;
}

export function useHomeState(): { data: HomeState | null; loading: boolean } {
  const [data, setData] = useState<HomeState | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    fetchHomeState().then((d) => {
      if (!alive) return;
      setData(d);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);
  return { data, loading };
}
```

- [ ] **Step 2: Implement `src/components/home/FeedSection.tsx`**

```tsx
"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { useHomeState } from "@/lib/useHomeState";
import { FeedPost, FEED_TYPE_LABELS, relativeTime } from "@/lib/feed";

export function FeedCard({ post, index = 0 }: { post: FeedPost; index?: number }) {
  const reduced = useReducedMotion();
  return (
    <motion.article
      initial={reduced ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.2, 0, 0, 1] }}
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all"
    >
      {post.imageKeys[0] && (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element -- runtime R2 image, not optimizable at build */}
          <img
            src={`/media/${post.imageKeys[0]}`}
            alt={post.caption || FEED_TYPE_LABELS[post.type]}
            className="w-full h-56 object-cover"
            loading="lazy"
          />
          <span className="absolute top-4 left-4 bg-gold text-navy font-ui font-medium text-xs tracking-wider px-3 py-1 rounded-full">
            {FEED_TYPE_LABELS[post.type]}
          </span>
        </div>
      )}
      <div className="p-5">
        {!post.imageKeys[0] && (
          <span className="inline-block bg-gold/15 text-gold font-ui font-medium text-xs tracking-wider px-3 py-1 rounded-full mb-3">
            {FEED_TYPE_LABELS[post.type]}
          </span>
        )}
        {post.caption && (
          <p className="font-body font-light text-sm text-charcoal leading-relaxed line-clamp-4 whitespace-pre-line">
            {post.caption}
          </p>
        )}
        <div className="mt-3 font-ui text-[0.65rem] tracking-wider uppercase text-charcoal-light">
          {relativeTime(post.createdAt)}
        </div>
      </div>
    </motion.article>
  );
}

export function FeedSection() {
  const { data } = useHomeState();
  const posts = data?.feedPosts ?? [];
  if (posts.length === 0) return null;
  return (
    <section className="py-20 px-6 bg-navy">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex items-end justify-between mb-12 gap-4">
          <div>
            <SectionLabel>Live Updates</SectionLabel>
            <h2 className="font-display font-light text-[clamp(2rem,4vw,3.2rem)] text-cream mt-4 leading-tight">
              Latest from <em className="text-gold italic">Brenda</em>
            </h2>
          </div>
          <Link
            href="/updates"
            className="hidden tablet:block font-ui font-medium text-xs tracking-wider uppercase text-cream/70 hover:text-gold transition-colors whitespace-nowrap"
          >
            See All Updates &rarr;
          </Link>
        </div>

        {/* Mobile: swipeable strip. Desktop: grid of up to 6. */}
        <div className="flex desktop:grid desktop:grid-cols-3 gap-5 overflow-x-auto desktop:overflow-visible snap-x snap-mandatory -mx-6 px-6 desktop:mx-0 desktop:px-0 pb-2">
          {posts.slice(0, 6).map((post, i) => (
            <div key={post.id} className="w-[280px] desktop:w-auto shrink-0 desktop:shrink snap-start">
              <FeedCard post={post} index={i} />
            </div>
          ))}
        </div>

        <div className="mt-8 text-center tablet:hidden">
          <Link
            href="/updates"
            className="font-ui font-medium text-xs tracking-wider uppercase text-cream/70 hover:text-gold transition-colors"
          >
            See All Updates &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Implement `src/components/layout/AnnouncementBar.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useHomeState } from "@/lib/useHomeState";

const DISMISS_KEY = "bvr_announce_dismissed";

export function AnnouncementBar() {
  const { data } = useHomeState();
  const [dismissed, setDismissed] = useState(true); // hidden until we know
  const a = data?.announcement;

  useEffect(() => {
    if (!a?.active) return;
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === a.updatedAt);
  }, [a]);

  if (!a?.active || !a.text || dismissed) return null;

  const inner = (
    <span className="font-ui text-[0.7rem] tracking-[0.12em] uppercase text-cream">
      {a.text}
      {a.link && <span className="ml-2 text-gold underline underline-offset-2">Details &rarr;</span>}
    </span>
  );

  return (
    <div className="bg-navy border-b border-gold/25 relative">
      <div className="max-w-[1200px] mx-auto px-10 py-2 text-center">
        {a.link ? (
          <a href={a.link} target={a.link.startsWith("/") ? undefined : "_blank"} rel="noopener noreferrer">
            {inner}
          </a>
        ) : (
          inner
        )}
      </div>
      <button
        aria-label="Dismiss announcement"
        onClick={() => {
          sessionStorage.setItem(DISMISS_KEY, a.updatedAt);
          setDismissed(true);
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/60 hover:text-cream text-lg leading-none px-2"
      >
        &times;
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Mount it in `src/components/layout/Navbar.tsx`** — import `{ AnnouncementBar }` and add it as the first child INSIDE the fixed `<header>` (before `<nav>`):

```tsx
      <header className={...existing className...}>
        <AnnouncementBar />
        <nav ...>
```

- [ ] **Step 5: Create `src/app/updates/page.tsx`**

```tsx
import type { Metadata } from "next";
import { UpdatesList } from "./UpdatesList";

export const metadata: Metadata = {
  title: "Latest Updates | Brenda Vega Realty",
  description: "Just listed, just sold, open houses, and market notes from Brenda Vega — live from the South Bay.",
};

export default function UpdatesPage() {
  return (
    <div className="py-16 px-6 min-h-[60vh]">
      <div className="max-w-[800px] mx-auto">
        <span className="font-body font-medium text-[0.65rem] tracking-[0.4em] uppercase text-gold mb-4 block">
          Live Updates
        </span>
        <h1 className="font-display font-light text-[clamp(2.2rem,4vw,3.4rem)] text-navy mb-12 leading-tight">
          Latest from <em className="text-teal italic">Brenda</em>
        </h1>
        <UpdatesList />
      </div>
    </div>
  );
}
```

And `src/app/updates/UpdatesList.tsx`:

```tsx
"use client";

import { useHomeState } from "@/lib/useHomeState";
import { FeedCard } from "@/components/home/FeedSection";

export function UpdatesList() {
  const { data, loading } = useHomeState();
  const posts = data?.feedPosts ?? [];
  if (loading) {
    return <div className="font-body text-sm text-charcoal-light">Loading…</div>;
  }
  if (posts.length === 0) {
    return <div className="font-body text-sm text-charcoal-light">Nothing here yet — check back soon.</div>;
  }
  return (
    <div className="grid tablet:grid-cols-2 gap-6">
      {posts.map((post, i) => (
        <FeedCard key={post.id} post={post} index={i % 2} />
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Swap the homepage section.** In `src/app/page.tsx`: remove the `UpcomingEvent` import and `<UpcomingEvent />`; add `import { FeedSection } from "@/components/home/FeedSection";` and `<FeedSection />` in the same position (after `<StatsBar />`). Then delete `src/components/home/UpcomingEvent.tsx`.

- [ ] **Step 7: Verify visually**

Run: `npm run build && npx wrangler dev --port 8787` (worker serves the fresh `out/`). Seed one feed post + an active announcement via curl (Task 4 commands). Load `http://localhost:8787/` in a browser (or the puppeteer screenshot harness) at 390px and 1440px widths:
- Announcement bar visible at top, dismiss works.
- "Latest from Brenda" section shows the card; mobile strip swipes.
- `/updates` lists the post.
- With feed emptied (DELETE the post): homepage renders with no gap/error.

- [ ] **Step 8: Lint, typecheck, commit**

Run: `npx tsc --noEmit && npm run lint` → clean.
```bash
git add -A src/app/page.tsx src/app/updates src/components/home src/components/layout src/lib/useHomeState.ts
git commit -m "feat: live feed section, /updates page, announcement bar; remove stale event"
```

---

### Task 9: Studio scaffolding — shared auth hook, shell, new home, calendar move

**Files:**
- Create: `src/lib/useStudioAuth.ts`
- Create: `src/components/studio/LoginForm.tsx` (extracted from `src/app/studio/page.tsx:70-136`, verbatim UI)
- Create: `src/components/studio/StudioShell.tsx`
- Create: `src/app/studio/calendar/page.tsx` (receives the existing Dashboard UI)
- Modify: `src/app/studio/page.tsx` (becomes the new mobile home)

**Interfaces:**
- Consumes: `/api/studio/auth` (existing), `/api/studio/blog` + `/api/public/home-state` (recent-activity lists).
- Produces:
  - `useStudioAuth(): { auth: "checking" | "anon" | "authed"; setAuthed: () => void }`
  - `<StudioShell title?: string, backHref?: string>` — renders login gate when anon, header with back link + sign-out when authed, `children` inside a `max-w-[640px]` column.

- [ ] **Step 1: Implement `src/lib/useStudioAuth.ts`**

```ts
"use client";

import { useEffect, useState } from "react";

export type StudioAuth = "checking" | "anon" | "authed";

export function useStudioAuth(): { auth: StudioAuth; setAuthed: () => void } {
  const [auth, setAuth] = useState<StudioAuth>("checking");
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/studio/auth", { credentials: "include" });
        const j = (await r.json()) as { authed: boolean };
        setAuth(j.authed ? "authed" : "anon");
      } catch {
        setAuth("anon");
      }
    })();
  }, []);
  return { auth, setAuthed: () => setAuth("authed") };
}
```

- [ ] **Step 2: Extract `src/components/studio/LoginForm.tsx`** — move the `LoginForm` component out of `src/app/studio/page.tsx` verbatim (same JSX/classes), exported as `export function LoginForm({ onSuccess }: { onSuccess: () => void })`.

- [ ] **Step 3: Implement `src/components/studio/StudioShell.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useStudioAuth } from "@/lib/useStudioAuth";
import { LoginForm } from "./LoginForm";

export function StudioShell({
  title,
  backHref,
  children,
}: {
  title?: string;
  backHref?: string;
  children: React.ReactNode;
}) {
  const { auth, setAuthed } = useStudioAuth();

  if (auth === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="font-body text-charcoal-light text-sm">Loading…</div>
      </div>
    );
  }
  if (auth === "anon") return <LoginForm onSuccess={setAuthed} />;

  async function logout() {
    await fetch("/api/studio/auth", { method: "DELETE", credentials: "include" });
    window.location.href = "/studio";
  }

  return (
    <div className="min-h-screen bg-cream pb-16">
      <meta name="robots" content="noindex,nofollow" />
      <header className="border-b border-navy/10 bg-white sticky top-0 z-40">
        <div className="max-w-[640px] mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {backHref && (
              <Link href={backHref} aria-label="Back" className="text-navy text-xl leading-none shrink-0">
                &larr;
              </Link>
            )}
            <div className="font-display font-light text-lg text-navy truncate">
              {title ?? "Studio"}
            </div>
          </div>
          <button
            onClick={logout}
            className="font-ui text-[0.65rem] tracking-wider uppercase text-charcoal-light hover:text-navy transition-colors shrink-0"
          >
            Sign out
          </button>
        </div>
      </header>
      <div className="max-w-[640px] mx-auto px-5 py-6">{children}</div>
    </div>
  );
}
```

- [ ] **Step 4: Move the calendar.** Create `src/app/studio/calendar/page.tsx` containing the CURRENT contents of `src/app/studio/page.tsx` with: `LoginForm` import switched to `@/components/studio/LoginForm`, and the `Dashboard` header title changed from "Hi Brenda" to "Video Calendar" plus a back link to `/studio` (wrap: replace its inline auth handling with `StudioShell title="Video Calendar" backHref="/studio"` around `<Dashboard …>` — delete the now-redundant auth/login code and the old header's sign-out since StudioShell provides both; keep the stats line "X of N videos complete" as the first row inside the page body).

- [ ] **Step 5: Rewrite `src/app/studio/page.tsx` as the mobile home**

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StudioShell } from "@/components/studio/StudioShell";
import { FeedPost, FEED_TYPE_LABELS, relativeTime } from "@/lib/feed";
import { BlogDraft } from "@/lib/blogStudio";

const ACTIONS = [
  { href: "/studio/feed/new", label: "Post an Update", desc: "Photo + caption → homepage, instantly", icon: "📸" },
  { href: "/studio/blog", label: "Write a Blog", desc: "Notes → polished post, live in minutes", icon: "✍️" },
  { href: "/studio/announcement", label: "Announcement", desc: "One-line banner across the site", icon: "📣" },
  { href: "/studio/calendar", label: "Video Calendar", desc: "Your YouTube Shorts workflow", icon: "🎬" },
];

export default function StudioHomePage() {
  return (
    <StudioShell title="Hi Brenda">
      <HomeInner />
    </StudioShell>
  );
}

function HomeInner() {
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [drafts, setDrafts] = useState<BlogDraft[]>([]);

  useEffect(() => {
    fetch("/api/public/home-state")
      .then((r) => r.json())
      .then((j) => setFeed((j.feedPosts ?? []).slice(0, 3)))
      .catch(() => {});
    fetch("/api/studio/blog", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { drafts: [] }))
      .then((j) => setDrafts((j.drafts ?? []).slice(0, 3)))
      .catch(() => {});
  }, []);

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {ACTIONS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="bg-white rounded-2xl border border-navy/5 p-5 hover:border-teal/40 active:scale-[0.98] transition-all min-h-[130px] flex flex-col"
          >
            <span className="text-2xl mb-2">{a.icon}</span>
            <span className="font-display font-normal text-base text-navy leading-snug">{a.label}</span>
            <span className="font-body font-light text-xs text-charcoal-light mt-1 leading-snug">{a.desc}</span>
          </Link>
        ))}
      </div>

      {feed.length > 0 && (
        <section className="mt-8">
          <h2 className="font-ui text-xs tracking-wider uppercase text-charcoal-light mb-3">Recent updates</h2>
          <div className="bg-white rounded-2xl border border-navy/5 divide-y divide-navy/5">
            {feed.map((p) => (
              <Link key={p.id} href={`/studio/feed/edit?id=${p.id}`} className="flex items-center gap-3 p-4">
                {p.imageKeys[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/media/${p.imageKeys[0]}`} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
                ) : (
                  <span className="w-11 h-11 rounded-lg bg-gold/15 flex items-center justify-center shrink-0">📣</span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-body text-sm text-navy truncate">{p.caption || FEED_TYPE_LABELS[p.type]}</div>
                  <div className="font-ui text-[0.65rem] tracking-wider uppercase text-charcoal-light mt-0.5">
                    {FEED_TYPE_LABELS[p.type]} · {relativeTime(p.createdAt)}
                  </div>
                </div>
                <span className="text-charcoal-light">→</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {drafts.length > 0 && (
        <section className="mt-8">
          <h2 className="font-ui text-xs tracking-wider uppercase text-charcoal-light mb-3">Recent blog posts</h2>
          <div className="bg-white rounded-2xl border border-navy/5 divide-y divide-navy/5">
            {drafts.map((d) => (
              <Link key={d.id} href={`/studio/blog/edit?id=${d.id}`} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="font-body text-sm text-navy truncate">{d.title}</div>
                  <div className="font-ui text-[0.65rem] tracking-wider uppercase text-charcoal-light mt-0.5">
                    {d.status}{d.publishedAt ? ` · ${d.publishedAt}` : ""}
                  </div>
                </div>
                <span className="text-charcoal-light">→</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
```

- [ ] **Step 6: Verify** — `npm run build && npx wrangler dev`; at `http://localhost:8787/studio` log in, see 4 cards; calendar link opens the full existing tracker (all 29+ posts, progress dots intact); back arrow returns home.

- [ ] **Step 7: Lint, typecheck, commit**

```bash
npx tsc --noEmit && npm run lint
git add src/app/studio src/components/studio src/lib/useStudioAuth.ts
git commit -m "feat: mobile-first studio home, shared shell, calendar moved to /studio/calendar"
```

---

### Task 10: Studio — Post an Update (image resize, create, edit/delete)

**Files:**
- Create: `src/lib/imageResize.ts`
- Create: `src/app/studio/feed/new/page.tsx`
- Create: `src/app/studio/feed/edit/page.tsx` (query-param editor: `?id=<uuid>`)

**Interfaces:**
- Consumes: `POST /api/studio/upload`, `POST/PATCH/DELETE /api/studio/feed[/<id>]`, `GET /api/public/home-state`, `FEED_TYPES`/`FEED_TYPE_LABELS`.
- Produces: `resizeImage(file: File, maxDim?: number): Promise<Blob>` (JPEG, quality 0.85, max edge 1600px).

- [ ] **Step 1: Implement `src/lib/imageResize.ts`**

```ts
"use client";

export async function resizeImage(file: File, maxDim = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.85)
  );
}

export async function uploadImage(file: File, kind: "feed" | "blog"): Promise<string> {
  const blob = await resizeImage(file);
  const form = new FormData();
  form.append("file", new File([blob], "photo.jpg", { type: "image/jpeg" }));
  form.append("kind", kind);
  const r = await fetch("/api/studio/upload", { method: "POST", credentials: "include", body: form });
  if (!r.ok) throw new Error((await r.json().catch(() => ({})) as { error?: string }).error ?? "upload failed");
  const j = (await r.json()) as { key: string };
  return j.key;
}
```

- [ ] **Step 2: Implement `src/app/studio/feed/new/page.tsx`**

```tsx
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StudioShell } from "@/components/studio/StudioShell";
import { uploadImage } from "@/lib/imageResize";
import { FEED_TYPES, FEED_TYPE_LABELS, FeedType } from "@/lib/feed";

export default function NewUpdatePage() {
  return (
    <StudioShell title="Post an Update" backHref="/studio">
      <UpdateForm />
    </StudioShell>
  );
}

function UpdateForm() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<FeedType>("update");
  const [caption, setCaption] = useState("");
  const [previews, setPreviews] = useState<{ url: string; file: File }[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function pickFiles(list: FileList | null) {
    if (!list) return;
    const next = [...previews];
    for (const f of Array.from(list)) {
      if (next.length >= 4) break;
      next.push({ url: URL.createObjectURL(f), file: f });
    }
    setPreviews(next);
  }

  async function post() {
    setErr(null);
    if (!caption.trim() && previews.length === 0) {
      setErr("Add a photo or write a caption first.");
      return;
    }
    try {
      const imageKeys: string[] = [];
      for (let i = 0; i < previews.length; i++) {
        setBusy(`Uploading photo ${i + 1} of ${previews.length}…`);
        imageKeys.push(await uploadImage(previews[i].file, "feed"));
      }
      setBusy("Posting…");
      const r = await fetch("/api/studio/feed", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, caption: caption.trim(), imageKeys }),
      });
      if (!r.ok) throw new Error(((await r.json()) as { error?: string }).error ?? "failed");
      router.push("/studio");
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e));
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Photos */}
      <div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => pickFiles(e.target.files)}
        />
        <div className="grid grid-cols-4 gap-2">
          {previews.map((p, i) => (
            <div key={p.url} className="relative aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="w-full h-full object-cover rounded-xl" />
              <button
                aria-label="Remove photo"
                onClick={() => setPreviews(previews.filter((_, j) => j !== i))}
                className="absolute -top-1.5 -right-1.5 bg-navy text-cream rounded-full w-6 h-6 text-xs"
              >
                ✕
              </button>
            </div>
          ))}
          {previews.length < 4 && (
            <button
              onClick={() => fileInput.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-navy/20 text-navy/50 text-3xl hover:border-teal/50 transition-colors"
            >
              +
            </button>
          )}
        </div>
      </div>

      {/* Type */}
      <div className="flex gap-2 flex-wrap">
        {FEED_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`font-ui text-xs tracking-wider uppercase px-4 py-2.5 rounded-full transition-colors ${
              type === t ? "bg-navy text-cream" : "bg-white text-charcoal-light border border-navy/10"
            }`}
          >
            {FEED_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Caption */}
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        rows={4}
        maxLength={1000}
        placeholder="Write a caption… (e.g. Just listed in Campbell — 3 bed, 2 bath, open Sat 1-4)"
        className="w-full bg-white border border-navy/10 rounded-xl p-4 font-body text-base focus:outline-none focus:border-teal"
      />

      {err && <div className="text-sm text-red-600 font-body">{err}</div>}

      <button
        onClick={post}
        disabled={!!busy}
        className="w-full bg-teal text-white font-ui font-medium text-sm tracking-wider uppercase py-4 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-60"
      >
        {busy ?? "Post to Website"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Implement `src/app/studio/feed/edit/page.tsx`** (reads `?id=`, allows caption/type edits and delete):

```tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StudioShell } from "@/components/studio/StudioShell";
import { FeedPost, FEED_TYPES, FEED_TYPE_LABELS, FeedType } from "@/lib/feed";

export default function EditUpdatePage() {
  return (
    <StudioShell title="Edit Update" backHref="/studio">
      <Suspense fallback={<div className="font-body text-sm text-charcoal-light">Loading…</div>}>
        <EditForm />
      </Suspense>
    </StudioShell>
  );
}

function EditForm() {
  const router = useRouter();
  const id = useSearchParams().get("id");
  const [post, setPost] = useState<FeedPost | null>(null);
  const [caption, setCaption] = useState("");
  const [type, setType] = useState<FeedType>("update");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch("/api/public/home-state")
      .then((r) => r.json())
      .then((j: { feedPosts: FeedPost[] }) => {
        const p = j.feedPosts.find((x) => x.id === id) ?? null;
        setPost(p);
        if (p) {
          setCaption(p.caption);
          setType(p.type);
        }
      })
      .catch(() => {});
  }, [id]);

  if (!id) return <div className="font-body text-sm text-charcoal-light">Missing update id.</div>;
  if (!post) return <div className="font-body text-sm text-charcoal-light">Loading…</div>;

  async function save() {
    setBusy(true);
    setErr(null);
    const r = await fetch(`/api/studio/feed/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption, type }),
    });
    setBusy(false);
    if (!r.ok) {
      setErr(((await r.json()) as { error?: string }).error ?? "failed");
      return;
    }
    router.push("/studio");
  }

  async function remove() {
    if (!confirm("Delete this update from the website?")) return;
    setBusy(true);
    await fetch(`/api/studio/feed/${id}`, { method: "DELETE", credentials: "include" });
    router.push("/studio");
  }

  return (
    <div className="space-y-6">
      {post.imageKeys.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {post.imageKeys.map((k) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={k} src={`/media/${k}`} alt="" className="aspect-square w-full object-cover rounded-xl" />
          ))}
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        {FEED_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`font-ui text-xs tracking-wider uppercase px-4 py-2.5 rounded-full transition-colors ${
              type === t ? "bg-navy text-cream" : "bg-white text-charcoal-light border border-navy/10"
            }`}
          >
            {FEED_TYPE_LABELS[t]}
          </button>
        ))}
      </div>
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        rows={4}
        maxLength={1000}
        className="w-full bg-white border border-navy/10 rounded-xl p-4 font-body text-base focus:outline-none focus:border-teal"
      />
      {err && <div className="text-sm text-red-600 font-body">{err}</div>}
      <button
        onClick={save}
        disabled={busy}
        className="w-full bg-teal text-white font-ui font-medium text-sm tracking-wider uppercase py-4 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-60"
      >
        Save Changes
      </button>
      <button onClick={remove} disabled={busy} className="w-full text-red-600 font-ui text-xs tracking-wider uppercase py-2">
        Delete Update
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Verify end-to-end** — build + wrangler dev; from a 390px browser viewport: post an update with a photo → lands on studio home → visible on `/` feed section; edit its caption; delete it; confirm R2 object is gone (`GET /media/<key>` → 404).

- [ ] **Step 5: Lint, typecheck, commit**

```bash
npx tsc --noEmit && npm run lint
git add src/lib/imageResize.ts src/app/studio/feed
git commit -m "feat: studio post-an-update flow with client-side image resize"
```

---

### Task 11: Studio — announcement editor

**Files:**
- Create: `src/app/studio/announcement/page.tsx`

**Interfaces:**
- Consumes: `GET /api/public/home-state`, `PUT /api/studio/announcement`.

- [ ] **Step 1: Implement the page**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StudioShell } from "@/components/studio/StudioShell";
import { Announcement } from "@/lib/feed";

export default function AnnouncementPage() {
  return (
    <StudioShell title="Announcement" backHref="/studio">
      <AnnouncementForm />
    </StudioShell>
  );
}

function AnnouncementForm() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/public/home-state")
      .then((r) => r.json())
      .then((j: { announcement: Announcement | null }) => {
        if (j.announcement) {
          setText(j.announcement.text);
          setLink(j.announcement.link ?? "");
          setActive(j.announcement.active);
        }
      })
      .catch(() => {});
  }, []);

  async function save() {
    setBusy(true);
    setErr(null);
    const r = await fetch("/api/studio/announcement", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim(), link: link.trim() || undefined, active }),
    });
    setBusy(false);
    if (!r.ok) {
      setErr("Couldn't save — try again.");
      return;
    }
    router.push("/studio");
  }

  return (
    <div className="space-y-6">
      <p className="font-body font-light text-sm text-charcoal-light">
        Shows as a slim banner at the very top of every page. Perfect for open houses and events.
      </p>

      {/* Live preview */}
      {active && text.trim() && (
        <div className="bg-navy border-b border-gold/25 rounded-lg py-2 px-8 text-center relative">
          <span className="font-ui text-[0.7rem] tracking-[0.12em] uppercase text-cream">
            {text.trim()}
            {link.trim() && <span className="ml-2 text-gold underline underline-offset-2">Details →</span>}
          </span>
        </div>
      )}

      <label className="block">
        <span className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Banner text</span>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={200}
          placeholder="Open house this Sat 1-4pm — 123 Main St, Campbell"
          className="mt-2 w-full bg-white border border-navy/10 rounded-xl p-4 font-body text-base focus:outline-none focus:border-teal"
        />
      </label>

      <label className="block">
        <span className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Link (optional)</span>
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://… or /contact"
          className="mt-2 w-full bg-white border border-navy/10 rounded-xl p-4 font-body text-base focus:outline-none focus:border-teal"
        />
      </label>

      <button
        onClick={() => setActive(!active)}
        className={`w-full font-ui text-sm tracking-wider uppercase py-4 rounded-xl border transition-colors ${
          active ? "bg-teal/10 border-teal text-teal" : "bg-white border-navy/10 text-charcoal-light"
        }`}
      >
        {active ? "● Banner is ON" : "○ Banner is OFF"}
      </button>

      {err && <div className="text-sm text-red-600 font-body">{err}</div>}

      <button
        onClick={save}
        disabled={busy || (active && !text.trim())}
        className="w-full bg-teal text-white font-ui font-medium text-sm tracking-wider uppercase py-4 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify** — set text + ON in studio → banner appears on `/` (after the 60s edge cache; in wrangler dev it's immediate); toggle OFF → banner gone; dismiss (×) hides for the browser session.

- [ ] **Step 3: Lint, typecheck, commit**

```bash
npx tsc --noEmit && npm run lint
git add src/app/studio/announcement
git commit -m "feat: studio announcement bar editor"
```

---

### Task 12: Studio — blog list, new, edit/polish/publish

**Files:**
- Create: `src/app/studio/blog/page.tsx` (list + "New post")
- Create: `src/app/studio/blog/new/page.tsx`
- Create: `src/app/studio/blog/edit/page.tsx` (`?id=` — polish, preview, edit, publish)

**Interfaces:**
- Consumes: all `/api/studio/blog*` routes (Task 6), `uploadImage` (Task 10), `BLOG_CATEGORIES`/`slugify`/`BlogDraft` (Task 1), `blogPosts` from `@/data/blog-posts` (slug-collision check).

- [ ] **Step 1: List page `src/app/studio/blog/page.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StudioShell } from "@/components/studio/StudioShell";
import { BlogDraft } from "@/lib/blogStudio";

const STATUS_STYLE: Record<BlogDraft["status"], string> = {
  draft: "bg-navy/10 text-charcoal-light",
  polished: "bg-gold/20 text-gold",
  published: "bg-teal/15 text-teal",
};

export default function BlogListPage() {
  return (
    <StudioShell title="Blog" backHref="/studio">
      <BlogList />
    </StudioShell>
  );
}

function BlogList() {
  const [drafts, setDrafts] = useState<BlogDraft[] | null>(null);

  useEffect(() => {
    fetch("/api/studio/blog", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { drafts: [] }))
      .then((j: { drafts: BlogDraft[] }) => setDrafts(j.drafts))
      .catch(() => setDrafts([]));
  }, []);

  return (
    <div className="space-y-4">
      <Link
        href="/studio/blog/new"
        className="block w-full bg-teal text-white text-center font-ui font-medium text-sm tracking-wider uppercase py-4 rounded-xl active:scale-[0.98] transition-transform"
      >
        + New Post
      </Link>
      {drafts === null && <div className="font-body text-sm text-charcoal-light">Loading…</div>}
      {drafts !== null && drafts.length === 0 && (
        <div className="font-body text-sm text-charcoal-light">No studio posts yet. Write your first one!</div>
      )}
      {drafts !== null && drafts.length > 0 && (
        <div className="bg-white rounded-2xl border border-navy/5 divide-y divide-navy/5">
          {drafts.map((d) => (
            <Link key={d.id} href={`/studio/blog/edit?id=${d.id}`} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="font-body text-sm text-navy truncate">{d.title}</div>
                <div className="font-ui text-[0.65rem] tracking-wider uppercase text-charcoal-light mt-0.5">
                  {d.category}{d.publishedAt ? ` · ${d.publishedAt}` : ""}
                </div>
              </div>
              <span className={`font-ui text-[0.6rem] tracking-wider uppercase px-2.5 py-1 rounded-full shrink-0 ${STATUS_STYLE[d.status]}`}>
                {d.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: New-post page `src/app/studio/blog/new/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StudioShell } from "@/components/studio/StudioShell";
import { BLOG_CATEGORIES, slugify } from "@/lib/blogStudio";
import { blogPosts } from "@/data/blog-posts";

export default function NewBlogPage() {
  return (
    <StudioShell title="New Blog Post" backHref="/studio/blog">
      <NewBlogForm />
    </StudioShell>
  );
}

function NewBlogForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(BLOG_CATEGORIES[0]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function create() {
    setErr(null);
    let slug = slugify(title);
    if (!slug) {
      setErr("Give the post a title first.");
      return;
    }
    const taken = new Set(blogPosts.map((p) => p.slug));
    let n = 2;
    const base = slug;
    while (taken.has(slug)) slug = `${base}-${n++}`;
    setBusy(true);
    try {
      const r = await fetch("/api/studio/blog", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), category, rawNotes: notes, slug }),
      });
      if (!r.ok) throw new Error(((await r.json()) as { error?: string }).error ?? "failed");
      const j = (await r.json()) as { draft: { id: string } };
      router.push(`/studio/blog/edit?id=${j.draft.id}`);
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <label className="block">
        <span className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Campbell Market Check-In: July 2026"
          className="mt-2 w-full bg-white border border-navy/10 rounded-xl p-4 font-body text-base focus:outline-none focus:border-teal"
        />
      </label>

      <div className="flex gap-2 flex-wrap">
        {BLOG_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`font-ui text-xs tracking-wider uppercase px-4 py-2.5 rounded-full transition-colors ${
              category === c ? "bg-navy text-cream" : "bg-white text-charcoal-light border border-navy/10"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Your notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={10}
          placeholder={"Rough notes are perfect — bullet points, voice-memo style, whatever.\n\nThe AI will turn them into a full post in your voice, and you approve it before anything goes live."}
          className="mt-2 w-full bg-white border border-navy/10 rounded-xl p-4 font-body text-base leading-relaxed focus:outline-none focus:border-teal"
        />
      </label>

      {err && <div className="text-sm text-red-600 font-body">{err}</div>}

      <button
        onClick={create}
        disabled={busy || !title.trim()}
        className="w-full bg-teal text-white font-ui font-medium text-sm tracking-wider uppercase py-4 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save & Continue"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Edit/polish/publish page `src/app/studio/blog/edit/page.tsx`**

```tsx
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StudioShell } from "@/components/studio/StudioShell";
import { BlogDraft } from "@/lib/blogStudio";
import { uploadImage } from "@/lib/imageResize";

export default function EditBlogPage() {
  return (
    <StudioShell title="Blog Post" backHref="/studio/blog">
      <Suspense fallback={<div className="font-body text-sm text-charcoal-light">Loading…</div>}>
        <EditBlog />
      </Suspense>
    </StudioShell>
  );
}

function EditBlog() {
  const router = useRouter();
  const id = useSearchParams().get("id");
  const fileInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<BlogDraft | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showHtml, setShowHtml] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/studio/blog/${id}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { draft: BlogDraft } | null) => {
        if (j) {
          setDraft(j.draft);
          setNotes(j.draft.rawNotes);
        }
      })
      .catch(() => {});
  }, [id]);

  if (!id) return <div className="font-body text-sm text-charcoal-light">Missing post id.</div>;
  if (!draft) return <div className="font-body text-sm text-charcoal-light">Loading…</div>;

  async function api(path: string, init: RequestInit): Promise<BlogDraft | null> {
    const r = await fetch(path, { credentials: "include", ...init });
    if (!r.ok) {
      setErr(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "Something went wrong");
      return null;
    }
    const j = (await r.json()) as { draft: BlogDraft };
    return j.draft;
  }

  async function saveNotes(): Promise<boolean> {
    const d = await api(`/api/studio/blog/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawNotes: notes }),
    });
    if (d) setDraft(d);
    return !!d;
  }

  async function polish() {
    setErr(null);
    setBusy("Saving notes…");
    if (!(await saveNotes())) {
      setBusy(null);
      return;
    }
    setBusy("Writing your post… (about 30 seconds)");
    const d = await api(`/api/studio/blog/${id}/polish`, { method: "POST" });
    if (d) setDraft(d);
    setBusy(null);
  }

  async function patchPolished(field: "title" | "excerpt" | "contentHtml", value: string) {
    const d = await api(`/api/studio/blog/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ polished: { [field]: value } }),
    });
    if (d) setDraft(d);
  }

  async function addHero(f: File | null) {
    if (!f) return;
    setBusy("Uploading photo…");
    try {
      const key = await uploadImage(f, "blog");
      const d = await api(`/api/studio/blog/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heroImageKey: key }),
      });
      if (d) setDraft(d);
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e));
    }
    setBusy(null);
  }

  async function publish() {
    if (!confirm("Publish this post to brendavegarealty.com? It will be live in a few minutes.")) return;
    setErr(null);
    setBusy("Publishing…");
    const r = await fetch(`/api/studio/blog/${id}/publish`, { method: "POST", credentials: "include" });
    setBusy(null);
    if (!r.ok) {
      setErr("Publish failed — try again.");
      return;
    }
    const j = (await r.json()) as { draft: BlogDraft; dispatched: boolean };
    setDraft(j.draft);
    alert(
      j.dispatched
        ? "Published! Your post will be live in about 3 minutes."
        : "Published! The deploy couldn't start right now, so it will be live by tomorrow morning at the latest."
    );
    router.push("/studio/blog");
  }

  async function remove() {
    if (!confirm("Delete this draft?")) return;
    await fetch(`/api/studio/blog/${id}`, { method: "DELETE", credentials: "include" });
    router.push("/studio/blog");
  }

  const p = draft.polished;

  return (
    <div className="space-y-6">
      <div className="font-ui text-[0.65rem] tracking-wider uppercase text-charcoal-light">
        {draft.category} · {draft.status}
        {draft.publishedAt ? ` · published ${draft.publishedAt}` : ""}
      </div>

      {/* Notes + polish */}
      <label className="block">
        <span className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Your notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={6}
          className="mt-2 w-full bg-white border border-navy/10 rounded-xl p-4 font-body text-base leading-relaxed focus:outline-none focus:border-teal"
        />
      </label>
      <button
        onClick={polish}
        disabled={!!busy || !notes.trim()}
        className="w-full bg-navy text-cream font-ui font-medium text-sm tracking-wider uppercase py-4 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-60"
      >
        {busy ?? (p ? "↻ Re-write with AI" : "✨ Write it with AI")}
      </button>

      {err && <div className="text-sm text-red-600 font-body">{err}</div>}

      {/* Polished preview + edits */}
      {p && (
        <div className="space-y-4">
          <input
            defaultValue={p.title}
            onBlur={(e) => e.target.value !== p.title && patchPolished("title", e.target.value)}
            className="w-full bg-white border border-navy/10 rounded-xl p-4 font-display text-xl text-navy focus:outline-none focus:border-teal"
          />
          <textarea
            defaultValue={p.excerpt}
            onBlur={(e) => e.target.value !== p.excerpt && patchPolished("excerpt", e.target.value)}
            rows={2}
            className="w-full bg-white border border-navy/10 rounded-xl p-4 font-body text-sm focus:outline-none focus:border-teal"
          />

          {/* Hero photo */}
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => addHero(e.target.files?.[0] ?? null)} />
          {draft.heroImageKey ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/media/${draft.heroImageKey}`}
              alt=""
              onClick={() => fileInput.current?.click()}
              className="w-full h-44 object-cover rounded-xl cursor-pointer"
            />
          ) : (
            <button
              onClick={() => fileInput.current?.click()}
              className="w-full py-4 rounded-xl border-2 border-dashed border-navy/20 text-charcoal-light font-ui text-xs tracking-wider uppercase"
            >
              + Add cover photo (optional)
            </button>
          )}

          <div className="flex items-center justify-between">
            <span className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Preview</span>
            <button onClick={() => setShowHtml(!showHtml)} className="font-ui text-[0.65rem] tracking-wider uppercase text-teal">
              {showHtml ? "Show preview" : "Edit text"}
            </button>
          </div>
          {showHtml ? (
            <textarea
              defaultValue={p.contentHtml}
              onBlur={(e) => e.target.value !== p.contentHtml && patchPolished("contentHtml", e.target.value)}
              rows={16}
              className="w-full bg-white border border-navy/10 rounded-xl p-4 font-mono text-xs leading-relaxed focus:outline-none focus:border-teal"
            />
          ) : (
            <div
              className="bg-white border border-navy/5 rounded-xl p-5 prose-sm font-body text-charcoal [&_h2]:font-display [&_h2]:text-navy [&_h2]:text-xl [&_h2]:mt-6 [&_h2]:mb-2 [&_p]:my-3 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:text-navy"
              dangerouslySetInnerHTML={{ __html: p.contentHtml }}
            />
          )}

          <button
            onClick={publish}
            disabled={!!busy}
            className="w-full bg-teal text-white font-ui font-medium text-sm tracking-wider uppercase py-4 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            {draft.status === "published" ? "Republish Changes" : "Publish to Website"}
          </button>
        </div>
      )}

      {draft.status !== "published" && (
        <button onClick={remove} className="w-full text-red-600 font-ui text-xs tracking-wider uppercase py-2">
          Delete Draft
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify end-to-end (needs real `ANTHROPIC_API_KEY` in `.dev.vars`)** — new post with a few rough note lines → polish (~30s) → preview renders headings/lists → tweak title → publish (dispatch=false locally is fine) → `blog:published` contains the id → run `CLOUDFLARE_API_TOKEN=… node scripts/fetch-kv-posts.mjs && npm run build` → new post appears on `/blog` and its own page renders with correct `<title>`/meta description; the post also appears in `/studio/calendar` with its video script (KV posts flow into `generateStaticParams` for `/studio/post/[slug]`).

- [ ] **Step 5: Lint, typecheck, test, commit**

```bash
npx tsc --noEmit && npm run lint && npx jest
git add src/app/studio/blog
git commit -m "feat: studio blog authoring — notes, AI polish, preview, publish"
```

---

### Task 13: Studio PWA — manifest, icons, layout metadata

**Files:**
- Create: `scripts/make-studio-icons.mjs`, `public/images/studio-icon-192.png`, `public/images/studio-icon-512.png`
- Create: `public/studio-manifest.json`
- Create: `src/app/studio/layout.tsx`

**Interfaces:**
- Consumes: `public/images/logo-icon.svg` (existing brand mark).
- Produces: installable Home Screen app at `/studio`.

- [ ] **Step 1: Icon generator `scripts/make-studio-icons.mjs`** (this machine has no Chrome — drive Edge with puppeteer-core borrowed from 4ts-kit-tools):

```js
import { createRequire } from "module";
import { readFile } from "node:fs/promises";
const require = createRequire("C:/Users/DaVinci/Desktop/4ts-kit-tools/");
const puppeteer = require("puppeteer-core");

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const svg = await readFile("public/images/logo-icon.svg", "utf8");
const browser = await puppeteer.launch({ executablePath: EDGE, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();

for (const size of [192, 512]) {
  await page.setViewport({ width: size, height: size });
  await page.setContent(
    `<body style="margin:0;width:${size}px;height:${size}px;background:#0F1D35;display:flex;align-items:center;justify-content:center">
       <div style="width:${Math.round(size * 0.55)}px">${svg.replace(/<svg /, '<svg style="width:100%;height:auto" ')}</div>
     </body>`
  );
  await page.screenshot({ path: `public/images/studio-icon-${size}.png` });
  console.log(`wrote studio-icon-${size}.png`);
}
await browser.close();
```

Run: `node scripts/make-studio-icons.mjs` → two PNGs (navy background, gold house mark, correct sizes — verify by opening one).

- [ ] **Step 2: `public/studio-manifest.json`**

```json
{
  "name": "Brenda Vega Studio",
  "short_name": "BV Studio",
  "start_url": "/studio",
  "scope": "/studio",
  "display": "standalone",
  "background_color": "#F8F5EF",
  "theme_color": "#0F1D35",
  "icons": [
    { "src": "/images/studio-icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/images/studio-icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 3: `src/app/studio/layout.tsx`**

```tsx
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Studio — Brenda Vega",
  robots: { index: false, follow: false },
  manifest: "/studio-manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "BV Studio" },
  icons: { apple: "/images/studio-icon-192.png" },
};

export const viewport: Viewport = { themeColor: "#0F1D35" };

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

- [ ] **Step 4: Verify** — `npm run build`; confirm `out/studio/index.html` head contains `link rel="manifest" href="/studio-manifest.json"` and the apple-touch-icon link.

- [ ] **Step 5: Commit**

```bash
git add scripts/make-studio-icons.mjs public/studio-manifest.json public/images/studio-icon-*.png src/app/studio/layout.tsx
git commit -m "feat: studio PWA manifest and icons for Add to Home Screen"
```

---

### Task 14: Design polish pass + final verification + deploy

**Files:**
- Create: `src/lib/countUpParse.ts`, `src/components/ui/CountUp.tsx`
- Test: `src/lib/__tests__/countUpParse.test.ts`
- Modify: `src/components/ui/AnimateOnScroll.tsx` (reduced motion)
- Modify: `src/components/home/StatsBar.tsx` (count-up)
- Modify: `src/components/home/Hero.tsx` (stagger sequence)
- Modify: `src/components/home/AreasPreview.tsx` (staggered delays, match FeaturedListings' existing `delay={i * 0.1}` pattern)
- Modify: `src/components/ui/Button.tsx` (press state)
- Modify: `src/components/ui/CookieConsent.tsx` (clear the mobile CTA bar)

**Interfaces:**
- Produces: `parseStatValue(value: string): { prefix: string; num: number; suffix: string; decimals: number }`; `<CountUp value="$1.5M" />`.

- [ ] **Step 1: Failing test `src/lib/__tests__/countUpParse.test.ts`**

```ts
import { parseStatValue } from "@/lib/countUpParse";

describe("parseStatValue", () => {
  it("parses $1.5M", () => {
    expect(parseStatValue("$1.5M")).toEqual({ prefix: "$", num: 1.5, suffix: "M", decimals: 1 });
  });
  it("parses 100%", () => {
    expect(parseStatValue("100%")).toEqual({ prefix: "", num: 100, suffix: "%", decimals: 0 });
  });
  it("parses 4+", () => {
    expect(parseStatValue("4+")).toEqual({ prefix: "", num: 4, suffix: "+", decimals: 0 });
  });
  it("falls back to zero-count for non-numeric", () => {
    expect(parseStatValue("N/A")).toEqual({ prefix: "N/A", num: 0, suffix: "", decimals: 0 });
  });
});
```

Run `npx jest countUpParse` → FAIL.

- [ ] **Step 2: Implement `src/lib/countUpParse.ts`**

```ts
export function parseStatValue(value: string): {
  prefix: string;
  num: number;
  suffix: string;
  decimals: number;
} {
  const m = value.match(/^([^0-9]*)([\d,]+(?:\.\d+)?)(.*)$/);
  if (!m) return { prefix: value, num: 0, suffix: "", decimals: 0 };
  const numeric = m[2].replace(/,/g, "");
  const dot = numeric.indexOf(".");
  return {
    prefix: m[1],
    num: parseFloat(numeric),
    suffix: m[3],
    decimals: dot === -1 ? 0 : numeric.length - dot - 1,
  };
}
```

Run `npx jest countUpParse` → PASS.

- [ ] **Step 3: Implement `src/components/ui/CountUp.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";
import { parseStatValue } from "@/lib/countUpParse";

export function CountUp({ value, duration = 1.4 }: { value: string; duration?: number }) {
  const { prefix, num, suffix, decimals } = parseStatValue(value);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setDisplay(num);
      return;
    }
    const controls = animate(0, num, {
      duration,
      ease: [0.2, 0, 0, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [inView, num, reduced, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {display.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}
```

In `src/components/home/StatsBar.tsx`, replace `{stat.value}` with `<CountUp value={stat.value} />` (import it).

- [ ] **Step 4: Reduced motion in `src/components/ui/AnimateOnScroll.tsx`** — add:

```tsx
import { motion, useReducedMotion } from "framer-motion";
```
and as the first line of the component body:
```tsx
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
```

- [ ] **Step 5: Hero entrance sequence in `src/components/home/Hero.tsx`** — replace the single left-column `motion.div` with a stagger container; keep the photo block as-is:

```tsx
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.2, 0, 0, 1] as const } },
};
```
The left column becomes `<motion.div variants={container} initial="hidden" animate="show">` and its four children (kicker `span`, `h1`, `p`, buttons `div`) each become `motion.<tag> variants={item}` (e.g. `motion.span`, `motion.h1`, `motion.p`, `motion.div`). Add `const reduced = useReducedMotion();` and when `reduced`, pass `initial={false}` on the container and the photo block.

- [ ] **Step 6: Stagger AreasPreview** — in `src/components/home/AreasPreview.tsx`, add `delay={i * 0.1}` to the per-card `AnimateOnScroll` (mirroring `FeaturedListings.tsx`; use the card `map` index).

- [ ] **Step 7: Button press state** — in `src/components/ui/Button.tsx`, in the base className string, after `hover:-translate-y-[3px]`, add ` active:translate-y-0 active:scale-[0.97]`.

- [ ] **Step 8: Cookie banner clearance** — in `src/components/ui/CookieConsent.tsx:22`, change `bottom-16` to `bottom-[76px]` (60px CTA bar + 16px gap; desktop value unchanged).

- [ ] **Step 9: Full verification sweep**

- `npx jest && npx tsc --noEmit && npm run lint` → all clean.
- `npm run build && npx wrangler dev` → screenshot/browse `/` at 1440px and 390px: stats count up on scroll, hero staggers in, feed cards cascade, cookie banner clears the CTA bar.
- Emulate `prefers-reduced-motion: reduce` (DevTools rendering tab): content appears without animation, numbers show final values.
- Regression: `/blog` index and one post page render; YouTube embed flow (`/api/public/blog-state`) unchanged; contact form posts; `/studio/calendar` tracker works.

- [ ] **Step 10: Commit, push, deploy**

```bash
git add -A
git commit -m "feat: animation polish — count-up stats, hero stagger, reduced-motion support"
git push origin main
npx wrangler deploy
```

Post-deploy smoke test on https://brendavegarealty.com: homepage (no Easter section, feed section behavior), `/studio` login + all four flows, post a real "welcome" feed update with Brenda's headshot as a placeholder she can delete, and verify `/api/public/home-state` returns it.

---

## Post-implementation checklist (user-facing)

1. DaVinci provides `ANTHROPIC_API_KEY` + creates the fine-grained GitHub PAT (Task 6 Step 4).
2. Confirm repo `CLOUDFLARE_API_TOKEN` has Workers KV Read (Task 7 Step 5).
3. Brenda: Safari → brendavegarealty.com/studio → log in → Share → Add to Home Screen.
4. Walk Brenda through one real feed post and one real blog post.
