import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { UploadForm } from "@/components/home-clarity/UploadForm";
import { SampleReport } from "@/components/home-clarity/SampleReport";
import { ClarityBrandRow, PersonalReview } from "@/components/home/HomeClaritySection";
import { siteConfig } from "@/data/site";

export const metadata: Metadata = {
  title: { absolute: "Brenda Vega’s Home Clarity | Complimentary Disclosure Analysis" },
  description:
    "Upload the disclosures for a home you’re considering. They are analyzed and organized into key findings, potential concerns, and questions worth asking, and Brenda personally walks you through them. Complimentary, no obligation.",
};

const steps = [
  {
    n: "01",
    title: "Upload your disclosures",
    body: "Send the disclosure PDF for the home you’re considering, along with how you’d like to be reached.",
  },
  {
    n: "02",
    title: "Get your AI first look",
    body: "Our custom AI system reads the package and organizes key findings, potential concerns, and questions worth asking.",
  },
  {
    n: "03",
    title: "Brenda personally follows up",
    body: "Brenda personally reaches out to go over the findings with you and talk through your next steps.",
  },
];

export default function HomeClarityPage() {
  return (
    <>
      <section className="ed ed-clarity ed-clarity-under-header">
        <ClarityBrandRow />
        <div className="ed-clarity-layout">
          <div>
            <h1 className="ed-clarity-title">
              Before you
              <br />
              make an offer,
              <br />
              <em>
                get a clearer
                <br />
                picture.
              </em>
            </h1>
            <p className="ed-clarity-copy">
              Upload the disclosures for a home you&rsquo;re considering. Our custom AI system will analyze the
              documents and organize key findings, potential concerns, and questions worth asking.
              <strong>
                Brenda will personally reach out to walk you through the findings and discuss your next steps.
              </strong>
            </p>
            <a className="ed-button" href="#upload">
              Upload your disclosures <span aria-hidden="true">↗</span>
            </a>
            <p className="ed-clarity-free">Complimentary analysis. Personal follow-up. No obligation.</p>
          </div>
          <div>
            <SampleReport />
            <PersonalReview href="#upload" />
          </div>
        </div>
      </section>

      <section className="ed ed-how" aria-labelledby="how-heading">
        <h2
          id="how-heading"
          className="ed-kicker"
          style={{ fontFamily: "inherit", letterSpacing: "2.5px", color: "#8a6a37" }}
        >
          How it works
        </h2>
        <ol>
          {steps.map((step) => (
            <li key={step.n}>
              <span>{step.n}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="upload" className="ed ed-upload-layout" aria-labelledby="upload-heading">
        <div className="ed-offer">
          <p className="ed-kicker">Brenda Vega&rsquo;s Home Clarity</p>
          <h2 id="upload-heading">
            Before you
            <br />
            make an offer,
            <br />
            <em>get clarity.</em>
          </h2>
          <p>
            Upload the disclosures for a home you&rsquo;re considering. Our custom AI system will analyze the
            documents and organize key findings, potential concerns, and questions worth asking.
          </p>
          <div className="ed-followup">
            <Image
              src="/images/home/brenda-portrait.jpg"
              alt="Brenda Vega"
              width={1400}
              height={933}
              loading="lazy"
              sizes="85px"
            />
            <div>
              <h3>
                Then, Brenda
                <br />
                will personally reach out.
              </h3>
              <p>
                She&rsquo;ll walk you through the findings, help you identify follow-up questions, and discuss your
                next steps. Your documents go to Brenda Vega, {siteConfig.agent.title} with{" "}
                {siteConfig.agent.brokerage}.
              </p>
            </div>
          </div>
          <p className="ed-free">
            Complimentary analysis. Personal follow-up.
            <br />
            <strong>No payment. No obligation.</strong>
          </p>
          <ul className="ed-fine-list">
            <li>
              The analysis is a reading aid. It does not replace the disclosure documents, professional inspections,
              or legal advice, and it cannot guarantee that every issue is found.
            </li>
            <li>Any repair cost ranges in a report are rough estimates, not contractor quotes.</li>
            <li>Already working with an agent? You&rsquo;re welcome to use this. Just let Brenda know on the form.</li>
            <li>
              Your PDF is stored privately and is never published. See the{" "}
              <Link href="/privacy#home-clarity">privacy policy</Link>.
            </li>
          </ul>
        </div>
        <UploadForm />
      </section>
    </>
  );
}
