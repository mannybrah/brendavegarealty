"use client";

// Filters panel for the People list. Edits a local draft; Apply hands the
// whole filter object back to the page, which writes it to the URL.

import { useEffect, useRef, useState } from "react";
import type { ContactFilters, DayRule } from "@/lib/crm/filters";
import { CONTACT_TYPES, CONTACT_TYPE_LABELS } from "@/lib/crm/types";
import { useStages } from "../StagesContext";
import { paletteFor } from "../stageColors";
import { TagPicker, type TagOption } from "../TagPicker";
import { Btn, Sheet, labelCls, selectCls } from "../ui";

interface RuleOption {
  label: string;
  value: DayRule | null;
}

const LAST_COMM_OPTIONS: RuleOption[] = [
  { label: "Any", value: null },
  { label: "Never", value: { op: "never", days: 0 } },
  { label: "Over 3 days", value: { op: "over", days: 3 } },
  { label: "Over 7 days", value: { op: "over", days: 7 } },
  { label: "Over 14 days", value: { op: "over", days: 14 } },
  { label: "Over 30 days", value: { op: "over", days: 30 } },
  { label: "Over 90 days", value: { op: "over", days: 90 } },
];

const CREATED_OPTIONS: RuleOption[] = [
  { label: "Any", value: null },
  { label: "Last 7 days", value: { op: "within", days: 7 } },
  { label: "Last 30 days", value: { op: "within", days: 30 } },
  { label: "Last 90 days", value: { op: "within", days: 90 } },
];

function sameRule(a: DayRule | null, b: DayRule | null): boolean {
  if (!a || !b) return a === b;
  return a.op === b.op && a.days === b.days;
}

function RuleRadios({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: RuleOption[];
  value: DayRule | null;
  onChange: (v: DayRule | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = sameRule(o.value, value);
        return (
          <label
            key={o.label}
            className={`cursor-pointer font-ui text-[0.7rem] tracking-wider uppercase px-3 py-1.5 rounded-full border transition-colors ${
              on ? "bg-navy text-cream border-navy" : "bg-white text-navy border-navy/20 hover:border-navy/40"
            }`}
          >
            <input
              type="radio"
              name={name}
              className="sr-only"
              checked={on}
              onChange={() => onChange(o.value)}
            />
            {o.label}
          </label>
        );
      })}
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className={labelCls}>{label}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

interface FiltersSheetProps {
  open: boolean;
  onClose: () => void;
  filters: ContactFilters;
  allTags: TagOption[];
  sources: { source: string; n: number }[];
  onApply: (next: ContactFilters) => void;
}

// Spec §6.3: bottom sheet on phones, popover anchored to the Filters button on
// desktop. The page wraps the button and this component in a relatively
// positioned [data-filters-anchor] element.
function useIsDesktop(): boolean {
  // Seeded synchronously: this component only ever mounts on a click, never
  // during the static prerender, so there is no hydration mismatch to worry
  // about and no one-frame flash of the mobile sheet on desktop.
  const [match, setMatch] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setMatch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return match;
}

function Popover({
  onClose,
  children,
  footer,
}: {
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      const el = ref.current;
      if (!el) return;
      // The anchor wraps the trigger button too, so clicking the button
      // toggles the popover instead of closing and reopening it.
      const bounds = el.closest("[data-filters-anchor]") ?? el;
      if (!bounds.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Filters"
      className="absolute z-50 top-full right-0 mt-2 w-[26rem] max-w-[calc(100vw-3rem)] flex flex-col max-h-[70vh] bg-cream border border-navy/10 rounded-2xl shadow-[0_12px_32px_rgba(15,29,53,0.18)]"
    >
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-navy/10 shrink-0">
        <div className="font-display font-medium text-lg text-navy">Filters</div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="w-8 h-8 rounded-full flex items-center justify-center text-charcoal-light hover:bg-navy/5 text-xl leading-none"
        >
          ×
        </button>
      </div>
      <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">{children}</div>
      <div className="px-5 py-3 border-t border-navy/10 shrink-0">{footer}</div>
    </div>
  );
}

// Mounting only while open gives the draft a fresh copy of the live filters
// every time the panel is opened, with no reset effect.
export function FiltersSheet(props: FiltersSheetProps) {
  if (!props.open) return null;
  return <OpenFiltersSheet {...props} />;
}

function OpenFiltersSheet({ onClose, filters, allTags, sources, onApply }: FiltersSheetProps) {
  const { stages } = useStages();
  const isDesktop = useIsDesktop();
  const [draft, setDraft] = useState<ContactFilters>(filters);

  function toggleStage(id: string) {
    setDraft((d) => ({
      ...d,
      stages: d.stages.includes(id) ? d.stages.filter((s) => s !== id) : [...d.stages, id],
    }));
  }

  function clearAll() {
    setDraft((d) => ({
      ...d,
      stages: [],
      tagsAny: [],
      tagsNone: [],
      source: null,
      type: null,
      lastComm: null,
      created: null,
    }));
  }

  const footer = (
    <div className="flex items-center justify-between gap-3">
      <Btn variant="ghost" onClick={clearAll}>
        Clear all
      </Btn>
      <Btn
        variant="primary"
        onClick={() => {
          onApply(draft);
          onClose();
        }}
      >
        Apply
      </Btn>
    </div>
  );

  const body = (
    <>
      <Group label="Stages">
        <div className="flex flex-wrap gap-1.5">
          {stages.map((s) => {
            const on = draft.stages.includes(s.id);
            const solid = paletteFor(s.color).solid;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleStage(s.id)}
                aria-pressed={on}
                style={on ? { backgroundColor: solid.bg, borderColor: solid.bg, color: solid.text } : undefined}
                className={`font-ui text-[0.7rem] tracking-wider uppercase px-3 py-1.5 rounded-full border transition-colors ${
                  on ? "" : "bg-white text-navy border-navy/20 hover:border-navy/40"
                }`}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      </Group>

      <Group label="Tags · include any">
        <TagPicker
          selected={draft.tagsAny}
          onChange={(next) => setDraft((d) => ({ ...d, tagsAny: next }))}
          mode="ids"
          allTags={allTags}
          placeholder="Search tags…"
        />
      </Group>

      <Group label="Tags · exclude">
        <TagPicker
          selected={draft.tagsNone}
          onChange={(next) => setDraft((d) => ({ ...d, tagsNone: next }))}
          mode="ids"
          allTags={allTags}
          placeholder="Search tags…"
        />
      </Group>

      <Group label="Source">
        <select
          value={draft.source ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, source: e.target.value || null }))}
          className={selectCls}
          aria-label="Source"
        >
          <option value="">Any source</option>
          {sources.map((s) => (
            <option key={s.source} value={s.source}>
              {s.source} ({s.n})
            </option>
          ))}
        </select>
      </Group>

      <Group label="Type">
        <select
          value={draft.type ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value || null }))}
          className={selectCls}
          aria-label="Type"
        >
          <option value="">Any type</option>
          {CONTACT_TYPES.map((t) => (
            <option key={t} value={t}>
              {CONTACT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </Group>

      <Group label="Last communication">
        <RuleRadios
          name="crm-last-comm"
          options={LAST_COMM_OPTIONS}
          value={draft.lastComm}
          onChange={(v) => setDraft((d) => ({ ...d, lastComm: v }))}
        />
      </Group>

      <Group label="Created">
        <RuleRadios
          name="crm-created"
          options={CREATED_OPTIONS}
          value={draft.created}
          onChange={(v) => setDraft((d) => ({ ...d, created: v }))}
        />
      </Group>
    </>
  );

  if (isDesktop) {
    return (
      <Popover onClose={onClose} footer={footer}>
        {body}
      </Popover>
    );
  }

  return (
    <Sheet open onClose={onClose} title="Filters" footer={footer}>
      {body}
    </Sheet>
  );
}
