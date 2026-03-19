"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { siteConfig } from "@/data/site";
import { LeadCaptureModal } from "@/components/ui/LeadCaptureModal";

const LOCAL_STORAGE_KEY = "brv_lead_captured";

export function MobileCTABar() {
  const [visible, setVisible] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      setVisible(current <= lastScrollY.current || current < 100);
      lastScrollY.current = current;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleCallTap = () => {
    if (typeof window !== "undefined" && localStorage.getItem(LOCAL_STORAGE_KEY)) {
      window.location.href = `tel:${siteConfig.agent.phoneRaw}`;
      return;
    }
    setShowModal(true);
  };

  const handleModalComplete = () => {
    setShowModal(false);
    window.location.href = `tel:${siteConfig.agent.phoneRaw}`;
  };

  return (
    <>
      {showModal && (
        <LeadCaptureModal source="phone-call" onComplete={handleModalComplete} />
      )}

      <div
        className={`fixed bottom-0 left-0 right-0 z-50 desktop:hidden grid grid-cols-2 gap-[1px] bg-black transition-transform duration-300 ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <button
          onClick={handleCallTap}
          className="bg-navy text-cream font-ui font-medium text-[0.78rem] tracking-wider uppercase py-4 text-center min-h-[60px] transition-colors hover:bg-navy-mid"
        >
          Call Brenda
        </button>
        <Link
          href="/contact#schedule"
          className="bg-gold text-navy font-ui font-medium text-[0.78rem] tracking-wider uppercase py-4 text-center min-h-[60px] flex items-center justify-center transition-colors hover:bg-gold-light"
        >
          Book Now
        </Link>
      </div>
    </>
  );
}
