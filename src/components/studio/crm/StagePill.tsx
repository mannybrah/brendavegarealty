import { STAGE_LABELS, Stage } from "@/lib/crm/normalize";

const STAGE_STYLE: Record<Stage, string> = {
  new: "bg-gold/20 text-gold",
  contacted: "bg-navy/10 text-navy/70",
  active: "bg-teal/15 text-teal",
  under_contract: "bg-amber-100 text-amber-700",
  closed: "bg-emerald-100 text-emerald-700",
  sphere: "bg-stone-100 text-stone-600",
  archived: "bg-gray-100 text-gray-500",
};

export function StagePill({ stage }: { stage: string }) {
  const known = (stage as Stage) in STAGE_STYLE;
  const style = known ? STAGE_STYLE[stage as Stage] : "bg-navy/10 text-charcoal-light";
  const label = known ? STAGE_LABELS[stage as Stage] : stage;
  return (
    <span className={`font-ui text-[0.6rem] tracking-wider uppercase px-2.5 py-1 rounded-full shrink-0 ${style}`}>
      {label}
    </span>
  );
}
