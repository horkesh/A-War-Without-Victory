/**
 * Phase C: Political Controller Remap AUDIT
 *
 * Verifies that every settlement resolves to a political controller after
 * remapping municipality codes to mun1990_id.
 *
 * Deterministic: no timestamps, stable sorting. Uses mistake guard.
 *
 * Inputs:
 * - data/derived/settlements_index_1990.json (settlements with mun1990_id)
 * - data/source/municipality_political_controllers.json (controllers by post1995 code)
 * - data/source/municipality_post1995_to_mun1990.json (remap from post1995 to mun1990)
 * - data/source/municipalities_1990_registry_110.json (canonical 110 opštine)
 *
 * Outputs:
 * - data/diagnostics/political_controller_remap_audit.json (structured report)
 * - docs/audits/political_controller_remap_audit.md (human-readable report)
 *
 * Exit code:
 * - 0 if all settlements resolve to a controller (including explicit nulls)
 * - 1 if any settlement is silently unmapped (no controller and no explicit null)
 */

import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';


const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');


// Canonical faction IDs
const CANONICAL_FACTION_IDS = ['RBiH', 'RS', 'HRHB'] as const;
type FactionId = typeof CANONICAL_FACTION_IDS[number];
type ControllerId = FactionId | null;

interface SettlementEntry {
  sid: string;
  mun_code: string;
  mun: string;
  mun1990_id?: string;
  name?: string;
}

interface SettlementsIndex {
  settlements?: SettlementEntry[];
}

interface PoliticalControllersFile {
  version: string;
  controllers?: Record<string, string>;
  mappings?: Record<string, string>;
}

interface RemapRow {
  post1995_code: string;
  post1995_name: string;
  mun1990_name: string;
}

interface RemapFile {
  rows?: RemapRow[];
  index_by_post1995_code?: Record<string, string>;
}

interface RegistryRow {
  mun1990_id: string;
  name: string;
  normalized_name: string;
}

interface RegistryFile {
  count: number;
  rows: RegistryRow[];
}

interface SettlementControllerResult {
  sid: string;
  mun1990_id: string | null;
  mun_code: string;
  controller: ControllerId;
  resolution_method: 'mun1990_direct' | 'mun1990_via_name' | 'post1995_fallback' | 'unresolved';
  is_null_explicit: boolean;
}

interface AuditReport {
  schema_version: number;
  generator_script: string;
  total_settlements: number;
  resolved_count: number;
  unresolved_count: number;
  explicit_null_count: number;
  by_controller: Record<string, number>;
  by_resolution_method: Record<string, number>;
  unresolved_settlements: Array<{
    sid: string;
    mun1990_id: string | null;
    mun_code: string;
    reason: string;
  }>;
  settlements: SettlementControllerResult[];
}

/** Normalize name for matching (same as registry normalizer). */
function normalizeName(s: string): string {
  const trim = s.replace(/\s+/g, ' ').trim().replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  let step = trim;
  if (step.startsWith('Grad ')) step = step.slice(5).trim();
  if (step.startsWith('Novo ')) step = step.slice(5).trim();
  step = step.replace(/\s*\((?:FBiH|RS)\)\s*$/i, '').trim();
  return step.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** Convert name to mun1990_id format (snake_case, lowercase, no diacritics). */
function nameToMun1990Id(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

interface DerivedControllers1990 {
  task?: string;
  controllers_by_mun1990_id?: Record<string, ControllerId>;
}

async function main(): Promise<void> {
  console.log('=== Political Controller Remap Audit ===\n');

  const settlementsPath = resolve(ROOT, 'data/derived/settlements_index_1990.json');
  const derivedPath = resolve(ROOT, 'data/derived/municipality_political_controllers_1990.json');
  const controllersPath = resolve(ROOT, 'data/source/municipality_political_controllers.json');
  const remapPath = resolve(ROOT, 'data/source/municipality_post1995_to_mun1990.json');
  const registryPath = resolve(ROOT, 'data/source/municipalities_1990_registry_110.json');

  console.log('Loading settlements_index_1990.json...');
  const settlementsRaw = JSON.parse(await readFile(settlementsPath, 'utf8')) as SettlementsIndex;
  const settlements = settlementsRaw.settlements ?? [];
  console.log(`  Loaded ${settlements.length} settlements`);

  let controllersByMun1990Id = new Map<string, ControllerId>();
  const explicitNullMun1990Ids = new Set<string>();
  let useDerived = false;

  if (existsSync(derivedPath)) {
    try {
      const derivedRaw = JSON.parse(await readFile(derivedPath, 'utf8')) as DerivedControllers1990;
      const map = derivedRaw.controllers_by_mun1990_id ?? {};
      for (const [mun1990Id, controller] of Object.entries(map)) {
        controllersByMun1990Id.set(mun1990Id, controller ?? null);
        if (controller === null) explicitNullMun1990Ids.add(mun1990Id);
      }
      useDerived = true;
      console.log(`  Using derived mapping: data/derived/municipality_political_controllers_1990.json (${controllersByMun1990Id.size} mun1990_id keys)`);
    } catch (e) {
      console.log('  Derived mapping unreadable; building from source files...', String(e));
    }
  } else {
    console.log('  Derived mapping not found; building from source files...');
  }

  let controllersByPost1995: Record<string, string> = {};
  if (!useDerived) {
    console.log('Loading municipality_political_controllers.json...');
    const controllersRaw = JSON.parse(await readFile(controllersPath, 'utf8')) as PoliticalControllersFile;
    controllersByPost1995 = controllersRaw.controllers ?? controllersRaw.mappings ?? {};
    console.log(`  Loaded ${Object.keys(controllersByPost1995).length} controller mappings`);

    console.log('Loading municipality_post1995_to_mun1990.json...');
    const remapRaw = JSON.parse(await readFile(remapPath, 'utf8')) as RemapFile;
    let remapIndex = remapRaw.index_by_post1995_code ?? {};
    if (Object.keys(remapIndex).length === 0 && remapRaw.rows) {
      for (const row of remapRaw.rows) {
        remapIndex[row.post1995_code] = nameToMun1990Id(row.mun1990_name);
      }
    }

    console.log('Loading municipalities_1990_registry_110.json...');
    const registryRaw = JSON.parse(await readFile(registryPath, 'utf8')) as RegistryFile;
    const registry = registryRaw.rows ?? [];

    for (const [post1995Code, controller] of Object.entries(controllersByPost1995)) {
      const mun1990Id = remapIndex[post1995Code];
      if (mun1990Id) {
        const normalizedController = controller === null ? null : (controller as FactionId);
        controllersByMun1990Id.set(mun1990Id, normalizedController);
        if (normalizedController === null) explicitNullMun1990Ids.add(mun1990Id);
      }
    }
    console.log(`  Built ${controllersByMun1990Id.size} mun1990_id -> controller mappings`);
  }

  const nameToMun1990IdMap = new Map<string, string>();
  if (!useDerived) {
    const registryRaw = JSON.parse(await readFile(registryPath, 'utf8')) as RegistryFile;
    const registry = registryRaw.rows ?? [];
    for (const row of registry) {
      const normalized = normalizeName(row.name);
      nameToMun1990IdMap.set(normalized, row.mun1990_id);
    }
  }

  // Process settlements deterministically
  const sortedSettlements = [...settlements].sort((a, b) => a.sid.localeCompare(b.sid));
  const results: SettlementControllerResult[] = [];
  const unresolved: AuditReport['unresolved_settlements'] = [];

  let resolvedCount = 0;
  let unresolvedCount = 0;
  let explicitNullCount = 0;
  const byController: Record<string, number> = { RBiH: 0, RS: 0, HRHB: 0, null: 0 };
  const byResolutionMethod: Record<string, number> = {
    mun1990_direct: 0,
    mun1990_via_name: 0,
    post1995_fallback: 0,
    unresolved: 0
  };

  for (const settlement of sortedSettlements) {
    const { sid, mun_code, mun1990_id } = settlement;
    let controller: ControllerId = null;
    let resolutionMethod: SettlementControllerResult['resolution_method'] = 'unresolved';
    let isNullExplicit = false;

    // When using derived mapping: resolve only by mun1990_id; null in map = explicit null; not in map = unresolved
    if (useDerived) {
      if (mun1990_id && controllersByMun1990Id.has(mun1990_id)) {
        controller = controllersByMun1990Id.get(mun1990_id) ?? null;
        resolutionMethod = 'mun1990_direct';
        isNullExplicit = controller === null;
      }
    } else {
      // Method 1: Direct mun1990_id lookup
      if (mun1990_id && controllersByMun1990Id.has(mun1990_id)) {
        controller = controllersByMun1990Id.get(mun1990_id) ?? null;
        resolutionMethod = 'mun1990_direct';
        isNullExplicit = controller === null && explicitNullMun1990Ids.has(mun1990_id);
      }
      // Method 2: Try to find mun1990_id via normalized name matching
      else if (mun1990_id) {
        const normalized = normalizeName(mun1990_id.replace(/_/g, ' '));
        const matchedMun1990Id = nameToMun1990IdMap.get(normalized);
        if (matchedMun1990Id && controllersByMun1990Id.has(matchedMun1990Id)) {
          controller = controllersByMun1990Id.get(matchedMun1990Id) ?? null;
          resolutionMethod = 'mun1990_via_name';
          isNullExplicit = controller === null && explicitNullMun1990Ids.has(matchedMun1990Id);
        }
      }
      // Method 3: Fallback to post1995 code
      if (resolutionMethod === 'unresolved' && mun_code) {
        const post1995Controller = controllersByPost1995[mun_code];
        if (post1995Controller !== undefined) {
          controller = post1995Controller === null ? null : (post1995Controller as FactionId);
          resolutionMethod = 'post1995_fallback';
          isNullExplicit = controller === null;
        }
      }
    }

    // Record result
    const result: SettlementControllerResult = {
      sid,
      mun1990_id: mun1990_id ?? null,
      mun_code,
      controller,
      resolution_method: resolutionMethod,
      is_null_explicit: isNullExplicit
    };
    results.push(result);

    // Update counts
    if (resolutionMethod !== 'unresolved') {
      resolvedCount++;
      if (controller === null) {
        if (isNullExplicit) {
          explicitNullCount++;
          byController['null']++;
        } else {
          // Resolved but null without explicit - treat as resolved
          byController['null']++;
        }
      } else {
        byController[controller] = (byController[controller] ?? 0) + 1;
      }
    } else {
      unresolvedCount++;
      unresolved.push({
        sid,
        mun1990_id: mun1990_id ?? null,
        mun_code,
        reason: `No controller mapping found for mun1990_id="${mun1990_id ?? 'null'}" or mun_code="${mun_code}"`
      });
    }
    byResolutionMethod[resolutionMethod]++;
  }

  // Build report
  const report: AuditReport = {
    schema_version: 1,
    generator_script: 'scripts/audits/audit_political_controller_remap.ts',
    total_settlements: settlements.length,
    resolved_count: resolvedCount,
    unresolved_count: unresolvedCount,
    explicit_null_count: explicitNullCount,
    by_controller: byController,
    by_resolution_method: byResolutionMethod,
    unresolved_settlements: unresolved,
    settlements: results
  };

  // Write JSON report
  const diagnosticsDir = resolve(ROOT, 'data/diagnostics');
  await mkdir(diagnosticsDir, { recursive: true });
  const jsonPath = resolve(diagnosticsDir, 'political_controller_remap_audit.json');
  await writeFile(jsonPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\nWrote JSON report: ${jsonPath}`);

  // Write Markdown report
  const auditsDir = resolve(ROOT, 'docs/audits');
  await mkdir(auditsDir, { recursive: true });
  const mdPath = resolve(auditsDir, 'political_controller_remap_audit.md');

  const mdContent = `# Political Controller Remap Audit

Generated by: \`scripts/audits/audit_political_controller_remap.ts\`

## Summary

| Metric | Count |
|--------|-------|
| Total settlements | ${report.total_settlements} |
| Resolved | ${report.resolved_count} |
| Unresolved | ${report.unresolved_count} |
| Explicit null controllers | ${report.explicit_null_count} |

## By Controller

| Controller | Count |
|------------|-------|
| RBiH | ${byController['RBiH']} |
| RS | ${byController['RS']} |
| HRHB | ${byController['HRHB']} |
| null (explicit) | ${byController['null']} |

## By Resolution Method

| Method | Count |
|--------|-------|
| mun1990_direct | ${byResolutionMethod['mun1990_direct']} |
| mun1990_via_name | ${byResolutionMethod['mun1990_via_name']} |
| post1995_fallback | ${byResolutionMethod['post1995_fallback']} |
| unresolved | ${byResolutionMethod['unresolved']} |

${unresolved.length > 0 ? `
## Unresolved Settlements (${unresolved.length})

These settlements could not be mapped to any political controller:

| SID | mun1990_id | mun_code | Reason |
|-----|------------|----------|--------|
${unresolved.slice(0, 50).map(u => `| ${u.sid} | ${u.mun1990_id ?? 'null'} | ${u.mun_code} | ${u.reason} |`).join('\n')}
${unresolved.length > 50 ? `\n... and ${unresolved.length - 50} more (see JSON report for full list)` : ''}

**AUDIT FAILED**: ${unresolved.length} settlement(s) are silently unmapped.
` : `
## Status: PASS

All ${report.total_settlements} settlements resolve to a political controller (including ${report.explicit_null_count} with explicit null).
`}

## Files Used

- Settlements: \`data/derived/settlements_index_1990.json\`
- Controllers: \`data/source/municipality_political_controllers.json\`
- Remap: \`data/source/municipality_post1995_to_mun1990.json\`
- Registry: \`data/source/municipalities_1990_registry_110.json\`
`;

  await writeFile(mdPath, mdContent, 'utf8');
  console.log(`Wrote Markdown report: ${mdPath}`);

  // Print summary
  console.log('\n=== Audit Summary ===');
  console.log(`Total settlements: ${report.total_settlements}`);
  console.log(`Resolved: ${report.resolved_count}`);
  console.log(`Unresolved: ${report.unresolved_count}`);
  console.log(`By controller: RBiH=${byController['RBiH']}, RS=${byController['RS']}, HRHB=${byController['HRHB']}, null=${byController['null']}`);
  console.log(`By method: direct=${byResolutionMethod['mun1990_direct']}, via_name=${byResolutionMethod['mun1990_via_name']}, fallback=${byResolutionMethod['post1995_fallback']}, unresolved=${byResolutionMethod['unresolved']}`);

  // Exit with failure if any unresolved
  if (unresolvedCount > 0) {
    console.error(`\n❌ AUDIT FAILED: ${unresolvedCount} settlement(s) are silently unmapped.`);
    console.error('First 5 unresolved:');
    for (const u of unresolved.slice(0, 5)) {
      console.error(`  - ${u.sid}: ${u.reason}`);
    }
    process.exit(1);
  } else {
    console.log('\n✅ AUDIT PASSED: All settlements resolve to a political controller.');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
