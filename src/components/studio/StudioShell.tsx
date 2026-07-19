"use client";

import Link from "next/link";
import { useStudioAuth } from "@/lib/useStudioAuth";
import { LoginForm } from "./LoginForm";

export function StudioShell({
  title,
  backHref,
  headerActions,
  children,
}: {
  title?: string;
  backHref?: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { auth, setAuthed } = useStudioAuth();

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

  return (
    <div className="min-h-screen bg-cream pb-16">
      <meta name="robots" content="noindex,nofollow" />
      <header className="bg-navy sticky top-0 z-40">
        <div className="max-w-[640px] mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {backHref && (
              <Link
                href={backHref}
                aria-label="Back"
                className="text-gold-light hover:text-gold text-xl leading-none shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy rounded"
              >
                &larr;
              </Link>
            )}
            <div className="font-display font-medium text-lg text-gold truncate">
              {title ?? "Studio"}
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            {headerActions}
            <button
              onClick={logout}
              className="font-ui text-[0.65rem] tracking-wider uppercase text-cream/70 hover:text-gold-light transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy rounded"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <div className="max-w-[640px] mx-auto px-5 py-6">{children}</div>
    </div>
  );
}
