"use client";

import type { AddressRow, ContactRow, EmailRow, PhoneRow } from "@/lib/crm/types";
import { displayName, formatPhone, lastCommunicationLabel } from "@/lib/crm/format";
import { Avatar, Btn, Card } from "@/components/studio/crm/ui";

export function primaryPhoneOf(phones: PhoneRow[], fallback: string | null): string | null {
  return phones.find((p) => p.is_primary && !p.is_bad)?.number ?? phones.find((p) => !p.is_bad)?.number ?? fallback;
}
export function primaryEmailOf(emails: EmailRow[], fallback: string | null): string | null {
  return emails.find((e) => e.is_primary && !e.is_bad)?.address ?? emails.find((e) => !e.is_bad)?.address ?? fallback;
}

function QuickAction({ href, icon, label }: { href: string | null; icon: string; label: string }) {
  const base = "flex-1 flex flex-col items-center justify-center gap-1 min-h-[52px] py-2 rounded-xl font-ui text-[0.65rem] tracking-wider uppercase";
  if (!href) {
    return (
      <span className={`${base} bg-navy/5 text-charcoal-light/40 cursor-not-allowed`} aria-disabled="true">
        <span className="text-lg leading-none" aria-hidden="true">
          {icon}
        </span>
        {label}
      </span>
    );
  }
  return (
    <a
      href={href}
      className={`${base} bg-white border border-navy/20 text-navy active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold`}
    >
      <span className="text-lg leading-none" aria-hidden="true">
        {icon}
      </span>
      {label}
    </a>
  );
}

const rowCls = "flex items-center gap-2 min-h-10 font-body text-sm";
const linkCls = "text-navy hover:text-teal truncate";
const iconBtn =
  "w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-base hover:bg-navy/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold";

export function IdentityCard({
  contact,
  phones,
  emails,
  addresses,
  onEdit,
}: {
  contact: ContactRow;
  phones: PhoneRow[];
  emails: EmailRow[];
  addresses: AddressRow[];
  onEdit: () => void;
}) {
  const name = displayName(contact.first_name, contact.last_name);
  const phone = primaryPhoneOf(phones, contact.phone);
  const email = primaryEmailOf(emails, contact.email);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Avatar first={contact.first_name} last={contact.last_name} size="lg" />
        <div className="min-w-0">
          <div className="font-display font-medium text-xl text-navy leading-tight truncate">{name}</div>
          <div className="font-body font-light text-xs text-charcoal-light mt-0.5">
            {lastCommunicationLabel(contact.last_communication_at)}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <QuickAction href={phone ? `tel:${phone}` : null} icon="📞" label="Call" />
        <QuickAction href={phone ? `sms:${phone}` : null} icon="💬" label="Text" />
        <QuickAction href={email ? `mailto:${email}` : null} icon="✉️" label="Email" />
      </div>

      {(phones.length > 0 || emails.length > 0 || addresses.length > 0) && (
        <div className="space-y-0.5">
          {phones.map((p) => (
            <div key={p.id} className={rowCls}>
              <span className="w-6 text-center shrink-0" aria-hidden="true">
                📞
              </span>
              <a
                href={`tel:${p.number}`}
                className={`${linkCls} ${p.is_bad ? "line-through text-charcoal-light" : ""}`}
                aria-label={`Call ${formatPhone(p.number)}`}
              >
                {formatPhone(p.number)}
              </a>
              <span className="font-ui text-[0.6rem] tracking-wider uppercase text-charcoal-light shrink-0">· {p.label}</span>
              <a href={`sms:${p.number}`} className={`${iconBtn} ml-auto`} aria-label={`Text ${formatPhone(p.number)}`}>
                💬
              </a>
            </div>
          ))}
          {emails.map((e) => (
            <div key={e.id} className={rowCls}>
              <span className="w-6 text-center shrink-0" aria-hidden="true">
                ✉️
              </span>
              <a
                href={`mailto:${e.address}`}
                className={`${linkCls} ${e.is_bad ? "line-through text-charcoal-light" : ""}`}
                title={e.address}
              >
                {e.address}
              </a>
              <span className="font-ui text-[0.6rem] tracking-wider uppercase text-charcoal-light shrink-0">· {e.label}</span>
            </div>
          ))}
          {addresses.map((a) => (
            <div key={a.id} className={`${rowCls} items-start`}>
              <span className="w-6 text-center shrink-0 pt-2.5" aria-hidden="true">
                📍
              </span>
              <a
                href={`https://maps.apple.com/?q=${encodeURIComponent(a.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-navy hover:text-teal py-2.5 leading-snug min-w-0"
              >
                {a.address}
              </a>
              <span className="font-ui text-[0.6rem] tracking-wider uppercase text-charcoal-light shrink-0 pt-3">· {a.label}</span>
            </div>
          ))}
        </div>
      )}

      <Btn variant="ghost" onClick={onEdit} className="w-full min-h-10 border border-navy/10 rounded-xl">
        Edit contact
      </Btn>
    </Card>
  );
}
