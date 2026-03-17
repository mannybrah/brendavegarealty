import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";
import { siteConfig } from "@/data/site";

const credentials = [
  { label: "Brokerage", value: siteConfig.agent.brokerage },
  { label: "DRE License", value: `#${siteConfig.agent.dre}` },
  { label: "Experience", value: `${siteConfig.agent.experience} Years` },
  { label: "Primary Area", value: "Campbell, CA" },
];

export function Credentials() {
  return (
    <section className="py-16 px-6 bg-cream">
      <div className="max-w-[1200px] mx-auto">
        <AnimateOnScroll>
          <h2 className="font-display font-light text-2xl text-navy mb-8 text-center">
            Credentials & Affiliations
          </h2>
        </AnimateOnScroll>
        <div className="grid grid-cols-2 desktop:grid-cols-4 gap-6">
          {credentials.map((cred, i) => (
            <AnimateOnScroll key={cred.label} delay={i * 0.1}>
              <div className="bg-white rounded-xl p-6 text-center">
                <div className="font-body font-medium text-xs tracking-[0.2em] uppercase text-gold mb-2">
                  {cred.label}
                </div>
                <div className="font-display font-normal text-lg text-navy">
                  {cred.value}
                </div>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
