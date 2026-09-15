"use client";

// Filters panel for the People list. Edits a local draft; Apply hands the
// whole filter object back to the page, which writes it to the URL.

import { useState } from "react";
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

// Mounting only while open gives the draft a fresh copy of the live filters
// every time the sheet is opened, with no reset effect.
export function FiltersSheet(props: FiltersSheetProps) {
  if (!props.open) return null;
  return <OpenFiltersSheet {...props} />;
}

function OpenFiltersSheet({ onClose, filters, allTags, sources, onApply }: FiltersSheetProps) {
  const { stages } = useStages();
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

  return (
    <Sheet
      open
      onClose={onClose}
      title="Filters"
      footer={
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
      }
    >
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
    </Sheet>
  );
}
