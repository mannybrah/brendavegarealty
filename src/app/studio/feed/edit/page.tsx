"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StudioShell } from "@/components/studio/StudioShell";
import { FeedPost, FEED_TYPES, FEED_TYPE_LABELS, FeedType } from "@/lib/feed";

export default function EditUpdatePage() {
  return (
    <StudioShell title="Edit Update" backHref="/studio">
      <Suspense fallback={<div className="font-body text-sm text-charcoal-light">Loading…</div>}>
        <EditForm />
      </Suspense>
    </StudioShell>
  );
}

function EditForm() {
  const router = useRouter();
  const id = useSearchParams().get("id");
  const [post, setPost] = useState<FeedPost | null>(null);
  const [caption, setCaption] = useState("");
  const [type, setType] = useState<FeedType>("update");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch("/api/public/home-state", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { feedPosts: FeedPost[] }) => {
        const p = j.feedPosts.find((x) => x.id === id) ?? null;
        setPost(p);
        if (p) {
          setCaption(p.caption);
          setType(p.type);
        }
      })
      .catch(() => {});
  }, [id]);

  if (!id) return <div className="font-body text-sm text-charcoal-light">Missing update id.</div>;
  if (!post) return <div className="font-body text-sm text-charcoal-light">Loading…</div>;

  async function save() {
    setBusy(true);
    setErr(null);
    const r = await fetch(`/api/studio/feed/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption, type }),
    });
    setBusy(false);
    if (!r.ok) {
      if (r.status === 401) {
        window.location.reload();
        return;
      }
      setErr(((await r.json()) as { error?: string }).error ?? "failed");
      return;
    }
    router.push("/studio");
  }

  async function remove() {
    if (!confirm("Delete this update from the website?")) return;
    setBusy(true);
    await fetch(`/api/studio/feed/${id}`, { method: "DELETE", credentials: "include" });
    router.push("/studio");
  }

  return (
    <div className="space-y-6">
      {post.imageKeys.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {post.imageKeys.map((k) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={k} src={`/media/${k}`} alt="" className="aspect-square w-full object-cover rounded-xl" />
          ))}
        </div>
      )}
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
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        rows={4}
        maxLength={1000}
        className="w-full bg-white border border-navy/10 rounded-xl p-4 font-body text-base focus:outline-none focus:border-teal"
      />
      {err && <div className="text-sm text-red-600 font-body">{err}</div>}
      <button
        onClick={save}
        disabled={busy}
        className="w-full bg-teal text-white font-ui font-medium text-sm tracking-wider uppercase py-4 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-60"
      >
        Save Changes
      </button>
      <button onClick={remove} disabled={busy} className="w-full text-red-600 font-ui text-xs tracking-wider uppercase py-2">
        Delete Update
      </button>
    </div>
  );
}
