"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";
import { parseStatValue } from "@/lib/countUpParse";

export function CountUp({ value, duration = 1.4 }: { value: string; duration?: number }) {
  const { prefix, num, suffix, decimals } = parseStatValue(value);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing final value once element scrolls into view (external observer signal), not derivable during render
      setDisplay(num);
      return;
    }
    const controls = animate(0, num, {
      duration,
      ease: [0.2, 0, 0, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [inView, num, reduced, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {display.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}
