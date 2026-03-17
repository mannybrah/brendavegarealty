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
    <div className="fixed bottom-16 desktop:bottom-4 left-4 right-4 desktop:left-auto desktop:right-4 desktop:max-w-sm z-50 bg-white rounded-xl shadow-lg border border-navy/10 p-5">
      <p className="font-body font-light text-sm text-charcoal-light mb-4">
        We use cookies to improve your experience and analyze site traffic.
        See our{" "}
        <a href="/privacy" className="text-teal underline">Privacy Policy</a>.
      </p>
      <Button variant="primary" onClick={accept} className="text-xs py-2 px-6">
        Accept
      </Button>
    </div>
  );
}
