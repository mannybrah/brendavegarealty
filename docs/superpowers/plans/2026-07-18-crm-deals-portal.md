# CRM + Deals + Client Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Follow Up Boss with a built-in CRM (contacts, pipeline, tasks + push reminders, deals with milestone checklists, client portal) inside the existing Cloudflare Worker + `/studio` PWA.

**Architecture:** New D1 database `bvr-crm` (binding `CRM_DB`) beside existing KV/R2. Studio-gated JSON API under `/api/studio/crm/*` in `src/worker.ts` → handlers in `src/worker-lib/crm.ts` / `push.ts` / `portalPage.ts`. Studio UI pages under `src/app/studio/crm/*` (static export — dynamic records use query-string ids, NOT path params). Client portal is a worker-rendered HTML page at `/portal/:token`. Web Push via VAPID + a 15-min cron `scheduled()` handler.

**Tech Stack:** Cloudflare Workers + D1 + cron triggers, Next.js 16 static export, Tailwind, jest, `@block65/webcrypto-web-push`.

**Spec:** `docs/superpowers/specs/2026-07-18-crm-deals-portal-design.md` — read it first.

## Global Constraints

- Static export (`output: "export"`): **no Next API routes, no middleware, no runtime dynamic `[param]` studio routes.** Record pages use `?id=` query params + `useSearchParams` inside `<Suspense>` (pattern: `src/app/studio/blog/edit/page.tsx`).
- Worker code: WebCrypto/fetch only (no Node APIs beyond `nodejs_compat` basics). Worker files are type-checked by `npm run typecheck:worker`, NOT the root tsc.
- Studio fetch convention: `credentials: "include"`, `cache: "no-store"`. Studio-gated worker routes wrap handlers in `requireStudio(request, env, () => ...)` (`src/worker.ts:262`).
- JSON responses via `jsonResponse(data, status?, extraHeaders?)` from `src/worker-lib/http.ts`.
- All user-supplied text rendered into worker HTML MUST go through an `escapeHtml` helper (see `src/worker-lib/listingPage.ts` for the existing pattern).
- Time zone: Brenda operates in **America/Los_Angeles**. Dates stored as naive Pacific strings: dates `YYYY-MM-DD`, datetimes `YYYY-MM-DDTHH:mm`. Comparisons are lexicographic against a computed "Pacific now".
- Pipeline stages (exact strings): `new | contacted | active | under_contract | closed | sphere | archived`.
- Sources (exact strings): `contact-form | qualification-calculator | cost-calculator | scheduler | phone-call | import | manual`.
- Mobile-first: everything lives in the 640px `StudioShell` (`src/components/studio/StudioShell.tsx` — props `{title?, backHref?, children}`). Brand classes in use: `bg-cream`, `text-navy`, `text-charcoal-light`, `font-display`, `font-body`, `font-ui`, gold = `text-gold`/`bg-gold`.
- Commit after every task. CI runs `jest` + `typecheck:worker` + build — keep all green.
- $0/month: no new paid services.

---

### Task 1: D1 database, migration, bindings, cron

**Files:**
- Create: `migrations/0001_crm.sql`
- Modify: `wrangler.toml`, `src/worker-lib/env.ts`

**Interfaces:**
- Produces: `Env.CRM_DB: D1Database`, `Env.VAPID_PUBLIC_KEY: string`, `Env.VAPID_PRIVATE_KEY: string`; tables `contacts, events, tasks, deals, milestones, push_subscriptions`.

- [ ] **Step 1: Create the D1 database** (account already has wrangler OAuth)

Run: `cd ~/Desktop/brendavegarealty && npx wrangler d1 create bvr-crm`
Expected: prints a `database_id`. Copy it. If the command fails on auth, STOP and report — do not fake an id.

- [ ] **Step 2: Add binding + cron to `wrangler.toml`** (append)

```toml
[[d1_databases]]
binding = "CRM_DB"
database_name = "bvr-crm"
database_id = "<id from step 1>"

[triggers]
crons = ["*/15 * * * *"]
```

- [ ] **Step 3: Write `migrations/0001_crm.sql`** — exactly the schema from spec §3:

```sql
CREATE TABLE contacts (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  type TEXT,
  stage TEXT NOT NULL DEFAULT 'new',
  source TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_activity_at TEXT NOT NULL
);
CREATE INDEX idx_contacts_stage ON contacts(stage);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_phone ON contacts(phone);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  meta TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_events_contact ON events(contact_id, created_at);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  contact_id TEXT,
  deal_id TEXT,
  milestone_id TEXT,
  title TEXT NOT NULL,
  due_at TEXT,
  done_at TEXT,
  notified_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_tasks_due ON tasks(due_at) WHERE done_at IS NULL;

CREATE TABLE deals (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL,
  side TEXT NOT NULL,
  property_address TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  target_close_date TEXT,
  portal_token TEXT UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE milestones (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL,
  title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'custom',
  date TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming',
  client_visible INTEGER NOT NULL DEFAULT 1,
  notes TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  reminded_day_before TEXT,
  reminded_day_of TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_milestones_deal ON milestones(deal_id, sort_order);

CREATE TABLE push_subscriptions (
  id TEXT PRIMARY KEY,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  device_label TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  last_ok_at TEXT
);
```

- [ ] **Step 4: Update `src/worker-lib/env.ts`** — add to the `Env` interface (keep existing fields):

```ts
  CRM_DB: D1Database;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
```

- [ ] **Step 5: Apply migration locally and verify**

Run: `npx wrangler d1 migrations apply bvr-crm --local`
Expected: `0001_crm.sql` applied.
Run: `npx wrangler d1 execute bvr-crm --local --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"`
Expected: the 6 tables (plus d1_migrations).

- [ ] **Step 6: Typecheck + commit**

Run: `npm run typecheck:worker` → clean.
```bash
git add wrangler.toml migrations/0001_crm.sql src/worker-lib/env.ts
git commit -m "feat(crm): D1 database bvr-crm, schema migration, cron trigger"
```

---

### Task 2: Normalization + shared CRM types (`src/lib/crm/normalize.ts`)

**Files:**
- Create: `src/lib/crm/normalize.ts`, `src/lib/crm/__tests__/normalize.test.ts`

**Interfaces:**
- Produces:
  - `normalizePhone(raw: string | null | undefined): string | null` — digits only, strips leading US `1` when 11 digits, `null` if empty.
  - `normalizeEmail(raw: string | null | undefined): string | null` — trim + lowercase, `null` if empty.
  - `splitName(name: string): { firstName: string; lastName: string }`
  - `STAGES: readonly string[]`, `STAGE_LABELS: Record<string, string>` (new→"New", contacted→"Contacted", active→"Active", under_contract→"Under Contract", closed→"Closed", sphere→"Sphere / Past", archived→"Archived")
- Note: this lives under `src/lib/` (shared) so BOTH the worker and studio components and jest can import it. It must stay dependency-free and Node-API-free.

- [ ] **Step 1: Write failing tests** (find test location conventions first: `npx jest --listTests`)

```ts
import { normalizePhone, normalizeEmail, splitName } from "../normalize";

test("normalizePhone strips formatting and country code", () => {
  expect(normalizePhone("(501) 827-9619")).toBe("5018279619");
  expect(normalizePhone("+1 501-827-9619")).toBe("5018279619");
  expect(normalizePhone("15018279619")).toBe("5018279619");
  expect(normalizePhone("")).toBeNull();
  expect(normalizePhone(undefined)).toBeNull();
});
test("normalizeEmail lowercases and trims", () => {
  expect(normalizeEmail(" Maria@Example.COM ")).toBe("maria@example.com");
  expect(normalizeEmail("")).toBeNull();
});
test("splitName", () => {
  expect(splitName("Maria Lopez Garcia")).toEqual({ firstName: "Maria", lastName: "Lopez Garcia" });
  expect(splitName("Maria")).toEqual({ firstName: "Maria", lastName: "" });
  expect(splitName("  ")).toEqual({ firstName: "", lastName: "" });
});
```

- [ ] **Step 2: Run** `npx jest normalize -t ""` → FAIL (module not found).
- [ ] **Step 3: Implement**

```ts
export const STAGES = ["new", "contacted", "active", "under_contract", "closed", "sphere", "archived"] as const;
export type Stage = (typeof STAGES)[number];
export const STAGE_LABELS: Record<Stage, string> = {
  new: "New", contacted: "Contacted", active: "Active",
  under_contract: "Under Contract", closed: "Closed",
  sphere: "Sphere / Past", archived: "Archived",
};

export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

export function normalizeEmail(raw: string | null | undefined): string | null {
  const v = raw?.trim().toLowerCase();
  return v ? v : null;
}

export function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}
```

- [ ] **Step 4: Run tests** → PASS. **Step 5: Commit** `feat(crm): normalization helpers + stage constants`.

---

### Task 3: Deal milestone templates (`src/worker-lib/dealTemplates.ts`)

**Files:**
- Create: `src/worker-lib/dealTemplates.ts`, test beside Task 2's.

**Interfaces:**
- Produces: `dealTemplate(side: "buyer" | "seller"): Array<{ title: string; kind: string; clientVisible: boolean }>` (ordered).

- [ ] **Step 1: Failing test** — buyer template has 10 entries starting "Offer accepted" ending "Close of escrow", "Contingency removal" has `clientVisible: false`; seller has 9 entries, "Offer review" `clientVisible: false`; all others visible.
- [ ] **Step 2: Implement** (exact lists from spec §7):

```ts
export type MilestoneTemplate = { title: string; kind: string; clientVisible: boolean };

const BUYER: MilestoneTemplate[] = [
  { title: "Offer accepted", kind: "paperwork", clientVisible: true },
  { title: "Earnest money deposited", kind: "paperwork", clientVisible: true },
  { title: "Home inspection", kind: "inspection", clientVisible: true },
  { title: "Termite / other inspections", kind: "inspection", clientVisible: true },
  { title: "Appraisal", kind: "appraisal", clientVisible: true },
  { title: "Loan approval", kind: "paperwork", clientVisible: true },
  { title: "Contingency removal", kind: "contingency", clientVisible: false },
  { title: "Final walkthrough", kind: "walkthrough", clientVisible: true },
  { title: "Signing", kind: "signing", clientVisible: true },
  { title: "Close of escrow 🎉", kind: "close", clientVisible: true },
];
const SELLER: MilestoneTemplate[] = [
  { title: "Listing agreement signed", kind: "paperwork", clientVisible: true },
  { title: "Prep, staging & photos", kind: "custom", clientVisible: true },
  { title: "Live on MLS", kind: "custom", clientVisible: true },
  { title: "Open house", kind: "open_house", clientVisible: true },
  { title: "Offer review", kind: "paperwork", clientVisible: false },
  { title: "Buyer contingencies", kind: "contingency", clientVisible: true },
  { title: "Buyer walkthrough", kind: "walkthrough", clientVisible: true },
  { title: "Signing", kind: "signing", clientVisible: true },
  { title: "Close of escrow 🎉", kind: "close", clientVisible: true },
];
export function dealTemplate(side: "buyer" | "seller"): MilestoneTemplate[] {
  return (side === "buyer" ? BUYER : SELLER).map((m) => ({ ...m }));
}
```

- [ ] **Step 3: Tests pass, typecheck:worker clean, commit** `feat(crm): buyer/seller milestone templates`.

---

### Task 4: FUB CSV parsing + mapping (`src/lib/crm/csv.ts`)

**Files:**
- Create: `src/lib/crm/csv.ts`, tests.

**Interfaces:**
- Produces:
  - `parseCsv(text: string): string[][]` — RFC-4180-ish: quoted fields, escaped quotes (`""`), CR/LF, skips fully-empty rows.
  - `autoMapColumns(headers: string[]): Record<string, number>` — maps our field names → column index. Recognized (case-insensitive, trimmed): `first name→firstName`, `last name→lastName`, `name/full name→name`, `email/emails/email address→email`, `phone/phones/phone number/mobile→phone`, `stage→stage`, `source/lead source→source`, `tags→tags`, `background/notes/note→notes`, `created/created at/date added→createdAt`.
  - `rowsToImportContacts(rows: string[][], map: Record<string, number>): ImportContact[]` where `ImportContact = { firstName; lastName; email: string|null; phone: string|null; stage; source; tags: string[]; notes; createdAt: string|null }` — uses `splitName` when only `name` mapped; FUB multi-value cells ("a@b.com, c@d.com") take the first; FUB stage mapping: `lead→new`, `hot prospect|nurture|contacted→contacted`, `active client|active→active`, `pending→under_contract`, `closed→closed`, `past client|sphere→sphere`, `trash|archived→archived`, anything else → `new`. `source` always forced to `"import"` (original source preserved inside notes when present). Rows with no email AND no phone AND no name are dropped.

- [ ] **Step 1: Failing tests** — include a realistic FUB export fixture string:

```ts
const FUB_CSV = `First Name,Last Name,Emails,Phones,Stage,Source,Tags,Background,Created
Maria,Lopez,"maria@example.com, m2@x.com",(408) 555-1212,Lead,Zillow,"buyer, campbell",Met at open house,2024-05-01
,,"",408 555 9999,Past Client,,,"Loyal seller",2020-01-15
"Smith, Jr.",Bob,bob@x.com,,Hot Prospect,Referral,,,2025-12-30`;
```
Assert: 3 contacts; first → email `maria@example.com`, phone `4085551212`, stage `new`, tags `["buyer","campbell"]`, notes contains `Met at open house` and `Zillow`; second → stage `sphere`, phone `4085559999`, empty names kept as ""; third → firstName `Smith, Jr.` (quoted comma preserved), stage `contacted`. Also unit-test `parseCsv` on quotes/escapes and `autoMapColumns` header variants.

- [ ] **Step 2: FAIL. Step 3: Implement** — hand-rolled char-walk parser (~40 lines, no dependency):

```ts
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}
```
`autoMapColumns` + `rowsToImportContacts` per the interface above (import `splitName`, `normalizeEmail`, `normalizePhone` from `./normalize`).

- [ ] **Step 4: PASS. Step 5: Commit** `feat(crm): FUB CSV parser + column auto-mapping`.

---

### Task 5: Worker CRM core — contacts, events, summary (`src/worker-lib/crm.ts`)

**Files:**
- Create: `src/worker-lib/crm.ts`
- Modify: `src/worker.ts` (imports + routes)

**Interfaces:**
- Produces (all `(…, env: Env) => Promise<Response>` unless noted):
  - `handleCrmSummary(env)` → `{ newLeads: number, dueToday: number }` (dueToday = tasks `done_at IS NULL AND due_at <= <todayPacific>T23:59`).
  - `handleContactList(request, env)` → `{ contacts: ContactRow[] }` — query params `q` (LIKE against first_name/last_name/email/phone, `%`/`_` escaped) and `stage`; sorted `last_activity_at DESC`, limit 500.
  - `handleContactCreate(request, env)` — body `{ name, email?, phone?, type?, stage?, notes? }` → 201 `{ contact }`; source `manual`; writes a `system` "Contact created" event.
  - `handleContactGet(id, env)` → `{ contact, events (newest first, limit 200), tasks (open first), deals }` or 404.
  - `handleContactPatch(id, request, env)` — partial `{ firstName,lastName,email,phone,type,stage,tags,notes }`; stage change also inserts `stage_change` event (`body: "New → Contacted"` using STAGE_LABELS) and bumps `last_activity_at`.
  - `handleContactDelete(id, env)` — deletes contact + its events, tasks, deals + those deals' milestones.
  - `handleEventCreate(id, request, env)` — body `{ kind: "note"|"call"|"text"|"email", body }` → 201; bumps `last_activity_at`.
  - `ingestLead(env, input: { name, email, phone, source, message?, meta? }): Promise<{ contactId: string, contactName: string, created: boolean }>` — the dedupe/merge core used by Task 7's public intake AND Task 10's import: normalize email+phone → `SELECT id, stage FROM contacts WHERE (email IS NOT NULL AND email = ?1) OR (phone IS NOT NULL AND phone = ?2) LIMIT 1` (skip each clause when null) → on match: append `lead_submission` event, bump `last_activity_at`/`updated_at`, if stage `archived` reset to `new`; on miss: INSERT contact (stage `new`) + `lead_submission` event. Then auto-task: if no open task titled `Respond to …` for this contact, INSERT task `Respond to {firstName}` with `due_at = <todayPacific>` .
  - `pacificToday(): string` and `pacificNow(): { date: string; hhmm: string; hour: number }` — exported from a new tiny module `src/worker-lib/time.ts` using `new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", hour12: false, year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" }).formatToParts(new Date())`.
- Row shapes are the snake_case DB columns passed through as-is; the UI consumes snake_case. Ids: `crypto.randomUUID()`. Timestamps `new Date().toISOString()` except due/milestone dates (Pacific naive per Global Constraints).

- [ ] **Step 1:** Implement `src/worker-lib/time.ts` + `src/worker-lib/crm.ts` per interfaces. Use `env.CRM_DB.prepare(...).bind(...)` / `.all()` / `.first()` / `.run()`; use `env.CRM_DB.batch([...])` for multi-statement writes (create + event + task).
- [ ] **Step 2:** Wire routes in `src/worker.ts` in the studio block (id regexes `[a-f0-9-]+`, follow the existing match-then-method pattern at `src/worker.ts:113-165`):

```
GET  /api/studio/crm/summary            → handleCrmSummary
GET  /api/studio/crm/contacts           → handleContactList
POST /api/studio/crm/contacts           → handleContactCreate
GET|PATCH|DELETE /api/studio/crm/contacts/:id → handleContactGet/Patch/Delete
POST /api/studio/crm/contacts/:id/events → handleEventCreate
```
All wrapped in `requireStudio`.

- [ ] **Step 3: e2e smoke with local D1** — run `npx wrangler dev` (background), then:

```bash
curl -s -X POST localhost:8787/api/studio/auth -H 'Content-Type: application/json' -d '{"password":"devpass"}' -c /tmp/cj.txt
curl -s -b /tmp/cj.txt -X POST localhost:8787/api/studio/crm/contacts -H 'Content-Type: application/json' -d '{"name":"Test Person","email":"t@x.com","phone":"408 555 0000"}'
curl -s -b /tmp/cj.txt "localhost:8787/api/studio/crm/contacts?q=test"
```
Expected: 201 then list containing Test Person. Kill wrangler dev after.

- [ ] **Step 4:** `npm run typecheck:worker` clean → commit `feat(crm): contacts/events/summary worker API`.

---

### Task 6: Worker tasks API

**Files:**
- Modify: `src/worker-lib/crm.ts`, `src/worker.ts`

**Interfaces:**
- Produces:
  - `handleTaskList(request, env)` → `{ tasks: Array<TaskRow & { contact_name: string|null, deal_address: string|null }> }` (LEFT JOIN contacts/deals). Param `view=open|done` (default open = `done_at IS NULL` ordered `due_at ASC NULLS LAST`; done = last 100 by `done_at DESC`). Grouping into Overdue/Today/Upcoming happens client-side against `pacificToday()` returned in the payload as `{ today: "YYYY-MM-DD" }`.
  - `handleTaskCreate(request, env)` — `{ title, dueAt?, contactId? }` → 201.
  - `handleTaskPatch(id, request, env)` — `{ title?, dueAt?, done? }`; `done: true` sets `done_at` now + writes `task_done` event when contact-linked; `done: false` clears it.
  - `handleTaskDelete(id, env)`.
- Routes: `GET|POST /api/studio/crm/tasks`, `PATCH|DELETE /api/studio/crm/tasks/:id` (requireStudio).

- [ ] **Step 1:** Implement + wire. **Step 2:** curl smoke as in Task 5 (create task, list, complete, list `view=done`). **Step 3:** typecheck clean → commit `feat(crm): tasks worker API`.

---

### Task 7: Web Push module + subscribe endpoints + service worker + cron

**Files:**
- Create: `src/worker-lib/push.ts`, `public/studio-sw.js`, `scripts/generate-vapid.mjs`, `src/components/studio/StudioSW.tsx`
- Modify: `src/worker.ts` (routes + `scheduled` handler), `src/app/studio/layout.tsx` (mount `<StudioSW />`), `package.json` (dependency)

**Interfaces:**
- Produces:
  - `sendPushToAll(env: Env, msg: { title: string; body: string; url: string }): Promise<void>` — loads all `push_subscriptions`, encrypts+POSTs each, deletes rows on 404/410, stamps `last_ok_at` on success. Never throws.
  - `handlePushVapid(env)` → `{ publicKey }` (studio-gated is fine).
  - `handlePushSubscribe(request, env)` — body = browser `PushSubscription.toJSON()` + `{ deviceLabel? }` → upsert by endpoint.
  - `handlePushUnsubscribe(request, env)` — body `{ endpoint }` → delete.
  - `handlePushTest(env)` — sends a test push to all.
  - `runReminderSweep(env): Promise<void>` — cron body (below).
  - `selectReminders(now: { date: string; hhmm: string; hour: number }, tasks: Array<{id,title,due_at,notified_at,done_at}>, milestones: Array<{id,deal_id,title,date,status,reminded_day_before,reminded_day_of}>): { dueTaskIds: string[]; dayBefore: string[]; dayOf: string[] }` — **pure function** (also import-safe for jest): task due when `due_at !== null && done_at === null && notified_at === null &&` (`due_at` has time ? `due_at <= date+"T"+hhmm` : `due_at <= date && hour >= 8`); milestone `status === 'upcoming' && date !== null`: dayBefore when `date === tomorrow(now.date) && hour >= 9 && !reminded_day_before`, dayOf when `date === now.date && hour >= 8 && !reminded_day_of`. Include `tomorrow(dateStr)` helper (UTC-safe: `new Date(dateStr + "T12:00:00Z")` + 1 day, slice ISO).
- `scheduled` in `src/worker.ts`: the default export gains `async scheduled(event, env, ctx) { ctx.waitUntil(runReminderSweep(env)); }` — keep `satisfies ExportedHandler<Env>`.
- `runReminderSweep`: query candidates (open dated tasks; upcoming dated milestones joined to deals for contact name/address), call `selectReminders(pacificNow(), …)`, push per item — tasks: title "Task due", body = task title, url `/studio/crm/tasks`; milestones: "Tomorrow:"/"Today:" + title + address, url `/studio/crm/deal?id=<deal_id>` — then stamp `notified_at` / `reminded_*`.

- [ ] **Step 1:** `npm install @block65/webcrypto-web-push` (runtime dep). Read its README in `node_modules/@block65/webcrypto-web-push/readme*` and use its actual exported API for building the encrypted request (expected shape: `buildPushPayload(message, subscription, vapid)` → `{ headers, method, body }` you pass to `fetch(subscription.endpoint, …)`; if the real API differs, adapt — do NOT hand-roll RFC 8291).
- [ ] **Step 2:** `scripts/generate-vapid.mjs` — Node script: `crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign","verify"])`, export public as raw → base64url, private as pkcs8/jwk per what the push library's `vapid` config expects (check README; it typically wants `{ subject: "mailto:brenda.vega@c21anew.com", publicKey, privateKey }` base64url strings). Print both. Add `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` to `.dev.vars` for local testing.
- [ ] **Step 3:** Jest tests for `selectReminders` (pure): task with time not yet due / due; date-only task before 8am (held) vs after (fires); already-notified skipped; milestone day-before at 9am fires once; day-of; done/skipped milestones never fire. Run → PASS.
- [ ] **Step 4:** `public/studio-sw.js`:

```js
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "Brenda Vega Studio", {
      body: data.body || "",
      icon: "/images/studio-icon-192.png",
      badge: "/images/studio-icon-192.png",
      data: { url: data.url || "/studio" },
    })
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/studio";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if (c.url.includes("/studio")) { c.focus(); c.navigate(url); return; }
      return clients.openWindow(url);
    })
  );
});
```

- [ ] **Step 5:** `StudioSW.tsx` — `"use client"`, `useEffect` → `navigator.serviceWorker?.register("/studio-sw.js")` (guarded, no-op on failure). Mount inside `src/app/studio/layout.tsx`.
- [ ] **Step 6:** Wire routes `GET /api/studio/crm/push/vapid`, `POST|DELETE /api/studio/crm/push/subscribe`, `POST /api/studio/crm/push/test` (all requireStudio) + the `scheduled` handler.
- [ ] **Step 7:** typecheck:worker + jest → clean/PASS. Commit `feat(crm): web push (VAPID) + service worker + reminder cron`.

---

### Task 8: Rewire public intake to D1, remove FUB, repoint /api/stats

**Files:**
- Modify: `src/worker.ts` (`handleContact` `:465`, `handleLead` `:516`, `handleStats` `:421`; delete `sendToFUB` `:410`)

**Interfaces:**
- Consumes: `ingestLead` (Task 5), `sendPushToAll` (Task 7).
- Produces: same external contracts as today — `POST /api/contact` `{success:true}`, `POST /api/lead` `{success:true}`, 400 on missing name/email/phone; `GET /api/stats` becomes `{ configured: true, contacts: n, newLeads: n, leads: [last 20 lead_submission events joined to contact name] }`.

- [ ] **Step 1:** `handleContact`: keep validation; **delete the FUB key check and FUB call**; build `message` (`message || "New {type} lead from contact form"`) and `meta` `{ type }`; `await ingestLead(env, { name, email, phone, source: "contact-form", message, meta })`; then fire-and-forget push — `sendPushToAll(env, { title: "New lead 🔔", body: "{name} · contact form", url: "/studio/crm/contact?id=" + contactId })` wrapped in try/catch (push failure must not fail the response); keep `log()` calls; return `{ success: true }`.
- [ ] **Step 2:** `handleLead`: same shape — use body `source` verbatim (the client already sends the enum; fall back to `"contact-form"` if absent), keep the existing messageText assembly (timeline / agent / calculatorSummary lines) as the event `body`, pass `calculatorSummary`+`timeline`+`workingWithAgent` as `meta`.
- [ ] **Step 3:** `handleStats`: replace FUB queries with D1 counts + recent lead events.
- [ ] **Step 4:** e2e smoke: `npx wrangler dev`, POST `/api/lead` with calculator payload → 200; studio-cookie GET contacts shows merged contact with event; POST same email again → still ONE contact, two events; GET `/api/stats` shows counts. Kill dev server.
- [ ] **Step 5:** typecheck + jest + commit `feat(crm): leads persist to D1, FUB removed from intake`.

---

### Task 9: Deals + milestones + portal token API

**Files:**
- Modify: `src/worker-lib/crm.ts` (or new `src/worker-lib/deals.ts` if crm.ts exceeds ~500 lines — prefer the split), `src/worker.ts`

**Interfaces:**
- Produces:
  - `handleDealCreate(request, env)` — `{ contactId, side: "buyer"|"seller", propertyAddress?, targetCloseDate? }` → creates deal + `dealTemplate(side)` milestones (sort_order = index) via `batch`; writes contact `deal` event ("Started buyer deal — 123 Main St"); sets contact stage to `active` if currently `new|contacted`; → 201 `{ deal }`.
  - `handleDealGet(id, env)` → `{ deal, milestones (by sort_order), contact }`.
  - `handleDealPatch(id, request, env)` — `{ propertyAddress?, status?, targetCloseDate?, side? }`; status→`closed` also sets contact stage `closed` (and `sphere` is left to Brenda).
  - `handleDealDelete(id, env)` — deal + milestones (+ tasks with this deal_id).
  - `handleMilestoneCreate(dealId, request, env)` — `{ title, date?, clientVisible? }` kind `custom`, sort_order = max+1.
  - `handleMilestonePatch(id, request, env)` — `{ title?, date?, status?, clientVisible?, notes?, sortOrder? }`; date changes clear `reminded_day_before/of`.
  - `handleMilestoneDelete(id, env)`.
  - `handlePortalEnable(dealId, env)` — generates token (`newPortalToken()`: 22 chars base62 from `crypto.getRandomValues(new Uint8Array(22))` mapped mod 62 — acceptable bias at this threat model), overwrites any old token → `{ portalToken }`. `handlePortalDisable(dealId, env)` → token NULL.
  - `findDealByPortalToken(token: string, env): Promise<PortalData | null>` where `PortalData = { deal, contactFirstName, milestones: client_visible only, by sort_order }` — used by Task 10.
- Routes (requireStudio): `POST /api/studio/crm/deals`, `GET|PATCH|DELETE /api/studio/crm/deals/:id`, `POST /api/studio/crm/deals/:id/milestones`, `POST|DELETE /api/studio/crm/deals/:id/portal`, `PATCH|DELETE /api/studio/crm/milestones/:id`.

- [ ] **Step 1:** Implement + wire. **Step 2:** curl smoke: create contact → deal (buyer) → GET deal shows 10 template milestones → patch milestone done → enable portal → token returned. **Step 3:** typecheck + commit `feat(crm): deals, milestones, portal tokens`.

---

### Task 10: Import endpoint + worker-rendered portal page

**Files:**
- Create: `src/worker-lib/portalPage.ts`
- Modify: `src/worker-lib/crm.ts`, `src/worker.ts`, `public/robots.txt`

**Interfaces:**
- Produces:
  - `handleImport(request, env)` — body `{ contacts: ImportContact[] }` (Task 4 shape, max 2000). Per row: reuse the same email/phone match as `ingestLead` — match → merge (fill blank fields, append notes, `merged++`), no match with name/email/phone → INSERT with stage/source/tags/notes, `created_at` = row createdAt || now, `created++`; invalid → `skipped++`. Import does NOT create respond-tasks or push. → `{ created, merged, skipped }`. Route: `POST /api/studio/crm/import` (requireStudio).
  - `renderPortalPage(data: PortalData): string` — full HTML document, brand-styled (copy the inline-CSS approach + escapeHtml helper pattern from `src/worker-lib/listingPage.ts`): Brenda header (name, DRE 02196981, photo `/images/brenda-portrait.jpg` if that asset exists in `public/images/` — check; otherwise initials monogram), headline "{FirstName}'s home {purchase|sale}", property address, progress bar (% done of visible milestones, gold fill), vertical timeline (done = gold check + line, current = first upcoming highlighted "You are here", upcoming = muted; friendly dates like "Jul 24"), key-dates card (next step + target close), contact buttons (`tel:+15018279619`, `sms:+15018279619`, `mailto:brenda.vega@c21anew.com` — pull from `src/data/site.ts` if importable into worker code, else hardcode to match it), `<meta name="robots" content="noindex,nofollow">`. NO milestone notes rendered ever. Mobile-first, max-width 640px, system-safe font fallbacks (worker page can link the same Google Fonts as listingPage does).
  - `renderPortalExpiredPage(): string` — branded "This link is no longer active — text Brenda for a fresh one" + contact buttons, status 200.
- Worker routes (public, before ASSETS fallthrough): `GET /portal/:token` (`/^\/portal\/([A-Za-z0-9]{10,64})$/`) → `findDealByPortalToken` → render, `Cache-Control: private, no-store`, `X-Robots-Tag: noindex`. Any other `/portal/*` GET → expired page.

- [ ] **Step 1:** Implement import (+ curl smoke: POST 3-row payload twice → second run all `merged`, zero dupes).
- [ ] **Step 2:** Jest test for `renderPortalPage`: given fixture PortalData with a milestone titled `<script>alert(1)</script>` the output contains `&lt;script&gt;` and not `<script>alert`; hidden milestone title absent from HTML; progress math (3 of 6 visible done → `50%` appears in the style attr).
- [ ] **Step 3:** Implement page + routes; add `Disallow: /portal/` to `public/robots.txt`.
- [ ] **Step 4:** wrangler dev smoke: enable portal on the Task 9 deal → `curl localhost:8787/portal/<token>` renders HTML with timeline; bogus token → expired page.
- [ ] **Step 5:** typecheck + jest → commit `feat(crm): FUB import endpoint + client portal page`.

---

### Task 11: Studio UI — dashboard strip + Clients card + lead inbox

**Files:**
- Modify: `src/app/studio/page.tsx` (ACTIONS array `:9-15` + summary strip)
- Create: `src/app/studio/crm/page.tsx`, `src/components/studio/crm/ContactListItem.tsx`, `src/components/studio/crm/StagePill.tsx`

**Interfaces:**
- Consumes: `GET /api/studio/crm/summary`, `GET /api/studio/crm/contacts?q=&stage=`, `POST /api/studio/crm/contacts`; `STAGES`/`STAGE_LABELS` from `src/lib/crm/normalize`.
- Produces: `<StagePill stage={string} />` (colored pill: new=gold bg, contacted=navy/10, active=teal-ish, under_contract=amber, closed=green, sphere=stone, archived=gray — pick from existing palette classes); `<ContactListItem contact={ContactRow} />` linking to `/studio/crm/contact?id=…`.

- [ ] **Step 1:** Dashboard: add `{ href: "/studio/crm", label: "Clients", desc: "Leads, pipeline & deals", icon: "👥", span: true }` FIRST in ACTIONS; above the grid render a summary strip (client-side fetch of `/crm/summary` with the studio fetch convention; render nothing while loading): `🔵 {newLeads} new · ✅ {dueToday} due today`, linking to `/studio/crm` and `/studio/crm/tasks`.
- [ ] **Step 2:** `/studio/crm` page (`"use client"`, wrapped in `StudioShell title="Clients" backHref="/studio"`): sticky search `<input>` (debounced 300ms re-fetch with `q`), horizontal scroll row of stage filter chips (All + 7 stages), sections: **New** (stage=new) pinned on top when unfiltered, then **Everyone** (rest of result). Row: name (fallback "No name"), `<StagePill>`, source badge (small uppercase `font-ui` label), relative time from `last_activity_at` ("2h", "3d"). Header row has a `+ Add` button → inline modal/sheet form (name required; phone, email, type buyer/seller) → POST → refresh + navigate to the new contact page. Empty state: "No leads yet — they'll land here automatically from the website."
- [ ] **Step 3:** Verify: `npm run dev` (or `wrangler dev` for full stack) → login → dashboard shows Clients card + strip; inbox lists Task-5 smoke contacts; search + chips filter; add-contact works on a 390px viewport (devtools mobile).
- [ ] **Step 4:** Root `npx tsc --noEmit` (root config) or `npm run build` passes → commit `feat(crm): studio dashboard strip + lead inbox UI`.

---

### Task 12: Studio UI — contact detail page

**Files:**
- Create: `src/app/studio/crm/contact/page.tsx` (+ colocated client components as needed)

**Interfaces:**
- Consumes: `GET/PATCH/DELETE /api/studio/crm/contacts/:id`, `POST …/:id/events`, `POST /api/studio/crm/tasks`, `PATCH /api/studio/crm/tasks/:id`, `POST /api/studio/crm/deals`.
- Pattern: `useSearchParams` in `<Suspense>` (copy the structure of `src/app/studio/blog/edit/page.tsx`).

- [ ] **Step 1:** Build the page, top to bottom:
  1. Header: display name + 3 equal-width action buttons — Call (`tel:{phone}`), Text (`sms:{phone}`), Email (`mailto:{email}`) — disabled/grayed when the field is empty.
  2. Stage stepper: the 7 stages as a horizontal scroll of tappable pills; tapping PATCHes `{stage}` optimistically.
  3. Details card: editable fields (first/last name, phone, email, type select buyer/seller/both/other, tags comma-input, background notes textarea) with a single Save button appearing when dirty.
  4. Deals section: existing deals as cards (side icon 🏠/💰, address, status, progress "4/10") linking to `/studio/crm/deal?id=…`; "+ Start deal" → sheet asking side (Buyer/Seller toggle) + property address + target close date → POST → navigate to deal page.
  5. Tasks section: open tasks with checkbox (PATCH done) + quick-add (title + date).
  6. Timeline: events newest-first — icon per kind (📥 lead_submission, 📝 note, 📞 call, 💬 text, ✉️ email, 🔁 stage_change, ✅ task_done, 🏠 deal, ⚙️ system), body text, relative time; add-note composer on top with quick kind toggle (Note/Call/Text/Email) so she can log a call in two taps.
  7. Footer: Archive button (PATCH stage archived) + Delete (confirm dialog → DELETE → back to inbox).
- [ ] **Step 2:** Verify in browser (mobile viewport): full loop — open from inbox, log a call, change stage (event appears), start a buyer deal (redirects, 10 milestones), back, task add + complete.
- [ ] **Step 3:** Build passes → commit `feat(crm): contact detail page`.

---

### Task 13: Studio UI — pipeline + tasks pages

**Files:**
- Create: `src/app/studio/crm/pipeline/page.tsx`, `src/app/studio/crm/tasks/page.tsx`
- Modify: `src/app/studio/crm/page.tsx` (top tab bar)

**Interfaces:**
- Consumes: contacts list endpoint (pipeline groups client-side); tasks endpoints with `{ today }` from payload.

- [ ] **Step 1:** Add a tab bar at the top of all three CRM list pages (Inbox · Pipeline · Tasks — simple `Link` row, active tab underlined gold; extract `<CrmTabs active>` component under `src/components/studio/crm/`).
- [ ] **Step 2:** Pipeline: fetch all non-archived contacts, group by stage. Desktop (`md:`): 6 columns (new→sphere) in `grid grid-cols-6 gap-2` with overflow-y column scroll — page needs `max-w` override: render this page's grid OUTSIDE the 640px constraint (`StudioShell` is fixed-width; wrap the grid in a full-bleed div `w-screen relative left-1/2 -translate-x-1/2 px-4` for md+). Mobile: stacked stage sections with counts, each collapsible. Cards: name + source + days-in-stage; tap → action sheet (bottom sheet on mobile): "Move to …" 7 stage buttons + "Open contact".
- [ ] **Step 3:** Tasks: sections Overdue (red accent) / Today / Upcoming / No date / Done (collapsed, last 100). Row: checkbox → optimistic PATCH done, title, contact name chip (links to contact), deal chip when milestone-linked (links to deal), due date. Quick-add bar pinned at top: title input + date input + optional contact picker (simple select fed from contacts list) + Add.
- [ ] **Step 4:** Verify both pages in browser at 390px and 1280px; build passes → commit `feat(crm): pipeline + tasks UI`.

---

### Task 14: Studio UI — deal page, import page, notification settings

**Files:**
- Create: `src/app/studio/crm/deal/page.tsx`, `src/app/studio/crm/import/page.tsx`, `src/app/studio/crm/settings/page.tsx`
- Modify: `src/app/studio/crm/page.tsx` (gear icon → settings; Import reachable from settings + inbox empty state)

**Interfaces:**
- Consumes: deal/milestone/portal endpoints (Task 9), import endpoint (Task 10), push endpoints (Task 7), `parseCsv`/`autoMapColumns`/`rowsToImportContacts` (Task 4 — imported client-side).

- [ ] **Step 1: Deal page** (`?id=`): header (side badge, editable address/status select active|pending|closed|cancelled/target close date), client-visible progress bar, milestone list — each row: ✓ toggle (upcoming↔done, strikethrough when done), title (tap to rename inline), date button (native `<input type="date">`), 👁 eye toggle for `client_visible` (dimmed when hidden), ⋮ menu (Skip / Delete / ↑ / ↓ reorder via sortOrder PATCH), "+ Add step" row at bottom. Portal card at the end: when off → "Create client portal link"; when on → the URL in a copyable box (`navigator.clipboard` + "Copied ✓"), buttons Open · Regenerate (confirm) · Turn off (confirm).
- [ ] **Step 2: Import page:** `<input type="file" accept=".csv">` → read text → `parseCsv` → header row → `autoMapColumns` → mapping table UI (our field → `<select>` of CSV columns, prefilled) → preview first 5 mapped rows → "Import N contacts" → chunk into batches of 200 → sequential POSTs with progress bar → result card "{created} added · {merged} merged · {skipped} skipped".
- [ ] **Step 3: Settings page:** Notifications card — status line (`Notification.permission` + whether a subscription exists), "Enable on this device" button: `Notification.requestPermission()` → `(await navigator.serviceWorker.ready).pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) })` (fetch key from `/crm/push/vapid`; include the standard `urlBase64ToUint8Array` helper) → POST subscription with `deviceLabel: navigator.userAgent` trimmed to platform. "Send test notification" button → POST `/crm/push/test`. iOS note text: "On iPhone, notifications require the studio to be added to your Home Screen."
- [ ] **Step 4:** Verify: import a hand-made 3-row CSV end-to-end; deal page full loop incl. portal link opens in new tab; settings enables push in Chrome desktop and test push arrives. Build passes → commit `feat(crm): deal page, CSV import, push settings UI`.

---

### Task 15: FUB removal cleanup + docs

**Files:**
- Delete: `functions/api/lead.js`, `functions/api/contact.js`, `src/lib/follow-up-boss.ts`
- Modify: `src/worker-lib/env.ts` (drop `FOLLOW_UP_BOSS_API_KEY`), `.env.example` (drop FUB vars, add VAPID vars), `README.md` if it mentions FUB

**Steps:**
- [ ] Delete files; `grep -ri "followupboss\|FOLLOW_UP_BOSS\|follow-up-boss" src functions --include=*` → only historical docs/spec hits remain.
- [ ] `npm run typecheck:worker` + `npx jest` + `npm run build` all green (build needs the KV-prebuild caveat — see Task 16 warnings — for cleanup verification `npm run build` locally is fine as long as you DO NOT deploy this build output).
- [ ] Commit `chore(crm): remove Follow Up Boss integration`.

---

### Task 16: Deploy + production migration + secrets + smoke test

**Files:** none new (ops task)

**⚠️ Known repo gotchas (memory-verified):**
1. The prebuild step (`scripts/fetch-kv-posts.mjs`) needs wrangler OAuth to read KV — a build without it writes stale/empty kv-posts.json and deploying would UNPUBLISH studio blog posts. Verify `out/blog/*.html` count matches post count after build.
2. Kill stale `workerd.exe` and `rm -rf out` before the deploy build (Windows file locks silently corrupt the export).

**Steps:**
- [ ] `npx wrangler d1 migrations apply bvr-crm --remote` → 0001 applied.
- [ ] `node scripts/generate-vapid.mjs` → `npx wrangler secret put VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` (pipe values in non-interactively: `echo <val> | npx wrangler secret put NAME`).
- [ ] Build + deploy: `taskkill //F //IM workerd.exe 2>/dev/null; rm -rf out && npm run build && ls out/blog/*.html | wc -l` (verify count) then `npx wrangler deploy`.
- [ ] Production smoke:
  - `curl -s -X POST https://brendavegarealty.com/api/lead -H 'Content-Type: application/json' -d '{"name":"CRM Smoke Test","email":"smoke@brendavegarealty.com","phone":"4085550100","source":"contact-form"}'` → `{"success":true}`.
  - Studio (with cookie) → contact appears in inbox with respond-task; delete the smoke contact.
  - Create smoke deal → portal link opens publicly → delete deal.
  - `https://brendavegarealty.com/api/stats` → D1-backed JSON.
  - Cron: `npx wrangler tail` for one 15-min boundary OR check dash — no errors.
- [ ] Delete FUB secret: `npx wrangler secret delete FOLLOW_UP_BOSS_API_KEY` (it's gone from Env — leaving it would fail deploy validation? No: extra secrets are harmless, but delete for hygiene).
- [ ] `git push` (repo mannybrah/brendavegarealty, main).
- [ ] Commit any stray changes; final `git log --oneline` sanity.

**Left for Brenda (report to user at the end, not automatable):** enable notifications on her iPhone (studio PWA → Settings → Enable), export FUB CSV → Import page, send first portal link.
