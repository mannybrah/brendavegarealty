"use client";

import { useMemo, useState } from "react";
import { TagBubble, inputCls } from "./ui";

export interface TagOption {
  id: string;
  name: string;
  count?: number;
}

// mode "names": `selected` holds tag NAMES and the user may create new ones.
// mode "ids":   `selected` holds tag IDS (filters); no creation.
export function TagPicker({
  selected,
  onChange,
  mode,
  allTags,
  placeholder = "Search or add a tag…",
  autoFocus = false,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  mode: "names" | "ids";
  allTags: TagOption[];
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim();
  const qLower = q.toLowerCase();

  const keyOf = (t: TagOption) => (mode === "names" ? t.name : t.id);
  const selectedSet = useMemo(() => new Set(selected.map((s) => (mode === "names" ? s.toLowerCase() : s))), [selected, mode]);
  const isSelected = (t: TagOption) => selectedSet.has(mode === "names" ? t.name.toLowerCase() : t.id);

  const visible = useMemo(() => {
    const list = qLower ? allTags.filter((t) => t.name.toLowerCase().includes(qLower)) : allTags;
    return [...list].sort((a, b) => {
      const sa = isSelected(a) ? 0 : 1;
      const sb = isSelected(b) ? 0 : 1;
      if (sa !== sb) return sa - sb;
      return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTags, qLower, selectedSet]);

  const exactExists = allTags.some((t) => t.name.toLowerCase() === qLower) || selectedSet.has(qLower);
  const canCreate = mode === "names" && q.length > 0 && q.length <= 64 && !exactExists;

  function toggle(t: TagOption) {
    const key = keyOf(t);
    if (isSelected(t)) {
      onChange(selected.filter((s) => (mode === "names" ? s.toLowerCase() !== t.name.toLowerCase() : s !== t.id)));
    } else {
      onChange([...selected, key]);
    }
  }

  function create() {
    if (!canCreate) return;
    onChange([...selected, q]);
    setQuery("");
  }

  function remove(key: string) {
    onChange(selected.filter((s) => s !== key));
  }

  // Names selected that don't exist yet in allTags (newly created) still show as bubbles.
  const selectedBubbles = selected.map((s) => {
    const t = mode === "names" ? allTags.find((x) => x.name.toLowerCase() === s.toLowerCase()) : allTags.find((x) => x.id === s);
    return { key: s, name: t?.name ?? s };
  });

  return (
    <div className="space-y-3">
      {selectedBubbles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedBubbles.map((b) => (
            <TagBubble key={b.key} name={b.name} onRemove={() => remove(b.key)} />
          ))}
        </div>
      )}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (canCreate) create();
            else if (visible.length === 1) toggle(visible[0]);
          }
        }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={inputCls}
        aria-label="Search tags"
      />
      <div className="max-h-56 overflow-y-auto rounded-xl border border-navy/10 bg-white divide-y divide-navy/5">
        {canCreate && (
          <button
            type="button"
            onClick={create}
            className="w-full text-left px-3 py-2.5 font-body text-sm text-teal hover:bg-cream"
          >
            + Create “{q}”
          </button>
        )}
        {visible.length === 0 && !canCreate && (
          <div className="px-3 py-2.5 font-body font-light text-sm text-charcoal-light">No tags yet.</div>
        )}
        {visible.map((t) => {
          const on = isSelected(t);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => toggle(t)}
              aria-pressed={on}
              className={`w-full flex items-center justify-between gap-3 text-left px-3 py-2.5 font-body text-sm hover:bg-cream ${
                on ? "text-navy" : "text-charcoal"
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] shrink-0 ${
                    on ? "bg-navy border-navy text-gold" : "border-navy/30 bg-white"
                  }`}
                  aria-hidden="true"
                >
                  {on ? "✓" : ""}
                </span>
                <span className="truncate">{t.name}</span>
              </span>
              {typeof t.count === "number" && (
                <span className="font-ui text-[0.65rem] text-charcoal-light tabular-nums shrink-0">{t.count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
