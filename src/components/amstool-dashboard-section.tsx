import { getAmstoolCacheSnapshot } from "@/lib/amstool/list-cache";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AmstoolDashboardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AMSTOOL topology cache</CardTitle>
        <CardDescription>Loading local amstool inventory…</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground animate-pulse">
          Running <code className="text-xs">amstool list</code>…
        </p>
      </CardContent>
    </Card>
  );
}

export async function AmstoolDashboardSection() {
  const result = await getAmstoolCacheSnapshot();

  if (!result.ok) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AMSTOOL topology cache</CardTitle>
          <CardDescription>
            Host inventory from your local{" "}
            <code className="text-xs">amstool list</code> cache (read-only).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{result.message}</p>
        </CardContent>
      </Card>
    );
  }

  const { summary, rows, displayedRowCount, amstoolPath } = result;
  const aemEntries = Object.entries(summary.byAemType).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>AMSTOOL topology cache</CardTitle>
        <CardDescription>
          Data from <code className="text-xs">amstool list</code> on this
          machine ({summary.totalHosts.toLocaleString()} hosts,{" "}
          {summary.topologyCount.toLocaleString()} topologies). Showing{" "}
          {displayedRowCount.toLocaleString()} rows below.
        </CardDescription>
        <p className="text-xs text-muted-foreground pt-1 break-all">
          Binary: {amstoolPath}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {aemEntries.map(([label, count]) => (
            <Badge key={label} variant="secondary">
              {label}: {count.toLocaleString()}
            </Badge>
          ))}
        </div>

        {summary.topTopologies.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">Top topologies by host count</h3>
            <ul className="text-sm text-muted-foreground space-y-1 max-h-40 overflow-y-auto">
              {summary.topTopologies.map((t) => (
                <li key={t.name}>
                  <span className="text-foreground font-medium">{t.name}</span>{" "}
                  — {t.count.toLocaleString()} hosts
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="p-2 font-medium">Hostname</th>
                <th className="p-2 font-medium">Topology</th>
                <th className="p-2 font-medium">Region</th>
                <th className="p-2 font-medium">Type</th>
                <th className="p-2 font-medium">EIP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.hostname}-${r.instanceId}`} className="border-b border-border/60">
                  <td className="p-2 align-top whitespace-nowrap max-w-[220px] truncate" title={r.hostname}>
                    {r.hostname}
                  </td>
                  <td className="p-2 align-top max-w-[180px] truncate" title={r.topologyName}>
                    {r.topologyName}
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

        {displayedRowCount < summary.totalHosts && (
          <p className="text-xs text-muted-foreground">
            Table is capped for performance. Set{" "}
            <code className="text-xs">AMSTOOL_TABLE_ROW_LIMIT</code> (max 500)
            to show more rows.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
