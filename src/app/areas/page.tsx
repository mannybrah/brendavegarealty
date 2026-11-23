import type { Metadata } from "next";
import Link from "next/link";
import { AreaMap } from "@/components/areas/AreaMap";
import { CommunityTiles } from "@/components/home/AreasPreview";
import { FinalCTA } from "@/components/home/FinalCTA";
import { communityGroups, communityCount } from "@/data/communities";

// The description names only the four communities that have a real guide page.
export const metadata: Metadata = {
  title: "Communities",
  description:
    "Communities Brenda Vega serves across Silicon Valley and beyond, with guides to Campbell, San Jose, Los Gatos, and Saratoga.",
};

export default function AreasPage() {
  return (
    <>
      <section className="ed ed-section ed-directory-intro">
        <p className="ed-kicker">Your next chapter starts with a place</p>
        <h1>
          Silicon Valley <em>&amp; beyond.</em>
        </h1>
        <p>
          Explore {communityCount} cities and neighborhoods across the Bay Area and Monterey Bay. Start with a
          community guide, or ask Brenda about a place you&rsquo;re considering.
        </p>

        <h2 className="ed-kicker" style={{ fontFamily: "inherit", margin: "55px 0 20px", letterSpacing: "2.5px" }}>
          Community guides
        </h2>
        <CommunityTiles />
        <div className="mt-12 empty:hidden">
          <AreaMap />
        </div>
      </section>

      <section className="ed ed-section ed-communities" aria-labelledby="directory-heading">
        <div className="ed-section-head">
          <h2 id="directory-heading">
            All <em>communities.</em>
          </h2>
          <p>
            {communityCount} cities and neighborhoods
            <br />
            in {communityGroups.length} regions
          </p>
        </div>

        <div className="ed-directory-groups">
          {communityGroups.map((group) => (
            <section key={group.region} aria-label={group.region}>
              <h3>{group.region}</h3>
              <ul>
                {group.communities.map((c) => (
                  <li key={c.name}>
                    <Link href={c.guide ?? `/contact?area=${encodeURIComponent(c.name)}`}>
                      {c.name}
                      <span>
                        {c.guide ? "Read the guide" : "Ask Brenda"} <span aria-hidden="true">↗</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="ed-community-more">
          <div>
            <h3>Have another community in mind?</h3>
            <p>Tell Brenda where you&rsquo;re looking and what matters most to you.</p>
          </div>
          <Link className="ed-textlink" href="/contact">
            Get in touch &rarr;
          </Link>
        </div>

        <p className="ed-credits">
          Guide photography via Wikimedia Commons: Campbell water tower by Miles Gehm (CC BY 2.0) &middot; San Jose
          skyline by Ben Loomis (CC BY 2.0) &middot; Hotel Los Gatos by Ramkumar Menon (CC BY-SA 4.0) &middot;
          Hakone Gardens by Daderot (public domain).
        </p>
      </section>
      <FinalCTA />
    </>
  );
}
