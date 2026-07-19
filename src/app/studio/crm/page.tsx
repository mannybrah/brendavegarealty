"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StudioShell } from "@/components/studio/StudioShell";
import { CrmTabs } from "@/components/studio/crm/CrmTabs";
import { ContactListItem, ContactRow } from "@/components/studio/crm/ContactListItem";
import { STAGE_COLORS } from "@/components/studio/crm/stageColors";
import { CardTitle } from "@/components/studio/crm/CardTitle";
import { STAGES, STAGE_LABELS, Stage } from "@/lib/crm/normalize";

export default function CrmClientsPage() {
  return (
    <StudioShell
      title="Clients"
      backHref="/studio"
      headerActions={
        <Link
          href="/studio/crm/settings"
          aria-label="Settings"
          className="text-gold-light hover:text-gold text-lg leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy rounded"
        >
          ⚙️
        </Link>
      }
    >
      <ClientsInner />
    </StudioShell>
  );
}

function ClientsInner() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [stage, setStage] = useState<Stage | null>(null);
  const [contacts, setContacts] = useState<ContactRow[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  function fetchContacts(signal?: AbortSignal) {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (stage) params.set("stage", stage);
    const qs = params.toString();
    fetch(`/api/studio/crm/contacts${qs ? `?${qs}` : ""}`, { credentials: "include", cache: "no-store", signal })
      .then((r) => (r.ok ? r.json() : { contacts: [] }))
      .then((j: { contacts: ContactRow[] }) => setContacts(j.contacts ?? []))
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setContacts([]);
      });
  }

  useEffect(() => {
    const controller = new AbortController();
    fetchContacts(controller.signal);
    return () => controller.abort();
  }, [debouncedQuery, stage]);

  const unfiltered = !debouncedQuery && !stage;
  const list = contacts ?? [];
  const newContacts = unfiltered ? list.filter((c) => c.stage === "new") : [];
  const restContacts = unfiltered ? list.filter((c) => c.stage !== "new") : list;

  return (
    <div className="space-y-4">
      <CrmTabs active="inbox" />
      <div className="sticky top-16 z-30 bg-cream -mx-5 px-5 pt-1 pb-3 space-y-3">
        <div className="flex items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, phone…"
            className="flex-1 min-w-0 bg-white border border-navy/10 rounded-xl px-4 py-3 font-body text-sm focus:outline-none focus:border-teal"
          />
          <button
            onClick={() => setShowAdd(true)}
            className="shrink-0 bg-navy text-gold hover:bg-navy/90 font-ui text-xs tracking-wider uppercase px-4 py-3 rounded-md active:scale-[0.98] transition-transform"
          >
            + Add
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setStage(null)}
            className={`shrink-0 font-ui text-xs tracking-wider uppercase px-4 py-2 rounded-full border transition-colors ${
              stage === null ? "bg-navy text-cream border-navy" : "bg-white text-navy border-navy/20"
            }`}
          >
            All
          </button>
          {STAGES.map((s) => {
            const c = STAGE_COLORS[s];
            const selected = stage === s;
            return (
              <button
                key={s}
                onClick={() => setStage(s)}
                className={`shrink-0 font-ui text-xs tracking-wider uppercase px-4 py-2 rounded-full border transition-colors ${
                  selected ? "" : `bg-white ${c.text} ${c.border}`
                }`}
                style={
                  selected
                    ? { backgroundColor: c.solid.bg, borderColor: c.solid.bg, color: c.solid.text }
                    : undefined
                }
              >
                {STAGE_LABELS[s]}
              </button>
            );
          })}
        </div>
      </div>

      {contacts === null && <div className="font-body text-sm text-charcoal-light">Loading…</div>}

      {contacts !== null && list.length === 0 && (
        <div className="font-body text-sm text-charcoal-light space-y-2">
          <p>No leads yet — they&apos;ll land here automatically from the website.</p>
          <p>
            Have a list already?{" "}
            <Link href="/studio/crm/import" className="text-teal">
              Import contacts from CSV
            </Link>
          </p>
        </div>
      )}

      {contacts !== null && list.length > 0 && unfiltered && (
        <>
          {newContacts.length > 0 && (
            <section>
              <CardTitle>New</CardTitle>
              <div className="bg-[#FCFBF7] rounded-lg border border-navy/10 shadow-[0_1px_3px_rgba(15,29,53,0.06)] divide-y divide-navy/5">
                {newContacts.map((c) => (
                  <ContactListItem key={c.id} contact={c} />
                ))}
              </div>
            </section>
          )}
          {restContacts.length > 0 && (
            <section>
              <CardTitle>Everyone</CardTitle>
              <div className="bg-[#FCFBF7] rounded-lg border border-navy/10 shadow-[0_1px_3px_rgba(15,29,53,0.06)] divide-y divide-navy/5">
                {restContacts.map((c) => (
                  <ContactListItem key={c.id} contact={c} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {contacts !== null && list.length > 0 && !unfiltered && (
        <div className="bg-[#FCFBF7] rounded-lg border border-navy/10 shadow-[0_1px_3px_rgba(15,29,53,0.06)] divide-y divide-navy/5">
          {list.map((c) => (
            <ContactListItem key={c.id} contact={c} />
          ))}
        </div>
      )}

      {showAdd && (
        <AddContactSheet
          onClose={() => setShowAdd(false)}
          onCreated={(id) => {
            setShowAdd(false);
            fetchContacts();
            router.push(`/studio/crm/contact?id=${id}`);
          }}
        />
      )}
    </div>
  );
}

function AddContactSheet({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState<"buyer" | "seller" | "other">("buyer");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    if (!name.trim()) {
      setErr("Name is required.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/studio/crm/contacts", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          type,
        }),
      });
      if (!r.ok) {
        const message = await r
          .json()
          .then((j: { error?: string }) => j.error ?? "Something went wrong — try again.")
          .catch(() => "Something went wrong — try again.");
        throw new Error(message);
      }
      const j = (await r.json()) as { contact: { id: string } };
      onCreated(j.contact.id);
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e));
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-navy/40"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm bg-cream rounded-t-3xl sm:rounded-3xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-display font-normal text-lg text-navy">Add a lead</div>

        <label className="block">
          <span className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="mt-2 w-full bg-white border border-navy/10 rounded-xl p-3 font-body text-sm focus:outline-none focus:border-teal"
          />
        </label>

        <label className="block">
          <span className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Phone</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            className="mt-2 w-full bg-white border border-navy/10 rounded-xl p-3 font-body text-sm focus:outline-none focus:border-teal"
          />
        </label>

        <label className="block">
          <span className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            className="mt-2 w-full bg-white border border-navy/10 rounded-xl p-3 font-body text-sm focus:outline-none focus:border-teal"
          />
        </label>

        <label className="block">
          <span className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "buyer" | "seller" | "other")}
            className="mt-2 w-full bg-white border border-navy/10 rounded-xl p-3 font-body text-sm focus:outline-none focus:border-teal"
          >
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
            <option value="other">Other</option>
          </select>
        </label>

        {err && <div className="text-sm text-red-600 font-body">{err}</div>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-white border border-navy/20 text-navy font-ui text-xs tracking-wider uppercase py-3.5 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy || !name.trim()}
            className="flex-1 bg-navy text-gold hover:bg-navy/90 font-ui font-medium text-xs tracking-wider uppercase py-3.5 rounded-md active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
