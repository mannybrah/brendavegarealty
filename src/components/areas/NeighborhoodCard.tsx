import Link from "next/link";
import { NeighborhoodArea } from "@/types";

export function NeighborhoodCard({ area }: { area: NeighborhoodArea }) {
  return (
    <Link href={`/areas/${area.slug}`} className="group block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
      <div className="h-48 bg-gradient-to-br from-navy to-navy-light relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(200,165,91,0.1),transparent_70%)]" />
        <span className="absolute bottom-4 left-4 font-display font-light text-2xl text-cream">{area.name}</span>
      </div>
      <div className="p-6">
        <p className="font-body font-light text-sm text-charcoal-light leading-relaxed mb-4 line-clamp-3">{area.description}</p>
        <div className="flex items-center justify-between">
          <span className="font-ui font-medium text-xs tracking-wider text-gold">Median: {area.medianPrice}</span>
          <span className="font-ui font-medium text-xs tracking-wider uppercase text-teal group-hover:translate-x-1 transition-transform">Explore &rarr;</span>
        </div>
      </div>
    </Link>
  );
}
