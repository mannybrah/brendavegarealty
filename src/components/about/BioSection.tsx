import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";

const bioParas = [
  "Brenda Vega brings a fresh perspective to Bay Area real estate. In just four years, she has earned the trust of buyers and sellers across Campbell and the surrounding communities through her relentless work ethic, sharp attention to detail, and a genuine commitment to putting her clients first.",
  "Before entering real estate, Brenda developed a deep appreciation for what makes a house a home \u2014 not just the structure, but the neighborhood, the community, and the life it supports. That understanding drives every client relationship she builds today.",
  "As a Century 21 agent rooted in the heart of the Bay Area, Brenda combines modern marketing strategies with old-school dedication. She answers every call, shows up early, stays late, and treats every transaction \u2014 whether it\u2019s a first-time buyer or a seasoned investor \u2014 with the same level of care and professionalism.",
  "When she\u2019s not helping clients find their perfect home, you\u2019ll find Brenda exploring the neighborhoods she loves, staying ahead of market trends, and looking for new ways to deliver an exceptional experience.",
];

export function BioSection() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-[1200px] mx-auto grid desktop:grid-cols-2 gap-16 items-start">
        <AnimateOnScroll>
          <div className="relative h-[400px] desktop:h-[600px] rounded-2xl overflow-hidden bg-gradient-to-br from-navy to-navy-light sticky top-24">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(200,165,91,0.15),transparent_50%)]" />
            <div className="absolute inset-5 border border-gold/20 rounded-lg" />
            <span className="absolute bottom-8 left-8 font-body font-light text-sm text-gold/60">
              Professional photo of Brenda
            </span>
          </div>
        </AnimateOnScroll>
        <div>
          <AnimateOnScroll>
            <span className="font-body font-medium text-[0.65rem] tracking-[0.4em] uppercase text-gold mb-4 block">
              About Brenda
            </span>
            <h1 className="font-display font-light text-[clamp(2rem,4vw,3.2rem)] text-navy mb-8 leading-tight">
              Dedicated to your
              <br />
              <em className="text-teal">success</em>
            </h1>
          </AnimateOnScroll>
          <div className="space-y-6">
            {bioParas.map((para, i) => (
              <AnimateOnScroll key={i} delay={i * 0.1}>
                <p className="font-body font-light text-base leading-relaxed text-charcoal-light">
                  {para}
                </p>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
