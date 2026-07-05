"use client";

import { useEffect, useState } from "react";
import { useHomeState } from "@/lib/useHomeState";

const DISMISS_KEY = "bvr_announce_dismissed";

export function AnnouncementBar() {
  const { data } = useHomeState();
  const [dismissed, setDismissed] = useState(true); // hidden until we know
  const a = data?.announcement;

  useEffect(() => {
    if (!a?.active) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing dismissed flag from sessionStorage (external system), not derivable during render (no window at SSR time)
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === a.updatedAt);
  }, [a]);

  if (!a?.active || !a.text || dismissed) return null;

  const inner = (
    <span className="font-ui text-[0.7rem] tracking-[0.12em] uppercase text-cream">
      {a.text}
      {a.link && <span className="ml-2 text-gold underline underline-offset-2">Details &rarr;</span>}
    </span>
  );

  return (
    <div className="bg-navy border-b border-gold/25 relative">
      <div className="max-w-[1200px] mx-auto px-10 py-2 text-center">
        {a.link ? (
          <a href={a.link} target={a.link.startsWith("/") ? undefined : "_blank"} rel="noopener noreferrer">
            {inner}
          </a>
        ) : (
          inner
        )}
      </div>
      <button
        aria-label="Dismiss announcement"
        onClick={() => {
          sessionStorage.setItem(DISMISS_KEY, a.updatedAt);
          setDismissed(true);
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/60 hover:text-cream text-lg leading-none px-2"
      >
        &times;
      </button>
    </div>
  );
}
