import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";
import Link from "next/link";

interface TestimonialHighlightProps {
  quote: string;
  author: string;
  location: string;
}

export function TestimonialHighlight({ quote, author, location }: TestimonialHighlightProps) {
  return (
    <AnimateOnScroll>
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="bg-navy rounded-2xl p-10 desktop:p-16 relative overflow-hidden">
          <span className="absolute top-4 left-10 font-display text-[10rem] text-gold/10 leading-none select-none">
            &ldquo;
          </span>
          <blockquote className="relative z-10">
            <p className="font-display font-light italic text-[clamp(1.2rem,2vw,1.5rem)] leading-relaxed text-cream max-w-[700px] mx-auto text-center mb-6">
              {quote}
            </p>
            <footer className="text-center">
              <cite className="font-body font-normal text-[0.8rem] tracking-[0.15em] uppercase text-gold not-italic">
                {author} — {location}
              </cite>
            </footer>
          </blockquote>
          <div className="text-center mt-8">
            <Link href="/testimonials" className="font-ui font-medium text-xs tracking-wider uppercase text-cream/60 hover:text-gold transition-colors">
              Read More Reviews &rarr;
            </Link>
          </div>
        </div>
      </div>
    </AnimateOnScroll>
  );
}
