"use client";

import { useMemo, useState } from "react";
import type {
  AmstoolPageViewPayload,
  AmstoolCacheRow,
  AmstoolStubFilterOption,
} from "@/lib/amstool/rows";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const ALL_VALUE = "all";

function InstanceTable({ rows }: { rows: AmstoolCacheRow[] }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left">
            <th className="p-2 font-medium">Hostname</th>
            <th className="p-2 font-medium">Region</th>
            <th className="p-2 font-medium">Type</th>
            <th className="p-2 font-medium">EIP</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={`${r.hostname}-${r.instanceId}`}
              className="border-b border-border/60"
            >
              <td
                className="p-2 align-top whitespace-nowrap max-w-[240px] truncate font-mono text-xs"
                title={r.hostname}
              >
                {r.hostname}
              </td>
              <td className="p-2 align-top whitespace-nowrap">{r.region}</td>
              <td className="p-2 align-top whitespace-nowrap">{r.aemType}</td>
              <td className="p-2 align-top whitespace-nowrap font-mono text-xs">
                {r.eip}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AmstoolDashboardResultClient({
  payload,
  stubFilterOptions,
}: {
  payload: AmstoolPageViewPayload;
  stubFilterOptions: AmstoolStubFilterOption[];
}) {
  const [filterValue, setFilterValue] = useState<string>(ALL_VALUE);

  const active = useMemo(() => {
    if (filterValue === ALL_VALUE) {
      return {
        topologyGroups: payload.topologyGroupsAll,
        summary: payload.summaryAll,
        displayedRowCount: payload.displayedRowCountAll,
        totalMatchedRows: payload.totalMatchedRowsAll,
        label: "all topology stubs",
      };
    }
    const id = Number(filterValue);
    const option = stubFilterOptions.find((o) => o.customerId === id);
    const stub = option?.topologyStub ?? "";
    const sub = stub ? payload.perStub[stub] : undefined;
    if (!sub) {
      return {
        topologyGroups: [] as AmstoolPageViewPayload["topologyGroupsAll"],
        summary: payload.summaryAll,
        displayedRowCount: 0,
        totalMatchedRows: 0,
        label: option?.name || stub || filterValue,
      };
    }
    return {
      topologyGroups: sub.topologyGroups,
      summary: sub.summary,
      displayedRowCount: sub.displayedRowCount,
      totalMatchedRows: sub.totalMatchedRows,
      label: option ? option.name : `stub “${stub}”`,
    };
  }, [filterValue, payload, stubFilterOptions]);

  const aemEntries = Object.entries(active.summary.byAemType).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>AMSTOOL topologies</CardTitle>
        <CardDescription>
          <code className="text-xs">amstool list</code> filtered by topology stub
          (case-insensitive substring). Viewing{" "}
          <span className="font-medium text-foreground">{active.label}</span>
          :{" "}
          {active.displayedRowCount.toLocaleString()} of{" "}
          {active.totalMatchedRows.toLocaleString()} matching host
          {active.totalMatchedRows === 1 ? "" : "s"} across{" "}
          {active.summary.topologyCount.toLocaleString()} topolog
          {active.summary.topologyCount === 1 ? "y" : "ies"}.
        </CardDescription>

        {payload.topologyStubsUsed.length > 0 ?
          <div className="pt-2 space-y-3">
            <p className="text-xs font-medium text-foreground">
              Topology stubs (from your customers)
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {payload.topologyStubsUsed.map((s) => (
                <li key={s}>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {s}
                  </Badge>
                </li>
              ))}
            </ul>
            <div className="space-y-2 max-w-sm">
              <Label htmlFor="amstool-stub-filter" className="text-xs">
                Filter list by customer
              </Label>
              <Select value={filterValue} onValueChange={setFilterValue}>
                <SelectTrigger id="amstool-stub-filter" className="text-sm">
                  <SelectValue placeholder="Choose customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All</SelectItem>
                  {stubFilterOptions.map((o) => (
                    <SelectItem
                      key={o.customerId}
                      value={String(o.customerId)}
                      className="text-sm"
                    >
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        : null}

        {payload.stubsWithNoMatches.length > 0 ?
          <div
            className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100"
            role="status"
          >
            <p className="font-medium">No matching lines for:</p>
            <p className="mt-1 font-mono break-all opacity-95">
              {payload.stubsWithNoMatches.join(", ")}
            </p>
          </div>
        : null}
        <p className="text-xs text-muted-foreground pt-1 break-all">
          Binary: {payload.amstoolPath}
        </p>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="flex flex-wrap gap-2">
          {aemEntries.map(([label, count]) => (
            <Badge key={label} variant="secondary">
              {label}: {count.toLocaleString()}
            </Badge>
          ))}
        </div>

        {active.topologyGroups.map((group) => (
          <section key={group.topologyName} className="space-y-3">
            <h3 className="text-base font-semibold tracking-tight border-b pb-2 font-mono">
              {group.topologyName}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({group.rows.length.toLocaleString()} instance
                {group.rows.length === 1 ? "" : "s"})
              </span>
            </h3>
            <InstanceTable rows={group.rows} />
          </section>
        ))}

        {active.displayedRowCount < active.totalMatchedRows && (
          <p className="text-xs text-muted-foreground">
            Row cap applied for performance. Set{" "}
            <code className="text-xs">AMSTOOL_TABLE_ROW_LIMIT</code> (max{" "}
            {payload.rowLimit}) to show more.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
