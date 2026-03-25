import "server-only";

import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** One row from `amstool list` (tab-separated; see `amstool list --help`). */
export type AmstoolCacheRow = {
  hostname: string;
  instanceId: string;
  eip: string;
  topologyName: string;
  bbLogicalName: string;
  region: string;
  bbId: string;
  cloudAccount: string;
  bbUrl: string;
  environment: string;
  aemType: string;
  ldapEnabled: string;
  clone: string;
  extra: string[];
};

export type AmstoolCacheSummary = {
  totalHosts: number;
  topologyCount: number;
  byAemType: Record<string, number>;
  topTopologies: { name: string; count: number }[];
};

export type AmstoolCacheResult =
  | {
      ok: true;
      amstoolPath: string;
      rows: AmstoolCacheRow[];
      summary: AmstoolCacheSummary;
      displayedRowCount: number;
    }
  | { ok: false; code: "DISABLED" | "NOT_FOUND" | "FAILED"; message: string };

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

function parseListLine(line: string): AmstoolCacheRow | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }
  const parts = trimmed.split("\t").map((p) => p.trim());
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

/**
 * Full `amstool list` output (no UI row cap). For server-side lookups such as MSC → author hostname.
 */
export async function loadAmstoolListRows(): Promise<AmstoolListLoadResult> {
  if (process.env.AMSTOOL_INTEGRATION === "0") {
    return {
      ok: false,
      code: "DISABLED",
      message:
        "AMSTOOL integration is off (AMSTOOL_INTEGRATION=0). Remove or unset it to enable.",
    };
  }

  const amstoolPath = resolveAmstoolPath();
  if (!amstoolPath) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message:
        "amstool was not found. Install it (e.g. Homebrew) or set AMSTOOL_PATH to the binary.",
    };
  }
  if (!existsSync(amstoolPath)) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: `AMSTOOL_PATH is set but the file does not exist: ${amstoolPath}`,
    };
  }

  try {
    const { stdout, stderr } = await execFileAsync(amstoolPath, ["list"], {
      maxBuffer: 64 * 1024 * 1024,
      env: process.env,
    });

    const text = stdout?.toString() ?? "";
    if (!text.trim() && stderr) {
      return {
        ok: false,
        code: "FAILED",
        message: stderr.toString().trim() || "amstool list produced no output.",
      };
    }

    const rows: AmstoolCacheRow[] = [];
    for (const line of text.split("\n")) {
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

    return { ok: true, rows, amstoolPath };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      code: "FAILED",
      message: `amstool list failed: ${msg}`,
    };
  }
}

/**
 * Reads the local AMSTOOL cache via `amstool list` (same as leaving hostname blank in the CLI).
 * Intended for developer machines where Homebrew amstool is installed; returns a structured error elsewhere.
 */
export async function getAmstoolCacheSnapshot(): Promise<AmstoolCacheResult> {
  const limitRaw = process.env.AMSTOOL_TABLE_ROW_LIMIT;
  const displayedRowLimit = limitRaw
    ? Math.min(500, Math.max(1, Number.parseInt(limitRaw, 10) || 75))
    : 75;

  const loaded = await loadAmstoolListRows();
  if (!loaded.ok) {
    return loaded;
  }

  const { rows, amstoolPath } = loaded;
  const summary = buildSummary(rows);
  const displayedRows = rows.slice(0, displayedRowLimit);

  return {
    ok: true,
    amstoolPath,
    rows: displayedRows,
    summary,
    displayedRowCount: displayedRows.length,
  };
}
