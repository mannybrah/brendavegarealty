import type { Metadata } from "next";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";
import { AreaMap } from "@/components/areas/AreaMap";
import { NeighborhoodCard } from "@/components/areas/NeighborhoodCard";
import { FinalCTA } from "@/components/home/FinalCTA";
import { areas } from "@/data/areas";

export const metadata: Metadata = {
  title: "Areas Served",
  description: "Brenda Vega serves Campbell, San Jose, Los Gatos, Saratoga, and the greater Bay Area. Explore neighborhoods and find your perfect community.",
};

export default function AreasPage() {
  return (
    <>
      <section className="py-20 px-6">
        <div className="max-w-[1200px] mx-auto">
          <AnimateOnScroll>
            <div className="text-center mb-12">
              <SectionLabel>Areas Served</SectionLabel>
              <h1 className="font-display font-light text-[clamp(2rem,4vw,3.2rem)] text-navy mt-4 leading-tight">
                Find your <em className="text-teal">neighborhood</em>
              </h1>
            </div>
          </AnimateOnScroll>
          <AnimateOnScroll>
            <AreaMap />
          </AnimateOnScroll>
          <div className="grid tablet:grid-cols-2 gap-6 mt-16">
            {areas.map((area, i) => (
              <AnimateOnScroll key={area.slug} delay={i * 0.1}>
                <NeighborhoodCard area={area} />
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>
      <FinalCTA />
    </>
  );
}
