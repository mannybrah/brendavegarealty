import Link from "next/link";

const TABS = [
  { key: "inbox", href: "/studio/crm", label: "Inbox" },
  { key: "pipeline", href: "/studio/crm/pipeline", label: "Pipeline" },
  { key: "tasks", href: "/studio/crm/tasks", label: "Tasks" },
] as const;

export type CrmTab = (typeof TABS)[number]["key"];

export function CrmTabs({ active }: { active: CrmTab }) {
  return (
    <div className="flex gap-5 -mx-5 px-5 border-b border-navy/10">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`font-ui text-xs tracking-wider uppercase pb-3 pt-1 border-b-2 transition-colors ${
            t.key === active ? "border-gold text-navy" : "border-transparent text-charcoal-light"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
