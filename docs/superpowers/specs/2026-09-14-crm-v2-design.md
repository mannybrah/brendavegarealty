# CRM v2 — Follow Up Boss–style rebuild of Brenda's studio CRM

Date: 2026-09-14
Status: approved (chat), Phase 1 in scope for this build

## 1. Goal

Replace the "thrown together" v1 CRM UI with a proper agent CRM modeled on Follow Up Boss (FUB), which Brenda used before losing broker-supplied access. Keep everything that already works (D1 database, intake, push, deals + milestones + listing checklist, client portal, CSV import, reminders) and rebuild the data model and UI around it.

Primary device: Brenda's iPhone (studio PWA on the Home Screen). Secondary: desktop browser. Every screen must be excellent on a 390px phone and use the extra room on desktop the way FUB does.

## 2. Phasing

**Phase 1 (this build):** new schema + migration, stages table, tags table, relationships, multiple phones/emails, contact detail fields, editable/starred timeline, call outcomes, filter engine + sort, five seeded smart lists (fixed), prev/next navigation, people page, profile page, dashboard, tasks page (Today/Overdue/Upcoming/Done + task types), settings (stages, tags, notifications), CrmShell with desktop top nav + mobile bottom tab bar, pipeline and deal pages moved onto the new shell and dynamic stages.

**Phase 2 (later, separate spec):** user-saved smart lists, files on a contact (R2), mass actions (bulk stage / tag / trash / delete), duplicate merge.

## 3. Research summary (FUB behaviors we are mirroring)

- People page: sortable table, smart lists in a sidebar with live counts, filters (stage, tags include/exclude, source, last communication, created), "Last Communication" column shows days since last 1:1 call/text/email.
- Lead profile: three columns. Left = identity (avatar, name, last communication, phones, emails, address), Relationships, Details (Stage, Source, Price, Timeframe, Tags as bubbles), Background. Center = action strip (Create Note / Send Email / Text / Log Call) + composer + timeline with per-kind tabs and counts, starred items pinned to top, notes editable via pencil. Right = Tasks, Deals (also Appointments/Files/Collaborators which we skip).
- Relationships: name, type (free text, e.g. Spouse), multiple phones (label, bad-number flag), multiple emails. Communication with a relationship lands on the primary profile.
- Stages: Lead, Attempted Contact, Spoke with Customer, Appointment Set, Met with Customer, Showing Homes, Listing Agreement, Active Listing, Submitting Offers, Under Contract, Nurture, Rejected, Closed, Trash. Lead/Closed/Trash system-locked. Deleting a stage prompts a reassignment target.
- Tags: multiple per contact, picker with search + create, admin table with usage counts, rename, delete.
- Tasks: name, type, date, time. Tasks page tabs: Today, Overdue, Future (incl. no date).
- Dashboard: New leads (with unactioned count), tasks, deals closing in 30 days, recent activity feed.
- Default smart lists: Needs Contact (created <11d, no comm 18h), Potential Prospects (lead stages, comm >5d, created <31d), Current Clients (active stages, comm >5d), Nurture (nurture, comm >7d), Past Clients (closed, comm >90d).

## 4. Data model (migration `migrations/0003_crm_v2.sql`)

All new tables use TEXT ids (uuid or slug), ISO timestamps, and no foreign-key enforcement (matches v1; the worker deletes children explicitly).

### 4.1 `stages`
```
id          TEXT PK      -- slug. System ids: new, active, under_contract, closed, archived
name        TEXT NOT NULL
description TEXT NOT NULL DEFAULT ''
color       TEXT NOT NULL          -- palette key (see 6.2)
sort_order  INTEGER NOT NULL
is_system   INTEGER NOT NULL DEFAULT 0
created_at  TEXT NOT NULL
```
Seed (in order): `new` "New" gold (system) · `attempted_contact` "Attempted Contact" coral · `contacted` "Contacted" steel · `appointment_set` "Appointment Set" plum · `active` "Active" teal (system) · `nurture` "Nurture" sage · `under_contract` "Under Contract" amber (system) · `closed` "Closed" green (system) · `sphere` "Sphere / Past" stone · `archived` "Trash" gray (system).

`contacts.stage` holds the stage id. System stages can be renamed/recolored but not deleted; their ids are what the deal engine (`new|contacted → active` on deal start, `→ closed` on deal close), intake (`archived → new` resurfacing, default `new`), and dashboard rely on. Custom stage id = slugified name, suffixed `-2`, `-3` on collision.

### 4.2 `tags` + `contact_tags`
```
tags:         id TEXT PK, name TEXT NOT NULL UNIQUE COLLATE NOCASE, created_at TEXT NOT NULL
contact_tags: contact_id TEXT NOT NULL, tag_id TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY (contact_id, tag_id)
              INDEX idx_contact_tags_tag (tag_id)
```
Migration copies every distinct value out of the JSON `contacts.tags` column via `json_each` (trimmed, non-empty, case-insensitive dedupe), links rows, then drops `contacts.tags`. Tag name limit 64 chars (FUB's limit).

### 4.3 `relationships`, `phones`, `emails`
```
relationships: id PK, contact_id, first_name, last_name, type TEXT DEFAULT '', sort_order, created_at, updated_at
               INDEX (contact_id)
phones:  id PK, contact_id NOT NULL, relationship_id TEXT NULL, number TEXT NOT NULL (digits, normalized),
         label TEXT DEFAULT 'mobile', is_primary INTEGER DEFAULT 0, is_bad INTEGER DEFAULT 0, sort_order, created_at
         INDEX (number), INDEX (contact_id)
emails:  id PK, contact_id NOT NULL, relationship_id TEXT NULL, address TEXT NOT NULL (lowercased),
         label TEXT DEFAULT 'personal', is_primary INTEGER DEFAULT 0, is_bad INTEGER DEFAULT 0, sort_order, created_at
         INDEX (address), INDEX (contact_id)
```
`relationship_id NULL` = belongs to the primary contact. Migration inserts one primary phone/email row from the existing `contacts.phone` / `contacts.email`. `contacts.phone` and `contacts.email` are KEPT as the denormalized primary (first non-bad primary for the contact itself) and are rewritten by the worker whenever phones/emails change. Lists and dedupe stay fast; detail views read the tables.

Relationship type suggestions (free text, like FUB): Spouse, Partner, Co-buyer, Parent, Child, Sibling, Friend, Lender, Attorney, Other.

### 4.4 `contacts` new columns
```
price                 INTEGER NULL         -- top of price range, whole dollars
timeframe             TEXT NULL            -- now | 0_3 | 3_6 | 6_12 | 12_plus
address               TEXT NOT NULL DEFAULT ''
last_communication_at TEXT NULL            -- MAX(created_at) of events kind IN (call,text,email)
```
Backfilled in the migration from existing events. `notes` stays and is labeled "Background". `type` stays (buyer/seller/both/other).

### 4.5 `events` new columns
```
updated_at TEXT NULL        -- set on edit; UI shows "edited"
starred    INTEGER NOT NULL DEFAULT 0
outcome    TEXT NULL        -- calls only: spoke | voicemail | no_answer | bad_number
```
Editable/deletable kinds: note, call, text, email. Others (lead_submission, stage_change, task_done, deal, system) are read-only but starrable.

### 4.6 `tasks` new column
```
type TEXT NOT NULL DEFAULT 'follow_up'   -- call | text | email | follow_up | showing | appointment | other
```
`due_at` keeps its current string form: `YYYY-MM-DD` or `YYYY-MM-DDTHH:MM` (Pacific-naive, matches reminders).

### 4.7 Migration mechanics
- Apply with `npx wrangler d1 migrations apply bvr-crm --remote` (0001/0002 were applied the same way; `d1_migrations` table tracks them). Take `npx wrangler d1 export bvr-crm --remote --output backups/bvr-crm-2026-09-14.sql` first (gitignored).
- Deploy the worker immediately after applying: the old worker reads `contacts.tags`, which the migration drops.
- Local dev uses `--local` against `.wrangler/state`.

## 5. Worker API (all `/api/studio/crm/*`, studio-gated; existing deal/milestone/checklist/portal/push routes unchanged)

### Stages & tags
- `GET /stages` → `{ stages: Stage[] }` ordered by sort_order.
- `POST /stages` `{name, color, description?}` → 201 stage. `PATCH /stages/:id` `{name?, color?, description?}`. `POST /stages/reorder` `{ids: string[]}` (must be a permutation of all ids). `DELETE /stages/:id?reassign=<stageId>` — 400 for system stages or missing/invalid reassign; moves contacts, logs a `stage_change` event per moved contact.
- `GET /tags` → `{ tags: {id, name, count}[] }`. `PATCH /tags/:id {name}` — if the new name matches another tag (NOCASE) the two merge (contact_tags re-pointed, duplicate pairs ignored, old tag deleted). `DELETE /tags/:id`.

### Contacts
- `GET /contacts` query params: `q`, `stages` (csv ids), `tagsAny`, `tagsNone` (csv tag ids), `source`, `type`, `lastComm` (`never` | `over:<days>` | `within:<days>`), `created` (`within:<days>` | `over:<days>`), `list` (smart list id; expands to its filter, other params still apply), `sort` (`name|last_communication|last_activity|created|stage`), `dir` (`asc|desc`), `limit` (default 500, max 1000). Response `{ contacts: ContactListRow[], counts: Record<stageId, n>, total }`. `ContactListRow` = contact columns + `tags: {id,name}[]` (one extra grouped query, not N+1). `q` matches first/last name, primary phone/email, any phones.number, any emails.address, and relationship first/last names (EXISTS subqueries).
- `GET /smart-lists` → `{ lists: {id, name, description, count}[] }` (five fixed lists, section 7).
- `GET /sources` → distinct non-null sources with counts.
- `POST /contacts` `{firstName, lastName, type?, stage?, source?, phones?: PhoneInput[], emails?: EmailInput[], tags?: string[]}` (also accepts legacy `name`, `phone`, `email`). Creates phone/email rows + denormalized primaries, get-or-create tags.
- `GET /contacts/:id` → `{ contact, phones, emails, relationships: (Relationship & {phones, emails})[], tags, events, tasks, deals: (Deal & {milestonesDone, milestonesTotal})[] }`.
- `PATCH /contacts/:id` `{firstName?, lastName?, type?, stage?, source?, price?, timeframe?, address?, notes?, tags?: string[]}` — tags replace-all by name (get-or-create). Stage change logs `stage_change` with stage names.
- `PUT /contacts/:id/phones` `{phones: PhoneInput[]}` and `PUT /contacts/:id/emails` `{emails: EmailInput[]}` — replace-all for the primary contact (relationship_id NULL), then rewrite denormalized primaries. `PhoneInput = {number, label, isPrimary?, isBad?}`; normalized; empty numbers dropped; exactly one primary (first if none flagged).
- `DELETE /contacts/:id` — also deletes phones, emails, relationships, contact_tags.
- `POST /contacts/:id/relationships` `{firstName, lastName, type, phones?, emails?}`; `PATCH /relationships/:id` same shape (phones/emails replace-all for that relationship); `DELETE /relationships/:id`.

### Events
- `POST /contacts/:id/events` `{kind, body, outcome?}` — `body` may be empty for a call with an outcome (body defaults to the outcome label). Updates `last_activity_at`; for call/text/email also `last_communication_at`.
- `PATCH /events/:id` `{body?, outcome?, starred?}` — body/outcome only for editable kinds; sets `updated_at` when body/outcome change (not for star toggles).
- `DELETE /events/:id` — editable kinds only. After patch/delete, recompute the contact's `last_communication_at`.

### Tasks
- `GET /tasks?view=today|overdue|upcoming|done` (today = due today; overdue = due before today; upcoming = due after today or no date; done = last 100). Response includes `today`.
- `POST /tasks` gains `type`, `PATCH /tasks/:id` gains `type`. Intake's auto "Respond to X" task uses type `call`.

### Dashboard
- `GET /dashboard` → `{ newLeads, unactioned (stage new AND last_communication_at IS NULL), tasksToday, tasksOverdue, dealsClosing30 (active/pending deals with target_close_date within 30 days), smartLists: [{id,name,count}], recent: (Event & {contact_name})[] }` — 15 most recent non-system events.

### Intake & import
- `ingestLead` dedupes against `phones.number` / `emails.address` (any row, including relationships'), then falls back to legacy `contacts.phone/email`. New contacts get phone/email rows.
- CSV import: `mapStage` maps "attempted" → `attempted_contact`, "appointment" → `appointment_set`, "nurture" → `nurture`; import writes phone/email rows and tag links (get-or-create by name). `importPlan` keeps returning tag names; the merge path appends names.

## 6. Front end

### 6.1 Shell — `CrmShell`
Replaces `StudioShell` on every `/studio/crm/*` page. Auth gate identical (reuses `useStudioAuth` + `LoginForm`). Provides `StagesContext` (fetches `/stages` once, exposes `stages`, `byId`, `refresh`).

- Desktop (≥1024px): navy top bar, 56px. Left: "← Studio" link, wordmark "Brenda Vega · CRM" in Cormorant gold. Center: nav links Dashboard · People · Pipeline · Tasks (gold underline on active). Right: search input (people search; Enter → `/studio/crm/people?q=`), gear (Settings), Sign out. Content max-width 1400px, canvas cream.
- Mobile (<1024px): slim navy header (title, optional back, optional right actions) + fixed bottom tab bar (Dashboard · People · Pipeline · Tasks · Settings) with safe-area padding, icons + 10px labels, gold active state. Content gets bottom padding so nothing hides under the bar.

### 6.2 Visual system
Brand palette (navy `#0F1D35`, gold `#C8A55B`, teal, cream canvas, ivory cards `#FCFBF7`) with FUB's structure: white/ivory cards with 1px navy/10 borders, 8px radius, quiet shadows, section headers in DM Sans caps with the gold hairline, body in Outfit, names in Cormorant. Avatars are initials on a color from the stage palette hashed by name.

Stage palette keys → `{bg, text, border, accent, solid}` exactly as today's `stageColors.ts`, extended: `gold, coral, steel, plum, teal, sage, amber, green, stone, gray, navy`. Custom stages pick any key. `StagePill` and pipeline columns take a `Stage` object from context, not a hard-coded map.

Tag bubbles: `rounded-full bg-navy/5 text-navy text-[0.65rem] px-2.5 py-1` with an × when editable. Same component on list rows, profile Details, and pickers.

### 6.3 People page — `/studio/crm/people`
- Header row: title with count ("All People · 348"), search, **Filters** button (badge with active count), **Sort** menu, **+ Add**.
- Smart lists: desktop = left sidebar (240px) with "All People" then the five lists, each with a count badge; mobile = horizontal scroll chip row under the search. Selecting one sets `?list=`. Stage pills with counts remain as a quick filter row (single-select, maps to `stages=`).
- Filters panel (sheet on mobile, popover on desktop): Stages (multi), Tags include, Tags exclude, Source, Type, Last communication (Any / Never / Over 3, 7, 14, 30, 90 days), Created (Any / Last 7, 30, 90 days). Apply → URL query (shareable, back-button safe). Clear all.
- Sort: Name A–Z, Last communication, Last activity, Newest, Oldest, Stage. Persist last choice in `localStorage`.
- Desktop table columns: Name (avatar + name + type), Stage (pill), Phone, Email, Tags (bubbles, +N overflow), Last communication ("12d · no contact" style), Created. Header click sorts. Mobile rows: avatar, name, stage pill + up to 2 tag bubbles, last-communication on the right.
- Clicking a row writes `sessionStorage['crm.nav'] = { ids, index, label, returnTo, scrollY }` then navigates to the contact. Returning restores query and scroll.
- Add sheet: first, last, phone, email, type, stage (default New), source (text, defaults "manual"), tags picker. On save → contact page.

### 6.4 Profile — `/studio/crm/contact?id=`
Header (both layouts): back (to `returnTo` or `/people`), name, stage pill, `‹ 3 of 48 ›` when nav state exists (← / → keys on desktop), `⋯` menu: Move to Trash, Delete permanently.

Desktop grid: `300px | 1fr | 300px`. Tablet: `300px | 1fr` with right cards under the left column. Mobile: identity card, then segmented control **Timeline · Details · Tasks & Deals**, one panel at a time; composer pinned above the bottom tab bar on Timeline.

Cards:
- **Identity**: avatar, name, "Last communication 7 days ago" / "No communication yet", phone rows (icon, formatted number, label; tap → `tel:`, second icon → `sms:`; bad numbers struck through), email rows (tap → `mailto:`), address (tap → Apple/Google Maps search), "Edit contact" → sheet with first/last, type, phones list (+ add, label select, primary radio, bad toggle, remove), emails list, address. Call/Text/Email quick-action buttons use the primary phone/email.
- **Relationships**: rows "Maria Vega · Spouse" with call/text/email icons for that person's own numbers; `+` → Add relationship sheet (first, last, type combobox with suggestions, phones, emails); tap row → edit sheet with Delete.
- **Details**: label/value rows. Stage → stage picker sheet (all stages, colors, current ticked). Source, Price (formatted `$520,000`), Timeframe (select), Type → inline edit sheet ("Edit details"). Tags row shows bubbles + `+` → Tag picker sheet: search box, existing tags as toggles (checked ones first), "Create ‘xyz’" row when no exact match, Save. Background: textarea, autosaves on blur with a "Saved" flash.
- **Composer** (center top): kind tabs Note · Call · Text · Email with icons. Textarea auto-grows (1–6 rows). Call shows outcome chips (Spoke · Left voicemail · No answer · Bad number); picking one prefills the body if empty. Cmd/Ctrl+Enter logs on desktop; button always. Optimistic append; failure restores the draft and shows an inline error.
- **Timeline**: tabs All · Notes · Calls · Texts · Emails · Activity · ★ with counts. Starred items render in a pinned "Starred" block on top when the All tab is active. Item: kind dot + icon, body (pre-wrap), outcome badge for calls, time (relative, `title` = exact local time), "edited" marker, star toggle, `⋯` → Edit / Delete for editable kinds. Edit = inline textarea with Save/Cancel.
- **Tasks**: open tasks with type icon, title, due (red when overdue), checkbox; "Show completed" toggle; `+` → sheet with title, type, date, time. Completing keeps the existing `task_done` event behavior.
- **Deals**: as today with progress "4/12 milestones" (from the server) and "+ Start deal".

### 6.5 Dashboard — `/studio/crm`
Tiles (2×2 on mobile, 4-up desktop): New leads (+ "N unactioned"), Tasks today (+ "N overdue" in red), Deals closing in 30 days, Smart list shortcut tile showing "Needs Contact · N". Under them: Smart lists list (name, description, count → People filtered). Then Recent activity: 15 rows (avatar, contact name, kind icon + body preview, relative time) → profile. Studio home's Clients card keeps `SummaryStrip` (now reads `/dashboard`).

### 6.6 Tasks — `/studio/crm/tasks`
Segmented tabs Today · Overdue · Upcoming · Done with counts. Row: checkbox, type icon, title, contact name (link), due (date + time if set). Quick add bar: title, type, date, contact search (typeahead against `/contacts?q=`), Add. Overdue tab has "Move all to today".

### 6.7 Pipeline — `/studio/crm/pipeline`
Existing board and mobile sections, but columns come from `StagesContext` (all stages except `archived`), colors from the palette key, move-sheet lists all stages.

### 6.8 Settings — `/studio/crm/settings` (+ `/stages`, `/tags`)
Hub cards: Notifications (existing push UI moved into `/settings/notifications`), Stages, Tags, Import CSV. Stages page: ordered list, up/down arrows (no drag dependency), color swatch popover, inline rename, description, lock icon on system stages, Delete → sheet "Move its N contacts to …" then confirm; "+ Add stage" form. Tags page: search, table of name + count, inline rename (merge notice when the name exists), delete with count confirm.

### 6.9 Deal page
Moves onto `CrmShell` (mobile back → contact). No functional change.

## 7. Seeded smart lists (fixed in Phase 1; `src/lib/crm/smartLists.ts`)
| id | name | filter |
|---|---|---|
| needs_contact | Needs Contact | stages new, attempted_contact · created within 11d · lastComm never or over 1d |
| potential_prospects | Potential Prospects | stages new, attempted_contact, contacted · created within 31d · lastComm never or over 5d |
| current_clients | Current Clients | stages appointment_set, active, under_contract · lastComm never or over 5d |
| nurture | Nurture | stage nurture · lastComm never or over 7d |
| past_clients | Past Clients & Sphere | stages closed, sphere · lastComm never or over 90d |

Each list carries a one-line description shown on the dashboard and people page (adapted from FUB's).

## 8. Pure libraries (jest-tested; must not import `env.ts`)
- `src/lib/crm/stages.ts` — `SYSTEM_STAGE_IDS`, `STAGE_PALETTE` keys, `slugifyStageName`, `nextStageId(existingIds, name)`, `Stage` type, `isSystemStage`.
- `src/lib/crm/filters.ts` — `parseFilters(URLSearchParams)`, `buildContactWhere(filters, todayIso)` → `{ where, binds }` with escaped LIKE, `SORT_SQL` map. Smart list expansion happens here.
- `src/lib/crm/smartLists.ts` — definitions above.
- `src/lib/crm/format.ts` — `formatPhone`, `formatPrice`, `relativeTime`, `lastCommunicationLabel(iso|null, now)`, `initials`, `avatarColor(name)`.
- `src/lib/crm/nav.ts` — read/write of the list-navigation session state.
- `src/lib/crm/contactsInput.ts` — `normalizePhoneInputs`, `normalizeEmailInputs` (dedupe, exactly one primary, drop empties).
- Existing `normalize.ts` keeps `normalizePhone/Email/splitName`; `STAGES`/`STAGE_LABELS` are removed and every consumer switches to the table/context. `csv.ts` `mapStage` returns a stage id string.

## 9. Error handling & edge cases
- Every mutation is optimistic where cheap (stage, star, task check, tag toggle) with revert + inline error on failure; sheets disable their Save while busy and keep the draft on failure.
- Deleting the stage a smart list references leaves the list valid but empty.
- A contact whose `stage` no longer exists (should not happen; DELETE reassigns) renders a gray "Unknown" pill and the picker fixes it.
- Prev/next stops at the ends; if `crm.nav` is missing the arrows are hidden.
- Event delete of the newest call recomputes `last_communication_at`.
- 401 anywhere → reload (existing studio convention).

## 10. Testing & verification
- Jest: filters SQL builder (each param, combinations, LIKE escaping, smart list expansion), stages slug/collision, contactsInput normalization, format helpers, csv mapStage additions, importPlan tag-name merge.
- `npm run typecheck:worker`, `npm run lint`, `npm run build`.
- Local run: `wrangler d1 migrations apply bvr-crm --local`, seed a few contacts through the API, `npx wrangler dev`, screenshot audit at 390px and 1280px via the puppeteer/Edge helper for People, Profile (all three mobile tabs), Dashboard, Tasks, Settings → Stages/Tags.
- Production: backup export → apply migration → deploy → smoke-check People count = 348, tags count > 0, a profile loads with phones/emails rows, log a call and confirm `last_communication_at` and the dashboard unactioned count move.

## 11. Out of scope (Phase 1)
Saved custom smart lists, files, mass actions, duplicate merge, appointments/calendar, drip email, custom fields, team/assignee features, IDX activity feed.
