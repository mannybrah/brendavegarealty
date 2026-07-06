"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StudioShell } from "@/components/studio/StudioShell";
import { uploadImage } from "@/lib/imageResize";
import { FEED_TYPES, FEED_TYPE_LABELS, FeedType } from "@/lib/feed";

export default function NewUpdatePage() {
  return (
    <StudioShell title="Post an Update" backHref="/studio">
      <UpdateForm />
    </StudioShell>
  );
}

function UpdateForm() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<FeedType>("update");
  const [caption, setCaption] = useState("");
  const [link, setLink] = useState("");
  const [previews, setPreviews] = useState<{ url: string; file: File }[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function pickFiles(list: FileList | null) {
    if (!list) return;
    const next = [...previews];
    for (const f of Array.from(list)) {
      if (next.length >= 4) break;
      next.push({ url: URL.createObjectURL(f), file: f });
    }
    setPreviews(next);
  }

  async function post() {
    setErr(null);
    if (!caption.trim() && previews.length === 0) {
      setErr("Add a photo or write a caption first.");
      return;
    }
    try {
      const imageKeys: string[] = [];
      for (let i = 0; i < previews.length; i++) {
        setBusy(`Uploading photo ${i + 1} of ${previews.length}…`);
        imageKeys.push(await uploadImage(previews[i].file, "feed"));
      }
      setBusy("Posting…");
      const r = await fetch("/api/studio/feed", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, caption: caption.trim(), imageKeys, ...(link.trim() ? { link: link.trim() } : {}) }),
      });
      if (!r.ok) throw new Error(((await r.json()) as { error?: string }).error ?? "failed");
      router.push("/studio");
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e));
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Photos */}
      <div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => pickFiles(e.target.files)}
        />
        <div className="grid grid-cols-4 gap-2">
          {previews.map((p, i) => (
            <div key={p.url} className="relative aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="w-full h-full object-cover rounded-xl" />
              <button
                aria-label="Remove photo"
                onClick={() => setPreviews(previews.filter((_, j) => j !== i))}
                className="absolute -top-1.5 -right-1.5 bg-navy text-cream rounded-full w-6 h-6 text-xs"
              >
                ✕
              </button>
            </div>
          ))}
          {previews.length < 4 && (
            <button
              onClick={() => fileInput.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-navy/20 text-navy/50 text-3xl hover:border-teal/50 transition-colors"
            >
              +
            </button>
          )}
        </div>
      </div>

      {/* Type */}
      <div className="flex gap-2 flex-wrap">
        {FEED_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`font-ui text-xs tracking-wider uppercase px-4 py-2.5 rounded-full transition-colors ${
              type === t ? "bg-navy text-cream" : "bg-white text-charcoal-light border border-navy/10"
            }`}
          >
            {FEED_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Caption */}
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        rows={4}
        maxLength={1000}
        placeholder="Write a caption… (e.g. Just listed in Campbell — 3 bed, 2 bath, open Sat 1-4)"
        className="w-full bg-white border border-navy/10 rounded-xl p-4 font-body text-base focus:outline-none focus:border-teal"
      />

      <input
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="Link (optional) — e.g. /listings/… or https://…"
        className="w-full bg-white border border-navy/10 rounded-xl p-4 font-body text-sm focus:outline-none focus:border-teal"
      />

      {err && <div className="text-sm text-red-600 font-body">{err}</div>}

      <button
        onClick={post}
        disabled={!!busy}
        className="w-full bg-teal text-white font-ui font-medium text-sm tracking-wider uppercase py-4 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-60"
      >
        {busy ?? "Post to Website"}
      </button>
    </div>
  );
}
