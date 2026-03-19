# Brenda Vega Realty — Calculators, Integrations & Lead Capture Design

**Date:** 2026-03-18
**Project:** brendavegarealty.com
**Stack:** Next.js 14+ App Router, Tailwind CSS, Framer Motion, Cloudflare Pages with `@cloudflare/next-on-pages`

---

## Overview

Add two Bay Area-focused financial calculators, replace Google Calendar with Outlook (Microsoft 365), add a phone tap lead capture modal, and unify all lead capture into Follow Up Boss via a single API route. All calculator logic runs client-side for instant feedback. Server-side routes handle lead capture, calendar, and CRM integration only.

---

## 0. Deployment Architecture Change

### Problem

The project currently uses `output: "export"` in `next.config.ts`, which produces a fully static site. API routes (`/api/*`) are silently dropped during static export. This spec introduces server-side API routes for lead capture, Outlook calendar, and scheduling — these require a server runtime.

### Solution

**Remove `output: "export"` and use `@cloudflare/next-on-pages`** for full Next.js support on Cloudflare Pages. This package is already installed as a dependency but unused due to the static export setting.

**Changes required:**
1. Remove `output: "export"` from `next.config.ts`
2. Update `wrangler.toml` build command to use `npx @cloudflare/next-on-pages`
3. API routes work as standard Next.js App Router route handlers
4. Static pages are still pre-rendered at build time (no performance regression for non-API pages)
5. API routes run as Cloudflare Workers at the edge

### Rate Limiting

The existing `rate-limit.ts` uses an in-memory `Map`, which does not persist across Cloudflare Worker isolates. For production, replace with **Cloudflare KV**:
- Create a KV namespace `RATE_LIMITS`
- Store `{ip}:{endpoint}` keys with TTL matching the rate window
- Atomic increment via KV read-then-write (acceptable for rate limiting — doesn't need Durable Objects precision)
- Fallback: if KV is unavailable, allow the request (fail-open, don't block legitimate users)

---

## 1. Lead Capture Modal

### Component: `LeadCaptureModal`

A shared, mandatory modal that blocks access to calculators and intercepts the phone tap CTA. No dismiss button, no click-outside-to-close.

### Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Full Name | text | yes | |
| Phone | tel | yes | validated format |
| Email | email | yes | validated format |
| Working with an agent? | radio (Yes/No) | yes | |
| Timeline to buy | dropdown | yes | Options: 0-3 months, 3-6 months, 6-12 months, 12+ months, Just browsing |

### Behavior

- Appears immediately when user navigates to a calculator page or taps the phone CTA
- Cannot be dismissed without completing all fields and submitting
- On submit: hits `POST /api/lead` with appropriate `source` tag
- On success: stores flag in `localStorage` (`brv_lead_captured = true`) so the modal is skipped on subsequent visits from the same device
- If `localStorage` flag exists, calculator loads directly / phone call fires immediately

### Props

- `source`: `"qualification-calculator"` | `"cost-calculator"` | `"phone-call"`
- `onComplete`: callback fired after successful submission (triggers calculator render or tel: link)

---

## 2. "Do I Qualify for a Home in the Bay Area?" Calculator

### Route: `/calculators/qualify`

### User Inputs

| Input | Type | Default | Notes |
|-------|------|---------|-------|
| City/Area | dropdown | — | Bay Area cities within 75mi of Campbell (~40-50 cities) |
| Purchase Price | number input / slider | City median | Pre-filled from city data |
| Down Payment | number + % toggle | 20% | Shows both $ and % |
| Annual Gross Income | number | — | Required |
| Monthly Debts | number | — | Credit cards, car, student loans, other (itemized inputs) |
| Current Monthly Rent | number | — | For rent vs buy comparison |
| Credit Score Range | dropdown | — | 580-619, 620-639, 640-679, 680-719, 720+ |
| Tax Filing Status | dropdown | Single | Single, Married Filing Jointly |
| Federal Tax Bracket | dropdown | Auto-estimated | Editable, auto-estimated from income + filing status |
| CA State Tax Bracket | dropdown | Auto-estimated | Editable, auto-estimated from income + filing status |
| Home Appreciation Rate | number | City historical avg | Pre-filled per city, user-editable, city avg shown as hint |

### Results — All update in real-time as inputs change

#### Qualification Panel (Conventional vs FHA side by side)

For each loan type:
- Loan amount
- Monthly payment breakdown: principal + interest, property tax, hazard insurance, PMI/MIP (if applicable), HOA
- Total monthly payment
- DTI ratio with visual gauge (green ≤ 35%, yellow 35-45%, red > 45%)
- Qualification verdict: "Likely qualifies" / "Borderline" / "May not qualify"
- Explanation text based on DTI and credit score

DTI guidelines displayed:
- Conventional: ≤ 45% with 640+ FICO
- FHA: ≤ 55% with 620+ FICO

#### Rent vs Buy Panel

- Current rent vs after-tax monthly cost of buying (shown for both loan types)
- Monthly savings/cost difference
- Tax savings breakdown:
  - Mortgage interest deduction (capped at $750K qualified amount)
  - Property tax deduction
  - Compared against standard deduction
  - Combined federal + state tax savings
- Home value projection at 5 and 10 years (using city appreciation rate)
- Net gain/loss vs renting at 5 and 10 years
- Line chart: rent vs buy cost over 10-year timeline

### Calculation Formulas

**Monthly Payment (PMT):**
```
M = P * [r(1+r)^n] / [(1+r)^n - 1]
where P = loan amount, r = monthly rate, n = 360 (or 180 for 15yr)
```

**FHA Loan Amount:**
```
Base Loan = Purchase Price * 0.965 (3.5% minimum down)
FHA Loan = Base Loan + (Base Loan * 0.0175) (upfront MIP rolled in)
```

**DTI:**
```
DTI = (Total Monthly Debts + Total Housing Payment) / (Annual Income / 12)
```

**Tax Savings (estimated — disclaimer shown to user):**

Note: This is an estimate. The calculator displays a disclaimer: "Tax savings are approximate. Consult a tax professional for your specific situation." The SALT cap and itemization threshold make exact calculation dependent on the taxpayer's full return.

```
Monthly Mortgage Interest = min(Loan Amount, $750,000) * Annual Rate / 12
Monthly Property Tax = Purchase Price * Tax Rate / 12

Federal deductions:
  Federal Deductible Interest = Monthly Mortgage Interest
  Federal SALT Deduction = min(Monthly Property Tax + (estimated state income tax / 12), $10,000 / 12)
  Federal Total Itemized = Federal Deductible Interest + Federal SALT Deduction
  Federal Tax Savings = max(0, Federal Total Itemized - Standard Deduction / 12) * Federal Rate

State deductions (CA does not have SALT cap):
  State Deductible Interest = Monthly Mortgage Interest
  State Property Tax Deduction = Monthly Property Tax
  State Total Itemized = State Deductible Interest + State Property Tax Deduction
  State Tax Savings = max(0, State Total Itemized - (CA Standard Deduction / 12)) * State Rate

Total Tax Savings/month = Federal Tax Savings + State Tax Savings
After-Tax Payment = Total Monthly Payment - Total Tax Savings
```

**Rent vs Buy:**
```
True Cost of Buying = After-Tax Payment - Monthly Principal Paid
Monthly Gain/Loss = Current Rent - True Cost
Home Value at N years = FV(appreciation rate, N, 0, -Purchase Price)
Net Gain at N years = (Future Value - Purchase Price) + (Monthly Gain * N * 12)
```

---

## 3. "Bay Area Mortgage / Closing Cost & Payment Calculator"

### Route: `/calculators/costs`

### User Inputs

| Input | Type | Default | Notes |
|-------|------|---------|-------|
| City/Area | dropdown | — | Same Bay Area city list |
| Purchase Price | number | City median | |
| Down Payment | number + % toggle | 20% | |
| Interest Rate | number | Current avg (~6%) | Editable |
| Loan Term | dropdown | 30 years | Options: 15, 20, 30 years |
| Loan Type | dropdown | Conventional | Conventional / FHA |
| Property Tax Rate | number | City-specific | Pre-filled, editable |
| Hazard Insurance | number/month | $75 | |
| HOA | number/month | $0 | |
| Close of Escrow Date | date picker | — | Used for prorated closing costs |

### Results

#### Payment Breakdown Panel

- Monthly principal & interest
- Property tax
- Hazard insurance
- PMI/MIP (if applicable)
- HOA
- Total monthly payment
- Pie chart showing proportion of each component

#### Closing Costs Panel

**Default view: Buyer costs (itemized)**

Pre-paid / recurring:
- Prorated property tax (based on escrow date)
- Pre-paid interest (based on escrow date, calculated as daily interest × remaining days in month)
- 12-month hazard insurance
- HOA transfer fee (if applicable)

Fixed / non-recurring:
- Lender's title insurance: ~$1,675 (scaled by loan amount: $1,675 base for $960K loan, roughly $1.75 per $1,000)
- Admin / deed / notary fees: $700 flat
- Lender fees (origination/processing): $1,500 flat
- Inspection fees: $500 flat (home inspection)
- Impound accounts: 2 months property tax + 2 months hazard insurance as reserves

**Grand Total Estimated Buyer Costs**
**Total Funds Needed = Down Payment + Closing Costs**

**Toggle: Seller Costs (from Net Sheet data)**

- Seller agent commission (default 2.5%, editable)
- Buyer agent commission (default 2.5%, editable)
- Owner's title insurance
- Escrow fee + processing
- Transfer tax (city-specific from city data)
- Recording fees
- Inspections (termite, NHD report)
- Home warranty
- Transaction coordinator
- **Net Proceeds = Sale Price − All Costs**
- Commission rates and sale price are adjustable

#### Amortization Panel

- **Summary:** total payments, total interest paid, payoff date
- **Interactive chart:** area chart showing principal vs interest over loan life, with year markers
- **Year-by-year table:** collapsible, shows annual principal/interest/balance
- **Full monthly table:** collapsible, lazy-loaded for performance (360 rows)
- **Export PDF button**

#### PDF Export

Generated client-side using `jsPDF` + `jspdf-autotable`. Chosen over `@react-pdf/renderer` because jsPDF provides direct canvas control needed for the diagonal tiled watermark.

**Header:**
- Brenda Vega logo (SVG)
- "Brenda Vega | REALTOR® | DRE #02196981"
- Phone: (501) 827-9619 | Email: brenda.vega@c21anew.com
- brendavegarealty.com

**Body:**
- All calculator inputs summarized
- Payment breakdown
- Closing costs (whichever view was active)
- Amortization summary + year-by-year table + full monthly schedule

**Footer:**
- "Prepared by Brenda Vega | Century 21"
- "Estimates only. Consult a licensed mortgage professional for exact figures."
- Date generated

**Watermark:**
- Diagonal semi-transparent text repeating across every page
- Text: "Prepared by Brenda Vega | brendavegarealty.com"
- Opacity: ~15%, rotated ~45°, tiled so it can't be cropped out

---

## 4. Outlook Calendar Integration (Microsoft 365)

### Replaces existing Google Calendar integration

### Architecture

- **App registration** in Microsoft Entra ID (Azure AD) for Brenda's M365 tenant
- **Application permissions** (daemon/service flow) — no user login required at runtime
- Microsoft Graph API for calendar operations

### API Routes

#### `GET /api/schedule/availability`

- Queries Brenda's Outlook calendar via Graph API `getSchedule` endpoint
- Returns available time slots for the next 14 days
- Business hours: configurable (default 9am-6pm PT, Mon-Sat)
- Filters out existing calendar events (busy/tentative/OOF)
- Returns 30-minute time slots

#### `POST /api/schedule/book`

- Creates a calendar event on Brenda's Outlook calendar via Graph API
- Event includes: client name, phone, email, meeting type
- Sends confirmation emails via Resend to both Brenda and the client
- Creates FUB lead via `/api/lead` with source `scheduler`

### Scheduler UI

**Significant rewrite of existing `Scheduler` component.** The current implementation generates static time slots locally and submits via `mailto:` link — it has no API integration. The rewrite will:
- Replace static slot generation with `fetch('/api/schedule/availability')` calls
- Replace `mailto:` submission with `fetch('/api/schedule/book')` calls
- Add Saturday to the available dates (current code filters out weekends)
- Extend business hours from 9am-5pm to 9am-6pm PT
- Keep the existing UI structure (date picker → time slots → booking form) and brand styling

Flow after rewrite:
- User picks a date → fetches real available slots from `/api/schedule/availability`
- Picks a slot → confirms booking details
- On confirm → hits `/api/schedule/book`

### Environment Variables

```
MICROSOFT_TENANT_ID=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_USER_ID=        # Brenda's M365 user ID for calendar access
```

### Library

- `@microsoft/microsoft-graph-client` for Graph API calls
- `@azure/identity` for authentication (ClientSecretCredential)

---

## 5. Phone Tap Pre-Call Modal

### Modifies: `MobileCTABar` component

### Current Behavior
Tapping "Call Brenda" immediately fires `tel:(501) 827-9619`.

### New Behavior

1. User taps "Call Brenda"
2. `LeadCaptureModal` opens with `source="phone-call"`
3. User completes all 5 fields
4. On submit → `POST /api/lead` creates FUB contact tagged `phone-call`
5. On success → `window.location.href = "tel:5018279619"` fires the call
6. If `localStorage` flag `brv_lead_captured` exists → skip modal, fire call immediately

---

## 6. Bay Area City Data

### File: `src/data/bay-area-cities.ts`

### Structure

```typescript
interface BayAreaCity {
  name: string;
  county: string;
  propertyTaxRate: number;       // e.g., 0.0125 for 1.25%
  transferTaxRate: number;       // per $1000 of sale price, 0 if none
  historicalAppreciation: number; // annual avg, e.g., 0.04 for 4%
  medianHomePrice: number;       // e.g., 1200000
}
```

### Cities (~40-50)

All within approximately 75 miles of Campbell, CA. Includes but not limited to:

**Santa Clara County:** Campbell, San Jose, Santa Clara, Cupertino, Sunnyvale, Mountain View, Palo Alto, Los Altos, Los Gatos, Saratoga, Milpitas, Morgan Hill, Gilroy

**San Mateo County:** Redwood City, San Mateo, Foster City, Burlingame, San Carlos, Menlo Park, Half Moon Bay, Daly City, South San Francisco, Pacifica

**Alameda County:** Fremont, Hayward, Oakland, Berkeley, Union City, Newark, Pleasanton, Livermore, Dublin, San Leandro, Alameda

**Contra Costa County:** Walnut Creek, Concord, Pleasant Hill, Martinez, San Ramon, Danville

**San Francisco:** San Francisco

**Santa Cruz County:** Santa Cruz, Scotts Valley, Capitola, Watsonville

### Data Sources

- Property tax rates: county assessor offices (base rate + typical local assessments)
- Historical appreciation: Zillow Home Value Index (ZHVI) 5-year average
- Median home prices: California Association of Realtors (CAR) recent quarterly data
- Transfer taxes: city municipal codes

### Update Process

Edit `bay-area-cities.ts` directly — no code changes needed in components. Recommended update frequency: annually or when market conditions shift significantly.

---

## 7. Unified `/api/lead` Route

### Route: `POST /api/lead`

### Request Body

```typescript
interface LeadRequest {
  // Required fields (from modal)
  name: string;
  phone: string;
  email: string;
  workingWithAgent: boolean;
  timeline: "0-3 months" | "3-6 months" | "6-12 months" | "12+ months" | "Just browsing";
  source: "qualification-calculator" | "cost-calculator" | "phone-call" | "scheduler" | "contact-form";

  // Optional (from calculator results)
  calculatorSummary?: {
    purchasePrice?: number;
    downPayment?: number;
    loanType?: string;
    dtiRatio?: number;
    qualificationStatus?: string;
    monthlyPayment?: number;
    city?: string;
  };
}
```

### Processing

1. **Validate** all required fields. Return 400 if missing/invalid.
2. **Rate limit** by IP using Cloudflare KV (see Section 0 — Deployment Architecture Change). 5 leads per IP per hour.
3. **Create FUB contact** via extended `follow-up-boss.ts` client (see note below):
   - `firstName` / `lastName`: parsed from `name`
   - `phones`: `[{ value: phone }]`
   - `emails`: `[{ value: email }]`
   - `source`: mapped from `source` field (e.g., "Qualification Calculator - brendavegarealty.com")
   - `tags`: array built from:
     - Source tag: `qualification-calculator`, `cost-calculator`, `phone-call`, or `scheduler`
     - Agent status: `has-agent` or `no-agent`
     - Timeline: `timeline-0-3mo`, `timeline-3-6mo`, `timeline-6-12mo`, `timeline-12mo+`, `timeline-browsing`
   - `notes`: if `calculatorSummary` provided, append formatted note:
     ```
     Calculator Results:
     City: San Jose
     Purchase Price: $800,000
     Down Payment: $80,000 (10%)
     Loan Type: Conventional
     DTI Ratio: 38%
     Status: Likely qualifies
     Monthly Payment: $5,230
     ```
4. **Return** `{ success: true }` or `{ success: false, error: "message" }`.

### Follow Up Boss Client Changes

The existing `follow-up-boss.ts` uses the **Events API** (`/v1/events`) with a limited payload (name, email, phone, message). It needs to be extended with a new `createLeadWithDetails()` function that uses the **People API** (`/v1/people`) to support:
- `tags` array for source, agent status, and timeline tagging
- `notes` for appending calculator summary
- Custom fields if FUB account has them configured

The existing `createLead()` function stays intact for the contact form. The new function is used by `/api/lead`.

### Error Handling & Loading States

- **Modal submit loading:** Show spinner on submit button, disable form fields during submission
- **FUB API failure (500):** Store lead data in `localStorage` (`brv_pending_lead`) for background retry. Close the modal and allow calculator access. On next page load, attempt to re-submit the stored lead silently.
- **Rate limited (429):** Show friendly message: "Please wait a moment before trying again."
- **Validation error (400):** Highlight invalid fields inline, do not close modal.

### Response Codes

- `200` — lead created
- `400` — validation error
- `429` — rate limited
- `500` — FUB API error (graceful failure — user still gets calculator access)

---

## New File Summary

| File | Purpose |
|------|---------|
| `src/components/ui/LeadCaptureModal.tsx` | Shared mandatory lead capture modal |
| `src/app/calculators/qualify/page.tsx` | Qualification calculator page |
| `src/app/calculators/costs/page.tsx` | Cost calculator page |
| `src/components/calculators/QualificationCalculator.tsx` | Qualification calc logic + UI |
| `src/components/calculators/CostCalculator.tsx` | Cost calc logic + UI |
| `src/components/calculators/PaymentBreakdown.tsx` | Payment pie chart + breakdown |
| `src/components/calculators/ClosingCosts.tsx` | Itemized closing costs (buyer/seller toggle) |
| `src/components/calculators/AmortizationPanel.tsx` | Chart + tables + PDF export |
| `src/components/calculators/RentVsBuy.tsx` | Rent vs buy comparison + chart |
| `src/components/calculators/QualificationPanel.tsx` | DTI gauge + side-by-side conv/FHA |
| `src/components/calculators/DtiGauge.tsx` | Visual DTI ratio gauge |
| `src/lib/calculator-utils.ts` | Shared math functions (PMT, DTI, tax savings, amortization) |
| `src/lib/pdf-export.ts` | Branded PDF generation with watermark |
| `src/lib/microsoft-graph.ts` | Microsoft Graph API client for Outlook calendar |
| `src/data/bay-area-cities.ts` | City data (tax rates, appreciation, medians) |
| `src/app/api/lead/route.ts` | Unified lead capture → Follow Up Boss |
| `src/app/api/schedule/availability/route.ts` | Outlook calendar availability (rewrite) |
| `src/app/api/schedule/book/route.ts` | Outlook calendar booking (rewrite) |

## Modified Files

| File | Change |
|------|--------|
| `src/components/layout/MobileCTABar.tsx` | Intercept call tap with LeadCaptureModal |
| `src/components/layout/Navbar.tsx` | Add "Calculators" nav item with hover dropdown (desktop) / expandable section (mobile hamburger) linking to Qualify and Costs pages |
| `src/components/contact/Scheduler.tsx` | Significant rewrite: replace static slots + mailto with live Outlook API calls, add Saturday, extend hours to 6pm |
| `src/lib/google-calendar.ts` | Remove (was never wired up — replaced by microsoft-graph.ts) |
| `src/lib/follow-up-boss.ts` | Add `createLeadWithDetails()` using People API for tags/notes support |
| `src/lib/rate-limit.ts` | Rewrite to use Cloudflare KV instead of in-memory Map |
| `src/app/api/contact/route.ts` | Refactor to use `/api/lead` with `source: "contact-form"` |
| `next.config.ts` | Remove `output: "export"` for full Next.js + Cloudflare Pages Functions support |
| `wrangler.toml` | Update build command to use `@cloudflare/next-on-pages` |
| `.env.example` | Add Microsoft 365 env vars, remove Google Calendar vars |

## Dependencies to Add

- `jspdf` — client-side PDF generation
- `jspdf-autotable` — table formatting in PDFs
- `@microsoft/microsoft-graph-client` — Graph API
- `@azure/identity` — Azure AD authentication
- `recharts` — charts for amortization and rent vs buy (React-idiomatic, declarative API)
- `@cloudflare/workers-types` — type definitions for Cloudflare KV bindings
