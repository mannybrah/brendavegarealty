import Image from "next/image";
import Link from "next/link";
import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";
import { SampleReport } from "@/components/home-clarity/SampleReport";

export function HomeClaritySection() {
  return (
    <section className="bg-navy text-cream px-6 desktop:px-10 py-20 desktop:py-28" aria-labelledby="home-clarity-heading">
      <div className="max-w-[1280px] mx-auto grid gap-14 desktop:gap-20 desktop:grid-cols-2 items-center">
        <AnimateOnScroll>
          <p className="font-body font-medium text-[0.68rem] tracking-[0.38em] uppercase text-gold mb-6">
            Brenda Vega&rsquo;s Home Clarity
          </p>
          <h2
            id="home-clarity-heading"
            className="font-display font-light leading-[1.05] text-[clamp(2.2rem,4.6vw,4rem)]"
          >
            Before you make an offer, <em className="text-gold-light">get a clearer picture.</em>
          </h2>
          <p className="font-body font-light text-lg leading-relaxed text-cream/80 mt-8 max-w-[52ch]">
            Upload the disclosures for a home you&rsquo;re considering. Our custom AI system will analyze the
            documents and organize key findings, potential concerns, and questions worth asking.
          </p>
          <p className="font-body font-light text-lg leading-relaxed text-cream/80 mt-5 max-w-[52ch]">
            Brenda will personally reach out to walk you through the findings and discuss your next steps.
          </p>
          <p className="font-display italic text-xl text-gold-light mt-8">
            Complimentary analysis. Personal follow-up. No obligation.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-6">
            <Link
              href="/home-clarity#upload"
              className="inline-flex items-center justify-center h-[52px] px-8 bg-gold text-navy font-ui font-medium text-[0.78rem] tracking-[0.14em] uppercase hover:bg-gold-light transition-colors"
            >
              Upload your disclosures
            </Link>
            <Link
              href="/home-clarity"
              className="font-ui font-medium text-[0.76rem] tracking-[0.14em] uppercase text-cream border-b border-gold pb-1 hover:text-gold-light transition-colors"
            >
              How it works &rarr;
            </Link>
          </div>

          <div className="mt-12 flex items-center gap-5 border-t border-cream/15 pt-8">
            <div className="relative w-16 h-16 rounded-full overflow-hidden shrink-0">
              <Image
                src="/images/home/brenda-portrait.jpg"
                alt=""
                fill
                loading="lazy"
                sizes="64px"
                className="object-cover object-top"
              />
            </div>
            <p className="font-body font-light text-sm leading-relaxed text-cream/75 max-w-[40ch]">
              <span className="block mb-1 font-body font-medium text-[0.62rem] tracking-[0.26em] uppercase text-gold">
                An invitation from Brenda
              </span>
              Not sure what a disclosure is telling you? Send it over, and Brenda will go through it with you.
            </p>
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll delay={0.1}>
          <SampleReport />
        </AnimateOnScroll>
      </div>
    </section>
  );
}
