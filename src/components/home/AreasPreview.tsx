import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";
import { SectionLabel } from "@/components/ui/SectionLabel";
import Link from "next/link";
import Image from "next/image";

/*
 * Area card photography (public/images/areas/) — licenses:
 *  campbell.jpg  — "Campbell CA - water tower at night" by Miles Gehm, CC BY 2.0 (Wikimedia Commons)
 *  san-jose.jpg  — "San Jose CA skyline at night 2014" by Ben Loomis, CC BY 2.0 (Wikimedia Commons)
 *  los-gatos.jpg — "Hotel Los Gatos" by Ramkumar Menon, CC BY-SA 4.0 (Wikimedia Commons)
 *  saratoga.jpg  — "Hakone Gardens, Saratoga" by Daderot, Public domain (Wikimedia Commons)
 * Visible attribution lives on the /areas page footer.
 */
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
              <Link
                href={`/areas/${area.slug}`}
                className="group relative block aspect-[4/5] overflow-hidden rounded-md"
              >
                <Image
                  src={`/images/areas/${area.slug}.jpg`}
                  alt={`${area.name}, California`}
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/25 to-navy/10 transition-colors duration-300 group-hover:from-navy/90" />
                <div className="absolute inset-3 border border-gold/25 rounded-sm pointer-events-none" />
                <div className="absolute bottom-0 inset-x-0 p-5 text-center">
                  <span className="font-display font-light text-xl text-cream group-hover:text-gold transition-colors">
                    {area.name}
                  </span>
                </div>
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
