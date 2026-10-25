import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

import { advanceTurn } from '../../../../src/desktop/desktop_sim.js';
import { buildOperationCombatDiagnostics } from '../../../../src/scenario/combat_causality.js';
import { buildWeeklyReport } from '../../../../src/scenario/scenario_reporting.js';
import { deserializeState, serializeState } from '../../../../src/state/serialize.js';
import type { GameState } from '../../../../src/state/game_state.js';

type Json = any;
type Binding = { path: string; bytes: number; sha256: string };

const SCHEMA = 'awwv.desktop-terrain-postfix-recorded-state-proof.v1';
const EXPECTED_HEAD = '86b693a9423de6a2be13174c36f96ee6a8430801';
const ORIGINAL_N94_HEAD = 'a913286803a095b6dc3f57a44175081d6ae4b8eb';
const EXPECTED_INPUT_SHA = '22ef518bb1f894d0afb450643a21d4a628f8f5c1462a80ebda498f81ece943ca';
const EXPECTED_N97_WEEKLY_SHA = '08b8e8cc74f7945ac4066edbce6cddfce74c40180c6fa013a6cb6c9997637669';
const EXPECTED_V4_WEEKLY_SHA = 'e2e2039ba7a40bf18cb322184414f15d4f26088e5556890e24658c7383a0443d';
const EXPECTED_V4_LAUNCH_SHA = '5e8c1fb4b649016125bb71df9c1460c0b4b0a5041dd191ba221482792cebb0d5';
const EXPECTED_BASELINE_A_STATE_SHA = '43c350c7a7bd14118ceef086f7cd6a3a2f2f58c84cc4f2578af1fc2223dc2acf';
const EXPECTED_BASELINE_A_REPORT_SHA = 'd2a7fab8cda2f166eec5fef2e637c6f057c2f7bccc2594d42d69073ecf3e7244';
const EXPECTED_BASELINE_RESULT_SHA = 'a4a3bb72f679b737b87e4c5d332f593e858d2179785e380cbe79cb75e87143bf';
const EXPECTED_BASELINE_RECEIPT_SHA = '639eff53c15f073e304ebeedda6c58e6051db44d9eee027374d75aa7ab918d24';
const EXPECTED_PRIMED_STATE_SHA = '0ce35ee15a27708bc873f81f56a0d6f4af0ccc3f8032ab4682ff6da4e38f666e';
const EXPECTED_PRIMED_REPORT_SHA = '328b28120bdeeff11e2c913a5e6409040e6def1c5f99986e141e5e563db01bd7';
const EXPECTED_PRIMED_RESULT_SHA = '9fabc32097bbb87d4058ab0f4d88f20efa488f447c78e630693a95f005e8690e';
const EXPECTED_PRIMED_RECEIPT_SHA = '043eddfb3ea42071371360873900013be8865b00e53ec3ff99704ced117c75c8';
const EXPECTED_URBAN_SHA = '6c5fbdf22a7b837917422b11eb53a975bb855c027cd4c92cb7158fafd9c42e4c';
const EXPECTED_FOREST_SHA = 'f458666662a072c65b7d5c5e4b89c261399fca0f10476736b83fd914e651fa49';
const TARGET_BATTLE_OSID = 'op:travnik:gluha_bukovica';
const TARGET_OPERATION_OSID = 'op:konjic:glavaticevo_2';
const TARGET_PROBE = 'probe_vrs_herzegovina_t17';
const DEBUG_ONLY_BATTLE_FIELDS = ['attacker_brigades', 'defender_contributions', 'power_breakdown'] as const;

const SOURCE_HASHES: Record<string, string> = {
  'src/desktop/desktop_sim.ts': 'db0f4b31bf51b23ca85197ea81509b122ebd26b053e93671884014a5755cb5fd',
  'src/scenario/scenario_runner.ts': '74125b6227ab10516466621a66b55e1fd698f7e6abdbe3e5468947a510684a86',
  'src/scenario/combat_causality.ts': '37382226bde0e855a487754ccacd162fa220cd98fd55877a776a74c444ddbe7e',
  'src/scenario/scenario_reporting.ts': 'df0c17f6473f80ad2867106749d07ceda18fef1a53a68097586d3231e4f521c2',
  'src/sim/combat/combat_math.ts': '35a5240f49cd1b659cce6264a844549765b4edf0117b8181a76535e6d5cbe48e',
  'src/sim/combat/combat_terrain_sets_node.ts': 'a9b367adf78e8b18d5a626427d7746e8a32f988b53896be16aec4a984658e091',
  'src/state/serialize.ts': 'c5d0b1c6d265c188d5380702fd4b6c55bedf8b5b750c5d4d87151e59edf483e6',
  'src/state/serializeGameState.ts': 'a4010315c439eb0901a53d8166a8c44cb08427aff5d994e51e05ddb64657be97',
  'tests/desktop_combat_terrain_prerequisite.test.ts': '6ddf6526ce794ead58a01d49d7471365a455a2de47c5f84aca875b5a1286a8fd',
};

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), '../../../..');
const proofDir = path.dirname(scriptPath);
const diagnosisDir = path.resolve(proofDir, '../../native703-capability-diagnosis');
const n97Dir = path.join(repoRoot, 'runs/apr1992_definitive_188w__6deb5845c150c196__w188_n97');
const inputPath = path.join(n97Dir, 'save_w16.json');
const n97WeeklyPath = path.join(n97Dir, 'weekly_report.jsonl');
const v4RunDir = path.join(diagnosisDir, 'n94-resume-power-seam-v4-run-01');
const v4WeeklyPath = path.join(v4RunDir, 'run/weekly_report.jsonl');
const v4LaunchPath = path.join(diagnosisDir, 'n94-resume-power-seam-v4-wrapper-01/launch.json');
const historicalInputRoot = path.join(v4RunDir, 'historical-input-root');
const baselineDir = path.join(diagnosisDir, 'n97-w17-active-offensives-causal-probe-01');
const baselineStatePath = path.join(baselineDir, 'branch-a-state.json');
const baselineReportPath = path.join(baselineDir, 'branch-a-report.json');
const baselineResultPath = path.join(baselineDir, 'result.json');
const baselineReceiptPath = path.join(baselineDir, 'receipt.json');
const primedDir = path.join(diagnosisDir, 'n97-w17-desktop-terrain-prerequisite-probe-01');
const primedStatePath = path.join(primedDir, 'terrain-state.json');
const primedReportPath = path.join(primedDir, 'terrain-report.json');
const primedResultPath = path.join(primedDir, 'result.json');
const primedReceiptPath = path.join(primedDir, 'receipt.json');
const completeInputRoot = path.join(proofDir, 'complete-input-root');
const urbanSourcePath = path.join(repoRoot, 'data/derived/operational/urban_osids.json');
const forestSourcePath = path.join(repoRoot, 'data/derived/operational/forest_osids.json');
const urbanPath = path.join(completeInputRoot, 'data/derived/operational/urban_osids.json');
const forestPath = path.join(completeInputRoot, 'data/derived/operational/forest_osids.json');

function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

async function bind(file: string, relative = path.relative(repoRoot, file).replaceAll('\\', '/')): Promise<Binding> {
  const bytes = await readFile(file);
  return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
}

function requireHash(actual: Binding, expected: string, label: string): void {
  assert.equal(actual.sha256, expected, `${label} hash mismatch`);
}

function parseJsonl(value: string): Json[] {
  return value.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function week17(rows: Json[], label: string): Json {
  const matches = rows.filter((row) => row.week_index === 17);
  assert.equal(matches.length, 1, `${label} week-17 row count`);
  return matches[0];
}

function sortedOperationEnvelope(state: GameState, report: Json): Json[] {
  return buildOperationCombatDiagnostics(
    state,
    report.bot_order_diagnostics,
    report.attack_resolution_osid,
  );
}

function projectByTemplate(actual: Json, template: Json, pointer = ''): Json {
  if (Array.isArray(template)) {
    assert(Array.isArray(actual), `expected array at ${pointer || '/'}`);
    assert.equal(actual.length, template.length, `array length mismatch at ${pointer || '/'}`);
    return template.map((item, index) => projectByTemplate(actual[index], item, `${pointer}/${index}`));
  }
  if (template !== null && typeof template === 'object') {
    assert(actual !== null && typeof actual === 'object' && !Array.isArray(actual), `expected object at ${pointer || '/'}`);
    return Object.fromEntries(Object.keys(template).map((key) => {
      assert(Object.prototype.hasOwnProperty.call(actual, key), `missing ${pointer}/${key}`);
      return [key, projectByTemplate(actual[key], template[key], `${pointer}/${key}`)];
    }));
  }
  return actual;
}

function canonicalBattleRows(rows: Json[]): Json[] {
  return structuredClone(rows).map((row: Json) => {
    for (const field of DEBUG_ONLY_BATTLE_FIELDS) delete row[field];
    return row;
  });
}

function weeklyBattleProjectionOperands(rows: Json[]): Json[] {
  return structuredClone(rows).map((row: Json) => ({
    ...row,
    power_ratio: Math.round(row.power_ratio * 100) / 100,
  }));
}

function jsonDiffs(left: Json, right: Json, pointer = ''): Json[] {
  if (Object.is(left, right)) return [];
  const leftObject = left !== null && typeof left === 'object';
  const rightObject = right !== null && typeof right === 'object';
  if (!leftObject || !rightObject || Array.isArray(left) !== Array.isArray(right)) {
    return [{ pointer: pointer || '/', baseline: left, terrain: right }];
  }
  const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
  return keys.flatMap((key) => {
    const child = `${pointer}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`;
    if (!Object.prototype.hasOwnProperty.call(left, key)) return [{ pointer: child, baseline_present: false, terrain: right[key] }];
    if (!Object.prototype.hasOwnProperty.call(right, key)) return [{ pointer: child, baseline: left[key], terrain_present: false }];
    return jsonDiffs(left[key], right[key], child);
  });
}

async function listRelativeFiles(root: string, current = root): Promise<string[]> {
  const entries = await readdir(current, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) return listRelativeFiles(root, absolute);
    assert(entry.isFile(), `non-file entry in complete input root: ${absolute}`);
    return [path.relative(root, absolute).replaceAll('\\', '/')];
  }));
  return nested.flat().sort();
}

const CANONICAL_REPORT_EXCLUSIONS = [
  {
    pointer: '/observer_threshold_flags',
    rationale: 'Observer-only diagnostic bookkeeping is not a gameplay input, decision, battle, control, or serialized-state field.',
  },
] as const;

function canonicalReport(report: Json): Json {
  const canonical = structuredClone(report);
  for (const exclusion of CANONICAL_REPORT_EXCLUSIONS) {
    const key = exclusion.pointer.slice(1);
    assert(Object.prototype.hasOwnProperty.call(canonical, key), `missing declared report exclusion ${exclusion.pointer}`);
    delete canonical[key];
  }
  return canonical;
}

async function writeJsonFresh(file: string, value: Json): Promise<void> {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
}

function parseArgs(argv: string[]): { contractCheck: boolean; evidenceDir?: string } {
  if (argv.length === 1 && argv[0] === '--contract-check') return { contractCheck: true };
  if (argv.length === 2 && argv[0] === '--evidence-dir') return { contractCheck: false, evidenceDir: path.resolve(argv[1]) };
  throw new Error('usage: n97-w17-desktop-terrain-postfix-proof.mts --contract-check | --evidence-dir DIR');
}

function gitBlobAtHead(relativePath: string): Buffer {
  return execFileSync('git', ['show', `${ORIGINAL_N94_HEAD}:${relativePath}`], {
    cwd: repoRoot,
    encoding: 'buffer',
    maxBuffer: 1024 * 1024,
  });
}

async function validateContract(): Promise<Json> {
  assert.equal(path.resolve(process.cwd()), repoRoot, 'proof must run with the bound repository root as process.cwd()');
  assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim(), EXPECTED_HEAD, 'HEAD mismatch');

  const sourceBindings: Record<string, Binding> = {};
  for (const [relative, expected] of Object.entries(SOURCE_HASHES)) {
    const actual = await bind(path.join(repoRoot, relative), relative);
    requireHash(actual, expected, relative);
    sourceBindings[relative] = actual;
  }

  const bindings = {
    input: await bind(inputPath),
    n97_weekly: await bind(n97WeeklyPath),
    v4_weekly: await bind(v4WeeklyPath),
    v4_launch: await bind(v4LaunchPath),
    baseline_a_state: await bind(baselineStatePath),
    baseline_a_report: await bind(baselineReportPath),
    baseline_result: await bind(baselineResultPath),
    baseline_receipt: await bind(baselineReceiptPath),
    primed_state: await bind(primedStatePath),
    primed_report: await bind(primedReportPath),
    primed_result: await bind(primedResultPath),
    primed_receipt: await bind(primedReceiptPath),
    urban_source: await bind(urbanSourcePath),
    forest_source: await bind(forestSourcePath),
    urban_consumed: await bind(urbanPath),
    forest_consumed: await bind(forestPath),
  };
  requireHash(bindings.input, EXPECTED_INPUT_SHA, 'exact n94/n97 save_w16');
  requireHash(bindings.n97_weekly, EXPECTED_N97_WEEKLY_SHA, 'n97 weekly reference');
  requireHash(bindings.v4_weekly, EXPECTED_V4_WEEKLY_SHA, 'V4 resumed weekly reference');
  requireHash(bindings.v4_launch, EXPECTED_V4_LAUNCH_SHA, 'V4 launch manifest');
  requireHash(bindings.baseline_a_state, EXPECTED_BASELINE_A_STATE_SHA, 'retained desktop baseline A state');
  requireHash(bindings.baseline_a_report, EXPECTED_BASELINE_A_REPORT_SHA, 'retained desktop baseline A report');
  requireHash(bindings.baseline_result, EXPECTED_BASELINE_RESULT_SHA, 'retained failed-probe result');
  requireHash(bindings.baseline_receipt, EXPECTED_BASELINE_RECEIPT_SHA, 'retained failed-probe receipt');
  requireHash(bindings.primed_state, EXPECTED_PRIMED_STATE_SHA, 'successful primed desktop state');
  requireHash(bindings.primed_report, EXPECTED_PRIMED_REPORT_SHA, 'successful primed desktop report');
  requireHash(bindings.primed_result, EXPECTED_PRIMED_RESULT_SHA, 'successful primed desktop result');
  requireHash(bindings.primed_receipt, EXPECTED_PRIMED_RECEIPT_SHA, 'successful primed desktop receipt');
  requireHash(bindings.urban_source, EXPECTED_URBAN_SHA, 'source urban set');
  requireHash(bindings.forest_source, EXPECTED_FOREST_SHA, 'source forest set');
  requireHash(bindings.urban_consumed, EXPECTED_URBAN_SHA, 'consumed urban set');
  requireHash(bindings.forest_consumed, EXPECTED_FOREST_SHA, 'consumed forest set');

  const launch = JSON.parse(await readFile(v4LaunchPath, 'utf8'));
  assert.equal(launch.original_head, ORIGINAL_N94_HEAD, 'V4 original head mismatch');
  assert(Array.isArray(launch.shadow_manifest), 'V4 shadow manifest missing');
  assert.equal(launch.shadow_manifest.length, 33, 'V4 shadow manifest must bind all 33 inputs');
  const shadowBindings: Binding[] = [];
  const completeBindings: Binding[] = [];
  for (const row of launch.shadow_manifest) {
    assert.equal(typeof row.path, 'string', 'shadow path missing');
    assert.match(row.sha256, /^[0-9a-f]{64}$/, `shadow hash malformed: ${row.path}`);
    const actual = await bind(path.join(historicalInputRoot, row.path), row.path);
    requireHash(actual, row.sha256, `immutable historical input ${row.path}`);
    shadowBindings.push(actual);
    const complete = await bind(path.join(completeInputRoot, row.path), row.path);
    requireHash(complete, row.sha256, `complete-root historical input ${row.path}`);
    assert.equal(complete.bytes, actual.bytes, `complete-root byte count mismatch ${row.path}`);
    completeBindings.push(complete);
  }

  completeBindings.push(
    await bind(urbanPath, 'data/derived/operational/urban_osids.json'),
    await bind(forestPath, 'data/derived/operational/forest_osids.json'),
  );
  const completeFiles = await listRelativeFiles(completeInputRoot);
  const expectedCompleteFiles = completeBindings.map((row) => row.path).sort();
  assert.deepEqual(completeFiles, expectedCompleteFiles, 'complete input root must contain exactly the bound 33 historical inputs plus both terrain assets');
  assert.equal(completeFiles.length, 35, 'complete input root file count');

  const historicalTerrain = {
    urban: { bytes: gitBlobAtHead('data/derived/operational/urban_osids.json') },
    forest: { bytes: gitBlobAtHead('data/derived/operational/forest_osids.json') },
  };
  assert.equal(sha256(historicalTerrain.urban.bytes), EXPECTED_URBAN_SHA, 'a913 urban set differs from current bound set');
  assert.equal(sha256(historicalTerrain.forest.bytes), EXPECTED_FOREST_SHA, 'a913 forest set differs from current bound set');

  const urban = JSON.parse(await readFile(urbanPath, 'utf8')) as string[];
  const forest = JSON.parse(await readFile(forestPath, 'utf8')) as string[];
  assert(Array.isArray(urban) && Array.isArray(forest), 'terrain files must be arrays');
  assert(forest.includes(TARGET_BATTLE_OSID), `${TARGET_BATTLE_OSID} missing from forest source`);
  assert(forest.includes(TARGET_OPERATION_OSID), `${TARGET_OPERATION_OSID} missing from forest source`);

  const baselineResult = JSON.parse(await readFile(baselineResultPath, 'utf8'));
  const baselineReceipt = JSON.parse(await readFile(baselineReceiptPath, 'utf8'));
  const primedResult = JSON.parse(await readFile(primedResultPath, 'utf8'));
  const primedReceipt = JSON.parse(await readFile(primedReceiptPath, 'utf8'));
  assert.equal(baselineResult.hypothesis_supported, false, 'retained A/B result unexpectedly passed');
  assert.equal(baselineResult.interpretation_allowed, false, 'retained A/B result unexpectedly allows interpretation');
  assert.equal(baselineResult.checks.a_exact_v4_operation_envelope, false, 'retained A unexpectedly matches V4 operations');
  assert.equal(baselineResult.checks.a_exact_n97_canonical_battle_rows, false, 'retained A unexpectedly matches canonical battles');
  assert.equal(baselineReceipt.artifact_contract?.pass, true, 'retained A/B artifact contract did not pass');
  assert.equal(baselineReceipt.timed_out, false, 'retained A/B wrapper timed out');
  assert.equal(primedResult.prerequisite_restored, true, 'retained primed proof did not restore prerequisite');
  assert.equal(primedResult.interpretation_allowed, true, 'retained primed proof did not allow interpretation');
  assert.equal(primedReceipt.child_exit, 0, 'retained primed child failed');
  assert.equal(primedReceipt.wrapper_exit, 0, 'retained primed wrapper failed');
  assert.equal(primedReceipt.artifact_contract?.pass, true, 'retained primed artifact contract failed');

  const n97 = week17(parseJsonl(await readFile(n97WeeklyPath, 'utf8')), 'n97');
  const v4 = week17(parseJsonl(await readFile(v4WeeklyPath, 'utf8')), 'V4 resumed');
  assert.deepEqual(v4.control_counts, n97.control_counts, 'V4/n97 week-17 controls differ');
  assert.deepEqual(canonicalBattleRows(v4.battles), canonicalBattleRows(n97.battles), 'V4/n97 canonical week-17 battle rows differ');
  assert.equal(v4.operation_diagnostics.some((row: Json) => row.operation_name === TARGET_PROBE), false, 'V4 unexpectedly contains target probe');

  return {
    schema: SCHEMA,
    contract_ok: true,
    source_head: EXPECTED_HEAD,
    original_n94_head: ORIGINAL_N94_HEAD,
    bindings,
    source_bindings: sourceBindings,
    historical_input_manifest: {
      count: shadowBindings.length,
      root: path.relative(repoRoot, historicalInputRoot).replaceAll('\\', '/'),
      files: shadowBindings,
    },
    complete_input_manifest: {
      count: completeBindings.length,
      root: path.relative(repoRoot, completeInputRoot).replaceAll('\\', '/'),
      resolved_root: completeInputRoot.replaceAll('\\', '/'),
      files: completeBindings,
    },
    terrain_contract: {
      loader_resolution: 'advanceTurn(baseDir) explicit complete input root',
      current_equals_a913: true,
      urban_count: urban.length,
      forest_count: forest.length,
      required_forest_members: [TARGET_BATTLE_OSID, TARGET_OPERATION_OSID],
      consumed_assets: [bindings.urban_consumed, bindings.forest_consumed],
    },
    comparison_contract: {
      state: 'Exact equality after production serializeState canonicalization of both actual and retained primed states.',
      report: 'Exact deep equality after deleting only the declared observer-only paths from both actual and retained primed reports.',
      report_exclusions: CANONICAL_REPORT_EXCLUSIONS,
      gameplay_fields_excluded: [],
    },
    retained_baseline_contract: {
      source: 'n97-w17-active-offensives-causal-probe-01 branch A',
      exact_v4_operations: false,
      exact_canonical_battles: false,
      exact_controls: true,
      failed_interpretation_preserved: true,
    },
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const contract = await validateContract();
  if (args.contractCheck) {
    process.stdout.write(`${JSON.stringify(contract)}\n`);
    return;
  }

  const evidenceDir = args.evidenceDir!;
  await mkdir(evidenceDir, { recursive: false }).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'EEXIST') throw error;
  });
  const resultPath = path.join(evidenceDir, 'result.json');
  await writeJsonFresh(path.join(evidenceDir, 'launch.json'), {
    ...contract,
    question: 'Does the implemented desktop.advanceTurn(baseDir) consumer, from a cold child and exact canonical n97 save 16, load both terrain assets from the fresh complete explicit root and reproduce the retained successful primed proof?',
    execution: 'cold child import -> exact save_w16 -> one production desktop.advanceTurn(branch, completeInputRoot); no terrain loader or setter call outside advanceTurn',
    pass: 'Input object, caller branch, source save, and all 35 explicit-root files remain immutable; production-canonical serialized state exactly equals the retained primed state; canonical report exactly equals the retained primed report after the one declared observer-only exclusion; the V4 operation, battle, and control projections remain exact.',
    stop: 'One engine advance under the preserved 15-second wrapper. Any timeout, process failure, artifact-contract failure, mutation, or mismatch stops without retry.',
    expected_cost: 'under 5 seconds',
    claim_scope: 'A pass proves the reviewed source fix for this recorded save16-to-week17 desktop path only. It does not qualify a campaign, package, native runtime, fresh-player path, or calibration baseline.',
  });

  let resultWritten = false;
  try {
    const inputText = await readFile(inputPath, 'utf8');
    const source = deserializeState(inputText);
    const sourceBefore = structuredClone(source);
    const branch = structuredClone(source);
    const branchBefore = structuredClone(branch);
    const baselineState = JSON.parse(await readFile(baselineStatePath, 'utf8'));
    const baselineReport = JSON.parse(await readFile(baselineReportPath, 'utf8'));
    const primedState = JSON.parse(await readFile(primedStatePath, 'utf8'));
    const primedReport = JSON.parse(await readFile(primedReportPath, 'utf8'));
    const n97 = week17(parseJsonl(await readFile(n97WeeklyPath, 'utf8')), 'n97');
    const v4 = week17(parseJsonl(await readFile(v4WeeklyPath, 'utf8')), 'V4 resumed');

    const advanced = await advanceTurn(branch, completeInputRoot);
    assert.equal(advanced.error, undefined, `post-fix desktop advance failed: ${advanced.error}`);
    assert.deepEqual(source, sourceBefore, 'canonical source input mutated');
    assert.deepEqual(branch, branchBefore, 'advanceTurn mutated branch input');
    const report = advanced.report?.details as Json;
    assert(report, 'production turn report missing');

    requireHash(await bind(inputPath), EXPECTED_INPUT_SHA, 'post-advance canonical save 16');
    for (const row of contract.complete_input_manifest.files as Binding[]) {
      const post = await bind(path.join(completeInputRoot, row.path), row.path);
      requireHash(post, row.sha256, `post-advance immutable complete input ${row.path}`);
      assert.equal(post.bytes, row.bytes, `post-advance input byte count changed ${row.path}`);
    }

    const actualCanonicalStateText = serializeState(advanced.state);
    const primedCanonicalStateText = serializeState(primedState);
    const actualCanonicalState = JSON.parse(actualCanonicalStateText);
    const primedCanonicalState = JSON.parse(primedCanonicalStateText);
    const actualCanonicalReport = canonicalReport(report);
    const primedCanonicalReport = canonicalReport(primedReport);
    const stateDiffsVsPrimed = jsonDiffs(primedCanonicalState, actualCanonicalState);
    const reportDiffsVsPrimed = jsonDiffs(primedCanonicalReport, actualCanonicalReport);

    const operations = sortedOperationEnvelope(advanced.state, report);
    const controls = buildWeeklyReport(advanced.state).control_counts;
    const rawBattles = report.attack_resolution_osid?.battles ?? [];
    const expectedBattles = canonicalBattleRows(v4.battles);
    const battles = canonicalBattleRows(projectByTemplate(weeklyBattleProjectionOperands(rawBattles), expectedBattles));
    const baselineOperations = sortedOperationEnvelope(baselineState, baselineReport);
    const baselineRawBattles = baselineReport.attack_resolution_osid?.battles ?? [];
    const baselineBattles = canonicalBattleRows(projectByTemplate(weeklyBattleProjectionOperands(baselineRawBattles), expectedBattles));

    const stateDiffs = jsonDiffs(baselineState, advanced.state);
    const reportDiffs = jsonDiffs(baselineReport, report);
    const operationDiffsVsV4 = jsonDiffs(v4.operation_diagnostics, operations);
    const battleDiffsVsV4 = jsonDiffs(expectedBattles, battles);
    const operationDiffsVsBaseline = jsonDiffs(baselineOperations, operations);
    const battleDiffsVsBaseline = jsonDiffs(baselineBattles, battles);
    await Promise.all([
      writeJsonFresh(path.join(evidenceDir, 'postfix-state.json'), advanced.state),
      writeJsonFresh(path.join(evidenceDir, 'postfix-report.json'), report),
      writeJsonFresh(path.join(evidenceDir, 'canonical-state.json'), actualCanonicalState),
      writeJsonFresh(path.join(evidenceDir, 'canonical-report.json'), actualCanonicalReport),
      writeJsonFresh(path.join(evidenceDir, 'state-diff-vs-primed.json'), stateDiffsVsPrimed),
      writeJsonFresh(path.join(evidenceDir, 'report-diff-vs-primed.json'), reportDiffsVsPrimed),
      writeJsonFresh(path.join(evidenceDir, 'state-diff-vs-retained-a.json'), stateDiffs),
      writeJsonFresh(path.join(evidenceDir, 'report-diff-vs-retained-a.json'), reportDiffs),
      writeJsonFresh(path.join(evidenceDir, 'operation-diff-vs-v4.json'), operationDiffsVsV4),
      writeJsonFresh(path.join(evidenceDir, 'battle-diff-vs-v4.json'), battleDiffsVsV4),
      writeJsonFresh(path.join(evidenceDir, 'operation-diff-vs-retained-a.json'), operationDiffsVsBaseline),
      writeJsonFresh(path.join(evidenceDir, 'battle-diff-vs-retained-a.json'), battleDiffsVsBaseline),
    ]);

    const checks = {
      input_unmutated: true,
      exact_primed_canonical_serialized_state: actualCanonicalStateText === primedCanonicalStateText,
      exact_primed_canonical_report: isDeepStrictEqual(actualCanonicalReport, primedCanonicalReport),
      exact_v4_operation_envelope: isDeepStrictEqual(operations, v4.operation_diagnostics),
      target_probe_absent_as_in_v4: !operations.some((row) => row.operation_name === TARGET_PROBE),
      exact_v4_canonical_battle_rows: isDeepStrictEqual(battles, expectedBattles),
      exact_n97_canonical_battle_rows: isDeepStrictEqual(battles, canonicalBattleRows(n97.battles)),
      exact_v4_control_row: isDeepStrictEqual(controls, v4.control_counts),
      exact_n97_control_row: isDeepStrictEqual(controls, n97.control_counts),
      differs_from_retained_a_operations: operationDiffsVsBaseline.length > 0,
      differs_from_retained_a_battles: battleDiffsVsBaseline.length > 0,
      required_forest_members_in_consumed_asset: (JSON.parse(await readFile(forestPath, 'utf8')) as string[]).includes(TARGET_BATTLE_OSID)
        && (JSON.parse(await readFile(forestPath, 'utf8')) as string[]).includes(TARGET_OPERATION_OSID),
    };
    const prerequisiteRestored = Object.values(checks).every(Boolean);
    await writeJsonFresh(resultPath, {
      schema: SCHEMA,
      prerequisite_restored: prerequisiteRestored,
      interpretation_allowed: prerequisiteRestored,
      input_mutation: false,
      checks,
      compared_output: {
        canonical_state: { bytes: Buffer.byteLength(actualCanonicalStateText), sha256: sha256(actualCanonicalStateText) },
        canonical_report: { bytes: Buffer.byteLength(JSON.stringify(actualCanonicalReport)), sha256: sha256(JSON.stringify(actualCanonicalReport)) },
        report_exclusions: CANONICAL_REPORT_EXCLUSIONS,
        gameplay_fields_excluded: [],
      },
      postfix_branch: { control_counts: controls, battles, operation_envelope: operations },
      retained_a: { battles: baselineBattles, operation_envelope: baselineOperations },
      diff_counts: {
        state_vs_retained_a: stateDiffs.length,
        report_vs_retained_a: reportDiffs.length,
        operations_vs_v4: operationDiffsVsV4.length,
        battles_vs_v4: battleDiffsVsV4.length,
        canonical_state_vs_primed: stateDiffsVsPrimed.length,
        canonical_report_vs_primed: reportDiffsVsPrimed.length,
        operations_vs_retained_a: operationDiffsVsBaseline.length,
        battles_vs_retained_a: battleDiffsVsBaseline.length,
      },
      retained_outputs: [
        'postfix-state.json',
        'postfix-report.json',
        'canonical-state.json',
        'canonical-report.json',
        'state-diff-vs-primed.json',
        'report-diff-vs-primed.json',
        'state-diff-vs-retained-a.json',
        'report-diff-vs-retained-a.json',
        'operation-diff-vs-v4.json',
        'battle-diff-vs-v4.json',
        'operation-diff-vs-retained-a.json',
        'battle-diff-vs-retained-a.json',
      ],
      limits: [
        'One direct desktop engine advance from exact canonical n97 save 16; retained branch A and the successful primed branch are read-only comparators and are not rerun.',
        'The proof performs no terrain loader or setter call outside production desktop.advanceTurn; the complete root is a byte-bound copy of the retained 33-file root plus the two reviewed terrain assets.',
        'State equality is over production serializeState output. Report equality excludes exactly /observer_threshold_flags, whose observer-only bookkeeping cannot affect gameplay state, decisions, battles, operations, or control.',
        'A pass proves this recorded-state desktop consumer only; it is not a campaign, package, native-runtime, fresh-player, or calibration-parity qualification.',
        'Any mismatch rejects the post-fix proof and stops without retry.',
      ],
    });
    resultWritten = true;
    assert(prerequisiteRestored, `post-fix recorded-state proof failed: ${JSON.stringify(checks)}`);
    process.stdout.write(`${JSON.stringify({ postfix_state_proof: true, interpretation_allowed: true, ...checks })}\n`);
  } catch (error) {
    const failure = error instanceof Error ? error.stack ?? error.message : String(error);
    if (!resultWritten) {
      await writeJsonFresh(resultPath, { schema: SCHEMA, prerequisite_restored: false, interpretation_allowed: false, failure });
    }
    throw error;
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
