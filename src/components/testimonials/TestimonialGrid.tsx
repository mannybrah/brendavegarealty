"use client";

import { useState } from "react";
import { Testimonial } from "@/types";
import { TestimonialCard } from "./TestimonialCard";
import { AnimateOnScroll } from "@/components/ui/AnimateOnScroll";

type FilterType = "all" | "buyer" | "seller";

export function TestimonialGrid({ testimonials }: { testimonials: Testimonial[] }) {
  const [filter, setFilter] = useState<FilterType>("all");
  const filtered = filter === "all" ? testimonials : testimonials.filter((t) => t.type === filter);

  return (
    <div>
      <div className="flex gap-3 mb-10 justify-center">
        {(["all", "buyer", "seller"] as FilterType[]).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`font-ui font-medium text-xs tracking-wider uppercase px-5 py-2.5 rounded-full transition-all min-h-[44px] ${
              filter === type
                ? "bg-navy text-cream"
                : "bg-transparent text-charcoal-light border border-charcoal-light/20 hover:border-navy hover:text-navy"
            }`}
          >
            {type === "all" ? "All Reviews" : `${type}s`}
          </button>
        ))}
      </div>
      <div className="grid desktop:grid-cols-2 gap-6">
        {filtered.map((testimonial, i) => (
          <AnimateOnScroll key={testimonial.id} delay={i * 0.1}>
            <TestimonialCard testimonial={testimonial} />
          </AnimateOnScroll>
        ))}
      </div>
    </div>
  );
}
