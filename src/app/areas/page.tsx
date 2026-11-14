import type { Metadata } from "next";
import Link from "next/link";
import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";
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
      <section className="bg-warm-white px-6 desktop:px-10 pt-16 desktop:pt-24 pb-16 desktop:pb-20">
        <div className="max-w-[1280px] mx-auto">
          <AnimateOnScroll>
            <p className="font-body font-medium text-[0.68rem] tracking-[0.38em] uppercase text-gold mb-6">
              Communities
            </p>
            <h1 className="font-display font-light text-navy leading-[1.03] text-[clamp(2.6rem,6vw,5rem)] max-w-[14ch]">
              Silicon Valley <em className="text-teal">&amp; beyond.</em>
            </h1>
            <p className="font-body font-light text-lg leading-relaxed text-charcoal-light mt-7 max-w-[56ch]">
              Start with a community guide, or find your city or neighborhood in the directory below and ask Brenda
              about it directly.
            </p>
          </AnimateOnScroll>

          <h2 className="font-body font-medium text-[0.68rem] tracking-[0.38em] uppercase text-charcoal-light mt-16 mb-6">
            Community guides
          </h2>
          <CommunityTiles />
          <div className="mt-12 empty:hidden">
            <AreaMap />
          </div>
        </div>
      </section>

      <section className="bg-cream px-6 desktop:px-10 py-16 desktop:py-24" aria-labelledby="directory-heading">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex flex-col desktop:flex-row desktop:items-end desktop:justify-between gap-4 mb-12">
            <h2
              id="directory-heading"
              className="font-display font-light text-navy leading-[1.05] text-[clamp(2rem,4vw,3.2rem)]"
            >
              All communities
            </h2>
            <p className="font-body font-light text-sm text-charcoal-light">
              {communityCount} cities and neighborhoods in {communityGroups.length} regions
            </p>
          </div>

          <div className="grid gap-x-12 gap-y-12 tablet:grid-cols-2 desktop:grid-cols-3">
            {communityGroups.map((group) => (
              <section key={group.region} aria-label={group.region}>
                <h3 className="font-display font-normal text-[1.45rem] text-navy pb-3 border-b border-gold/50">
                  {group.region}
                </h3>
                <ul className="list-none p-0 m-0">
                  {group.communities.map((c) => (
                    <li key={c.name} className="border-b border-navy/10">
                      <Link
                        href={c.guide ?? `/contact?area=${encodeURIComponent(c.name)}`}
                        className="group flex items-center justify-between gap-4 min-h-[48px] py-2"
                      >
                        <span className="font-body text-base text-charcoal group-hover:text-teal transition-colors">
                          {c.name}
                        </span>
                        <span
                          className={`shrink-0 font-ui font-medium text-[0.64rem] tracking-[0.14em] uppercase ${
                            c.guide ? "text-teal" : "text-charcoal-light group-hover:text-teal"
                          } transition-colors`}
                        >
                          {c.guide ? "View guide" : "Ask Brenda"} &rarr;
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <p className="mt-14 font-body font-light text-sm text-charcoal-light max-w-[70ch]">
            Don&rsquo;t see your community? Brenda is happy to talk about where you&rsquo;re looking.{" "}
            <Link href="/contact" className="text-navy underline underline-offset-4 hover:text-teal">
              Get in touch
            </Link>
            .
          </p>
          <p className="mt-10 font-body font-light text-[0.68rem] text-charcoal-light/70">
            Guide photography via Wikimedia Commons: Campbell water tower by Miles Gehm (CC BY 2.0) &middot; San Jose
            skyline by Ben Loomis (CC BY 2.0) &middot; Hotel Los Gatos by Ramkumar Menon (CC BY-SA 4.0) &middot;
            Hakone Gardens by Daderot (public domain).
          </p>
        </div>
      </section>
      <FinalCTA />
    </>
  );
}
