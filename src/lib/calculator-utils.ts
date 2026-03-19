import type {
  PaymentBreakdown,
  QualificationResult,
  AmortizationRow,
  RentVsBuyResult,
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
  void purchasePrice;
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
): import("@/types").ClosingCostItem[] {
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
): import("@/types").ClosingCostItem[] {
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
