import type { Metadata } from "next";
import { UpdatesList } from "./UpdatesList";

export const metadata: Metadata = {
  title: "Latest Updates | Brenda Vega Realty",
  description: "Just listed, just sold, open houses, and market notes from Brenda Vega — live from the South Bay.",
};

export default function UpdatesPage() {
  return (
    <div className="py-16 px-6 min-h-[60vh]">
      <div className="max-w-[800px] mx-auto">
        <span className="font-body font-medium text-[0.65rem] tracking-[0.4em] uppercase text-gold mb-4 block">
          Live Updates
        </span>
        <h1 className="font-display font-light text-[clamp(2.2rem,4vw,3.4rem)] text-navy mb-12 leading-tight">
          Latest from <em className="text-teal italic">Brenda</em>
        </h1>
        <UpdatesList />
      </div>
    </div>
  );
}
