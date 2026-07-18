import Link from "next/link";
import { StagePill } from "./StagePill";

export interface ContactRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  type: string | null;
  stage: string;
  source: string | null;
  tags: string;
  notes: string;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
}

function relativeShort(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const sec = Math.max(0, (now.getTime() - then.getTime()) / 1000);
  if (sec < 60) return "now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  if (sec < 7 * 86400) return `${Math.floor(sec / 86400)}d`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ContactListItem({ contact }: { contact: ContactRow }) {
  const name = `${contact.first_name} ${contact.last_name}`.trim() || "No name";
  const initial = name === "No name" ? "?" : name.charAt(0).toUpperCase();

  return (
    <Link href={`/studio/crm/contact?id=${contact.id}`} className="flex items-center gap-3 p-4">
      <span className="w-11 h-11 rounded-full bg-navy/5 flex items-center justify-center shrink-0 font-display text-navy text-base">
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-body text-sm text-navy truncate">{name}</div>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <StagePill stage={contact.stage} />
          {contact.source && (
            <span className="font-ui text-[0.6rem] tracking-wider uppercase text-charcoal-light truncate">
              {contact.source}
            </span>
          )}
        </div>
      </div>
      <span className="font-ui text-[0.65rem] text-charcoal-light shrink-0">
        {relativeShort(contact.last_activity_at)}
      </span>
    </Link>
  );
}
