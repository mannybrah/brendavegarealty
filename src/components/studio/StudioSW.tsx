"use client";

import { useEffect } from "react";

// Registers the studio service worker (push notifications + notification
// click routing). Guarded and silent — a failure here should never break
// the studio UI.
export function StudioSW() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.serviceWorker) return;
    navigator.serviceWorker.register("/studio-sw.js").catch(() => {
      // no-op — push just won't work on this browser/session
    });
  }, []);

  return null;
}
