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
