"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  WorkflowState,
  WORKFLOW_STEPS,
  WorkflowKey,
  formatDateLong,
  isPublished,
} from "@/lib/studio";

interface Props {
  slug: string;
  title: string;
  date: string;
  category: string;
  excerpt: string;
  videoScript: string;
}

type AuthStatus = "checking" | "anon" | "authed";

export function StudioPostDetail({
  slug,
  title,
  date,
  category,
  excerpt,
  videoScript,
}: Props) {
  const [auth, setAuth] = useState<AuthStatus>("checking");
  const [state, setState] = useState<WorkflowState>({});
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    (async () => {
      try {
        const r = await fetch("/api/studio/state", { credentials: "include" });
        if (!r.ok) {
          if (r.status === 401) setAuth("anon");
          return;
        }
        const j = (await r.json()) as { state: Record<string, WorkflowState> };
        setState(j.state?.[slug] || {});
      } catch {
        /* ignore */
      }
    })();
  }, [auth, slug]);

  async function patch(delta: Partial<WorkflowState>) {
    const optimistic = { ...state, ...delta };
    setState(optimistic);
    setSaving(true);
    try {
      const r = await fetch(`/api/studio/state/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(delta),
      });
      if (!r.ok) {
        // revert on error
        setState(state);
        return;
      }
      const j = (await r.json()) as { state: WorkflowState };
      setState(j.state);
    } finally {
      setSaving(false);
    }
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  }

  if (auth !== "authed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream px-6">
        <meta name="robots" content="noindex,nofollow" />
        <div className="max-w-sm text-center">
          <div className="font-display font-light text-2xl text-navy mb-2">
            Studio
          </div>
          <div className="font-body text-sm text-charcoal-light mb-6">
            {auth === "checking" ? "Checking…" : "Please sign in to view."}
          </div>
          {auth === "anon" && (
            <Link
              href="/studio"
              className="inline-block bg-navy text-cream font-ui text-xs tracking-wider uppercase px-6 py-3 rounded hover:bg-navy/90 transition-colors"
            >
              Go to Studio
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Extract hook line from script (line inside first [HOOK - first 3 seconds] block)
  const hookMatch = videoScript.match(/\[HOOK[^\]]*\]\s*\n"([^"]+)"/);
  const hook = hookMatch ? hookMatch[1] : "";

  const published = isPublished(date);

  return (
    <div className="min-h-screen bg-cream">
      <meta name="robots" content="noindex,nofollow" />
      <header className="border-b border-navy/10 bg-white">
        <div className="max-w-[1100px] mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/studio"
            className="font-ui text-xs tracking-wider uppercase text-charcoal-light hover:text-navy"
          >
            ← Studio
          </Link>
          <div className="font-ui text-xs tracking-wider uppercase text-charcoal-light">
            {saving ? "Saving…" : "Saved"}
          </div>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-6 py-8 grid gap-6 desktop:grid-cols-[1fr_360px]">
        {/* Main column */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-ui text-[0.65rem] tracking-wider uppercase text-teal">
                {category}
              </span>
              <span className="font-ui text-[0.65rem] tracking-wider uppercase text-charcoal-light">
                {formatDateLong(date)}
              </span>
              {!published && (
                <span className="font-ui text-[0.65rem] tracking-wider uppercase text-amber-600">
                  Scheduled
                </span>
              )}
            </div>
            <h1 className="font-display font-light text-[clamp(1.6rem,3vw,2.4rem)] text-navy leading-tight mb-3">
              {title}
            </h1>
            <p className="font-body font-light text-charcoal-light leading-relaxed">
              {excerpt}
            </p>
            <div className="mt-4 flex items-center gap-4">
              <a
                href={`/blog/${slug}`}
                target="_blank"
                rel="noreferrer"
                className="font-ui text-xs tracking-wider uppercase text-teal hover:text-navy transition-colors"
              >
                View public post →
              </a>
            </div>
          </div>

          {/* Video script panel */}
          <div className="bg-white rounded-lg border border-navy/5">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-navy/5">
              <div className="font-display font-light text-lg text-navy">
                Video Script
              </div>
              <div className="flex items-center gap-2">
                {hook && (
                  <button
                    onClick={() => copy(hook, "hook")}
                    className="font-ui text-[0.65rem] tracking-wider uppercase px-3 py-1.5 rounded border border-navy/10 text-charcoal-light hover:border-teal hover:text-teal transition-colors"
                  >
                    {copied === "hook" ? "Copied!" : "Copy hook"}
                  </button>
                )}
                <button
                  onClick={() => copy(videoScript, "script")}
                  className="font-ui text-[0.65rem] tracking-wider uppercase px-3 py-1.5 rounded bg-navy text-cream hover:bg-navy/90 transition-colors"
                >
                  {copied === "script" ? "Copied!" : "Copy script"}
                </button>
              </div>
            </div>
            <pre className="px-5 py-5 font-body font-light text-[0.95rem] text-charcoal leading-relaxed whitespace-pre-wrap break-words">
              {videoScript}
            </pre>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Workflow checklist */}
          <div className="bg-white rounded-lg border border-navy/5 p-5">
            <div className="font-display font-light text-lg text-navy mb-4">
              Workflow
            </div>
            <div className="space-y-2">
              {WORKFLOW_STEPS.map((step) => {
                const key = step.key as WorkflowKey;
                const checked = !!state[key];
                return (
                  <button
                    key={key}
                    onClick={() => patch({ [key]: !checked } as Partial<WorkflowState>)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded border text-left transition-colors ${
                      checked
                        ? "bg-teal/10 border-teal/30"
                        : "bg-white border-navy/10 hover:border-navy/20"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                        checked
                          ? "bg-teal border-teal text-cream"
                          : "border-navy/20"
                      }`}
                    >
                      {checked && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </span>
                    <span className="font-body text-sm text-navy">
                      {step.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {state.postedToYouTube && (
              <div className="mt-4 pt-4 border-t border-navy/5">
                <label className="block">
                  <span className="font-ui text-[0.65rem] tracking-wider uppercase text-charcoal-light">
                    YouTube URL
                  </span>
                  <input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=…"
                    defaultValue={state.youtubeUrl ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      patch({ youtubeUrl: v || null });
                    }}
                    className="mt-1 w-full border border-navy/10 rounded px-3 py-2 font-body text-sm focus:outline-none focus:border-teal"
                  />
                </label>
                {state.youtubeUrl && (
                  <a
                    href={`/blog/${slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block font-ui text-[0.65rem] tracking-wider uppercase text-teal hover:text-navy"
                  >
                    Live on blog →
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg border border-navy/5 p-5">
            <div className="font-display font-light text-lg text-navy mb-3">
              Notes
            </div>
            <textarea
              rows={5}
              placeholder="Reshoot ideas, angles, props…"
              defaultValue={state.notes ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                if (notesTimer.current) clearTimeout(notesTimer.current);
                notesTimer.current = setTimeout(() => {
                  patch({ notes: v });
                }, 800);
              }}
              className="w-full border border-navy/10 rounded px-3 py-2 font-body text-sm focus:outline-none focus:border-teal resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
