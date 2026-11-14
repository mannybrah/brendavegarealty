import Image from "next/image";
import Link from "next/link";
import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";
import { siteConfig } from "@/data/site";

// Sits directly under the hero. The longer biography lives on /about, so the
// introduction is not repeated further down the page.
export function MeetBrenda() {
  return (
    <section className="bg-warm-white px-6 desktop:px-10 py-20 desktop:py-28">
      <div className="max-w-[1280px] mx-auto grid gap-12 desktop:gap-20 desktop:grid-cols-[5fr_6fr] items-center">
        <AnimateOnScroll>
          <div className="relative aspect-[4/5] max-w-[520px] mx-auto desktop:mx-0 w-full overflow-hidden">
            <Image
              src="/images/home/brenda-portrait.jpg"
              alt="Portrait of Brenda Vega, REALTOR"
              fill
              loading="lazy"
              sizes="(max-width: 1024px) 100vw, 42vw"
              className="object-cover object-top"
            />
          </div>
        </AnimateOnScroll>
        <AnimateOnScroll delay={0.1}>
          <p className="font-body font-medium text-[0.68rem] tracking-[0.38em] uppercase text-gold mb-6">Meet Brenda</p>
          <h2 className="font-display font-light text-navy leading-[1.05] text-[clamp(2.2rem,4.6vw,4rem)]">
            Local perspective. <em className="text-teal">Human connection.</em>
          </h2>
          <p className="font-body font-light text-lg leading-relaxed text-charcoal-light mt-8 max-w-[52ch]">
            A house becomes a home because of the neighborhood, the community, and the life it supports. That is the
            lens Brenda brings to every client, whether it is a first purchase or a long-planned move.
          </p>
          <p className="font-body font-light text-lg leading-relaxed text-charcoal-light mt-5 max-w-[52ch]">
            She answers the call, shows up early, and stays with you through every step, so the biggest decision of
            the year feels clear instead of overwhelming.
          </p>
          <p className="font-display italic text-[2.1rem] text-navy mt-10 leading-none">Brenda Vega</p>
          <p className="font-body font-medium text-[0.62rem] tracking-[0.32em] uppercase text-charcoal-light/80 mt-3">
            {siteConfig.agent.title} &middot; {siteConfig.agent.brokerage} &middot; DRE #{siteConfig.agent.dre}
          </p>
          <Link
            href="/about"
            className="inline-block mt-9 font-ui font-medium text-[0.76rem] tracking-[0.14em] uppercase text-navy border-b border-gold pb-1 hover:text-teal transition-colors"
          >
            More about Brenda &rarr;
          </Link>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
