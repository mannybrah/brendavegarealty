import type { Metadata } from "next";
import Link from "next/link";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";
import { FinalCTA } from "@/components/home/FinalCTA";
import { siteConfig } from "@/data/site";
import { services, SERVICE_AREA_TEXT } from "@/data/services";

export const metadata: Metadata = {
  title: "Real Estate Services",
  description: `How ${siteConfig.agent.name}, ${siteConfig.agent.title} with ${siteConfig.agent.brokerage} (DRE #${siteConfig.agent.dre}), helps buyers and sellers in Campbell, San Jose, Los Gatos, Saratoga and the greater Bay Area.`,
};

export default function ServicesPage() {
  const { agent } = siteConfig;
  return (
    <>
      <section className="py-20 px-6">
        <div className="max-w-[1200px] mx-auto">
          <AnimateOnScroll>
            <div className="text-center mb-12">
              <SectionLabel>Services</SectionLabel>
              <h1 className="font-display font-light text-[clamp(2rem,4vw,3.2rem)] text-navy mt-4 leading-tight">
                How Brenda <em className="text-teal">helps</em>
              </h1>
              <p className="font-body font-light text-lg text-charcoal-light mt-4 max-w-[680px] mx-auto leading-relaxed">
                {agent.name} is a {agent.title} with {agent.brokerage} (California DRE #{agent.dre}) who
                represents buyers and sellers in {SERVICE_AREA_TEXT}.
              </p>
            </div>
          </AnimateOnScroll>
          <div className="grid tablet:grid-cols-2 gap-6">
            {services.map((service, i) => (
              <AnimateOnScroll key={service.slug} delay={i * 0.1}>
                <Link
                  href={`/services/${service.slug}`}
                  className="group block h-full bg-cream rounded-lg p-8 transition-shadow duration-300 hover:shadow-xl hover:shadow-navy/8"
                >
                  <h2 className="font-display font-light text-[clamp(1.3rem,2vw,1.6rem)] text-navy mb-3 leading-snug group-hover:text-teal transition-colors duration-300">
                    {service.title}
                  </h2>
                  <p className="font-body font-light text-[0.95rem] text-charcoal-light leading-relaxed mb-5">
                    {service.summary}
                  </p>
                  <span className="font-ui font-medium text-xs tracking-wider uppercase text-teal">
                    Learn more &rarr;
                  </span>
                </Link>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </section>
      <FinalCTA />
    </>
  );
}
