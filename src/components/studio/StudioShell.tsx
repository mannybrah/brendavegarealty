"use client";

import Link from "next/link";
import { useStudioAuth } from "@/lib/useStudioAuth";
import { LoginForm } from "./LoginForm";

export function StudioShell({
  title,
  backHref,
  children,
}: {
  title?: string;
  backHref?: string;
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
      <header className="border-b border-navy/10 bg-white sticky top-0 z-40">
        <div className="max-w-[640px] mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {backHref && (
              <Link href={backHref} aria-label="Back" className="text-navy text-xl leading-none shrink-0">
                &larr;
              </Link>
            )}
            <div className="font-display font-light text-lg text-navy truncate">
              {title ?? "Studio"}
            </div>
          </div>
          <button
            onClick={logout}
            className="font-ui text-[0.65rem] tracking-wider uppercase text-charcoal-light hover:text-navy transition-colors shrink-0"
          >
            Sign out
          </button>
        </div>
      </header>
      <div className="max-w-[640px] mx-auto px-5 py-6">{children}</div>
    </div>
  );
}
