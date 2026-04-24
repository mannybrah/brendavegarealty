"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { blogPosts } from "@/data/blog-posts";
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

type AuthStatus = "checking" | "anon" | "authed";

export default function StudioPage() {
  const [auth, setAuth] = useState<AuthStatus>("checking");
  const [state, setState] = useState<Record<string, WorkflowState>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/studio/auth", { credentials: "include" });
        const j = (await r.json()) as { authed: boolean };
        setAuth(j.authed ? "authed" : "anon");
      } catch {
        setAuth("anon");
      }
    })();
  }, []);

  useEffect(() => {
    if (auth !== "authed") return;
    setLoading(true);
    (async () => {
      try {
        const r = await fetch("/api/studio/state", { credentials: "include" });
        if (!r.ok) {
          if (r.status === 401) setAuth("anon");
          return;
        }
        const j = (await r.json()) as StateResponse;
        setState(j.state || {});
      } finally {
        setLoading(false);
      }
    })();
  }, [auth]);

  if (auth === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="font-body text-charcoal-light text-sm">Loading…</div>
      </div>
    );
  }

  if (auth === "anon") {
    return <LoginForm onSuccess={() => setAuth("authed")} />;
  }

  return <Dashboard state={state} loading={loading} />;
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/studio/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      if (!r.ok) {
        setErr("Wrong password.");
        return;
      }
      onSuccess();
    } catch {
      setErr("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-6">
      <meta name="robots" content="noindex,nofollow" />
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-white rounded-lg shadow-sm border border-navy/5 p-8"
      >
        <div className="text-center mb-8">
          <div className="font-display font-light text-2xl text-navy">Studio</div>
          <div className="font-body font-light text-xs text-charcoal-light mt-1 tracking-wider uppercase">
            Private
          </div>
        </div>
        <label className="block">
          <span className="font-ui text-xs tracking-wider uppercase text-charcoal-light">
            Password
          </span>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full border border-navy/10 rounded px-3 py-2 font-body text-sm focus:outline-none focus:border-teal"
          />
        </label>
        {err && (
          <div className="mt-4 text-sm text-red-600 font-body">{err}</div>
        )}
        <button
          type="submit"
          disabled={busy || !password}
          className="mt-6 w-full bg-navy text-cream font-ui font-medium text-sm tracking-wider uppercase py-3 rounded hover:bg-navy/90 transition-colors disabled:opacity-50"
        >
          {busy ? "…" : "Enter"}
        </button>
      </form>
    </div>
  );
}

function Dashboard({
  state,
  loading,
}: {
  state: Record<string, WorkflowState>;
  loading: boolean;
}) {
  const [filter, setFilter] = useState<"all" | "in-progress" | "done" | "overdue">("all");

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

  async function logout() {
    await fetch("/api/studio/auth", {
      method: "DELETE",
      credentials: "include",
    });
    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-cream">
      <meta name="robots" content="noindex,nofollow" />
      <header className="border-b border-navy/10 bg-white">
        <div className="max-w-[1100px] mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <div className="font-display font-light text-xl text-navy">
              Hi Brenda
            </div>
            <div className="font-body font-light text-sm text-charcoal-light">
              {totalComplete} of {blogPosts.length} videos complete
            </div>
          </div>
          <button
            onClick={logout}
            className="font-ui text-xs tracking-wider uppercase text-charcoal-light hover:text-navy transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-6 py-8">
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
      </div>
    </div>
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
