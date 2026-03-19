"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
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

  const stableOnSummaryChange = useCallback((s: CalculatorSummary) => {
    onSummaryChange?.(s);
  }, [onSummaryChange]);

  // Report summary to parent outside useMemo
  useEffect(() => {
    if (results?.summary) stableOnSummaryChange(results.summary);
  }, [results, stableOnSummaryChange]);

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
