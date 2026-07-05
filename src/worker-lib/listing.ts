import { Env } from "./env";
import { corsHeaders, jsonResponse } from "./http";
import { deleteMediaKeys } from "./media";
import { callClaude } from "./claude";
import { FEED_KEY, readFeed } from "./feed";
import { FeedPost } from "../lib/feed";
import { sanitizeContentHtml } from "../lib/blogPolish";
import {
  Listing,
  ListingStatus,
  LISTING_STATUSES,
  OpenHouse,
  extractRelaPhotoUrls,
  listingSlug,
  stripHtmlToText,
  EXTRACT_SYSTEM,
  EXTRACT_OUTPUT_SCHEMA,
  buildExtractPrompt,
  parseExtractResponse,
} from "../lib/listing";

const LISTING_PREFIX = "listing:";
const INDEX_KEY = "listing:index";

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

interface ListingIndexEntry {
  id: string;
  slug: string;
  status: ListingStatus;
  live: boolean;
  createdAt: string;
}

function listingKey(id: string): string {
  return `${LISTING_PREFIX}${id}`;
}

async function readIndex(env: Env): Promise<ListingIndexEntry[]> {
  const raw = await env.STUDIO_KV.get(INDEX_KEY, "json");
  return Array.isArray(raw) ? (raw as ListingIndexEntry[]) : [];
}

async function writeIndex(index: ListingIndexEntry[], env: Env): Promise<void> {
  await env.STUDIO_KV.put(INDEX_KEY, JSON.stringify(index));
}

async function getListing(id: string, env: Env): Promise<Listing | null> {
  const raw = await env.STUDIO_KV.get(listingKey(id), "json");
  return raw && typeof raw === "object" ? (raw as Listing) : null;
}

async function putListing(listing: Listing, env: Env): Promise<void> {
  await env.STUDIO_KV.put(listingKey(listing.id), JSON.stringify(listing));
}

async function syncIndexEntry(listing: Listing, env: Env): Promise<void> {
  const index = await readIndex(env);
  const idx = index.findIndex((e) => e.id === listing.id);
  if (idx === -1) return;
  index[idx] = { ...index[idx], slug: listing.slug, status: listing.status, live: listing.live };
  await writeIndex(index, env);
}

function uniqueSlug(base: string, index: ListingIndexEntry[]): string {
  const existing = new Set(index.map((e) => e.slug));
  if (!existing.has(base)) return base;
  let n = 2;
  while (existing.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

function validateOpenHouses(input: unknown[]): OpenHouse[] | null {
  const out: OpenHouse[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") return null;
    const o = item as Record<string, unknown>;
    if (typeof o.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(o.date)) return null;
    if (typeof o.start !== "string" || !/^\d{2}:\d{2}$/.test(o.start)) return null;
    if (typeof o.end !== "string" || !/^\d{2}:\d{2}$/.test(o.end)) return null;
    out.push({ date: o.date, start: o.start, end: o.end });
  }
  return out;
}

// Downloads photos into R2 in parallel batches of 5, skipping any that fail
// to fetch or aren't images. Keys are numbered by successful-import order.
async function importListingPhotos(urls: string[], id: string, env: Env): Promise<string[]> {
  const keys: string[] = [];
  for (let i = 0; i < urls.length; i += 5) {
    const batch = urls.slice(i, i + 5);
    const fetched = await Promise.all(
      batch.map(async (url) => {
        try {
          const res = await fetch(url, {
            headers: { "User-Agent": DESKTOP_UA },
            signal: AbortSignal.timeout(15000),
          });
          if (!res.ok) return null;
          const contentType = res.headers.get("content-type") || "";
          if (!contentType.startsWith("image/")) return null;
          return { bytes: await res.arrayBuffer(), contentType };
        } catch {
          return null;
        }
      })
    );
    for (const item of fetched) {
      if (!item) continue;
      const key = `listing/${id}/${keys.length}.jpg`;
      await env.MEDIA.put(key, item.bytes, { httpMetadata: { contentType: item.contentType } });
      keys.push(key);
    }
  }
  return keys;
}

// ============================================================
// Extract
// ============================================================

export async function handleListingExtract(request: Request, env: Env): Promise<Response> {
  let body: { url?: string };
  try {
    body = (await request.json()) as { url?: string };
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url || url.length > 300 || !/^https?:\/\//i.test(url)) {
    return jsonResponse({ error: "provide a valid http(s) URL (max 300 characters)" }, 400);
  }

  let html: string;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": DESKTOP_UA },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`upstream status ${res.status}`);
    html = await res.text();
  } catch (err) {
    console.log(JSON.stringify({ endpoint: "listing/extract", status: "error", step: "fetch", reason: String(err) }));
    return jsonResponse({ error: "Could not load that listing page — check the URL and try again" }, 502);
  }

  const id = crypto.randomUUID();
  const photoUrls = extractRelaPhotoUrls(html);
  const photoKeys = await importListingPhotos(photoUrls, id, env);

  let fields: ReturnType<typeof parseExtractResponse> | null = null;
  let extractionFailed = false;

  if (!env.ANTHROPIC_API_KEY || env.ANTHROPIC_API_KEY === "placeholder") {
    extractionFailed = true;
  } else {
    const pageText = stripHtmlToText(html);
    const result = await callClaude(
      env,
      {
        model: "claude-sonnet-5",
        max_tokens: 4000,
        thinking: { type: "disabled" },
        system: EXTRACT_SYSTEM,
        output_config: { format: { type: "json_schema", schema: EXTRACT_OUTPUT_SCHEMA } },
        messages: [{ role: "user", content: buildExtractPrompt(pageText) }],
      },
      "listing/extract"
    );
    if (result instanceof Response) {
      extractionFailed = true;
    } else {
      try {
        fields = parseExtractResponse(result);
      } catch (err) {
        console.log(
          JSON.stringify({ endpoint: "listing/extract", status: "error", step: "parse", reason: String(err) })
        );
        extractionFailed = true;
      }
    }
  }

  const index = await readIndex(env);
  const address = fields?.address ?? "";
  const city = fields?.city ?? "";
  const slug = uniqueSlug(listingSlug(address || "new-listing", city), index);

  const now = new Date().toISOString();
  const listing: Listing = {
    id,
    slug,
    status: "just-listed",
    address,
    city,
    price: fields?.price ?? "",
    beds: fields?.beds ?? null,
    baths: fields?.baths ?? null,
    sqft: fields?.sqft ?? null,
    lotSize: fields?.lotSize || undefined,
    description: fields?.description ?? "",
    features: fields?.features ?? [],
    photoKeys,
    coverIndex: 0,
    openHouses: [],
    sourceUrl: url,
    createdAt: now,
    updatedAt: now,
    live: false,
  };

  await putListing(listing, env);
  index.unshift({ id, slug, status: listing.status, live: false, createdAt: now });
  await writeIndex(index, env);

  return jsonResponse(extractionFailed ? { listing, extractionFailed: true } : { listing });
}

// ============================================================
// CRUD
// ============================================================

export async function handleListingList(env: Env): Promise<Response> {
  const index = await readIndex(env); // newest first, maintained on write
  const listings = (await Promise.all(index.map((e) => getListing(e.id, env)))).filter(
    (l): l is Listing => l !== null
  );
  return jsonResponse({ listings });
}

export async function handleListingGet(id: string, env: Env): Promise<Response> {
  const listing = await getListing(id, env);
  if (!listing) return jsonResponse({ error: "not found" }, 404);
  return jsonResponse({ listing });
}

export async function handleListingPatch(id: string, request: Request, env: Env): Promise<Response> {
  const listing = await getListing(id, env);
  if (!listing) return jsonResponse({ error: "not found" }, 404);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: "bad request" }, 400);
  }

  if (typeof body.address === "string") listing.address = body.address.trim();
  if (typeof body.city === "string") listing.city = body.city.trim();
  if (typeof body.price === "string") listing.price = body.price.trim();
  if (body.beds === null || typeof body.beds === "number") listing.beds = body.beds as number | null;
  if (body.baths === null || typeof body.baths === "number") listing.baths = body.baths as number | null;
  if (body.sqft === null || typeof body.sqft === "number") listing.sqft = body.sqft as number | null;
  if (typeof body.lotSize === "string") listing.lotSize = body.lotSize.trim() || undefined;
  if (typeof body.description === "string") listing.description = sanitizeContentHtml(body.description);

  if (Array.isArray(body.features) && body.features.every((f) => typeof f === "string")) {
    listing.features = (body.features as string[]).map((f) => f.trim()).filter(Boolean);
  }

  if (typeof body.status === "string" && (LISTING_STATUSES as readonly string[]).includes(body.status)) {
    listing.status = body.status as ListingStatus;
  }

  if (Array.isArray(body.openHouses)) {
    const valid = validateOpenHouses(body.openHouses);
    if (!valid) return jsonResponse({ error: "invalid openHouses — each needs date/start/end" }, 400);
    listing.openHouses = valid;
  }

  if (Array.isArray(body.photoKeys)) {
    const existingSet = new Set(listing.photoKeys);
    const nextKeys = body.photoKeys;
    const allKnown = nextKeys.every((k) => typeof k === "string" && existingSet.has(k));
    if (!allKnown) {
      return jsonResponse({ error: "photoKeys must be an order/subset of existing photos" }, 400);
    }
    const nextSet = new Set(nextKeys as string[]);
    const removed = listing.photoKeys.filter((k) => !nextSet.has(k));
    if (removed.length) await deleteMediaKeys(removed, env);
    listing.photoKeys = nextKeys as string[];
  }

  if (typeof body.coverIndex === "number") listing.coverIndex = body.coverIndex;
  // Always keep coverIndex in range, even if only photoKeys changed.
  if (listing.photoKeys.length === 0) {
    listing.coverIndex = 0;
  } else {
    listing.coverIndex = Math.min(Math.max(0, Math.floor(listing.coverIndex)), listing.photoKeys.length - 1);
  }

  // Slug is editable only while the listing is a draft; once live it's the
  // published URL and must not move.
  if (typeof body.slug === "string" && !listing.live) {
    const slug = body.slug.trim();
    if (!/^[a-z0-9-]+$/.test(slug)) return jsonResponse({ error: "invalid slug" }, 400);
    const index = await readIndex(env);
    const clash = index.find((e) => e.slug === slug && e.id !== id);
    if (clash) return jsonResponse({ error: "slug already in use" }, 409);
    listing.slug = slug;
  }

  listing.updatedAt = new Date().toISOString();
  await putListing(listing, env);
  await syncIndexEntry(listing, env);
  return jsonResponse({ listing });
}

export async function handleListingDelete(id: string, env: Env): Promise<Response> {
  const listing = await getListing(id, env);
  if (!listing) return jsonResponse({ error: "not found" }, 404);
  if (listing.live) return jsonResponse({ error: "unpublish before deleting a live listing" }, 409);

  await deleteMediaKeys(listing.photoKeys, env);
  await env.STUDIO_KV.delete(listingKey(id));
  const index = await readIndex(env);
  await writeIndex(
    index.filter((e) => e.id !== id),
    env
  );
  return jsonResponse({ ok: true });
}

// ============================================================
// Publish / unpublish
// ============================================================

export async function handleListingPublish(id: string, request: Request, env: Env): Promise<Response> {
  const listing = await getListing(id, env);
  if (!listing) return jsonResponse({ error: "not found" }, 404);

  let body: { crossPost?: boolean } = {};
  try {
    body = (await request.json()) as { crossPost?: boolean };
  } catch {
    // No/invalid body is fine — crossPost defaults to falsy.
  }

  listing.live = true;
  listing.publishedAt =
    listing.publishedAt ?? new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  listing.updatedAt = new Date().toISOString();
  await putListing(listing, env);
  await syncIndexEntry(listing, env);

  let crossPosted = false;
  if (body.crossPost) {
    const cover = listing.photoKeys[listing.coverIndex] ?? listing.photoKeys[0];
    let caption = `Just Listed — ${listing.address}, ${listing.city}`;
    if (listing.price) caption += ` | ${listing.price}`;
    const post: FeedPost = {
      id: crypto.randomUUID(),
      type: "just-listed",
      caption,
      imageKeys: cover ? [cover] : [],
      createdAt: new Date().toISOString(),
    };
    const posts = await readFeed(env);
    posts.unshift(post);
    await env.STUDIO_KV.put(FEED_KEY, JSON.stringify(posts));
    crossPosted = true;
  }

  return jsonResponse({ listing, crossPosted });
}

export async function handleListingUnpublish(id: string, env: Env): Promise<Response> {
  const listing = await getListing(id, env);
  if (!listing) return jsonResponse({ error: "not found" }, 404);
  listing.live = false;
  listing.updatedAt = new Date().toISOString();
  await putListing(listing, env);
  await syncIndexEntry(listing, env);
  return jsonResponse({ listing });
}

// ============================================================
// Public
// ============================================================

export async function handlePublicListings(env: Env): Promise<Response> {
  const index = await readIndex(env);
  const liveEntries = index.filter((e) => e.live);
  const listings = (await Promise.all(liveEntries.map((e) => getListing(e.id, env)))).filter(
    (l): l is Listing => l !== null
  );
  listings.sort((a, b) => (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt));

  return new Response(JSON.stringify({ listings }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60",
      ...corsHeaders(),
    },
  });
}

// Used by the /listings/<slug> worker route to find a live listing by slug
// without a full KV scan.
export async function findLiveListingBySlug(slug: string, env: Env): Promise<Listing | null> {
  const index = await readIndex(env);
  const entry = index.find((e) => e.slug === slug && e.live);
  if (!entry) return null;
  return getListing(entry.id, env);
}
