"use client";

import { useStages } from "@/components/studio/crm/StagesContext";
import { paletteFor } from "@/components/studio/crm/stageColors";
import { Sheet, Spinner } from "@/components/studio/crm/ui";

export function StagePickerSheet({
  open,
  current,
  onClose,
  onSelect,
}: {
  open: boolean;
  current: string;
  onClose: () => void;
  onSelect: (stageId: string) => void;
}) {
  const { stages, loading } = useStages();
  return (
    <Sheet open={open} onClose={onClose} title="Change stage">
      {loading && stages.length === 0 && (
        <div className="py-4 flex justify-center">
          <Spinner />
        </div>
      )}
      <div className="rounded-xl border border-navy/10 bg-white divide-y divide-navy/5 overflow-hidden">
        {stages.map((s) => {
          const c = paletteFor(s.color);
          const active = s.id === current;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onSelect(s.id);
                onClose();
              }}
              aria-pressed={active}
              className={`w-full flex items-center gap-3 text-left px-4 min-h-12 py-2.5 font-body text-sm hover:bg-cream ${
                active ? "bg-cream" : ""
              }`}
            >
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.accent }} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-navy truncate">{s.name}</span>
                {s.description && <span className="block font-light text-xs text-charcoal-light truncate">{s.description}</span>}
              </span>
              {active && (
                <span className="text-navy shrink-0" aria-label="Current stage">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
