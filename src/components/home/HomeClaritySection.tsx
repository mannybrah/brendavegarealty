import Image from "next/image";
import Link from "next/link";
import { SampleReport } from "@/components/home-clarity/SampleReport";

// The branded header row shared by the home page section and the /home-clarity page.
export function ClarityBrandRow() {
  return (
    <div className="ed-clarity-top">
      <div className="ed-clarity-brand">
        <small>BRENDA VEGA&rsquo;S</small>
        Home Clarity
      </div>
      <p className="ed-kicker">
        A more informed
        <br />
        way to come home.
      </p>
    </div>
  );
}

// Brenda's personal follow-up, shown directly under the sample report: the report is
// the AI first look, this is the person who walks you through it.
export function PersonalReview({ href }: { href: string }) {
  return (
    <aside className="ed-personal-review">
      <Image src="/images/home/brenda-portrait.jpg" alt="Brenda Vega" width={1400} height={933} loading="lazy" sizes="78px" />
      <div>
        <p className="ed-kicker">Your questions. A personal conversation.</p>
        <h3>
          Your report is just
          <br />
          the beginning.
        </h3>
        <p>
          Brenda will personally reach out to go over the findings, answer your questions, and help you identify
          where a specialist&rsquo;s input may be useful.
        </p>
        <Link className="ed-textlink" href={href}>
          Start your free disclosure review <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </aside>
  );
}

export const CLARITY_STEPS = ["Upload your disclosures", "Get your AI first look", "Brenda personally follows up"];

export function HomeClaritySection() {
  return (
    <section className="ed ed-clarity" id="clarity" aria-labelledby="home-clarity-heading">
      <ClarityBrandRow />
      <div className="ed-clarity-layout">
        <div>
          <h2 id="home-clarity-heading" className="ed-clarity-title">
            Before you
            <br />
            make an offer,
            <br />
            <em>
              get a clearer
              <br />
              picture.
            </em>
          </h2>
          <p className="ed-clarity-copy">
            Upload the disclosures for a home you&rsquo;re considering. Our custom AI system will analyze the
            documents and organize key findings, potential concerns, and questions worth asking.
            <strong>
              Brenda will personally reach out to walk you through the findings and discuss your next steps.
            </strong>
          </p>
          <ol className="ed-steps">
            {CLARITY_STEPS.map((step, i) => (
              <li key={step}>
                <span>0{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
          <Link className="ed-button" href="/home-clarity#upload">
            Upload your disclosures <span aria-hidden="true">↗</span>
          </Link>
          <p className="ed-clarity-free">Complimentary analysis. Personal follow-up. No obligation.</p>
        </div>

        <div>
          <SampleReport />
          <PersonalReview href="/home-clarity#upload" />
        </div>
      </div>
      <p className="ed-clarity-note">
        The AI first look is separate from Brenda&rsquo;s personal follow-up. AI-assisted summaries support your
        review of the original documents and professional advice; they do not replace either.
      </p>
    </section>
  );
}
