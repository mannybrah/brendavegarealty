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
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
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
