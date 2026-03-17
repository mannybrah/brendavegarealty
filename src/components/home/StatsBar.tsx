import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";
import { siteConfig } from "@/data/site";

const stats = [
  { value: siteConfig.stats.salesVolume, label: "Sales Volume" },
  { value: siteConfig.stats.satisfaction, label: "Client Satisfaction" },
  { value: siteConfig.stats.yearsExperience, label: "Years Experience" },
];

export function StatsBar() {
  return (
    <AnimateOnScroll>
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-3 gap-[1px] bg-navy/[0.06] rounded-xl overflow-hidden">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white py-9 px-6 text-center">
              <div className="font-display font-semibold text-[clamp(1.8rem,3vw,2.5rem)] text-navy leading-none mb-2">
                {stat.value}
              </div>
              <div className="font-body font-normal text-[0.75rem] tracking-[0.15em] uppercase text-charcoal-light">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AnimateOnScroll>
  );
}
