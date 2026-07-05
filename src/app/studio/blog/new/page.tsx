"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StudioShell } from "@/components/studio/StudioShell";
import { BLOG_CATEGORIES, slugify } from "@/lib/blogStudio";
import { blogPosts } from "@/data/blog-posts";

export default function NewBlogPage() {
  return (
    <StudioShell title="New Blog Post" backHref="/studio/blog">
      <NewBlogForm />
    </StudioShell>
  );
}

function NewBlogForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(BLOG_CATEGORIES[0]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function create() {
    setErr(null);
    let slug = slugify(title);
    if (!slug) {
      setErr("Give the post a title first.");
      return;
    }
    const taken = new Set(blogPosts.map((p) => p.slug));
    let n = 2;
    const base = slug;
    while (taken.has(slug)) slug = `${base}-${n++}`;
    setBusy(true);
    try {
      const r = await fetch("/api/studio/blog", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), category, rawNotes: notes, slug }),
      });
      if (!r.ok) throw new Error(((await r.json()) as { error?: string }).error ?? "failed");
      const j = (await r.json()) as { draft: { id: string } };
      router.push(`/studio/blog/edit?id=${j.draft.id}`);
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <label className="block">
        <span className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Campbell Market Check-In: July 2026"
          className="mt-2 w-full bg-white border border-navy/10 rounded-xl p-4 font-body text-base focus:outline-none focus:border-teal"
        />
      </label>

      <div className="flex gap-2 flex-wrap">
        {BLOG_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`font-ui text-xs tracking-wider uppercase px-4 py-2.5 rounded-full transition-colors ${
              category === c ? "bg-navy text-cream" : "bg-white text-charcoal-light border border-navy/10"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="font-ui text-xs tracking-wider uppercase text-charcoal-light">Your notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={10}
          placeholder={"Rough notes are perfect — bullet points, voice-memo style, whatever.\n\nThe AI will turn them into a full post in your voice, and you approve it before anything goes live."}
          className="mt-2 w-full bg-white border border-navy/10 rounded-xl p-4 font-body text-base leading-relaxed focus:outline-none focus:border-teal"
        />
      </label>

      {err && <div className="text-sm text-red-600 font-body">{err}</div>}

      <button
        onClick={create}
        disabled={busy || !title.trim()}
        className="w-full bg-teal text-white font-ui font-medium text-sm tracking-wider uppercase py-4 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save & Continue"}
      </button>
    </div>
  );
}
