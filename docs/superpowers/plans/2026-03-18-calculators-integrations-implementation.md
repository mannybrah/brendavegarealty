# Calculators, Integrations & Lead Capture — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two Bay Area financial calculators (qualification + cost), Outlook 365 calendar integration, phone tap lead capture, and a unified Follow Up Boss lead API — all behind mandatory lead capture modals.

**Architecture:** Client-side React calculators with real-time updates. Server-side Next.js API routes for lead capture (FUB), calendar (Microsoft Graph), and scheduling — deployed via `@cloudflare/next-on-pages` on Cloudflare Pages. Rate limiting via Cloudflare KV.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS 4, Framer Motion, Recharts, jsPDF, Microsoft Graph API, Follow Up Boss API, Resend, Cloudflare KV

**Spec:** `docs/superpowers/specs/2026-03-18-calculators-integrations-design.md`

---

## File Structure

```
brendavegarealty/
├── next.config.ts                                    # MODIFY: remove output: "export"
├── wrangler.toml                                     # MODIFY: add build command + KV binding
├── .env.example                                      # MODIFY: add M365 vars, remove Google vars
├── package.json                                      # MODIFY: add new dependencies
├── src/
│   ├── app/
│   │   ├── calculators/
│   │   │   ├── qualify/
│   │   │   │   └── page.tsx                          # CREATE: qualification calculator page
│   │   │   └── costs/
│   │   │       └── page.tsx                          # CREATE: cost calculator page
│   │   └── api/
│   │       ├── lead/
│   │       │   └── route.ts                          # CREATE: unified lead capture route
│   │       └── schedule/
│   │           ├── availability/
│   │           │   └── route.ts                      # CREATE: Outlook calendar availability
│   │           └── book/
│   │               └── route.ts                      # CREATE: Outlook calendar booking
│   ├── components/
│   │   ├── ui/
│   │   │   └── LeadCaptureModal.tsx                  # CREATE: mandatory lead capture modal
│   │   ├── layout/
│   │   │   ├── Navbar.tsx                            # MODIFY: add Calculators dropdown
│   │   │   └── MobileCTABar.tsx                      # MODIFY: intercept call with modal
│   │   ├── contact/
│   │   │   └── Scheduler.tsx                         # MODIFY: rewrite for Outlook API
│   │   └── calculators/
│   │       ├── QualificationCalculator.tsx            # CREATE: qualification calc container
│   │       ├── CostCalculator.tsx                     # CREATE: cost calc container
│   │       ├── QualificationPanel.tsx                 # CREATE: conv vs FHA side-by-side
│   │       ├── DtiGauge.tsx                           # CREATE: visual DTI gauge
│   │       ├── RentVsBuy.tsx                          # CREATE: rent vs buy comparison + chart
│   │       ├── PaymentBreakdown.tsx                   # CREATE: payment pie chart + breakdown
│   │       ├── ClosingCosts.tsx                       # CREATE: buyer/seller closing costs
│   │       └── AmortizationPanel.tsx                  # CREATE: chart + tables + PDF export
│   ├── lib/
│   │   ├── calculator-utils.ts                       # CREATE: PMT, DTI, tax, amortization math
│   │   ├── pdf-export.ts                             # CREATE: branded PDF with watermark
│   │   ├── microsoft-graph.ts                        # CREATE: M365 Graph API client
│   │   ├── follow-up-boss.ts                         # MODIFY: add createLeadWithDetails()
│   │   ├── rate-limit.ts                             # MODIFY: rewrite for Cloudflare KV
│   │   ├── google-calendar.ts                        # DELETE: replaced by microsoft-graph.ts
│   │   └── resend.ts                                 # EXISTING: no changes
│   ├── data/
│   │   ├── bay-area-cities.ts                        # CREATE: ~45 cities with tax/appreciation data
│   │   └── site.ts                                   # EXISTING: no changes
│   └── types/
│       └── index.ts                                  # MODIFY: add calculator + lead types
```

---

## Task 1: Deployment Architecture Change

**Files:**
- Modify: `next.config.ts`
- Modify: `wrangler.toml`
- Modify: `package.json`
- Modify: `.env.example`

- [ ] **Step 1: Install new dependencies**

```bash
cd /c/Users/DaVinci/Desktop/brendavegarealty
npm install recharts jspdf jspdf-autotable
npm install -D @cloudflare/workers-types
```

- [ ] **Step 2: Update next.config.ts — remove static export**

`next.config.ts` — replace entire file:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
```

The key change: remove `output: "export"`. This allows API routes to work with `@cloudflare/next-on-pages`.

- [ ] **Step 3: Update wrangler.toml**

`wrangler.toml` — replace entire file:
```toml
name = "brendavegarealty"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = ".vercel/output/static"

[vars]
ENVIRONMENT = "production"

[[kv_namespaces]]
binding = "RATE_LIMITS"
id = "placeholder_create_via_wrangler_kv_namespace_create"
```

Note: The KV namespace ID must be created via `wrangler kv namespace create RATE_LIMITS` and the actual ID pasted in before deploying.

- [ ] **Step 4: Update .env.example**

Add Microsoft 365 vars, remove Google Calendar vars:
```
# Follow Up Boss
FOLLOW_UP_BOSS_API_KEY=
FOLLOW_UP_BOSS_SYSTEM=brendavegarealty

# Microsoft 365 (Outlook Calendar)
MICROSOFT_TENANT_ID=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_USER_ID=

# Email
RESEND_API_KEY=

# Public
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_GA_MEASUREMENT_ID=
NEXT_PUBLIC_IDX_ACCOUNT_ID=
```

- [ ] **Step 5: Verify build succeeds**

```bash
npm run build
```

Expected: Build completes without `output: "export"`. Pages are still statically rendered. No API routes yet so nothing to fail.

- [ ] **Step 6: Commit**

```bash
git add next.config.ts wrangler.toml package.json package-lock.json .env.example
git commit -m "chore: switch from static export to @cloudflare/next-on-pages for API route support"
```

---

## Task 2: Types & Bay Area City Data

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/data/bay-area-cities.ts`

- [ ] **Step 1: Add new types to `src/types/index.ts`**

Append these types after the existing ones (do NOT remove existing types):

```typescript
// Lead capture types
export interface LeadRequest {
  name: string;
  phone: string;
  email: string;
  workingWithAgent: boolean;
  timeline: "0-3 months" | "3-6 months" | "6-12 months" | "12+ months" | "Just browsing";
  source: "qualification-calculator" | "cost-calculator" | "phone-call" | "scheduler" | "contact-form";
  calculatorSummary?: CalculatorSummary;
}

export interface CalculatorSummary {
  purchasePrice?: number;
  downPayment?: number;
  loanType?: string;
  dtiRatio?: number;
  qualificationStatus?: string;
  monthlyPayment?: number;
  city?: string;
}

// Bay Area city data
export interface BayAreaCity {
  name: string;
  county: string;
  propertyTaxRate: number;
  transferTaxRate: number;
  historicalAppreciation: number;
  medianHomePrice: number;
}

// Calculator types
export interface PaymentBreakdown {
  principalAndInterest: number;
  propertyTax: number;
  hazardInsurance: number;
  pmi: number;
  hoa: number;
  total: number;
}

export interface QualificationResult {
  loanAmount: number;
  payment: PaymentBreakdown;
  dtiRatio: number;
  verdict: "likely-qualifies" | "borderline" | "may-not-qualify";
  explanation: string;
}

export interface AmortizationRow {
  month: number;
  date: string;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface ClosingCostItem {
  label: string;
  amount: number;
  category: "prepaid" | "nonrecurring" | "seller";
  editable?: boolean;
}

export interface RentVsBuyResult {
  afterTaxPayment: number;
  monthlyTaxSavings: number;
  trueCostOfBuying: number;
  monthlyGainLoss: number;
  homeValueAt5Years: number;
  homeValueAt10Years: number;
  netGainAt5Years: number;
  netGainAt10Years: number;
}
```

- [ ] **Step 2: Create `src/data/bay-area-cities.ts`**

```typescript
import type { BayAreaCity } from "@/types";

export const bayAreaCities: BayAreaCity[] = [
  // Santa Clara County
  { name: "Campbell", county: "Santa Clara", propertyTaxRate: 0.0118, transferTaxRate: 0, historicalAppreciation: 0.05, medianHomePrice: 1650000 },
  { name: "San Jose", county: "Santa Clara", propertyTaxRate: 0.0125, transferTaxRate: 3.30, historicalAppreciation: 0.05, medianHomePrice: 1200000 },
  { name: "Santa Clara", county: "Santa Clara", propertyTaxRate: 0.0120, transferTaxRate: 0, historicalAppreciation: 0.05, medianHomePrice: 1500000 },
  { name: "Cupertino", county: "Santa Clara", propertyTaxRate: 0.0115, transferTaxRate: 0, historicalAppreciation: 0.06, medianHomePrice: 2800000 },
  { name: "Sunnyvale", county: "Santa Clara", propertyTaxRate: 0.0118, transferTaxRate: 0, historicalAppreciation: 0.05, medianHomePrice: 2000000 },
  { name: "Mountain View", county: "Santa Clara", propertyTaxRate: 0.0120, transferTaxRate: 3.30, historicalAppreciation: 0.06, medianHomePrice: 2200000 },
  { name: "Palo Alto", county: "Santa Clara", propertyTaxRate: 0.0125, transferTaxRate: 3.30, historicalAppreciation: 0.06, medianHomePrice: 3500000 },
  { name: "Los Altos", county: "Santa Clara", propertyTaxRate: 0.0115, transferTaxRate: 0, historicalAppreciation: 0.06, medianHomePrice: 4000000 },
  { name: "Los Gatos", county: "Santa Clara", propertyTaxRate: 0.0118, transferTaxRate: 0, historicalAppreciation: 0.05, medianHomePrice: 2500000 },
  { name: "Saratoga", county: "Santa Clara", propertyTaxRate: 0.0115, transferTaxRate: 0, historicalAppreciation: 0.05, medianHomePrice: 3800000 },
  { name: "Milpitas", county: "Santa Clara", propertyTaxRate: 0.0125, transferTaxRate: 0, historicalAppreciation: 0.05, medianHomePrice: 1350000 },
  { name: "Morgan Hill", county: "Santa Clara", propertyTaxRate: 0.0120, transferTaxRate: 0, historicalAppreciation: 0.04, medianHomePrice: 1100000 },
  { name: "Gilroy", county: "Santa Clara", propertyTaxRate: 0.0125, transferTaxRate: 0, historicalAppreciation: 0.04, medianHomePrice: 900000 },
  // San Mateo County
  { name: "Redwood City", county: "San Mateo", propertyTaxRate: 0.0115, transferTaxRate: 0, historicalAppreciation: 0.05, medianHomePrice: 1800000 },
  { name: "San Mateo", county: "San Mateo", propertyTaxRate: 0.0112, transferTaxRate: 0, historicalAppreciation: 0.05, medianHomePrice: 1700000 },
  { name: "Foster City", county: "San Mateo", propertyTaxRate: 0.0115, transferTaxRate: 0, historicalAppreciation: 0.05, medianHomePrice: 1900000 },
  { name: "Burlingame", county: "San Mateo", propertyTaxRate: 0.0110, transferTaxRate: 0, historicalAppreciation: 0.05, medianHomePrice: 2300000 },
  { name: "San Carlos", county: "San Mateo", propertyTaxRate: 0.0112, transferTaxRate: 0, historicalAppreciation: 0.05, medianHomePrice: 2200000 },
  { name: "Menlo Park", county: "San Mateo", propertyTaxRate: 0.0110, transferTaxRate: 0, historicalAppreciation: 0.06, medianHomePrice: 2800000 },
  { name: "Half Moon Bay", county: "San Mateo", propertyTaxRate: 0.0112, transferTaxRate: 0, historicalAppreciation: 0.04, medianHomePrice: 1600000 },
  { name: "Daly City", county: "San Mateo", propertyTaxRate: 0.0118, transferTaxRate: 0, historicalAppreciation: 0.04, medianHomePrice: 1100000 },
  { name: "South San Francisco", county: "San Mateo", propertyTaxRate: 0.0118, transferTaxRate: 0, historicalAppreciation: 0.04, medianHomePrice: 1150000 },
  { name: "Pacifica", county: "San Mateo", propertyTaxRate: 0.0115, transferTaxRate: 0, historicalAppreciation: 0.04, medianHomePrice: 1300000 },
  // Alameda County
  { name: "Fremont", county: "Alameda", propertyTaxRate: 0.0125, transferTaxRate: 0, historicalAppreciation: 0.05, medianHomePrice: 1400000 },
  { name: "Hayward", county: "Alameda", propertyTaxRate: 0.0130, transferTaxRate: 8.50, historicalAppreciation: 0.04, medianHomePrice: 850000 },
  { name: "Oakland", county: "Alameda", propertyTaxRate: 0.0140, transferTaxRate: 15.00, historicalAppreciation: 0.04, medianHomePrice: 850000 },
  { name: "Berkeley", county: "Alameda", propertyTaxRate: 0.0135, transferTaxRate: 15.00, historicalAppreciation: 0.05, medianHomePrice: 1400000 },
  { name: "Union City", county: "Alameda", propertyTaxRate: 0.0128, transferTaxRate: 0, historicalAppreciation: 0.04, medianHomePrice: 1100000 },
  { name: "Newark", county: "Alameda", propertyTaxRate: 0.0128, transferTaxRate: 0, historicalAppreciation: 0.04, medianHomePrice: 1050000 },
  { name: "Pleasanton", county: "Alameda", propertyTaxRate: 0.0120, transferTaxRate: 0, historicalAppreciation: 0.05, medianHomePrice: 1600000 },
  { name: "Livermore", county: "Alameda", propertyTaxRate: 0.0122, transferTaxRate: 0, historicalAppreciation: 0.04, medianHomePrice: 1050000 },
  { name: "Dublin", county: "Alameda", propertyTaxRate: 0.0130, transferTaxRate: 0, historicalAppreciation: 0.05, medianHomePrice: 1300000 },
  { name: "San Leandro", county: "Alameda", propertyTaxRate: 0.0130, transferTaxRate: 6.00, historicalAppreciation: 0.04, medianHomePrice: 800000 },
  { name: "Alameda", county: "Alameda", propertyTaxRate: 0.0130, transferTaxRate: 12.00, historicalAppreciation: 0.04, medianHomePrice: 1100000 },
  // Contra Costa County
  { name: "Walnut Creek", county: "Contra Costa", propertyTaxRate: 0.0118, transferTaxRate: 0, historicalAppreciation: 0.04, medianHomePrice: 1100000 },
  { name: "Concord", county: "Contra Costa", propertyTaxRate: 0.0125, transferTaxRate: 0, historicalAppreciation: 0.04, medianHomePrice: 750000 },
  { name: "Pleasant Hill", county: "Contra Costa", propertyTaxRate: 0.0120, transferTaxRate: 0, historicalAppreciation: 0.04, medianHomePrice: 950000 },
  { name: "Martinez", county: "Contra Costa", propertyTaxRate: 0.0122, transferTaxRate: 0, historicalAppreciation: 0.03, medianHomePrice: 700000 },
  { name: "San Ramon", county: "Contra Costa", propertyTaxRate: 0.0130, transferTaxRate: 0, historicalAppreciation: 0.05, medianHomePrice: 1500000 },
  { name: "Danville", county: "Contra Costa", propertyTaxRate: 0.0118, transferTaxRate: 0, historicalAppreciation: 0.05, medianHomePrice: 1800000 },
  // San Francisco
  { name: "San Francisco", county: "San Francisco", propertyTaxRate: 0.0118, transferTaxRate: 6.80, historicalAppreciation: 0.04, medianHomePrice: 1400000 },
  // Santa Cruz County
  { name: "Santa Cruz", county: "Santa Cruz", propertyTaxRate: 0.0110, transferTaxRate: 1.10, historicalAppreciation: 0.04, medianHomePrice: 1200000 },
  { name: "Scotts Valley", county: "Santa Cruz", propertyTaxRate: 0.0108, transferTaxRate: 0, historicalAppreciation: 0.04, medianHomePrice: 1300000 },
  { name: "Capitola", county: "Santa Cruz", propertyTaxRate: 0.0110, transferTaxRate: 0, historicalAppreciation: 0.04, medianHomePrice: 1150000 },
  { name: "Watsonville", county: "Santa Cruz", propertyTaxRate: 0.0115, transferTaxRate: 0, historicalAppreciation: 0.03, medianHomePrice: 750000 },
];

export function getCityByName(name: string): BayAreaCity | undefined {
  return bayAreaCities.find((c) => c.name === name);
}

export function getCitiesByCounty(county: string): BayAreaCity[] {
  return bayAreaCities.filter((c) => c.county === county);
}

export const counties = [...new Set(bayAreaCities.map((c) => c.county))];
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/data/bay-area-cities.ts
git commit -m "feat: add calculator types and Bay Area city data (45 cities)"
```

---

## Task 3: Calculator Math Utilities

**Files:**
- Create: `src/lib/calculator-utils.ts`

- [ ] **Step 1: Create `src/lib/calculator-utils.ts`**

All pure functions — no React, no side effects. These power both calculators.

```typescript
import type {
  PaymentBreakdown,
  QualificationResult,
  AmortizationRow,
  RentVsBuyResult,
  BayAreaCity,
} from "@/types";

// --- Core mortgage math ---

export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  if (principal <= 0 || annualRate <= 0 || termYears <= 0) return 0;
  const r = annualRate / 12;
  const n = termYears * 12;
  return (principal * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
}

export function calculateFHALoanAmount(
  purchasePrice: number,
  downPaymentPercent: number
): number {
  const baseLoan = purchasePrice * (1 - downPaymentPercent / 100);
  const upfrontMIP = baseLoan * 0.0175;
  return baseLoan + upfrontMIP;
}

export function calculateConventionalLoanAmount(
  purchasePrice: number,
  downPaymentPercent: number
): number {
  return purchasePrice * (1 - downPaymentPercent / 100);
}

// PMI: conventional loans with < 20% down, ~0.5-1% of loan annually
export function calculatePMI(
  loanAmount: number,
  purchasePrice: number,
  ltv: number
): number {
  if (ltv <= 80) return 0;
  return (loanAmount * 0.007) / 12; // ~0.7% annually
}

// FHA monthly MIP: ~0.55% annually for > 95% LTV, 0.50% for <= 95%
export function calculateFHAMonthlyMIP(
  loanAmount: number,
  ltv: number
): number {
  const rate = ltv > 95 ? 0.0055 : 0.005;
  return (loanAmount * rate) / 12;
}

// --- Payment breakdown ---

export function calculatePaymentBreakdown(
  purchasePrice: number,
  downPaymentPercent: number,
  annualRate: number,
  termYears: number,
  propertyTaxRate: number,
  hazardInsurance: number,
  hoa: number,
  loanType: "conventional" | "fha"
): PaymentBreakdown {
  const loanAmount =
    loanType === "fha"
      ? calculateFHALoanAmount(purchasePrice, downPaymentPercent)
      : calculateConventionalLoanAmount(purchasePrice, downPaymentPercent);

  const ltv = ((purchasePrice - purchasePrice * (downPaymentPercent / 100)) / purchasePrice) * 100;

  const principalAndInterest = calculateMonthlyPayment(loanAmount, annualRate, termYears);
  const propertyTax = (purchasePrice * propertyTaxRate) / 12;
  const pmi =
    loanType === "fha"
      ? calculateFHAMonthlyMIP(loanAmount, ltv)
      : calculatePMI(loanAmount, purchasePrice, ltv);

  return {
    principalAndInterest,
    propertyTax,
    hazardInsurance,
    pmi,
    hoa,
    total: principalAndInterest + propertyTax + hazardInsurance + pmi + hoa,
  };
}

// --- DTI ---

export function calculateDTI(
  monthlyDebts: number,
  monthlyHousingPayment: number,
  monthlyIncome: number
): number {
  if (monthlyIncome <= 0) return 0;
  return ((monthlyDebts + monthlyHousingPayment) / monthlyIncome) * 100;
}

export function getQualificationVerdict(
  dti: number,
  creditScoreMin: number,
  loanType: "conventional" | "fha"
): { verdict: QualificationResult["verdict"]; explanation: string } {
  if (loanType === "conventional") {
    if (creditScoreMin < 620) {
      return { verdict: "may-not-qualify", explanation: "Conventional loans typically require a minimum credit score of 620." };
    }
    if (dti <= 43 && creditScoreMin >= 640) {
      return { verdict: "likely-qualifies", explanation: "Your DTI and credit score meet conventional loan guidelines." };
    }
    if (dti <= 45 && creditScoreMin >= 640) {
      return { verdict: "borderline", explanation: "Your DTI is near the conventional limit of 45%. Strong compensating factors may help." };
    }
    if (dti <= 50 && creditScoreMin >= 720) {
      return { verdict: "borderline", explanation: "Higher DTI, but excellent credit may allow exceptions up to 50%." };
    }
    return { verdict: "may-not-qualify", explanation: "DTI exceeds conventional guidelines. Consider FHA or reducing debts." };
  }

  // FHA
  if (creditScoreMin < 580) {
    return { verdict: "may-not-qualify", explanation: "FHA loans require a minimum credit score of 580 for 3.5% down." };
  }
  if (dti <= 50 && creditScoreMin >= 620) {
    return { verdict: "likely-qualifies", explanation: "Your DTI and credit score meet FHA loan guidelines." };
  }
  if (dti <= 55 && creditScoreMin >= 620) {
    return { verdict: "borderline", explanation: "Your DTI is near the FHA limit. Strong residual income may help qualify." };
  }
  if (dti <= 50 && creditScoreMin >= 580) {
    return { verdict: "borderline", explanation: "Credit score meets FHA minimum. Lender overlays may vary." };
  }
  return { verdict: "may-not-qualify", explanation: "DTI exceeds FHA guidelines. Consider increasing income or reducing debts." };
}

// --- Tax savings ---

// Federal standard deductions (2025)
const FEDERAL_STANDARD_DEDUCTION = { single: 15000, married: 30000 };
const CA_STANDARD_DEDUCTION = { single: 5540, married: 11080 };
const SALT_CAP = 10000; // Federal SALT cap per year

export function estimateFederalTaxBracket(annualIncome: number, filingStatus: "single" | "married"): number {
  if (filingStatus === "married") {
    if (annualIncome <= 23200) return 0.10;
    if (annualIncome <= 94300) return 0.12;
    if (annualIncome <= 201050) return 0.22;
    if (annualIncome <= 383900) return 0.24;
    if (annualIncome <= 487450) return 0.32;
    if (annualIncome <= 731200) return 0.35;
    return 0.37;
  }
  if (annualIncome <= 11600) return 0.10;
  if (annualIncome <= 47150) return 0.12;
  if (annualIncome <= 100525) return 0.22;
  if (annualIncome <= 191950) return 0.24;
  if (annualIncome <= 243725) return 0.32;
  if (annualIncome <= 609350) return 0.35;
  return 0.37;
}

export function estimateCAStateTaxBracket(annualIncome: number, filingStatus: "single" | "married"): number {
  if (filingStatus === "married") {
    if (annualIncome <= 21198) return 0.01;
    if (annualIncome <= 50268) return 0.02;
    if (annualIncome <= 79338) return 0.04;
    if (annualIncome <= 110346) return 0.06;
    if (annualIncome <= 139418) return 0.08;
    if (annualIncome <= 712568) return 0.093;
    if (annualIncome <= 855680) return 0.103;
    if (annualIncome <= 1426520) return 0.113;
    return 0.123;
  }
  if (annualIncome <= 10599) return 0.01;
  if (annualIncome <= 25134) return 0.02;
  if (annualIncome <= 39669) return 0.04;
  if (annualIncome <= 55173) return 0.06;
  if (annualIncome <= 69709) return 0.08;
  if (annualIncome <= 356284) return 0.093;
  if (annualIncome <= 427840) return 0.103;
  if (annualIncome <= 713260) return 0.113;
  return 0.123;
}

export function calculateTaxSavings(
  loanAmount: number,
  annualRate: number,
  purchasePrice: number,
  propertyTaxRate: number,
  annualIncome: number,
  federalRate: number,
  stateRate: number,
  filingStatus: "single" | "married"
): { federalSavings: number; stateSavings: number; totalSavings: number } {
  const qualifiedLoan = Math.min(loanAmount, 750000);
  const monthlyMortgageInterest = (qualifiedLoan * annualRate) / 12;
  const monthlyPropertyTax = (purchasePrice * propertyTaxRate) / 12;

  // Estimate monthly state income tax (rough: stateRate * income / 12)
  const monthlyStateIncomeTax = (annualIncome * stateRate) / 12;

  // Federal: SALT cap applies
  const monthlySALT = Math.min(
    monthlyPropertyTax + monthlyStateIncomeTax,
    SALT_CAP / 12
  );
  const federalItemized = monthlyMortgageInterest + monthlySALT;
  const federalStdDeduction = FEDERAL_STANDARD_DEDUCTION[filingStatus] / 12;
  const federalSavings = Math.max(0, federalItemized - federalStdDeduction) * federalRate;

  // CA: no SALT cap
  const stateItemized = monthlyMortgageInterest + monthlyPropertyTax;
  const stateStdDeduction = CA_STANDARD_DEDUCTION[filingStatus] / 12;
  const stateSavings = Math.max(0, stateItemized - stateStdDeduction) * stateRate;

  return {
    federalSavings,
    stateSavings,
    totalSavings: federalSavings + stateSavings,
  };
}

// --- Rent vs Buy ---

export function calculateRentVsBuy(
  afterTaxPayment: number,
  monthlyTaxSavings: number,
  monthlyPrincipalPaid: number,
  currentRent: number,
  purchasePrice: number,
  appreciationRate: number
): RentVsBuyResult {
  const trueCostOfBuying = afterTaxPayment - monthlyPrincipalPaid;
  const monthlyGainLoss = currentRent - trueCostOfBuying;

  const homeValueAt5Years = purchasePrice * Math.pow(1 + appreciationRate, 5);
  const homeValueAt10Years = purchasePrice * Math.pow(1 + appreciationRate, 10);

  const netGainAt5Years = (homeValueAt5Years - purchasePrice) + (monthlyGainLoss * 60);
  const netGainAt10Years = (homeValueAt10Years - purchasePrice) + (monthlyGainLoss * 120);

  return {
    afterTaxPayment,
    monthlyTaxSavings,
    trueCostOfBuying,
    monthlyGainLoss,
    homeValueAt5Years,
    homeValueAt10Years,
    netGainAt5Years,
    netGainAt10Years,
  };
}

// --- Amortization ---

export function generateAmortizationSchedule(
  principal: number,
  annualRate: number,
  termYears: number,
  startDate?: Date
): AmortizationRow[] {
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, termYears);
  const r = annualRate / 12;
  const n = termYears * 12;
  const schedule: AmortizationRow[] = [];
  let balance = principal;
  const start = startDate || new Date();

  for (let i = 1; i <= n; i++) {
    const interest = balance * r;
    const principalPortion = monthlyPayment - interest;
    balance = Math.max(0, balance - principalPortion);

    const date = new Date(start);
    date.setMonth(date.getMonth() + i);

    schedule.push({
      month: i,
      date: date.toISOString().split("T")[0],
      payment: monthlyPayment,
      principal: principalPortion,
      interest,
      balance,
    });
  }

  return schedule;
}

export function getAmortizationSummary(schedule: AmortizationRow[]) {
  const totalPayments = schedule.reduce((sum, row) => sum + row.payment, 0);
  const totalInterest = schedule.reduce((sum, row) => sum + row.interest, 0);
  const totalPrincipal = schedule.reduce((sum, row) => sum + row.principal, 0);
  const payoffDate = schedule[schedule.length - 1]?.date || "";

  return { totalPayments, totalInterest, totalPrincipal, payoffDate };
}

// --- Closing costs ---

export function calculateBuyerClosingCosts(
  purchasePrice: number,
  loanAmount: number,
  propertyTaxRate: number,
  hazardInsurance: number,
  annualRate: number,
  escrowDate: Date,
  hoa: number
): ClosingCostItem[] {
  const monthlyPropertyTax = (purchasePrice * propertyTaxRate) / 12;
  const dailyInterest = (loanAmount * annualRate) / 365;
  const daysInMonth = new Date(escrowDate.getFullYear(), escrowDate.getMonth() + 1, 0).getDate();
  const remainingDays = daysInMonth - escrowDate.getDate();

  return [
    // Pre-paid
    { label: "Prorated Property Tax", amount: monthlyPropertyTax * (remainingDays / daysInMonth) * 2, category: "prepaid" },
    { label: "Pre-paid Interest", amount: dailyInterest * remainingDays, category: "prepaid" },
    { label: "12-Month Hazard Insurance", amount: hazardInsurance * 12, category: "prepaid" },
    { label: "HOA Transfer Fee", amount: hoa > 0 ? 300 : 0, category: "prepaid" },
    // Non-recurring
    { label: "Lender's Title Insurance", amount: Math.round(loanAmount * 0.00175), category: "nonrecurring" },
    { label: "Admin / Deed / Notary", amount: 700, category: "nonrecurring" },
    { label: "Lender Fees", amount: 1500, category: "nonrecurring" },
    { label: "Home Inspection", amount: 500, category: "nonrecurring" },
    { label: "Impound Account (Tax)", amount: monthlyPropertyTax * 2, category: "nonrecurring" },
    { label: "Impound Account (Insurance)", amount: hazardInsurance * 2, category: "nonrecurring" },
  ];
}

export function calculateSellerClosingCosts(
  salePrice: number,
  sellerCommissionRate: number,
  buyerCommissionRate: number,
  transferTaxRate: number
): ClosingCostItem[] {
  return [
    { label: "Seller Agent Commission", amount: salePrice * (sellerCommissionRate / 100), category: "seller", editable: true },
    { label: "Buyer Agent Commission", amount: salePrice * (buyerCommissionRate / 100), category: "seller", editable: true },
    { label: "Owner's Title Insurance", amount: 2900, category: "seller" },
    { label: "Escrow Fee + Processing", amount: 3425, category: "seller" },
    { label: "Transfer Tax", amount: (salePrice / 1000) * transferTaxRate, category: "seller" },
    { label: "Recording Fees", amount: 110, category: "seller" },
    { label: "Termite Inspection", amount: 500, category: "seller" },
    { label: "NHD Report", amount: 125, category: "seller" },
    { label: "Home Warranty", amount: 800, category: "seller" },
    { label: "Transaction Coordinator", amount: 425, category: "seller" },
  ];
}

// --- Formatting helpers ---

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

export function formatPercent(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

// First month's principal for rent vs buy calculation
export function getFirstMonthPrincipal(
  loanAmount: number,
  annualRate: number,
  termYears: number
): number {
  const monthlyPayment = calculateMonthlyPayment(loanAmount, annualRate, termYears);
  const firstMonthInterest = loanAmount * (annualRate / 12);
  return monthlyPayment - firstMonthInterest;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/calculator-utils.ts
git commit -m "feat: add calculator math utilities (PMT, DTI, tax savings, amortization, closing costs)"
```

---

## Task 4: Rate Limiting (Cloudflare KV)

**Files:**
- Modify: `src/lib/rate-limit.ts`

- [ ] **Step 1: Rewrite `src/lib/rate-limit.ts`**

Replace the entire file:

```typescript
interface RateLimitStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export async function checkRateLimit(
  store: RateLimitStore | null,
  key: string,
  maxRequests: number = 5,
  windowSeconds: number = 3600
): Promise<{ allowed: boolean; remaining: number }> {
  // Fail-open: if no KV store available, allow the request
  if (!store) {
    return { allowed: true, remaining: maxRequests };
  }

  try {
    const raw = await store.get(key);
    const count = raw ? parseInt(raw, 10) : 0;

    if (count >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    await store.put(key, String(count + 1), { expirationTtl: windowSeconds });
    return { allowed: true, remaining: maxRequests - (count + 1) };
  } catch {
    // Fail-open on KV errors
    return { allowed: true, remaining: maxRequests };
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/rate-limit.ts
git commit -m "refactor: rewrite rate-limit to use KV store interface (Cloudflare KV)"
```

---

## Task 5: Follow Up Boss Client Extension

**Files:**
- Modify: `src/lib/follow-up-boss.ts`

- [ ] **Step 1: Add `createLeadWithDetails()` to `src/lib/follow-up-boss.ts`**

Keep the existing `createLead()` function unchanged. Add the new function after it:

```typescript
export async function createLeadWithDetails(data: {
  name: string;
  email: string;
  phone: string;
  source: string;
  tags: string[];
  note?: string;
}): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.FOLLOW_UP_BOSS_API_KEY;
  if (!apiKey) {
    console.error("Follow Up Boss API key not configured");
    return { success: false, error: "CRM not configured" };
  }

  const nameParts = data.name.trim().split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  try {
    // Create/update person via People API
    const personResponse = await fetch(`${FUB_API_URL}/people`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${apiKey}:`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        firstName,
        lastName,
        emails: [{ value: data.email }],
        phones: [{ value: data.phone }],
        source: data.source,
        tags: data.tags,
      }),
    });

    if (!personResponse.ok) {
      const error = await personResponse.text();
      console.error("FUB People API error:", error);
      return { success: false, error: "Failed to create lead" };
    }

    // If there's a note, add it to the person
    if (data.note) {
      const person = await personResponse.json();
      const personId = person.id;

      if (personId) {
        await fetch(`${FUB_API_URL}/notes`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(`${apiKey}:`)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personId,
            body: data.note,
          }),
        });
      }
    }

    return { success: true };
  } catch (err) {
    console.error("FUB API error:", err);
    return { success: false, error: "Failed to connect to CRM" };
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/follow-up-boss.ts
git commit -m "feat: add createLeadWithDetails() using FUB People API with tags and notes"
```

---

## Task 6: Unified `/api/lead` Route

**Files:**
- Create: `src/app/api/lead/route.ts`

- [ ] **Step 1: Create `src/app/api/lead/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { createLeadWithDetails } from "@/lib/follow-up-boss";
import { checkRateLimit } from "@/lib/rate-limit";
import type { LeadRequest } from "@/types";

const SOURCE_LABELS: Record<string, string> = {
  "qualification-calculator": "Qualification Calculator - brendavegarealty.com",
  "cost-calculator": "Cost Calculator - brendavegarealty.com",
  "phone-call": "Phone Call - brendavegarealty.com",
  scheduler: "Scheduler - brendavegarealty.com",
  "contact-form": "Contact Form - brendavegarealty.com",
};

const TIMELINE_TAGS: Record<string, string> = {
  "0-3 months": "timeline-0-3mo",
  "3-6 months": "timeline-3-6mo",
  "6-12 months": "timeline-6-12mo",
  "12+ months": "timeline-12mo+",
  "Just browsing": "timeline-browsing",
};

function validateLeadRequest(body: unknown): { valid: true; data: LeadRequest } | { valid: false; error: string } {
  const b = body as Record<string, unknown>;

  if (!b.name || typeof b.name !== "string" || b.name.trim().length < 2) {
    return { valid: false, error: "Name is required (minimum 2 characters)" };
  }
  if (!b.email || typeof b.email !== "string" || !b.email.includes("@")) {
    return { valid: false, error: "Valid email is required" };
  }
  if (!b.phone || typeof b.phone !== "string" || b.phone.replace(/\D/g, "").length < 10) {
    return { valid: false, error: "Valid phone number is required (minimum 10 digits)" };
  }
  if (typeof b.workingWithAgent !== "boolean") {
    return { valid: false, error: "Working with agent field is required" };
  }
  if (!b.timeline || typeof b.timeline !== "string") {
    return { valid: false, error: "Timeline is required" };
  }
  if (!b.source || typeof b.source !== "string") {
    return { valid: false, error: "Source is required" };
  }

  return { valid: true, data: b as unknown as LeadRequest };
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
    let kvStore = null;
    try {
      const { env } = getRequestContext();
      kvStore = env.RATE_LIMITS ?? null;
    } catch {
      // getRequestContext() not available in dev mode — fail-open
    }

    const rateCheck = await checkRateLimit(kvStore, `lead:${ip}`, 5, 3600);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please wait a moment before trying again." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validation = validateLeadRequest(body);
    if (!validation.valid) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    const { data } = validation;

    // Build tags
    const tags: string[] = [
      data.source,
      data.workingWithAgent ? "has-agent" : "no-agent",
      TIMELINE_TAGS[data.timeline] || "timeline-unknown",
    ];

    // Build note from calculator summary
    let note: string | undefined;
    if (data.calculatorSummary) {
      const s = data.calculatorSummary;
      const lines = ["Calculator Results:"];
      if (s.city) lines.push(`City: ${s.city}`);
      if (s.purchasePrice) lines.push(`Purchase Price: $${s.purchasePrice.toLocaleString()}`);
      if (s.downPayment != null && s.purchasePrice) {
        const pct = ((s.downPayment / s.purchasePrice) * 100).toFixed(0);
        lines.push(`Down Payment: $${s.downPayment.toLocaleString()} (${pct}%)`);
      }
      if (s.loanType) lines.push(`Loan Type: ${s.loanType}`);
      if (s.dtiRatio != null) lines.push(`DTI Ratio: ${s.dtiRatio.toFixed(1)}%`);
      if (s.qualificationStatus) lines.push(`Status: ${s.qualificationStatus}`);
      if (s.monthlyPayment) lines.push(`Monthly Payment: $${s.monthlyPayment.toLocaleString()}`);
      note = lines.join("\n");
    }

    const result = await createLeadWithDetails({
      name: data.name,
      email: data.email,
      phone: data.phone,
      source: SOURCE_LABELS[data.source] || data.source,
      tags,
      note,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Lead API error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/lead/route.ts
git commit -m "feat: add unified /api/lead route for Follow Up Boss with tags, notes, and rate limiting"
```

---

## Task 7: Lead Capture Modal

**Files:**
- Create: `src/components/ui/LeadCaptureModal.tsx`

- [ ] **Step 1: Create `src/components/ui/LeadCaptureModal.tsx`**

```typescript
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import type { LeadRequest, CalculatorSummary } from "@/types";

interface LeadCaptureModalProps {
  source: LeadRequest["source"];
  onComplete: () => void;
  calculatorSummary?: CalculatorSummary;
}

const TIMELINE_OPTIONS = [
  "0-3 months",
  "3-6 months",
  "6-12 months",
  "12+ months",
  "Just browsing",
] as const;

const LOCAL_STORAGE_KEY = "brv_lead_captured";
const PENDING_LEAD_KEY = "brv_pending_lead";

export function LeadCaptureModal({ source, onComplete, calculatorSummary }: LeadCaptureModalProps) {
  const [show, setShow] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    workingWithAgent: null as boolean | null,
    timeline: "" as string,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    // Check if lead already captured
    if (typeof window !== "undefined" && localStorage.getItem(LOCAL_STORAGE_KEY)) {
      onComplete();
      return;
    }
    setShow(true);

    // Retry pending lead if exists
    const pending = localStorage.getItem(PENDING_LEAD_KEY);
    if (pending) {
      fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: pending,
      })
        .then((res) => {
          if (res.ok) localStorage.removeItem(PENDING_LEAD_KEY);
        })
        .catch(() => {});
    }
  }, [onComplete]);

  if (!show) return null;

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!formData.name.trim() || formData.name.trim().length < 2) errs.name = "Name is required";
    if (!formData.email.trim() || !formData.email.includes("@")) errs.email = "Valid email is required";
    if (!formData.phone.trim() || formData.phone.replace(/\D/g, "").length < 10) errs.phone = "Valid phone is required";
    if (formData.workingWithAgent === null) errs.workingWithAgent = "Please select one";
    if (!formData.timeline) errs.timeline = "Please select your timeline";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setStatus("submitting");
    setServerError("");

    const payload: LeadRequest = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      workingWithAgent: formData.workingWithAgent!,
      timeline: formData.timeline as LeadRequest["timeline"],
      source,
      calculatorSummary,
    };

    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 429) {
        setServerError("Please wait a moment before trying again.");
        setStatus("error");
        return;
      }

      if (res.status === 400) {
        const data = await res.json();
        setServerError(data.error || "Please check your information.");
        setStatus("error");
        return;
      }

      // Success OR 500 (fail-open: store for retry, let user proceed)
      if (res.ok) {
        localStorage.setItem(LOCAL_STORAGE_KEY, "true");
      } else {
        // Store for background retry
        localStorage.setItem(PENDING_LEAD_KEY, JSON.stringify(payload));
        localStorage.setItem(LOCAL_STORAGE_KEY, "true");
      }

      setShow(false);
      onComplete();
    } catch {
      // Network error — store for retry, let user proceed
      localStorage.setItem(PENDING_LEAD_KEY, JSON.stringify(payload));
      localStorage.setItem(LOCAL_STORAGE_KEY, "true");
      setShow(false);
      onComplete();
    }
  }

  const inputClass =
    "w-full font-body font-light text-base text-charcoal bg-cream border border-navy/10 rounded-lg px-4 py-3 focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal transition-colors min-h-[48px]";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/80 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, ease: [0.2, 0, 0, 1] }}
        className="bg-warm-white rounded-2xl shadow-2xl w-full max-w-md p-8 max-h-[90vh] overflow-y-auto"
      >
        <h2 className="font-display font-light text-2xl text-navy mb-1">
          Before we get started
        </h2>
        <p className="font-body font-light text-sm text-charcoal-light mb-6">
          Please share your information so Brenda can follow up with personalized guidance.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="lead-name" className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">
              Full Name *
            </label>
            <input
              id="lead-name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`${inputClass} ${errors.name ? "border-red-500" : ""}`}
              disabled={status === "submitting"}
            />
            {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="lead-phone" className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">
              Phone *
            </label>
            <input
              id="lead-phone"
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className={`${inputClass} ${errors.phone ? "border-red-500" : ""}`}
              disabled={status === "submitting"}
            />
            {errors.phone && <p className="text-red-600 text-xs mt-1">{errors.phone}</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="lead-email" className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">
              Email *
            </label>
            <input
              id="lead-email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`${inputClass} ${errors.email ? "border-red-500" : ""}`}
              disabled={status === "submitting"}
            />
            {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Working with agent */}
          <div>
            <label className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-3 block">
              Are you currently working with an agent? *
            </label>
            <div className="flex gap-4">
              {[true, false].map((val) => (
                <button
                  key={String(val)}
                  type="button"
                  onClick={() => setFormData({ ...formData, workingWithAgent: val })}
                  disabled={status === "submitting"}
                  className={`flex-1 py-3 rounded-lg border text-sm font-body transition-all min-h-[48px] ${
                    formData.workingWithAgent === val
                      ? "bg-teal text-white border-teal"
                      : "bg-white text-charcoal border-navy/10 hover:border-teal"
                  }`}
                >
                  {val ? "Yes" : "No"}
                </button>
              ))}
            </div>
            {errors.workingWithAgent && (
              <p className="text-red-600 text-xs mt-1">{errors.workingWithAgent}</p>
            )}
          </div>

          {/* Timeline */}
          <div>
            <label htmlFor="lead-timeline" className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">
              Timeline to buy *
            </label>
            <select
              id="lead-timeline"
              required
              value={formData.timeline}
              onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
              className={`${inputClass} ${errors.timeline ? "border-red-500" : ""}`}
              disabled={status === "submitting"}
            >
              <option value="">Select your timeline</option>
              {TIMELINE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {errors.timeline && <p className="text-red-600 text-xs mt-1">{errors.timeline}</p>}
          </div>

          {serverError && (
            <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{serverError}</p>
          )}

          <Button type="submit" variant="gold" className="w-full" disabled={status === "submitting"}>
            {status === "submitting" ? "Submitting..." : "Continue"}
          </Button>
        </form>
      </motion.div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/LeadCaptureModal.tsx
git commit -m "feat: add LeadCaptureModal component with validation, FUB submission, and localStorage fallback"
```

---

## Task 8: DTI Gauge Component

**Files:**
- Create: `src/components/calculators/DtiGauge.tsx`

- [ ] **Step 1: Create `src/components/calculators/DtiGauge.tsx`**

```typescript
"use client";

interface DtiGaugeProps {
  dti: number;
  maxDti: number; // 45 for conventional, 55 for FHA
  label: string;
}

export function DtiGauge({ dti, maxDti, label }: DtiGaugeProps) {
  const clampedDti = Math.min(dti, 70);
  const percentage = (clampedDti / 70) * 100;

  const getColor = () => {
    if (dti <= 35) return { bar: "bg-teal", text: "text-teal" };
    if (dti <= maxDti) return { bar: "bg-gold", text: "text-gold" };
    return { bar: "bg-red-500", text: "text-red-500" };
  };

  const colors = getColor();

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <span className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light">
          {label}
        </span>
        <span className={`font-display font-semibold text-2xl ${colors.text}`}>
          {dti.toFixed(1)}%
        </span>
      </div>
      <div className="w-full h-3 bg-navy/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${colors.bar}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-[0.6rem] font-body text-charcoal-light">
        <span>0%</span>
        <span>35% (Good)</span>
        <span>{maxDti}% (Max)</span>
        <span>70%+</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/calculators/DtiGauge.tsx
git commit -m "feat: add DtiGauge visual component"
```

---

## Task 9: Qualification Panel Component

**Files:**
- Create: `src/components/calculators/QualificationPanel.tsx`

- [ ] **Step 1: Create `src/components/calculators/QualificationPanel.tsx`**

```typescript
"use client";

import { DtiGauge } from "./DtiGauge";
import { formatCurrency } from "@/lib/calculator-utils";
import type { QualificationResult, PaymentBreakdown } from "@/types";

interface QualificationPanelProps {
  conventional: {
    result: QualificationResult;
    payment: PaymentBreakdown;
    loanAmount: number;
  };
  fha: {
    result: QualificationResult;
    payment: PaymentBreakdown;
    loanAmount: number;
  };
}

function VerdictBadge({ verdict }: { verdict: QualificationResult["verdict"] }) {
  const styles = {
    "likely-qualifies": "bg-teal/10 text-teal border-teal/20",
    borderline: "bg-gold/10 text-gold border-gold/20",
    "may-not-qualify": "bg-red-50 text-red-600 border-red-200",
  };
  const labels = {
    "likely-qualifies": "Likely Qualifies",
    borderline: "Borderline",
    "may-not-qualify": "May Not Qualify",
  };

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-ui font-medium border ${styles[verdict]}`}>
      {labels[verdict]}
    </span>
  );
}

function LoanColumn({
  title,
  loanAmount,
  result,
  payment,
  maxDti,
}: {
  title: string;
  loanAmount: number;
  result: QualificationResult;
  payment: PaymentBreakdown;
  maxDti: number;
}) {
  return (
    <div className="bg-warm-white rounded-xl p-6 border border-navy/5">
      <h3 className="font-display font-semibold text-lg text-navy mb-4">{title}</h3>

      <div className="mb-4">
        <VerdictBadge verdict={result.verdict} />
        <p className="font-body font-light text-xs text-charcoal-light mt-2">{result.explanation}</p>
      </div>

      <DtiGauge dti={result.dtiRatio} maxDti={maxDti} label="Debt-to-Income Ratio" />

      <div className="mt-6 space-y-2">
        <div className="flex justify-between font-body text-sm">
          <span className="text-charcoal-light">Loan Amount</span>
          <span className="font-medium text-navy">{formatCurrency(loanAmount)}</span>
        </div>
        <hr className="border-navy/5" />
        <div className="flex justify-between font-body text-sm">
          <span className="text-charcoal-light">Principal & Interest</span>
          <span>{formatCurrency(payment.principalAndInterest)}</span>
        </div>
        <div className="flex justify-between font-body text-sm">
          <span className="text-charcoal-light">Property Tax</span>
          <span>{formatCurrency(payment.propertyTax)}</span>
        </div>
        <div className="flex justify-between font-body text-sm">
          <span className="text-charcoal-light">Insurance</span>
          <span>{formatCurrency(payment.hazardInsurance)}</span>
        </div>
        {payment.pmi > 0 && (
          <div className="flex justify-between font-body text-sm">
            <span className="text-charcoal-light">{title.includes("FHA") ? "MIP" : "PMI"}</span>
            <span>{formatCurrency(payment.pmi)}</span>
          </div>
        )}
        {payment.hoa > 0 && (
          <div className="flex justify-between font-body text-sm">
            <span className="text-charcoal-light">HOA</span>
            <span>{formatCurrency(payment.hoa)}</span>
          </div>
        )}
        <hr className="border-navy/5" />
        <div className="flex justify-between font-body text-sm font-medium">
          <span className="text-navy">Total Monthly</span>
          <span className="text-navy text-lg font-display">{formatCurrency(payment.total)}</span>
        </div>
      </div>
    </div>
  );
}

export function QualificationPanel({ conventional, fha }: QualificationPanelProps) {
  return (
    <div>
      <h2 className="font-display font-light text-xl text-navy mb-1">Qualification Results</h2>
      <p className="font-body font-light text-sm text-charcoal-light mb-6">
        Conventional vs. FHA side by side
      </p>

      <div className="grid tablet:grid-cols-2 gap-6">
        <LoanColumn
          title="Conventional"
          loanAmount={conventional.loanAmount}
          result={conventional.result}
          payment={conventional.payment}
          maxDti={45}
        />
        <LoanColumn
          title="FHA"
          loanAmount={fha.loanAmount}
          result={fha.result}
          payment={fha.payment}
          maxDti={55}
        />
      </div>

      <p className="font-body font-light text-[0.65rem] text-charcoal-light mt-4 italic">
        Guidelines: Conventional ≤ 45% DTI with 640+ FICO. FHA ≤ 55% DTI with 620+ FICO.
        Results are estimates — consult a mortgage professional.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/calculators/QualificationPanel.tsx
git commit -m "feat: add QualificationPanel with side-by-side conventional vs FHA comparison"
```

---

## Task 10: Rent vs Buy Component

**Files:**
- Create: `src/components/calculators/RentVsBuy.tsx`

- [ ] **Step 1: Create `src/components/calculators/RentVsBuy.tsx`**

```typescript
"use client";

import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/calculator-utils";
import type { RentVsBuyResult } from "@/types";

interface RentVsBuyProps {
  result: RentVsBuyResult;
  currentRent: number;
  purchasePrice: number;
  appreciationRate: number;
  cityName: string;
}

export function RentVsBuy({ result, currentRent, purchasePrice, appreciationRate, cityName }: RentVsBuyProps) {
  // Generate 10-year projection data for chart
  const chartData = useMemo(() => {
    const data = [];
    const annualRentIncrease = 0.03; // 3% annual rent increase assumption
    let rent = currentRent;

    for (let year = 0; year <= 10; year++) {
      data.push({
        year,
        rent: Math.round(rent),
        buyCost: Math.round(result.trueCostOfBuying),
        label: `Year ${year}`,
      });
      rent *= 1 + annualRentIncrease;
    }
    return data;
  }, [currentRent, result.trueCostOfBuying]);

  const isGain = result.monthlyGainLoss > 0;

  return (
    <div>
      <h2 className="font-display font-light text-xl text-navy mb-1">Rent vs. Buy</h2>
      <p className="font-body font-light text-sm text-charcoal-light mb-6">
        Based on {cityName} historical appreciation of {(appreciationRate * 100).toFixed(1)}%
      </p>

      {/* Key metrics */}
      <div className="grid grid-cols-2 tablet:grid-cols-4 gap-4 mb-8">
        <div className="bg-warm-white rounded-xl p-4 border border-navy/5 text-center">
          <p className="font-body text-xs text-charcoal-light uppercase tracking-wider mb-1">Current Rent</p>
          <p className="font-display font-semibold text-lg text-navy">{formatCurrency(currentRent)}</p>
        </div>
        <div className="bg-warm-white rounded-xl p-4 border border-navy/5 text-center">
          <p className="font-body text-xs text-charcoal-light uppercase tracking-wider mb-1">True Cost to Buy</p>
          <p className="font-display font-semibold text-lg text-navy">{formatCurrency(result.trueCostOfBuying)}</p>
        </div>
        <div className={`rounded-xl p-4 border text-center ${isGain ? "bg-teal/5 border-teal/20" : "bg-red-50 border-red-200"}`}>
          <p className="font-body text-xs text-charcoal-light uppercase tracking-wider mb-1">Monthly {isGain ? "Savings" : "Cost"}</p>
          <p className={`font-display font-semibold text-lg ${isGain ? "text-teal" : "text-red-600"}`}>
            {isGain ? "" : "-"}{formatCurrency(Math.abs(result.monthlyGainLoss))}
          </p>
        </div>
        <div className="bg-warm-white rounded-xl p-4 border border-navy/5 text-center">
          <p className="font-body text-xs text-charcoal-light uppercase tracking-wider mb-1">Tax Savings/mo</p>
          <p className="font-display font-semibold text-lg text-teal">{formatCurrency(result.monthlyTaxSavings)}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-warm-white rounded-xl p-6 border border-navy/5 mb-6">
        <h3 className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-4">
          10-Year Cost Comparison
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#5A5A5A" }} />
            <YAxis tick={{ fontSize: 11, fill: "#5A5A5A" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e5e5" }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="rent" name="Monthly Rent" stroke="#C8A55B" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="buyCost" name="True Cost to Buy" stroke="#2A7F6F" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Projections */}
      <div className="grid tablet:grid-cols-2 gap-4">
        <div className="bg-warm-white rounded-xl p-6 border border-navy/5">
          <h3 className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-3">5-Year Projection</h3>
          <div className="space-y-2">
            <div className="flex justify-between font-body text-sm">
              <span className="text-charcoal-light">Home Value</span>
              <span className="font-medium">{formatCurrency(result.homeValueAt5Years)}</span>
            </div>
            <div className="flex justify-between font-body text-sm">
              <span className="text-charcoal-light">Appreciation Gain</span>
              <span className="font-medium text-teal">{formatCurrency(result.homeValueAt5Years - purchasePrice)}</span>
            </div>
            <hr className="border-navy/5" />
            <div className="flex justify-between font-body text-sm font-medium">
              <span>Net Gain vs. Renting</span>
              <span className={result.netGainAt5Years >= 0 ? "text-teal" : "text-red-600"}>
                {formatCurrency(result.netGainAt5Years)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-warm-white rounded-xl p-6 border border-navy/5">
          <h3 className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-3">10-Year Projection</h3>
          <div className="space-y-2">
            <div className="flex justify-between font-body text-sm">
              <span className="text-charcoal-light">Home Value</span>
              <span className="font-medium">{formatCurrency(result.homeValueAt10Years)}</span>
            </div>
            <div className="flex justify-between font-body text-sm">
              <span className="text-charcoal-light">Appreciation Gain</span>
              <span className="font-medium text-teal">{formatCurrency(result.homeValueAt10Years - purchasePrice)}</span>
            </div>
            <hr className="border-navy/5" />
            <div className="flex justify-between font-body text-sm font-medium">
              <span>Net Gain vs. Renting</span>
              <span className={result.netGainAt10Years >= 0 ? "text-teal" : "text-red-600"}>
                {formatCurrency(result.netGainAt10Years)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <p className="font-body font-light text-[0.65rem] text-charcoal-light mt-4 italic">
        Assumes 3% annual rent increase. Tax savings are approximate — consult a tax professional.
        Appreciation based on {cityName} historical average.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/calculators/RentVsBuy.tsx
git commit -m "feat: add RentVsBuy comparison component with 10-year chart and projections"
```

---

## Task 11: Qualification Calculator (Container + Page)

**Files:**
- Create: `src/components/calculators/QualificationCalculator.tsx`
- Create: `src/app/calculators/qualify/page.tsx`

- [ ] **Step 1: Create `src/components/calculators/QualificationCalculator.tsx`**

This is the main container that holds all inputs and wires them to the qualification panel and rent vs buy components.

```typescript
"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { bayAreaCities, getCityByName } from "@/data/bay-area-cities";
import { QualificationPanel } from "./QualificationPanel";
import { RentVsBuy } from "./RentVsBuy";
import {
  calculatePaymentBreakdown,
  calculateDTI,
  getQualificationVerdict,
  calculateConventionalLoanAmount,
  calculateFHALoanAmount,
  calculateTaxSavings,
  calculateRentVsBuy,
  getFirstMonthPrincipal,
  estimateFederalTaxBracket,
  estimateCAStateTaxBracket,
  formatCurrency,
} from "@/lib/calculator-utils";
import type { CalculatorSummary } from "@/types";

const CREDIT_SCORE_OPTIONS = [
  { label: "720+", min: 720 },
  { label: "680-719", min: 680 },
  { label: "640-679", min: 640 },
  { label: "620-639", min: 620 },
  { label: "580-619", min: 580 },
];

interface QualificationCalculatorProps {
  onSummaryChange?: (summary: CalculatorSummary) => void;
}

export function QualificationCalculator({ onSummaryChange }: QualificationCalculatorProps) {
  const [city, setCity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [downPaymentPercent, setDownPaymentPercent] = useState(20);
  const [annualIncome, setAnnualIncome] = useState(0);
  const [monthlyDebts, setMonthlyDebts] = useState(0);
  const [currentRent, setCurrentRent] = useState(0);
  const [creditScoreIdx, setCreditScoreIdx] = useState(0);
  const [filingStatus, setFilingStatus] = useState<"single" | "married">("single");
  const [federalRate, setFederalRate] = useState(0);
  const [stateRate, setStateRate] = useState(0);
  const [appreciationRate, setAppreciationRate] = useState(0);
  const [ratesManuallySet, setRatesManuallySet] = useState(false);

  // Update defaults when city changes
  const handleCityChange = (name: string) => {
    setCity(name);
    const c = getCityByName(name);
    if (c) {
      setPurchasePrice(c.medianHomePrice);
      setAppreciationRate(c.historicalAppreciation * 100);
    }
  };

  // Auto-estimate tax brackets from income
  useEffect(() => {
    if (annualIncome > 0 && !ratesManuallySet) {
      setFederalRate(estimateFederalTaxBracket(annualIncome, filingStatus) * 100);
      setStateRate(estimateCAStateTaxBracket(annualIncome, filingStatus) * 100);
    }
  }, [annualIncome, filingStatus, ratesManuallySet]);

  const cityData = getCityByName(city);
  const hasRequiredInputs = city && purchasePrice > 0 && annualIncome > 0;

  const results = useMemo(() => {
    if (!hasRequiredInputs || !cityData) return null;

    const rate = 0.06; // default 6% interest
    const termYears = 30;
    const hazardInsurance = 75;
    const hoa = 0;
    const creditMin = CREDIT_SCORE_OPTIONS[creditScoreIdx].min;
    const monthlyIncome = annualIncome / 12;
    const taxRate = cityData.propertyTaxRate;

    // Conventional
    const convPayment = calculatePaymentBreakdown(purchasePrice, downPaymentPercent, rate, termYears, taxRate, hazardInsurance, hoa, "conventional");
    const convDTI = calculateDTI(monthlyDebts, convPayment.total, monthlyIncome);
    const convVerdict = getQualificationVerdict(convDTI, creditMin, "conventional");
    const convLoan = calculateConventionalLoanAmount(purchasePrice, downPaymentPercent);

    // FHA (3.5% down)
    const fhaDown = 3.5;
    const fhaPayment = calculatePaymentBreakdown(purchasePrice, fhaDown, rate, termYears, taxRate, hazardInsurance, hoa, "fha");
    const fhaDTI = calculateDTI(monthlyDebts, fhaPayment.total, monthlyIncome);
    const fhaVerdict = getQualificationVerdict(fhaDTI, creditMin, "fha");
    const fhaLoan = calculateFHALoanAmount(purchasePrice, fhaDown);

    // Tax savings (using conventional numbers for rent vs buy)
    const taxSavings = calculateTaxSavings(
      convLoan, rate, purchasePrice, taxRate,
      annualIncome, federalRate / 100, stateRate / 100, filingStatus
    );

    // Rent vs Buy
    const afterTaxPayment = convPayment.total - taxSavings.totalSavings;
    const firstMonthPrincipal = getFirstMonthPrincipal(convLoan, rate, termYears);
    const rentVsBuy = calculateRentVsBuy(
      afterTaxPayment, taxSavings.totalSavings, firstMonthPrincipal, currentRent,
      purchasePrice, appreciationRate / 100
    );

    return {
      conventional: { result: { ...convVerdict, dtiRatio: convDTI, loanAmount: convLoan }, payment: convPayment, loanAmount: convLoan },
      fha: { result: { ...fhaVerdict, dtiRatio: fhaDTI, loanAmount: fhaLoan }, payment: fhaPayment, loanAmount: fhaLoan },
      rentVsBuy,
      summary: {
        purchasePrice,
        downPayment: purchasePrice * (downPaymentPercent / 100),
        loanType: "Conventional",
        dtiRatio: convDTI,
        qualificationStatus: convVerdict.verdict === "likely-qualifies" ? "Likely Qualifies" : convVerdict.verdict === "borderline" ? "Borderline" : "May Not Qualify",
        monthlyPayment: convPayment.total,
        city,
      } as CalculatorSummary,
    };
  }, [city, purchasePrice, downPaymentPercent, annualIncome, monthlyDebts, currentRent, creditScoreIdx, filingStatus, federalRate, stateRate, appreciationRate, cityData, hasRequiredInputs]);

  // Report summary to parent outside useMemo to avoid stale closure issues
  useEffect(() => {
    if (results?.summary) onSummaryChange?.(results.summary);
  }, [results, onSummaryChange]);

  const inputClass = "w-full font-body font-light text-base text-charcoal bg-cream border border-navy/10 rounded-lg px-4 py-3 focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal transition-colors min-h-[48px]";

  return (
    <div className="space-y-10">
      {/* Input Form */}
      <div className="bg-white rounded-2xl border border-navy/5 p-6 tablet:p-8 shadow-sm">
        <h2 className="font-display font-light text-xl text-navy mb-6">Your Information</h2>

        <div className="grid tablet:grid-cols-2 gap-5">
          {/* City */}
          <div>
            <label className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">City / Area *</label>
            <select value={city} onChange={(e) => handleCityChange(e.target.value)} className={inputClass}>
              <option value="">Select a city</option>
              {bayAreaCities.map((c) => (
                <option key={c.name} value={c.name}>{c.name} ({c.county} County)</option>
              ))}
            </select>
          </div>

          {/* Purchase Price */}
          <div>
            <label className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">Purchase Price *</label>
            <input type="number" value={purchasePrice || ""} onChange={(e) => setPurchasePrice(Number(e.target.value))} placeholder="$0" className={inputClass} />
            {cityData && <p className="text-[0.6rem] text-charcoal-light mt-1">Median: {formatCurrency(cityData.medianHomePrice)}</p>}
          </div>

          {/* Down Payment */}
          <div>
            <label className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">Down Payment %</label>
            <input type="number" value={downPaymentPercent} onChange={(e) => setDownPaymentPercent(Number(e.target.value))} min={0} max={100} className={inputClass} />
            {purchasePrice > 0 && <p className="text-[0.6rem] text-charcoal-light mt-1">{formatCurrency(purchasePrice * (downPaymentPercent / 100))}</p>}
          </div>

          {/* Annual Income */}
          <div>
            <label className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">Annual Gross Income *</label>
            <input type="number" value={annualIncome || ""} onChange={(e) => setAnnualIncome(Number(e.target.value))} placeholder="$0" className={inputClass} />
          </div>

          {/* Monthly Debts */}
          <div>
            <label className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">Monthly Debts</label>
            <input type="number" value={monthlyDebts || ""} onChange={(e) => setMonthlyDebts(Number(e.target.value))} placeholder="$0" className={inputClass} />
            <p className="text-[0.6rem] text-charcoal-light mt-1">Credit cards, car, student loans, etc.</p>
          </div>

          {/* Current Rent */}
          <div>
            <label className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">Current Monthly Rent</label>
            <input type="number" value={currentRent || ""} onChange={(e) => setCurrentRent(Number(e.target.value))} placeholder="$0" className={inputClass} />
          </div>

          {/* Credit Score */}
          <div>
            <label className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">Credit Score Range</label>
            <select value={creditScoreIdx} onChange={(e) => setCreditScoreIdx(Number(e.target.value))} className={inputClass}>
              {CREDIT_SCORE_OPTIONS.map((opt, i) => (
                <option key={opt.label} value={i}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Filing Status */}
          <div>
            <label className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">Tax Filing Status</label>
            <select value={filingStatus} onChange={(e) => { setFilingStatus(e.target.value as "single" | "married"); setRatesManuallySet(false); }} className={inputClass}>
              <option value="single">Single</option>
              <option value="married">Married Filing Jointly</option>
            </select>
          </div>

          {/* Federal Tax Bracket */}
          <div>
            <label className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">Federal Tax Bracket %</label>
            <input type="number" value={federalRate || ""} onChange={(e) => { setFederalRate(Number(e.target.value)); setRatesManuallySet(true); }} step={0.1} className={inputClass} />
            <p className="text-[0.6rem] text-charcoal-light mt-1">Auto-estimated from income</p>
          </div>

          {/* State Tax Bracket */}
          <div>
            <label className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">CA State Tax Bracket %</label>
            <input type="number" value={stateRate || ""} onChange={(e) => { setStateRate(Number(e.target.value)); setRatesManuallySet(true); }} step={0.1} className={inputClass} />
            <p className="text-[0.6rem] text-charcoal-light mt-1">Auto-estimated from income</p>
          </div>

          {/* Appreciation Rate */}
          <div>
            <label className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">Home Appreciation Rate %</label>
            <input type="number" value={appreciationRate || ""} onChange={(e) => setAppreciationRate(Number(e.target.value))} step={0.1} className={inputClass} />
            {cityData && <p className="text-[0.6rem] text-charcoal-light mt-1">{cityData.name} historical avg: {(cityData.historicalAppreciation * 100).toFixed(1)}%</p>}
          </div>
        </div>
      </div>

      {/* Results */}
      {results && (
        <>
          <QualificationPanel conventional={results.conventional} fha={results.fha} />
          {currentRent > 0 && (
            <RentVsBuy
              result={results.rentVsBuy}
              currentRent={currentRent}
              purchasePrice={purchasePrice}
              appreciationRate={appreciationRate / 100}
              cityName={city}
            />
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/calculators/qualify/page.tsx`**

```typescript
"use client";

import { useState, useCallback, useRef } from "react";
import { LeadCaptureModal } from "@/components/ui/LeadCaptureModal";
import { QualificationCalculator } from "@/components/calculators/QualificationCalculator";
import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";
import { SectionLabel } from "@/components/ui/SectionLabel";
import type { CalculatorSummary } from "@/types";

export default function QualifyPage() {
  const [showCalculator, setShowCalculator] = useState(false);
  const summaryRef = useRef<CalculatorSummary | undefined>();

  const handleComplete = useCallback(() => {
    setShowCalculator(true);
  }, []);

  return (
    <>
      {!showCalculator && (
        <LeadCaptureModal
          source="qualification-calculator"
          onComplete={handleComplete}
          calculatorSummary={summaryRef.current}
        />
      )}

      <section className="py-16 tablet:py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <AnimateOnScroll>
            <div className="text-center mb-12">
              <SectionLabel>Home Qualification</SectionLabel>
              <h1 className="font-display font-light text-3xl tablet:text-4xl text-navy mt-4 mb-4">
                Do I Qualify for a Home in the Bay Area?
              </h1>
              <p className="font-body font-light text-charcoal-light max-w-2xl mx-auto">
                Find out if you qualify for a conventional or FHA loan. See your estimated
                monthly payment, DTI ratio, and how buying compares to renting.
              </p>
            </div>
          </AnimateOnScroll>

          {showCalculator && (
            <QualificationCalculator
              onSummaryChange={(s) => { summaryRef.current = s; }}
            />
          )}
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 3: Verify the page renders**

```bash
npm run dev
```

Visit `http://localhost:3000/calculators/qualify` in a browser. Verify:
1. Lead capture modal appears
2. After submitting, calculator form is shown
3. Results update in real-time as inputs change

- [ ] **Step 4: Commit**

```bash
git add src/components/calculators/QualificationCalculator.tsx src/app/calculators/qualify/page.tsx
git commit -m "feat: build qualification calculator page with DTI, conv vs FHA, and rent vs buy"
```

---

## Task 12: Payment Breakdown & Closing Costs Components

**Files:**
- Create: `src/components/calculators/PaymentBreakdown.tsx`
- Create: `src/components/calculators/ClosingCosts.tsx`

- [ ] **Step 1: Create `src/components/calculators/PaymentBreakdown.tsx`**

```typescript
"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/calculator-utils";
import type { PaymentBreakdown as PaymentBreakdownType } from "@/types";

interface PaymentBreakdownProps {
  payment: PaymentBreakdownType;
  loanType: "conventional" | "fha";
}

const COLORS = ["#0F1D35", "#2A7F6F", "#C8A55B", "#D4B978", "#8FA89A", "#5A5A5A"];

export function PaymentBreakdown({ payment, loanType }: PaymentBreakdownProps) {
  const chartData = useMemo(() => {
    const items = [
      { name: "Principal & Interest", value: payment.principalAndInterest },
      { name: "Property Tax", value: payment.propertyTax },
      { name: "Insurance", value: payment.hazardInsurance },
    ];
    if (payment.pmi > 0) items.push({ name: loanType === "fha" ? "MIP" : "PMI", value: payment.pmi });
    if (payment.hoa > 0) items.push({ name: "HOA", value: payment.hoa });
    return items.filter((i) => i.value > 0);
  }, [payment, loanType]);

  return (
    <div>
      <h2 className="font-display font-light text-xl text-navy mb-6">Monthly Payment Breakdown</h2>

      <div className="grid tablet:grid-cols-2 gap-8 items-center">
        {/* Pie chart */}
        <div className="flex justify-center">
          <ResponsiveContainer width={240} height={240}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Line items */}
        <div className="space-y-3">
          {chartData.map((item, i) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="font-body text-sm text-charcoal-light">{item.name}</span>
              </div>
              <span className="font-body text-sm font-medium">{formatCurrency(item.value)}</span>
            </div>
          ))}
          <hr className="border-navy/5" />
          <div className="flex justify-between">
            <span className="font-body text-sm font-medium text-navy">Total Monthly</span>
            <span className="font-display font-semibold text-xl text-navy">{formatCurrency(payment.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/calculators/ClosingCosts.tsx`**

```typescript
"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/calculator-utils";
import type { ClosingCostItem } from "@/types";

interface ClosingCostsProps {
  buyerCosts: ClosingCostItem[];
  sellerCosts: ClosingCostItem[];
  downPayment: number;
  salePrice: number;
}

export function ClosingCosts({ buyerCosts, sellerCosts, downPayment, salePrice }: ClosingCostsProps) {
  const [view, setView] = useState<"buyer" | "seller">("buyer");

  const costs = view === "buyer" ? buyerCosts : sellerCosts;
  const total = costs.reduce((sum, c) => sum + c.amount, 0);

  const prepaid = costs.filter((c) => c.category === "prepaid");
  const nonrecurring = costs.filter((c) => c.category === "nonrecurring");
  const seller = costs.filter((c) => c.category === "seller");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-light text-xl text-navy">Estimated Closing Costs</h2>

        <div className="flex bg-navy/5 rounded-lg p-1">
          <button
            onClick={() => setView("buyer")}
            className={`px-4 py-2 rounded-md text-xs font-ui font-medium transition-all ${
              view === "buyer" ? "bg-white text-navy shadow-sm" : "text-charcoal-light"
            }`}
          >
            Buyer
          </button>
          <button
            onClick={() => setView("seller")}
            className={`px-4 py-2 rounded-md text-xs font-ui font-medium transition-all ${
              view === "seller" ? "bg-white text-navy shadow-sm" : "text-charcoal-light"
            }`}
          >
            Seller
          </button>
        </div>
      </div>

      <div className="bg-warm-white rounded-xl border border-navy/5 p-6">
        {view === "buyer" && prepaid.length > 0 && (
          <>
            <h3 className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-3">Pre-paid / Recurring</h3>
            <div className="space-y-2 mb-6">
              {prepaid.map((c) => (
                <div key={c.label} className="flex justify-between font-body text-sm">
                  <span className="text-charcoal-light">{c.label}</span>
                  <span>{formatCurrency(c.amount)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {view === "buyer" && nonrecurring.length > 0 && (
          <>
            <h3 className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-3">Fixed / Non-recurring</h3>
            <div className="space-y-2 mb-6">
              {nonrecurring.map((c) => (
                <div key={c.label} className="flex justify-between font-body text-sm">
                  <span className="text-charcoal-light">{c.label}</span>
                  <span>{formatCurrency(c.amount)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {view === "seller" && seller.length > 0 && (
          <div className="space-y-2 mb-6">
            {seller.map((c) => (
              <div key={c.label} className="flex justify-between font-body text-sm">
                <span className="text-charcoal-light">{c.label}</span>
                <span>{formatCurrency(c.amount)}</span>
              </div>
            ))}
          </div>
        )}

        <hr className="border-navy/5 mb-4" />

        <div className="flex justify-between font-body font-medium">
          <span className="text-navy">Total {view === "buyer" ? "Buyer" : "Seller"} Costs</span>
          <span className="text-navy text-lg font-display font-semibold">{formatCurrency(total)}</span>
        </div>

        {view === "buyer" && (
          <div className="flex justify-between font-body font-medium mt-2">
            <span className="text-navy">Total Funds Needed</span>
            <span className="text-gold text-lg font-display font-semibold">{formatCurrency(downPayment + total)}</span>
          </div>
        )}

        {view === "seller" && (
          <div className="flex justify-between font-body font-medium mt-2">
            <span className="text-navy">Net Proceeds</span>
            <span className="text-teal text-lg font-display font-semibold">{formatCurrency(salePrice - total)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/calculators/PaymentBreakdown.tsx src/components/calculators/ClosingCosts.tsx
git commit -m "feat: add PaymentBreakdown pie chart and ClosingCosts buyer/seller toggle components"
```

---

## Task 13: Amortization Panel & PDF Export

**Files:**
- Create: `src/components/calculators/AmortizationPanel.tsx`
- Create: `src/lib/pdf-export.ts`

- [ ] **Step 1: Create `src/lib/pdf-export.ts`**

```typescript
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { AmortizationRow, PaymentBreakdown, ClosingCostItem } from "@/types";

interface PdfExportData {
  title: string;
  inputs: Record<string, string>;
  payment: PaymentBreakdown;
  closingCosts: ClosingCostItem[];
  totalClosingCosts: number;
  downPayment: number;
  amortizationSummary: { totalPayments: number; totalInterest: number; payoffDate: string };
  amortizationSchedule: AmortizationRow[];
  loanType: string;
}

function addWatermark(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const text = "Prepared by Brenda Vega  |  brendavegarealty.com";

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.saveGraphicsState();
    doc.setGState(new (jsPDF as unknown as { GState: new (opts: { opacity: number }) => unknown }).GState({ opacity: 0.08 }));
    doc.setFontSize(14);
    doc.setTextColor(15, 29, 53); // navy

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Tile watermark diagonally
    for (let y = -pageHeight; y < pageHeight * 2; y += 80) {
      for (let x = -pageWidth; x < pageWidth * 2; x += 300) {
        doc.text(text, x, y, { angle: 45 });
      }
    }
    doc.restoreGraphicsState();
  }
}

export function generateCalculatorPDF(data: PdfExportData): void {
  const doc = new jsPDF();
  const navy = [15, 29, 53] as const;
  const gold = [200, 165, 91] as const;
  let y = 15;

  // Header
  doc.setFontSize(18);
  doc.setTextColor(...navy);
  doc.text("Brenda Vega | REALTOR® | DRE #02196981", 14, y);
  y += 7;
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text("(501) 827-9619  |  brenda.vega@c21anew.com  |  brendavegarealty.com", 14, y);
  y += 3;
  doc.setDrawColor(...gold);
  doc.setLineWidth(0.5);
  doc.line(14, y, 196, y);
  y += 8;

  // Title
  doc.setFontSize(14);
  doc.setTextColor(...navy);
  doc.text(data.title, 14, y);
  y += 8;

  // Inputs summary
  doc.setFontSize(10);
  doc.setTextColor(...navy);
  doc.text("Calculator Inputs", 14, y);
  y += 5;

  const inputRows = Object.entries(data.inputs).map(([k, v]) => [k, v]);
  autoTable(doc, {
    startY: y,
    head: [["Parameter", "Value"]],
    body: inputRows,
    theme: "grid",
    headStyles: { fillColor: navy, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 14 },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Payment breakdown
  doc.setFontSize(10);
  doc.setTextColor(...navy);
  doc.text("Monthly Payment Breakdown", 14, y);
  y += 5;

  const paymentRows = [
    ["Principal & Interest", `$${data.payment.principalAndInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}`],
    ["Property Tax", `$${data.payment.propertyTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}`],
    ["Hazard Insurance", `$${data.payment.hazardInsurance.toLocaleString(undefined, { maximumFractionDigits: 0 })}`],
    [data.loanType === "fha" ? "MIP" : "PMI", `$${data.payment.pmi.toLocaleString(undefined, { maximumFractionDigits: 0 })}`],
    ["HOA", `$${data.payment.hoa.toLocaleString(undefined, { maximumFractionDigits: 0 })}`],
    ["Total Monthly", `$${data.payment.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}`],
  ];

  autoTable(doc, {
    startY: y,
    body: paymentRows,
    theme: "grid",
    bodyStyles: { fontSize: 8 },
    margin: { left: 14 },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Closing costs
  if (data.closingCosts.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(...navy);
    doc.text("Estimated Closing Costs", 14, y);
    y += 5;

    const ccRows = data.closingCosts.map((c) => [c.label, `$${c.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`]);
    ccRows.push(["Total", `$${data.totalClosingCosts.toLocaleString(undefined, { maximumFractionDigits: 0 })}`]);
    ccRows.push(["Total Funds Needed", `$${(data.downPayment + data.totalClosingCosts).toLocaleString(undefined, { maximumFractionDigits: 0 })}`]);

    autoTable(doc, {
      startY: y,
      body: ccRows,
      theme: "grid",
      bodyStyles: { fontSize: 8 },
      margin: { left: 14 },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  // Amortization summary
  doc.addPage();
  y = 15;
  doc.setFontSize(10);
  doc.setTextColor(...navy);
  doc.text("Amortization Summary", 14, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    body: [
      ["Total Payments", `$${data.amortizationSummary.totalPayments.toLocaleString(undefined, { maximumFractionDigits: 0 })}`],
      ["Total Interest", `$${data.amortizationSummary.totalInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}`],
      ["Payoff Date", data.amortizationSummary.payoffDate],
    ],
    theme: "grid",
    bodyStyles: { fontSize: 8 },
    margin: { left: 14 },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Full amortization schedule
  doc.setFontSize(10);
  doc.text("Full Amortization Schedule", 14, y);
  y += 5;

  const amortRows = data.amortizationSchedule.map((row) => [
    String(row.month),
    row.date,
    `$${row.payment.toFixed(2)}`,
    `$${row.principal.toFixed(2)}`,
    `$${row.interest.toFixed(2)}`,
    `$${row.balance.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [["#", "Date", "Payment", "Principal", "Interest", "Balance"]],
    body: amortRows,
    theme: "grid",
    headStyles: { fillColor: navy, fontSize: 7 },
    bodyStyles: { fontSize: 6 },
    margin: { left: 14 },
  });

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(90, 90, 90);
    doc.text("Prepared by Brenda Vega | Century 21", 14, 285);
    doc.text("Estimates only. Consult a licensed mortgage professional for exact figures.", 14, 289);
    doc.text(`Generated ${new Date().toLocaleDateString()}`, 170, 285);
    doc.text(`Page ${i} of ${pageCount}`, 180, 289);
  }

  // Watermark
  addWatermark(doc);

  doc.save(`${data.title.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.pdf`);
}
```

- [ ] **Step 2: Create `src/components/calculators/AmortizationPanel.tsx`**

```typescript
"use client";

import { useState, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatCurrency, getAmortizationSummary } from "@/lib/calculator-utils";
import type { AmortizationRow, PaymentBreakdown, ClosingCostItem } from "@/types";
import { generateCalculatorPDF } from "@/lib/pdf-export";
import { Button } from "@/components/ui/Button";

interface AmortizationPanelProps {
  schedule: AmortizationRow[];
  payment: PaymentBreakdown;
  closingCosts: ClosingCostItem[];
  totalClosingCosts: number;
  downPayment: number;
  loanType: string;
  inputs: Record<string, string>;
}

export function AmortizationPanel({
  schedule,
  payment,
  closingCosts,
  totalClosingCosts,
  downPayment,
  loanType,
  inputs,
}: AmortizationPanelProps) {
  const [showYearly, setShowYearly] = useState(false);
  const [showMonthly, setShowMonthly] = useState(false);

  const summary = useMemo(() => getAmortizationSummary(schedule), [schedule]);

  // Yearly data for chart
  const yearlyData = useMemo(() => {
    const data = [];
    for (let year = 1; year <= Math.ceil(schedule.length / 12); year++) {
      const start = (year - 1) * 12;
      const end = Math.min(year * 12, schedule.length);
      const yearRows = schedule.slice(start, end);
      const yearPrincipal = yearRows.reduce((s, r) => s + r.principal, 0);
      const yearInterest = yearRows.reduce((s, r) => s + r.interest, 0);
      data.push({
        year: `Yr ${year}`,
        principal: Math.round(yearPrincipal),
        interest: Math.round(yearInterest),
        balance: Math.round(yearRows[yearRows.length - 1]?.balance || 0),
      });
    }
    return data;
  }, [schedule]);

  const handleExportPDF = () => {
    generateCalculatorPDF({
      title: "Bay Area Mortgage Cost Analysis",
      inputs,
      payment,
      closingCosts,
      totalClosingCosts,
      downPayment,
      amortizationSummary: summary,
      amortizationSchedule: schedule,
      loanType,
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-light text-xl text-navy">Amortization Schedule</h2>
        <Button variant="gold" onClick={handleExportPDF}>
          Export PDF
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-warm-white rounded-xl p-4 border border-navy/5 text-center">
          <p className="font-body text-xs text-charcoal-light uppercase tracking-wider mb-1">Total Payments</p>
          <p className="font-display font-semibold text-lg text-navy">{formatCurrency(summary.totalPayments)}</p>
        </div>
        <div className="bg-warm-white rounded-xl p-4 border border-navy/5 text-center">
          <p className="font-body text-xs text-charcoal-light uppercase tracking-wider mb-1">Total Interest</p>
          <p className="font-display font-semibold text-lg text-gold">{formatCurrency(summary.totalInterest)}</p>
        </div>
        <div className="bg-warm-white rounded-xl p-4 border border-navy/5 text-center">
          <p className="font-body text-xs text-charcoal-light uppercase tracking-wider mb-1">Payoff Date</p>
          <p className="font-display font-semibold text-lg text-teal">{summary.payoffDate}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-warm-white rounded-xl p-6 border border-navy/5 mb-6">
        <h3 className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-4">
          Principal vs Interest Over Time
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={yearlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#5A5A5A" }} interval={4} />
            <YAxis tick={{ fontSize: 10, fill: "#5A5A5A" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="principal" name="Principal" stackId="1" fill="#2A7F6F" stroke="#2A7F6F" fillOpacity={0.6} />
            <Area type="monotone" dataKey="interest" name="Interest" stackId="1" fill="#C8A55B" stroke="#C8A55B" fillOpacity={0.6} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Year-by-year table */}
      <div className="mb-4">
        <button
          onClick={() => setShowYearly(!showYearly)}
          className="flex items-center gap-2 font-body font-medium text-sm text-navy hover:text-teal transition-colors"
        >
          <span className={`transform transition-transform ${showYearly ? "rotate-90" : ""}`}>▶</span>
          Year-by-Year Breakdown
        </button>

        {showYearly && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="border-b border-navy/10 text-left">
                  <th className="py-2 pr-4 text-xs uppercase tracking-wider text-charcoal-light">Year</th>
                  <th className="py-2 pr-4 text-xs uppercase tracking-wider text-charcoal-light text-right">Principal</th>
                  <th className="py-2 pr-4 text-xs uppercase tracking-wider text-charcoal-light text-right">Interest</th>
                  <th className="py-2 text-xs uppercase tracking-wider text-charcoal-light text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {yearlyData.map((row) => (
                  <tr key={row.year} className="border-b border-navy/5">
                    <td className="py-2 pr-4 text-charcoal">{row.year}</td>
                    <td className="py-2 pr-4 text-right text-teal">{formatCurrency(row.principal)}</td>
                    <td className="py-2 pr-4 text-right text-gold">{formatCurrency(row.interest)}</td>
                    <td className="py-2 text-right">{formatCurrency(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Full monthly table */}
      <div>
        <button
          onClick={() => setShowMonthly(!showMonthly)}
          className="flex items-center gap-2 font-body font-medium text-sm text-navy hover:text-teal transition-colors"
        >
          <span className={`transform transition-transform ${showMonthly ? "rotate-90" : ""}`}>▶</span>
          Full Monthly Schedule ({schedule.length} payments)
        </button>

        {showMonthly && (
          <div className="mt-3 overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-xs font-body">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-navy/10 text-left">
                  <th className="py-2 pr-3 uppercase tracking-wider text-charcoal-light">#</th>
                  <th className="py-2 pr-3 uppercase tracking-wider text-charcoal-light">Date</th>
                  <th className="py-2 pr-3 uppercase tracking-wider text-charcoal-light text-right">Payment</th>
                  <th className="py-2 pr-3 uppercase tracking-wider text-charcoal-light text-right">Principal</th>
                  <th className="py-2 pr-3 uppercase tracking-wider text-charcoal-light text-right">Interest</th>
                  <th className="py-2 uppercase tracking-wider text-charcoal-light text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((row) => (
                  <tr key={row.month} className="border-b border-navy/5">
                    <td className="py-1 pr-3">{row.month}</td>
                    <td className="py-1 pr-3">{row.date}</td>
                    <td className="py-1 pr-3 text-right">{formatCurrency(row.payment)}</td>
                    <td className="py-1 pr-3 text-right text-teal">{formatCurrency(row.principal)}</td>
                    <td className="py-1 pr-3 text-right text-gold">{formatCurrency(row.interest)}</td>
                    <td className="py-1 text-right">{formatCurrency(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/pdf-export.ts src/components/calculators/AmortizationPanel.tsx
git commit -m "feat: add AmortizationPanel with chart, tables, and branded PDF export with watermark"
```

---

## Task 14: Cost Calculator (Container + Page)

**Files:**
- Create: `src/components/calculators/CostCalculator.tsx`
- Create: `src/app/calculators/costs/page.tsx`

- [ ] **Step 1: Create `src/components/calculators/CostCalculator.tsx`**

```typescript
"use client";

import { useState, useMemo, useEffect } from "react";
import { bayAreaCities, getCityByName } from "@/data/bay-area-cities";
import { PaymentBreakdown } from "./PaymentBreakdown";
import { ClosingCosts } from "./ClosingCosts";
import { AmortizationPanel } from "./AmortizationPanel";
import {
  calculatePaymentBreakdown,
  calculateBuyerClosingCosts,
  calculateSellerClosingCosts,
  generateAmortizationSchedule,
  calculateConventionalLoanAmount,
  calculateFHALoanAmount,
  formatCurrency,
} from "@/lib/calculator-utils";
import type { CalculatorSummary } from "@/types";

interface CostCalculatorProps {
  onSummaryChange?: (summary: CalculatorSummary) => void;
}

export function CostCalculator({ onSummaryChange }: CostCalculatorProps) {
  const [city, setCity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [downPaymentPercent, setDownPaymentPercent] = useState(20);
  const [interestRate, setInterestRate] = useState(6);
  const [loanTerm, setLoanTerm] = useState(30);
  const [loanType, setLoanType] = useState<"conventional" | "fha">("conventional");
  const [hazardInsurance, setHazardInsurance] = useState(75);
  const [hoa, setHoa] = useState(0);
  const [escrowDate, setEscrowDate] = useState("");
  const [sellerCommission, setSellerCommission] = useState(2.5);
  const [buyerCommission, setBuyerCommission] = useState(2.5);

  const handleCityChange = (name: string) => {
    setCity(name);
    const c = getCityByName(name);
    if (c) setPurchasePrice(c.medianHomePrice);
  };

  const cityData = getCityByName(city);
  const propertyTaxRate = cityData?.propertyTaxRate || 0.0125;
  const transferTaxRate = cityData?.transferTaxRate || 0;
  const hasRequiredInputs = city && purchasePrice > 0;

  const results = useMemo(() => {
    if (!hasRequiredInputs) return null;

    const rate = interestRate / 100;
    const loanAmount =
      loanType === "fha"
        ? calculateFHALoanAmount(purchasePrice, downPaymentPercent)
        : calculateConventionalLoanAmount(purchasePrice, downPaymentPercent);

    const payment = calculatePaymentBreakdown(
      purchasePrice, downPaymentPercent, rate, loanTerm,
      propertyTaxRate, hazardInsurance, hoa, loanType
    );

    const escrow = escrowDate ? new Date(escrowDate + "T12:00:00") : new Date();
    const buyerCosts = calculateBuyerClosingCosts(
      purchasePrice, loanAmount, propertyTaxRate,
      hazardInsurance, rate, escrow, hoa
    );
    const sellerCosts = calculateSellerClosingCosts(
      purchasePrice, sellerCommission, buyerCommission, transferTaxRate
    );

    const schedule = generateAmortizationSchedule(loanAmount, rate, loanTerm, escrow);

    const downPayment = purchasePrice * (downPaymentPercent / 100);
    const totalBuyerCosts = buyerCosts.reduce((s, c) => s + c.amount, 0);

    const inputs: Record<string, string> = {
      City: city,
      "Purchase Price": formatCurrency(purchasePrice),
      "Down Payment": `${formatCurrency(downPayment)} (${downPaymentPercent}%)`,
      "Interest Rate": `${interestRate}%`,
      "Loan Term": `${loanTerm} years`,
      "Loan Type": loanType === "fha" ? "FHA" : "Conventional",
      "Loan Amount": formatCurrency(loanAmount),
      "Property Tax Rate": `${(propertyTaxRate * 100).toFixed(2)}%`,
    };

    const summary: CalculatorSummary = {
      purchasePrice,
      downPayment,
      loanType: loanType === "fha" ? "FHA" : "Conventional",
      monthlyPayment: payment.total,
      city,
    };

    return { payment, buyerCosts, sellerCosts, schedule, downPayment, totalBuyerCosts, loanAmount, inputs, summary };
  }, [city, purchasePrice, downPaymentPercent, interestRate, loanTerm, loanType, propertyTaxRate, hazardInsurance, hoa, escrowDate, sellerCommission, buyerCommission, transferTaxRate, hasRequiredInputs]);

  // Report summary to parent outside useMemo
  useEffect(() => {
    if (results?.summary) onSummaryChange?.(results.summary);
  }, [results, onSummaryChange]);

  const inputClass = "w-full font-body font-light text-base text-charcoal bg-cream border border-navy/10 rounded-lg px-4 py-3 focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal transition-colors min-h-[48px]";

  return (
    <div className="space-y-10">
      {/* Input Form */}
      <div className="bg-white rounded-2xl border border-navy/5 p-6 tablet:p-8 shadow-sm">
        <h2 className="font-display font-light text-xl text-navy mb-6">Loan Details</h2>

        <div className="grid tablet:grid-cols-2 gap-5">
          <div>
            <label className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">City / Area *</label>
            <select value={city} onChange={(e) => handleCityChange(e.target.value)} className={inputClass}>
              <option value="">Select a city</option>
              {bayAreaCities.map((c) => (
                <option key={c.name} value={c.name}>{c.name} ({c.county} County)</option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">Purchase Price *</label>
            <input type="number" value={purchasePrice || ""} onChange={(e) => setPurchasePrice(Number(e.target.value))} className={inputClass} />
          </div>

          <div>
            <label className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">Down Payment %</label>
            <input type="number" value={downPaymentPercent} onChange={(e) => setDownPaymentPercent(Number(e.target.value))} min={0} max={100} className={inputClass} />
            {purchasePrice > 0 && <p className="text-[0.6rem] text-charcoal-light mt-1">{formatCurrency(purchasePrice * (downPaymentPercent / 100))}</p>}
          </div>

          <div>
            <label className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">Interest Rate %</label>
            <input type="number" value={interestRate} onChange={(e) => setInterestRate(Number(e.target.value))} step={0.125} className={inputClass} />
          </div>

          <div>
            <label className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">Loan Term</label>
            <select value={loanTerm} onChange={(e) => setLoanTerm(Number(e.target.value))} className={inputClass}>
              <option value={30}>30 years</option>
              <option value={20}>20 years</option>
              <option value={15}>15 years</option>
            </select>
          </div>

          <div>
            <label className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">Loan Type</label>
            <select value={loanType} onChange={(e) => setLoanType(e.target.value as "conventional" | "fha")} className={inputClass}>
              <option value="conventional">Conventional</option>
              <option value="fha">FHA</option>
            </select>
          </div>

          <div>
            <label className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">Hazard Insurance / mo</label>
            <input type="number" value={hazardInsurance} onChange={(e) => setHazardInsurance(Number(e.target.value))} className={inputClass} />
          </div>

          <div>
            <label className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">HOA / mo</label>
            <input type="number" value={hoa} onChange={(e) => setHoa(Number(e.target.value))} className={inputClass} />
          </div>

          <div>
            <label className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">Close of Escrow Date</label>
            <input type="date" value={escrowDate} onChange={(e) => setEscrowDate(e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>

      {/* Results */}
      {results && (
        <>
          <PaymentBreakdown payment={results.payment} loanType={loanType} />
          <ClosingCosts
            buyerCosts={results.buyerCosts}
            sellerCosts={results.sellerCosts}
            downPayment={results.downPayment}
            salePrice={purchasePrice}
          />
          <AmortizationPanel
            schedule={results.schedule}
            payment={results.payment}
            closingCosts={results.buyerCosts}
            totalClosingCosts={results.totalBuyerCosts}
            downPayment={results.downPayment}
            loanType={loanType}
            inputs={results.inputs}
          />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/calculators/costs/page.tsx`**

```typescript
"use client";

import { useState, useCallback, useRef } from "react";
import { LeadCaptureModal } from "@/components/ui/LeadCaptureModal";
import { CostCalculator } from "@/components/calculators/CostCalculator";
import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";
import { SectionLabel } from "@/components/ui/SectionLabel";
import type { CalculatorSummary } from "@/types";

export default function CostsPage() {
  const [showCalculator, setShowCalculator] = useState(false);
  const summaryRef = useRef<CalculatorSummary | undefined>();

  const handleComplete = useCallback(() => {
    setShowCalculator(true);
  }, []);

  return (
    <>
      {!showCalculator && (
        <LeadCaptureModal
          source="cost-calculator"
          onComplete={handleComplete}
          calculatorSummary={summaryRef.current}
        />
      )}

      <section className="py-16 tablet:py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <AnimateOnScroll>
            <div className="text-center mb-12">
              <SectionLabel>Cost Analysis</SectionLabel>
              <h1 className="font-display font-light text-3xl tablet:text-4xl text-navy mt-4 mb-4">
                Bay Area Mortgage, Closing Cost & Payment Calculator
              </h1>
              <p className="font-body font-light text-charcoal-light max-w-2xl mx-auto">
                Calculate your monthly payment, see itemized closing costs, view
                the full amortization schedule, and export a branded PDF report.
              </p>
            </div>
          </AnimateOnScroll>

          {showCalculator && (
            <CostCalculator
              onSummaryChange={(s) => { summaryRef.current = s; }}
            />
          )}
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 3: Verify the page renders**

```bash
npm run dev
```

Visit `http://localhost:3000/calculators/costs`. Verify modal → calculator → payment → closing costs → amortization → PDF export.

- [ ] **Step 4: Commit**

```bash
git add src/components/calculators/CostCalculator.tsx src/app/calculators/costs/page.tsx
git commit -m "feat: build cost calculator page with payment breakdown, closing costs, amortization, and PDF export"
```

---

## Task 15: Microsoft Graph API Client

**Files:**
- Create: `src/lib/microsoft-graph.ts`
- Delete: `src/lib/google-calendar.ts`

- [ ] **Step 1: Create `src/lib/microsoft-graph.ts`**

Note: `@azure/identity` may not work in Cloudflare Workers due to Node.js API requirements. Use manual OAuth2 client credentials flow with `fetch()` instead.

```typescript
interface TimeSlot {
  date: string;
  time: string;
  dateTime: string;
}

const GRAPH_API = "https://graph.microsoft.com/v1.0";
const TIMEZONE = "America/Los_Angeles";
const SLOT_DURATION_MINUTES = 30;
const BUSINESS_HOURS = { start: 9, end: 18, days: [1, 2, 3, 4, 5, 6] }; // Mon-Sat, 9am-6pm

async function getAccessToken(): Promise<string> {
  const tenantId = process.env.MICROSOFT_TENANT_ID;
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Microsoft 365 credentials not configured");
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get M365 access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

function generateSlots(dateStr: string, busyTimes: { start: string; end: string }[]): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const date = new Date(`${dateStr}T00:00:00`);
  const day = date.getDay();

  if (!BUSINESS_HOURS.days.includes(day)) return [];

  for (let hour = BUSINESS_HOURS.start; hour < BUSINESS_HOURS.end; hour++) {
    for (let min = 0; min < 60; min += SLOT_DURATION_MINUTES) {
      const time = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
      const slotStart = new Date(`${dateStr}T${time}:00`);
      const slotEnd = new Date(slotStart.getTime() + SLOT_DURATION_MINUTES * 60000);

      const isBusy = busyTimes.some((busy) => {
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);
        return slotStart < busyEnd && slotEnd > busyStart;
      });

      if (!isBusy) {
        slots.push({ date: dateStr, time, dateTime: slotStart.toISOString() });
      }
    }
  }

  return slots;
}

export async function getAvailableSlots(dateStr: string): Promise<TimeSlot[]> {
  const userId = process.env.MICROSOFT_USER_ID;

  if (!userId) {
    // Fallback: return all business hours slots
    return generateSlots(dateStr, []);
  }

  try {
    const token = await getAccessToken();

    const startDateTime = `${dateStr}T00:00:00`;
    const endDateTime = `${dateStr}T23:59:59`;

    const response = await fetch(`${GRAPH_API}/users/${userId}/calendar/getSchedule`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: `outlook.timezone="${TIMEZONE}"`,
      },
      body: JSON.stringify({
        schedules: [userId],
        startTime: { dateTime: startDateTime, timeZone: TIMEZONE },
        endTime: { dateTime: endDateTime, timeZone: TIMEZONE },
        availabilityViewInterval: SLOT_DURATION_MINUTES,
      }),
    });

    if (!response.ok) {
      console.error("Graph API getSchedule error:", await response.text());
      return generateSlots(dateStr, []);
    }

    const data = await response.json();
    const scheduleItems = data.value?.[0]?.scheduleItems || [];

    const busyTimes = scheduleItems
      .filter((item: { status: string }) => item.status !== "free")
      .map((item: { start: { dateTime: string }; end: { dateTime: string } }) => ({
        start: item.start.dateTime,
        end: item.end.dateTime,
      }));

    return generateSlots(dateStr, busyTimes);
  } catch (err) {
    console.error("Outlook calendar error:", err);
    return generateSlots(dateStr, []);
  }
}

export async function createBooking(data: {
  date: string;
  time: string;
  name: string;
  email: string;
  phone: string;
  reason: string;
  consultationType: string;
}): Promise<{ success: boolean; error?: string }> {
  const userId = process.env.MICROSOFT_USER_ID;

  if (!userId) {
    return { success: false, error: "Calendar not configured" };
  }

  try {
    const token = await getAccessToken();

    const startDateTime = `${data.date}T${data.time}:00`;
    const endDate = new Date(`${startDateTime}`);
    endDate.setMinutes(endDate.getMinutes() + SLOT_DURATION_MINUTES);
    const endDateTime = endDate.toISOString().replace("Z", "");

    const response = await fetch(`${GRAPH_API}/users/${userId}/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: `Consultation with ${data.name}`,
        body: {
          contentType: "Text",
          content: `Name: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone}\nType: ${data.consultationType}\n\nReason:\n${data.reason}`,
        },
        start: { dateTime: startDateTime, timeZone: TIMEZONE },
        end: { dateTime: endDateTime, timeZone: TIMEZONE },
        attendees: [
          { emailAddress: { address: data.email, name: data.name }, type: "required" },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Graph API create event error:", error);
      return { success: false, error: "Failed to create booking" };
    }

    return { success: true };
  } catch (err) {
    console.error("Outlook booking error:", err);
    return { success: false, error: "Failed to connect to calendar" };
  }
}
```

- [ ] **Step 2: Delete `src/lib/google-calendar.ts`**

```bash
git rm src/lib/google-calendar.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/microsoft-graph.ts
git commit -m "feat: add Microsoft Graph API client for Outlook calendar, remove Google Calendar"
```

---

## Task 16: Schedule API Routes

**Files:**
- Create: `src/app/api/schedule/availability/route.ts`
- Create: `src/app/api/schedule/book/route.ts`

- [ ] **Step 1: Create `src/app/api/schedule/availability/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/microsoft-graph";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Valid date parameter required (YYYY-MM-DD)" }, { status: 400 });
  }

  try {
    const slots = await getAvailableSlots(date);
    return NextResponse.json({ slots });
  } catch (err) {
    console.error("Availability error:", err);
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create `src/app/api/schedule/book/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { createBooking } from "@/lib/microsoft-graph";
import { createLeadWithDetails } from "@/lib/follow-up-boss";
import { sendConfirmationEmail, sendAgentNotification } from "@/lib/resend";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
    let kvStore = null;
    try {
      const { env } = getRequestContext();
      kvStore = env.RATE_LIMITS ?? null;
    } catch {
      // getRequestContext() not available in dev mode — fail-open
    }

    const rateCheck = await checkRateLimit(kvStore, `book:${ip}`, 3, 3600);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Too many booking requests. Please wait." }, { status: 429 });
    }

    const body = await request.json();
    const { date, time, name, email, phone, reason, consultationType } = body;

    if (!date || !time || !name || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Create Outlook calendar event
    const booking = await createBooking({ date, time, name, email, phone, reason, consultationType });
    if (!booking.success) {
      return NextResponse.json({ error: booking.error }, { status: 500 });
    }

    // Create FUB lead for scheduler booking (fire and forget)
    createLeadWithDetails({
      name,
      email,
      phone,
      source: "Scheduler - brendavegarealty.com",
      tags: ["scheduler"],
    }).catch((err) => console.error("FUB lead from scheduler failed:", err));

    // Send confirmation emails (fire and forget)
    // Note: resend.ts formats the date internally via new Date().toLocaleDateString()
    // so we pass the raw ISO date string, not pre-formatted text
    const hour = parseInt(time.split(":")[0]);
    const min = time.split(":")[1];
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const timeDisplay = `${displayHour}:${min} ${ampm} PT`;

    await Promise.allSettled([
      sendConfirmationEmail({ to: email, name, date, time: timeDisplay, type: consultationType }),
      sendAgentNotification({ clientName: name, clientEmail: email, clientPhone: phone, date, time: timeDisplay, reason, type: consultationType }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Booking error:", err);
    return NextResponse.json({ error: "Failed to book consultation" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/schedule/availability/route.ts src/app/api/schedule/book/route.ts
git commit -m "feat: add schedule availability and booking API routes using Outlook calendar"
```

---

## Task 17: Scheduler Component Rewrite

**Files:**
- Modify: `src/components/contact/Scheduler.tsx`

- [ ] **Step 1: Rewrite `src/components/contact/Scheduler.tsx`**

Replace the entire file. Keep the same UI structure and brand styling, but replace static slots + mailto with live API calls, add Saturday, extend hours to 6pm.

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";

interface TimeSlot {
  date: string;
  time: string;
}

export function Scheduler() {
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", reason: "", consultationType: "phone" });
  const [status, setStatus] = useState<"idle" | "booking" | "booked" | "error">("idle");

  // Generate next 14 days, Mon-Sat (include Saturday, exclude Sunday)
  const availableDates = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i + 1);
    const day = date.getDay();
    if (day === 0) return null; // Skip Sunday only
    return date.toISOString().split("T")[0];
  }).filter(Boolean) as string[];

  const fetchSlots = useCallback(async (dateStr: string) => {
    setLoading(true);
    setSelectedTime("");
    try {
      const res = await fetch(`/api/schedule/availability?date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots || []);
      } else {
        setSlots([]);
      }
    } catch {
      setSlots([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedDate) fetchSlots(selectedDate);
  }, [selectedDate, fetchSlots]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("booking");
    try {
      const res = await fetch("/api/schedule/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          time: selectedTime,
          ...formData,
        }),
      });

      if (res.ok) {
        setStatus("booked");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  if (status === "booked") {
    return (
      <div className="bg-teal/10 rounded-2xl p-10 text-center">
        <h3 className="font-display font-light text-2xl text-navy mb-2">Consultation booked!</h3>
        <p className="font-body font-light text-charcoal-light">Check your email for a confirmation. Brenda is looking forward to speaking with you!</p>
      </div>
    );
  }

  const inputClass = "w-full font-body font-light text-base text-charcoal bg-cream border border-navy/10 rounded-lg px-4 py-3 focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal transition-colors min-h-[48px]";

  return (
    <form onSubmit={handleBook} className="space-y-6">
      <div>
        <label className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-3 block">Select a Date</label>
        <div className="flex gap-2 flex-wrap">
          {availableDates.map((date) => {
            const d = new Date(date + "T12:00:00");
            const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
            const dayNum = d.getDate();
            const month = d.toLocaleDateString("en-US", { month: "short" });
            return (
              <button
                key={date}
                type="button"
                onClick={() => setSelectedDate(date)}
                className={`flex flex-col items-center px-3 py-2 rounded-lg border transition-all min-w-[60px] min-h-[48px] ${
                  selectedDate === date ? "bg-navy text-cream border-navy" : "bg-white text-charcoal border-navy/10 hover:border-teal"
                }`}
              >
                <span className="text-[0.6rem] uppercase tracking-wider opacity-70">{dayName}</span>
                <span className="font-display font-semibold text-lg leading-none">{dayNum}</span>
                <span className="text-[0.55rem] uppercase tracking-wider opacity-70">{month}</span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div>
          <label className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-3 block">Select a Time (Pacific)</label>
          {loading ? (
            <p className="font-body font-light text-sm text-charcoal-light">Loading available times...</p>
          ) : slots.length === 0 ? (
            <p className="font-body font-light text-sm text-charcoal-light">No available slots for this date. Try another day.</p>
          ) : (
            <div className="grid grid-cols-3 tablet:grid-cols-4 desktop:grid-cols-6 gap-2">
              {slots.map((slot) => {
                const hour = parseInt(slot.time.split(":")[0]);
                const min = slot.time.split(":")[1];
                const ampm = hour >= 12 ? "PM" : "AM";
                const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                return (
                  <button
                    key={slot.time}
                    type="button"
                    onClick={() => setSelectedTime(slot.time)}
                    className={`py-2 px-3 rounded-lg border text-sm transition-all min-h-[44px] ${
                      selectedTime === slot.time ? "bg-teal text-white border-teal" : "bg-white text-charcoal border-navy/10 hover:border-teal"
                    }`}
                  >
                    {displayHour}:{min} {ampm}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {selectedTime && (
        <>
          <div className="grid tablet:grid-cols-2 gap-5">
            <div>
              <label htmlFor="sched-name" className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">Full Name *</label>
              <input id="sched-name" type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label htmlFor="sched-phone" className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">Phone *</label>
              <input id="sched-phone" type="tel" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div>
            <label htmlFor="sched-email" className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">Email *</label>
            <input id="sched-email" type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label htmlFor="sched-type" className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">Consultation Type</label>
            <select id="sched-type" value={formData.consultationType} onChange={(e) => setFormData({ ...formData, consultationType: e.target.value })} className={inputClass}>
              <option value="phone">Phone Call</option>
              <option value="video">Video Call</option>
              <option value="in-person">In Person</option>
            </select>
          </div>
          <div>
            <label htmlFor="sched-reason" className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light mb-2 block">What can Brenda help you with?</label>
            <textarea id="sched-reason" rows={3} value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} className={`${inputClass} resize-none`} />
          </div>
          <Button type="submit" variant="gold" disabled={status === "booking"}>
            {status === "booking" ? "Booking..." : "Confirm Consultation"}
          </Button>
          {status === "error" && (
            <p className="font-body font-light text-sm text-red-600">Something went wrong. Please try again or call Brenda directly.</p>
          )}
        </>
      )}
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/contact/Scheduler.tsx
git commit -m "feat: rewrite Scheduler for live Outlook calendar with Saturday + extended hours"
```

---

## Task 18: Phone Tap Pre-Call Modal

**Files:**
- Modify: `src/components/layout/MobileCTABar.tsx`

- [ ] **Step 1: Update `MobileCTABar.tsx` to intercept phone tap**

Add the LeadCaptureModal import and state management. When "Call Brenda" is tapped, show the modal instead of firing the tel: link directly. After submission (or if localStorage flag exists), fire the call.

Key changes to the existing component:
1. Add `useState` for `showModal`
2. Replace the `<a href="tel:...">` with a `<button>` that checks localStorage
3. Add `LeadCaptureModal` rendered conditionally
4. On modal complete, fire `window.location.href = "tel:..."`

The existing scroll-hide behavior, styling, and "Book Now" button stay exactly the same.

```typescript
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { siteConfig } from "@/data/site";
import { LeadCaptureModal } from "@/components/ui/LeadCaptureModal";

const LOCAL_STORAGE_KEY = "brv_lead_captured";

export function MobileCTABar() {
  const [visible, setVisible] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      setVisible(current <= lastScrollY.current || current < 100);
      lastScrollY.current = current;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleCallTap = () => {
    if (typeof window !== "undefined" && localStorage.getItem(LOCAL_STORAGE_KEY)) {
      window.location.href = `tel:${siteConfig.agent.phoneRaw}`;
      return;
    }
    setShowModal(true);
  };

  const handleModalComplete = () => {
    setShowModal(false);
    window.location.href = `tel:${siteConfig.agent.phoneRaw}`;
  };

  return (
    <>
      {showModal && (
        <LeadCaptureModal source="phone-call" onComplete={handleModalComplete} />
      )}

      <div
        className={`fixed bottom-0 left-0 right-0 z-50 desktop:hidden grid grid-cols-2 gap-[1px] bg-black transition-transform duration-300 ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <button
          onClick={handleCallTap}
          className="bg-navy text-cream font-ui font-medium text-[0.78rem] tracking-wider uppercase py-4 text-center min-h-[60px] transition-colors hover:bg-navy-mid"
        >
          Call Brenda
        </button>
        <Link
          href="/contact#schedule"
          className="bg-gold text-navy font-ui font-medium text-[0.78rem] tracking-wider uppercase py-4 text-center min-h-[60px] flex items-center justify-center transition-colors hover:bg-gold-light"
        >
          Book Now
        </Link>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/MobileCTABar.tsx
git commit -m "feat: add pre-call lead capture modal to MobileCTABar phone tap"
```

---

## Task 19: Navbar Calculators Dropdown

**Files:**
- Modify: `src/components/layout/Navbar.tsx`

- [ ] **Step 1: Add Calculators dropdown to Navbar**

In the existing Navbar, add a "Calculators" item to the desktop nav links and mobile menu. Desktop: hover dropdown with two links. Mobile: expand in hamburger menu.

Find the existing nav links array (should be something like `["Home", "About", "Listings", "Areas", "Testimonials", "Contact"]`) and add the Calculators dropdown logic.

For desktop nav, add between "Testimonials" and "Contact":
```tsx
{/* Calculators Dropdown */}
<div className="relative group">
  <span className="cursor-pointer text-charcoal-light hover:text-gold transition-colors font-body text-sm">
    Calculators
  </span>
  <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
    <div className="bg-white rounded-lg shadow-lg border border-navy/5 py-2 min-w-[220px]">
      <Link href="/calculators/qualify" className="block px-4 py-2 text-sm font-body text-charcoal hover:bg-cream hover:text-gold transition-colors">
        Do I Qualify?
      </Link>
      <Link href="/calculators/costs" className="block px-4 py-2 text-sm font-body text-charcoal hover:bg-cream hover:text-gold transition-colors">
        Mortgage & Closing Costs
      </Link>
    </div>
  </div>
</div>
```

For mobile menu, add an expandable section after "Testimonials":
```tsx
<div>
  <button
    onClick={() => setCalcOpen(!calcOpen)}
    className="text-cream/90 hover:text-gold text-lg font-body"
  >
    Calculators {calcOpen ? "−" : "+"}
  </button>
  {calcOpen && (
    <div className="ml-4 mt-2 space-y-2">
      <Link href="/calculators/qualify" onClick={() => setMenuOpen(false)} className="block text-cream/70 hover:text-gold text-base font-body">
        Do I Qualify?
      </Link>
      <Link href="/calculators/costs" onClick={() => setMenuOpen(false)} className="block text-cream/70 hover:text-gold text-base font-body">
        Mortgage & Closing Costs
      </Link>
    </div>
  )}
</div>
```

Add `const [calcOpen, setCalcOpen] = useState(false);` to component state.

- [ ] **Step 2: Verify nav works on desktop and mobile**

```bash
npm run dev
```

Check desktop hover dropdown and mobile hamburger expandable section.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Navbar.tsx
git commit -m "feat: add Calculators dropdown to Navbar (desktop hover + mobile expandable)"
```

---

## Task 20: Update .env.example & Final Build Verification

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Update `.env.example`**

Replace with:
```
# Follow Up Boss
FOLLOW_UP_BOSS_API_KEY=
FOLLOW_UP_BOSS_SYSTEM=brendavegarealty

# Microsoft 365 (Outlook Calendar)
MICROSOFT_TENANT_ID=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_USER_ID=

# Email
RESEND_API_KEY=

# Public
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_GA_MEASUREMENT_ID=
NEXT_PUBLIC_IDX_ACCOUNT_ID=
```

- [ ] **Step 2: Run full build**

```bash
npm run build
```

Expected: Build succeeds with all pages and API routes compiled. Watch for any TypeScript errors or missing imports.

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Fix any lint errors.

- [ ] **Step 4: Commit**

```bash
git add .env.example
git commit -m "chore: update env example with Microsoft 365 vars, remove Google Calendar vars"
```

- [ ] **Step 5: Final integration test**

```bash
npm run dev
```

Manually verify:
1. `/calculators/qualify` — modal → calculator → real-time results → rent vs buy chart
2. `/calculators/costs` — modal → calculator → payment pie → closing costs toggle → amortization → PDF export
3. Mobile CTA bar "Call Brenda" — modal → submit → call fires
4. Navbar dropdown — hover on desktop, expand on mobile
5. `/contact#schedule` — date picker → time slots (from API or fallback) → booking form
6. localStorage skip: after submitting modal once, refresh page → modal should not appear

---

## Task 21: Contact Form Refactoring

**Files:**
- Create: `src/app/api/contact/route.ts`
- Modify: `src/components/contact/ContactForm.tsx`

- [ ] **Step 1: Create `src/app/api/contact/route.ts`**

Delegates to `/api/lead` with `source: "contact-form"`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createLeadWithDetails } from "@/lib/follow-up-boss";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, message, type } = body;

    if (!name || !email || !phone) {
      return NextResponse.json({ error: "Name, email, and phone are required" }, { status: 400 });
    }

    const result = await createLeadWithDetails({
      name,
      email,
      phone,
      source: "Contact Form - brendavegarealty.com",
      tags: ["contact-form", type ? `inquiry-${type}` : "inquiry-other"],
      note: message ? `Contact form message:\n${message}` : undefined,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Contact API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Update `src/components/contact/ContactForm.tsx`**

Replace the `mailto:` submission logic with a `fetch` call to `/api/contact`. Keep the existing form fields and UI styling unchanged.

In the `handleSubmit` function, replace the `mailto` section:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setStatus("sending");
  try {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      setStatus("sent");
    } else {
      setStatus("error");
    }
  } catch {
    setStatus("error");
  }
};
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/contact/route.ts src/components/contact/ContactForm.tsx
git commit -m "feat: refactor contact form to POST to /api/contact with FUB lead creation"
```

---

That completes the implementation plan — **21 tasks** covering all features from the spec.
