"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StudioShell } from "@/components/studio/StudioShell";
import { Announcement } from "@/lib/feed";

export default function AnnouncementPage() {
  return (
    <StudioShell title="Announcement" backHref="/studio">
      <AnnouncementForm />
    </StudioShell>
  );
}

function AnnouncementForm() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/public/home-state", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { announcement: Announcement | null }) => {
        if (j.announcement) {
          setText(j.announcement.text);
          setLink(j.announcement.link ?? "");
          setActive(j.announcement.active);
        }
      })
      .catch(() => {});
  }, []);

  async function save() {
    setBusy(true);
    setErr(null);
    const r = await fetch("/api/studio/announcement", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim(), link: link.trim() || undefined, active }),
    });
    setBusy(false);
    if (r.status === 401) {
      window.location.reload();
      return;
    }
    if (!r.ok) {
      setErr("Couldn't save — try again.");
      return;
    }
    router.push("/studio");
  }

  return (
    <div className="space-y-6">
      <p className="font-body font-light text-sm text-charcoal-light">
        Shows as a slim banner at the very top of every page. Perfect for open houses and events.
      </p>

      {/* Live preview */}
      {active && text.trim() && (
        <div className="bg-navy border-b border-gold/25 rounded-lg py-2 px-8 text-center relative">
          <span className="font-ui text-[0.7rem] tracking-[0.12em] uppercase text-cream">
            {text.trim()}
            {link.trim() && <span className="ml-2 text-gold underline underline-offset-2">Details →</span>}
          </span>
        </div>
      )}

      <label className="block">
        <span className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Banner text</span>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={200}
          placeholder="Open house this Sat 1-4pm — 123 Main St, Campbell"
          className="mt-2 w-full bg-white border border-navy/10 rounded-xl p-4 font-body text-base focus:outline-none focus:border-teal"
        />
      </label>

      <label className="block">
        <span className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Link (optional)</span>
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://… or /contact"
          className="mt-2 w-full bg-white border border-navy/10 rounded-xl p-4 font-body text-base focus:outline-none focus:border-teal"
        />
      </label>

      <button
        onClick={() => setActive(!active)}
        className={`w-full font-ui text-sm tracking-wider uppercase py-4 rounded-xl border transition-colors ${
          active ? "bg-teal/10 border-teal text-teal" : "bg-white border-navy/10 text-charcoal-light"
        }`}
      >
        {active ? "● Banner is ON" : "○ Banner is OFF"}
      </button>

      {err && <div className="text-sm text-red-600 font-body">{err}</div>}

      <button
        onClick={save}
        disabled={busy || (active && !text.trim())}
        className="w-full bg-teal text-white font-ui font-medium text-sm tracking-wider uppercase py-4 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
