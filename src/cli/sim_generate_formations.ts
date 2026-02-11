import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { deserializeState, serializeState } from '../state/serialize.js';
import type { GameState, MilitiaPoolState } from '../state/game_state.js';
import { validateFormations } from '../validate/formations.js';
import { validateMilitiaPools } from '../validate/militia_pools.js';
import { loadSettlementGraph } from '../map/settlements.js';
import { computeFrontEdges } from '../map/front_edges.js';
import { computeFrontRegions } from '../map/front_regions.js';
import { getValidMunicipalityIds } from '../map/municipalities.js';
import { canonicalizePoliticalSideId, POLITICAL_SIDES } from '../state/identity.js';
import { spawnFormationsFromPools } from '../sim/formation_spawn.js';

type CliOptions = {
  savePath: string;
  batchSize: number;
  faction: string | null;
  mun: string | null;
  maxPerMun: number | null;
  tags: string[];
  dryRun: boolean;
  outPath: string | null;
  reportOutPath: string | null;
  kind: 'militia' | 'brigade' | null; // Phase I.0: formation kind
};

type GenerationReportFile = {
  schema: 1;
  turn: number;
  batch_size: number;
  filters: {
    faction?: string;
    mun?: string;
    max_per_mun?: number;
  };
  totals: {
    formations_created: number;
    manpower_moved_available_to_committed: number;
    municipalities_touched: number;
  };
  per_municipality: Array<{
    mun_id: string;
    faction: string;
    before: { available: number; committed: number; exhausted: number };
    after: { available: number; committed: number; exhausted: number };
    created: Array<{ formation_id: string; name: string; tags: string[] }>;
  }>;
};

function ensureFormations(state: GameState): void {
  if (!state.formations || typeof state.formations !== 'object') state.formations = {};
}

function ensureMilitiaPools(state: GameState): void {
  if (!state.militia_pools || typeof state.militia_pools !== 'object') {
    state.militia_pools = {};
  }
}

function normalizeTags(tagsInput: string | undefined): string[] {
  if (!tagsInput) return [];
  const parts = tagsInput.split(',');
  const trimmed = parts.map((p) => p.trim()).filter((p) => p.length > 0);
  const unique = Array.from(new Set(trimmed));
  unique.sort();
  return unique;
}

function parseArgs(argv: string[]): CliOptions {
  if (argv.length < 1) {
    throw new Error('Usage: npm run sim:genformations <save.json> --batch-size <int> [options...]');
  }

  const savePath = resolve(argv[0]);
  const rest = argv.slice(1);

  let batchSize: number | null = null;
  let faction: string | null = null;
  let mun: string | null = null;
  let maxPerMun: number | null = null;
  let tags: string | undefined;
  let dryRun = false;
  let outPath: string | null = null;
  let reportOutPath: string | null = null;
  let kind: 'militia' | 'brigade' | null = null;

  for (let i = 0; i < rest.length; i += 1) {
    const a = rest[i];
    if (a === '--batch-size') {
      const next = rest[i + 1];
      if (next === undefined) throw new Error('Missing value for --batch-size');
      batchSize = Number.parseInt(next, 10);
      if (!Number.isInteger(batchSize) || batchSize <= 0) {
        throw new Error(`Invalid --batch-size: ${next} (expected positive integer)`);
      }
      i += 1;
      continue;
    }
    if (a === '--faction') {
      const next = rest[i + 1];
      if (next === undefined) throw new Error('Missing value for --faction');
      faction = next;
      i += 1;
      continue;
    }
    if (a === '--mun') {
      const next = rest[i + 1];
      if (next === undefined) throw new Error('Missing value for --mun');
      mun = next;
      i += 1;
      continue;
    }
    if (a === '--max-per-mun') {
      const next = rest[i + 1];
      if (next === undefined) throw new Error('Missing value for --max-per-mun');
      maxPerMun = Number.parseInt(next, 10);
      if (!Number.isInteger(maxPerMun) || maxPerMun <= 0) {
        throw new Error(`Invalid --max-per-mun: ${next} (expected positive integer)`);
      }
      i += 1;
      continue;
    }
    if (a === '--tags') {
      const next = rest[i + 1];
      if (next === undefined) throw new Error('Missing value for --tags');
      tags = next;
      i += 1;
      continue;
    }
    if (a === '--kind') {
      const next = rest[i + 1];
      if (next === undefined) throw new Error('Missing value for --kind');
      if (next !== 'militia' && next !== 'brigade') {
        throw new Error(`Invalid --kind: ${next} (expected militia or brigade)`);
      }
      kind = next;
      i += 1;
      continue;
    }
    if (a === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (a === '--out') {
      const next = rest[i + 1];
      if (next === undefined) throw new Error('Missing value for --out');
      outPath = resolve(next);
      i += 1;
      continue;
    }
    if (a === '--report-out') {
      const next = rest[i + 1];
      if (next === undefined) throw new Error('Missing value for --report-out');
      reportOutPath = resolve(next);
      i += 1;
      continue;
    }
    if (a.startsWith('--')) throw new Error(`Unknown flag: ${a}`);
    throw new Error(`Unexpected arg: ${a}`);
  }

  if (batchSize === null) {
    throw new Error('Missing required --batch-size <int>');
  }

  // Canonicalize faction ID if provided
  let canonicalFaction: string | null = null;
  if (faction !== null) {
    canonicalFaction = canonicalizePoliticalSideId(faction);
    if (!POLITICAL_SIDES.includes(canonicalFaction as any)) {
      throw new Error(`Invalid faction: "${faction}" (canonicalized to "${canonicalFaction}"). Must be one of: ${POLITICAL_SIDES.join(', ')}`);
    }
  }

  return {
    savePath,
    batchSize,
    faction: canonicalFaction,
    mun,
    maxPerMun,
    tags: normalizeTags(tags),
    dryRun,
    outPath,
    reportOutPath,
    kind
  };
}

export function generateFormationsFromPools(
  state: GameState,
  batchSize: number,
  factionFilter: string | null,
  munFilter: string | null,
  maxPerMun: number | null,
  customTags: string[],
  applyChanges: boolean,
  formationKind: 'militia' | 'brigade' | null = null,
  historicalNameLookup: ((faction: string, mun_id: string, ordinal: number) => string | null) | null = null,
  historicalHqLookup: ((faction: string, mun_id: string, ordinal: number) => string | null) | null = null
): GenerationReportFile {
  ensureFormations(state);
  ensureMilitiaPools(state);

  const currentTurn = state.meta.turn;

  const spawnReport = spawnFormationsFromPools(state, {
    batchSize,
    factionFilter,
    munFilter,
    maxPerMun,
    customTags,
    applyChanges,
    formationKind,
    historicalNameLookup,
    historicalHqLookup
  });

  // Build per_municipality from spawn report (group created by mun_id + faction)
  const byKey = new Map<string, Array<{ formation_id: string; name: string; tags: string[] }>>();
  for (const c of spawnReport.created) {
    const key = `${c.mun_id}:${c.faction}`;
    const list = byKey.get(key) ?? [];
    list.push({
      formation_id: c.formation_id,
      name: c.name,
      tags: [`generated_phase_i0`, `kind:${c.kind}`, `mun:${c.mun_id}`]
    });
    byKey.set(key, list);
  }

  const per_municipality: GenerationReportFile['per_municipality'] = [];
  const pools = state.militia_pools as Record<string, MilitiaPoolState>;
  for (const key of Array.from(byKey.keys()).sort()) {
    const [mun_id, faction] = key.split(':');
    const created = byKey.get(key)!;
    const pool = Object.values(pools).find(
      (p) => p && p.mun_id === mun_id && p.faction === faction
    );
    const after = pool
      ? { available: pool.available, committed: pool.committed, exhausted: pool.exhausted }
      : { available: 0, committed: 0, exhausted: 0 };
    const n = created.length;
    const before = applyChanges
      ? {
        available: after.available + n * batchSize,
        committed: after.committed - n * batchSize,
        exhausted: after.exhausted
      }
      : { ...after };
    per_municipality.push({
      mun_id,
      faction,
      before,
      after,
      created: created.map((x) => ({ ...x, tags: x.tags.slice().sort() }))
    });
  }
  per_municipality.sort((a, b) => a.mun_id.localeCompare(b.mun_id));

  return {
    schema: 1,
    turn: currentTurn,
    batch_size: batchSize,
    filters: {
      ...(factionFilter !== null ? { faction: factionFilter } : {}),
      ...(munFilter !== null ? { mun: munFilter } : {}),
      ...(maxPerMun !== null ? { max_per_mun: maxPerMun } : {})
    },
    totals: {
      formations_created: spawnReport.formations_created,
      manpower_moved_available_to_committed: spawnReport.manpower_committed,
      municipalities_touched: spawnReport.pools_touched
    },
    per_municipality
  };
}

async function validateState(state: GameState): Promise<void> {
  const graph = await loadSettlementGraph();
  const derivedFrontEdges = computeFrontEdges(state, graph.edges);
  const frontRegions = computeFrontRegions(state, derivedFrontEdges);
  const validMunicipalityIds = await getValidMunicipalityIds();

  const formationIssues = validateFormations(state, frontRegions, derivedFrontEdges);
  const formationErrors = formationIssues.filter((i) => i.severity === 'error');
  if (formationErrors.length > 0) {
    const details = formationErrors.map((i) => `${i.code}${i.path ? ` @ ${i.path}` : ''}: ${i.message}`).join('; ');
    throw new Error(`Formation validation failed: ${details}`);
  }

  const militiaIssues = validateMilitiaPools(state, validMunicipalityIds);
  const militiaErrors = militiaIssues.filter((i) => i.severity === 'error');
  if (militiaErrors.length > 0) {
    const details = militiaErrors.map((i) => `${i.code}${i.path ? ` @ ${i.path}` : ''}: ${i.message}`).join('; ');
    throw new Error(`Militia pool validation failed: ${details}`);
  }
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const payload = await readFile(opts.savePath, 'utf8');
  const state = deserializeState(payload);

  // Load OOB data for historical accuracy
  let historicalNameLookup: ((faction: string, mun_id: string, ordinal: number) => string | null) | null = null;
  let historicalHqLookup: ((faction: string, mun_id: string, ordinal: number) => string | null) | null = null;

  try {
    const repoRoot = process.cwd();
    const brigadesPath = resolve(repoRoot, 'data/source/oob_brigades.json');
    const settlementsPath = resolve(repoRoot, 'data/derived/settlement_names.json');
    const munPopPath = resolve(repoRoot, 'data/derived/municipality_population_1991.json');

    const brigadesRaw = await readFile(brigadesPath, 'utf8');
    const settlementsRaw = await readFile(settlementsPath, 'utf8');
    const munPopRaw = await readFile(munPopPath, 'utf8');

    const brigadesData = JSON.parse(brigadesRaw);
    const settlementsData = JSON.parse(settlementsRaw);
    const munPopData = JSON.parse(munPopRaw);

    // Duplicate logic from derive_oob_brigades.ts (should ideally be shared)
    const CROSS_MUNICIPALITY_HQ_MAPPING: Record<string, string[]> = {
      'gracanica': ['11177'],
      'kotor_varos': ['11004', '20141'],
      'kljuc': ['11509'],
      'modrica': ['10308', '10600', '20141'],
      'bosanski_novi': ['10030', '20397'],
      'ilidza': ['11479', '20141', '20214', '20320', '20346', '11568', '11550', '20176', '11231'],
      'bosanski_petrovac': ['11436'],
      'tuzla': ['10600'],
      'brcko': ['20451'],
      'skender_vakuf': ['11525', '20257']
    };

    const { createOOBLookup } = await import('../sim/oob_lookup.js');
    const lookups = createOOBLookup(
      brigadesData.brigades,
      settlementsData.by_census_id,
      munPopData.by_municipality_id,
      CROSS_MUNICIPALITY_HQ_MAPPING
    );
    historicalNameLookup = lookups.nameLookup;
    historicalHqLookup = lookups.hqLookup;

    if (!opts.dryRun) {
      process.stdout.write('  loaded OOB data for historical names/HQs\n');
    }

  } catch (e) {
    console.warn('Failed to load OOB data, falling back to procedural generation:', e);
  }

  // Generate report (only apply changes if not dry-run)
  const report = generateFormationsFromPools(
    state,
    opts.batchSize,
    opts.faction,
    opts.mun,
    opts.maxPerMun,
    opts.tags,
    !opts.dryRun,
    opts.kind,
    historicalNameLookup,
    historicalHqLookup
  );

  // Validate (even in dry-run to catch logic errors)
  await validateState(state);

  // Write report if requested
  if (opts.reportOutPath) {
    await mkdir(dirname(opts.reportOutPath), { recursive: true });
    await writeFile(opts.reportOutPath, JSON.stringify(report, null, 2), 'utf8');
    process.stdout.write(`  wrote report: ${opts.reportOutPath}\n`);
  }

  // Write save if not dry-run
  if (!opts.dryRun) {
    const outPath = opts.outPath ?? opts.savePath;
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, serializeState(state), 'utf8');
    process.stdout.write(
      `generated ${report.totals.formations_created} formations from ${report.totals.municipalities_touched} municipalities -> ${outPath}\n`
    );
  } else {
    process.stdout.write(
      `[DRY RUN] would generate ${report.totals.formations_created} formations from ${report.totals.municipalities_touched} municipalities\n`
    );
  }
}

const isDirectRun = import.meta.url === pathToFileURL(process.argv[1] ?? '').href;
if (isDirectRun) {
  main().catch((err) => {
    console.error('sim:genformations failed', err);
    process.exitCode = 1;
  });
}
