import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";
import { SectionLabel } from "@/components/ui/SectionLabel";
import Link from "next/link";
import Image from "next/image";

export function UpcomingEvent() {
  return (
    <section className="py-20 px-6 bg-navy">
      <div className="max-w-[1200px] mx-auto">
        <AnimateOnScroll>
          <SectionLabel>Upcoming Event</SectionLabel>
          <h2 className="font-display font-light text-[clamp(2rem,4vw,3.2rem)] text-cream mt-4 mb-12 leading-tight">
            Join us this <span className="text-gold italic">weekend</span>
          </h2>
        </AnimateOnScroll>

        <AnimateOnScroll>
          <div className="grid desktop:grid-cols-2 gap-10 items-center">
            {/* Flyer Image */}
            <Link
              href="/blog/free-easter-egg-hunt-2026"
              className="block group"
            >
              <div className="rounded-xl overflow-hidden shadow-2xl group-hover:shadow-gold/20 transition-shadow duration-300">
                <Image
                  src="/images/blog/easter-egg-hunt-flyer.jpg"
                  alt="Free Easter Egg Hunt — March 28 and 29, 2026. Food, games, prizes, and fun for all ages."
                  width={600}
                  height={776}
                  className="w-full h-auto group-hover:scale-[1.02] transition-transform duration-500"
                />
              </div>
            </Link>

            {/* Event Details */}
            <div>
              <h3 className="font-display font-light text-[clamp(1.5rem,3vw,2.2rem)] text-cream mb-6 leading-tight">
                Free Easter Egg Hunt
                <br />
                <span className="text-gold">+ Food &amp; Prizes</span>
              </h3>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <span className="text-gold text-xl mt-0.5">&#128197;</span>
                  <div>
                    <p className="font-body font-medium text-cream">
                      March 28 — Albert Augustine Jr. Memorial Park, Dixon
                    </p>
                    <p className="font-body font-medium text-cream">
                      March 29 — John D. Morgan Park
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-gold text-xl mt-0.5">&#128336;</span>
                  <div>
                    <p className="font-body text-cream/80">
                      11:00 AM – 1:00 PM
                    </p>
                    <p className="font-body text-cream/60 text-sm">
                      Food &amp; games 11–12 &bull; Egg hunt starts at 12
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-gold text-xl mt-0.5">&#127873;</span>
                  <p className="font-body text-cream/80">
                    Food, drinks, games for all ages, free prizes &amp;
                    giveaways
                  </p>
                </div>
              </div>

              <div className="flex flex-col tablet:flex-row gap-4">
                <a
                  href="https://forms.gle/PXYpSu47XWyq5Jy7A"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-ui font-medium text-[0.78rem] tracking-wider uppercase px-9 py-4 rounded-md cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] hover:-translate-y-[3px] min-h-[48px] bg-gold text-navy hover:bg-gold-light hover:shadow-lg hover:shadow-gold/30 text-center inline-block"
                >
                  RSVP Now
                </a>
                <Link
                  href="/blog/free-easter-egg-hunt-2026"
                  className="font-ui font-medium text-[0.78rem] tracking-wider uppercase px-9 py-4 rounded-md cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] hover:-translate-y-[3px] min-h-[48px] bg-transparent text-cream border-[1.5px] border-cream/30 hover:bg-cream/10 hover:border-cream/60 text-center inline-block"
                >
                  Event Details
                </Link>
              </div>
            </div>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
