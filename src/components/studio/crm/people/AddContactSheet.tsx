"use client";

// "+ Add" sheet on the People page. Creates the contact, then the page sends
// the user straight to the new profile.

import { useState } from "react";
import { crmJson, Btn, ErrorText, Field, Sheet, inputCls, selectCls } from "../ui";
import { TagPicker, type TagOption } from "../TagPicker";
import { useStages } from "../StagesContext";
import { CONTACT_TYPES, CONTACT_TYPE_LABELS, type ContactRow, type TagRow } from "@/lib/crm/types";

interface AddContactSheetProps {
  open: boolean;
  onClose: () => void;
  allTags: TagOption[];
  onCreated: (id: string) => void;
}

// Mounted only while open, so every open starts from a blank form and a
// failed save keeps the draft on screen.
export function AddContactSheet(props: AddContactSheetProps) {
  if (!props.open) return null;
  return <OpenAddContactSheet {...props} />;
}

function OpenAddContactSheet({ onClose, allTags, onCreated }: AddContactSheetProps) {
  const { stages } = useStages();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState("");
  const [stage, setStage] = useState("new");
  const [source, setSource] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSave = Boolean(first.trim() || last.trim());

  async function save() {
    if (!canSave || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const j = await crmJson<{ contact: ContactRow; tags: TagRow[] }>("/api/studio/crm/contacts", {
        method: "POST",
        body: JSON.stringify({
          firstName: first.trim(),
          lastName: last.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          type: type || undefined,
          stage,
          source: source.trim() || undefined,
          tags,
        }),
      });
      onCreated(j.contact.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Add a person"
      footer={
        <div className="flex gap-3">
          <Btn variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Btn>
          <Btn variant="primary" className="flex-1" onClick={save} disabled={busy || !canSave}>
            {busy ? "Saving…" : "Save"}
          </Btn>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name">
          <input value={first} onChange={(e) => setFirst(e.target.value)} autoFocus className={inputCls} />
        </Field>
        <Field label="Last name">
          <input value={last} onChange={(e) => setLast(e.target.value)} className={inputCls} />
        </Field>
      </div>

      <Field label="Phone">
        <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" className={inputCls} />
      </Field>

      <Field label="Email">
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className={inputCls} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
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
        <Field label="Stage">
          <select value={stage} onChange={(e) => setStage(e.target.value)} className={selectCls}>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Source">
        <input
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="manual"
          className={inputCls}
        />
      </Field>

      <div>
        <div className="font-ui text-[0.65rem] tracking-wider uppercase text-charcoal-light mb-1.5">Tags</div>
        <TagPicker selected={tags} onChange={setTags} mode="names" allTags={allTags} />
      </div>

      {err && <ErrorText>{err}</ErrorText>}
    </Sheet>
  );
}
