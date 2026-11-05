const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '../../..');
const OUT = process.argv[2];
if (!OUT) throw new Error('output path required');

const OSID = 'op:donji_vakuf:korenici';
const ATTACKER = 'rs_16th_krajina_motorized';
const HELPER = 'rs_22nd_krajina_infantry';
const rel = (...parts) => path.join(ROOT, ...parts);
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const compactOrder = (x) => x ? { owner: x.owner ?? null, stance: x.stance ?? null, destination_sids: x.destination_sids ?? [] } : null;
const compactMovement = (x) => x ? {
  destination_osid: x.destination_osid ?? x.destination_sid ?? null,
  path: x.path ?? x.path_osids ?? x.route ?? null,
  progress: x.progress ?? x.progress_hops ?? null,
} : null;

function operationCommitment(state, formationId) {
  const corps = state.military?.corps_command?.[state.military?.formations?.[formationId]?.corps_id];
  for (const op of corps?.active_operations ?? []) {
    if (!(op.participating_brigades ?? []).includes(formationId)) continue;
    const axis = (op.axes ?? []).find((a) => (a.assigned_brigades ?? []).includes(formationId));
    return {
      operation: op.name,
      phase: op.phase,
      started_turn: op.started_turn,
      sector_id: op.sector_id,
      staging_osid: op.staging_osid,
      participating_brigades: op.participating_brigades,
      axis: axis ? {
        axis_id: axis.axis_id,
        status: axis.status,
        main_brigade: axis.main_brigade,
        support_brigades: axis.support_brigades,
        assigned_brigades: axis.assigned_brigades,
        current_objective_index: axis.current_objective_index,
        objectives: axis.objectives,
        last_result: axis.last_result,
      } : null,
    };
  }
  return null;
}

function formationSnapshot(state, id) {
  const f = state.military?.formations?.[id];
  if (!f) return null;
  return {
    id,
    faction: f.faction,
    corps_id: f.corps_id,
    location_osid: f.location_osid,
    personnel: f.personnel,
    morale: f.morale,
    cohesion: f.cohesion,
    readiness: f.readiness ?? null,
    posture: f.posture ?? null,
    assignment: f.assignment ?? null,
    assigned_sub_segment_id: f.assigned_sub_segment_id ?? null,
    fatigue: f.ops?.fatigue ?? null,
    order: compactOrder(state.military?.brigade_movement_orders?.[id]),
    movement_state: compactMovement(state.military?.brigade_movement_state?.[id]),
    operation_commitment: operationCommitment(state, id),
  };
}

function weekDate(state) {
  const d = state.meta?.scenario_start_date;
  if (!d) return null;
  const dt = new Date(Date.UTC(d.year, d.month - 1, d.day + state.meta.turn * 7));
  return dt.toISOString().slice(0, 10);
}

function turnRecord(p) {
  const s = read(p);
  const summary = (s.turn_summaries ?? []).find((x) => x.turn === s.meta.turn);
  return {
    path: path.relative(ROOT, p).replaceAll('\\\\', '/'),
    sha256: sha(p),
    turn: s.meta.turn,
    week_date_from_scenario_start: weekDate(s),
    korenici_controller: s.political?.political_controllers?.[OSID] ?? null,
    attacker: formationSnapshot(s, ATTACKER),
    helper: formationSnapshot(s, HELPER),
    korenici_battle_this_turn: (summary?.battles ?? []).filter((b) => b.osid === OSID),
    relevant_movements_this_turn: (summary?.movements ?? []).filter((m) => m.formation_id === ATTACKER || m.formation_id === HELPER),
  };
}

function cohortSummary(p, label, provenance) {
  const s = read(p);
  return {
    label,
    provenance,
    path: path.relative(ROOT, p).replaceAll('\\\\', '/'),
    sha256: sha(p),
    final_controller: s.political?.political_controllers?.[OSID] ?? null,
    capture_events: (s.political?.control_events ?? []).filter((x) => x.settlement_id === OSID),
    korenici_battles: (s.turn_summaries ?? []).flatMap((t) => (t.battles ?? []).filter((b) => b.osid === OSID).map((b) => ({ turn: t.turn, ...b }))),
    attacker_movements: (s.turn_summaries ?? []).flatMap((t) => (t.movements ?? []).filter((m) => m.formation_id === ATTACKER).map((m) => ({ turn: t.turn, ...m }))),
    helper_movements: (s.turn_summaries ?? []).flatMap((t) => (t.movements ?? []).filter((m) => m.formation_id === HELPER).map((m) => ({ turn: t.turn, ...m }))),
    final_attacker: formationSnapshot(s, ATTACKER),
    final_helper: formationSnapshot(s, HELPER),
  };
}

const currentDir = rel('tmp-paradox-qa-20260710', 'evidence', 'fractional-fatigue-p03-rbih-t39-01', 'rbih', 'turn-autosaves');
const currentTurns = [];
for (let turn = 16; turn <= 39; turn++) currentTurns.push(turnRecord(path.join(currentDir, `turn-${String(turn).padStart(3, '0')}.json`)));

const n101Dir = rel('runs', 'apr1992_definitive_188w__6deb5845c150c196__w188_n101');
const n102Dir = rel('runs', 'apr1992_definitive_188w__6deb5845c150c196__w188_n102');
const old705 = rel('tmp-paradox-qa-20260710', 'evidence', 'player-parity-rbih-t39-20261025-04', 'rbih', 'turn-autosaves', 'turn-039.json');
const current39 = path.join(currentDir, 'turn-039.json');
const currentManifest = rel('tmp-paradox-qa-20260710', 'evidence', 'fractional-fatigue-p03-rbih-t39-01', 'rbih', 'manifest.json');
const oldManifest = rel('tmp-paradox-qa-20260710', 'evidence', 'player-parity-rbih-t39-20261025-04', 'rbih', 'manifest.json');
const n101Meta = rel('runs', 'apr1992_definitive_188w__6deb5845c150c196__w188_n101', 'run_meta.json');
const n102Meta = rel('runs', 'apr1992_definitive_188w__6deb5845c150c196__w188_n102', 'run_meta.json');
const boundaryDecision = rel('tmp', 'player-bot-capability-parity-20261024', 'fractional-fatigue-package-v6', 'scenario-postturn-parity-repair-v1', 'current-boundary-diagnostic-v2', 'INDEPENDENT_ACTUAL_IMPLEMENTATION_DECISION.json');

const result = {
  schema: 'awwv.korenici-retained-provenance.v1',
  scope: 'retained artifacts only; no engine import, advance, query, stage, mutation, or source edit',
  ids: { osid: OSID, actual_attacker: ATTACKER, helper_hypothesis: HELPER },
  provenance: {
    current_p03_manifest: { path: path.relative(ROOT, currentManifest).replaceAll('\\\\', '/'), sha256: sha(currentManifest), data: read(currentManifest) },
    rejected_older_705_manifest: { path: path.relative(ROOT, oldManifest).replaceAll('\\\\', '/'), sha256: sha(oldManifest), data: read(oldManifest) },
    n101_run_meta: { path: path.relative(ROOT, n101Meta).replaceAll('\\\\', '/'), sha256: sha(n101Meta), git_commit: read(n101Meta).provenance?.git_commit },
    n102_run_meta: { path: path.relative(ROOT, n102Meta).replaceAll('\\\\', '/'), sha256: sha(n102Meta), git_commit: read(n102Meta).provenance?.git_commit },
    boundary_decision: { path: path.relative(ROOT, boundaryDecision).replaceAll('\\\\', '/'), sha256: sha(boundaryDecision), persisted_helper_delta: read(boundaryDecision).evidence?.turn_2?.b_to_c_persisted ?? read(boundaryDecision).evidence?.t2?.b_to_c_persisted ?? null },
  },
  reference_snapshots: {
    n101: [15, 16, 39].map((t) => turnRecord(path.join(n101Dir, `save_w${t}.json`))),
    n102: [15, 16, 39].map((t) => turnRecord(path.join(n102Dir, `save_w${t}.json`))),
  },
  capture_histories: {
    n101: cohortSummary(path.join(n101Dir, 'save_w39.json'), 'n101 formerly-correct reference', { git_commit: read(n101Meta).provenance?.git_commit, mode: 'headless all-AI' }),
    n102: cohortSummary(path.join(n102Dir, 'save_w39.json'), 'n102 formerly-correct reference', { git_commit: read(n102Meta).provenance?.git_commit, mode: 'headless all-AI' }),
    older_705: cohortSummary(old705, 'rejected older 705 cohort; comparison/provenance only', { git_head: read(oldManifest).gitHead, mode: 'native RBiH player' }),
    current_p03: cohortSummary(current39, 'current native P03 RBiH', { git_head: read(currentManifest).gitHead, mode: 'native RBiH player' }),
  },
  current_p03_turns_16_to_39: currentTurns,
  causal_assessment: {
    missing_normal_movement_or_admission: false,
    basis: 'Current P03 records RS 16th as an assigned participant/support brigade in Operation Donji Vakuf, its normal multi-turn movement to Donji Vakuf, and four Korenici attacks on turns 34-37.',
    helper_hypothesis_supported: false,
    helper_basis: 'All recorded Korenici attacks in n101, n102, older-705, and current-P03 name only RS 16th as attacker. RS 22nd is operation main brigade but is not in all_attacker_ids or the capture event; the retained helper delta alone cannot establish battle causation.',
    first_meaningful_boundary: 'At turn 34, n101 captures Korenici on RS 16th first attack; current P03 reaches and attacks Korenici with RS 16th on the same turn but records costly_victory without a flip. Older-705 likewise attacks on turn 34 but does not flip until turn 37; n102 first attacks on turn 35 and flips on turn 37.',
    classification: 'recorded combat-outcome/model-cohort divergence after normal admission and movement; exact lower-level cause is not recorded in retained state',
    smallest_next_question: 'Before any player fork, compare the turn-34 combat inputs and resolved combat trace for RS 16th versus the recorded defenders between current P03 and the older-705/current-source cohorts; do not alter orders or state.',
  },
};

fs.writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ ok: true, output: OUT, current_turns: currentTurns.length }));
