import "server-only";

import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

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

/**
 * Returns SSM patch level from TDL for a hostname or topology (prod author target).
 */
export async function getAmstoolPatchLevel(
  target: string,
): Promise<AmstoolPatchLevelResult> {
  const trimmed = target.trim();
  if (!trimmed) {
    return { ok: false, code: "EMPTY", message: "Target is empty." };
  }

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
        timeout: 120_000,
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
    return {
      ok: false,
      code: "FAILED",
      message: `amstool info patch-level failed: ${msg}`,
    };
  }
}

/**
 * Resolve patch levels for many targets; each distinct target is queried once.
 */
export async function getAmstoolPatchLevelsForTargets(
  targets: string[],
): Promise<Map<string, AmstoolPatchLevelResult>> {
  const unique = [...new Set(targets.map((t) => t.trim()).filter(Boolean))];
  const entries = await Promise.all(
    unique.map(async (t) => [t, await getAmstoolPatchLevel(t)] as const),
  );
  return new Map(entries);
}
