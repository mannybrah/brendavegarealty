"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { blogPosts } from "@/data/blog-posts";
import { StudioShell } from "@/components/studio/StudioShell";
import {
  WorkflowState,
  StateResponse,
  WORKFLOW_STEPS,
  stepsDone,
  isComplete,
  isPastDue,
  isPublished,
  mondayOf,
  formatDateShort,
} from "@/lib/studio";

export default function StudioCalendarPage() {
  return (
    <StudioShell title="Video Calendar" backHref="/studio">
      <Dashboard />
    </StudioShell>
  );
}

function Dashboard() {
  const [state, setState] = useState<Record<string, WorkflowState>>({});
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "in-progress" | "done" | "overdue">("all");

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const r = await fetch("/api/studio/state", { credentials: "include" });
        if (!r.ok) return;
        const j = (await r.json()) as StateResponse;
        setState(j.state || {});
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalComplete = useMemo(
    () => blogPosts.filter((p) => isComplete(state[p.slug])).length,
    [state]
  );

  const thisWeek = useMemo(() => {
    const now = new Date();
    const monday = mondayOf(now.toISOString().slice(0, 10));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 7);
    return blogPosts
      .filter((p) => {
        const d = new Date(p.date + "T00:00:00");
        return d >= monday && d < sunday;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, []);

  const filteredPosts = useMemo(() => {
    const sorted = [...blogPosts].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.filter((p) => {
      const s = state[p.slug];
      const done = isComplete(s);
      const overdue = isPastDue(p.date, s);
      if (filter === "done") return done;
      if (filter === "in-progress") return !done;
      if (filter === "overdue") return overdue;
      return true;
    });
  }, [state, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof blogPosts>();
    for (const p of filteredPosts) {
      const monday = mondayOf(p.date);
      const key = monday.toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredPosts]);

  return (
    <>
      <div className="font-body font-light text-sm text-charcoal-light mb-6">
        {totalComplete} of {blogPosts.length} videos complete
      </div>

      {/* This Week */}
      {thisWeek.length > 0 && (
        <section className="mb-10">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-display font-light text-2xl text-navy">
              This Week
            </h2>
            <span className="font-ui text-xs tracking-wider uppercase text-charcoal-light">
              {thisWeek.length} post{thisWeek.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="grid gap-3 tablet:grid-cols-3">
            {thisWeek.map((p) => (
              <ThisWeekCard key={p.slug} post={p} s={state[p.slug]} />
            ))}
          </div>
        </section>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto">
        {[
          { k: "all", label: "All" },
          { k: "in-progress", label: "In progress" },
          { k: "done", label: "Done" },
          { k: "overdue", label: "Overdue" },
        ].map((f) => (
          <button
            key={f.k}
            onClick={() => setFilter(f.k as "all" | "in-progress" | "done" | "overdue")}
            className={`font-ui text-xs tracking-wider uppercase px-4 py-2 rounded whitespace-nowrap transition-colors ${
              filter === f.k
                ? "bg-navy text-cream"
                : "bg-white text-charcoal-light hover:bg-navy/5"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grouped list */}
      <section className="space-y-6">
        {loading && filteredPosts.length === 0 && (
          <div className="text-sm text-charcoal-light font-body">Loading…</div>
        )}
        {grouped.map(([weekKey, posts]) => (
          <div key={weekKey}>
            <div className="font-ui text-xs tracking-wider uppercase text-charcoal-light mb-2">
              Week of {formatDateShort(weekKey)}
            </div>
            <div className="bg-white rounded-lg border border-navy/5 divide-y divide-navy/5">
              {posts.map((p) => (
                <PostRow key={p.slug} post={p} s={state[p.slug]} />
              ))}
            </div>
          </div>
        ))}
        {!loading && grouped.length === 0 && (
          <div className="text-sm text-charcoal-light font-body">
            Nothing matches that filter.
          </div>
        )}
      </section>
    </>
  );
}

function ThisWeekCard({
  post,
  s,
}: {
  post: (typeof blogPosts)[number];
  s: WorkflowState | undefined;
}) {
  const done = stepsDone(s);
  const overdue = isPastDue(post.date, s);
  return (
    <Link
      href={`/studio/post/${post.slug}`}
      className="block bg-white rounded-lg border border-navy/5 p-5 hover:border-teal/40 transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-ui text-[0.65rem] tracking-wider uppercase text-teal">
          {post.category}
        </span>
        <span
          className={`font-ui text-[0.65rem] tracking-wider uppercase ${
            overdue ? "text-amber-600" : "text-charcoal-light"
          }`}
        >
          {formatDateShort(post.date)}
        </span>
      </div>
      <div className="font-display font-light text-lg text-navy leading-snug mb-4">
        {post.title}
      </div>
      <ProgressDots done={done} overdue={overdue} />
      <div className="mt-4 font-ui text-xs tracking-wider uppercase text-navy inline-flex items-center gap-1">
        Open →
      </div>
    </Link>
  );
}

function PostRow({
  post,
  s,
}: {
  post: (typeof blogPosts)[number];
  s: WorkflowState | undefined;
}) {
  const done = stepsDone(s);
  const overdue = isPastDue(post.date, s);
  const published = isPublished(post.date);
  return (
    <Link
      href={`/studio/post/${post.slug}`}
      className="flex items-center gap-4 px-5 py-3.5 hover:bg-navy/[0.02] transition-colors"
    >
      <ProgressDots done={done} overdue={overdue} />
      <div className="w-[70px] shrink-0 font-body text-xs text-charcoal-light">
        {formatDateShort(post.date)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-body text-sm text-navy truncate">{post.title}</div>
        <div className="font-ui text-[0.65rem] tracking-wider uppercase text-charcoal-light/70 mt-0.5">
          {post.category}
          {!published && <span className="ml-2 text-teal">· scheduled</span>}
          {overdue && <span className="ml-2 text-amber-600">· overdue</span>}
        </div>
      </div>
      <span className="text-charcoal-light">→</span>
    </Link>
  );
}

function ProgressDots({ done, overdue }: { done: number; overdue: boolean }) {
  const total = WORKFLOW_STEPS.length;
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full ${
            i < done
              ? "bg-teal"
              : overdue
                ? "bg-amber-400/60"
                : "bg-navy/15"
          }`}
        />
      ))}
    </div>
  );
}
