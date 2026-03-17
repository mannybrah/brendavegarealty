import type { Metadata } from "next";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";
import { ContactForm } from "@/components/contact/ContactForm";
import { Scheduler } from "@/components/contact/Scheduler";
import { siteConfig } from "@/data/site";

export const metadata: Metadata = {
  title: "Contact Brenda Vega",
  description: "Get in touch with Brenda Vega or schedule a free consultation. Serving the Bay Area with integrity and heart.",
};

export default function ContactPage() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-[1200px] mx-auto">
        <AnimateOnScroll>
          <div className="text-center mb-16">
            <SectionLabel>Get in Touch</SectionLabel>
            <h1 className="font-display font-light text-[clamp(2rem,4vw,3.2rem)] text-navy mt-4 leading-tight">
              Let&apos;s <em className="text-teal">talk</em>
            </h1>
          </div>
        </AnimateOnScroll>
        <div className="grid desktop:grid-cols-2 gap-16">
          <div>
            <AnimateOnScroll>
              <h2 className="font-display font-light text-2xl text-navy mb-6">Send a message</h2>
              <ContactForm />
            </AnimateOnScroll>
            <AnimateOnScroll>
              <div className="mt-12 space-y-4">
                <h3 className="font-body font-medium text-xs tracking-[0.2em] uppercase text-gold mb-4">Or reach out directly</h3>
                <a href={`tel:${siteConfig.agent.phoneRaw}`} className="flex items-center gap-3 font-body font-light text-charcoal hover:text-teal transition-colors">
                  <span className="w-10 h-10 rounded-full bg-cream flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </span>
                  {siteConfig.agent.phone}
                </a>
                <a href={`mailto:${siteConfig.agent.email}`} className="flex items-center gap-3 font-body font-light text-charcoal hover:text-teal transition-colors">
                  <span className="w-10 h-10 rounded-full bg-cream flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </span>
                  {siteConfig.agent.email}
                </a>
              </div>
            </AnimateOnScroll>
          </div>
          <div id="schedule">
            <AnimateOnScroll delay={0.2}>
              <h2 className="font-display font-light text-2xl text-navy mb-6">Book a free consultation</h2>
              <Scheduler />
            </AnimateOnScroll>
          </div>
        </div>
      </div>
    </section>
  );
}
