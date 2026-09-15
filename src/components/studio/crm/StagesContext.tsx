"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { StageRow } from "@/lib/crm/types";

interface StagesCtxValue {
  stages: StageRow[];
  byId: Record<string, StageRow>;
  loading: boolean;
  refresh: () => Promise<void>;
}

const StagesCtx = createContext<StagesCtxValue>({ stages: [], byId: {}, loading: true, refresh: async () => {} });

export function StagesProvider({ children }: { children: React.ReactNode }) {
  const [stages, setStages] = useState<StageRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/studio/crm/stages", { credentials: "include", cache: "no-store" });
      if (r.status === 401) {
        window.location.reload();
        return;
      }
      if (!r.ok) return;
      const j = (await r.json()) as { stages: StageRow[] };
      setStages(j.stages ?? []);
    } catch {
      /* keep whatever we had */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const byId = useMemo(() => Object.fromEntries(stages.map((s) => [s.id, s])) as Record<string, StageRow>, [stages]);

  return <StagesCtx.Provider value={{ stages, byId, loading, refresh }}>{children}</StagesCtx.Provider>;
}

export function useStages(): StagesCtxValue {
  return useContext(StagesCtx);
}
