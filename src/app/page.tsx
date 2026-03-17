import { Hero } from "@/components/home/Hero";
import { StatsBar } from "@/components/home/StatsBar";
import { FeaturedListings } from "@/components/home/FeaturedListings";
import { TestimonialHighlight } from "@/components/home/TestimonialHighlight";
import { AreasPreview } from "@/components/home/AreasPreview";
import { FinalCTA } from "@/components/home/FinalCTA";

export default function HomePage() {
  return (
    <>
      <Hero />
      <StatsBar />
      <FeaturedListings />
      <section className="py-20">
        <TestimonialHighlight
          quote="Brenda made selling our family home feel safe and simple. Her knowledge of Campbell and the surrounding areas is unmatched, and she treated us like family throughout the entire process."
          author="Sarah & Michael Chen"
          location="Campbell, CA"
        />
      </section>
      <AreasPreview />
      <FinalCTA />
    </>
  );
}
