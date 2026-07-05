# Listing Pages from Pasted URLs + High-End Polish — Design Spec

**Date:** 2026-07-05
**Status:** Approved direction (DaVinci confirmed the paste-a-listing-site flow; example input: 15540armsby.com)

## Problem

Brenda's listings live on single-property marketing sites (Rela platform, e.g. `15540armsby.com`), but her own website shows three fake placeholder listing cards — the single biggest "template site" tell. She needs to paste a listing URL into her mobile studio and get a real listing page on brendavegarealty.com with photos, facts, description, and open houses, plus the homepage section fed by real data.

## Goals

1. Studio "Add a Listing": paste URL → auto-extract (photos, address, price, beds/baths/sqft, description) → editable preview → Publish. Live instantly.
2. Public listing pages at `/listings/<slug>` — worker-rendered at request time (instant publish/edit, no rebuild).
3. Homepage "Latest listings" section replaces placeholders with real listings (runtime fetch, like the feed).
4. Open houses: Brenda adds date/time ranges; shown on the listing page; past ones auto-hide.
5. Status lifecycle: `just-listed` → `open-house` → `pending` → `sold`. Sold listings move to a "Recently Sold" strip (social proof).
6. Optional one-tap feed cross-post on publish ("Just Listed …" + cover photo).
7. Quick high-end polish pass: gold hairline section dividers, sharper card corners (rounded-2xl → rounded-md on cards/photos), slim bottom-bar cookie consent, nav trimmed to 6 items, signature/pull-quote block under hero (SVG signature placeholder until Brenda supplies one).

## Non-Goals

- No Zillow/Redfin/Realtor.com scraping (bot-blocked, ToS-hostile).
- No IDX/MLS integration in this phase.
- No automated open-house discovery — Brenda enters times manually.
- Photographic area cards + lifestyle imagery: deferred until real photos are supplied.

## Extraction (validated against 15540armsby.com)

- Worker fetches the pasted URL server-side (desktop UA). Rela pages return full HTML, no JS wall.
- Photo URLs: `https://media.relahq.com/...` matches in HTML; style-variant path segments (e.g. `styles/kb_full/`) normalized to the largest available; agent-headshot/favicon URLs filtered out (keep `prop-nid` / property-images paths). Cap 40 photos.
- Structured fields via Claude (`claude-sonnet-5`, structured outputs, `thinking: disabled`): feed the stripped HTML text (≤50k chars) → `{ address, city, price (string, may be ""), beds, baths, sqft, lotSize, description, features[] }`. AI extraction is best-effort; EVERYTHING is editable in the preview before publish.
- Photos are downloaded by the worker and stored in R2 under `listing/<id>/<n>.jpg` (re-served from `/media/…` — no hotlinking Rela's CDN). Downloads happen in batches; failures skip the photo.

## Data Model

KV `listing:<id>` (JSON):
`{ id, slug, status: "just-listed"|"open-house"|"pending"|"sold", address, city, price, beds, baths, sqft, lotSize?, description, features: string[], photoKeys: string[], coverIndex: number, openHouses: [{date: "YYYY-MM-DD", start: "13:00", end: "16:00"}], sourceUrl, publishedAt?, createdAt, updatedAt, live: boolean }`
KV `listing:index` — array of `{id, slug, status, live}` for cheap listing/ordering (same single-author last-write-wins tradeoff as feed).

## API (worker)

- `POST /api/studio/listing/extract` `{url}` → fetch + extract + photo import → creates a draft listing (live:false) → `{listing}` (auth; long-running ~30–60s)
- `GET /api/studio/listing` → all listings; `GET/PATCH/DELETE /api/studio/listing/<id>` (PATCH edits any field incl. openHouses, status, live, photo order; DELETE only when live:false, removes R2 photos)
- `POST /api/studio/listing/<id>/publish` `{crossPost?: boolean}` → live:true, publishedAt, optional feed post
- `GET /api/public/listings` → live listings (60s cache) for homepage/updates surfaces

## Worker-rendered pages

- `GET /listings/<slug>` → worker renders full HTML (brand-styled template string module `src/worker-lib/listingPage.ts`): sticky gallery hero (cover + thumbnail grid, lightbox-lite via anchor scroll), facts bar (beds/baths/sqft/price), description, features list, open-house block (future dates only, Pacific), Brenda CTA block, JSON-LD (`RealEstateListing`, `<` escaped). `Cache-Control: public, max-age=60`. 404 → falls through to static 404.
- `GET /listings` (index) stays the static Next page BUT its content switches to client-fetch of `/api/public/listings` (active + recently sold sections); static shell keeps SEO title/meta.
- Homepage `FeaturedListings` → client component fetching `/api/public/listings` (top 3 live, newest first); renders nothing if none (no more fake cards); links to worker-rendered detail pages.

## Studio UI

- Home gains 5th card "Add a Listing" → `/studio/listings` (list w/ status pills) → `/studio/listings/new` (paste URL + Extract button w/ progress) → `/studio/listings/edit?id=` (photo grid w/ cover pick + remove, all fields editable, open-house rows add/remove, status selector, Publish/Unpublish, cross-post toggle).
- Conventions: `cache:"no-store"` on studio reads, 401→reload, confirm() on destructive actions.

## Polish pass (same release)

Hairline dividers (`border-t border-gold/20` between homepage sections), `rounded-2xl→rounded-md` on cards/images (Feed cards, listings, blog cards, areas), cookie consent → slim full-width bottom bar above mobile CTA, nav: Home/About/Listings/Areas/Blog/Contact (Testimonials under About anchor, Calculators under Blog dropdown or footer), signature block under hero (Cormorant italic pull-quote + name, SVG slot).

## Error handling

Extract failures (fetch error, no photos found, AI parse fail) → clear studio error, draft not created or created empty for manual fill. Photo import partial failures tolerated (skip). Worker page render guards missing fields. Unpublish (live:false) instead of delete for published listings.

## Testing

Pure-lib jest: photo-URL extraction/filter/normalization, slug/address parsing, open-house future filter (Pacific), extraction-schema parse. wrangler-dev curl: extract against a saved Rela HTML fixture (no live dependency), CRUD, publish, public endpoint, page render. Visual pass at 390/1440.
