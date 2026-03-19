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
            <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
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
          <span className={`transform transition-transform ${showYearly ? "rotate-90" : ""}`}>&#9654;</span>
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
          <span className={`transform transition-transform ${showMonthly ? "rotate-90" : ""}`}>&#9654;</span>
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
