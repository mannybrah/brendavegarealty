"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useStudioAuth } from "@/lib/useStudioAuth";
import { LoginForm } from "../LoginForm";
import { StagesProvider } from "./StagesContext";

const NAV = [
  { href: "/studio/crm", label: "Dashboard", icon: "▦" },
  { href: "/studio/crm/people", label: "People", icon: "👥" },
  { href: "/studio/crm/pipeline", label: "Pipeline", icon: "▤" },
  { href: "/studio/crm/tasks", label: "Tasks", icon: "☑" },
  { href: "/studio/crm/settings", label: "Settings", icon: "⚙" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/studio/crm") return pathname === "/studio/crm" || pathname === "/studio/crm/";
  if (href === "/studio/crm/people") {
    return (
      pathname.startsWith("/studio/crm/people") ||
      pathname.startsWith("/studio/crm/contact") ||
      pathname.startsWith("/studio/crm/deal")
    );
  }
  return pathname.startsWith(href);
}

export function CrmShell({
  title,
  backHref,
  actions,
  wide = true,
  children,
}: {
  title?: string;
  backHref?: string;
  actions?: React.ReactNode;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const { auth, setAuthed } = useStudioAuth();
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [q, setQ] = useState("");

  if (auth === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="font-body text-charcoal-light text-sm">Loading…</div>
      </div>
    );
  }
  if (auth === "anon") return <LoginForm onSuccess={setAuthed} />;

  async function logout() {
    await fetch("/api/studio/auth", { method: "DELETE", credentials: "include" });
    window.location.href = "/studio";
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const v = q.trim();
    router.push(v ? `/studio/crm/people?q=${encodeURIComponent(v)}` : "/studio/crm/people");
  }

  const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy rounded";

  return (
    <StagesProvider>
      <div className="min-h-screen bg-cream">
        <meta name="robots" content="noindex,nofollow" />

        {/* Desktop top bar */}
        <header className="hidden lg:block bg-navy sticky top-0 z-40">
          <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center gap-8">
            <div className="flex items-center gap-4 shrink-0">
              <Link href="/studio" className={`font-ui text-[0.65rem] tracking-wider uppercase text-cream/60 hover:text-gold-light ${focusRing}`}>
                ← Studio
              </Link>
              <Link href="/studio/crm" className={`font-display font-medium text-lg text-gold leading-none ${focusRing}`}>
                Brenda Vega <span className="text-cream/50 font-light">·</span> CRM
              </Link>
            </div>
            <nav className="flex items-center gap-6 h-full">
              {NAV.map((n) => {
                const active = isActive(pathname, n.href);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={`h-14 flex items-center font-ui text-xs tracking-wider uppercase border-b-2 transition-colors ${focusRing} ${
                      active ? "text-gold border-gold" : "text-cream/70 border-transparent hover:text-cream"
                    }`}
                  >
                    {n.label}
                  </Link>
                );
              })}
            </nav>
            <form onSubmit={submitSearch} className="ml-auto">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search people…"
                aria-label="Search people"
                className="w-64 bg-white/10 border border-white/10 rounded-full px-4 py-1.5 font-body text-sm text-cream placeholder:text-cream/50 focus:outline-none focus:bg-white/15 focus:border-gold/50"
              />
            </form>
            <button
              onClick={logout}
              className={`font-ui text-[0.65rem] tracking-wider uppercase text-cream/70 hover:text-gold-light transition-colors shrink-0 ${focusRing}`}
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Mobile top bar */}
        <header className="lg:hidden bg-navy sticky top-0 z-40">
          <div className="h-14 px-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {backHref ? (
                <Link href={backHref} aria-label="Back" className={`text-gold-light hover:text-gold text-xl leading-none shrink-0 ${focusRing}`}>
                  ←
                </Link>
              ) : (
                <Link href="/studio" aria-label="Studio home" className={`text-cream/60 hover:text-gold-light text-sm leading-none shrink-0 ${focusRing}`}>
                  ⌂
                </Link>
              )}
              <div className="font-display font-medium text-lg text-gold truncate">{title ?? "CRM"}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          </div>
        </header>

        <main className={`mx-auto px-4 lg:px-6 py-4 lg:py-6 pb-28 lg:pb-10 ${wide ? "max-w-[1400px]" : "max-w-[720px]"}`}>
          {children}
        </main>

        {/* Mobile bottom tab bar */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-navy border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
          <div className="grid grid-cols-5">
            {NAV.map((n) => {
              const active = isActive(pathname, n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`flex flex-col items-center justify-center gap-0.5 py-2 ${focusRing} ${
                    active ? "text-gold" : "text-cream/60"
                  }`}
                >
                  <span className="text-lg leading-none" aria-hidden="true">
                    {n.icon}
                  </span>
                  <span className="font-ui text-[10px] tracking-wider uppercase">{n.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </StagesProvider>
  );
}
