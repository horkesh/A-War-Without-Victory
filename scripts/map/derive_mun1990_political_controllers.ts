/**
 * Phase C.3: Derive canonical political controllers mapping keyed by mun1990_id.
 * Deterministic: stable sorting, no timestamps.
 *
 * Inputs (read-only):
 * - data/source/municipality_political_controllers.json (controllers by post1995 code)
 * - data/source/municipality_post1995_to_mun1990.json (post1995_code -> mun1990_name)
 * - data/source/municipalities_1990_registry_110.json (canonical mun1990_id list)
 *
 * Output:
 * - data/derived/municipality_political_controllers_1990.json
 * - docs/audits/phase_c3_mun1990_political_controllers.md
 *
 * Rules: For each mun1990_id, collect contributing post1995 codes' controllers.
 * If all same -> assign; if conflict -> null + record; if no contributors -> missing.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

type ControllerId = 'RBiH' | 'RS' | 'HRHB' | null;

interface RegistryRow {
  mun1990_id: string;
  name: string;
  normalized_name?: string;
}

interface RegistryFile {
  rows?: RegistryRow[];
}

interface RemapFile {
  rows?: Array<{ post1995_code: string; mun1990_name: string }>;
  index_by_post1995_code?: Record<string, string>;
}

interface ControllersFile {
  controllers?: Record<string, string>;
  /** Phase H1.2.2: data:extract1990 outputs { version, mappings }; loader expects mappings. */
  mappings?: Record<string, string>;
}

interface DerivedOutput {
  task: string;
  controllers_by_mun1990_id: Record<string, ControllerId>;
  stats: { total_registry: number; assigned: number; missing: number; conflicted: number };
  missing_mun1990_ids: string[];
  conflicts: Array<{ mun1990_id: string; controllers: string[]; post1995_codes: string[] }>;
}

function buildDisplayNameToCanonical(registry: RegistryFile): Map<string, string> {
  const map = new Map<string, string>();
  const rows = registry.rows ?? [];
  for (const row of rows) {
    if (typeof row.mun1990_id === 'string' && row.mun1990_id.length > 0) {
      if (typeof row.name === 'string' && row.name.length > 0) map.set(row.name, row.mun1990_id);
      if (typeof row.normalized_name === 'string' && row.normalized_name.length > 0)
        map.set(row.normalized_name, row.mun1990_id);
    }
  }
  return map;
}

async function main(): Promise<void> {
  const registryPath = resolve(ROOT, 'data/source/municipalities_1990_registry_110.json');
  const remapPath = resolve(ROOT, 'data/source/municipality_post1995_to_mun1990.json');
  const controllersPath = resolve(ROOT, 'data/source/municipality_political_controllers.json');
  const outJsonPath = resolve(ROOT, 'data/derived/municipality_political_controllers_1990.json');
  const outMdPath = resolve(ROOT, 'docs/audits/phase_c3_mun1990_political_controllers.md');

  const [registryRaw, remapRaw, controllersRaw] = await Promise.all([
    readFile(registryPath, 'utf8').then((t) => JSON.parse(t) as RegistryFile),
    readFile(remapPath, 'utf8').then((t) => JSON.parse(t) as RemapFile),
    readFile(controllersPath, 'utf8').then((t) => JSON.parse(t) as ControllersFile)
  ]);

  const displayNameToCanonical = buildDisplayNameToCanonical(registryRaw);
  const registryRows = registryRaw.rows ?? [];
  const allMun1990Ids = registryRows.map((r) => r.mun1990_id).filter(Boolean).sort((a, b) => a.localeCompare(b));

  const indexByPost1995 = remapRaw.index_by_post1995_code ?? {};
  if (Object.keys(indexByPost1995).length === 0 && remapRaw.rows) {
    for (const row of remapRaw.rows) {
      indexByPost1995[row.post1995_code] = row.mun1990_name;
    }
  }

  const controllersByPost1995 = controllersRaw.controllers ?? controllersRaw.mappings ?? {};

  // post1995_code -> mun1990_id (canonical)
  const post1995ToMun1990Id = new Map<string, string>();
  for (const [code, displayName] of Object.entries(indexByPost1995)) {
    const mun1990Id = displayNameToCanonical.get(displayName);
    if (mun1990Id) post1995ToMun1990Id.set(code, mun1990Id);
  }

  // mun1990_id -> list of controller values from contributing post1995 codes
  const contributorsByMun1990 = new Map<string, Array<{ post1995_code: string; controller: string | null }>>();
  for (const [post1995Code, controller] of Object.entries(controllersByPost1995)) {
    const mun1990Id = post1995ToMun1990Id.get(post1995Code);
    if (!mun1990Id) continue;
    const c = controller === null || controller === undefined ? null : (controller as string);
    const normalized = c === null ? null : (c === 'RBiH' || c === 'RS' || c === 'HRHB' ? c : c);
    if (!contributorsByMun1990.has(mun1990Id)) contributorsByMun1990.set(mun1990Id, []);
    contributorsByMun1990.get(mun1990Id)!.push({ post1995_code: post1995Code, controller: normalized });
  }

  const controllersByMun1990Id: Record<string, ControllerId> = {};
  const missingMun1990Ids: string[] = [];
  const conflicts: DerivedOutput['conflicts'] = [];

  for (const mun1990Id of allMun1990Ids) {
    const contributors = contributorsByMun1990.get(mun1990Id);
    if (!contributors || contributors.length === 0) {
      missingMun1990Ids.push(mun1990Id);
      controllersByMun1990Id[mun1990Id] = null;
      continue;
    }
    const values = [...new Set(contributors.map((x) => x.controller ?? 'null'))];
    if (values.length === 1) {
      const v = values[0];
      controllersByMun1990Id[mun1990Id] = v === 'null' ? null : (v as ControllerId);
    } else {
      controllersByMun1990Id[mun1990Id] = null;
      conflicts.push({
        mun1990_id: mun1990Id,
        controllers: values.filter((v) => v !== 'null') as string[],
        post1995_codes: [...new Set(contributors.map((x) => x.post1995_code))].sort((a, b) => a.localeCompare(b))
      });
    }
  }

  conflicts.sort((a, b) => a.mun1990_id.localeCompare(b.mun1990_id));
  missingMun1990Ids.sort((a, b) => a.localeCompare(b));

  const missing = missingMun1990Ids.length;
  const conflicted = conflicts.length;
  const assigned = allMun1990Ids.length - missing - conflicted;

  const output: DerivedOutput = {
    task: 'phase_c3_derive_mun1990_political_controllers',
    controllers_by_mun1990_id: controllersByMun1990Id,
    stats: {
      total_registry: allMun1990Ids.length,
      assigned,
      missing,
      conflicted
    },
    missing_mun1990_ids: missingMun1990Ids,
    conflicts
  };

  await mkdir(dirname(outJsonPath), { recursive: true });
  await writeFile(outJsonPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`Wrote ${outJsonPath}: assigned=${assigned}, missing=${missing}, conflicted=${conflicted}`);

  const mdLines = [
    '# Phase C.3 mun1990 political controllers (derived)',
    '',
    '**Task:** ' + output.task,
    '',
    '## Stats',
    '',
    '| Metric | Value |',
    '|--------|-------|',
    `| Total registry (mun1990_id) | ${output.stats.total_registry} |`,
    `| Assigned (single controller) | ${output.stats.assigned} |`,
    `| Missing (no contributing post1995) | ${output.stats.missing} |`,
    `| Conflicted (multiple controllers → null) | ${output.stats.conflicted} |`,
    '',
    '## Missing mun1990_ids (no controller contribution)',
    '',
    ...(output.missing_mun1990_ids.length === 0
      ? ['(none)']
      : output.missing_mun1990_ids.map((id) => `- \`${id}\``)),
    '',
    '## Conflicts (set to null; no manual resolution applied)',
    '',
    '| mun1990_id | controllers | post1995_codes |',
    '|------------|-------------|----------------|',
    ...(output.conflicts.length === 0
      ? ['| (none) | | |']
      : output.conflicts.map(
          (c) => `| ${c.mun1990_id} | ${c.controllers.join(', ')} | ${c.post1995_codes.join(', ')} |`
        )),
    '',
    '---',
    '',
    '**Note:** No manual resolution applied; conflicts set to null.'
  ];

  await mkdir(dirname(outMdPath), { recursive: true });
  await writeFile(outMdPath, mdLines.join('\n'), 'utf8');
  console.log(`Wrote ${outMdPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
