"use client";

import { useRef, useState } from "react";
import type { EventRow } from "@/lib/crm/types";
import { CALL_OUTCOMES, CALL_OUTCOME_LABELS, EVENT_ICON } from "@/lib/crm/types";
import type { CallOutcome } from "@/lib/crm/types";
import { Btn, Chip, ErrorText, crmJson } from "@/components/studio/crm/ui";

export type ComposerKind = "note" | "call" | "text" | "email";
export type SetEvents = (fn: (prev: EventRow[]) => EventRow[]) => void;

const KINDS: { kind: ComposerKind; label: string; button: string; placeholder: string }[] = [
  { kind: "note", label: "Note", button: "Add note", placeholder: "Write a note…" },
  { kind: "call", label: "Call", button: "Log call", placeholder: "How did the call go?" },
  { kind: "text", label: "Text", button: "Log text", placeholder: "What did you text about?" },
  { kind: "email", label: "Email", button: "Log email", placeholder: "What did you email about?" },
];

const MAX_HEIGHT = 160;

export function Composer({
  contactId,
  setEvents,
  onLogged,
  className = "",
}: {
  contactId: string;
  setEvents: SetEvents;
  onLogged: () => void;
  className?: string;
}) {
  const [kind, setKind] = useState<ComposerKind>("note");
  const [body, setBody] = useState("");
  const [outcome, setOutcome] = useState<CallOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const meta = KINDS.find((k) => k.kind === kind)!;
  const canSubmit = !busy && (body.trim().length > 0 || (kind === "call" && !!outcome));

  function grow(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }

  function pickOutcome(o: CallOutcome) {
    const next = outcome === o ? null : o;
    setOutcome(next);
    if (next && !body.trim()) {
      setBody(CALL_OUTCOME_LABELS[next]);
      requestAnimationFrame(() => taRef.current && grow(taRef.current));
    }
  }

  function switchKind(k: ComposerKind) {
    setKind(k);
    if (k !== "call") setOutcome(null);
    setErr(null);
  }

  async function submit() {
    if (!canSubmit) return;
    const draft = body;
    const draftOutcome = outcome;
    const text = body.trim() || (outcome ? CALL_OUTCOME_LABELS[outcome] : "");
    const tmpId = `tmp-${Date.now()}`;
    const tmp: EventRow = {
      id: tmpId,
      contact_id: contactId,
      kind,
      body: text,
      meta: null,
      outcome: kind === "call" ? outcome : null,
      starred: 0,
      updated_at: null,
      created_at: new Date().toISOString(),
    };

    setErr(null);
    setBusy(true);
    setEvents((prev) => [tmp, ...prev]);
    setBody("");
    setOutcome(null);
    if (taRef.current) taRef.current.style.height = "auto";

    try {
      const j = await crmJson<{ event: EventRow }>(`/api/studio/crm/contacts/${contactId}/events`, {
        method: "POST",
        body: JSON.stringify({ kind, body: text, outcome: kind === "call" ? outcome ?? undefined : undefined }),
      });
      setEvents((prev) => prev.map((e) => (e.id === tmpId ? j.event : e)));
      onLogged();
    } catch (e) {
      setEvents((prev) => prev.filter((ev) => ev.id !== tmpId));
      setBody(draft);
      setOutcome(draftOutcome);
      setErr(e instanceof Error ? e.message : "Couldn't save. Try again.");
      requestAnimationFrame(() => taRef.current && grow(taRef.current));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="flex gap-1" role="tablist" aria-label="Entry type">
        {KINDS.map((k) => {
          const active = k.kind === kind;
          return (
            <button
              key={k.kind}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => switchKind(k.kind)}
              className={`flex-1 min-h-10 flex items-center justify-center gap-1.5 font-ui text-[0.65rem] tracking-wider uppercase rounded-lg transition-colors ${
                active ? "bg-navy text-cream" : "bg-white text-charcoal-light border border-navy/10 hover:text-navy"
              }`}
            >
              <span aria-hidden="true">{EVENT_ICON[k.kind]}</span>
              {k.label}
            </button>
          );
        })}
      </div>

      {kind === "call" && (
        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5">
          {CALL_OUTCOMES.map((o) => (
            <Chip key={o} active={outcome === o} onClick={() => pickOutcome(o)} className="min-h-10 text-[0.65rem]">
              {CALL_OUTCOME_LABELS[o]}
            </Chip>
          ))}
        </div>
      )}

      <textarea
        ref={taRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onInput={(e) => grow(e.currentTarget)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
        }}
        rows={1}
        placeholder={meta.placeholder}
        aria-label={meta.placeholder}
        className="w-full bg-white border border-navy/10 rounded-xl px-3 py-2.5 font-body text-sm text-navy placeholder:text-charcoal-light/60 focus:outline-none focus:border-teal resize-none min-h-[44px] leading-relaxed"
        style={{ maxHeight: MAX_HEIGHT }}
      />

      <div className="flex items-center justify-between gap-3">
        <ErrorText>{err}</ErrorText>
        <Btn onClick={submit} disabled={!canSubmit} className="ml-auto min-h-10">
          {busy ? "Saving…" : meta.button}
        </Btn>
      </div>
    </div>
  );
}
