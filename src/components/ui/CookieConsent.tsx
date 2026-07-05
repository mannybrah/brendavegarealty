"use client";

import { useState, useEffect } from "react";
import { Button } from "./Button";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) setShow(true);
  }, []);

  const accept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-[60px] desktop:bottom-0 left-0 right-0 z-40 bg-navy/95 backdrop-blur-sm border-t border-gold/25">
      <div className="max-w-[1200px] mx-auto px-6 py-3 flex items-center justify-center gap-5 flex-wrap">
        <p className="font-body font-light text-xs text-cream/75">
          We use cookies to improve your experience and analyze site traffic.{" "}
          <a href="/privacy" className="text-gold underline underline-offset-2">Privacy Policy</a>
        </p>
        <Button
          variant="gold"
          onClick={accept}
          className="px-5! py-1.5! min-h-0! text-[0.65rem]!"
        >
          Accept
        </Button>
      </div>
    </div>
  );
}
