import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { UploadForm } from "@/components/home-clarity/UploadForm";
import { SampleReport } from "@/components/home-clarity/SampleReport";
import { siteConfig } from "@/data/site";

export const metadata: Metadata = {
  title: { absolute: "Brenda Vega’s Home Clarity | Complimentary Disclosure Analysis" },
  description:
    "Upload the disclosures for a home you’re considering. They are analyzed and organized into key findings, potential concerns, and questions worth asking, and Brenda personally walks you through them. Complimentary, no obligation.",
};

const steps = [
  {
    n: "01",
    title: "Upload the disclosures",
    body: "Send the disclosure PDF for the home you’re considering, along with how you’d like to be reached.",
  },
  {
    n: "02",
    title: "The documents are analyzed",
    body: "Our custom AI system reads the package and organizes key findings, potential concerns, and questions worth asking.",
  },
  {
    n: "03",
    title: "Brenda walks you through it",
    body: "Brenda personally reaches out to go over the findings with you and talk through your next steps.",
  },
];

export default function HomeClarityPage() {
  return (
    <>
      <section className="bg-navy text-cream px-6 desktop:px-10 pt-16 desktop:pt-24 pb-20 desktop:pb-28 -mt-[72px]">
        <div className="max-w-[1280px] mx-auto pt-[72px] grid gap-14 desktop:gap-20 desktop:grid-cols-2 items-center">
          <div>
            <p className="font-body font-medium text-[0.68rem] tracking-[0.38em] uppercase text-gold mb-6">
              Brenda Vega&rsquo;s Home Clarity
            </p>
            <h1 className="font-display font-light leading-[1.03] text-[clamp(2.5rem,5.6vw,4.8rem)]">
              Before you make an offer, <em className="text-gold-light">get a clearer picture.</em>
            </h1>
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
            <a
              href="#upload"
              className="inline-flex items-center justify-center mt-10 h-[52px] px-8 bg-gold text-navy font-ui font-medium text-[0.78rem] tracking-[0.14em] uppercase hover:bg-gold-light transition-colors"
            >
              Upload your disclosures
            </a>
          </div>
          <SampleReport />
        </div>
      </section>

      <section className="bg-warm-white px-6 desktop:px-10 py-20 desktop:py-24" aria-labelledby="how-heading">
        <div className="max-w-[1280px] mx-auto">
          <h2 id="how-heading" className="font-display font-light text-navy leading-[1.05] text-[clamp(2rem,4vw,3.2rem)]">
            How it works
          </h2>
          <ol className="list-none p-0 m-0 mt-12 grid gap-10 desktop:grid-cols-3 desktop:gap-14">
            {steps.map((step) => (
              <li key={step.n} className="border-t border-gold/60 pt-6">
                <span className="font-display text-gold text-2xl">{step.n}</span>
                <h3 className="font-display font-normal text-[1.6rem] text-navy mt-3">{step.title}</h3>
                <p className="font-body font-light text-base leading-relaxed text-charcoal-light mt-3">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="upload" className="bg-cream px-6 desktop:px-10 py-20 desktop:py-28 scroll-mt-[72px]" aria-labelledby="upload-heading">
        <div className="max-w-[1280px] mx-auto grid gap-14 desktop:gap-20 desktop:grid-cols-[5fr_7fr] items-start">
          <div className="desktop:sticky desktop:top-28">
            <p className="font-body font-medium text-[0.68rem] tracking-[0.38em] uppercase text-gold mb-6">
              Start here
            </p>
            <h2 id="upload-heading" className="font-display font-light text-navy leading-[1.05] text-[clamp(2.1rem,4.2vw,3.4rem)]">
              Upload your disclosures
            </h2>
            <div className="flex items-center gap-5 mt-10">
              <div className="relative w-20 h-20 rounded-full overflow-hidden shrink-0">
                <Image
                  src="/images/home/brenda-portrait.jpg"
                  alt="Brenda Vega"
                  fill
                  loading="lazy"
                  sizes="80px"
                  className="object-cover object-top"
                />
              </div>
              <p className="font-body font-light text-base leading-relaxed text-charcoal-light">
                Your documents go to Brenda Vega, {siteConfig.agent.title} with {siteConfig.agent.brokerage}. She
                follows up with you herself.
              </p>
            </div>
            <ul className="list-none p-0 m-0 mt-10 space-y-4 font-body font-light text-sm leading-relaxed text-charcoal-light">
              <li className="pl-4 border-l border-gold/60">
                The analysis is a reading aid. It does not replace the disclosure documents, professional
                inspections, or legal advice, and it cannot guarantee that every issue is found.
              </li>
              <li className="pl-4 border-l border-gold/60">
                Any repair cost ranges in a report are rough estimates, not contractor quotes.
              </li>
              <li className="pl-4 border-l border-gold/60">
                Already working with an agent? You&rsquo;re welcome to use this. Just let Brenda know on the form.
              </li>
              <li className="pl-4 border-l border-gold/60">
                Your PDF is stored privately and is never published. See the{" "}
                <Link href="/privacy#home-clarity" className="text-navy underline underline-offset-4">
                  privacy policy
                </Link>
                .
              </li>
            </ul>
          </div>
          <UploadForm />
        </div>
      </section>
    </>
  );
}
