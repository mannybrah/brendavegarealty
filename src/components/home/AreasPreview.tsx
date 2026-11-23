import Link from "next/link";
import Image from "next/image";
import { communityCount } from "@/data/communities";

/*
 * Area card photography (public/images/areas/) — licenses:
 *  campbell.jpg  — "Campbell CA - water tower at night" by Miles Gehm, CC BY 2.0 (Wikimedia Commons)
 *  san-jose.jpg  — "San Jose CA skyline at night 2014" by Ben Loomis, CC BY 2.0 (Wikimedia Commons)
 *  los-gatos.jpg — "Hotel Los Gatos" by Ramkumar Menon, CC BY-SA 4.0 (Wikimedia Commons)
 *  saratoga.jpg  — "Hakone Gardens, Saratoga" by Daderot, Public domain (Wikimedia Commons)
 * Visible attribution lives on the /areas page footer.
 */
const previewAreas = [
  { name: "Campbell", slug: "campbell" },
  { name: "San Jose", slug: "san-jose" },
  { name: "Los Gatos", slug: "los-gatos" },
  { name: "Saratoga", slug: "saratoga" },
];

export function CommunityTiles() {
  return (
    <div className="ed-community-grid">
      {previewAreas.map((area) => (
        <Link key={area.slug} href={`/areas/${area.slug}`} className="ed-community-tile">
          <Image
            src={`/images/areas/${area.slug}.jpg`}
            alt={`${area.name}, California`}
            fill
            loading="lazy"
            sizes="(max-width: 900px) 50vw, 25vw"
          />
          <div>
            <h3>{area.name}</h3>
            <span>
              Explore community <span aria-hidden="true">↗</span>
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function AreasPreview() {
  return (
    <section className="ed ed-section ed-communities" id="communities" aria-labelledby="communities-heading">
      <div className="ed-section-head">
        <div>
          <p className="ed-kicker">Find your place</p>
          <h2 id="communities-heading">
            Silicon Valley
            <br />
            <em>&amp; beyond.</em>
          </h2>
        </div>
        <p>
          A collection of communities.
          <br />
          A place that feels like you.
        </p>
      </div>

      <CommunityTiles />

      <div className="ed-community-more">
        <div>
          <h3>Your search doesn&rsquo;t stop here.</h3>
          <p>
            From San Francisco and the East Bay to Silicon Valley, Gilroy, Monterey, and Carmel&mdash;explore{" "}
            {communityCount} cities and neighborhoods.
          </p>
        </div>
        <Link className="ed-textlink" href="/areas">
          View all communities &rarr;
        </Link>
      </div>
    </section>
  );
}
