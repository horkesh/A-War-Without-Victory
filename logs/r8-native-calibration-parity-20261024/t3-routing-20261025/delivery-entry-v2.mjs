import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../../..');
const EVIDENCE = resolve(process.argv[2]);
const PRECHECK_ONLY = process.argv[3] === '--precheck-only';
const FORMATIONS = [
  'arbih_182nd_vitezka_light',
  'arbih_181st_mountain',
  'arbih_109th_mountain',
];
const DELIVERY_FORMATION = FORMATIONS[0];
const SOURCE = 'op:hadzici:luke';
const DESTINATION = 'op:trnovo:delijas';
const EXPECTED_PATH = [
  SOURCE,
  'op:hadzici:budmolici',
  'op:konjic:dzepi_2',
  'op:trnovo:tusila',
  'op:trnovo:trnovo',
  'op:trnovo:kijevo_2',
  DESTINATION,
];
const EXPECTED_CONTROLS = {
  'op:brcko:bukvik_gornji_2': 'RBiH',
  'op:kakanj:biljesevo': 'RBiH',
  'op:kladanj:olovci_2': 'RBiH',
  'op:srebrenica:obadi': 'RBiH',
};
const PAIRED_ROOT = import.meta.dirname;
const REPAIRED_ATTEMPT = resolve(PAIRED_ROOT, 't3-routing-repair-player-turn2-01');
const PLAYER_POST2 = resolve(REPAIRED_ATTEMPT, 'player-post-turn.json');
const REPAIRED_RECEIPT = resolve(REPAIRED_ATTEMPT, 'receipt.json');
const REPAIRED_RESULT = resolve(REPAIRED_ATTEMPT, 'result.json');
const REPAIRED_BOUNDARY = resolve(REPAIRED_ATTEMPT, 'boundary.json');
const BOT_T6_RESULT = resolve(ROOT, 'tmp/player-bot-capability-parity-20261024/first-divergence-diagnosis-20261025/six-turn-preserved-01/result.json');
const BOT_SAVE6 = resolve(ROOT, 'tmp/player-bot-capability-parity-20261024/first-divergence-diagnosis-20261025/six-turn-production-output-01/apr1992_definitive_188w__2ed96a242d123911__w6/save_w6.json');
const OLD_AA_ROOT = resolve(ROOT, 'tmp/player-bot-capability-parity-20261024/player-always-allow-feasibility-v1-20261025');
const OLD_AA_RESULT = resolve(OLD_AA_ROOT, 'six-turn-preserved-01/result.json');
const OLD_AA_POST6 = resolve(OLD_AA_ROOT, 'six-turn-preserved-01/turn-006-post-turn.json');
const OLD_AA_ANALYSIS = resolve(OLD_AA_ROOT, 'postrun-analysis-preserved-01/result.json');
const SOURCE_FILE = resolve(ROOT, 'src/sim/combat/osid_column_movement.ts');
const EXPECTED_HASHES = {
  player_post2: '33d14f1a1ec9de7b98231132b0006a2539487d8c56ffee68a1589e9b1dac1688',
  repaired_receipt: '3fdcaa95e90ebade5127133b0a452f184569947188dcac22865bd1127a769b9e',
  repaired_result: 'd147a6e1046b71c03172c9c8c7f20c6779a0a1a1b64dbd96743c6293a1c10687',
  repaired_boundary: '4e9eb753f9bab5281ada7f8f61b5c88ce4054a1c425684091b3c4ed614699d7d',
  bot_t6_result: 'd51a6cea93e1060dcc265684d82e9d01aec5f5a267ea5824db1bd3f2c2a0f2a3',
  bot_save6: '42128f357b3d851080656e654fb99e4c4bd5b0f38ebfde60b399a4ec3dda2fd0',
  old_aa_result: 'e0d2521fc42959209248f8dc1e7523eb5d964258e99caec482cf153985237ba6',
  old_aa_post6: '14a34f4a3897bb10e5854d8724253c7304b1e3c9ce55432aa365134f35c775b5',
  old_aa_analysis: '2313ee1e3a0be8ca4309c8148f287d24ebc104ef55e7cbe1d29ff1420c2f15c8',
  source: '31de47a728a2382a23f4eb9a7f665f6c6f1fe5cbcef8d6da59d8221ec7d29c73',
};

const hash = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const relative = (path) => path.replaceAll('\\', '/').replace(ROOT.replaceAll('\\', '/'), '.');
const writeJson = (name, value) => writeFileSync(resolve(EVIDENCE, name), `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
const controls = (state) => Object.fromEntries(
  Object.keys(EXPECTED_CONTROLS).map((osid) => [osid, state.political?.political_controllers?.[osid] ?? null]),
);
const formationBoundary = (state, id) => ({
  formation: structuredClone(state.military?.formations?.[id] ?? null),
  movement_order: structuredClone(state.military?.brigade_movement_orders?.[id] ?? null),
  movement_state: structuredClone(state.military?.brigade_movement_state?.[id] ?? null),
});
const selectedBoundaries = (state) => Object.fromEntries(FORMATIONS.map((id) => [id, formationBoundary(state, id)]));
const presenceValue = (value) => value?.presence === 'present_value' ? value.value : null;

mkdirSync(EVIDENCE, { recursive: true });
let turnsRun = 0;
function stop(stage, observed) {
  writeJson('result.json', {
    schema: 'awwv.player-turn2-to6-routing-delivery.v2',
    verdict: 'STOPPED',
    stage,
    observed,
    turns_run: turnsRun,
    qualification_claim: false,
  });
  throw new Error(`routing delivery proof stopped at ${stage}`);
}

const expectedMeta = (state) => state.meta?.phase === 'war'
  && state.meta?.player_faction === 'RBiH'
  && state.meta?.headless_scenario_auto_control === false
  && state.meta?.autonomy_level === 2
  && state.meta?.decision_mode === 'historical';

if (Object.prototype.hasOwnProperty.call(process.env, 'AWWV_SLACK_WEBHOOK_URL')) {
  delete process.env.AWWV_SLACK_WEBHOOK_URL;
}
const unexpectedEnv = Object.keys(process.env)
  .filter((key) => key.startsWith('AWWV_') && !['AWWV_DEBUG_REASON_CODES', 'AWWV_DEBUG_MOVEMENT_FORMATIONS'].includes(key))
  .sort();
if (unexpectedEnv.length > 0) stop('unexpected_awwv_environment', { names: unexpectedEnv });

const authenticated = {
  player_post2: PLAYER_POST2,
  repaired_receipt: REPAIRED_RECEIPT,
  repaired_result: REPAIRED_RESULT,
  repaired_boundary: REPAIRED_BOUNDARY,
  bot_t6_result: BOT_T6_RESULT,
  bot_save6: BOT_SAVE6,
  old_aa_result: OLD_AA_RESULT,
  old_aa_post6: OLD_AA_POST6,
  old_aa_analysis: OLD_AA_ANALYSIS,
  source: SOURCE_FILE,
};
for (const [name, path] of Object.entries(authenticated)) {
  if (!existsSync(path)) stop('missing_authenticated_input', { name, path: relative(path) });
  const actual = hash(path);
  if (actual !== EXPECTED_HASHES[name]) {
    stop('authenticated_input_hash_mismatch', { name, expected: EXPECTED_HASHES[name], actual });
  }
}

const repairedReceipt = readJson(REPAIRED_RECEIPT);
const repairedResult = readJson(REPAIRED_RESULT);
const repairedBoundary = readJson(REPAIRED_BOUNDARY);
const botT6Result = readJson(BOT_T6_RESULT);
const botSave6 = readJson(BOT_SAVE6);
const oldAaResult = readJson(OLD_AA_RESULT);
const oldAaPost6 = readJson(OLD_AA_POST6);
const oldAaAnalysis = readJson(OLD_AA_ANALYSIS);
if (
  repairedReceipt.child_exit !== 0
  || repairedReceipt.wrapper_exit !== 0
  || repairedReceipt.artifact_contract?.pass !== true
  || repairedResult.verdict !== 'PASS_PLAYER_TURN2_T3_FACTION_FRIENDLY_TRANSIT'
  || repairedResult.exact_path !== true
  || repairedResult.owner_preserved !== true
  || repairedResult.no_column_rejection !== true
  || repairedBoundary.post?.movement_state?.turns_remaining !== 4
  || botT6Result.reproduced?.trajectory_matches_retained_n94_turn_6 !== true
  || oldAaResult.verdict !== 'SIX_TURN_COUNTERFACTUAL_PREFIX_COMPLETE'
  || oldAaResult.submitted_player_paramilitary_decisions_after_t0 !== 0
  || oldAaAnalysis.verdict !== 'AVAILABLE_POLICY_MATCHES_OPENING_CONTROL_TIMING_BUT_NOT_TURN6_FORMATION_CHAIN'
) {
  stop('retained_context_contract_mismatch', {
    repaired_result: repairedResult,
    bot_result: botT6Result,
    old_always_allow_result: oldAaResult,
    old_always_allow_analysis: oldAaAnalysis,
  });
}

const dependencyPaths = [
  ...Object.values(authenticated),
  resolve(ROOT, 'src/sim/turn_phases/war_phases.ts'),
  resolve(ROOT, 'src/desktop/desktop_sim.ts'),
  resolve(ROOT, 'src/state/serialize.ts'),
  resolve(ROOT, 'tools/diagnostics/run_preserved_preflight.cjs'),
  resolve(ROOT, 'node_modules/tsx/dist/cli.mjs'),
];
writeJson('dependencies.json', {
  schema: 'awwv.player-turn2-to6-routing-delivery-dependencies.v1',
  dependencies: [...new Set(dependencyPaths)].map((path) => ({
    path: relative(path),
    bytes: readFileSync(path).byteLength,
    sha256: hash(path),
  })),
});

process.env.AWWV_DEBUG_REASON_CODES = 'movement_phase,movement_reject';
process.env.AWWV_DEBUG_MOVEMENT_FORMATIONS = FORMATIONS.join(',');
const sim = await import('../../../src/desktop/desktop_sim.js');
const serialization = await import('../../../src/state/serialize.js');
const inputBytes = readFileSync(PLAYER_POST2, 'utf8');
let state = serialization.deserializeState(inputBytes);
const canonicalRoundtrip = sim.serializeState(state);
const canonicalRoundtripSha = createHash('sha256').update(canonicalRoundtrip).digest('hex');
const inputBoundary = selectedBoundaries(state);
const inputBlockers = sim.listBlockingPlayerDecisions(state, 'RBiH');
if (
  canonicalRoundtripSha !== EXPECTED_HASHES.player_post2
  || state.meta?.turn !== 2
  || state.meta?.phase !== 'war'
  || state.meta?.player_faction !== 'RBiH'
  || state.meta?.headless_scenario_auto_control !== false
  || state.meta?.autonomy_level !== 2
  || state.meta?.decision_mode !== 'historical'
  || inputBlockers.length !== 0
  || inputBoundary[DELIVERY_FORMATION].formation?.location_osid !== SOURCE
  || inputBoundary[DELIVERY_FORMATION].movement_order !== null
  || inputBoundary[DELIVERY_FORMATION].movement_state?.status !== 'in_transit'
  || inputBoundary[DELIVERY_FORMATION].movement_state?.stance !== 'column'
  || inputBoundary[DELIVERY_FORMATION].movement_state?.owner !== 'bot_discretionary'
  || inputBoundary[DELIVERY_FORMATION].movement_state?.turns_remaining !== 4
  || !same(inputBoundary[DELIVERY_FORMATION].movement_state?.path, EXPECTED_PATH)
  || !same(controls(state), EXPECTED_CONTROLS)
) {
  stop('post_turn2_input_contract_mismatch', {
    canonical_roundtrip_sha256: canonicalRoundtripSha,
    meta: state.meta,
    blockers: inputBlockers,
    boundaries: inputBoundary,
    controls: controls(state),
  });
}

const comparisonContext = {
  bot_turn6: selectedBoundaries(botSave6),
  old_always_allow_turn6: selectedBoundaries(oldAaPost6),
};
writeJson('precheck.json', {
  schema: 'awwv.player-turn2-to6-routing-delivery-precheck.v2',
  input_sha256: hash(PLAYER_POST2),
  canonical_roundtrip_sha256: canonicalRoundtripSha,
  source_sha256: hash(SOURCE_FILE),
  input_turn: state.meta.turn,
  input_blockers: inputBlockers,
  input_boundaries: inputBoundary,
  input_controls: controls(state),
  comparison_context: comparisonContext,
  turns_advanced: 0,
});
if (PRECHECK_ONLY) {
  writeJson('result.json', {
    schema: 'awwv.player-turn2-to6-routing-delivery.v2',
    verdict: 'PRECHECK_PASS',
    turns_run: 0,
    qualification_claim: false,
  });
  console.log(JSON.stringify({ verdict: 'PRECHECK_PASS', turns_run: 0 }));
  process.exit(0);
}

const boundaries = [{ completed_turn: 2, blockers: inputBlockers, controls: controls(state), formations: inputBoundary }];
const turnReports = [];
for (const completedTurn of [3, 4, 5, 6]) {
  const blockersBefore = sim.listBlockingPlayerDecisions(state, 'RBiH');
  if (blockersBefore.length !== 0) stop('unexpected_blocking_player_decision', { before_completed_turn: completedTurn, blockers: blockersBefore });
  const advanced = await sim.advanceTurn(state, ROOT);
  if (advanced.error) stop('advance_turn_error', { completed_turn: completedTurn, error: advanced.error });
  turnsRun += 1;
  state = advanced.state;
  if (state.meta?.turn !== completedTurn) {
    stop('completed_turn_mismatch', { expected: completedTurn, actual: state.meta?.turn ?? null });
  }
  const movementReport = advanced.report?.details?.column_movement ?? null;
  const rejection = (movementReport?.column_rejections ?? []).find((row) => row.formation_id === DELIVERY_FORMATION) ?? null;
  const selectedReceipts = (advanced.report?.details?.movement_phase_diagnostics?.receipts ?? [])
    .filter((row) => FORMATIONS.includes(row.formation_id));
  const blockersAfter = sim.listBlockingPlayerDecisions(state, 'RBiH');
  const completedBoundary = {
    completed_turn: completedTurn,
    blockers_before_advance: blockersBefore,
    blockers_after_advance: blockersAfter,
    meta: structuredClone(state.meta),
    controls: controls(state),
    formations: selectedBoundaries(state),
    delivery_rejection: rejection,
    selected_receipts: selectedReceipts,
  };
  turnReports.push({ completed_turn: completedTurn, report: advanced.report });
  boundaries.push(completedBoundary);

  const delivery = completedBoundary.formations[DELIVERY_FORMATION];
  const expectedTicks = new Map([[3, 3], [4, 2], [5, 1]]);
  const deliveryPass = completedTurn < 6
    ? delivery.formation?.location_osid === SOURCE
      && delivery.movement_order === null
      && delivery.movement_state?.status === 'in_transit'
      && delivery.movement_state?.stance === 'column'
      && delivery.movement_state?.owner === 'bot_discretionary'
      && delivery.movement_state?.destination_sids?.[0] === DESTINATION
      && delivery.movement_state?.turns_remaining === expectedTicks.get(completedTurn)
      && same(delivery.movement_state?.path, EXPECTED_PATH)
    : delivery.formation?.location_osid === DESTINATION
      && delivery.movement_state === null
      && delivery.movement_order === null;
  if (
    !expectedMeta(state)
    || blockersAfter.length !== 0
    || !same(completedBoundary.controls, EXPECTED_CONTROLS)
    || rejection !== null
    || !deliveryPass
  ) {
    stop('completed_turn_contract_mismatch', { expected_completed_turn: completedTurn, boundary: completedBoundary });
  }
}

const expectedTicks = new Map([[2, 4], [3, 3], [4, 2], [5, 1]]);
const transitBoundariesPass = boundaries
  .filter((row) => expectedTicks.has(row.completed_turn))
  .every((row) => {
    const current = row.formations[DELIVERY_FORMATION];
    return current.formation?.location_osid === SOURCE
      && current.movement_order === null
      && current.movement_state?.status === 'in_transit'
      && current.movement_state?.stance === 'column'
      && current.movement_state?.owner === 'bot_discretionary'
      && current.movement_state?.destination_sids?.[0] === DESTINATION
      && current.movement_state?.turns_remaining === expectedTicks.get(row.completed_turn)
      && same(current.movement_state?.path, EXPECTED_PATH)
      && (row.delivery_rejection ?? null) === null;
  });
const finalBoundary = boundaries.at(-1);
const finalDelivery = finalBoundary.formations[DELIVERY_FORMATION];
const controlsPass = boundaries.every((row) => same(row.controls, EXPECTED_CONTROLS));
const blockersPass = boundaries.every((row) => (row.blockers ?? row.blockers_before_advance ?? []).length === 0
  && (row.blockers_after_advance ?? []).length === 0);
const metaPass = boundaries.slice(1).every((row) => expectedMeta({ meta: row.meta }));
const finalDeliveryPass = finalBoundary.completed_turn === 6
  && finalDelivery.formation?.location_osid === DESTINATION
  && finalDelivery.movement_state === null
  && finalDelivery.movement_order === null
  && finalBoundary.delivery_rejection === null;
const phase37 = Object.fromEntries(
  FORMATIONS.slice(1).map((id) => [id, finalBoundary.selected_receipts.find(
    (row) => row.formation_id === id && row.phase_index === 37 && row.phase_name === 'partition-corps-front-sectors',
  ) ?? null]),
);
const reportedComparison = Object.fromEntries(FORMATIONS.map((id) => [id, {
  repaired_player_turn6: finalBoundary.formations[id]?.formation?.location_osid ?? null,
  retained_bot_turn6: comparisonContext.bot_turn6[id]?.formation?.location_osid ?? null,
  old_always_allow_turn6: comparisonContext.old_always_allow_turn6[id]?.formation?.location_osid ?? null,
}]));
const pass = turnsRun === 4 && transitBoundariesPass && finalDeliveryPass && controlsPass && blockersPass && metaPass;
writeJson('delivery.json', {
  schema: 'awwv.player-turn2-to6-routing-delivery-observation.v2',
  boundaries,
  final_phase37_observations: phase37,
  location_comparison_not_a_pass_prediction: reportedComparison,
  interpretation_limits: [
    'Only 182nd delivery, blockers, and four named controls are pass criteria.',
    '181st/109th phase-37 receipts and locations are reported observations, not a forced prediction.',
    'This four-turn prefix is not a campaign, 707/712, historical qualification, or adoption claim.',
  ],
});
writeJson('turn-reports.json', {
  schema: 'awwv.player-turn2-to6-routing-delivery-reports.v2',
  reports: turnReports,
});
writeFileSync(resolve(EVIDENCE, 'final-state.json'), sim.serializeState(state), { flag: 'wx' });
const verdict = pass ? 'PASS_PLAYER_T3_TO_T6_COLUMN_DELIVERY' : 'FAIL_PLAYER_T3_TO_T6_COLUMN_DELIVERY';
writeJson('result.json', {
  schema: 'awwv.player-turn2-to6-routing-delivery.v2',
  verdict,
  turns_run: turnsRun,
  qualification_claim: false,
  transit_boundaries_pass: transitBoundariesPass,
  final_delivery_pass: finalDeliveryPass,
  controls_pass: controlsPass,
  blockers_pass: blockersPass,
  metadata_pass: metaPass,
  phase37_181_109_reported: Object.values(phase37).every((row) => row !== null),
  location_comparison_not_a_pass_prediction: reportedComparison,
});
console.log(JSON.stringify({ verdict, turns_run: turnsRun, final_location: finalDelivery.formation?.location_osid ?? null }));
if (!pass) process.exitCode = 2;
