import type { Metadata } from "next";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";
import { IDXEmbed } from "@/components/listings/IDXEmbed";

export const metadata: Metadata = {
  title: "Property Listings",
  description: "Search homes for sale in Campbell, San Jose, and the Bay Area. Browse MLS listings with Brenda Vega Realty.",
};

export default function ListingsPage() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-[1200px] mx-auto">
        <AnimateOnScroll>
          <div className="text-center mb-12">
            <SectionLabel>Listings</SectionLabel>
            <h1 className="font-display font-light text-[clamp(2rem,4vw,3.2rem)] text-navy mt-4 leading-tight">
              Find your <em className="text-teal">home</em>
            </h1>
            <p className="font-body font-light text-charcoal-light mt-4 max-w-md mx-auto">
              Browse available properties across the Bay Area or contact Brenda for a personalized search.
            </p>
          </div>
        </AnimateOnScroll>
        <IDXEmbed />
      </div>
    </section>
  );
}
