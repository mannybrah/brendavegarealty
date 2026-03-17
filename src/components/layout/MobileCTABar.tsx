"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { siteConfig } from "@/data/site";

export function MobileCTABar() {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsVisible(currentScrollY < lastScrollY.current || currentScrollY < 100);
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 grid grid-cols-2 gap-[1px] bg-black/10 desktop:hidden transition-transform duration-300 ${
        isVisible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <a
        href={`tel:${siteConfig.agent.phoneRaw}`}
        className="bg-navy py-4 text-center"
      >
        <span className="font-ui font-medium text-[0.6rem] tracking-[0.1em] uppercase text-cream">
          Call Brenda
        </span>
      </a>
      <Link href="/contact#schedule" className="bg-gold py-4 text-center">
        <span className="font-ui font-medium text-[0.6rem] tracking-[0.1em] uppercase text-navy">
          Book Now
        </span>
      </Link>
    </div>
  );
}
