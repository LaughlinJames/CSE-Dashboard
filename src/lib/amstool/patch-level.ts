import "server-only";

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { unstable_cache } from "next/cache";

const execFileAsync = promisify(execFile);

export type AmstoolPatchLevelResult =
  | { ok: true; patchLevel: string }
  | { ok: false; code: "DISABLED" | "NOT_FOUND" | "FAILED" | "EMPTY"; message: string };

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

/**
 * Parse `amstool info -e <target> patch-level` stdout (table with Host / Patch Level columns).
 */
function parsePatchLevelStdout(stdout: string): string | null {
  const lines = stdout.split("\n").map((l) => l.trimEnd());
  let pastHeader = false;
  let pastSeparator = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^Host\s+Patch\s+Level/i.test(trimmed)) {
      pastHeader = true;
      pastSeparator = false;
      continue;
    }
    if (pastHeader && !pastSeparator && /^[-\s]+$/.test(trimmed)) {
      pastSeparator = true;
      continue;
    }
    if (pastHeader && pastSeparator) {
      const parts = trimmed.includes("\t")
        ? trimmed.split("\t").map((p) => p.trim()).filter(Boolean)
        : trimmed.split(/\s{2,}/).filter(Boolean);
      if (parts.length >= 2) {
        const level = parts[parts.length - 1]?.trim();
        if (level) return level;
      }
    }
  }
  return null;
}

export type GetAmstoolPatchLevelOptions = {
  /** @default AMSTOOL_PATCH_LEVEL_TIMEOUT_MS env or 120_000 */
  timeoutMs?: number;
};

function resolvePatchLevelTimeoutMs(override?: number): number {
  if (override != null && Number.isFinite(override) && override > 0) {
    return Math.min(Math.floor(override), 300_000);
  }
  const fromEnv = Number(process.env.AMSTOOL_PATCH_LEVEL_TIMEOUT_MS);
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return Math.min(Math.floor(fromEnv), 300_000);
  }
  return 120_000;
}

/**
 * Returns SSM patch level from TDL for a hostname or topology (prod author target).
 */
export async function getAmstoolPatchLevel(
  target: string,
  options?: GetAmstoolPatchLevelOptions,
): Promise<AmstoolPatchLevelResult> {
  const trimmed = target.trim();
  if (!trimmed) {
    return { ok: false, code: "EMPTY", message: "Target is empty." };
  }

  const timeoutMs = resolvePatchLevelTimeoutMs(options?.timeoutMs);

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
    const { stdout, stderr } = await execFileAsync(
      amstoolPath,
      ["info", "-e", trimmed, "patch-level"],
      {
        maxBuffer: 4 * 1024 * 1024,
        env: process.env,
        timeout: timeoutMs,
      },
    );

    const text = stdout?.toString() ?? "";
    const patchLevel = parsePatchLevelStdout(text);

    if (patchLevel) {
      return { ok: true, patchLevel };
    }

    const failLine = text
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.startsWith("[FAILED]"));
    const hint = failLine ?? stderr?.toString()?.trim();
    return {
      ok: false,
      code: "FAILED",
      message:
        hint ||
        "amstool did not return a patch level (empty table or unparsable output).",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    let detail = `amstool info patch-level failed: ${msg}`;
    if (/ETIMEDOUT|timed out|TIMEOUT|SIGTERM|killed/i.test(msg)) {
      detail +=
        " If `amstool` needs VPN or corporate network, confirm you are connected.";
    }
    return {
      ok: false,
      code: "FAILED",
      message: detail,
    };
  }
}

/** Avoid re-running `amstool info` on every cold path when caching is enabled. */
const PATCH_LEVEL_CACHE_SECONDS = 300;

export type GetAmstoolPatchLevelsForTargetsOptions = {
  timeoutMs?: number;
  /**
   * When false, skips `unstable_cache` (recommended for dashboard follow-up loads so VPN/offline errors are fresh).
   * @default true
   */
  useCache?: boolean;
};

/**
 * Resolve patch levels for many targets; each distinct target is queried once.
 * With `useCache: true` (default), results are cached across requests in production.
 */
export async function getAmstoolPatchLevelsForTargets(
  targets: string[],
  options?: GetAmstoolPatchLevelsForTargetsOptions,
): Promise<Map<string, AmstoolPatchLevelResult>> {
  const unique = [...new Set(targets.map((t) => t.trim()).filter(Boolean))];
  if (unique.length === 0) {
    return new Map();
  }

  const sorted = [...unique].sort();
  const timeoutMs = resolvePatchLevelTimeoutMs(options?.timeoutMs);

  const run = () =>
    Promise.all(
      sorted.map(
        async (t) => [t, await getAmstoolPatchLevel(t, { timeoutMs })] as const,
      ),
    );

  if (options?.useCache === false) {
    return new Map(await run());
  }

  const keyHash = createHash("sha256").update(sorted.join("\0")).digest("hex");

  const entries = await unstable_cache(
    async () => await run(),
    ["amstool-patch-levels", keyHash],
    { revalidate: PATCH_LEVEL_CACHE_SECONDS },
  )();

  return new Map(entries);
}
