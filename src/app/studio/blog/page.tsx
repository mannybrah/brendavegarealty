"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StudioShell } from "@/components/studio/StudioShell";
import { BlogDraft } from "@/lib/blogStudio";

const STATUS_STYLE: Record<BlogDraft["status"], string> = {
  draft: "bg-navy/10 text-charcoal-light",
  polished: "bg-gold/20 text-gold",
  published: "bg-teal/15 text-teal",
};

export default function BlogListPage() {
  return (
    <StudioShell title="Blog" backHref="/studio">
      <BlogList />
    </StudioShell>
  );
}

function BlogList() {
  const [drafts, setDrafts] = useState<BlogDraft[] | null>(null);

  useEffect(() => {
    fetch("/api/studio/blog", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { drafts: [] }))
      .then((j: { drafts: BlogDraft[] }) => setDrafts(j.drafts))
      .catch(() => setDrafts([]));
  }, []);

  return (
    <div className="space-y-4">
      <Link
        href="/studio/blog/new"
        className="block w-full bg-teal text-white text-center font-ui font-medium text-sm tracking-wider uppercase py-4 rounded-xl active:scale-[0.98] transition-transform"
      >
        + New Post
      </Link>
      {drafts === null && <div className="font-body text-sm text-charcoal-light">Loading…</div>}
      {drafts !== null && drafts.length === 0 && (
        <div className="font-body text-sm text-charcoal-light">No studio posts yet. Write your first one!</div>
      )}
      {drafts !== null && drafts.length > 0 && (
        <div className="bg-white rounded-2xl border border-navy/5 divide-y divide-navy/5">
          {drafts.map((d) => (
            <Link key={d.id} href={`/studio/blog/edit?id=${d.id}`} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="font-body text-sm text-navy truncate">{d.title}</div>
                <div className="font-ui text-[0.65rem] tracking-wider uppercase text-charcoal-light mt-0.5">
                  {d.category}{d.publishedAt ? ` · ${d.publishedAt}` : ""}
                </div>
              </div>
              <span className={`font-ui text-[0.6rem] tracking-wider uppercase px-2.5 py-1 rounded-full shrink-0 ${STATUS_STYLE[d.status]}`}>
                {d.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
