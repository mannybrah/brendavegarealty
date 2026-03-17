import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Button } from "@/components/ui/Button";
import { areas } from "@/data/areas";
import Link from "next/link";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return areas.map((area) => ({ slug: area.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const area = areas.find((a) => a.slug === slug);
  if (!area) return {};
  return {
    title: `${area.name} Real Estate`,
    description: `Explore homes in ${area.name}. ${area.description}`,
  };
}

export default async function NeighborhoodPage({ params }: Props) {
  const { slug } = await params;
  const area = areas.find((a) => a.slug === slug);
  if (!area) notFound();

  return (
    <>
      <section className="py-20 px-6 bg-cream">
        <div className="max-w-[1200px] mx-auto">
          <AnimateOnScroll>
            <SectionLabel>Neighborhood Spotlight</SectionLabel>
            <h1 className="font-display font-light text-[clamp(2.5rem,5vw,4rem)] text-navy mt-4 mb-6">{area.name}</h1>
            <p className="font-body font-light text-lg text-charcoal-light max-w-[600px] leading-relaxed">{area.description}</p>
          </AnimateOnScroll>
        </div>
      </section>
      <section className="py-16 px-6">
        <div className="max-w-[1200px] mx-auto grid desktop:grid-cols-2 gap-16">
          <AnimateOnScroll>
            <h2 className="font-display font-light text-2xl text-navy mb-4">Why Live in {area.name}?</h2>
            <p className="font-body font-light text-base text-charcoal-light leading-relaxed mb-8">{area.whyLiveHere}</p>
            <div className="bg-cream rounded-xl p-6 inline-block">
              <span className="font-body font-medium text-xs tracking-[0.2em] uppercase text-gold block mb-1">Median Home Price</span>
              <span className="font-display font-semibold text-3xl text-navy">{area.medianPrice}</span>
            </div>
          </AnimateOnScroll>
          <AnimateOnScroll delay={0.2}>
            <h3 className="font-body font-medium text-xs tracking-[0.2em] uppercase text-gold mb-6">Highlights</h3>
            <ul className="space-y-4 list-none p-0">
              {area.highlights.map((highlight) => (
                <li key={highlight} className="font-body font-light text-base text-charcoal flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-teal flex-shrink-0" />
                  {highlight}
                </li>
              ))}
            </ul>
          </AnimateOnScroll>
        </div>
      </section>
      <section className="py-16 px-6 bg-navy">
        <AnimateOnScroll>
          <div className="max-w-[600px] mx-auto text-center">
            <h2 className="font-display font-light text-2xl text-cream mb-4">Interested in {area.name}?</h2>
            <p className="font-body font-light text-sage mb-8">Let Brenda help you find the perfect home in this community.</p>
            <Link href="/contact#schedule"><Button variant="gold">Talk to Brenda</Button></Link>
          </div>
        </AnimateOnScroll>
      </section>
    </>
  );
}
