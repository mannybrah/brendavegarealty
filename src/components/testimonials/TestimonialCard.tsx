import { Testimonial } from "@/types";

export function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex gap-1 mb-4">
        {Array.from({ length: testimonial.rating }).map((_, i) => (
          <svg key={i} className="w-4 h-4 text-gold" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <p className="font-body font-light text-base leading-relaxed text-charcoal mb-6">
        &ldquo;{testimonial.quote}&rdquo;
      </p>
      <div className="flex items-center justify-between">
        <div>
          <div className="font-body font-medium text-sm text-navy">{testimonial.name}</div>
          <div className="font-body font-light text-xs text-charcoal-light">{testimonial.location}</div>
        </div>
        <span className="font-ui font-medium text-[0.6rem] tracking-wider uppercase text-gold/70 border border-gold/30 rounded-full px-3 py-1">
          {testimonial.type}
        </span>
      </div>
    </div>
  );
}
