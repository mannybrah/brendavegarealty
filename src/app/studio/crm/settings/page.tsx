"use client";

import Link from "next/link";
import { CrmShell } from "@/components/studio/crm/CrmShell";
import { cardCls } from "@/components/studio/crm/ui";

const LINKS: { href: string; icon: string; title: string; description: string }[] = [
  {
    href: "/studio/crm/settings/notifications",
    icon: "🔔",
    title: "Notifications",
    description: "Push alerts for new leads and reminders",
  },
  {
    href: "/studio/crm/settings/stages",
    icon: "▤",
    title: "Stages",
    description: "Rename, reorder, add, or remove pipeline stages",
  },
  {
    href: "/studio/crm/settings/tags",
    icon: "🏷",
    title: "Tags",
    description: "Manage tags and merge duplicates",
  },
  {
    href: "/studio/crm/import",
    icon: "📥",
    title: "Import contacts",
    description: "CSV from Follow Up Boss or a spreadsheet",
  },
];

export default function CrmSettingsPage() {
  return (
    <CrmShell title="Settings" wide={false}>
      <div className="space-y-3">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`${cardCls} flex items-center gap-4 p-4 hover:border-navy/25 transition-colors`}
          >
            <span
              aria-hidden="true"
              className="w-11 h-11 rounded-full bg-navy/5 flex items-center justify-center text-lg shrink-0"
            >
              {l.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display font-medium text-base text-navy leading-tight">{l.title}</span>
              <span className="block font-body font-light text-xs text-charcoal-light mt-0.5">{l.description}</span>
            </span>
            <span aria-hidden="true" className="text-charcoal-light shrink-0">
              →
            </span>
          </Link>
        ))}
      </div>
    </CrmShell>
  );
}
