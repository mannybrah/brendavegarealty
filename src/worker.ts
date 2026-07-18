import { Env } from "./worker-lib/env";
import { corsHeaders, jsonResponse } from "./worker-lib/http";
import { handleMediaUpload, handleMediaGet } from "./worker-lib/media";
import {
  handleHomeState,
  handleFeedCreate,
  handleFeedPatch,
  handleFeedDelete,
  handleAnnouncementPut,
} from "./worker-lib/feed";
import {
  handleBlogList,
  handleBlogCreate,
  handleBlogGet,
  handleBlogPatch,
  handleBlogDelete,
  handleBlogPolish,
  handleBlogPublish,
} from "./worker-lib/blog";
import {
  handleListingExtract,
  handleListingList,
  handleListingGet,
  handleListingPatch,
  handleListingDelete,
  handleListingPublish,
  handleListingUnpublish,
  handlePublicListings,
  findLiveListingBySlug,
} from "./worker-lib/listing";
import { renderListingPage } from "./worker-lib/listingPage";
import {
  handleCrmSummary,
  handleContactList,
  handleContactCreate,
  handleContactGet,
  handleContactPatch,
  handleContactDelete,
  handleEventCreate,
  handleTaskList,
  handleTaskCreate,
  handleTaskPatch,
  handleTaskDelete,
} from "./worker-lib/crm";
import {
  handlePushVapid,
  handlePushSubscribe,
  handlePushUnsubscribe,
  handlePushTest,
  runReminderSweep,
} from "./worker-lib/push";

const SESSION_COOKIE = "bvr_studio_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight for API routes
    if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
      return new Response(null, { headers: corsHeaders() });
    }

    // Public API (existing)
    if (url.pathname === "/api/contact" && request.method === "POST") {
      return handleContact(request, env);
    }
    if (url.pathname === "/api/lead" && request.method === "POST") {
      return handleLead(request, env);
    }
    if (url.pathname === "/api/stats" && request.method === "GET") {
      return handleStats(env);
    }

    // Public read — YouTube URLs keyed by post slug (no auth)
    if (url.pathname === "/api/public/blog-state" && request.method === "GET") {
      return handlePublicBlogState(env);
    }

    // Studio auth
    if (url.pathname === "/api/studio/auth" && request.method === "POST") {
      return handleStudioLogin(request, env);
    }
    if (url.pathname === "/api/studio/auth" && request.method === "GET") {
      return handleStudioWhoami(request, env);
    }
    if (url.pathname === "/api/studio/auth" && request.method === "DELETE") {
      return handleStudioLogout();
    }

    // Studio state (auth required)
    if (url.pathname === "/api/studio/state" && request.method === "GET") {
      return requireStudio(request, env, () => handleStudioStateList(env));
    }
    const stateMatch = url.pathname.match(/^\/api\/studio\/state\/([a-z0-9-]+)$/);
    if (stateMatch && request.method === "PATCH") {
      return requireStudio(request, env, () =>
        handleStudioStatePatch(stateMatch[1], request, env)
      );
    }

    // Media (R2)
    const mediaMatch = url.pathname.match(
      /^\/media\/((?:feed|blog)\/[a-zA-Z0-9-]+\.(?:jpg|png|webp)|listing\/[a-f0-9-]+\/[0-9]+\.jpg)$/
    );
    if (mediaMatch && request.method === "GET") {
      return handleMediaGet(mediaMatch[1], env);
    }
    if (url.pathname === "/api/studio/upload" && request.method === "POST") {
      return requireStudio(request, env, () => handleMediaUpload(request, env));
    }

    // Home page feed / announcement
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

    // Blog studio (drafts, polish, publish)
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

    // Listings (studio CRUD + extract/publish, public feed, worker-rendered pages)
    if (url.pathname === "/api/public/listings" && request.method === "GET") {
      return handlePublicListings(env);
    }
    if (url.pathname === "/api/studio/listing/extract" && request.method === "POST") {
      return requireStudio(request, env, () => handleListingExtract(request, env));
    }
    if (url.pathname === "/api/studio/listing" && request.method === "GET") {
      return requireStudio(request, env, () => handleListingList(env));
    }
    const listingActionMatch = url.pathname.match(/^\/api\/studio\/listing\/([a-f0-9-]+)\/(publish|unpublish)$/);
    if (listingActionMatch && request.method === "POST") {
      return requireStudio(request, env, () =>
        listingActionMatch[2] === "publish"
          ? handleListingPublish(listingActionMatch[1], request, env)
          : handleListingUnpublish(listingActionMatch[1], env)
      );
    }
    const listingMatch = url.pathname.match(/^\/api\/studio\/listing\/([a-f0-9-]+)$/);
    if (listingMatch && request.method === "GET") {
      return requireStudio(request, env, () => handleListingGet(listingMatch[1], env));
    }
    if (listingMatch && request.method === "PATCH") {
      return requireStudio(request, env, () => handleListingPatch(listingMatch[1], request, env));
    }
    if (listingMatch && request.method === "DELETE") {
      return requireStudio(request, env, () => handleListingDelete(listingMatch[1], env));
    }

    // CRM (studio-gated contacts/events/summary)
    if (url.pathname === "/api/studio/crm/summary" && request.method === "GET") {
      return requireStudio(request, env, () => handleCrmSummary(env));
    }
    if (url.pathname === "/api/studio/crm/contacts" && request.method === "GET") {
      return requireStudio(request, env, () => handleContactList(request, env));
    }
    if (url.pathname === "/api/studio/crm/contacts" && request.method === "POST") {
      return requireStudio(request, env, () => handleContactCreate(request, env));
    }
    const crmEventMatch = url.pathname.match(/^\/api\/studio\/crm\/contacts\/([a-f0-9-]+)\/events$/);
    if (crmEventMatch && request.method === "POST") {
      return requireStudio(request, env, () => handleEventCreate(crmEventMatch[1], request, env));
    }
    const crmContactMatch = url.pathname.match(/^\/api\/studio\/crm\/contacts\/([a-f0-9-]+)$/);
    if (crmContactMatch && request.method === "GET") {
      return requireStudio(request, env, () => handleContactGet(crmContactMatch[1], env));
    }
    if (crmContactMatch && request.method === "PATCH") {
      return requireStudio(request, env, () => handleContactPatch(crmContactMatch[1], request, env));
    }
    if (crmContactMatch && request.method === "DELETE") {
      return requireStudio(request, env, () => handleContactDelete(crmContactMatch[1], env));
    }
    if (url.pathname === "/api/studio/crm/tasks" && request.method === "GET") {
      return requireStudio(request, env, () => handleTaskList(request, env));
    }
    if (url.pathname === "/api/studio/crm/tasks" && request.method === "POST") {
      return requireStudio(request, env, () => handleTaskCreate(request, env));
    }
    const crmTaskMatch = url.pathname.match(/^\/api\/studio\/crm\/tasks\/([a-f0-9-]+)$/);
    if (crmTaskMatch && request.method === "PATCH") {
      return requireStudio(request, env, () => handleTaskPatch(crmTaskMatch[1], request, env));
    }
    if (crmTaskMatch && request.method === "DELETE") {
      return requireStudio(request, env, () => handleTaskDelete(crmTaskMatch[1], env));
    }

    // Web push (VAPID) — subscribe/unsubscribe + manual test
    if (url.pathname === "/api/studio/crm/push/vapid" && request.method === "GET") {
      return requireStudio(request, env, () => handlePushVapid(env));
    }
    if (url.pathname === "/api/studio/crm/push/subscribe" && request.method === "POST") {
      return requireStudio(request, env, () => handlePushSubscribe(request, env));
    }
    if (url.pathname === "/api/studio/crm/push/subscribe" && request.method === "DELETE") {
      return requireStudio(request, env, () => handlePushUnsubscribe(request, env));
    }
    if (url.pathname === "/api/studio/crm/push/test" && request.method === "POST") {
      return requireStudio(request, env, () => handlePushTest(env));
    }

    // Worker-rendered public listing page (falls through to static /listings
    // index + 404s when there's no live listing at that slug).
    const listingPageMatch = url.pathname.match(/^\/listings\/([a-z0-9-]+)$/);
    if (listingPageMatch && request.method === "GET") {
      const listing = await findLiveListingBySlug(listingPageMatch[1], env);
      if (listing) {
        return new Response(renderListingPage(listing), {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=60",
          },
        });
      }
    }

    return env.ASSETS.fetch(request);
  },

  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runReminderSweep(env));
  },
} satisfies ExportedHandler<Env>;

// ============================================================
// Auth helpers
// ============================================================

function b64urlEncode(bytes: Uint8Array): string {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function signSession(secret: string, expSec: number): Promise<string> {
  const payload = JSON.stringify({ exp: expSec });
  const payloadBytes = new TextEncoder().encode(payload);
  const key = await hmacKey(secret);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, payloadBytes));
  return `${b64urlEncode(payloadBytes)}.${b64urlEncode(sig)}`;
}

async function verifySession(secret: string, token: string | null): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  try {
    const payloadBytes = b64urlDecode(parts[0]);
    const sig = b64urlDecode(parts[1]);
    const key = await hmacKey(secret);
    const valid = await crypto.subtle.verify("HMAC", key, sig, payloadBytes);
    if (!valid) return false;
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as { exp: number };
    if (typeof payload.exp !== "number") return false;
    return Math.floor(Date.now() / 1000) < payload.exp;
  } catch {
    return false;
  }
}

function readCookie(request: Request, name: string): string | null {
  const raw = request.headers.get("Cookie");
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

function sessionCookieHeader(value: string, maxAge: number): string {
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

// Constant-time string compare
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function requireStudio(
  request: Request,
  env: Env,
  next: () => Promise<Response> | Response
): Promise<Response> {
  if (!env.STUDIO_PASSWORD) {
    return jsonResponse({ error: "Studio not configured" }, 500);
  }
  const token = readCookie(request, SESSION_COOKIE);
  const ok = await verifySession(env.STUDIO_PASSWORD, token);
  if (!ok) return jsonResponse({ error: "unauthorized" }, 401);
  return next();
}

// ============================================================
// Studio handlers
// ============================================================

async function handleStudioLogin(request: Request, env: Env): Promise<Response> {
  if (!env.STUDIO_PASSWORD) {
    return jsonResponse({ error: "Studio not configured" }, 500);
  }
  try {
    const { password } = (await request.json()) as { password?: string };
    if (!password || !timingSafeEqual(password, env.STUDIO_PASSWORD)) {
      // Minor delay to slow brute force
      await new Promise((r) => setTimeout(r, 400));
      return jsonResponse({ error: "invalid password" }, 401);
    }
    const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
    const token = await signSession(env.STUDIO_PASSWORD, exp);
    return jsonResponse(
      { ok: true },
      200,
      { "Set-Cookie": sessionCookieHeader(token, SESSION_TTL_SECONDS) }
    );
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }
}

async function handleStudioWhoami(request: Request, env: Env): Promise<Response> {
  if (!env.STUDIO_PASSWORD) return jsonResponse({ authed: false, configured: false });
  const token = readCookie(request, SESSION_COOKIE);
  const ok = await verifySession(env.STUDIO_PASSWORD, token);
  return jsonResponse({ authed: ok, configured: true });
}

function handleStudioLogout(): Response {
  return jsonResponse(
    { ok: true },
    200,
    { "Set-Cookie": `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0` }
  );
}

interface WorkflowState {
  scriptReady?: boolean;
  recorded?: boolean;
  edited?: boolean;
  postedToYouTube?: boolean;
  youtubeUrl?: string | null;
  notes?: string;
  updatedAt?: string;
}

async function handleStudioStateList(env: Env): Promise<Response> {
  const out: Record<string, WorkflowState> = {};
  let cursor: string | undefined = undefined;
  do {
    const page: KVNamespaceListResult<unknown, string> = await env.STUDIO_KV.list({ cursor, limit: 1000 });
    cursor = page.list_complete ? undefined : page.cursor;
    await Promise.all(
      page.keys.map(async (k) => {
        if (k.name.includes(":")) return;
        const raw = await env.STUDIO_KV.get(k.name, "json");
        if (raw && typeof raw === "object") out[k.name] = raw as WorkflowState;
      })
    );
  } while (cursor);
  return jsonResponse({ state: out });
}

async function handleStudioStatePatch(
  slug: string,
  request: Request,
  env: Env
): Promise<Response> {
  let body: Partial<WorkflowState>;
  try {
    body = (await request.json()) as Partial<WorkflowState>;
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }
  const existingRaw = await env.STUDIO_KV.get(slug, "json");
  const existing = (existingRaw && typeof existingRaw === "object" ? existingRaw : {}) as WorkflowState;
  const next: WorkflowState = {
    scriptReady: body.scriptReady ?? existing.scriptReady,
    recorded: body.recorded ?? existing.recorded,
    edited: body.edited ?? existing.edited,
    postedToYouTube: body.postedToYouTube ?? existing.postedToYouTube,
    youtubeUrl: body.youtubeUrl !== undefined ? body.youtubeUrl : existing.youtubeUrl,
    notes: body.notes !== undefined ? body.notes : existing.notes,
    updatedAt: new Date().toISOString(),
  };
  await env.STUDIO_KV.put(slug, JSON.stringify(next));
  return jsonResponse({ state: next });
}

// Public endpoint — exposes ONLY youtubeUrl per slug (no status, no notes)
async function handlePublicBlogState(env: Env): Promise<Response> {
  const out: Record<string, { youtubeUrl: string }> = {};
  let cursor: string | undefined = undefined;
  do {
    const page: KVNamespaceListResult<unknown, string> = await env.STUDIO_KV.list({ cursor, limit: 1000 });
    cursor = page.list_complete ? undefined : page.cursor;
    await Promise.all(
      page.keys.map(async (k) => {
        if (k.name.includes(":")) return;
        const raw = (await env.STUDIO_KV.get(k.name, "json")) as WorkflowState | null;
        if (raw && raw.youtubeUrl) out[k.name] = { youtubeUrl: raw.youtubeUrl };
      })
    );
  } while (cursor);
  return new Response(JSON.stringify({ state: out }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      // Edge-cached briefly — public videos don't need to be instant
      "Cache-Control": "public, max-age=60",
      ...corsHeaders(),
    },
  });
}

// ============================================================
// Existing handlers (unchanged)
// ============================================================

function log(endpoint: string, status: "success" | "error", details: Record<string, unknown>) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    endpoint,
    status,
    ...details,
  }));
}

async function sendToFUB(apiKey: string, body: object): Promise<Response> {
  return fetch("https://api.followupboss.com/v1/events", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${apiKey}:`)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function handleStats(env: Env): Promise<Response> {
  if (!env.FOLLOW_UP_BOSS_API_KEY) {
    return jsonResponse({
      configured: false,
      error: "FOLLOW_UP_BOSS_API_KEY is not set. No leads have been delivered.",
    });
  }

  try {
    const res = await fetch("https://api.followupboss.com/v1/events?sort=-created&limit=100", {
      headers: {
        Authorization: `Basic ${btoa(`${env.FOLLOW_UP_BOSS_API_KEY}:`)}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return jsonResponse({ configured: true, error: `FUB API error: ${res.status}`, details: text });
    }

    const data = await res.json() as { _metadata?: { total: number }; events?: Array<{ id: number; created: string; source: string; type: string; message: string; personId: number }> };
    const events = data.events || [];

    const siteEvents = events.filter((e) => e.source === "brendavegarealty.com");

    return jsonResponse({
      configured: true,
      totalFUBEvents: data._metadata?.total || events.length,
      leadsFromSite: siteEvents.length,
      leads: siteEvents.map((e) => ({
        id: e.id,
        personId: e.personId,
        created: e.created,
        type: e.type,
        message: e.message,
        source: e.source,
      })),
    });
  } catch (err) {
    return jsonResponse({ configured: true, error: `Failed to query FUB: ${err}` });
  }
}

async function handleContact(request: Request, env: Env): Promise<Response> {
  try {
    const { name, email, phone, message, type } = await request.json() as {
      name: string;
      email: string;
      phone: string;
      message?: string;
      type?: string;
    };

    if (!name || !email || !phone) {
      log("/api/contact", "error", { reason: "missing_fields", name: !!name, email: !!email, phone: !!phone });
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    if (!env.FOLLOW_UP_BOSS_API_KEY) {
      log("/api/contact", "error", { reason: "no_api_key", leadName: name, leadEmail: email });
      return jsonResponse({ error: "CRM not configured" }, 500);
    }

    const nameParts = name.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const fubRes = await sendToFUB(env.FOLLOW_UP_BOSS_API_KEY, {
      source: "brendavegarealty.com",
      type: "Registration",
      person: {
        firstName,
        lastName,
        emails: [{ value: email }],
        phones: [{ value: phone }],
        tags: [type || "buyer", "contact-form"],
      },
      message: message || `New ${type || "buyer"} lead from contact form`,
    });

    if (!fubRes.ok) {
      const fubError = await fubRes.text();
      log("/api/contact", "error", { reason: "fub_rejected", fubStatus: fubRes.status, fubError, leadName: name });
      return jsonResponse({ error: "Failed to submit" }, 500);
    }

    log("/api/contact", "success", { leadName: name, leadEmail: email, type: type || "buyer" });
    return jsonResponse({ success: true });
  } catch (err) {
    log("/api/contact", "error", { reason: "exception", error: String(err) });
    return jsonResponse({ error: "Server error" }, 500);
  }
}

async function handleLead(request: Request, env: Env): Promise<Response> {
  try {
    const { name, email, phone, workingWithAgent, timeline, source, calculatorSummary } =
      await request.json() as {
        name: string;
        email: string;
        phone: string;
        workingWithAgent?: boolean;
        timeline?: string;
        source?: string;
        calculatorSummary?: Record<string, unknown>;
      };

    if (!name || !email || !phone) {
      log("/api/lead", "error", { reason: "missing_fields", source, name: !!name, email: !!email, phone: !!phone });
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    if (!env.FOLLOW_UP_BOSS_API_KEY) {
      log("/api/lead", "error", { reason: "no_api_key", source, leadName: name, leadEmail: email });
      return jsonResponse({ error: "CRM not configured" }, 500);
    }

    const nameParts = name.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const tags = [source || "website"];
    if (timeline) tags.push(`timeline-${timeline}`);
    if (workingWithAgent === false) tags.push("no-agent");
    if (workingWithAgent === true) tags.push("has-agent");

    let messageText = `Lead from ${source || "website"}`;
    if (timeline) messageText += ` | Timeline: ${timeline}`;
    if (workingWithAgent !== undefined) messageText += ` | Working with agent: ${workingWithAgent ? "Yes" : "No"}`;
    if (calculatorSummary) {
      const s = calculatorSummary;
      if (s.purchasePrice) messageText += ` | Budget: $${Number(s.purchasePrice).toLocaleString()}`;
      if (s.monthlyPayment) messageText += ` | Monthly: $${Number(s.monthlyPayment).toLocaleString()}`;
      if (s.qualificationStatus) messageText += ` | Status: ${s.qualificationStatus}`;
      if (s.city) messageText += ` | City: ${s.city}`;
    }

    const fubRes = await sendToFUB(env.FOLLOW_UP_BOSS_API_KEY, {
      source: "brendavegarealty.com",
      type: "Registration",
      person: {
        firstName,
        lastName,
        emails: [{ value: email }],
        phones: [{ value: phone }],
        tags,
      },
      message: messageText,
    });

    if (!fubRes.ok) {
      const fubError = await fubRes.text();
      log("/api/lead", "error", { reason: "fub_rejected", fubStatus: fubRes.status, fubError, leadName: name, source });
      return jsonResponse({ error: "Failed to submit" }, 500);
    }

    log("/api/lead", "success", { leadName: name, leadEmail: email, source, timeline });
    return jsonResponse({ success: true });
  } catch (err) {
    log("/api/lead", "error", { reason: "exception", source: "unknown", error: String(err) });
    return jsonResponse({ error: "Server error" }, 500);
  }
}
