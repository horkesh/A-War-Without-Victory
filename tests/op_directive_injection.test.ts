/**
 * REQUEST-OP engine inject step (Presidential Command Model slice 2/N).
 *
 * Exercises the `inject-op-directive` war-phase step (war_phases.ts). The president
 * names ONLY a target OSID (cc.pending_op_directive); the step auto-selects the force
 * (eligible, available, uncommitted brigades of the corps) and builds a reachable axis
 * (a friendly OSID adjacent to the target as staging, the target as the objective),
 * validates it, and injects a CorpsOperation tagged requested_by_president.
 *
 * Verifies:
 *   - directive → op built from a bare objective with AUTO-SELECTED brigades + axis,
 *     reaching active_operations, tagged requested_by_president (provenance)
 *   - staging is a friendly OSID adjacent to the target (reachable through friendly territory)
 *   - objective ALREADY OWNED → rejection, nothing injected, staged field cleared
 *   - no friendly staging adjacent (UNREACHABLE) → rejection, nothing injected
 *   - too few available brigades (NO FORCE) → rejection, nothing injected
 *   - pending_op_directive is ALWAYS consumed/cleared
 *   - DETERMINISM EARLY-OUT: state untouched when nothing is staged
 */
import { describe, it, expect } from 'vitest';
import { warPhases } from '../src/sim/turn_phases/war_phases.js';

const STEP = warPhases.find((p) => p.name === 'inject-op-directive')!;

/** Run the step with an adjacency-bearing spatial-context cache (or none). */
function runStep(state: any, adjacency?: Map<string, string[]>) {
  const context: any = { state };
  if (adjacency) {
    context.spatialContextCache = { preCombat: { adjacency } };
  }
  STEP.run(context);
}

/**
 * Minimal war-phase state: RBiH 1st Corps with two eligible brigades, a friendly
 * staging OSID (bihac_2, RBiH-held) adjacent to an enemy target (bihac_1, RS-held).
 */
function makeState(opts: {
  pendingDirective?: any;
  brigades?: Record<string, any>;
  controllers?: Record<string, string>;
  ops?: any[];
} = {}): any {
  const brigades = opts.brigades ?? {
    rbih_b1: { id: 'rbih_b1', faction: 'RBiH', kind: 'brigade', status: 'active', corps_id: 'rbih_1st_corps', personnel: 2000, location_osid: 'bihac_2' },
    rbih_b2: { id: 'rbih_b2', faction: 'RBiH', kind: 'brigade', status: 'active', corps_id: 'rbih_1st_corps', personnel: 2000, location_osid: 'bihac_2' },
  };
  const controllers = opts.controllers ?? { bihac_1: 'RS', bihac_2: 'RBiH' };
  return {
    meta: { turn: 14, phase: 'war', player_faction: 'RBiH' },
    political: { political_controllers: controllers },
    military: {
      named_officers: {},
      formations: {
        rbih_1st_corps: { id: 'rbih_1st_corps', faction: 'RBiH', kind: 'corps', status: 'active' },
        ...brigades,
      },
      corps_command: {
        rbih_1st_corps: {
          active_operations: opts.ops ?? [],
          stance: 'balanced',
          ...(opts.pendingDirective !== undefined ? { pending_op_directive: opts.pendingDirective } : {}),
        },
      },
    },
  };
}

const ADJ = new Map<string, string[]>([
  ['bihac_1', ['bihac_2']],
  ['bihac_2', ['bihac_1']],
]);

describe('REQUEST-OP inject step (inject-op-directive)', () => {
  it('builds an op from a bare objective with auto-selected brigades + axis, reaching active_operations tagged requested_by_president', () => {
    const state = makeState({
      pendingDirective: { target_osid: 'bihac_1', turn: 14, ca_cost: 25 },
    });
    const cc = state.military.corps_command.rbih_1st_corps;
    expect(cc.active_operations).toHaveLength(0);

    runStep(state, ADJ);

    // One op injected.
    expect(cc.active_operations).toHaveLength(1);
    const op = cc.active_operations[0];
    // Provenance tag — the president named the objective, the engine built the op.
    expect(op.requested_by_president).toBe(true);
    // Force AUTO-SELECTED (president did not pick brigades).
    expect(op.participating_brigades.sort()).toEqual(['rbih_b1', 'rbih_b2']);
    // Objective = the named target.
    expect(op.objectives).toContain('bihac_1');
    // Axis built toward the target; staging is the friendly neighbor (reachable).
    expect(op.axes).toHaveLength(1);
    expect(op.axes[0].objectives).toEqual(['bihac_1']);
    expect(op.axes[0].staging_osid).toBe('bihac_2');
    expect(op.staging_osid).toBe('bihac_2');
    // Corps pushed to offensive stance.
    expect(cc.stance).toBe('offensive');
    // Staged field consumed; no rejection on success.
    expect(cc.pending_op_directive).toBeUndefined();
    expect(cc.op_directive_rejection).toBeUndefined();
  });

  it('rejects when the objective is already owned (nothing injected, staged field cleared)', () => {
    const state = makeState({
      controllers: { bihac_1: 'RBiH', bihac_2: 'RBiH' }, // target already friendly
      pendingDirective: { target_osid: 'bihac_1', turn: 14, ca_cost: 25 },
    });
    const cc = state.military.corps_command.rbih_1st_corps;

    runStep(state, ADJ);

    expect(cc.active_operations).toHaveLength(0);
    expect(cc.op_directive_rejection).toEqual({ target_osid: 'bihac_1', reason: 'objective_already_owned', turn: 14 });
    expect(cc.pending_op_directive).toBeUndefined();
  });

  it('rejects when no friendly OSID is adjacent to the target (unreachable through friendly territory)', () => {
    // Target's only neighbor is enemy-held → no friendly staging.
    const adj = new Map<string, string[]>([
      ['bihac_1', ['enemy_2']],
      ['enemy_2', ['bihac_1']],
    ]);
    const state = makeState({
      controllers: { bihac_1: 'RS', enemy_2: 'RS', bihac_2: 'RBiH' },
      pendingDirective: { target_osid: 'bihac_1', turn: 14, ca_cost: 25 },
    });
    const cc = state.military.corps_command.rbih_1st_corps;

    runStep(state, adj);

    expect(cc.active_operations).toHaveLength(0);
    expect(cc.op_directive_rejection).toEqual({ target_osid: 'bihac_1', reason: 'objective_unreachable', turn: 14 });
    expect(cc.pending_op_directive).toBeUndefined();
  });

  it('rejects when too few brigades are available (no force)', () => {
    const state = makeState({
      brigades: {
        // Only one eligible brigade — below the 2-participant attack floor.
        rbih_b1: { id: 'rbih_b1', faction: 'RBiH', kind: 'brigade', status: 'active', corps_id: 'rbih_1st_corps', personnel: 2000, location_osid: 'bihac_2' },
      },
      pendingDirective: { target_osid: 'bihac_1', turn: 14, ca_cost: 25 },
    });
    const cc = state.military.corps_command.rbih_1st_corps;

    runStep(state, ADJ);

    expect(cc.active_operations).toHaveLength(0);
    expect(cc.op_directive_rejection).toEqual({ target_osid: 'bihac_1', reason: 'no_available_force', turn: 14 });
    expect(cc.pending_op_directive).toBeUndefined();
  });

  it('rejects when no adjacency graph is available (cannot prove reachability)', () => {
    const state = makeState({
      pendingDirective: { target_osid: 'bihac_1', turn: 14, ca_cost: 25 },
    });
    const cc = state.military.corps_command.rbih_1st_corps;

    runStep(state); // no adjacency passed

    expect(cc.active_operations).toHaveLength(0);
    expect(cc.op_directive_rejection).toEqual({ target_osid: 'bihac_1', reason: 'no_adjacency', turn: 14 });
    expect(cc.pending_op_directive).toBeUndefined();
  });

  it('does not auto-select brigades already committed to an active op anywhere', () => {
    // b1 is already committed to a live op → only b2 free → below floor → reject.
    const state = makeState({
      ops: [{ name: 'Existing Op', participating_brigades: ['rbih_b1'], objectives: ['kljuc_1'], axes: [{ objectives: ['kljuc_1'], assigned_brigades: ['rbih_b1'] }] }],
      pendingDirective: { target_osid: 'bihac_1', turn: 14, ca_cost: 25 },
    });
    const cc = state.military.corps_command.rbih_1st_corps;

    runStep(state, ADJ);

    // Existing op preserved; no new op (only b2 was free).
    expect(cc.active_operations).toHaveLength(1);
    expect(cc.op_directive_rejection.reason).toBe('no_available_force');
    expect(cc.pending_op_directive).toBeUndefined();
  });

  it('DETERMINISM EARLY-OUT: makes ZERO mutation when no corps has a pending_op_directive', () => {
    const state = makeState(); // no pendingDirective
    const before = JSON.stringify(state);
    runStep(state, ADJ);
    expect(JSON.stringify(state)).toBe(before);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Force-op PUSHBACK consequence (forced_over_objection → was_force_launched +
// presidential override on the CO).
// ───────────────────────────────────────────────────────────────────────────

/** State with an active named CO assigned to the corps (so the override path has a target). */
function makeStateWithCO(opts: { forced?: boolean; coState?: any } = {}): any {
  const state = makeState({
    pendingDirective: {
      target_osid: 'bihac_1', turn: 14, ca_cost: 25,
      ...(opts.forced ? { forced_over_objection: true } : {}),
    },
  });
  state.military.named_officers = {
    off_co: {
      officer_id: 'off_co', status: 'active', assigned_corps_id: 'rbih_1st_corps',
      acting_commander: false, turns_in_command: 5, battles: 0, victories: 0,
      effective_competence_penalty: 0, penalty_turns_remaining: 0,
      ...(opts.coState ?? {}),
    },
  };
  state.military.named_officer_data = [
    { id: 'off_co', name: 'Dudaković', faction: 'RBiH', rank: 'corps_commander', competence: 4, aggressiveness: 3, defensive_skill: 4, political_reliability: 3 },
  ];
  return state;
}

describe('REQUEST-OP inject step — forced_over_objection consequence', () => {
  it('forced directive → op tagged was_force_launched + commander_assessment_at_launch, and bumps the CO override count + appends recent_overrides', () => {
    const state = makeStateWithCO({ forced: true });
    const cc = state.military.corps_command.rbih_1st_corps;

    runStep(state, ADJ);

    // Op injected and force-tagged for the badge/strain/receipt surfaces.
    expect(cc.active_operations).toHaveLength(1);
    const op = cc.active_operations[0];
    expect(op.requested_by_president).toBe(true);
    expect(op.was_force_launched).toBe(true);
    expect(op.commander_assessment_at_launch).toBe('abort');

    // The CO was warned + overridden → override tracking bumped, history appended.
    const co = state.military.named_officers.off_co;
    expect(co.override_count).toBe(1);
    expect(co.last_override_turn).toBe(14);
    expect(co.recent_overrides).toEqual([{ turn: 14, resolution: 'override' }]);

    // Staged field consumed.
    expect(cc.pending_op_directive).toBeUndefined();
  });

  it('NON-forced directive → no was_force_launched and NO override recorded on the CO', () => {
    const state = makeStateWithCO({ forced: false });
    const cc = state.military.corps_command.rbih_1st_corps;

    runStep(state, ADJ);

    expect(cc.active_operations).toHaveLength(1);
    const op = cc.active_operations[0];
    expect(op.requested_by_president).toBe(true);
    expect(op.was_force_launched).toBeUndefined();
    expect(op.commander_assessment_at_launch).toBeUndefined();

    const co = state.military.named_officers.off_co;
    expect(co.override_count).toBeUndefined();
    expect(co.recent_overrides).toBeUndefined();
  });

  it('forced override cows the CO when the threshold is reached within the window', () => {
    // A prior override on record at turn 8 (within COWED_OVERRIDE_WINDOW=8 of turn 14):
    // this second override (count 1 → 2 = threshold) cows the officer.
    const state = makeStateWithCO({
      forced: true,
      coState: { override_count: 1, last_override_turn: 8 },
    });

    runStep(state, ADJ);

    const co = state.military.named_officers.off_co;
    // cowed_until_turn = 14 + COWED_DURATION(8) = 22; override_count reset to 0.
    expect(co.cowed_until_turn).toBe(22);
    expect(co.override_count).toBe(0);
  });
});
