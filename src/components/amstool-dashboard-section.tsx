import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customersTable } from "@/db/schema";
import { getAmstoolCacheSnapshot } from "@/lib/amstool/list-cache";
import type { AmstoolStubFilterOption } from "@/lib/amstool/rows";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AmstoolDashboardResultClient } from "@/components/amstool-dashboard-result";

export function AmstoolDashboardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AMSTOOL topologies</CardTitle>
        <CardDescription>Running amstool list and filtering by topology stubs…</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground animate-pulse">
          <code className="text-xs">amstool list</code> → grep topology stubs…
        </p>
      </CardContent>
    </Card>
  );
}

export async function AmstoolDashboardSection() {
  const { userId } = await auth();

  let topologyStubs: string[] = [];
  let stubFilterOptions: AmstoolStubFilterOption[] = [];

  if (userId) {
    const customerRows = await db
      .select({
        id: customersTable.id,
        name: customersTable.name,
        topologyStub: customersTable.topologyStub,
      })
      .from(customersTable)
      .where(eq(customersTable.userId, userId));

    topologyStubs = [
      ...new Set(
        customerRows
          .map((r) => r.topologyStub?.trim() ?? "")
          .filter(Boolean),
      ),
    ];

    stubFilterOptions = customerRows
      .map((r) => ({
        customerId: r.id,
        name: r.name,
        topologyStub: r.topologyStub?.trim() ?? "",
      }))
      .filter((o) => o.topologyStub.length > 0)
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
  }

  const result = await getAmstoolCacheSnapshot({ topologyStubs });

  if (!result.ok) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AMSTOOL topologies</CardTitle>
          <CardDescription>
            Filters your local <code className="text-xs">amstool list</code> with
            each customer&apos;s <span className="font-medium">topology stub</span>{" "}
            (same idea as <code className="text-xs">grep -i</code>), then groups
            hosts by AMS topology name.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{result.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <AmstoolDashboardResultClient
      payload={result.viewPayload}
      stubFilterOptions={stubFilterOptions}
    />
  );
}
