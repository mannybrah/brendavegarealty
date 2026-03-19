"use client";

import { useState, useCallback, useRef } from "react";
import { LeadCaptureModal } from "@/components/ui/LeadCaptureModal";
import { CostCalculator } from "@/components/calculators/CostCalculator";
import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";
import { SectionLabel } from "@/components/ui/SectionLabel";
import type { CalculatorSummary } from "@/types";

export default function CostsPage() {
  const [showCalculator, setShowCalculator] = useState(false);
  const summaryRef = useRef<CalculatorSummary | undefined>(undefined);

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
