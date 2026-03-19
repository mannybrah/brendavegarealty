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
