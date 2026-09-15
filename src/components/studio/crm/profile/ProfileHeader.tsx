"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ContactRow } from "@/lib/crm/types";
import { displayName } from "@/lib/crm/format";
import { readListNav, updateListNavIndex, type ListNav } from "@/lib/crm/nav";
import { StagePill } from "@/components/studio/crm/StagePill";
import { Avatar, Menu } from "@/components/studio/crm/ui";

export interface NavPosition {
  index: number;
  total: number;
}

// ------------------------------------------------------------
// useProfileNav: prev/next through the list the user came from.
// ------------------------------------------------------------
export function useProfileNav(id: string): {
  backHref: string;
  position: NavPosition | null;
  goPrev: () => void;
  goNext: () => void;
} {
  const router = useRouter();
  // Read once on mount: the list snapshot never changes while this page is
  // mounted (prev/next only moves the index, which we derive from `id`).
  // This component is never prerendered (it sits under the page's
  // useSearchParams Suspense boundary), so reading sessionStorage here is safe.
  const [nav] = useState<ListNav | null>(() => readListNav());

  const position = useMemo<NavPosition | null>(() => {
    if (!nav) return null;
    const index = nav.ids.indexOf(id);
    return index === -1 ? null : { index, total: nav.ids.length };
  }, [nav, id]);

  const goTo = useCallback(
    (i: number) => {
      if (!nav || i < 0 || i >= nav.ids.length) return;
      updateListNavIndex(i);
      router.push(`/studio/crm/contact?id=${nav.ids[i]}`);
    },
    [nav, router]
  );
  const goPrev = useCallback(() => position && goTo(position.index - 1), [position, goTo]);
  const goNext = useCallback(() => position && goTo(position.index + 1), [position, goTo]);

  useEffect(() => {
    if (!position) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      e.preventDefault();
      if (e.key === "ArrowLeft") goPrev();
      else goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [position, goPrev, goNext]);

  return { backHref: nav?.returnTo ?? "/studio/crm/people", position, goPrev, goNext };
}

// ------------------------------------------------------------
// NavArrows: ‹ 3 of 48 ›
// ------------------------------------------------------------
export function NavArrows({
  position,
  onPrev,
  onNext,
  tone = "light",
}: {
  position: NavPosition | null;
  onPrev: () => void;
  onNext: () => void;
  tone?: "light" | "dark";
}) {
  if (!position) return null;
  const btn =
    tone === "dark"
      ? "text-gold-light hover:text-gold disabled:text-cream/25"
      : "text-navy hover:bg-navy/5 disabled:text-charcoal-light/30";
  const text = tone === "dark" ? "text-cream/80" : "text-charcoal-light";
  return (
    <div className="flex items-center" aria-label="Contact navigation">
      <button
        type="button"
        onClick={onPrev}
        disabled={position.index <= 0}
        aria-label="Previous contact"
        className={`w-10 h-10 rounded-full flex items-center justify-center text-2xl leading-none disabled:cursor-not-allowed ${btn}`}
      >
        ‹
      </button>
      <span className={`font-ui text-[0.65rem] tracking-wider uppercase tabular-nums whitespace-nowrap ${text}`}>
        {position.index + 1} of {position.total}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={position.index >= position.total - 1}
        aria-label="Next contact"
        className={`w-10 h-10 rounded-full flex items-center justify-center text-2xl leading-none disabled:cursor-not-allowed ${btn}`}
      >
        ›
      </button>
    </div>
  );
}

// ------------------------------------------------------------
// ProfileMenu: ⋯ → Move to Trash / Delete permanently
// ------------------------------------------------------------
export function ProfileMenu({
  archived,
  onTrash,
  onDelete,
  tone = "light",
}: {
  archived: boolean;
  onTrash: () => void;
  onDelete: () => void;
  tone?: "light" | "dark";
}) {
  const items = [
    ...(archived ? [] : [{ label: "Move to Trash", onClick: onTrash }]),
    { label: "Delete permanently", onClick: onDelete, danger: true },
  ];
  return (
    <Menu
      items={items}
      label="Contact actions"
      trigger={<span className={tone === "dark" ? "text-gold-light" : undefined}>⋯</span>}
    />
  );
}

// ------------------------------------------------------------
// ProfileHeader: desktop row above the grid
// ------------------------------------------------------------
export function ProfileHeader({
  contact,
  backHref,
  position,
  onPrev,
  onNext,
  onTrash,
  onDelete,
}: {
  contact: ContactRow;
  backHref: string;
  position: NavPosition | null;
  onPrev: () => void;
  onNext: () => void;
  onTrash: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-4">
      <Link
        href={backHref}
        aria-label="Back to list"
        className="w-10 h-10 rounded-full flex items-center justify-center text-navy hover:bg-navy/5 text-xl leading-none shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        ←
      </Link>
      <Avatar first={contact.first_name} last={contact.last_name} size="md" />
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="font-display font-medium text-2xl text-navy leading-tight truncate">
          {displayName(contact.first_name, contact.last_name)}
        </h1>
        <StagePill stageId={contact.stage} size="md" />
      </div>
      <div className="ml-auto flex items-center gap-2 shrink-0">
        <NavArrows position={position} onPrev={onPrev} onNext={onNext} />
        <ProfileMenu archived={contact.stage === "archived"} onTrash={onTrash} onDelete={onDelete} />
      </div>
    </div>
  );
}
