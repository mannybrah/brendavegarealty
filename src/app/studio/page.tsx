"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StudioShell } from "@/components/studio/StudioShell";
import { FeedPost, FEED_TYPE_LABELS, relativeTime } from "@/lib/feed";
import { BlogDraft } from "@/lib/blogStudio";

const ACTIONS = [
  { href: "/studio/feed/new", label: "Post an Update", desc: "Photo + caption → homepage, instantly", icon: "📸" },
  { href: "/studio/blog", label: "Write a Blog", desc: "Notes → polished post, live in minutes", icon: "✍️" },
  { href: "/studio/announcement", label: "Announcement", desc: "One-line banner across the site", icon: "📣" },
  { href: "/studio/calendar", label: "Video Calendar", desc: "Your YouTube Shorts workflow", icon: "🎬" },
  { href: "/studio/listings", label: "Listings", desc: "Paste a listing site — get a page on yours", icon: "🏡", span: true },
];

export default function StudioHomePage() {
  return (
    <StudioShell title="Hi Brenda">
      <HomeInner />
    </StudioShell>
  );
}

function HomeInner() {
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [drafts, setDrafts] = useState<BlogDraft[]>([]);

  useEffect(() => {
    fetch("/api/public/home-state", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setFeed((j.feedPosts ?? []).slice(0, 3)))
      .catch(() => {});
    fetch("/api/studio/blog", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { drafts: [] }))
      .then((j) => setDrafts((j.drafts ?? []).slice(0, 3)))
      .catch(() => {});
  }, []);

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {ACTIONS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className={`bg-white rounded-2xl border border-navy/5 p-5 hover:border-teal/40 active:scale-[0.98] transition-all min-h-[130px] flex flex-col ${
              a.span ? "col-span-2" : ""
            }`}
          >
            <span className="text-2xl mb-2">{a.icon}</span>
            <span className="font-display font-normal text-base text-navy leading-snug">{a.label}</span>
            <span className="font-body font-light text-xs text-charcoal-light mt-1 leading-snug">{a.desc}</span>
          </Link>
        ))}
      </div>

      {feed.length > 0 && (
        <section className="mt-8">
          <h2 className="font-ui text-xs tracking-wider uppercase text-charcoal-light mb-3">Recent updates</h2>
          <div className="bg-white rounded-2xl border border-navy/5 divide-y divide-navy/5">
            {feed.map((p) => (
              <Link key={p.id} href={`/studio/feed/edit?id=${p.id}`} className="flex items-center gap-3 p-4">
                {p.imageKeys[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/media/${p.imageKeys[0]}`} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
                ) : (
                  <span className="w-11 h-11 rounded-lg bg-gold/15 flex items-center justify-center shrink-0">📣</span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-body text-sm text-navy truncate">{p.caption || FEED_TYPE_LABELS[p.type]}</div>
                  <div className="font-ui text-[0.65rem] tracking-wider uppercase text-charcoal-light mt-0.5">
                    {FEED_TYPE_LABELS[p.type]} · {relativeTime(p.createdAt)}
                  </div>
                </div>
                <span className="text-charcoal-light">→</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {drafts.length > 0 && (
        <section className="mt-8">
          <h2 className="font-ui text-xs tracking-wider uppercase text-charcoal-light mb-3">Recent blog posts</h2>
          <div className="bg-white rounded-2xl border border-navy/5 divide-y divide-navy/5">
            {drafts.map((d) => (
              <Link key={d.id} href={`/studio/blog/edit?id=${d.id}`} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="font-body text-sm text-navy truncate">{d.title}</div>
                  <div className="font-ui text-[0.65rem] tracking-wider uppercase text-charcoal-light mt-0.5">
                    {d.status}{d.publishedAt ? ` · ${d.publishedAt}` : ""}
                  </div>
                </div>
                <span className="text-charcoal-light">→</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
