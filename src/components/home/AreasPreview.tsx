import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";
import { SectionLabel } from "@/components/ui/SectionLabel";
import Link from "next/link";

const previewAreas = [
  { name: "Campbell", slug: "campbell" },
  { name: "San Jose", slug: "san-jose" },
  { name: "Los Gatos", slug: "los-gatos" },
  { name: "Saratoga", slug: "saratoga" },
];

export function AreasPreview() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-[1200px] mx-auto">
        <AnimateOnScroll>
          <SectionLabel>Areas Served</SectionLabel>
          <h2 className="font-display font-light text-[clamp(2rem,4vw,3.2rem)] text-navy mt-4 mb-12 leading-tight">
            Serving the Bay Area
            <br />
            <span className="text-teal italic">& beyond</span>
          </h2>
        </AnimateOnScroll>
        <div className="grid grid-cols-2 desktop:grid-cols-4 gap-4">
          {previewAreas.map((area, i) => (
            <AnimateOnScroll key={area.slug} delay={i * 0.1}>
              <Link href={`/areas/${area.slug}`} className="group block bg-navy rounded-xl p-8 text-center hover:-translate-y-1 transition-all duration-300">
                <span className="font-display font-light text-xl text-cream group-hover:text-gold transition-colors">
                  {area.name}
                </span>
              </Link>
            </AnimateOnScroll>
          ))}
        </div>
        <AnimateOnScroll>
          <div className="text-center mt-8">
            <Link href="/areas" className="font-ui font-medium text-xs tracking-wider uppercase text-charcoal-light hover:text-gold transition-colors">
              View All Areas &rarr;
            </Link>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
