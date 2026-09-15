"use client";

import { useState } from "react";
import type { RelationshipFull } from "@/lib/crm/types";
import { RELATIONSHIP_TYPES } from "@/lib/crm/types";
import type { EmailInput, PhoneInput } from "@/lib/crm/contactsInput";
import { Btn, ErrorText, Field, Sheet, crmJson, inputCls } from "@/components/studio/crm/ui";
import { EmailsEditor, PhonesEditor, emailsToInputs, phonesToInputs } from "./EditContactSheet";

interface Props {
  open: boolean;
  contactId: string;
  relationship: RelationshipFull | null; // null = create
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

// Mount the form only while open so it re-seeds from the relationship each time.
export function RelationshipSheet(props: Props) {
  if (!props.open) return null;
  return <RelationshipForm {...props} />;
}

function RelationshipForm({ contactId, relationship, onClose, onSaved }: Props) {
  const [firstName, setFirstName] = useState(relationship?.first_name ?? "");
  const [lastName, setLastName] = useState(relationship?.last_name ?? "");
  const [type, setType] = useState(relationship?.type ?? "");
  const [phones, setPhones] = useState<PhoneInput[]>(() => (relationship ? phonesToInputs(relationship.phones) : []));
  const [emails, setEmails] = useState<EmailInput[]>(() => (relationship ? emailsToInputs(relationship.emails) : []));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!firstName.trim() && !lastName.trim()) {
      setErr("A first or last name is required.");
      return;
    }
    setErr(null);
    setBusy(true);
    const body = JSON.stringify({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      type: type.trim(),
      phones: phones.filter((p) => p.number.trim()),
      emails: emails.filter((e) => e.address.trim()),
    });
    try {
      if (relationship) {
        await crmJson(`/api/studio/crm/relationships/${relationship.id}`, { method: "PATCH", body });
      } else {
        await crmJson(`/api/studio/crm/contacts/${contactId}/relationships`, { method: "POST", body });
      }
      await onSaved();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!relationship) return;
    const who = `${firstName} ${lastName}`.trim() || "this relationship";
    if (!confirm(`Remove ${who}?`)) return;
    setErr(null);
    setBusy(true);
    try {
      await crmJson(`/api/studio/crm/relationships/${relationship.id}`, { method: "DELETE" });
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
      title={relationship ? "Edit relationship" : "Add relationship"}
      footer={
        <div className="flex gap-3">
          {relationship && (
            <Btn variant="danger" onClick={remove} disabled={busy}>
              Delete
            </Btn>
          )}
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
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} autoComplete="off" autoFocus />
        </Field>
        <Field label="Last name">
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputCls} autoComplete="off" />
        </Field>
      </div>
      <Field label="Relationship" hint="Spouse, Lender, Co-buyer…">
        <input
          list="rel-types"
          value={type}
          onChange={(e) => setType(e.target.value)}
          placeholder="Spouse"
          className={inputCls}
          autoComplete="off"
        />
        <datalist id="rel-types">
          {RELATIONSHIP_TYPES.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </Field>
      <PhonesEditor value={phones} onChange={setPhones} />
      <EmailsEditor value={emails} onChange={setEmails} />
      <ErrorText>{err}</ErrorText>
    </Sheet>
  );
}
