"use server";

import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { customersTable } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getAmstoolPatchLevelsForTargets } from "@/lib/amstool/patch-level";
import {
  loadAmstoolListRawText,
  pickProdAuthorHostnameForTopologyStub,
} from "@/lib/amstool/list-cache";

/** Shorter than global amstool timeout so an offline VPN fails the dashboard row without hanging ~2m. */
function dashboardPatchTimeoutMs(): number {
  const n = Number(process.env.AMSTOOL_DASHBOARD_PATCH_TIMEOUT_MS);
  if (Number.isFinite(n) && n > 0) {
    return Math.min(Math.floor(n), 120_000);
  }
  return 45_000;
}

const getPatchLevelsForDashboardSchema = z.object({
  customerIds: z.array(z.number().int().positive()).max(500),
});

export type GetPatchLevelsForDashboardInput = z.infer<
  typeof getPatchLevelsForDashboardSchema
>;

export type DashboardCustomerPatchRow = {
  amstoolResolvedPatchLevel: string | null;
  amstoolPatchLevelErrorMessage: string | null;
};

/**
 * Resolves amstool patch levels for the given customers (must belong to the caller).
 * Uses each customer’s **topology stub** + `amstool list` to pick a **prod Author**
 * hostname (Sites topology preferred over Assets when both match), then
 * `amstool info -e <hostname> patch-level`.
 */
export async function getAmstoolPatchLevelsForDashboardCustomers(
  data: GetPatchLevelsForDashboardInput,
): Promise<Record<number, DashboardCustomerPatchRow>> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const { customerIds } = getPatchLevelsForDashboardSchema.parse(data);
  const out: Record<number, DashboardCustomerPatchRow> = {};

  if (customerIds.length === 0) {
    return out;
  }

  const rows = await db
    .select({
      id: customersTable.id,
      topologyStub: customersTable.topologyStub,
    })
    .from(customersTable)
    .where(
      and(eq(customersTable.userId, userId), inArray(customersTable.id, customerIds)),
    );

  for (const id of customerIds) {
    out[id] = {
      amstoolResolvedPatchLevel: null,
      amstoolPatchLevelErrorMessage: null,
    };
  }

  const stubRows = rows.filter((r) => r.topologyStub?.trim());
  if (stubRows.length === 0) {
    return out;
  }

  const list = await loadAmstoolListRawText();
  if (!list.ok) {
    const msg = list.message;
    for (const r of stubRows) {
      out[r.id] = {
        amstoolResolvedPatchLevel: null,
        amstoolPatchLevelErrorMessage: msg,
      };
    }
    return out;
  }

  const hostnameByCustomerId = new Map<number, string>();
  for (const r of stubRows) {
    const stub = r.topologyStub!.trim();
    const picked = pickProdAuthorHostnameForTopologyStub(list.text, stub);
    if (picked.ok) {
      hostnameByCustomerId.set(r.id, picked.hostname);
    } else {
      out[r.id] = {
        amstoolResolvedPatchLevel: null,
        amstoolPatchLevelErrorMessage: picked.message,
      };
    }
  }

  const uniqueHosts = [...new Set(hostnameByCustomerId.values())];
  const levelByHost = await getAmstoolPatchLevelsForTargets(uniqueHosts, {
    useCache: false,
    timeoutMs: dashboardPatchTimeoutMs(),
  });

  for (const [customerId, hostname] of hostnameByCustomerId) {
    const pr = levelByHost.get(hostname);
    if (pr?.ok) {
      out[customerId] = {
        amstoolResolvedPatchLevel: pr.patchLevel,
        amstoolPatchLevelErrorMessage: null,
      };
    } else if (pr) {
      out[customerId] = {
        amstoolResolvedPatchLevel: null,
        amstoolPatchLevelErrorMessage: pr.message,
      };
    } else {
      out[customerId] = {
        amstoolResolvedPatchLevel: null,
        amstoolPatchLevelErrorMessage:
          "No patch level result for resolved prod author host (check `amstool info -e`).",
      };
    }
  }

  return out;
}
