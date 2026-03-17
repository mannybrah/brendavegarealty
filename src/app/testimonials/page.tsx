import type { Metadata } from "next";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TestimonialGrid } from "@/components/testimonials/TestimonialGrid";
import { FinalCTA } from "@/components/home/FinalCTA";
import { testimonials } from "@/data/testimonials";

export const metadata: Metadata = {
  title: "Client Testimonials",
  description: "See what buyers and sellers across the Bay Area are saying about working with Brenda Vega.",
};

export default function TestimonialsPage() {
  return (
    <>
      <section className="py-20 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12">
            <SectionLabel>Testimonials</SectionLabel>
            <h1 className="font-display font-light text-[clamp(2rem,4vw,3.2rem)] text-navy mt-4 leading-tight">
              What clients are <em className="text-teal">saying</em>
            </h1>
          </div>
          <TestimonialGrid testimonials={testimonials} />
        </div>
      </section>
      <FinalCTA />
    </>
  );
}
