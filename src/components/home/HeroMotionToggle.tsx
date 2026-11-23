"use client";

import { useState } from "react";

// Stops (or replays) the hero photograph's single settle. Hidden by CSS when the
// visitor prefers reduced motion, because nothing moves in that case.
export function HeroMotionToggle() {
  const [still, setStill] = useState(false);

  return (
    <button
      type="button"
      className="ed-motion"
      aria-pressed={still}
      onClick={(e) => {
        const next = !still;
        e.currentTarget.closest(".ed-hero")?.classList.toggle("ed-still", next);
        setStill(next);
      }}
    >
      {still ? "Replay motion" : "Pause motion"}
    </button>
  );
}
