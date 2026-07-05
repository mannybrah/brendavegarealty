"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StudioShell } from "@/components/studio/StudioShell";
import { BlogDraft } from "@/lib/blogStudio";
import { uploadImage } from "@/lib/imageResize";

export default function EditBlogPage() {
  return (
    <StudioShell title="Blog Post" backHref="/studio/blog">
      <Suspense fallback={<div className="font-body text-sm text-charcoal-light">Loading…</div>}>
        <EditBlog />
      </Suspense>
    </StudioShell>
  );
}

function EditBlog() {
  const router = useRouter();
  const id = useSearchParams().get("id");
  const fileInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<BlogDraft | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showHtml, setShowHtml] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/studio/blog/${id}`, { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { draft: BlogDraft } | null) => {
        if (j) {
          setDraft(j.draft);
          setNotes(j.draft.rawNotes);
        }
      })
      .catch(() => {});
  }, [id]);

  if (!id) return <div className="font-body text-sm text-charcoal-light">Missing post id.</div>;
  if (!draft) return <div className="font-body text-sm text-charcoal-light">Loading…</div>;

  async function api(path: string, init: RequestInit): Promise<BlogDraft | null> {
    const r = await fetch(path, { credentials: "include", ...init });
    if (r.status === 401) {
      window.location.reload();
      return null;
    }
    if (!r.ok) {
      setErr(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "Something went wrong");
      return null;
    }
    const j = (await r.json()) as { draft: BlogDraft };
    return j.draft;
  }

  async function saveNotes(): Promise<boolean> {
    const d = await api(`/api/studio/blog/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawNotes: notes }),
    });
    if (d) setDraft(d);
    return !!d;
  }

  async function polish() {
    setErr(null);
    setBusy("Saving notes…");
    if (!(await saveNotes())) {
      setBusy(null);
      return;
    }
    setBusy("Writing your post… (about 30 seconds)");
    const d = await api(`/api/studio/blog/${id}/polish`, { method: "POST" });
    if (d) setDraft(d);
    setBusy(null);
  }

  async function patchPolished(field: "title" | "excerpt" | "contentHtml", value: string) {
    const d = await api(`/api/studio/blog/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ polished: { [field]: value } }),
    });
    if (d) setDraft(d);
  }

  async function addHero(f: File | null) {
    if (!f) return;
    setBusy("Uploading photo…");
    try {
      const key = await uploadImage(f, "blog");
      const d = await api(`/api/studio/blog/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heroImageKey: key }),
      });
      if (d) setDraft(d);
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e));
    }
    setBusy(null);
  }

  async function publish() {
    if (!confirm("Publish this post to brendavegarealty.com? It will be live in a few minutes.")) return;
    setErr(null);
    setBusy("Publishing…");
    const r = await fetch(`/api/studio/blog/${id}/publish`, { method: "POST", credentials: "include" });
    setBusy(null);
    if (!r.ok) {
      setErr("Publish failed — try again.");
      return;
    }
    const j = (await r.json()) as { draft: BlogDraft; dispatched: boolean };
    setDraft(j.draft);
    alert(
      j.dispatched
        ? "Published! Your post will be live in about 3 minutes."
        : "Published! The deploy couldn't start right now, so it will be live by tomorrow morning at the latest."
    );
    router.push("/studio/blog");
  }

  async function remove() {
    if (!confirm("Delete this draft?")) return;
    await fetch(`/api/studio/blog/${id}`, { method: "DELETE", credentials: "include" });
    router.push("/studio/blog");
  }

  const p = draft.polished;

  return (
    <div className="space-y-6">
      <div className="font-ui text-[0.65rem] tracking-wider uppercase text-charcoal-light">
        {draft.category} · {draft.status}
        {draft.publishedAt ? ` · published ${draft.publishedAt}` : ""}
      </div>

      {/* Notes + polish */}
      <label className="block">
        <span className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Your notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={6}
          className="mt-2 w-full bg-white border border-navy/10 rounded-xl p-4 font-body text-base leading-relaxed focus:outline-none focus:border-teal"
        />
      </label>
      <button
        onClick={polish}
        disabled={!!busy || !notes.trim()}
        className="w-full bg-navy text-cream font-ui font-medium text-sm tracking-wider uppercase py-4 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-60"
      >
        {busy ?? (p ? "↻ Re-write with AI" : "✨ Write it with AI")}
      </button>

      {err && <div className="text-sm text-red-600 font-body">{err}</div>}

      {/* Polished preview + edits */}
      {p && (
        <div className="space-y-4">
          <input
            defaultValue={p.title}
            onBlur={(e) => e.target.value !== p.title && patchPolished("title", e.target.value)}
            className="w-full bg-white border border-navy/10 rounded-xl p-4 font-display text-xl text-navy focus:outline-none focus:border-teal"
          />
          <textarea
            defaultValue={p.excerpt}
            onBlur={(e) => e.target.value !== p.excerpt && patchPolished("excerpt", e.target.value)}
            rows={2}
            className="w-full bg-white border border-navy/10 rounded-xl p-4 font-body text-sm focus:outline-none focus:border-teal"
          />

          {/* Hero photo */}
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => addHero(e.target.files?.[0] ?? null)} />
          {draft.heroImageKey ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/media/${draft.heroImageKey}`}
              alt=""
              onClick={() => fileInput.current?.click()}
              className="w-full h-44 object-cover rounded-xl cursor-pointer"
            />
          ) : (
            <button
              onClick={() => fileInput.current?.click()}
              className="w-full py-4 rounded-xl border-2 border-dashed border-navy/20 text-charcoal-light font-ui text-xs tracking-wider uppercase"
            >
              + Add cover photo (optional)
            </button>
          )}

          <div className="flex items-center justify-between">
            <span className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Preview</span>
            <button onClick={() => setShowHtml(!showHtml)} className="font-ui text-[0.65rem] tracking-wider uppercase text-teal">
              {showHtml ? "Show preview" : "Edit text"}
            </button>
          </div>
          {showHtml ? (
            <textarea
              defaultValue={p.contentHtml}
              onBlur={(e) => e.target.value !== p.contentHtml && patchPolished("contentHtml", e.target.value)}
              rows={16}
              className="w-full bg-white border border-navy/10 rounded-xl p-4 font-mono text-xs leading-relaxed focus:outline-none focus:border-teal"
            />
          ) : (
            <div
              className="bg-white border border-navy/5 rounded-xl p-5 prose-sm font-body text-charcoal [&_h2]:font-display [&_h2]:text-navy [&_h2]:text-xl [&_h2]:mt-6 [&_h2]:mb-2 [&_p]:my-3 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:text-navy"
              dangerouslySetInnerHTML={{ __html: p.contentHtml }}
            />
          )}

          <button
            onClick={publish}
            disabled={!!busy}
            className="w-full bg-teal text-white font-ui font-medium text-sm tracking-wider uppercase py-4 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            {draft.status === "published" ? "Republish Changes" : "Publish to Website"}
          </button>
        </div>
      )}

      {draft.status !== "published" && (
        <button onClick={remove} className="w-full text-red-600 font-ui text-xs tracking-wider uppercase py-2">
          Delete Draft
        </button>
      )}
    </div>
  );
}
