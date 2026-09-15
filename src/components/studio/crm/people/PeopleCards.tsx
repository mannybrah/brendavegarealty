"use client";

// Phone view of the People list: one card, rows divided by hairlines.

import type { ContactListRow } from "@/lib/crm/types";
import { displayName, lastCommShort } from "@/lib/crm/format";
import { StagePill } from "../StagePill";
import { Avatar, TagBubble, cardCls } from "../ui";

export function PeopleCards({
  contacts,
  onOpen,
}: {
  contacts: ContactListRow[];
  onOpen: (index: number) => void;
}) {
  return (
    <div className={`lg:hidden ${cardCls} divide-y divide-navy/5`}>
      {contacts.map((c, i) => {
        const name = displayName(c.first_name, c.last_name);
        const overdue = !c.last_communication_at && c.stage === "new";
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onOpen(i)}
            className="w-full text-left flex items-center gap-3 px-3 py-3 active:bg-cream transition-colors"
          >
            <Avatar first={c.first_name} last={c.last_name} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="font-display font-medium text-[0.95rem] text-navy leading-tight truncate">{name}</div>
              <div className="flex items-center gap-1.5 mt-1 overflow-hidden">
                <StagePill stageId={c.stage} />
                {c.tags.slice(0, 2).map((t) => (
                  <TagBubble key={t.id} name={t.name} />
                ))}
              </div>
            </div>
            <span
              className={`font-ui text-[0.7rem] tabular-nums shrink-0 ${overdue ? "text-red-700" : "text-charcoal-light"}`}
            >
              {lastCommShort(c.last_communication_at)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
