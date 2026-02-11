/**
 * Phase E8: Apply canonical XLSX-derived controller map to initial mun1990 controller dataset.
 * Reads data/_deprecated/derived/municipalities_BiH_initial_controller_map.json (deprecated artifact; authoritative mun1990 controllers are in data/source/municipalities_1990_initial_political_controllers.json).
 * Deterministic; no heuristics.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');


const CANONICAL_MAP_PATH = resolve(ROOT, 'data/_deprecated/derived/municipalities_BiH_initial_controller_map.json');
const REGISTRY_PATH = resolve(ROOT, 'data/source/municipalities_1990_registry_110.json');
const TARGET_PATH = resolve(ROOT, 'data/source/municipalities_1990_initial_political_controllers.json');
const REPORT_PATH = resolve(ROOT, 'data/derived/_debug/phaseE8_apply_controller_map_report.txt');

const JUSTIFICATION =
  'Auth: data/_deprecated/derived/municipalities_BiH_initial_controller_map.json (from municipalities_BiH.xlsx + overrides)';

type ControllerId = 'RBiH' | 'RS' | 'HRHB' | null;

function trim(s: string): string {
  return s.trim();
}

interface RegistryRow {
  mun1990_id: string;
  name: string;
  normalized_name: string;
}

interface TargetJson {
  meta: { purpose?: string; id_scheme?: string; allowed_values?: unknown[]; notes?: string };
  controllers_by_mun1990_id: Record<string, ControllerId>;
  null_justifications_by_mun1990_id?: Record<string, string>;
  controller_justifications_by_mun1990_id?: Record<string, string>;
  missing_in_authoritative_source?: string[];
}

async function main(): Promise<void> {
  const canonicalRaw = JSON.parse(await readFile(CANONICAL_MAP_PATH, 'utf8')) as {
    controllers_by_pre1995_name?: Record<string, string | null>;
  };
  const controllersByPre1995Name = canonicalRaw.controllers_by_pre1995_name ?? {};

  const registryRaw = JSON.parse(await readFile(REGISTRY_PATH, 'utf8')) as { rows?: RegistryRow[] };
  const registryRows: RegistryRow[] = registryRaw.rows ?? [];

  const targetRaw = JSON.parse(await readFile(TARGET_PATH, 'utf8')) as TargetJson;
  const controllers = { ...targetRaw.controllers_by_mun1990_id };
  const controllerJustifications: Record<string, string> = {
    ...(targetRaw.controller_justifications_by_mun1990_id ?? {})
  };
  let nullJustifications: Record<string, string> = {
    ...(targetRaw.null_justifications_by_mun1990_id ?? {})
  };

  const nameToMun1990Id = new Map<string, string>();
  for (const row of registryRows) {
    const nameKey = trim(row.name);
    const normKey = trim(row.normalized_name);
    const existingName = nameToMun1990Id.get(nameKey);
    const existingNorm = nameToMun1990Id.get(normKey);
    if (existingName != null && existingName !== row.mun1990_id) {
      process.stderr.write(`Ambiguous mapping: name "${nameKey}" maps to both ${existingName} and ${row.mun1990_id}\n`);
      process.exit(1);
    }
    if (existingNorm != null && existingNorm !== row.mun1990_id) {
      process.stderr.write(
        `Ambiguous mapping: normalized_name "${normKey}" maps to both ${existingNorm} and ${row.mun1990_id}\n`
      );
      process.exit(1);
    }
    nameToMun1990Id.set(nameKey, row.mun1990_id);
    if (normKey !== nameKey) {
      nameToMun1990Id.set(normKey, row.mun1990_id);
    }
  }

  const canonicalKeys = Object.keys(controllersByPre1995Name).sort((a, b) => a.localeCompare(b));
  const unmappedNames: string[] = [];
  let appliedCount = 0;

  for (const pre1995Name of canonicalKeys) {
    const keyTrimmed = trim(pre1995Name);
    const mun1990_id = nameToMun1990Id.get(keyTrimmed);
    if (mun1990_id == null) {
      unmappedNames.push(pre1995Name);
      continue;
    }
    const controllerRaw = controllersByPre1995Name[pre1995Name];
    const controller: ControllerId =
      controllerRaw === null || controllerRaw === 'null' ? null : (controllerRaw as ControllerId);

    controllers[mun1990_id] = controller;
    controllerJustifications[mun1990_id] = JUSTIFICATION;
    if (controller === null) {
      nullJustifications[mun1990_id] = 'Explicitly null in canonical source';
    } else if (nullJustifications[mun1990_id]) {
      delete nullJustifications[mun1990_id];
    }
    appliedCount += 1;
  }

  if (unmappedNames.length > 0) {
    unmappedNames.sort((a, b) => a.localeCompare(b));
    process.stderr.write(
      `Unmapped pre-1995 names in canonical map: ${unmappedNames.join(', ')}\n`
    );
    process.exit(1);
  }

  const registryOrder = registryRows.map((r) => r.mun1990_id).sort((a, b) => a.localeCompare(b));
  const remainingNull: string[] = [];
  for (const mun1990_id of registryOrder) {
    const c = controllers[mun1990_id];
    if (c === null || c === undefined) {
      remainingNull.push(mun1990_id);
      if (!controllerJustifications[mun1990_id]) {
        nullJustifications[mun1990_id] = 'Missing in authoritative source';
      }
    }
  }
  remainingNull.sort((a, b) => a.localeCompare(b));

  const missingInSource = [...remainingNull];

  const out: TargetJson = {
    meta: targetRaw.meta,
    controllers_by_mun1990_id: Object.fromEntries(
      registryOrder.map((id) => [id, controllers[id] ?? null])
    ),
    controller_justifications_by_mun1990_id:
      Object.keys(controllerJustifications).length > 0 ? controllerJustifications : undefined,
    null_justifications_by_mun1990_id:
      Object.keys(nullJustifications).length > 0 ? nullJustifications : undefined,
    missing_in_authoritative_source: missingInSource.length > 0 ? missingInSource : undefined
  };

  await writeFile(TARGET_PATH, JSON.stringify(out, null, 2) + '\n', 'utf8');

  const countByController: Record<string, number> = { RBiH: 0, RS: 0, HRHB: 0, null: 0 };
  for (const id of registryOrder) {
    const c = controllers[id];
    const key = c === null || c === undefined ? 'null' : c;
    countByController[key] = (countByController[key] ?? 0) + 1;
  }

  const reportLines: string[] = [
    'Phase E8: Apply canonical controller map to mun1990 initial controls',
    '',
    'CANONICAL_MAP: data/_deprecated/derived/municipalities_BiH_initial_controller_map.json',
    'TARGET: data/source/municipalities_1990_initial_political_controllers.json',
    '',
    'CONTROLLERS_APPLIED: ' + appliedCount,
    'REMAINING_NULL_MUN1990_IDS: ' + remainingNull.length,
    ...remainingNull.map((id) => '  ' + id),
    '',
    'COUNTS_BY_CONTROLLER (110 municipalities):',
    '  RBiH: ' + countByController.RBiH,
    '  RS: ' + countByController.RS,
    '  HRHB: ' + countByController.HRHB,
    '  null: ' + countByController.null
  ];

  await mkdir(resolve(ROOT, 'data/derived/_debug'), { recursive: true });
  await writeFile(REPORT_PATH, reportLines.join('\n') + '\n', 'utf8');

  process.stdout.write(
    `Phase E8: Applied ${appliedCount} controllers. Remaining null: ${remainingNull.length}. Report: ${REPORT_PATH}\n`
  );
}

main().catch((err) => {
  process.stderr.write(String(err) + '\n');
  process.exit(1);
});
