# CRM + Deals + Client Portal — Design Spec

**Date:** 2026-07-18
**Status:** Approved scope, pending user spec review
**Replaces:** Follow Up Boss (broker-supplied CRM, access lost when Brenda left her broker)

## 1. Problem & Goals

Brenda left her broker and lost Follow Up Boss. Today the worker forwards every
website lead to FUB and **returns 500 / drops the lead if the FUB key is dead** —
which it now is. Nothing is persisted locally.

Build a self-hosted CRM inside the existing site (Cloudflare Worker + `/studio`
PWA) with **zero subscription cost**, computer- and mobile-friendly:

1. **Lead inbox + contacts** — every website lead lands in her own database
   automatically; manual add; FUB CSV import of her existing book of business.
2. **Pipeline stages** — track people New → Closed.
3. **Tasks + reminders** — to-dos with due dates; in-app views + Web Push to her
   iPhone (studio is already an installed PWA).
4. **Deals / transaction tracking** — when a lead becomes a buyer or seller,
   a milestone checklist (inspections, paperwork, signing, open houses, close)
   with dated reminders.
5. **Client portal** — a private per-deal link her client opens to see where
   they are in the process. No accounts.

**Out of scope (v1):** drip/auto email sequences, document sharing in the
portal, portal chat, email sending of any kind, multi-agent support.

## 2. Architecture

- **Storage:** new Cloudflare **D1** database `bvr-crm`, binding `CRM_DB`.
  Existing KV (blog/feed/listings/video state) untouched. Migrations in
  `migrations/*.sql` applied via `wrangler d1 migrations apply`.
- **API:** new studio-gated routes `/api/studio/crm/*` in `src/worker.ts`
  (existing `requireStudio()` cookie auth), handlers in new
  `src/worker-lib/crm.ts` (+ `crmPortal.ts`, `push.ts`).
- **UI:** new pages under `src/app/studio/crm/*` using existing `StudioShell`,
  `useStudioAuth`, `credentials:"include"` + `cache:"no-store"` conventions.
  Studio remains the PWA Brenda has installed; layout is mobile-first (640px
  shell) and fine on desktop.
- **Portal:** worker-rendered HTML at `GET /portal/:token` (same approach as
  `/listings/:slug` via `listingPage.ts`) — instant updates from D1, no
  rebuild, `noindex`.
- **Cron:** add `[triggers] crons = ["*/15 * * * *"]` to `wrangler.toml`; a
  `scheduled()` handler sends due-task/milestone push reminders.
- **FUB removal:** delete `sendToFUB` path from `handleContact`/`handleLead`;
  repoint `GET /api/stats` at D1; legacy `functions/api/*.js` and
  `src/lib/follow-up-boss.ts` deleted.

## 3. Data model (D1)

```sql
contacts (
  id TEXT PRIMARY KEY,            -- uuid
  first_name TEXT, last_name TEXT,
  email TEXT, phone TEXT,         -- normalized: phone digits-only for matching
  type TEXT,                      -- buyer | seller | both | other
  stage TEXT NOT NULL DEFAULT 'new',
    -- new | contacted | active | under_contract | closed | sphere | archived
  source TEXT,                    -- contact-form | qualification-calculator |
                                  -- cost-calculator | scheduler | phone-call |
                                  -- import | manual
  tags TEXT,                      -- JSON array
  notes TEXT,                     -- freeform "background" field (FUB import target)
  created_at TEXT, updated_at TEXT, last_activity_at TEXT
)
events (                          -- per-contact activity timeline
  id TEXT PRIMARY KEY, contact_id TEXT NOT NULL,
  kind TEXT NOT NULL,             -- lead_submission | note | call | text | email |
                                  -- stage_change | task_done | deal | system
  body TEXT, meta TEXT,           -- meta = JSON (e.g. calculatorSummary, timeline answers)
  created_at TEXT
)
tasks (
  id TEXT PRIMARY KEY,
  contact_id TEXT,                -- nullable: general to-dos allowed
  deal_id TEXT,                   -- nullable: set when generated from a milestone
  milestone_id TEXT,              -- nullable
  title TEXT NOT NULL,
  due_at TEXT,                    -- ISO datetime, Pacific-entered
  done_at TEXT, notified_at TEXT, -- notified_at prevents duplicate push
  created_at TEXT
)
deals (
  id TEXT PRIMARY KEY, contact_id TEXT NOT NULL,
  side TEXT NOT NULL,             -- buyer | seller
  property_address TEXT, status TEXT NOT NULL DEFAULT 'active',
    -- active | pending | closed | cancelled
  target_close_date TEXT,
  portal_token TEXT UNIQUE,       -- 22-char base62 random; NULL = portal off
  created_at TEXT, updated_at TEXT
)
milestones (
  id TEXT PRIMARY KEY, deal_id TEXT NOT NULL,
  title TEXT NOT NULL,
  kind TEXT,                      -- inspection | appraisal | paperwork | signing |
                                  -- open_house | contingency | walkthrough | close | custom
  date TEXT,                      -- ISO date or datetime; nullable (undated step)
  status TEXT NOT NULL DEFAULT 'upcoming',  -- upcoming | done | skipped
  client_visible INTEGER NOT NULL DEFAULT 1,
  notes TEXT, sort_order INTEGER,
  reminded_day_before TEXT, reminded_day_of TEXT,  -- push dedupe stamps
  created_at TEXT, updated_at TEXT
)
push_subscriptions (
  id TEXT PRIMARY KEY, endpoint TEXT UNIQUE,
  p256dh TEXT, auth TEXT, device_label TEXT,
  created_at TEXT, last_ok_at TEXT
)
```

Indexes: `contacts(stage)`, `contacts(email)`, `contacts(phone)`,
`events(contact_id, created_at)`, `tasks(due_at) WHERE done_at IS NULL`,
`deals(portal_token)`, `milestones(deal_id, sort_order)`.

## 4. Lead intake changes (public endpoints)

`POST /api/contact` and `POST /api/lead` (`src/worker.ts`):

1. **Dedupe/merge:** look up contact by normalized email OR phone. Match →
   append `lead_submission` event, bump `last_activity_at`, resurface stage to
   `new` if it was `archived`. No match → create contact (stage `new`).
2. **Auto-task:** create "Respond to {name}" due same day (only if no open
   respond-task already exists for that contact).
3. **Push:** fire-and-forget "New lead: {name} · {source}" to all subscriptions.
4. **FUB code removed.** D1 write failure → 500 (the lead-gate modal already
   fail-opens and retries from localStorage; the contact form shows its error
   state). Push/notification failure never blocks the 200 response.
5. `GET /api/stats` reads counts from D1 instead of FUB events.

## 5. Studio API routes (all `requireStudio`)

```
GET    /api/studio/crm/summary                 -- new-lead count, due-today count (dashboard strip)
GET    /api/studio/crm/contacts?q=&stage=      -- inbox list (sorted last_activity_at desc)
POST   /api/studio/crm/contacts                -- manual add
GET|PATCH|DELETE /api/studio/crm/contacts/:id  -- detail incl. events, tasks, deals
POST   /api/studio/crm/contacts/:id/events     -- add note / log call/text/email
GET    /api/studio/crm/tasks?view=today|upcoming|done
POST   /api/studio/crm/tasks                   -- quick add
PATCH|DELETE /api/studio/crm/tasks/:id         -- edit / complete / delete
POST   /api/studio/crm/deals                   -- create (contactId, side, address) → template milestones
GET|PATCH|DELETE /api/studio/crm/deals/:id     -- detail incl. milestones
POST   /api/studio/crm/deals/:id/milestones    -- add custom milestone
PATCH|DELETE /api/studio/crm/milestones/:id    -- date/status/visibility/rename/reorder
POST   /api/studio/crm/deals/:id/portal        -- enable / regenerate token
DELETE /api/studio/crm/deals/:id/portal        -- disable portal
POST   /api/studio/crm/import                  -- CSV rows (parsed client-side) → dedupe+insert, returns counts
POST   /api/studio/crm/push/subscribe          -- store PushSubscription
DELETE /api/studio/crm/push/subscribe          -- remove by endpoint
GET    /api/studio/crm/push/vapid              -- public VAPID key
Public: GET /portal/:token                     -- worker-rendered portal page (no auth)
```

Stage changes go through `PATCH contacts/:id` and write a `stage_change` event.

## 6. Studio UI

- **`/studio` home:** add "Clients" card to `ACTIONS` grid + a summary strip
  above the grid (🔵 N new leads · ✅ N due today) fed by `/crm/summary`.
- **`/studio/crm` — Lead inbox:** search box (name/email/phone), stage filter
  chips, rows = name, source badge, stage pill, relative time. New leads
  pinned in a "New" section on top. FAB/+ button → add contact.
- **`/studio/crm/contact/[id]`:** header with tap-to-call / SMS / email
  buttons (`tel:` / `sms:` / `mailto:`), stage stepper (tap to advance/set),
  editable fields, deals section (+ Start deal), open tasks (+ quick add),
  activity timeline with add-note box.
- **`/studio/crm/pipeline`:** contacts grouped by stage — horizontal kanban
  columns on ≥768px, stacked stage sections on mobile. Tap-to-move stage
  (action sheet), no drag-and-drop.
- **`/studio/crm/tasks`:** Overdue / Today / Upcoming / Done groups, checkbox
  complete, quick-add (title + date + optional contact), milestone-generated
  reminders appear here too, linking to their deal.
- **`/studio/crm/deal/[id]`:** deal header (side, address, status, target
  close), milestone checklist — each row: done-toggle, title, date picker,
  client-visible eye-toggle, reorder (up/down buttons); add-milestone;
  portal section (link + Copy / Regenerate / Disable, preview link).
- **`/studio/crm/import`:** file input → client-side CSV parse (handles FUB
  export headers: First Name, Last Name, Emails, Phones, Stage, Source, Tags,
  Background/Notes, Created) → column-mapping preview (auto-mapped, editable)
  → import in batches → result summary (created / merged / skipped).
- **`/studio/crm/settings`:** "Enable notifications on this device" button
  (permission prompt → subscribe → POST), device list, test-push button.

## 7. Deal templates

`POST /crm/deals` seeds editable milestones by side (all `client_visible`
except where noted):

- **Buyer:** Offer accepted → Earnest money deposited → Home inspection →
  Termite/other inspections → Appraisal → Loan approval →
  Contingency removal *(internal by default)* → Final walkthrough →
  Signing → Close of escrow 🎉
- **Seller:** Listing agreement signed → Prep, staging & photos →
  Live on MLS → Open house(s) → Offer review *(internal by default)* →
  Buyer contingencies → Buyer walkthrough → Signing → Close of escrow 🎉

Templates live in `src/worker-lib/dealTemplates.ts` — plain data, easy to edit.

## 8. Push notifications (Web Push, $0)

- **Service worker** `public/studio-sw.js`, registered from the studio layout
  (scope `/studio` is NOT required for push; register at `/` scope guarded to
  studio pages). Handles `push` (show notification) and `notificationclick`
  (focus/open the target studio URL from `data.url`).
- **VAPID:** keypair generated once (script `scripts/generate-vapid.mjs`),
  stored as worker secrets `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`
  (public key also served via `/crm/push/vapid`).
- **Encryption:** `@block65/webcrypto-web-push` (Workers-compatible, WebCrypto
  only) for RFC 8291 payload encryption + VAPID JWT.
- **Triggers:**
  - New lead → instant push (from intake handlers).
  - Cron (every 15 min): tasks with `due_at <= now` and `done_at IS NULL` and
    `notified_at IS NULL` → push + stamp. Milestones with a date → push day
    before (~9am PT window) and morning of (~8am PT window), stamped via
    `reminded_*` columns. Cron computes Pacific time from UTC explicitly
    (site convention: Pacific).
- **Cleanup:** push responses 404/410 delete the subscription.
- **iOS reality:** works because the studio PWA is installed to Home Screen
  (iOS 16.4+). Permission must be requested from a user tap (the settings
  button). If she reinstalls the PWA she re-enables in settings.

## 9. Client portal page (`/portal/:token`)

Worker-rendered HTML (new `src/worker-lib/portalPage.ts`, escaped output,
brand: navy/gold, Cormorant Garamond + Outfit, mobile-first):

- Header: Brenda branding + photo, property address, "{First name}'s
  {home purchase|home sale}".
- Progress bar (% of client-visible milestones done).
- Timeline: client-visible milestones — done ✓ (gold), current (highlighted),
  upcoming (muted) with friendly dates. No internal notes ever rendered.
- Key dates card: next step + date, target close date.
- Contact card: call / text / email buttons.
- `noindex` meta + `X-Robots-Tag`; `robots.txt` disallows `/portal/`.
- Unknown/disabled token → branded "link expired, text Brenda" page (200, no
  token probing signal beyond that).
- Regenerating the token instantly invalidates the old link; disabling sets
  `portal_token = NULL`.

## 10. Error handling

- D1 unavailable: intake returns 500 → existing client fail-open/retry paths
  handle it. Studio surfaces error toasts (existing convention).
- Push send failures: logged, never block a response; dead subs pruned.
- CSV import: per-row validation; bad rows collected and reported, good rows
  still import. Import is idempotent via the same email/phone dedupe.
- Portal render with malformed deal data: defensive defaults, never 500 to a
  client.

## 11. Testing

- **Jest units (run in CI):** phone/email normalization + dedupe matcher, CSV
  header auto-mapping + row parsing, milestone template seeding, cron
  selection queries' time-window logic (pure functions extracted), portal HTML
  escaping.
- **Worker typecheck:** existing `npm run typecheck:worker` covers new
  worker-lib modules.
- **Local e2e smoke:** `wrangler dev` with local D1 — submit lead → appears in
  inbox → start deal → milestone → portal page renders; import a sample FUB
  CSV fixture.
- **Deploy smoke:** real lead POST on production, portal link on phone,
  push test-button from her iPhone.

## 12. Deployment / ops (one-time)

1. `npx wrangler d1 create bvr-crm` → paste binding into `wrangler.toml`;
   `npx wrangler d1 migrations apply bvr-crm --remote`.
2. `node scripts/generate-vapid.mjs` → `wrangler secret put VAPID_PUBLIC_KEY`
   / `VAPID_PRIVATE_KEY`.
3. Deploy (mind the repo's known gotchas: prebuild KV fetch needs wrangler
   OAuth; kill stale `workerd.exe` + `rm -rf out` before build).
4. On Brenda's iPhone: open studio PWA → CRM settings → enable notifications
   → test push.
5. Brenda exports contacts from FUB (or asks the broker for the CSV) →
   `/studio/crm/import`.
6. `FOLLOW_UP_BOSS_API_KEY` secret can be deleted after cutover.

## 13. Cost

$0/month. D1 free tier (5 GB, 5M reads/day) is orders of magnitude above a
single-agent CRM. Cron triggers and Web Push are free. No external services.
