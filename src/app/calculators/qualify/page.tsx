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
