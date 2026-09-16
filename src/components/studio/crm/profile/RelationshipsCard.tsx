"use client";

import type { RelationshipFull } from "@/lib/crm/types";
import { displayName, formatPhone } from "@/lib/crm/format";
import { Avatar, Card, EmptyState, SectionTitle } from "@/components/studio/crm/ui";

const iconLink =
  "w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-sm hover:bg-navy/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold";
const rowCls = "flex items-center gap-2 min-h-10 font-body text-sm";
const linkCls = "text-navy hover:text-teal truncate";
const labelTag = "font-ui text-[0.6rem] tracking-wider uppercase text-charcoal-light shrink-0";

export function RelationshipsCard({
  relationships,
  onAdd,
  onEdit,
}: {
  relationships: RelationshipFull[];
  onAdd: () => void;
  onEdit: (rel: RelationshipFull) => void;
}) {
  return (
    <Card className="p-4 space-y-3">
      <SectionTitle
        count={relationships.length || undefined}
        action={
          <button
            type="button"
            onClick={onAdd}
            aria-label="Add relationship"
            className="w-10 h-10 rounded-full flex items-center justify-center text-teal hover:bg-navy/5 text-xl leading-none"
          >
            +
          </button>
        }
      >
        Relationships
      </SectionTitle>

      {relationships.length === 0 && <EmptyState>No relationships yet.</EmptyState>}

      <div className="divide-y divide-navy/5">
        {relationships.map((r) => (
          <div key={r.id} className="py-2 space-y-1">
            <button
              type="button"
              onClick={() => onEdit(r)}
              className="w-full min-w-0 flex items-center gap-3 min-h-10 text-left rounded-lg hover:bg-navy/5 px-1 -mx-1"
            >
              <Avatar first={r.first_name} last={r.last_name} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block font-body text-sm text-navy truncate">{displayName(r.first_name, r.last_name)}</span>
                <span className="block font-body font-light text-xs text-charcoal-light truncate">{r.type || "Relationship"}</span>
              </span>
              <span className="font-ui text-[0.6rem] tracking-wider uppercase text-charcoal-light shrink-0">Edit</span>
            </button>
            {(r.phones.length > 0 || r.emails.length > 0 || r.addresses.length > 0) && (
              <div className="pl-11 space-y-0.5">
                {r.phones.map((p) => (
                  <div key={p.id} className={rowCls}>
                    <a
                      href={`tel:${p.number}`}
                      className={`${linkCls} ${p.is_bad ? "line-through text-charcoal-light" : ""}`}
                      aria-label={`Call ${formatPhone(p.number)}`}
                    >
                      {formatPhone(p.number)}
                    </a>
                    <span className={labelTag}>· {p.label}</span>
                    <a href={`sms:${p.number}`} className={`${iconLink} ml-auto`} aria-label={`Text ${formatPhone(p.number)}`}>
                      💬
                    </a>
                  </div>
                ))}
                {r.emails.map((e) => (
                  <div key={e.id} className={rowCls}>
                    <a
                      href={`mailto:${e.address}`}
                      className={`${linkCls} ${e.is_bad ? "line-through text-charcoal-light" : ""}`}
                      title={e.address}
                    >
                      {e.address}
                    </a>
                    <span className={labelTag}>· {e.label}</span>
                  </div>
                ))}
                {r.addresses.map((a) => (
                  <div key={a.id} className={`${rowCls} items-start`}>
                    <a
                      href={`https://maps.apple.com/?q=${encodeURIComponent(a.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-navy hover:text-teal py-2.5 leading-snug min-w-0"
                    >
                      {a.address}
                    </a>
                    <span className={`${labelTag} pt-3`}>· {a.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
