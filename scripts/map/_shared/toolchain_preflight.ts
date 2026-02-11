/**
 * Toolchain preflight: deterministic check for required native tools.
 *
 * PURPOSE:
 *   Fail fast when osmium or gdalwarp are missing. Record versions when present.
 *   Used by H6.2 terrain snapshot scripts (phase_h6_2_snapshot_osm_terrain.ts,
 *   phase_h6_2_snapshot_dem_clip.ts). No timestamps. Stable ordering.
 *
 * WHY EXECUTION MAY FAIL (via callers):
 *   - osmium or gdalwarp not on PATH — requireTools() throws with install hints
 *   - Tools return non-zero — results recorded; caller may throw
 *
 * DO NOT: Add simulation logic or terrain consumption. This is a pure preflight
 *         utility. Results are recorded in audit JSON under toolchain.tools.
 */

import { spawnSync } from 'node:child_process';

export type ToolSpec = {
  name: string;
  cmd: string;
  args: string[];
  install_hint: string;
};

export type ToolResult = {
  name: string;
  cmd: string;
  ok: boolean;
  version: string | null;
  error: string | null;
};

export const OSMIUM_SPEC: ToolSpec = {
  name: 'osmium-tool',
  cmd: 'osmium',
  args: ['--version'],
  install_hint: 'Install osmium-tool from https://osmcode.org/osmium-tool/ and ensure `osmium` is on PATH.',
};

export const GDALWARP_SPEC: ToolSpec = {
  name: 'GDAL (gdalwarp)',
  cmd: 'gdalwarp',
  args: ['--version'],
  install_hint: 'Install GDAL from https://gdal.org/ and ensure `gdalwarp` is on PATH.',
};

export function requireTools(
  specs: ToolSpec[],
  opts?: { throwOnMissing?: boolean }
): { ok: boolean; results: ToolResult[] } {
  const throwOnMissing = opts?.throwOnMissing !== false;
  const results: ToolResult[] = [];

  for (const spec of specs) {
    const r = spawnSync(spec.cmd, spec.args, { encoding: 'utf8' });
    const stdout = (r.stdout ?? '').trim();
    const stderr = (r.stderr ?? '').trim();
    const ok = r.status === 0;

    let version: string | null = null;
    let error: string | null = null;

    if (ok) {
      const firstStdout = stdout.split(/\r?\n/).find((l) => l.trim().length > 0);
      const firstStderr = stderr.split(/\r?\n/).find((l) => l.trim().length > 0);
      version = (firstStdout ?? firstStderr ?? '').trim() || null;
    } else {
      const parts: string[] = [`exit code ${r.status ?? 'unknown'}`];
      if (stderr) parts.push(stderr);
      else if (stdout) parts.push(stdout);
      error = parts.join('; ').trim() || `exit code ${r.status ?? 'unknown'}`;
    }

    results.push({
      name: spec.name,
      cmd: spec.cmd,
      ok,
      version,
      error,
    });
  }

  const anyMissing = results.some((r) => !r.ok);
  if (anyMissing && throwOnMissing) {
    const missing = results.filter((r) => !r.ok);
    const lines = missing.map(
      (r) => `  - ${r.name}: ${r.error}\n    Hint: ${specs.find((s) => s.name === r.name)!.install_hint}`
    );
    throw new Error(
      `Required tools missing. Install them and ensure they are on PATH:\n\n${lines.join('\n\n')}`
    );
  }

  return {
    ok: !anyMissing,
    results,
  };
}
