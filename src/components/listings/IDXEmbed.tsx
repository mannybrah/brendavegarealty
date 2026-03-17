"use client";

import { useEffect, useRef } from "react";

export function IDXEmbed() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const accountId = process.env.NEXT_PUBLIC_IDX_ACCOUNT_ID;
    if (!accountId || !containerRef.current) return;
  }, []);

  return (
    <div ref={containerRef} className="min-h-[600px]">
      {!process.env.NEXT_PUBLIC_IDX_ACCOUNT_ID && (
        <div className="flex items-center justify-center h-[600px] bg-cream rounded-2xl border-2 border-dashed border-navy/10">
          <div className="text-center p-8">
            <div className="font-display font-light text-2xl text-navy mb-2">Property Search Coming Soon</div>
            <p className="font-body font-light text-charcoal-light mb-6 max-w-md">
              MLS listings integration is being configured. In the meantime, contact Brenda directly for available properties.
            </p>
            <a href="/contact" className="font-ui font-medium text-sm tracking-wider uppercase text-teal hover:text-teal-light transition-colors">
              Contact Brenda &rarr;
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
