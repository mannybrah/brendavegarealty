import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";
import Link from "next/link";
import { siteConfig } from "@/data/site";

export function FinalCTA() {
  return (
    <section className="bg-cream px-6 desktop:px-10 py-24 desktop:py-32">
      <AnimateOnScroll>
        <div className="max-w-[820px] mx-auto text-center">
          <p className="font-body font-medium text-[0.68rem] tracking-[0.38em] uppercase text-gold mb-6">
            Start the conversation
          </p>
          <h2 className="font-display font-light text-navy leading-[1.05] text-[clamp(2.3rem,5vw,4.4rem)]">
            Wherever you are in the move, <em className="text-teal">let&rsquo;s talk it through.</em>
          </h2>
          <p className="font-body font-light text-lg text-charcoal-light mt-7 max-w-[46ch] mx-auto">
            Buying, selling, or just weighing your options: a conversation with Brenda is free and comes with no
            pressure.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/contact#schedule"
              className="inline-flex items-center justify-center h-[52px] px-8 bg-navy text-cream font-ui font-medium text-[0.78rem] tracking-[0.14em] uppercase hover:bg-navy-light transition-colors"
            >
              Book a consultation
            </Link>
            <a
              href={`tel:${siteConfig.agent.phoneRaw}`}
              className="inline-flex items-center justify-center h-[52px] px-8 border border-navy text-navy font-ui font-medium text-[0.78rem] tracking-[0.14em] uppercase hover:bg-navy hover:text-cream transition-colors"
            >
              Call {siteConfig.agent.phone}
            </a>
          </div>
        </div>
      </AnimateOnScroll>
    </section>
  );
}
