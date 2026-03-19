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
        Guidelines: Conventional &le; 45% DTI with 640+ FICO. FHA &le; 55% DTI with 620+ FICO.
        Results are estimates — consult a mortgage professional.
      </p>
    </div>
  );
}
