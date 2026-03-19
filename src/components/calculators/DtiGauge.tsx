"use client";

interface DtiGaugeProps {
  dti: number;
  maxDti: number; // 45 for conventional, 55 for FHA
  label: string;
}

export function DtiGauge({ dti, maxDti, label }: DtiGaugeProps) {
  const clampedDti = Math.min(dti, 70);
  const percentage = (clampedDti / 70) * 100;

  const getColor = () => {
    if (dti <= 35) return { bar: "bg-teal", text: "text-teal" };
    if (dti <= maxDti) return { bar: "bg-gold", text: "text-gold" };
    return { bar: "bg-red-500", text: "text-red-500" };
  };

  const colors = getColor();

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <span className="font-body font-medium text-xs tracking-[0.15em] uppercase text-charcoal-light">
          {label}
        </span>
        <span className={`font-display font-semibold text-2xl ${colors.text}`}>
          {dti.toFixed(1)}%
        </span>
      </div>
      <div className="w-full h-3 bg-navy/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${colors.bar}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-[0.6rem] font-body text-charcoal-light">
        <span>0%</span>
        <span>35% (Good)</span>
        <span>{maxDti}% (Max)</span>
        <span>70%+</span>
      </div>
    </div>
  );
}
