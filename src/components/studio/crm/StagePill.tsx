"use client";

import { useStages } from "./StagesContext";
import { paletteFor } from "./stageColors";

export function StagePill({ stageId, size = "sm" }: { stageId: string; size?: "sm" | "md" }) {
  const { byId } = useStages();
  const s = byId[stageId];
  const c = paletteFor(s?.color ?? "gray");
  const pad = size === "md" ? "px-3 py-1.5 text-[0.7rem]" : "px-2.5 py-1 text-[0.6rem]";
  return (
    <span className={`font-ui tracking-wider uppercase rounded-full shrink-0 border whitespace-nowrap ${pad} ${c.bg} ${c.text} ${c.border}`}>
      {s?.name ?? "Unknown"}
    </span>
  );
}
