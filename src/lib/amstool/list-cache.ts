import "server-only";

import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type {
  AmstoolCacheRow,
  AmstoolCacheSummary,
  AmstoolPageViewPayload,
  AmstoolTopologyGroup,
} from "@/lib/amstool/rows";

export type {
  AmstoolCacheRow,
  AmstoolCacheSummary,
  AmstoolPageViewPayload,
  AmstoolTopologyGroup,
} from "@/lib/amstool/rows";

const execFileAsync = promisify(execFile);

type AmstoolTaggedRow = AmstoolCacheRow & { matchedStubs: string[] };

export type AmstoolCacheResult =
  | {
      ok: true;
      /** Everything the AMSTOOL page needs (all + per-stub capped views). */
      viewPayload: AmstoolPageViewPayload;
    }
  | { ok: false; code: "DISABLED" | "NOT_FOUND" | "FAILED"; message: string };

export type GetAmstoolCacheSnapshotOptions = {
  /**
   * Distinct **topology stub** strings from your customers. Each line of
   * `amstool list` that contains a stub (case-insensitive) is kept—same idea as
   * `amstool list | grep -i <stub>`.
   */
  topologyStubs: string[];
};

const MIN_COLS = 11;

function resolveAmstoolPath(): string | null {
  const fromEnv = process.env.AMSTOOL_PATH?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  const candidates = ["/opt/homebrew/bin/amstool", "/usr/local/bin/amstool"];
  for (const p of candidates) {
    if (existsSync(p)) {
      return p;
    }
  }
  return null;
}

function splitAmstoolListFields(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed) {
    return [];
  }
  if (trimmed.includes("\t")) {
    return trimmed.split("\t").map((p) => p.trim());
  }
  return trimmed
    .split(/\s{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function parseListLine(line: string): AmstoolCacheRow | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }
  const parts = splitAmstoolListFields(trimmed);
  if (parts.length < MIN_COLS) {
    return null;
  }
  return {
    hostname: parts[0] ?? "",
    instanceId: parts[1] ?? "",
    eip: parts[2] ?? "",
    topologyName: parts[3] ?? "",
    bbLogicalName: parts[4] ?? "",
    region: parts[5] ?? "",
    bbId: parts[6] ?? "",
    cloudAccount: parts[7] ?? "",
    bbUrl: parts[8] ?? "",
    environment: parts[9] ?? "",
    aemType: parts[10] ?? "",
    ldapEnabled: parts[11] ?? "",
    clone: parts[12] ?? "",
    extra: parts.slice(13),
  };
}

function buildSummary(rows: AmstoolCacheRow[]): AmstoolCacheSummary {
  const byAemType: Record<string, number> = {};
  const topologyCounts = new Map<string, number>();

  for (const row of rows) {
    const type = row.aemType || "Unknown";
    byAemType[type] = (byAemType[type] ?? 0) + 1;
    const top = row.topologyName || "(no topology)";
    topologyCounts.set(top, (topologyCounts.get(top) ?? 0) + 1);
  }

  const topTopologies = [...topologyCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  return {
    totalHosts: rows.length,
    topologyCount: topologyCounts.size,
    byAemType,
    topTopologies,
  };
}

export type AmstoolListLoadResult =
  | { ok: true; rows: AmstoolCacheRow[]; amstoolPath: string }
  | { ok: false; code: "DISABLED" | "NOT_FOUND" | "FAILED"; message: string };

type AmstoolGateResult =
  | { ok: false; result: Extract<AmstoolCacheResult, { ok: false }> }
  | { ok: true; amstoolPath: string };

function gateAmstool(): AmstoolGateResult {
  if (process.env.AMSTOOL_INTEGRATION === "0") {
    return {
      ok: false,
      result: {
        ok: false,
        code: "DISABLED",
        message:
          "AMSTOOL integration is off (AMSTOOL_INTEGRATION=0). Remove or unset it to enable.",
      },
    };
  }

  const amstoolPath = resolveAmstoolPath();
  if (!amstoolPath) {
    return {
      ok: false,
      result: {
        ok: false,
        code: "NOT_FOUND",
        message:
          "amstool was not found. Install it (e.g. Homebrew) or set AMSTOOL_PATH to the binary.",
      },
    };
  }
  if (!existsSync(amstoolPath)) {
    return {
      ok: false,
      result: {
        ok: false,
        code: "NOT_FOUND",
        message: `AMSTOOL_PATH is set but the file does not exist: ${amstoolPath}`,
      },
    };
  }

  return { ok: true, amstoolPath };
}

/** Raw stdout from `amstool list` (for stub grep + patch author pick). */
export type LoadAmstoolListRawTextResult =
  | { ok: true; text: string; amstoolPath: string }
  | { ok: false; code: "DISABLED" | "NOT_FOUND" | "FAILED"; message: string };

export type PickProdAuthorForStubResult =
  | { ok: true; hostname: string; topologyName: string }
  | { ok: false; message: string };

/**
 * Same as `amstool list | grep -i`: line is kept if it contains any stub substring.
 */
function lineMatchesTopologyStub(line: string, stubsLc: string[]): boolean {
  const lc = line.toLowerCase();
  return stubsLc.some((s) => s.length > 0 && lc.includes(s));
}

function stripMatchedStubs(row: AmstoolTaggedRow): AmstoolCacheRow {
  /* eslint-disable @typescript-eslint/no-unused-vars -- rest omit */
  const { matchedStubs, ...rest } = row;
  /* eslint-enable @typescript-eslint/no-unused-vars */
  return rest;
}

function filterRowsByTopologyStubs(
  text: string,
  stubs: string[],
): { rows: AmstoolTaggedRow[]; stubMatched: Map<string, boolean> } {
  const stubsNorm = [...new Set(stubs.map((s) => s.trim()).filter(Boolean))];
  const stubsLc = stubsNorm.map((s) => s.toLowerCase());
  const stubMatched = new Map<string, boolean>(
    stubsNorm.map((s) => [s, false]),
  );

  const byKey = new Map<string, AmstoolTaggedRow>();

  for (const line of text.split("\n")) {
    if (!lineMatchesTopologyStub(line, stubsLc)) continue;
    const row = parseListLine(line);
    if (!row) continue;
    const lc = line.toLowerCase();
    const lineStubs = stubsNorm.filter((s) => lc.includes(s.toLowerCase()));
    if (lineStubs.length === 0) continue;

    for (const s of lineStubs) {
      stubMatched.set(s, true);
    }

    const key = `${row.hostname}\0${row.instanceId}`;
    const existing = byKey.get(key);
    if (existing) {
      const merged = new Set([...existing.matchedStubs, ...lineStubs]);
      existing.matchedStubs = [...merged].sort((a, b) => a.localeCompare(b));
      continue;
    }

    byKey.set(key, {
      ...row,
      matchedStubs: [...lineStubs].sort((a, b) => a.localeCompare(b)),
    });
  }

  return { rows: [...byKey.values()], stubMatched };
}

function groupRowsByTopology(rows: AmstoolCacheRow[]): AmstoolTopologyGroup[] {
  const map = new Map<string, AmstoolCacheRow[]>();
  for (const row of rows) {
    const name = row.topologyName.trim() || "(no topology)";
    const list = map.get(name);
    if (list) {
      list.push(row);
    } else {
      map.set(name, [row]);
    }
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.hostname.localeCompare(b.hostname));
  }
  const names = [...map.keys()].sort((a, b) => a.localeCompare(b));
  return names.map((topologyName) => ({
    topologyName,
    rows: map.get(topologyName) ?? [],
  }));
}

/**
 * Truncate groups so total rows ≤ limit (fills earlier topologies first).
 */
function capTopologyGroups(
  groups: AmstoolTopologyGroup[],
  limit: number,
): AmstoolTopologyGroup[] {
  let remaining = limit;
  const out: AmstoolTopologyGroup[] = [];
  for (const g of groups) {
    if (remaining <= 0) break;
    const take = Math.min(g.rows.length, remaining);
    if (take <= 0) continue;
    out.push({
      topologyName: g.topologyName,
      rows: g.rows.slice(0, take),
    });
    remaining -= take;
  }
  return out;
}

async function fetchAmstoolListStdout(
  amstoolPath: string,
): Promise<{ ok: true; text: string } | { ok: false; message: string }> {
  try {
    const { stdout, stderr } = await execFileAsync(amstoolPath, ["list"], {
      maxBuffer: 64 * 1024 * 1024,
      env: process.env,
    });

    const text = stdout?.toString() ?? "";
    if (!text.trim() && stderr) {
      return {
        ok: false,
        message: stderr.toString().trim() || "amstool list produced no output.",
      };
    }
    if (!text.trim()) {
      return { ok: false, message: "amstool list produced no output." };
    }
    return { ok: true, text };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `amstool list failed: ${msg}` };
  }
}

/**
 * Full `amstool list` stdout for server-side filtering (topology stub, patch author).
 */
export async function loadAmstoolListRawText(): Promise<LoadAmstoolListRawTextResult> {
  const gate = gateAmstool();
  if (!gate.ok) {
    return gate.result;
  }
  const fetched = await fetchAmstoolListStdout(gate.amstoolPath);
  if (!fetched.ok) {
    return { ok: false, code: "FAILED", message: fetched.message };
  }
  return { ok: true, text: fetched.text, amstoolPath: gate.amstoolPath };
}

/**
 * Prod-like AMS row: environment prod/production or topology name suggests prod tier.
 */
function isProdAmsTopologyRow(row: AmstoolCacheRow): boolean {
  const env = row.environment.trim().toLowerCase();
  if (env === "prod" || env === "production") {
    return true;
  }
  const top = row.topologyName.toLowerCase();
  if (/-prod\d|prod\d|-production\b/.test(top)) {
    return true;
  }
  if (/\bprod\b/.test(top) && !/\b(nonprod|preprod)\b/.test(top)) {
    return true;
  }
  if (env === "stage" || env === "dev" || env === "qa" || env === "test") {
    return false;
  }
  return false;
}

/**
 * When multiple prod topologies match a stub: prefer Sites line over Assets (0 best, then neutral, then Assets).
 */
function topologySitesAssetsRank(topologyName: string): number {
  const t = topologyName.toLowerCase();
  if (
    /(^|[-_])assets?($|[-_])|[-_]assets[-_]|assets-prod|assetsstage|_assets\b/.test(
      t,
    )
  ) {
    return 2;
  }
  if (
    /(^|[-_])sites?($|[-_])|[-_]sites[-_]|sites-prod|sitesprod|site-prod|_sites\b/.test(
      t,
    )
  ) {
    return 0;
  }
  return 1;
}

/**
 * From `amstool list` text and a topology stub: pick one prod Author hostname for
 * `amstool info -e … patch-level`. If several prod topologies match, prefers a
 * Sites-style name over an Assets-style name.
 */
export function pickProdAuthorHostnameForTopologyStub(
  listText: string,
  topologyStub: string,
): PickProdAuthorForStubResult {
  const stub = topologyStub.trim();
  if (!stub) {
    return { ok: false, message: "Topology stub is empty." };
  }

  const { rows: tagged } = filterRowsByTopologyStubs(listText, [stub]);
  const rows = tagged.map(stripMatchedStubs);
  if (rows.length === 0) {
    return {
      ok: false,
      message:
        "No `amstool list` rows matched this topology stub. Run `amstool cache` or fix the stub.",
    };
  }

  const authors = rows.filter(
    (r) => r.aemType.trim().toLowerCase() === "author",
  );
  const prodAuthors = authors.filter(isProdAmsTopologyRow);

  if (prodAuthors.length === 0) {
    return {
      ok: false,
      message:
        "No prod Author host found for this stub (need environment prod or topology name containing prod).",
    };
  }

  const byTop = new Map<string, AmstoolCacheRow[]>();
  for (const r of prodAuthors) {
    const k = r.topologyName.trim() || "(no topology)";
    const list = byTop.get(k);
    if (list) {
      list.push(r);
    } else {
      byTop.set(k, [r]);
    }
  }

  const topNames = [...byTop.keys()].sort((a, b) => {
    const ra = topologySitesAssetsRank(a);
    const rb = topologySitesAssetsRank(b);
    if (ra !== rb) {
      return ra - rb;
    }
    return a.localeCompare(b);
  });

  const chosenTop = topNames[0]!;
  const hosts = (byTop.get(chosenTop) ?? [])
    .map((r) => r.hostname.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  if (hosts.length === 0) {
    return {
      ok: false,
      message: "Chosen prod topology has no author hostname in cache.",
    };
  }

  return {
    ok: true,
    hostname: hosts[0]!,
    topologyName: chosenTop,
  };
}

/**
 * Full `amstool list` output (no UI row cap). For server-side lookups.
 */
export async function loadAmstoolListRows(): Promise<AmstoolListLoadResult> {
  const gate = gateAmstool();
  if (!gate.ok) {
    const r = gate.result;
    return { ok: false, code: r.code, message: r.message };
  }

  const fetched = await fetchAmstoolListStdout(gate.amstoolPath);
  if (!fetched.ok) {
    return { ok: false, code: "FAILED", message: fetched.message };
  }

  const rows: AmstoolCacheRow[] = [];
  for (const line of fetched.text.split("\n")) {
    const row = parseListLine(line);
    if (row) {
      rows.push(row);
    }
  }

  if (rows.length === 0) {
    return {
      ok: false,
      code: "FAILED",
      message:
        "amstool list returned no parseable rows. Try running `amstool cache` locally, then refresh this page.",
    };
  }

  return { ok: true, rows, amstoolPath: gate.amstoolPath };
}

/**
 * One `amstool list`, then keeps lines matching any topology stub (grep -i style),
 * grouped by topology name for display.
 */
export async function getAmstoolCacheSnapshot(
  options?: GetAmstoolCacheSnapshotOptions,
): Promise<AmstoolCacheResult> {
  const limitRaw = process.env.AMSTOOL_TABLE_ROW_LIMIT;
  const displayedRowLimit = limitRaw
    ? Math.min(500, Math.max(1, Number.parseInt(limitRaw, 10) || 75))
    : 75;

  const gate = gateAmstool();
  if (!gate.ok) {
    return gate.result;
  }
  const { amstoolPath } = gate;

  const topologyStubs = [
    ...new Set(
      (options?.topologyStubs ?? [])
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];

  if (topologyStubs.length === 0) {
    return {
      ok: false,
      code: "FAILED",
      message:
        "Set a **topology stub** on one or more customers (edit customer). Each stub is matched against `amstool list` like `grep -i`.",
    };
  }

  try {
    const fetched = await fetchAmstoolListStdout(amstoolPath);
    if (!fetched.ok) {
      return { ok: false, code: "FAILED", message: fetched.message };
    }
    const text = fetched.text;

    const { rows: taggedMatched, stubMatched } = filterRowsByTopologyStubs(
      text,
      topologyStubs,
    );

    const stubsWithNoMatches = topologyStubs.filter((s) => !stubMatched.get(s));

    if (taggedMatched.length === 0) {
      return {
        ok: false,
        code: "FAILED",
        message:
          "No lines in your local `amstool list` output matched these topology stubs. Run `amstool cache`, check spelling, or verify with `amstool list | grep -i <stub>` in a terminal.",
      };
    }

    const matchedBare = taggedMatched.map(stripMatchedStubs);

    const fullGroupsAll = groupRowsByTopology(matchedBare);
    const topologyGroupsAll = capTopologyGroups(
      fullGroupsAll,
      displayedRowLimit,
    );
    const displayedRowCountAll = topologyGroupsAll.reduce(
      (n, g) => n + g.rows.length,
      0,
    );

    const summaryAll = buildSummary(matchedBare);

    const perStub: AmstoolPageViewPayload["perStub"] = {};
    for (const stub of topologyStubs) {
      const subBare = taggedMatched
        .filter((r) => r.matchedStubs.includes(stub))
        .map(stripMatchedStubs);
      const fullG = groupRowsByTopology(subBare);
      const capped = capTopologyGroups(fullG, displayedRowLimit);
      const displayedRowCount = capped.reduce((n, g) => n + g.rows.length, 0);
      perStub[stub] = {
        topologyGroups: capped,
        summary: buildSummary(subBare),
        displayedRowCount,
        totalMatchedRows: subBare.length,
      };
    }

    const viewPayload: AmstoolPageViewPayload = {
      topologyStubsUsed: topologyStubs,
      stubsWithNoMatches,
      topologyGroupsAll,
      summaryAll,
      displayedRowCountAll,
      totalMatchedRowsAll: matchedBare.length,
      perStub,
      amstoolPath,
      rowLimit: displayedRowLimit,
    };

    return {
      ok: true,
      viewPayload,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      code: "FAILED",
      message: `amstool list failed: ${msg}`,
    };
  }
}

