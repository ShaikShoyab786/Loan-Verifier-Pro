import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { listMyCases, upsertCase, deleteCase as deleteCaseFn } from "@/lib/cases.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  useVerificationStore,
  setStoreSyncListeners,
  type VerificationCase,
} from "@/lib/verification-store";

const SYNC_DEBOUNCE_MS = 800;

function buildPayload(c: VerificationCase) {
  return {
    caseNumber: c.id,
    loanType: c.loanType,
    bankName: c.bankName,
    branchName: c.branchName ?? "",
    loanAmount: c.loanAmount ?? "",
    status: c.status,
    activeApplicantLocalId: c.activeApplicantId || null,
    applicants: c.applicants.map((a, idx) => ({
      localId: a.id,
      isPrimary: a.isPrimary,
      position: idx,
    })),
    modules: c.modules,
  };
}

type CaseSyncCtx = {
  /** Force-flush any pending dirty upsert for a case and resolve once persisted. */
  flushCase: (caseId: string) => Promise<void>;
};
const Ctx = createContext<CaseSyncCtx | null>(null);

export function useCaseSync(): CaseSyncCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCaseSync must be used inside <CaseSyncProvider>");
  return v;
}

export function CaseSyncProvider({ children }: { children: React.ReactNode }) {
  const list = useServerFn(listMyCases);
  const upsert = useServerFn(upsertCase);
  const del = useServerFn(deleteCaseFn);

  const hydrateAll = useVerificationStore((s) => s.hydrateAll);
  const isHydrated = useVerificationStore((s) => s.isHydrated);

  // Track auth so we don't fire authenticated server fns while signed-out
  // (e.g. right after signOut, or during preview /auth route).
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setHasSession(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setHasSession(!!session);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const query = useQuery({
    queryKey: ["cases"],
    queryFn: () => list(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    enabled: hasSession === true,
  });

  // Hydrate Zustand once cloud cases load.
  //
  // Fix #2: Safe merge. The cloud snapshot is treated as authoritative for
  // case existence, but we NEVER let it overwrite richer local state for a
  // case the user is actively editing. Specifically, for each case we keep
  // the LOCAL copy when any of these are true:
  //   - the case has a pending debounced push (timers.current has it)
  //   - the case is currently being upserted (inFlight.current has it)
  //   - the case is the user's activeCaseId (they're working on it now)
  //   - local has MORE applicants than cloud (cloud snapshot was stale or
  //     race-condition incomplete — never wipe applicants based on it)
  //   - local has MORE modules-with-data than cloud
  // Local-only cases (not yet in cloud) are always preserved.
  useEffect(() => {
    if (!query.data) return;
    // Re-read the latest store state at decision time — never trust a snapshot
    // captured earlier in the effect lifecycle.
    const merged: Record<string, VerificationCase> = {};
    const order: string[] = [];

    const countModulesWithData = (c: VerificationCase) => {
      let n = 0;
      for (const apps of Object.values(c.modules ?? {})) {
        for (const m of Object.values(apps ?? {})) {
          if (m && m.status && m.status !== "not_started") n++;
        }
      }
      return n;
    };

    const cloudIds = new Set(Object.keys(query.data.cases));
    // First: include every cloud case, deciding cloud-vs-local per case.
    for (const id of query.data.caseOrder) {
      const cloud = query.data.cases[id];
      // Re-read live to catch any store mutation that happened mid-loop.
      const liveLocal = useVerificationStore.getState();
      const localCase = liveLocal.cases[id];
      const hasPending = timers.current.has(id) || inFlight.current.has(id);
      const isActive = liveLocal.activeCaseId === id;
      let pick: "cloud" | "local" = "cloud";
      let reason = "cloud:default";
      if (localCase) {
        const localApps = localCase.applicants?.length ?? 0;
        const cloudApps = cloud.applicants?.length ?? 0;
        const localMods = countModulesWithData(localCase);
        const cloudMods = countModulesWithData(cloud);

        // HARD SAFETY: never let a populated local applicants list be wiped by
        // an empty cloud snapshot, regardless of any other heuristic.
        if (localApps > 0 && cloudApps === 0) {
          console.warn("[hydrate-protection] prevented applicant wipe", {
            id, localApps, cloudApps, localMods, cloudMods,
          });
          pick = "local"; reason = "local:protect-applicant-wipe";
        } else if (hasPending) {
          pick = "local"; reason = "local:pending-push";
        } else if (isActive) {
          // Active case: user is editing it now — always keep local.
          pick = "local"; reason = "local:active";
        } else if (localApps > cloudApps) {
          pick = "local"; reason = `local:more-applicants(${localApps}>${cloudApps})`;
        } else if (localMods > cloudMods) {
          pick = "local"; reason = `local:more-modules(${localMods}>${cloudMods})`;
        }
      }
      console.log("[hydrate-merge]", { id, pick, reason });
      merged[id] = pick === "local" && localCase ? localCase : cloud;
      order.push(id);
    }
    // Second: preserve local-only cases not yet in cloud.
    const liveLocal2 = useVerificationStore.getState();
    for (const id of liveLocal2.caseOrder) {
      if (cloudIds.has(id)) continue;
      if (!liveLocal2.cases[id]) continue;
      merged[id] = liveLocal2.cases[id];
      if (!order.includes(id)) order.unshift(id);
      console.log("[hydrate-merge]", { id, pick: "local", reason: "local-only" });
    }
    hydrateAll(merged, order);
  }, [query.data, hydrateAll]);

  // Pending upsert state per case.
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const inFlight = useRef<Map<string, Promise<void>>>(new Map());

  const pushNow = useCallback(
    async (caseId: string) => {
      const existing = inFlight.current.get(caseId);
      if (existing) return existing;
      const p = (async () => {
        const c = useVerificationStore.getState().cases[caseId];
        if (!c) return;
        try {
          await upsert({ data: buildPayload(c) });
        } catch (err) {
          console.error("[cloud sync] upsert failed", err);
          toast.error("Failed to sync case to cloud");
          throw err;
        } finally {
          inFlight.current.delete(caseId);
        }
      })();
      inFlight.current.set(caseId, p);
      return p;
    },
    [upsert],
  );

  useEffect(() => {
    setStoreSyncListeners({
      onDirty: (caseId) => {
        const existing = timers.current.get(caseId);
        if (existing) clearTimeout(existing);
        const t = setTimeout(() => {
          timers.current.delete(caseId);
          void pushNow(caseId).catch(() => {});
        }, SYNC_DEBOUNCE_MS);
        timers.current.set(caseId, t);
      },
      onDelete: async (caseId) => {
        const t = timers.current.get(caseId);
        if (t) {
          clearTimeout(t);
          timers.current.delete(caseId);
        }
        try {
          await del({ data: { caseNumber: caseId } });
        } catch (err) {
          console.error("[cloud sync] delete failed", err);
          toast.error("Failed to delete case from cloud");
        }
      },
    });
    return () => setStoreSyncListeners({});
  }, [del, pushNow]);

  const flushCase = useCallback(
    async (caseId: string) => {
      // Cancel any pending debounced push and push immediately.
      const t = timers.current.get(caseId);
      if (t) {
        clearTimeout(t);
        timers.current.delete(caseId);
      }
      // If something is already in-flight, await both that AND a fresh push so
      // the latest local state lands before we return.
      const pending = inFlight.current.get(caseId);
      if (pending) {
        await pending.catch(() => {});
      }
      await pushNow(caseId);
    },
    [pushNow],
  );

  const ctx = useMemo<CaseSyncCtx>(() => ({ flushCase }), [flushCase]);

  // Never block the app while cases sync — render children immediately and
  // show a subtle inline indicator so the dashboard doesn't flash blank on
  // mobile during the first hydration.
  const showSyncing = query.isLoading && !isHydrated;
  return (
    <Ctx.Provider value={ctx}>
      {showSyncing && (
        <div className="pointer-events-none fixed top-20 right-4 z-40 rounded-full border border-border bg-card/95 px-3 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
          Syncing cases…
        </div>
      )}
      {query.isError && (
        <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          Failed to sync your cases from the cloud. Local changes are safe.
        </div>
      )}
      {children}
    </Ctx.Provider>
  );
}
