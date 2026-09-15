"use client";

// Desktop People table (FUB style): sticky header, quiet dividers, hover tint,
// 48px rows. Header cells sort; the active one shows a direction arrow.

import { CONTACT_TYPE_LABELS, type ContactListRow, type ContactType } from "@/lib/crm/types";
import { displayName, formatPhone, lastCommShort, relativeShort } from "@/lib/crm/format";
import type { SortKey } from "@/lib/crm/filters";
import { StagePill } from "../StagePill";
import { Avatar, TagBubble, cardCls } from "../ui";

const COLUMNS: { key: SortKey | null; label: string; className: string }[] = [
  { key: "name", label: "Name", className: "w-[26%]" },
  { key: "stage", label: "Stage", className: "w-[13%]" },
  { key: null, label: "Phone", className: "w-[13%]" },
  { key: null, label: "Email", className: "w-[20%]" },
  { key: null, label: "Tags", className: "w-[16%]" },
  { key: "last_communication", label: "Last comm.", className: "w-[7%] text-right" },
  { key: "created", label: "Added", className: "w-[7%] text-right" },
];

export function PeopleTable({
  contacts,
  sort,
  dir,
  onSort,
  onOpen,
}: {
  contacts: ContactListRow[];
  sort: SortKey;
  dir: "asc" | "desc";
  onSort: (key: SortKey) => void;
  onOpen: (index: number) => void;
}) {
  return (
    <div className={`hidden lg:block ${cardCls}`}>
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr>
            {COLUMNS.map((col) => {
              const active = col.key !== null && col.key === sort;
              const base = `sticky top-14 z-20 bg-[#F3EFE5] border-b border-navy/10 font-ui text-[0.62rem] tracking-wider uppercase text-charcoal-light px-3 py-2.5 first:rounded-tl-lg last:rounded-tr-lg ${col.className}`;
              if (!col.key) {
                return (
                  <th key={col.label} scope="col" className={`${base} text-left font-normal`}>
                    {col.label}
                  </th>
                );
              }
              const key = col.key;
              return (
                <th
                  key={col.label}
                  scope="col"
                  aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
                  className={`${base} p-0 font-normal`}
                >
                  <button
                    type="button"
                    onClick={() => onSort(key)}
                    className={`w-full px-3 py-2.5 flex items-center gap-1 hover:text-navy transition-colors ${
                      col.className.includes("text-right") ? "justify-end" : "justify-start"
                    } ${active ? "text-navy" : ""}`}
                  >
                    {col.label}
                    <span aria-hidden="true" className={active ? "" : "opacity-0"}>
                      {dir === "asc" ? "↑" : "↓"}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {contacts.map((c, i) => {
            const name = displayName(c.first_name, c.last_name);
            const type = c.type ? CONTACT_TYPE_LABELS[c.type as ContactType] : null;
            const overdue = !c.last_communication_at && c.stage === "new";
            const extra = c.tags.length - 2;
            return (
              <tr
                key={c.id}
                tabIndex={0}
                aria-label={name}
                onClick={() => onOpen(i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpen(i);
                  }
                }}
                className="border-t border-navy/5 first:border-t-0 hover:bg-cream focus:bg-cream focus:outline-none cursor-pointer transition-colors"
              >
                <td className="px-3 h-12">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar first={c.first_name} last={c.last_name} size="sm" />
                    <div className="min-w-0">
                      <div className="font-display font-medium text-[0.95rem] text-navy leading-tight truncate">
                        {name}
                      </div>
                      {type && <div className="font-body font-light text-[0.7rem] text-charcoal-light">{type}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-3 h-12">
                  <StagePill stageId={c.stage} />
                </td>
                <td className="px-3 h-12 font-body text-sm text-charcoal tabular-nums whitespace-nowrap">
                  {c.phone ? formatPhone(c.phone) : <span className="text-charcoal-light/50">—</span>}
                </td>
                <td className="px-3 h-12 font-body text-sm text-charcoal">
                  <span className="block truncate" title={c.email ?? undefined}>
                    {c.email || <span className="text-charcoal-light/50">—</span>}
                  </span>
                </td>
                <td className="px-3 h-12">
                  <div className="flex items-center gap-1 overflow-hidden">
                    {c.tags.slice(0, 2).map((t) => (
                      <TagBubble key={t.id} name={t.name} />
                    ))}
                    {extra > 0 && (
                      <span className="font-ui text-[0.65rem] text-charcoal-light shrink-0">+{extra}</span>
                    )}
                  </div>
                </td>
                <td
                  className={`px-3 h-12 text-right font-ui text-[0.7rem] tabular-nums whitespace-nowrap ${
                    overdue ? "text-red-700" : "text-charcoal-light"
                  }`}
                >
                  {lastCommShort(c.last_communication_at)}
                </td>
                <td className="px-3 h-12 text-right font-ui text-[0.7rem] text-charcoal-light tabular-nums whitespace-nowrap">
                  {relativeShort(c.created_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
