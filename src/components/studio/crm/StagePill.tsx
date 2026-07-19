import { STAGE_LABELS, Stage } from "@/lib/crm/normalize";
import { STAGE_COLORS } from "./stageColors";

export function StagePill({ stage }: { stage: string }) {
  const known = (stage as Stage) in STAGE_COLORS;
  const style = known
    ? `${STAGE_COLORS[stage as Stage].bg} ${STAGE_COLORS[stage as Stage].text} border ${STAGE_COLORS[stage as Stage].border}`
    : "bg-navy/10 text-charcoal-light border border-navy/10";
  const label = known ? STAGE_LABELS[stage as Stage] : stage;
  return (
    <span className={`font-ui text-[0.6rem] tracking-wider uppercase px-2.5 py-1 rounded-full shrink-0 ${style}`}>
      {label}
    </span>
  );
}
