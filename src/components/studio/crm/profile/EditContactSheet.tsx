"use client";

import { useId, useState } from "react";
import type { AddressRow, ContactRow, EmailRow, PhoneRow } from "@/lib/crm/types";
import { ADDRESS_LABEL_SUGGESTIONS, CONTACT_TYPES, CONTACT_TYPE_LABELS, EMAIL_LABELS, PHONE_LABELS } from "@/lib/crm/types";
import type { AddressInput, EmailInput, PhoneInput } from "@/lib/crm/contactsInput";
import { Btn, ErrorText, Field, Sheet, crmJson, inputCls, labelCls, selectCls } from "@/components/studio/crm/ui";

// ------------------------------------------------------------
// Row → input converters (shared with RelationshipSheet)
// ------------------------------------------------------------
export function phonesToInputs(rows: PhoneRow[]): PhoneInput[] {
  return rows.map((p) => ({ number: p.number, label: p.label, isPrimary: !!p.is_primary, isBad: !!p.is_bad }));
}
export function emailsToInputs(rows: EmailRow[]): EmailInput[] {
  return rows.map((e) => ({ address: e.address, label: e.label, isPrimary: !!e.is_primary, isBad: !!e.is_bad }));
}
export function addressesToInputs(rows: AddressRow[]): AddressInput[] {
  return rows.map((a) => ({ address: a.address, label: a.label, isPrimary: !!a.is_primary }));
}

const rowCls = "rounded-xl border border-navy/10 bg-white/60 p-2.5 space-y-2";
const smallCheck = "flex items-center gap-2 font-body text-sm text-navy min-h-10 cursor-pointer select-none";
const removeCls = "ml-auto font-ui text-[0.65rem] tracking-wider uppercase text-red-700 min-h-10 px-2 rounded-md hover:bg-red-50";

// ------------------------------------------------------------
// PhonesEditor
// ------------------------------------------------------------
export function PhonesEditor({ value, onChange }: { value: PhoneInput[]; onChange: (v: PhoneInput[]) => void }) {
  const uid = useId();

  function update(i: number, patch: Partial<PhoneInput>) {
    onChange(value.map((p, n) => (n === i ? { ...p, ...patch } : p)));
  }
  function setPrimary(i: number) {
    onChange(value.map((p, n) => ({ ...p, isPrimary: n === i })));
  }
  function remove(i: number) {
    const next = value.filter((_, n) => n !== i);
    if (next.length > 0 && !next.some((p) => p.isPrimary)) next[0] = { ...next[0], isPrimary: true };
    onChange(next);
  }
  function add() {
    onChange([...value, { number: "", label: "mobile", isPrimary: value.length === 0, isBad: false }]);
  }

  return (
    <div className="space-y-2">
      <span className={labelCls}>Phones</span>
      {value.map((p, i) => (
        <div key={i} className={rowCls}>
          <div className="flex gap-2">
            <input
              type="tel"
              inputMode="tel"
              autoComplete="off"
              value={p.number}
              onChange={(e) => update(i, { number: e.target.value })}
              placeholder="(408) 555-1234"
              aria-label={`Phone ${i + 1}`}
              className={`${inputCls} flex-1 min-w-0`}
            />
            <select
              value={p.label ?? "mobile"}
              onChange={(e) => update(i, { label: e.target.value })}
              aria-label={`Phone ${i + 1} label`}
              className={`${selectCls} w-28 shrink-0`}
            >
              {PHONE_LABELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <label className={smallCheck}>
              <input
                type="radio"
                name={`${uid}-phone-primary`}
                checked={!!p.isPrimary}
                onChange={() => setPrimary(i)}
                className="w-4 h-4 accent-navy"
              />
              Primary
            </label>
            <label className={smallCheck}>
              <input
                type="checkbox"
                checked={!!p.isBad}
                onChange={(e) => update(i, { isBad: e.target.checked })}
                className="w-4 h-4 accent-navy"
              />
              Bad number
            </label>
            <button type="button" onClick={() => remove(i)} className={removeCls}>
              Remove
            </button>
          </div>
        </div>
      ))}
      <button type="button" onClick={add} className="font-body text-sm text-teal hover:text-navy min-h-10 px-1">
        + Add phone
      </button>
    </div>
  );
}

// ------------------------------------------------------------
// EmailsEditor
// ------------------------------------------------------------
export function EmailsEditor({ value, onChange }: { value: EmailInput[]; onChange: (v: EmailInput[]) => void }) {
  const uid = useId();

  function update(i: number, patch: Partial<EmailInput>) {
    onChange(value.map((e, n) => (n === i ? { ...e, ...patch } : e)));
  }
  function setPrimary(i: number) {
    onChange(value.map((e, n) => ({ ...e, isPrimary: n === i })));
  }
  function remove(i: number) {
    const next = value.filter((_, n) => n !== i);
    if (next.length > 0 && !next.some((e) => e.isPrimary)) next[0] = { ...next[0], isPrimary: true };
    onChange(next);
  }
  function add() {
    onChange([...value, { address: "", label: "personal", isPrimary: value.length === 0, isBad: false }]);
  }

  return (
    <div className="space-y-2">
      <span className={labelCls}>Emails</span>
      {value.map((e, i) => (
        <div key={i} className={rowCls}>
          <div className="flex gap-2">
            <input
              type="email"
              inputMode="email"
              autoComplete="off"
              autoCapitalize="none"
              value={e.address}
              onChange={(ev) => update(i, { address: ev.target.value })}
              placeholder="name@example.com"
              aria-label={`Email ${i + 1}`}
              className={`${inputCls} flex-1 min-w-0`}
            />
            <select
              value={e.label ?? "personal"}
              onChange={(ev) => update(i, { label: ev.target.value })}
              aria-label={`Email ${i + 1} label`}
              className={`${selectCls} w-28 shrink-0`}
            >
              {EMAIL_LABELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <label className={smallCheck}>
              <input
                type="radio"
                name={`${uid}-email-primary`}
                checked={!!e.isPrimary}
                onChange={() => setPrimary(i)}
                className="w-4 h-4 accent-navy"
              />
              Primary
            </label>
            <label className={smallCheck}>
              <input
                type="checkbox"
                checked={!!e.isBad}
                onChange={(ev) => update(i, { isBad: ev.target.checked })}
                className="w-4 h-4 accent-navy"
              />
              Bad email
            </label>
            <button type="button" onClick={() => remove(i)} className={removeCls}>
              Remove
            </button>
          </div>
        </div>
      ))}
      <button type="button" onClick={add} className="font-body text-sm text-teal hover:text-navy min-h-10 px-1">
        + Add email
      </button>
    </div>
  );
}

// ------------------------------------------------------------
// AddressesEditor — labels are free text (Home, Mailing, Investment,
// Second home, Rental, Work, or anything typed), so new kinds can be added
// live without a code change.
// ------------------------------------------------------------
export function AddressesEditor({ value, onChange }: { value: AddressInput[]; onChange: (v: AddressInput[]) => void }) {
  const uid = useId();
  const listId = `${uid}-address-labels`;

  function update(i: number, patch: Partial<AddressInput>) {
    onChange(value.map((a, n) => (n === i ? { ...a, ...patch } : a)));
  }
  function setPrimary(i: number) {
    onChange(value.map((a, n) => ({ ...a, isPrimary: n === i })));
  }
  function remove(i: number) {
    const next = value.filter((_, n) => n !== i);
    if (next.length > 0 && !next.some((a) => a.isPrimary)) next[0] = { ...next[0], isPrimary: true };
    onChange(next);
  }
  function add() {
    onChange([...value, { address: "", label: value.length === 0 ? "Home" : "", isPrimary: value.length === 0 }]);
  }

  return (
    <div className="space-y-2">
      <span className={labelCls}>Addresses</span>
      <datalist id={listId}>
        {ADDRESS_LABEL_SUGGESTIONS.map((l) => (
          <option key={l} value={l} />
        ))}
      </datalist>
      {value.map((a, i) => (
        <div key={i} className={rowCls}>
          <input
            value={a.address}
            onChange={(e) => update(i, { address: e.target.value })}
            placeholder="123 Main St, San Jose, CA 95125"
            aria-label={`Address ${i + 1}`}
            className={inputCls}
            autoComplete="off"
          />
          <div className="flex gap-2">
            <input
              list={listId}
              value={a.label ?? ""}
              onChange={(e) => update(i, { label: e.target.value })}
              placeholder="Label: Home, Investment…"
              aria-label={`Address ${i + 1} label`}
              className={`${inputCls} flex-1 min-w-0`}
              autoComplete="off"
            />
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <label className={smallCheck}>
              <input
                type="radio"
                name={`${uid}-address-primary`}
                checked={!!a.isPrimary}
                onChange={() => setPrimary(i)}
                className="w-4 h-4 accent-navy"
              />
              Primary
            </label>
            <button type="button" onClick={() => remove(i)} className={removeCls}>
              Remove
            </button>
          </div>
        </div>
      ))}
      <button type="button" onClick={add} className="font-body text-sm text-teal hover:text-navy min-h-10 px-1">
        + Add address
      </button>
    </div>
  );
}

// ------------------------------------------------------------
// EditContactSheet
// ------------------------------------------------------------
interface EditContactProps {
  open: boolean;
  contact: ContactRow;
  phones: PhoneRow[];
  emails: EmailRow[];
  addresses: AddressRow[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

// Mount the form only while open so it re-seeds from current data each time.
export function EditContactSheet(props: EditContactProps) {
  if (!props.open) return null;
  return <EditContactForm {...props} />;
}

function EditContactForm({ contact, phones, emails, addresses, onClose, onSaved }: EditContactProps) {
  const [firstName, setFirstName] = useState(contact.first_name);
  const [lastName, setLastName] = useState(contact.last_name);
  const [type, setType] = useState(contact.type ?? "");
  const [phoneInputs, setPhoneInputs] = useState<PhoneInput[]>(() => phonesToInputs(phones));
  const [emailInputs, setEmailInputs] = useState<EmailInput[]>(() => emailsToInputs(emails));
  const [addressInputs, setAddressInputs] = useState<AddressInput[]>(() => addressesToInputs(addresses));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!firstName.trim() && !lastName.trim()) {
      setErr("A first or last name is required.");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const base = `/api/studio/crm/contacts/${contact.id}`;
      await crmJson(base, {
        method: "PATCH",
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim(), type: type || null }),
      });
      await crmJson(`${base}/phones`, {
        method: "PUT",
        body: JSON.stringify({ phones: phoneInputs.filter((p) => p.number.trim()) }),
      });
      await crmJson(`${base}/emails`, {
        method: "PUT",
        body: JSON.stringify({ emails: emailInputs.filter((e) => e.address.trim()) }),
      });
      await crmJson(`${base}/addresses`, {
        method: "PUT",
        body: JSON.stringify({ addresses: addressInputs.filter((a) => a.address.trim()) }),
      });
      await onSaved();
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
      title="Edit contact"
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
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name">
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} autoComplete="off" />
        </Field>
        <Field label="Last name">
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} autoComplete="off" />
        </Field>
      </div>
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
      <PhonesEditor value={phoneInputs} onChange={setPhoneInputs} />
      <EmailsEditor value={emailInputs} onChange={setEmailInputs} />
      <AddressesEditor value={addressInputs} onChange={setAddressInputs} />
      <ErrorText>{err}</ErrorText>
    </Sheet>
  );
}
