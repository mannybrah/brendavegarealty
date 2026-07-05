"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StudioShell } from "@/components/studio/StudioShell";
import { Listing, LISTING_STATUSES, LISTING_STATUS_LABELS, ListingStatus, OpenHouse } from "@/lib/listing";

export default function EditListingPage() {
  return (
    <StudioShell title="Listing" backHref="/studio/listings">
      <Suspense fallback={<div className="font-body text-sm text-charcoal-light">Loading…</div>}>
        <EditListing />
      </Suspense>
    </StudioShell>
  );
}

interface FormState {
  address: string;
  city: string;
  price: string;
  beds: string;
  baths: string;
  sqft: string;
  lotSize: string;
  description: string;
  featuresText: string;
  status: ListingStatus;
  openHouses: OpenHouse[];
}

function seedForm(l: Listing): FormState {
  return {
    address: l.address,
    city: l.city,
    price: l.price,
    beds: l.beds === null ? "" : String(l.beds),
    baths: l.baths === null ? "" : String(l.baths),
    sqft: l.sqft === null ? "" : String(l.sqft),
    lotSize: l.lotSize ?? "",
    description: l.description,
    featuresText: l.features.join("\n"),
    status: l.status,
    openHouses: l.openHouses,
  };
}

function numOrNull(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function EditListing() {
  const router = useRouter();
  const id = useSearchParams().get("id");
  const needsInfo = useSearchParams().get("needsInfo") === "1";
  const [listing, setListing] = useState<Listing | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [crossPost, setCrossPost] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/studio/listing/${id}`, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { listing: Listing } | null) => {
        if (j) {
          setListing(j.listing);
          setForm(seedForm(j.listing));
        }
      })
      .catch(() => {});
  }, [id]);

  if (!id) return <div className="font-body text-sm text-charcoal-light">Missing listing id.</div>;
  if (!listing || !form) return <div className="font-body text-sm text-charcoal-light">Loading…</div>;

  async function api(path: string, init: RequestInit): Promise<Listing | null> {
    let r: Response;
    try {
      r = await fetch(path, { credentials: "include", ...init });
    } catch {
      setErr("Network error — check your connection and try again.");
      return null;
    }
    if (r.status === 401) {
      window.location.reload();
      return null;
    }
    if (!r.ok) {
      setErr(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "Something went wrong");
      return null;
    }
    const j = (await r.json()) as { listing: Listing };
    return j.listing;
  }

  async function setCover(i: number) {
    setErr(null);
    const d = await api(`/api/studio/listing/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coverIndex: i }),
    });
    if (d) setListing(d);
  }

  async function removePhoto(i: number) {
    if (!listing) return;
    setErr(null);
    const nextKeys = listing.photoKeys.filter((_, j) => j !== i);
    const d = await api(`/api/studio/listing/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoKeys: nextKeys }),
    });
    if (d) setListing(d);
  }

  async function movePhoto(i: number, dir: -1 | 1) {
    if (!listing) return;
    const j = i + dir;
    if (j < 0 || j >= listing.photoKeys.length) return;
    setErr(null);
    const nextKeys = listing.photoKeys.slice();
    [nextKeys[i], nextKeys[j]] = [nextKeys[j], nextKeys[i]];
    let coverIndex = listing.coverIndex;
    if (coverIndex === i) coverIndex = j;
    else if (coverIndex === j) coverIndex = i;
    const d = await api(`/api/studio/listing/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoKeys: nextKeys, coverIndex }),
    });
    if (d) setListing(d);
  }

  async function save() {
    if (!form) return;
    setErr(null);
    setBusy("Saving…");
    const features = form.featuresText
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);
    const d = await api(`/api/studio/listing/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: form.address,
        city: form.city,
        price: form.price,
        beds: numOrNull(form.beds),
        baths: numOrNull(form.baths),
        sqft: numOrNull(form.sqft),
        lotSize: form.lotSize,
        description: form.description,
        features,
        status: form.status,
        openHouses: form.openHouses,
      }),
    });
    setBusy(null);
    if (d) {
      setListing(d);
      setForm(seedForm(d));
    }
  }

  function addOpenHouse() {
    if (!form) return;
    setForm({ ...form, openHouses: [...form.openHouses, { date: "", start: "", end: "" }] });
  }

  function updateOpenHouse(i: number, patch: Partial<OpenHouse>) {
    if (!form) return;
    const next = form.openHouses.slice();
    next[i] = { ...next[i], ...patch };
    setForm({ ...form, openHouses: next });
  }

  function removeOpenHouse(i: number) {
    if (!form) return;
    setForm({ ...form, openHouses: form.openHouses.filter((_, j) => j !== i) });
  }

  async function publish() {
    if (!listing) return;
    if (!confirm("Publish this listing to brendavegarealty.com?")) return;
    setErr(null);
    setBusy("Publishing…");
    let r: Response;
    try {
      r = await fetch(`/api/studio/listing/${listing.id}/publish`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crossPost }),
      });
    } catch {
      setBusy(null);
      setErr("Network error — check your connection and try again.");
      return;
    }
    setBusy(null);
    if (r.status === 401) {
      window.location.reload();
      return;
    }
    if (!r.ok) {
      setErr("Publish failed — try again.");
      return;
    }
    const j = (await r.json()) as { listing: Listing; crossPosted: boolean };
    setListing(j.listing);
    setForm(seedForm(j.listing));
    alert(`Published! View it at https://brendavegarealty.com/listings/${j.listing.slug}`);
  }

  async function unpublish() {
    if (!listing) return;
    if (!confirm("Unpublish this listing? It will no longer be visible at its live URL.")) return;
    setErr(null);
    setBusy("Unpublishing…");
    const d = await api(`/api/studio/listing/${id}/unpublish`, { method: "POST" });
    setBusy(null);
    if (d) {
      setListing(d);
      setForm(seedForm(d));
    }
  }

  async function remove() {
    if (!listing) return;
    if (!confirm("Delete this draft listing? This can't be undone.")) return;
    await fetch(`/api/studio/listing/${listing.id}`, { method: "DELETE", credentials: "include" });
    router.push("/studio/listings");
  }

  return (
    <div className="space-y-6">
      {needsInfo && !listing.live && (
        <div className="bg-gold/10 border border-gold/30 rounded-xl p-4 font-body text-sm text-charcoal">
          We grabbed the photos — fill in the details below.
        </div>
      )}

      {/* Photo grid */}
      {listing.photoKeys.length > 0 && (
        <div>
          <span className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Photos</span>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {listing.photoKeys.map((key, i) => (
              <div key={key} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/media/${key}`}
                  alt=""
                  onClick={() => setCover(i)}
                  className={`w-full aspect-square object-cover rounded-md cursor-pointer ${
                    i === listing.coverIndex ? "ring-2 ring-gold" : ""
                  }`}
                />
                {i === listing.coverIndex && (
                  <span className="absolute top-1 left-1 bg-gold text-navy font-ui text-[0.55rem] tracking-wider uppercase px-1.5 py-0.5 rounded">
                    Cover
                  </span>
                )}
                <button
                  aria-label="Remove photo"
                  onClick={() => removePhoto(i)}
                  className="absolute -top-1.5 -right-1.5 bg-navy text-cream rounded-full w-5 h-5 text-[0.65rem] leading-none flex items-center justify-center"
                >
                  ✕
                </button>
                <div className="absolute bottom-1 right-1 flex gap-0.5">
                  <button
                    aria-label="Move earlier"
                    onClick={() => movePhoto(i, -1)}
                    disabled={i === 0}
                    className="bg-white/90 text-navy rounded w-5 h-5 text-[0.65rem] leading-none flex items-center justify-center disabled:opacity-30"
                  >
                    ←
                  </button>
                  <button
                    aria-label="Move later"
                    onClick={() => movePhoto(i, 1)}
                    disabled={i === listing.photoKeys.length - 1}
                    className="bg-white/90 text-navy rounded w-5 h-5 text-[0.65rem] leading-none flex items-center justify-center disabled:opacity-30"
                  >
                    →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fields */}
      <label className="block">
        <span className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Address</span>
        <input
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className="mt-2 w-full bg-white border border-navy/10 rounded-xl p-4 font-body text-base focus:outline-none focus:border-teal"
        />
      </label>

      <label className="block">
        <span className="font-ui text-xs tracking-wider uppercase text-charcoal-light">City</span>
        <input
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
          className="mt-2 w-full bg-white border border-navy/10 rounded-xl p-4 font-body text-base focus:outline-none focus:border-teal"
        />
      </label>

      <label className="block">
        <span className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Price</span>
        <input
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          placeholder="$1,595,000"
          className="mt-2 w-full bg-white border border-navy/10 rounded-xl p-4 font-body text-base focus:outline-none focus:border-teal"
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Beds</span>
          <input
            type="number"
            value={form.beds}
            onChange={(e) => setForm({ ...form, beds: e.target.value })}
            className="mt-2 w-full bg-white border border-navy/10 rounded-xl p-4 font-body text-base focus:outline-none focus:border-teal"
          />
        </label>
        <label className="block">
          <span className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Baths</span>
          <input
            type="number"
            value={form.baths}
            onChange={(e) => setForm({ ...form, baths: e.target.value })}
            className="mt-2 w-full bg-white border border-navy/10 rounded-xl p-4 font-body text-base focus:outline-none focus:border-teal"
          />
        </label>
        <label className="block">
          <span className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Sqft</span>
          <input
            type="number"
            value={form.sqft}
            onChange={(e) => setForm({ ...form, sqft: e.target.value })}
            className="mt-2 w-full bg-white border border-navy/10 rounded-xl p-4 font-body text-base focus:outline-none focus:border-teal"
          />
        </label>
        <label className="block">
          <span className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Lot size</span>
          <input
            value={form.lotSize}
            onChange={(e) => setForm({ ...form, lotSize: e.target.value })}
            placeholder="1.8 acres"
            className="mt-2 w-full bg-white border border-navy/10 rounded-xl p-4 font-body text-base focus:outline-none focus:border-teal"
          />
        </label>
      </div>

      <label className="block">
        <span className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Description</span>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={6}
          className="mt-2 w-full bg-white border border-navy/10 rounded-xl p-4 font-body text-base leading-relaxed focus:outline-none focus:border-teal"
        />
      </label>

      <label className="block">
        <span className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Features (one per line)</span>
        <textarea
          value={form.featuresText}
          onChange={(e) => setForm({ ...form, featuresText: e.target.value })}
          rows={5}
          placeholder={"Updated kitchen\nHardwood floors\nPool"}
          className="mt-2 w-full bg-white border border-navy/10 rounded-xl p-4 font-body text-base leading-relaxed focus:outline-none focus:border-teal"
        />
      </label>

      {/* Status */}
      <div>
        <span className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Status</span>
        <div className="mt-2 flex gap-2 flex-wrap">
          {LISTING_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setForm({ ...form, status: s })}
              className={`font-ui text-xs tracking-wider uppercase px-4 py-2.5 rounded-full transition-colors ${
                form.status === s ? "bg-navy text-cream" : "bg-white text-charcoal-light border border-navy/10"
              }`}
            >
              {LISTING_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Open houses */}
      <div>
        <div className="flex items-center justify-between">
          <span className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Open Houses</span>
          <button onClick={addOpenHouse} className="font-ui text-[0.65rem] tracking-wider uppercase text-teal">
            + Add
          </button>
        </div>
        <div className="mt-2 space-y-2">
          {form.openHouses.length === 0 && (
            <div className="font-body text-sm text-charcoal-light">No open houses scheduled.</div>
          )}
          {form.openHouses.map((oh, i) => (
            <div key={i} className="flex items-center gap-2 bg-white border border-navy/10 rounded-xl p-3">
              <input
                type="date"
                value={oh.date}
                onChange={(e) => updateOpenHouse(i, { date: e.target.value })}
                className="min-w-0 flex-1 font-body text-sm focus:outline-none"
              />
              <input
                type="time"
                value={oh.start}
                onChange={(e) => updateOpenHouse(i, { start: e.target.value })}
                className="min-w-0 flex-1 font-body text-sm focus:outline-none"
              />
              <input
                type="time"
                value={oh.end}
                onChange={(e) => updateOpenHouse(i, { end: e.target.value })}
                className="min-w-0 flex-1 font-body text-sm focus:outline-none"
              />
              <button
                aria-label="Remove open house"
                onClick={() => removeOpenHouse(i)}
                className="text-red-600 shrink-0"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {err && <div className="text-sm text-red-600 font-body">{err}</div>}

      <button
        onClick={save}
        disabled={!!busy}
        className="w-full bg-navy text-cream font-ui font-medium text-sm tracking-wider uppercase py-4 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-60"
      >
        {busy ?? "Save Changes"}
      </button>

      {/* Publish section */}
      <div className="border-t border-gold/20 pt-6 space-y-4">
        {!listing.live && (
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={crossPost}
              onChange={(e) => setCrossPost(e.target.checked)}
              className="w-5 h-5 accent-teal"
            />
            <span className="font-body text-sm text-charcoal">Also post to my homepage feed</span>
          </label>
        )}

        {listing.live ? (
          <>
            <a
              href={`https://brendavegarealty.com/listings/${listing.slug}`}
              target="_blank"
              rel="noreferrer"
              className="block w-full text-center bg-white border border-navy/10 text-navy font-ui font-medium text-sm tracking-wider uppercase py-4 rounded-xl active:scale-[0.98] transition-transform"
            >
              View live page
            </a>
            <button
              onClick={unpublish}
              disabled={!!busy}
              className="w-full bg-white border border-navy/10 text-charcoal-light font-ui font-medium text-sm tracking-wider uppercase py-4 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              Unpublish
            </button>
          </>
        ) : (
          <button
            onClick={publish}
            disabled={!!busy}
            className="w-full bg-teal text-white font-ui font-medium text-sm tracking-wider uppercase py-4 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            Publish
          </button>
        )}

        {!listing.live && (
          <button onClick={remove} className="w-full text-red-600 font-ui text-xs tracking-wider uppercase py-2">
            Delete Draft
          </button>
        )}
      </div>
    </div>
  );
}
