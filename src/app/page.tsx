import { Hero } from "@/components/home/Hero";
import { StatsBar } from "@/components/home/StatsBar";
import { FeedSection } from "@/components/home/FeedSection";
import { FeaturedListings } from "@/components/home/FeaturedListings";
import { TestimonialHighlight } from "@/components/home/TestimonialHighlight";
import { AreasPreview } from "@/components/home/AreasPreview";
import { FinalCTA } from "@/components/home/FinalCTA";

function Hairline() {
  return (
    <div className="max-w-[1200px] mx-auto px-6">
      <div className="h-px bg-gold/25" />
    </div>
  );
}

function SignatureStrip() {
  return (
    <section className="pt-16 pb-14 px-6 text-center">
      <p className="font-display italic font-light text-[clamp(1.2rem,2.2vw,1.6rem)] text-navy/85 max-w-[620px] mx-auto leading-relaxed">
        &ldquo;Your home is where your story unfolds. I&rsquo;m here for every
        chapter of it.&rdquo;
      </p>
      <p className="mt-5 font-display italic text-[1.6rem] text-gold leading-none">
        Brenda Vega
      </p>
      <p className="mt-1 font-body font-medium text-[0.6rem] tracking-[0.35em] uppercase text-charcoal-light/70">
        Real Broker &middot; DRE #02196981
      </p>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <FeedSection />
      <SignatureStrip />
      <StatsBar />
      <FeaturedListings />
      <Hairline />
      <section className="py-20">
        <TestimonialHighlight
          quote="Brenda made selling our family home feel safe and simple. Her knowledge of Campbell and the surrounding areas is unmatched, and she treated us like family throughout the entire process."
          author="Sarah & Michael Chen"
          location="Campbell, CA"
        />
      </section>
      <Hairline />
      <AreasPreview />
      <FinalCTA />
    </>
  );
}
