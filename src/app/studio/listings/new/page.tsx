"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StudioShell } from "@/components/studio/StudioShell";
import { Listing } from "@/lib/listing";

export default function NewListingPage() {
  return (
    <StudioShell title="Add a Listing" backHref="/studio/listings">
      <NewListingForm />
    </StudioShell>
  );
}

function NewListingForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function pull() {
    setErr(null);
    const trimmed = url.trim();
    if (!trimmed) {
      setErr("Paste the listing site URL first.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/studio/listing/extract", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      if (r.status === 401) {
        window.location.reload();
        return;
      }
      if (!r.ok) {
        throw new Error(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "Could not pull that listing");
      }
      const j = (await r.json()) as { listing: Listing; extractionFailed?: boolean };
      router.push(`/studio/listings/edit?id=${j.listing.id}${j.extractionFailed ? "&needsInfo=1" : ""}`);
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="font-body text-sm text-charcoal-light leading-relaxed">
        Paste the link to a listing marketing site (like the one your MLS system or photographer sends you), and
        we&rsquo;ll pull the photos, facts, and description into an editable page on your own website.
      </p>

      <label className="block">
        <span className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Listing URL</span>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://15540armsby.com"
          inputMode="url"
          className="mt-2 w-full bg-white border border-navy/10 rounded-xl p-4 font-body text-base focus:outline-none focus:border-teal"
        />
      </label>

      {err && <div className="text-sm text-red-600 font-body">{err}</div>}

      <button
        onClick={pull}
        disabled={busy || !url.trim()}
        className="w-full bg-teal text-white font-ui font-medium text-sm tracking-wider uppercase py-4 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-60"
      >
        {busy ? "Pulling photos and details…" : "Pull Listing Details"}
      </button>

      {busy && (
        <p className="font-body text-xs text-charcoal-light text-center leading-relaxed">
          Pulling photos and details… this can take a minute. Don&rsquo;t close the app.
        </p>
      )}
    </div>
  );
}
