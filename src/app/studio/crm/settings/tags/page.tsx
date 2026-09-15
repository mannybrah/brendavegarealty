"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CrmShell } from "@/components/studio/crm/CrmShell";
import {
  Card,
  EmptyState,
  ErrorText,
  SectionTitle,
  Spinner,
  crmFetch,
  crmJson,
  inputCls,
} from "@/components/studio/crm/ui";
import type { TagWithCount } from "@/lib/crm/types";

export default function CrmTagsPage() {
  return (
    <CrmShell title="Tags" backHref="/studio/crm/settings" wide={false}>
      <TagsInner />
    </CrmShell>
  );
}

// Inline editable tag name: click to edit, Enter/blur saves, Escape cancels.
function InlineName({ value, onSave }: { value: string; onSave: (next: string) => void }) {
  const [editing, setEditing] = useState(false);
  // `draft` is seeded from `value` every time editing starts, so it never
  // needs to be synced from props in an effect.
  const [draft, setDraft] = useState(value);
  const cancelled = useRef(false);

  function commit() {
    setEditing(false);
    if (cancelled.current) {
      cancelled.current = false;
      setDraft(value);
      return;
    }
    const next = draft.trim();
    if (!next || next === value.trim()) {
      setDraft(value);
      return;
    }
    onSave(next);
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        aria-label={`Rename ${value}`}
        className="text-left truncate max-w-full font-body text-sm text-navy hover:underline decoration-navy/20 underline-offset-2"
      >
        {value}
      </button>
    );
  }

  return (
    <input
      autoFocus
      value={draft}
      aria-label={`Rename ${value}`}
      maxLength={64}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancelled.current = true;
          e.currentTarget.blur();
        }
      }}
      className={`${inputCls} py-1.5`}
    />
  );
}

function TagsInner() {
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = useCallback(() => {
    crmJson<{ tags: TagWithCount[] }>("/api/studio/crm/tags")
      .then((j) => {
        setTags(j.tags ?? []);
        setErr(null);
        setLoading(false);
      })
      .catch((e: unknown) => {
        setErr(e instanceof Error ? e.message : "Couldn't load the tags. Try again.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const sorted = useMemo(
    () => tags.slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [tags]
  );

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return sorted;
    return sorted.filter((t) => t.name.toLowerCase().includes(needle));
  }, [sorted, q]);

  async function rename(tag: TagWithCount, next: string) {
    setErr(null);
    // A rename onto an existing name merges the two tags on the server and
    // cannot be undone, so confirm before sending it.
    const collision = tags.find((t) => t.id !== tag.id && t.name.toLowerCase() === next.trim().toLowerCase());
    if (collision) {
      const moving = tag.count;
      const ok = window.confirm(
        `A tag named "${collision.name}" already exists. Merge ${moving} contact${moving === 1 ? "" : "s"} into it? This can't be undone.`
      );
      if (!ok) return;
    }
    try {
      const j = await crmJson<{ tag: { id: string; name: string }; merged: boolean }>(
        `/api/studio/crm/tags/${tag.id}`,
        { method: "PATCH", body: JSON.stringify({ name: next }) }
      );
      if (j.merged) {
        setNotice(`Merged into ${j.tag.name}.`);
        load();
        return;
      }
      setTags((prev) => prev.map((t) => (t.id === tag.id ? { ...t, name: j.tag.name } : t)));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't rename that tag. Try again.");
    }
  }

  async function remove(tag: TagWithCount) {
    if (!window.confirm(`Remove "${tag.name}" from ${tag.count} contacts?`)) return;
    setErr(null);
    const previous = tags;
    setTags((prev) => prev.filter((t) => t.id !== tag.id));
    const r = await crmFetch(`/api/studio/crm/tags/${tag.id}`, { method: "DELETE" });
    if (!r.ok) {
      setTags(previous);
      setErr("Couldn't remove that tag. Try again.");
      return;
    }
    setNotice(`Removed ${tag.name}.`);
  }

  return (
    <div className="space-y-4">
      <SectionTitle count={tags.length}>Tags</SectionTitle>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search tags…"
        aria-label="Search tags"
        className={inputCls}
      />

      {err && <ErrorText>{err}</ErrorText>}
      {notice && <div className="font-body text-sm text-teal">{notice}</div>}

      <Card className="divide-y divide-navy/5">
        {loading ? (
          <div className="p-4 flex items-center gap-2">
            <Spinner />
            <span className="font-body text-sm text-charcoal-light">Loading tags…</span>
          </div>
        ) : visible.length === 0 ? (
          <div className="px-4">
            <EmptyState>{tags.length === 0 ? "No tags yet." : "No tags match that search."}</EmptyState>
          </div>
        ) : (
          visible.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-3.5 py-3">
              <div className="min-w-0 flex-1">
                <InlineName value={t.name} onSave={(next) => rename(t, next)} />
              </div>
              <Link
                href={`/studio/crm/people?tagsAny=${encodeURIComponent(t.id)}`}
                className="font-ui text-xs text-charcoal-light hover:text-navy tabular-nums shrink-0"
              >
                {t.count}
              </Link>
              <button
                type="button"
                onClick={() => remove(t)}
                aria-label={`Delete ${t.name}`}
                className="w-8 h-8 rounded-full flex items-center justify-center text-charcoal-light hover:bg-red-50 hover:text-red-700 shrink-0"
              >
                🗑
              </button>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
