import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";
import { siteConfig } from "@/data/site";

const stats = [
  { value: siteConfig.stats.avgSalesPrice, label: "Avg. Sales Price" },
  { value: siteConfig.stats.satisfaction, label: "Client Satisfaction" },
  { value: siteConfig.stats.yearsExperience, label: "Years Experience" },
];

export function StatsBar() {
  return (
    <AnimateOnScroll>
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="bg-navy rounded-xl overflow-hidden grid grid-cols-3 gap-[1px]">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-navy py-9 px-6 text-center">
              <div className="font-display font-semibold text-[clamp(1.8rem,3vw,2.5rem)] text-gold leading-none mb-2">
                {stat.value}
              </div>
              <div className="font-body font-normal text-[0.75rem] tracking-[0.15em] uppercase text-cream/70">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AnimateOnScroll>
  );
}
