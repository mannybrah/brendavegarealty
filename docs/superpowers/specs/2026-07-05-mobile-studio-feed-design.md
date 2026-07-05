# Mobile Studio, Live Feed & Design Polish — Design Spec

**Date:** 2026-07-05
**Status:** Approved for planning

## Problem

Brenda cannot update her own website. Blog posts live in `src/data/blog-posts.ts` (code), the homepage "Upcoming Event" section still advertises a March Easter Egg Hunt in July, and every content change requires DaVinci to edit code and deploy. Brenda asked for a mobile-first workflow: log in from her iPhone and easily post blog articles or Instagram-style updates to her front page.

## Goals

1. Brenda posts photo + caption updates ("Just Listed", "Just Sold", "Open House", general) from her iPhone; they appear on the homepage instantly — no deploy.
2. Brenda writes blog posts from her phone: rough notes → AI-polished SEO article → preview → publish. Live within minutes, statically rendered (SEO preserved).
3. Brenda controls a one-line announcement bar (on/off, text, optional link).
4. The homepage can never go stale again: the hardcoded event section is removed and replaced by the live feed.
5. A design/animation polish pass makes the site feel more considered, especially the new feed.

## Non-Goals (YAGNI)

- No Instagram/Meta API integration (she can cross-post manually).
- No likes/comments on feed posts.
- No multi-user auth — the existing shared `STUDIO_PASSWORD` HMAC-cookie session (30-day TTL) stays as-is.
- No editing of the 29 existing code-defined blog posts from the studio.
- No migration off static export. The site remains `output: "export"` + Cloudflare Worker.

## Architecture Overview

Extends the proven pattern already in production (studio → KV → public runtime fetch, used today for YouTube embeds). Three layers:

```
iPhone (/studio PWA)
   │  authed fetch
   ▼
Cloudflare Worker (src/worker.ts)
   ├── KV STUDIO_KV ........ feed posts, announcement, blog drafts/published
   ├── R2 MEDIA (new) ...... uploaded photos, served at /media/<key>
   ├── Claude API .......... blog polish (secret ANTHROPIC_API_KEY)
   └── GitHub API .......... workflow_dispatch on publish (secret GITHUB_DISPATCH_TOKEN)
   ▼
Public site
   ├── Feed section + announcement bar: runtime fetch (instant)
   └── Blog posts: merged into static build via prebuild KV fetch (~3 min)
```

## Data Model (KV keys)

- `feed:posts` — JSON array, newest first. One author, low write volume; last-write-wins on a single key is acceptable.
  `{ id, type: "update"|"just-listed"|"just-sold"|"open-house", caption, imageKeys: string[], createdAt }`
- `announcement` — `{ text, link?, active: boolean, updatedAt }`
- `blogdraft:<id>` — `{ id, slug, title, category, rawNotes, heroImageKey?, polished?: { title, excerpt, metaDescription, keywords, contentHtml, readTime, videoScript }, status: "draft"|"polished"|"published", createdAt, publishedAt? }`
- `blog:published` — JSON array of published draft ids (index for the build script and studio list).

R2 bucket `bvr-media`, worker binding `MEDIA`. Keys: `feed/<id>/<n>.jpg`, `blog/<id>/hero.jpg`.

## API (all under existing worker routing)

Public (no auth):
- `GET /api/public/home-state` — `{ announcement, feedPosts }` in one call (homepage makes a single fetch). Cache-Control: short (60s) public cache.
- `GET /media/<key>` — serves R2 object, long immutable cache (keys are content-unique).

Studio (behind existing `requireStudio`):
- `POST /api/studio/upload` — multipart image → R2, returns `{ key }`. Reject > 10 MB. Client resizes to max 1600px JPEG before upload (canvas) so cellular uploads stay fast.
- `POST /api/studio/feed` / `PATCH /api/studio/feed/<id>` / `DELETE /api/studio/feed/<id>` — create/edit/delete feed posts.
- `PUT /api/studio/announcement` — set text/link/active.
- `POST /api/studio/blog` — create draft from `{ title, category, rawNotes }`.
- `POST /api/studio/blog/<id>/polish` — worker calls Claude API (model `claude-sonnet-5`) with her notes + a style prompt derived from existing posts (tone, structure, South Bay focus, category conventions) → fills `polished` (including the 30–60s `videoScript`, so new posts flow into her existing video calendar automatically). Draft saved BEFORE the call — her notes are never lost if the API fails.
- `PATCH /api/studio/blog/<id>` — edit polished fields inline.
- `POST /api/studio/blog/<id>/publish` — set status published, append to `blog:published`, then fire GitHub `workflow_dispatch` on `daily-deploy.yml`. If the dispatch fails, the post is already in KV and the existing 07:05 PT daily deploy publishes it next morning — the failure mode is "delayed", never "lost".
- `GET /api/studio/blog` — list drafts + published for the studio.

New worker secrets: `ANTHROPIC_API_KEY`, `GITHUB_DISPATCH_TOKEN` (fine-grained PAT, `actions:write` on mannybrah/brendavegarealty only).

## Blog Build Integration

- New prebuild script `scripts/fetch-kv-posts.mjs` runs before `next build` (package.json `prebuild`): fetches published drafts from KV via the Cloudflare REST API (`CLOUDFLARE_API_TOKEN` — extend existing GH Actions token with KV read if needed) and writes `src/data/kv-posts.json` (committed as empty array `[]` fallback for local dev without creds).
- `src/data/blog-posts.ts` exports `[...kvPosts, ...existingPosts]` mapped to the same `BlogPost` interface. Existing future-date filtering and noindex behavior apply unchanged.

## Studio: Mobile-First Redesign

`/studio` becomes a phone-first app (desktop still works — single column, max-width):

- **Home:** four large tap targets — "Post an Update", "Write a Blog", "Announcement", "Video Calendar" — plus recent activity (latest feed posts, draft blogs with status).
- **Post an Update:** photo picker (`<input accept="image/*">` opens iPhone camera/library), 1–4 photos, type badge selector, caption, Post. Optimistic UI; posted item visible immediately.
- **Write a Blog:** title + category + free-text notes → "Polish with AI" (loading state ~15s) → rendered preview with editable title/excerpt/body → "Publish" or "Save draft". Re-polish allowed.
- **Announcement:** text field, optional link, on/off toggle, live preview of the bar.
- **Video Calendar:** the existing workflow tracker moves to `/studio/calendar` unchanged.
- **PWA:** `manifest.json` (standalone display, brand colors, icon) + apple-touch-icon so Brenda adds it to her Home Screen and it opens like an app, already authenticated (30-day cookie). `robots.txt` already disallows `/studio`.
- `StudioChrome` continues to hide public navbar/footer/CTA on `/studio/*`.

## Public Site Changes

- **Remove `UpcomingEvent`** (the stale Easter section) from the homepage.
- **New `FeedSection`** in its place: "Latest from Brenda" — Instagram-style cards (photo, gold type badge, caption, relative timestamp). Horizontal swipe strip on mobile, 3-column grid (up to 6 posts) on desktop. Client component fetching `/api/public/home-state`; renders nothing (no layout shift beyond a reserved skeleton) if fetch fails or feed is empty — the site never breaks on API trouble.
- **New `/updates` page:** static shell listing all feed posts client-side; FeedSection links "See all updates".
- **Announcement bar:** slim navy/gold bar above the navbar when `active`; dismissible per session (sessionStorage). The bar is the only surface for announcements — they do not appear in the feed.

## Design & Animation Polish Pass

- **StatsBar count-up:** $1.5M / 100% / 4+ animate up on first scroll into view.
- **Staggered entrances:** FeaturedListings cards, AreasPreview cards, and feed cards cascade (~80ms stagger) instead of one block fade.
- **Hero entrance sequence:** kicker → headline → subtext → buttons in a quick choreographed load sequence.
- **Micro-interactions:** subtle card hover/tap lift, button press scale, navbar frosted-glass blur once scrolled.
- **Fixes:** cookie banner must not overlap the mobile sticky CTA bar (stack above it); all animations (including existing `AnimateOnScroll`) respect `prefers-reduced-motion` via framer-motion's `useReducedMotion`.

## Error Handling Summary

| Failure | Behavior |
|---|---|
| Image upload fails / too large | Inline error, retry; client-side resize keeps payloads small |
| Claude API error/timeout | Draft (raw notes) already saved; show retry |
| GitHub dispatch fails | Post live on site after next daily 07:05 deploy; studio shows "publishing — live by tomorrow morning" |
| KV/R2 unavailable publicly | Feed section renders skeleton/empty; announcement bar hidden; rest of site static and unaffected |

## Testing & Verification

- Worker endpoints exercised via `wrangler dev` (local KV/R2 simulation) — auth required on all studio routes, public routes cacheable.
- UI verified at iPhone viewport (390px): post an update end-to-end → appears on homepage; write → polish → publish a blog → GH action runs → post statically rendered with correct meta tags.
- Animation pass verified visually (desktop + mobile) and with `prefers-reduced-motion` emulation.
- Existing behavior regression check: YouTube embed flow, contact/lead forms, daily deploy.

## Costs

R2 and KV usage sit inside Cloudflare's included tiers at this scale. Claude polish ≈ cents per post at 3 posts/week. No new paid services.
