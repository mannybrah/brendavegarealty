"use client";

import { useState } from "react";
import type { DealRow } from "@/lib/crm/portalTypes";
import { Btn, ErrorText, Field, Sheet, crmJson, inputCls } from "@/components/studio/crm/ui";

interface Props {
  open: boolean;
  contactId: string;
  defaultSide: "buyer" | "seller";
  onClose: () => void;
  onCreated: (dealId: string) => void;
}

// Mount the form only while open so its state starts fresh every time.
export function StartDealSheet(props: Props) {
  if (!props.open) return null;
  return <StartDealForm {...props} />;
}

function StartDealForm({ contactId, defaultSide, onClose, onCreated }: Props) {
  const [side, setSide] = useState<"buyer" | "seller">(defaultSide);
  const [address, setAddress] = useState("");
  const [targetCloseDate, setTargetCloseDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    setBusy(true);
    try {
      const j = await crmJson<{ deal: DealRow }>("/api/studio/crm/deals", {
        method: "POST",
        body: JSON.stringify({
          contactId,
          side,
          propertyAddress: address.trim() || undefined,
          targetCloseDate: targetCloseDate || undefined,
        }),
      });
      onCreated(j.deal.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Start a deal"
      footer={
        <div className="flex gap-3">
          <Btn variant="secondary" onClick={onClose} className="flex-1" disabled={busy}>
            Cancel
          </Btn>
          <Btn onClick={submit} className="flex-1" disabled={busy}>
            {busy ? "Starting…" : "Start deal"}
          </Btn>
        </div>
      }
    >
      <div className="flex gap-2">
        {(["buyer", "seller"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSide(s)}
            aria-pressed={side === s}
            className={`flex-1 min-h-11 font-ui text-xs tracking-wider uppercase rounded-xl transition-colors ${
              side === s ? "bg-navy text-cream" : "bg-white text-charcoal-light border border-navy/10"
            }`}
          >
            {s === "buyer" ? "🏠 Buyer" : "💰 Seller"}
          </button>
        ))}
      </div>
      <Field label="Property address">
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Optional" className={inputCls} autoComplete="off" />
      </Field>
      <Field label="Target close date">
        <input type="date" value={targetCloseDate} onChange={(e) => setTargetCloseDate(e.target.value)} className={inputCls} />
      </Field>
      <ErrorText>{err}</ErrorText>
    </Sheet>
  );
}
