"use client";

import { useEffect, useMemo, useState } from "react";
import { CustomerCard } from "@/components/customer-card";
import { getAmstoolPatchLevelsForDashboardCustomers } from "@/app/actions/amstool-dashboard";

export type DashboardCustomerRow = {
  id: number;
  name: string;
  lastPatchDate: string | null;
  lastPatchVersion: string | null;
  temperament: string;
  topology: string;
  dumbledoreStage: number;
  patchFrequency: string;
  workLoad: string;
  cloudManager: string;
  products: string;
  mscUrl: string | null;
  topologyStub: string | null;
  runbookUrl: string | null;
  snowUrl: string | null;
  archived: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  userId: string;
  latestNote: string | null;
  latestNoteDate: Date | string | null;
  amstoolResolvedPatchLevel: string | null;
  amstoolPatchLevelErrorMessage: string | null;
};

type DashboardCustomerGridProps = {
  activeCustomers: DashboardCustomerRow[];
  archivedCustomers: DashboardCustomerRow[];
};

export function DashboardCustomerGrid({
  activeCustomers,
  archivedCustomers,
}: DashboardCustomerGridProps) {
  /** Refetch patch levels when membership or topology stubs change (e.g. after save). */
  const patchSourceKey = useMemo(
    () =>
      [...activeCustomers, ...archivedCustomers]
        .map((c) => `${c.id}:${(c.topologyStub ?? "").trim()}`)
        .sort()
        .join("|"),
    [activeCustomers, archivedCustomers],
  );

  const [patchById, setPatchById] = useState<
    Record<number, { level: string | null; err: string | null } | undefined>
  >({});
  const [patchActionError, setPatchActionError] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready">(() =>
    activeCustomers.length + archivedCustomers.length === 0 ? "ready" : "loading",
  );

  useEffect(() => {
    const customerIds = [
      ...new Set(
        [...activeCustomers, ...archivedCustomers].map((c) => c.id),
      ),
    ].sort((a, b) => a - b);

    if (customerIds.length === 0) {
      setLoadState("ready");
      return;
    }

    let cancelled = false;
    setLoadState("loading");
    setPatchById({});
    setPatchActionError(null);

    getAmstoolPatchLevelsForDashboardCustomers({ customerIds })
      .then((result) => {
        if (cancelled) return;
        const next: Record<number, { level: string | null; err: string | null }> = {};
        for (const [idStr, row] of Object.entries(result)) {
          const id = Number(idStr);
          next[id] = {
            level: row.amstoolResolvedPatchLevel,
            err: row.amstoolPatchLevelErrorMessage,
          };
        }
        setPatchById(next);
        setLoadState("ready");
      })
      .catch((err) => {
        if (!cancelled) {
          const msg =
            err instanceof Error ? err.message : "Could not load patch levels.";
          setPatchActionError(msg);
          setLoadState("ready");
        }
      });

    return () => {
      cancelled = true;
    };
    // patchSourceKey encodes id + topology stub; avoid depending on array identity from RSC.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patchSourceKey]);

  const merge = (c: DashboardCustomerRow) => {
    const p = patchById[c.id];
    const hasTarget = Boolean(c.topologyStub?.trim());
    const patchLevelPending =
      hasTarget && loadState === "loading" && p === undefined;

    if (!p) {
      const actionErr =
        hasTarget && loadState === "ready" ? patchActionError : null;
      return {
        ...c,
        patchLevelPending,
        amstoolResolvedPatchLevel: c.amstoolResolvedPatchLevel,
        amstoolPatchLevelErrorMessage: actionErr ?? c.amstoolPatchLevelErrorMessage,
      };
    }
    return {
      ...c,
      patchLevelPending: false,
      amstoolResolvedPatchLevel: p.level,
      amstoolPatchLevelErrorMessage: p.err,
    };
  };

  return (
    <div className="space-y-8">
      {activeCustomers.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Active Customers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeCustomers.map((customer) => (
              <CustomerCard key={customer.id} customer={merge(customer)} />
            ))}
          </div>
        </div>
      )}

      {archivedCustomers.length > 0 && (
        <div>
          {activeCustomers.length > 0 && (
            <div className="my-8">
              <hr className="border-t border-border" />
            </div>
          )}
          <h2 className="text-2xl font-semibold mb-4 text-muted-foreground">
            Archived Customers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {archivedCustomers.map((customer) => (
              <CustomerCard key={customer.id} customer={merge(customer)} archived />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
