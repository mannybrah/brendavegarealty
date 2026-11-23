import Link from "next/link";
import { siteConfig } from "@/data/site";

export function FinalCTA() {
  return (
    <section className="ed ed-closing">
      <p className="ed-kicker">Buying. Selling. Finding your next beginning.</p>
      <h2>
        Let&rsquo;s make your next move
        <br />
        <em>mean something.</em>
      </h2>
      <Link className="ed-button ed-button-ink" href="/contact#schedule">
        Start a conversation <span aria-hidden="true">↗</span>
      </Link>
      <a className="ed-textlink ed-closing-call" href={`tel:${siteConfig.agent.phoneRaw}`}>
        Or call {siteConfig.agent.phone}
      </a>
    </section>
  );
}
