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

  const stableOnSummaryChange = useCallback((s: CalculatorSummary) => {
    onSummaryChange?.(s);
  }, [onSummaryChange]);

  // Report summary to parent outside useMemo to avoid stale closure issues
  useEffect(() => {
    if (results?.summary) stableOnSummaryChange(results.summary);
  }, [results, stableOnSummaryChange]);

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
