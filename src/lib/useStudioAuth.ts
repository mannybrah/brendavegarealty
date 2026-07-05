"use client";

import { useEffect, useState } from "react";

export type StudioAuth = "checking" | "anon" | "authed";

export function useStudioAuth(): { auth: StudioAuth; setAuthed: () => void } {
  const [auth, setAuth] = useState<StudioAuth>("checking");
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/studio/auth", { credentials: "include" });
        const j = (await r.json()) as { authed: boolean };
        setAuth(j.authed ? "authed" : "anon");
      } catch {
        setAuth("anon");
      }
    })();
  }, []);
  return { auth, setAuthed: () => setAuth("authed") };
}
