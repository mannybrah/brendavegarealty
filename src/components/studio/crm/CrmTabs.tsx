import Link from "next/link";

const TABS = [
  { key: "inbox", href: "/studio/crm", label: "Inbox" },
  { key: "pipeline", href: "/studio/crm/pipeline", label: "Pipeline" },
  { key: "tasks", href: "/studio/crm/tasks", label: "Tasks" },
] as const;

export type CrmTab = (typeof TABS)[number]["key"];

export function CrmTabs({ active }: { active: CrmTab }) {
  return (
    <div className="flex gap-6 px-4 bg-navy rounded-lg">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`font-ui text-xs tracking-wider uppercase pb-3 pt-3 border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy rounded-t ${
            t.key === active ? "border-gold text-gold" : "border-transparent text-cream/60 hover:text-cream/90"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
