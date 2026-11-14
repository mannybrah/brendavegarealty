import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";
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

export function CommunityTiles() {
  return (
    <div className="grid grid-cols-2 desktop:grid-cols-4 gap-3 desktop:gap-4">
      {previewAreas.map((area, i) => (
        <AnimateOnScroll key={area.slug} delay={i * 0.08}>
          <Link href={`/areas/${area.slug}`} className="group relative block aspect-[3/4] overflow-hidden bg-navy">
            <Image
              src={`/images/areas/${area.slug}.jpg`}
              alt={`${area.name}, California`}
              fill
              loading="lazy"
              sizes="(max-width: 1024px) 50vw, 25vw"
              className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/20 to-transparent" />
            <div className="absolute bottom-0 inset-x-0 p-5 desktop:p-7">
              <span className="block font-display font-light text-[1.6rem] desktop:text-[2rem] text-cream leading-none">
                {area.name}
              </span>
              <span className="block mt-3 font-ui font-medium text-[0.66rem] tracking-[0.16em] uppercase text-gold-light">
                Explore the guide &rarr;
              </span>
            </div>
          </Link>
        </AnimateOnScroll>
      ))}
    </div>
  );
}

export function AreasPreview() {
  return (
    <section className="bg-warm-white px-6 desktop:px-10 py-20 desktop:py-28" aria-labelledby="communities-heading">
      <div className="max-w-[1280px] mx-auto">
        <AnimateOnScroll>
          <div className="flex flex-col desktop:flex-row desktop:items-end desktop:justify-between gap-6 mb-10 desktop:mb-14">
            <div>
              <p className="font-body font-medium text-[0.68rem] tracking-[0.38em] uppercase text-gold mb-5">
                Communities
              </p>
              <h2
                id="communities-heading"
                className="font-display font-light text-navy leading-[1.05] text-[clamp(2.2rem,4.6vw,4rem)]"
              >
                Silicon Valley <em className="text-teal">&amp; beyond.</em>
              </h2>
            </div>
            <Link
              href="/areas"
              className="self-start desktop:self-auto font-ui font-medium text-[0.76rem] tracking-[0.14em] uppercase text-navy border-b border-gold pb-1 hover:text-teal transition-colors"
            >
              View all communities &rarr;
            </Link>
          </div>
        </AnimateOnScroll>
        <CommunityTiles />
      </div>
    </section>
  );
}
