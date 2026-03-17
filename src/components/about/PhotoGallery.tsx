import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";

export function PhotoGallery() {
  const placeholders = [
    "Community event",
    "Open house",
    "Happy clients",
    "Campbell downtown",
    "Property staging",
    "Award ceremony",
  ];

  return (
    <section className="py-16 px-6">
      <div className="max-w-[1200px] mx-auto">
        <AnimateOnScroll>
          <h2 className="font-display font-light text-2xl text-navy mb-8 text-center">
            In the Community
          </h2>
        </AnimateOnScroll>
        <div className="grid grid-cols-2 desktop:grid-cols-3 gap-4">
          {placeholders.map((label, i) => (
            <AnimateOnScroll key={label} delay={i * 0.08}>
              <div className="aspect-square rounded-xl bg-gradient-to-br from-navy/5 to-navy/10 flex items-center justify-center">
                <span className="font-body font-light text-sm text-charcoal-light/50">
                  {label}
                </span>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
