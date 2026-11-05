#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { access, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runScenario } from '../../../src/scenario/scenario_runner.js';

const SCHEMA = 'awwv.native703.n94-resume-power-seam.v2';
const EXPECTED_HEAD = 'bff97de7af9406dc2cb907674e2463fccb43052a';
const ORIGINAL_HEAD = 'a913286803a095b6dc3f57a44175081d6ae4b8eb';
const ORIGINAL_INPUT_DIGEST = '88cf2d9ad4913bc62dde684d71465a28622c28b559713e4d0f13124ad8031c69';
const DEBUG_TOPICS = 'battle_stack,battle_power';
const OVERRIDE = {
  path: 'data/derived/operational/operational_settlements.geojson',
  original: 'c03cc9ce4286b779139ce460e5f515d67415fe633e4ed2dbda1764b9440338c8',
  current: '03713c8e80ba7111ff64ad0bd69b70db4c7e2b30e22f23b8c4e2c11be60baa1a',
} as const;
const RETAINED = {
  runMeta: { bytes: 10_645, sha256: '0bb77fb1bf4b50456265f4839d934fd837d7ff5a569a590887d32e4cfa41b5b0' },
  weekly: { bytes: 33_185_387, sha256: '08b8e8cc74f7945ac4066edbce6cddfce74c40180c6fa013a6cb6c9997637669' },
  w16: { bytes: 4_493_938, sha256: '22ef518bb1f894d0afb450643a21d4a628f8f5c1462a80ebda498f81ece943ca' },
  w39: { bytes: 5_105_717, sha256: 'e51224ac22a839d4c1af35a0ea828afb79b62f0ed56559c3b47dcda45578eec5' },
} as const;
const SOURCE_HASHES = {
  'data/scenarios/apr1992_definitive_188w.json': '4257b039f5b1dbb7f21d940ec656b2d0b787856f27e7c26b6f3f57f256d82ecf',
  'src/scenario/scenario_runner.ts': '74125b6227ab10516466621a66b55e1fd698f7e6abdbe3e5468947a510684a86',
  'src/sim/turn_phases/war_phases.ts': '0d11a7c5fbf73f19e1a30256218a48c482a76042d620b8107fd1f7b06b799d2d',
  'src/sim/combat/attack_resolution_osid.ts': '5b0d61371b7d0d828ed2b06ffd5d11354629ded288632f26cbfe9d22c1ce2f16',
  'src/sim/combat/reason_code_debug.ts': 'a70c5e1c55c77fab7c771b77b583d3cc1c6742d1d9cb8f08b9962b062d6d68bd',
  'src/state/serialize.ts': 'c5d0b1c6d265c188d5380702fd4b6c55bedf8b5b750c5d4d87151e59edf483e6',
  'src/state/serializeGameState.ts': 'a4010315c439eb0901a53d8166a8c44cb08427aff5d994e51e05ddb64657be97',
} as const;
const STRIPPED_FIELDS = ['attacker_brigades', 'defender_contributions', 'power_breakdown'] as const;

type Json = Record<string, any>;
type Binding = { path: string; bytes: number; sha256: string };
const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), '../../..');
const originalDir = path.join(repoRoot, 'runs/apr1992_definitive_188w__6deb5845c150c196__w188_n94');
const originalMetaPath = path.join(originalDir, 'run_meta.json');
const originalWeeklyPath = path.join(originalDir, 'weekly_report.jsonl');
const w16Path = path.join(originalDir, 'save_w16.json');
const originalW39Path = path.join(originalDir, 'save_w39.json');

function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
function sha256(value: Buffer | string): string { return createHash('sha256').update(value).digest('hex'); }
function git(...args: string[]): string { return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim(); }
async function exists(p: string): Promise<boolean> {
  try { await access(p, fsConstants.F_OK); return true; } catch { return false; }
}
async function bind(p: string): Promise<Binding> {
  const value = await readFile(p);
  return { path: path.relative(repoRoot, p).replaceAll('\\', '/'), bytes: value.length, sha256: sha256(value) };
}
function requireBinding(actual: Binding, expected: { bytes: number; sha256: string }, label: string): void {
  assert(actual.bytes === expected.bytes, `${label} byte mismatch: ${actual.bytes} != ${expected.bytes}`);
  assert(actual.sha256 === expected.sha256, `${label} SHA mismatch: ${actual.sha256} != ${expected.sha256}`);
}
async function writeJsonFresh(p: string, value: unknown): Promise<void> {
  await writeFile(p, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
}

function parseArgs(argv: string[]): { contractCheck: boolean; evidenceDir: string | null; runDir: string | null } {
  let contractCheck = false;
  let evidenceDir: string | null = null;
  let runDir: string | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--contract-check') contractCheck = true;
    else if (argv[i] === '--evidence-dir' && argv[i + 1]) evidenceDir = path.resolve(repoRoot, argv[++i]);
    else if (argv[i] === '--run-dir' && argv[i + 1]) runDir = path.resolve(repoRoot, argv[++i]);
    else throw new Error(`unsupported argument: ${argv[i]}`);
  }
  if (!contractCheck) {
    assert(evidenceDir, '--evidence-dir is required');
    assert(runDir, '--run-dir is required');
  }
  return { contractCheck, evidenceDir, runDir };
}

async function validate(): Promise<{ bindings: Record<string, Binding>; originalMeta: Json; inputBoundary: Json; drifts: Json[] }> {
  assert(git('rev-parse', 'HEAD') === EXPECTED_HEAD, `HEAD is not ${EXPECTED_HEAD}`);
  const status = git('status', '--porcelain');
  assert(status === '', `worktree is not clean:\n${status}`);
  const bindings: Record<string, Binding> = {};
  for (const [relative, expected] of Object.entries(SOURCE_HASHES)) {
    const actual = await bind(path.join(repoRoot, relative));
    assert(actual.sha256 === expected, `${relative} SHA mismatch: ${actual.sha256} != ${expected}`);
    bindings[relative] = actual;
  }
  bindings.original_run_meta = await bind(originalMetaPath);
  bindings.original_weekly_report = await bind(originalWeeklyPath);
  bindings.input_save_w16 = await bind(w16Path);
  bindings.original_save_w39 = await bind(originalW39Path);
  requireBinding(bindings.original_run_meta, RETAINED.runMeta, 'original run_meta');
  requireBinding(bindings.original_weekly_report, RETAINED.weekly, 'original weekly_report');
  requireBinding(bindings.input_save_w16, RETAINED.w16, 'input save_w16');
  requireBinding(bindings.original_save_w39, RETAINED.w39, 'original save_w39');

  const originalMeta = JSON.parse(await readFile(originalMetaPath, 'utf8')) as Json;
  assert(originalMeta.provenance?.git_commit === ORIGINAL_HEAD, 'original commit mismatch');
  assert(originalMeta.provenance?.git_dirty === false, 'original run was dirty');
  assert(originalMeta.provenance?.harness === 'headless', 'original harness mismatch');
  assert(originalMeta.provenance?.collapse_enabled === false, 'original collapse mismatch');
  assert(originalMeta.provenance?.consumed_inputs?.digest === ORIGINAL_INPUT_DIGEST, 'original input digest mismatch');
  const files = originalMeta.provenance.consumed_inputs.files as Array<{ path: string; sha256: string }>;
  const drifts: Json[] = [];
  for (const row of files) {
    const current = await bind(path.join(repoRoot, row.path));
    if (current.sha256 !== row.sha256) drifts.push({ path: row.path, original: row.sha256, current: current.sha256 });
  }
  assert(drifts.length === 1, `expected one input drift: ${JSON.stringify(drifts)}`);
  assert(drifts[0].path === OVERRIDE.path && drifts[0].original === OVERRIDE.original && drifts[0].current === OVERRIDE.current,
    `unexpected input drift: ${JSON.stringify(drifts)}`);
  const oldBlob = execFileSync('git', ['show', `${ORIGINAL_HEAD}:${OVERRIDE.path}`], { cwd: repoRoot, encoding: null, maxBuffer: 16 * 1024 * 1024 });
  assert(sha256(oldBlob) === OVERRIDE.original, 'historical override blob mismatch');

  const input = JSON.parse(await readFile(w16Path, 'utf8')) as Json;
  const inputBoundary = {
    turn: input.meta?.turn,
    seed: input.meta?.seed,
    corps_front_sector_count: Object.keys(input.military?.corps_front_sectors ?? {}).length,
    war_front_edge_count: (input.military?.war_front_edges_osid ?? []).length,
  };
  assert(inputBoundary.turn === 16, `input turn is ${String(inputBoundary.turn)}`);
  assert(inputBoundary.seed === 'harness-seed', `input seed is ${String(inputBoundary.seed)}`);
  assert(inputBoundary.corps_front_sector_count === 0, 'input corps sectors are not empty');
  assert(inputBoundary.war_front_edge_count === 0, 'input front edges are not empty');
  return { bindings, originalMeta, inputBoundary, drifts };
}

async function materializeInputs(root: string, originalMeta: Json): Promise<Json[]> {
  await mkdir(root, { recursive: false });
  const manifest: Json[] = [];
  for (const row of originalMeta.provenance.consumed_inputs.files as Array<{ path: string; sha256: string }>) {
    const destination = path.join(root, row.path);
    await mkdir(path.dirname(destination), { recursive: true });
    if (row.path === OVERRIDE.path) {
      const value = execFileSync('git', ['show', `${ORIGINAL_HEAD}:${row.path}`], { cwd: repoRoot, encoding: null, maxBuffer: 16 * 1024 * 1024 });
      assert(sha256(value) === row.sha256, `historical input mismatch: ${row.path}`);
      await writeFile(destination, value, { flag: 'wx' });
      manifest.push({ path: row.path, source: 'historical-git-blob', sha256: row.sha256 });
    } else {
      const source = path.join(repoRoot, row.path);
      assert((await bind(source)).sha256 === row.sha256, `current input mismatch: ${row.path}`);
      await copyFile(source, destination, fsConstants.COPYFILE_EXCL);
      manifest.push({ path: row.path, source: 'current-exact', sha256: row.sha256 });
    }
  }
  return manifest;
}

function parseJsonl(value: string): Json[] {
  return value.split(/\r?\n/).filter(Boolean).map((line, index) => {
    try { return JSON.parse(line) as Json; }
    catch (error) { throw new Error(`invalid JSONL row ${index + 1}: ${String(error)}`); }
  });
}
function stripDebug(rows: Json[]): { rows: Json[]; removed: Record<string, number> } {
  const copy = structuredClone(rows);
  const removed = Object.fromEntries(STRIPPED_FIELDS.map((field) => [`/battles/*/${field}`, 0]));
  for (const row of copy) {
    assert(Array.isArray(row.battles), `week ${String(row.week_index)} lacks battles`);
    for (const battle of row.battles) for (const field of STRIPPED_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(battle, field)) {
        delete battle[field];
        removed[`/battles/*/${field}`] += 1;
      }
    }
  }
  return { rows: copy, removed };
}
function firstDiff(a: unknown, b: unknown, pointer = ''): Json | null {
  if (Object.is(a, b)) return null;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) {
    return { pointer, original: a, resumed: b };
  }
  const left = a as Json;
  const right = b as Json;
  for (const key of [...new Set([...Object.keys(left), ...Object.keys(right)])].sort()) {
    const child = `${pointer}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`;
    if (!(key in left) || !(key in right)) return { pointer: child, original: left[key], resumed: right[key] };
    const nested = firstDiff(left[key], right[key], child);
    if (nested) return nested;
  }
  return null;
}

async function compare(runOutput: string, checked: Awaited<ReturnType<typeof validate>>): Promise<Json> {
  const resumedMetaPath = path.join(runOutput, 'run_meta.json');
  const resumedWeeklyPath = path.join(runOutput, 'weekly_report.jsonl');
  const resumedW39Path = path.join(runOutput, 'save_w39.json');
  const resumedMetaBinding = await bind(resumedMetaPath);
  const resumedMeta = JSON.parse(await readFile(resumedMetaPath, 'utf8')) as Json;
  assert(resumedMeta.weeks === 39, `resumed weeks is ${String(resumedMeta.weeks)}`);
  assert(resumedMeta.resume_from_week_index === 16, `resumed start is ${String(resumedMeta.resume_from_week_index)}`);
  assert(resumedMeta.provenance?.harness === 'headless', 'resumed harness mismatch');
  assert(resumedMeta.provenance?.collapse_enabled === false, 'resumed collapse mismatch');
  const originalHashes = new Map<string, string>((checked.originalMeta.provenance.consumed_inputs.files as Array<{ path: string; sha256: string }>).map((row) => [row.path, row.sha256]));
  const resumedInputs = resumedMeta.provenance?.consumed_inputs?.files as Array<{ path: string; sha256: string }>;
  assert(Array.isArray(resumedInputs) && resumedInputs.length === originalHashes.size, 'resumed input inventory size mismatch');
  for (const row of resumedInputs) assert(originalHashes.get(row.path) === row.sha256, `resumed input mismatch: ${row.path}`);

  const resumedW39 = await bind(resumedW39Path);
  requireBinding(resumedW39, RETAINED.w39, 'resumed save_w39');
  const window = (rows: Json[]) => rows.filter((row) => Number(row.week_index) >= 17 && Number(row.week_index) <= 39);
  const originalWindow = window(parseJsonl(await readFile(originalWeeklyPath, 'utf8')));
  const resumedWindow = window(parseJsonl(await readFile(resumedWeeklyPath, 'utf8')));
  assert(originalWindow.length === 23 && resumedWindow.length === 23, `weekly row counts: ${originalWindow.length}/${resumedWindow.length}`);
  assert(originalWindow.map((row) => row.week_index).join(',') === resumedWindow.map((row) => row.week_index).join(','), 'weekly indices differ');
  const originalComparable = stripDebug(originalWindow);
  const resumedComparable = stripDebug(resumedWindow);
  const diff = firstDiff(originalComparable.rows, resumedComparable.rows);
  assert(diff === null, `non-debug weekly difference: ${JSON.stringify(diff)}`);

  const t18 = resumedWindow.find((row) => row.week_index === 18);
  const targets = (t18?.battles ?? []).filter((battle: Json) => battle.battle_id === '18:op:trnovo:tosici:arbih_109th_mountain:null');
  assert(targets.length === 1, `T18 Tosici battle count is ${targets.length}`);
  assert(targets[0].defender_kind === 'militia', `Tosici defender kind is ${String(targets[0].defender_kind)}`);
  assert(targets[0].defender_brigade === null, `Tosici defender brigade is ${String(targets[0].defender_brigade)}`);
  assert(targets[0].power_breakdown && typeof targets[0].power_breakdown === 'object', 'Tosici power breakdown absent');
  return {
    schema: SCHEMA,
    faithful: true,
    interpretation_allowed: true,
    bindings: { ...checked.bindings, resumed_run_meta: resumedMetaBinding, resumed_save_w39: resumedW39 },
    comparison: {
      checkpoint_39_exact_bytes: true,
      weekly_17_through_39_non_debug_exact: true,
      stripped_paths_only: STRIPPED_FIELDS.map((field) => `/battles/*/${field}`),
      original_removed_counts: originalComparable.removed,
      resumed_removed_counts: resumedComparable.removed,
    },
    tosici_turn18: targets[0],
    limits: [
      'Resumed headless production-path diagnostic; not native runtime qualification.',
      'Does not replay the actual-player branch or prove the boundary seam sufficient by itself.',
      'Interpretation is allowed only after exact checkpoint and non-debug weekly fidelity.',
    ],
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const checked = await validate();
  if (args.contractCheck) {
    process.stdout.write(`${JSON.stringify({ schema: SCHEMA, contract_ok: true, input_boundary: checked.inputBoundary })}\n`);
    return;
  }
  const evidenceDir = args.evidenceDir!;
  const runDir = args.runDir!;
  assert(await exists(evidenceDir), `wrapper evidence directory absent: ${evidenceDir}`);
  assert(!await exists(runDir), `run directory already exists: ${runDir}`);
  await mkdir(runDir, { recursive: false });
  const shadowRoot = path.join(runDir, 'historical-input-root');
  const runOutput = path.join(runDir, 'run');
  let resultWritten = false;
  try {
    const shadowManifest = await materializeInputs(shadowRoot, checked.originalMeta);
    await writeJsonFresh(path.join(evidenceDir, 'launch.json'), {
      schema: SCHEMA,
      question: 'Can current production runScenario faithfully reproduce n94 weeks 17-39 from immutable w16 and expose the T18 Tosici militia-fallback power operands?',
      source_head: EXPECTED_HEAD,
      original_head: ORIGINAL_HEAD,
      source_bindings: checked.bindings,
      current_input_drifts: checked.drifts,
      input_boundary: checked.inputBoundary,
      shadow_manifest: shadowManifest,
      options: { weeksOverride: 39, emitSaveAtWeeks: [18, 39], resumeFromWeekIndex: 16, harness: 'headless', replayPayloadMode: 'manifest_only', debug: DEBUG_TOPICS },
      pass: 'Exact save_w39 bytes and exact weekly rows 17-39 after only three declared debug-field removals.',
      stop: 'One attempt; preserved wrapper cap 120 seconds; any mismatch fails closed.',
    });
    process.env.AWWV_DEBUG_REASON_CODES = DEBUG_TOPICS;
    delete process.env.ENABLE_COLLAPSE;
    delete process.env.AWWV_S6_GRADE_RUN;
    await runScenario({
      scenarioPath: path.join(shadowRoot, 'data/scenarios/apr1992_definitive_188w.json'),
      outDirOverride: runOutput,
      weeksOverride: 39,
      emitSaveAtWeeks: [18, 39],
      resumeFromSavePath: w16Path,
      resumeFromWeekIndex: 16,
      baseDir: shadowRoot,
      harness: 'headless',
      consoleDiagnostics: false,
      emitTimingJson: true,
      replayPayloadMode: 'manifest_only',
    });
    const result = await compare(runOutput, checked);
    await writeJsonFresh(path.join(evidenceDir, 'result.json'), result);
    resultWritten = true;
    process.stdout.write(`${JSON.stringify({ faithful: true, interpretation_allowed: true })}\n`);
  } catch (error) {
    const failure = error instanceof Error ? error.stack ?? error.message : String(error);
    if (!resultWritten) {
      await writeJsonFresh(path.join(evidenceDir, 'result.json'), {
        schema: SCHEMA,
        faithful: false,
        interpretation_allowed: false,
        failure,
        inner_output_preserved_at: path.relative(repoRoot, runDir).replaceAll('\\', '/'),
      });
    }
    throw error;
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
