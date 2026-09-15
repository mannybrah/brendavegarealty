"use client";

import { useEffect, useRef, useState } from "react";
import type { ContactRow, TagRow } from "@/lib/crm/types";
import { CONTACT_TYPES, CONTACT_TYPE_LABELS, TIMEFRAMES, TIMEFRAME_LABELS } from "@/lib/crm/types";
import type { ContactType, Timeframe } from "@/lib/crm/types";
import { formatPrice } from "@/lib/crm/format";
import { StagePill } from "@/components/studio/crm/StagePill";
import { TagPicker, type TagOption } from "@/components/studio/crm/TagPicker";
import { Btn, Card, ErrorText, Field, SectionTitle, Sheet, TagBubble, inputCls, labelCls, selectCls } from "@/components/studio/crm/ui";
import { StagePickerSheet } from "./StagePickerSheet";

export type PatchContact = (body: Record<string, unknown>) => Promise<void>;

function typeLabel(t: string | null): string {
  return t && (CONTACT_TYPES as readonly string[]).includes(t) ? CONTACT_TYPE_LABELS[t as ContactType] : "";
}
function timeframeLabel(t: string | null): string {
  return t && (TIMEFRAMES as readonly string[]).includes(t) ? TIMEFRAME_LABELS[t as Timeframe] : "";
}

function DetailRow({ label, value, onClick }: { label: string; value: React.ReactNode; onClick: () => void }) {
  const empty = value === "" || value === null || value === undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between gap-3 min-h-11 py-1.5 text-left rounded-lg hover:bg-navy/5 px-1 -mx-1"
    >
      <span className={labelCls}>{label}</span>
      <span className={`font-body text-sm text-right truncate ${empty ? "text-charcoal-light/60" : "text-navy"}`}>
        {empty ? "Add" : value}
      </span>
    </button>
  );
}

// ------------------------------------------------------------
// Edit details sheet (source / type / price / timeframe)
// ------------------------------------------------------------
interface EditDetailsProps {
  open: boolean;
  contact: ContactRow;
  onClose: () => void;
  patchContact: PatchContact;
}

// Mount the form only while open so it re-seeds from the contact each time.
function EditDetailsSheet(props: EditDetailsProps) {
  if (!props.open) return null;
  return <EditDetailsForm {...props} />;
}

function EditDetailsForm({ contact, onClose, patchContact }: EditDetailsProps) {
  const [source, setSource] = useState(contact.source ?? "");
  const [type, setType] = useState(contact.type ?? "");
  const [price, setPrice] = useState(contact.price === null ? "" : String(contact.price));
  const [timeframe, setTimeframe] = useState(contact.timeframe ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setErr(null);
    setBusy(true);
    try {
      await patchContact({
        source: source.trim(),
        type,
        price: price.trim() === "" ? null : Number(price),
        timeframe,
      });
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Edit details"
      footer={
        <div className="flex gap-3">
          <Btn variant="secondary" onClick={onClose} className="flex-1" disabled={busy}>
            Cancel
          </Btn>
          <Btn onClick={save} className="flex-1" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Btn>
        </div>
      }
    >
      <Field label="Source">
        <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Zillow, referral, open house…" className={inputCls} autoComplete="off" />
      </Field>
      <Field label="Type">
        <select value={type} onChange={(e) => setType(e.target.value)} className={selectCls}>
          <option value="">Not set</option>
          {CONTACT_TYPES.map((t) => (
            <option key={t} value={t}>
              {CONTACT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Price">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={1000}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="520000"
          className={inputCls}
        />
      </Field>
      <Field label="Timeframe">
        <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className={selectCls}>
          <option value="">Not set</option>
          {TIMEFRAMES.map((t) => (
            <option key={t} value={t}>
              {TIMEFRAME_LABELS[t]}
            </option>
          ))}
        </select>
      </Field>
      <ErrorText>{err}</ErrorText>
    </Sheet>
  );
}

// ------------------------------------------------------------
// Tags sheet
// ------------------------------------------------------------
interface TagsSheetProps {
  open: boolean;
  tags: TagRow[];
  allTags: TagOption[];
  onClose: () => void;
  patchContact: PatchContact;
}

function TagsSheet(props: TagsSheetProps) {
  if (!props.open) return null;
  return <TagsForm {...props} />;
}

function TagsForm({ tags, allTags, onClose, patchContact }: TagsSheetProps) {
  const [selected, setSelected] = useState<string[]>(() => tags.map((t) => t.name));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setErr(null);
    setBusy(true);
    try {
      await patchContact({ tags: selected });
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Tags"
      footer={
        <div className="flex gap-3">
          <Btn variant="secondary" onClick={onClose} className="flex-1" disabled={busy}>
            Cancel
          </Btn>
          <Btn onClick={save} className="flex-1" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Btn>
        </div>
      }
    >
      <TagPicker selected={selected} onChange={setSelected} mode="names" allTags={allTags} autoFocus />
      <ErrorText>{err}</ErrorText>
    </Sheet>
  );
}

// ------------------------------------------------------------
// Background notes (autosave on blur)
// ------------------------------------------------------------
function BackgroundNotes({ contact, patchContact }: { contact: ContactRow; patchContact: PatchContact }) {
  const [notes, setNotes] = useState(contact.notes ?? "");
  const [flash, setFlash] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const flashTimer = useRef<number | null>(null);

  // Only re-seed when we land on a different contact, never on background
  // refreshes (which would clobber an in-progress edit).
  useEffect(() => {
    setNotes(contact.notes ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact.id]);

  useEffect(
    () => () => {
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
    },
    []
  );

  async function saveIfChanged() {
    if (notes === (contact.notes ?? "")) return;
    setErr(null);
    try {
      await patchContact({ notes });
      setFlash(true);
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
      flashTimer.current = window.setTimeout(() => setFlash(false), 1500);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save. Try again.");
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className={labelCls}>Background</span>
        <span
          aria-live="polite"
          className={`font-ui text-[0.65rem] tracking-wider uppercase text-teal transition-opacity ${flash ? "opacity-100" : "opacity-0"}`}
        >
          Saved ✓
        </span>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={saveIfChanged}
        rows={4}
        placeholder="Anything worth remembering about this person…"
        className={`${inputCls} resize-y`}
      />
      <ErrorText>{err}</ErrorText>
    </div>
  );
}

// ------------------------------------------------------------
// DetailsCard
// ------------------------------------------------------------
export function DetailsCard({
  contact,
  tags,
  allTags,
  patchContact,
  onStageChange,
}: {
  contact: ContactRow;
  tags: TagRow[];
  allTags: TagOption[];
  patchContact: PatchContact;
  onStageChange: (stageId: string) => void;
}) {
  const [stageOpen, setStageOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);

  return (
    <Card className="p-4 space-y-3">
      <SectionTitle>Details</SectionTitle>

      <div className="divide-y divide-navy/5">
        <button
          type="button"
          onClick={() => setStageOpen(true)}
          className="w-full flex items-center justify-between gap-3 min-h-11 py-1.5 text-left rounded-lg hover:bg-navy/5 px-1 -mx-1"
        >
          <span className={labelCls}>Stage</span>
          <StagePill stageId={contact.stage} size="md" />
        </button>
        <DetailRow label="Source" value={contact.source ?? ""} onClick={() => setDetailsOpen(true)} />
        <DetailRow label="Type" value={typeLabel(contact.type)} onClick={() => setDetailsOpen(true)} />
        <DetailRow label="Price" value={formatPrice(contact.price)} onClick={() => setDetailsOpen(true)} />
        <DetailRow label="Timeframe" value={timeframeLabel(contact.timeframe)} onClick={() => setDetailsOpen(true)} />

        <div className="flex items-start justify-between gap-3 py-2">
          <span className={`${labelCls} pt-2.5`}>Tags</span>
          <div className="flex flex-wrap items-center justify-end gap-1.5 min-w-0">
            {tags.map((t) => (
              <TagBubble key={t.id} name={t.name} onClick={() => setTagsOpen(true)} />
            ))}
            <button
              type="button"
              onClick={() => setTagsOpen(true)}
              aria-label="Edit tags"
              className="w-10 h-10 rounded-full flex items-center justify-center text-teal hover:bg-navy/5 text-xl leading-none"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <BackgroundNotes contact={contact} patchContact={patchContact} />

      <StagePickerSheet open={stageOpen} current={contact.stage} onClose={() => setStageOpen(false)} onSelect={onStageChange} />
      <EditDetailsSheet open={detailsOpen} contact={contact} onClose={() => setDetailsOpen(false)} patchContact={patchContact} />
      <TagsSheet open={tagsOpen} tags={tags} allTags={allTags} onClose={() => setTagsOpen(false)} patchContact={patchContact} />
    </Card>
  );
}
