"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CrmShell } from "@/components/studio/crm/CrmShell";
import { useStages } from "@/components/studio/crm/StagesContext";
import { STAGE_PALETTE, paletteFor } from "@/components/studio/crm/stageColors";
import {
  Btn,
  Card,
  ErrorText,
  Field,
  Sheet,
  SectionTitle,
  Spinner,
  crmJson,
  inputCls,
  labelCls,
  selectCls,
} from "@/components/studio/crm/ui";
import { PALETTE_KEYS, type PaletteKey } from "@/lib/crm/stages";
import type { StageRow } from "@/lib/crm/types";

const SYSTEM_HINT = "Built-in stage: can be renamed, not deleted";

export default function CrmStagesPage() {
  return (
    <CrmShell title="Stages" backHref="/studio/crm/settings" wide={false}>
      <StagesInner />
    </CrmShell>
  );
}

// ------------------------------------------------------------
// Swatch picker: the 11 palette colors as filled dots.
// ------------------------------------------------------------
function SwatchRow({ value, onPick }: { value: string; onPick: (key: PaletteKey) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PALETTE_KEYS.map((key) => {
        const c = STAGE_PALETTE[key];
        const active = key === value;
        return (
          <button
            key={key}
            type="button"
            aria-label={key}
            aria-pressed={active}
            onClick={() => onPick(key)}
            style={{ backgroundColor: c.accent }}
            className={`w-7 h-7 rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
              active ? "ring-2 ring-offset-2 ring-navy" : "ring-1 ring-inset ring-black/10"
            }`}
          />
        );
      })}
    </div>
  );
}

function SwatchPopover({ color, name, onPick }: { color: string; name: string; onPick: (key: PaletteKey) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-label={`Color for ${name}`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{ backgroundColor: paletteFor(color).accent }}
        className="w-6 h-6 rounded-full ring-1 ring-inset ring-black/10 mt-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      />
      {open && (
        <div className="absolute left-0 mt-1.5 z-50 bg-white border border-navy/10 rounded-lg shadow-lg p-2.5 w-[188px]">
          <SwatchRow
            value={color}
            onPick={(key) => {
              setOpen(false);
              onPick(key);
            }}
          />
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Inline editable text: click to edit, Enter/blur saves, Escape cancels.
// ------------------------------------------------------------
function InlineText({
  value,
  onSave,
  placeholder,
  allowEmpty = false,
  ariaLabel,
  displayCls,
  inputExtraCls = "",
}: {
  value: string;
  onSave: (next: string) => void;
  placeholder: string;
  allowEmpty?: boolean;
  ariaLabel: string;
  displayCls: string;
  inputExtraCls?: string;
}) {
  const [editing, setEditing] = useState(false);
  // `draft` is seeded from `value` every time editing starts, so it never
  // needs to be synced from props in an effect.
  const [draft, setDraft] = useState(value);
  const cancelled = useRef(false);

  function commit() {
    setEditing(false);
    if (cancelled.current) {
      cancelled.current = false;
      setDraft(value);
      return;
    }
    const next = draft.trim();
    if (next === value.trim() || (!next && !allowEmpty)) {
      setDraft(value);
      return;
    }
    onSave(next);
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        aria-label={ariaLabel}
        className={`text-left truncate max-w-full hover:underline decoration-navy/20 underline-offset-2 ${displayCls} ${
          value ? "" : "text-charcoal-light/70 italic"
        }`}
      >
        {value || placeholder}
      </button>
    );
  }

  return (
    <input
      autoFocus
      value={draft}
      aria-label={ariaLabel}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancelled.current = true;
          e.currentTarget.blur();
        }
      }}
      className={`${inputCls} py-1.5 ${inputExtraCls}`}
    />
  );
}

// ------------------------------------------------------------
// Page body
// ------------------------------------------------------------
function StagesInner() {
  const { stages, loading, refresh } = useStages();
  // Per-stage contact counts, so the delete sheet can say how many contacts
  // are about to move. One row is enough: the counts come with every list.
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  // Optimistic order is tagged with the server list it was derived from, so a
  // fresh list from the context automatically supersedes it (no sync effect).
  const [order, setOrder] = useState<{ base: StageRow[]; rows: StageRow[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<StageRow | null>(null);

  const rows = order && order.base === stages ? order.rows : stages;

  const loadCounts = useCallback(() => {
    crmJson<{ counts: Record<string, number> }>("/api/studio/crm/contacts?limit=1")
      .then((j) => setStageCounts(j.counts ?? {}))
      .catch(() => {
        /* the sheet just omits the number */
      });
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  async function patchStage(id: string, body: { name?: string; color?: string; description?: string }) {
    setErr(null);
    try {
      await crmJson(`/api/studio/crm/stages/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save that stage. Try again.");
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= rows.length || busy) return;
    const previous = rows;
    const next = rows.slice();
    [next[index], next[target]] = [next[target], next[index]];
    setOrder({ base: stages, rows: next });
    setErr(null);
    setBusy(true);
    try {
      await crmJson("/api/studio/crm/stages/reorder", {
        method: "POST",
        body: JSON.stringify({ ids: next.map((s) => s.id) }),
      });
      await refresh();
    } catch (e) {
      setOrder({ base: stages, rows: previous });
      setErr(e instanceof Error ? e.message : "Couldn't reorder the stages. Try again.");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-6">
      <SectionTitle count={rows.length}>Pipeline stages</SectionTitle>

      {err && <ErrorText>{err}</ErrorText>}
      {notice && <div className="font-body text-sm text-teal">{notice}</div>}

      <Card className="divide-y divide-navy/5">
        {loading && rows.length === 0 && (
          <div className="p-4 flex items-center gap-2">
            <Spinner />
            <span className="font-body text-sm text-charcoal-light">Loading stages…</span>
          </div>
        )}
        {rows.map((s, i) => (
          <div key={s.id} className="flex items-start gap-3 p-3.5">
            <SwatchPopover color={s.color} name={s.name} onPick={(color) => patchStage(s.id, { color })} />

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <InlineText
                  value={s.name}
                  onSave={(name) => patchStage(s.id, { name })}
                  placeholder="Stage name"
                  ariaLabel={`Rename ${s.name}`}
                  displayCls="font-display font-medium text-base text-navy leading-tight"
                />
                {s.is_system === 1 && (
                  <span title={SYSTEM_HINT} aria-label={SYSTEM_HINT} className="text-[0.7rem] shrink-0 opacity-60">
                    🔒
                  </span>
                )}
              </div>
              <InlineText
                value={s.description}
                onSave={(description) => patchStage(s.id, { description })}
                placeholder="Add a description"
                allowEmpty
                ariaLabel={`Description for ${s.name}`}
                displayCls="block font-body font-light text-xs text-charcoal-light"
                inputExtraCls="text-xs"
              />
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0 || busy}
                aria-label={`Move ${s.name} up`}
                className="w-8 h-8 rounded-full flex items-center justify-center text-charcoal-light hover:bg-navy/5 hover:text-navy disabled:opacity-25 disabled:hover:bg-transparent"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === rows.length - 1 || busy}
                aria-label={`Move ${s.name} down`}
                className="w-8 h-8 rounded-full flex items-center justify-center text-charcoal-light hover:bg-navy/5 hover:text-navy disabled:opacity-25 disabled:hover:bg-transparent"
              >
                ↓
              </button>
              {s.is_system === 1 ? (
                <span className="w-8" />
              ) : (
                <button
                  type="button"
                  onClick={() => setDeleting(s)}
                  aria-label={`Delete ${s.name}`}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-charcoal-light hover:bg-red-50 hover:text-red-700"
                >
                  🗑
                </button>
              )}
            </div>
          </div>
        ))}
      </Card>

      <AddStageForm
        onAdded={async (name) => {
          setNotice(`Added ${name}.`);
          await refresh();
        }}
        onError={setErr}
      />

      <DeleteStageSheet
        stage={deleting}
        count={deleting ? stageCounts[deleting.id] : undefined}
        others={rows.filter((s) => s.id !== deleting?.id)}
        onClose={() => setDeleting(null)}
        onDeleted={async (moved) => {
          setDeleting(null);
          setNotice(`Moved ${moved} contact${moved === 1 ? "" : "s"}.`);
          loadCounts();
          await refresh();
        }}
        onError={setErr}
      />
    </div>
  );
}

// ------------------------------------------------------------
// Add stage
// ------------------------------------------------------------
function AddStageForm({
  onAdded,
  onError,
}: {
  onAdded: (name: string) => Promise<void>;
  onError: (msg: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<PaletteKey>("steel");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    onError(null);
    setBusy(true);
    try {
      await crmJson("/api/studio/crm/stages", {
        method: "POST",
        body: JSON.stringify({ name: trimmed, color, description: description.trim() }),
      });
      setName("");
      setDescription("");
      setColor("steel");
      await onAdded(trimmed);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Couldn't add that stage. Try again.");
    }
    setBusy(false);
  }

  return (
    <Card className="p-4 space-y-4">
      <SectionTitle>Add stage</SectionTitle>
      <Field label="Name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Nurture"
          maxLength={40}
          className={inputCls}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
        />
      </Field>
      <div>
        <span className={labelCls}>Color</span>
        <div className="mt-1.5">
          <SwatchRow value={color} onPick={setColor} />
        </div>
      </div>
      <Field label="Description" hint="Optional · shown here and on the pipeline.">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What this stage means"
          maxLength={140}
          className={inputCls}
        />
      </Field>
      <Btn onClick={submit} disabled={!name.trim() || busy} className="w-full">
        {busy ? "Adding…" : "Add stage"}
      </Btn>
    </Card>
  );
}

// ------------------------------------------------------------
// Delete stage (reassign its contacts first)
// ------------------------------------------------------------
function DeleteStageSheet({
  stage,
  count,
  others,
  onClose,
  onDeleted,
  onError,
}: {
  stage: StageRow | null;
  count?: number;
  others: StageRow[];
  onClose: () => void;
  onDeleted: (moved: number) => Promise<void>;
  onError: (msg: string | null) => void;
}) {
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);

  // The pick falls back to the first other stage whenever it is empty or no
  // longer valid (e.g. the sheet reopened for a different stage).
  const reassign = others.some((s) => s.id === pick) ? pick : (others[0]?.id ?? "");

  if (!stage) return null;

  async function remove() {
    if (!stage || !reassign || busy) return;
    onError(null);
    setBusy(true);
    try {
      const j = await crmJson<{ ok: boolean; moved: number }>(
        `/api/studio/crm/stages/${stage.id}?reassign=${encodeURIComponent(reassign)}`,
        { method: "DELETE" }
      );
      setPick("");
      await onDeleted(j.moved ?? 0);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Couldn't delete that stage. Try again.");
    }
    setBusy(false);
  }

  function close() {
    setPick("");
    onClose();
  }

  return (
    <Sheet
      open
      onClose={close}
      title={`Delete ${stage.name}`}
      footer={
        <div className="flex gap-2">
          <Btn variant="secondary" onClick={close} className="flex-1">
            Cancel
          </Btn>
          <Btn variant="danger" onClick={remove} disabled={!reassign || busy} className="flex-1">
            {busy ? "Deleting…" : "Delete stage"}
          </Btn>
        </div>
      }
    >
      <p className="font-body text-sm text-navy">
        {count === undefined
          ? "Move its contacts to…"
          : `Move its ${count} contact${count === 1 ? "" : "s"} to…`}
      </p>
      <select
        value={reassign}
        onChange={(e) => setPick(e.target.value)}
        aria-label="Move contacts to"
        className={selectCls}
      >
        {others.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <p className="font-body font-light text-xs text-charcoal-light">
        Every contact still in {stage.name} moves to the stage you pick, and the move is logged on their timeline.
      </p>
    </Sheet>
  );
}
