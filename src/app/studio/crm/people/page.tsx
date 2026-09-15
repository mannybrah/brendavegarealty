"use client";

// People — the CRM contact list. Smart lists, filters, sort and search all
// live in the URL so the view is shareable and the back button restores it.

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CrmShell } from "@/components/studio/crm/CrmShell";
import { useStages } from "@/components/studio/crm/StagesContext";
import { paletteFor } from "@/components/studio/crm/stageColors";
import { Btn, ErrorText, Spinner, crmJson, inputCls } from "@/components/studio/crm/ui";
import type { TagOption } from "@/components/studio/crm/TagPicker";
import { SmartListNav, type SmartListNavItem } from "@/components/studio/crm/people/SmartListNav";
import { FiltersSheet } from "@/components/studio/crm/people/FiltersSheet";
import { DEFAULT_SORT_DIR, SortMenu } from "@/components/studio/crm/people/SortMenu";
import { PeopleTable } from "@/components/studio/crm/people/PeopleTable";
import { PeopleCards } from "@/components/studio/crm/people/PeopleCards";
import { AddContactSheet } from "@/components/studio/crm/people/AddContactSheet";
import {
  activeFilterCount,
  emptyFilters,
  filtersToParams,
  parseFilters,
  SORT_KEYS,
  type ContactFilters,
  type SortKey,
} from "@/lib/crm/filters";
import { SMART_LISTS } from "@/lib/crm/smartLists";
import { saveListNav, readListNav } from "@/lib/crm/nav";
import type { ContactListRow, TagWithCount } from "@/lib/crm/types";

const SORT_PREF_KEY = "crm.sort";

interface SortPref {
  sort: SortKey;
  dir: "asc" | "desc";
}

function readSortPref(): SortPref | null {
  try {
    const raw = localStorage.getItem(SORT_PREF_KEY);
    if (!raw) return null;
    const [sort, dir] = raw.split(":");
    if (!SORT_KEYS.includes(sort as SortKey)) return null;
    return { sort: sort as SortKey, dir: dir === "asc" ? "asc" : "desc" };
  } catch {
    return null;
  }
}

function writeSortPref(p: SortPref): void {
  try {
    localStorage.setItem(SORT_PREF_KEY, `${p.sort}:${p.dir}`);
  } catch {
    /* private mode / quota */
  }
}

export default function PeoplePage() {
  return (
    <CrmShell title="People">
      <Suspense fallback={<div className="font-body text-sm text-charcoal-light">Loading…</div>}>
        <PeopleInner />
      </Suspense>
    </CrmShell>
  );
}

interface ContactsResponse {
  contacts: ContactListRow[];
  counts: Record<string, number>;
  total: number;
}

function PeopleInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const urlFilters = useMemo(() => parseFilters(new URLSearchParams(qs)), [qs]);
  const hasUrlSort = useMemo(() => new URLSearchParams(qs).has("sort"), [qs]);

  const { stages } = useStages();

  // localStorage sort default: null until read, so we only fetch once.
  const [sortPref, setSortPref] = useState<SortPref | null>(null);
  useEffect(() => {
    setSortPref(readSortPref() ?? { sort: urlFilters.sort, dir: urlFilters.dir });
    // Read once on mount only — later changes go through applySort().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sort = hasUrlSort ? urlFilters.sort : (sortPref?.sort ?? urlFilters.sort);
  const dir = hasUrlSort ? urlFilters.dir : (sortPref?.dir ?? urlFilters.dir);
  const filters = useMemo<ContactFilters>(() => ({ ...urlFilters, sort, dir }), [urlFilters, sort, dir]);

  const [contacts, setContacts] = useState<ContactListRow[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [lists, setLists] = useState<{ id: string; name: string; description: string; count: number }[]>([]);
  const [allTags, setAllTags] = useState<TagOption[]>([]);
  const [sources, setSources] = useState<{ source: string; n: number }[]>([]);

  const [showFilters, setShowFilters] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  // ---- URL writers -------------------------------------------------
  const applyFilters = useCallback(
    (next: ContactFilters) => {
      const p = filtersToParams(next);
      const s = p.toString();
      router.replace(`/studio/crm/people${s ? `?${s}` : ""}`, { scroll: false });
    },
    [router]
  );

  const applySort = useCallback(
    (nextSort: SortKey, nextDir: "asc" | "desc") => {
      writeSortPref({ sort: nextSort, dir: nextDir });
      setSortPref({ sort: nextSort, dir: nextDir });
      applyFilters({ ...filters, sort: nextSort, dir: nextDir });
    },
    [applyFilters, filters]
  );

  const onHeaderSort = useCallback(
    (key: SortKey) => {
      if (key === sort) applySort(key, dir === "asc" ? "desc" : "asc");
      else applySort(key, DEFAULT_SORT_DIR[key]);
    },
    [applySort, sort, dir]
  );

  // ---- Search (debounced 300ms) ------------------------------------
  const [search, setSearch] = useState(urlFilters.q);
  const appliedQRef = useRef(urlFilters.q);
  useEffect(() => {
    if (urlFilters.q !== appliedQRef.current) {
      appliedQRef.current = urlFilters.q;
      setSearch(urlFilters.q);
    }
  }, [urlFilters.q]);
  useEffect(() => {
    if (search === appliedQRef.current) return;
    const t = setTimeout(() => {
      appliedQRef.current = search;
      applyFilters({ ...filters, q: search });
    }, 300);
    return () => clearTimeout(t);
  }, [search, filters, applyFilters]);

  // ---- Contacts fetch (single-flight) ------------------------------
  const controllerRef = useRef<AbortController | null>(null);
  const restoredRef = useRef(false);

  const loadContacts = useCallback((f: ContactFilters) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    crmJson<ContactsResponse>(`/api/studio/crm/contacts?${filtersToParams(f).toString()}`, {
      signal: controller.signal,
    })
      .then((j) => {
        setContacts(j.contacts ?? []);
        setCounts(j.counts ?? {});
        setTotal(j.total ?? 0);
        setError(null);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : String(e));
        setContacts([]);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (sortPref === null) return; // wait for the stored sort so we fetch once
    loadContacts(filters);
    // Filters is derived from the URL (plus the stored sort); that string is
    // the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs, sortPref, loadContacts]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  // ---- Scroll restore after coming back from a profile --------------
  useEffect(() => {
    if (restoredRef.current || contacts === null) return;
    restoredRef.current = true;
    const nav = readListNav();
    if (nav && nav.returnTo === window.location.pathname + window.location.search) {
      window.scrollTo(0, nav.scrollY);
    }
  }, [contacts]);

  // ---- One-time reference data -------------------------------------
  useEffect(() => {
    crmJson<{ lists: { id: string; name: string; description: string; count: number }[] }>(
      "/api/studio/crm/smart-lists"
    )
      .then((j) => setLists(j.lists ?? []))
      .catch(() => setLists(SMART_LISTS.map((l) => ({ ...l, count: 0 }))));
    crmJson<{ tags: TagWithCount[] }>("/api/studio/crm/tags")
      .then((j) => setAllTags(j.tags ?? []))
      .catch(() => setAllTags([]));
    crmJson<{ sources: { source: string; n: number }[] }>("/api/studio/crm/sources")
      .then((j) => setSources(j.sources ?? []))
      .catch(() => setSources([]));
  }, []);

  // ---- Derived ------------------------------------------------------
  const allCount = useMemo(() => Object.values(counts).reduce((a, b) => a + b, 0), [counts]);
  const navItems = useMemo<SmartListNavItem[]>(
    () => [
      { id: null, name: "All People", count: allCount },
      ...(lists.length ? lists : SMART_LISTS.map((l) => ({ ...l, count: 0 }))).map((l) => ({
        id: l.id,
        name: l.name,
        description: l.description,
        count: l.count,
      })),
    ],
    [lists, allCount]
  );
  const activeList = filters.list;
  const listLabel = navItems.find((i) => i.id === activeList)?.name ?? "All People";
  const filterCount = activeFilterCount(filters);
  const rows = contacts ?? [];

  const hrefForList = useCallback(
    (id: string | null) => {
      // A smart list carries its own stage/tag/recency rules, so switching
      // lists drops the ad-hoc filters but keeps the search and the sort.
      const p = filtersToParams({ q: filters.q, list: id ?? undefined, sort, dir });
      const s = p.toString();
      return `/studio/crm/people${s ? `?${s}` : ""}`;
    },
    [filters.q, sort, dir]
  );

  function toggleStage(id: string) {
    applyFilters({ ...filters, stages: filters.stages[0] === id ? [] : [id] });
  }

  // Empty-state escape hatch: back to an unfiltered All People, sort intact.
  function clearFilters() {
    setSearch("");
    appliedQRef.current = "";
    applyFilters({ ...emptyFilters(), sort, dir });
  }

  function openContact(index: number) {
    const c = rows[index];
    if (!c) return;
    saveListNav({
      ids: rows.map((r) => r.id),
      index,
      label: listLabel,
      returnTo: window.location.pathname + window.location.search,
      scrollY: window.scrollY,
    });
    router.push(`/studio/crm/contact?id=${c.id}`);
  }

  const isFiltered = filterCount > 0 || Boolean(filters.q) || Boolean(activeList);

  return (
    <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-6">
      <aside className="hidden lg:block">
        <SmartListNav items={navItems} activeId={activeList} hrefFor={hrefForList} variant="sidebar" />
      </aside>

      <div className="min-w-0 space-y-4">
        {/* Header */}
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="font-display font-medium text-xl lg:text-2xl text-navy leading-tight">
              {listLabel}
              {contacts !== null && (
                <span className="font-body font-light text-charcoal-light text-base ml-2 tabular-nums">
                  · {total}
                </span>
              )}
            </h1>
            <div className="w-8 h-px bg-gold mt-1.5" />
          </div>
          {loading && contacts !== null && <Spinner className="mb-1" />}
        </div>

        <div className="lg:hidden">
          <SmartListNav items={navItems} activeId={activeList} hrefFor={hrefForList} variant="chips" />
        </div>

        {/* Controls — search owns its own row on phones, one row on desktop */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone…"
            aria-label="Search people"
            className={`${inputCls} w-full lg:w-auto lg:flex-1 min-w-0`}
          />
          <button
            type="button"
            onClick={() => setShowFilters(true)}
            className="shrink-0 flex items-center gap-1.5 bg-white border border-navy/20 text-navy hover:border-navy/40 font-ui text-xs tracking-wider uppercase rounded-md px-3 py-2.5 transition-colors"
          >
            Filters
            {filterCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] rounded-full bg-navy text-gold text-[0.6rem] tabular-nums px-1">
                {filterCount}
              </span>
            )}
          </button>
          <SortMenu sort={sort} dir={dir} onChange={applySort} />
          <Btn variant="primary" className="shrink-0 ml-auto lg:ml-0" onClick={() => setShowAdd(true)}>
            + Add
          </Btn>
        </div>

        {/* Stage quick filter */}
        <div className="flex gap-2 overflow-x-auto pb-3 -mb-2">
          <button
            type="button"
            onClick={() => applyFilters({ ...filters, stages: [] })}
            aria-pressed={filters.stages.length === 0}
            className={`shrink-0 font-ui text-xs tracking-wider uppercase px-3.5 py-2 rounded-full border transition-colors ${
              filters.stages.length === 0
                ? "bg-navy text-cream border-navy"
                : "bg-white text-navy border-navy/20 hover:border-navy/40"
            }`}
          >
            All
            <span className="ml-1.5 tabular-nums opacity-70">{allCount}</span>
          </button>
          {stages.map((s) => {
            const selected = filters.stages[0] === s.id;
            const c = paletteFor(s.color);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleStage(s.id)}
                aria-pressed={selected}
                style={
                  selected
                    ? { backgroundColor: c.solid.bg, borderColor: c.solid.bg, color: c.solid.text }
                    : undefined
                }
                className={`shrink-0 font-ui text-xs tracking-wider uppercase px-3.5 py-2 rounded-full border transition-colors ${
                  selected ? "" : `bg-white ${c.text} ${c.border} hover:border-navy/40`
                }`}
              >
                {s.name}
                <span className="ml-1.5 tabular-nums opacity-70">{counts[s.id] ?? 0}</span>
              </button>
            );
          })}
        </div>

        {error && <ErrorText>{error}</ErrorText>}

        {contacts === null && <div className="font-body text-sm text-charcoal-light">Loading…</div>}

        {contacts !== null && rows.length === 0 && isFiltered && (
          <div className="font-body text-sm text-charcoal-light space-y-2 py-2">
            <p>No one matches these filters.</p>
            <Btn variant="ghost" className="-ml-2" onClick={clearFilters}>
              Clear filters
            </Btn>
          </div>
        )}

        {contacts !== null && rows.length === 0 && !isFiltered && (
          <div className="font-body text-sm text-charcoal-light space-y-2 py-2">
            <p>No leads yet. They&apos;ll land here automatically from the website.</p>
            <p>
              Have a list already?{" "}
              <Link href="/studio/crm/import" className="text-teal">
                Import contacts from CSV
              </Link>
            </p>
          </div>
        )}

        {rows.length > 0 && (
          <>
            <PeopleTable contacts={rows} sort={sort} dir={dir} onSort={onHeaderSort} onOpen={openContact} />
            <PeopleCards contacts={rows} onOpen={openContact} />
          </>
        )}

        {rows.length >= filters.limit && (
          <div className="font-body font-light text-xs text-charcoal-light">
            Showing the first {filters.limit}. Narrow the filters to see the rest.
          </div>
        )}
      </div>

      <FiltersSheet
        open={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        allTags={allTags}
        sources={sources}
        onApply={applyFilters}
      />
      <AddContactSheet
        open={showAdd}
        onClose={() => setShowAdd(false)}
        allTags={allTags}
        onCreated={(id) => {
          setShowAdd(false);
          router.push(`/studio/crm/contact?id=${id}`);
        }}
      />
    </div>
  );
}
