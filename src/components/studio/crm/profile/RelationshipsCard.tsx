"use client";

import type { RelationshipFull } from "@/lib/crm/types";
import { displayName, formatPhone } from "@/lib/crm/format";
import { Avatar, Card, EmptyState, SectionTitle } from "@/components/studio/crm/ui";
import { primaryEmailOf, primaryPhoneOf } from "./IdentityCard";

const iconLink =
  "w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-sm hover:bg-navy/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold";

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
        {relationships.map((r) => {
          const phone = primaryPhoneOf(r.phones, null);
          const email = primaryEmailOf(r.emails, null);
          return (
            <div key={r.id} className="flex items-center gap-2 py-1.5">
              <button
                type="button"
                onClick={() => onEdit(r)}
                className="flex-1 min-w-0 flex items-center gap-3 min-h-10 text-left rounded-lg hover:bg-navy/5 px-1 -mx-1"
              >
                <Avatar first={r.first_name} last={r.last_name} size="sm" />
                <span className="min-w-0">
                  <span className="block font-body text-sm text-navy truncate">{displayName(r.first_name, r.last_name)}</span>
                  <span className="block font-body font-light text-xs text-charcoal-light truncate">{r.type || "Relationship"}</span>
                </span>
              </button>
              <div className="flex items-center shrink-0">
                {phone && (
                  <>
                    <a href={`tel:${phone}`} className={iconLink} aria-label={`Call ${formatPhone(phone)}`}>
                      📞
                    </a>
                    <a href={`sms:${phone}`} className={iconLink} aria-label={`Text ${formatPhone(phone)}`}>
                      💬
                    </a>
                  </>
                )}
                {email && (
                  <a href={`mailto:${email}`} className={iconLink} aria-label={`Email ${email}`}>
                    ✉️
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
