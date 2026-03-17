import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export function FinalCTA() {
  return (
    <section className="py-20 px-6 bg-cream">
      <AnimateOnScroll>
        <div className="max-w-[600px] mx-auto text-center">
          <h2 className="font-display font-light text-[clamp(2rem,4vw,3rem)] text-navy mb-4 leading-tight">
            Ready to make
            <br />
            your <em className="text-teal">move</em>?
          </h2>
          <p className="font-body font-light text-charcoal-light mb-8">
            Whether you&apos;re buying, selling, or just exploring your options
            — let&apos;s talk.
          </p>
          <Link href="/contact#schedule">
            <Button variant="primary">Schedule a Free Consultation</Button>
          </Link>
        </div>
      </AnimateOnScroll>
    </section>
  );
}
