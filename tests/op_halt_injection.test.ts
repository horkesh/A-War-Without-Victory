/**
 * STOP-OP engine apply step (Presidential Command Model slice 1/N).
 *
 * Exercises the `apply-op-halts` war-phase step (war_phases.ts). The step consumes
 * cc.pending_op_halt once and, when a matching live op exists, releases its commander,
 * removes it via the canonical clean-removal path, and appends halted_op_record.
 *
 * Verifies:
 *   - staged halt → matching op removed from active_operations
 *   - commander released back to reserve (no dangling officer ref)
 *   - participating brigades freed (no dangling op-membership ref)
 *   - halted_op_record appended (op_name + turn)
 *   - pending_op_halt is ALWAYS consumed/cleared (even on op_not_found)
 *   - DETERMINISM EARLY-OUT: state untouched when nothing is staged
 *   - MECHANICAL ONLY: no dimension/consequence (patron_confidence) effects
 */
import { describe, it, expect } from 'vitest';
import { warPhases } from '../src/sim/turn_phases/war_phases.js';
import { getAvailableBrigades } from '../src/sim/combat/corps_operation_helpers.js';

const STEP = warPhases.find((p) => p.name === 'apply-op-halts')!;

function runStep(state: any) {
  STEP.run({ state } as any);
}

/** Build a minimal war-phase state with a corps, a live op, and its commander. */
function makeState(opts: {
  ops?: any[];
  pendingHalt?: any;
  withCommander?: boolean;
  withTgCommander?: boolean;
} = {}): any {
  const commanderId = 'rbih_officer_1';
  const tgCommanderId = 'rbih_officer_tg_1';
  const op = {
    id: 'op_live_1',
    name: 'Operation Live',
    type: 'sector_attack',
    phase: 'execution',
    participating_brigades: ['rbih_b1', 'rbih_b2'],
    ...(opts.withCommander !== false ? { commander_officer_id: commanderId } : {}),
    ...(opts.withTgCommander === true ? { tg_commander_officer_id: tgCommanderId } : {}),
  };
  const ops = opts.ops ?? [op];

  return {
    meta: { turn: 12, phase: 'war', patron_confidence: 50 },
    military: {
      named_officers: {
        [commanderId]: { officer_id: commanderId, status: 'active', assigned_operation: 'op_live_1' },
        ...(opts.withTgCommander === true
          ? { [tgCommanderId]: { officer_id: tgCommanderId, status: 'active', assigned_operation: 'Operation Live' } }
          : {}),
      },
      formations: {
        rbih_1st_corps: { id: 'rbih_1st_corps', faction: 'RBiH', kind: 'corps', status: 'active' },
        rbih_b1: { id: 'rbih_b1', faction: 'RBiH', kind: 'brigade', status: 'active', corps_id: 'rbih_1st_corps' },
        rbih_b2: { id: 'rbih_b2', faction: 'RBiH', kind: 'brigade', status: 'active', corps_id: 'rbih_1st_corps' },
      },
      corps_command: {
        rbih_1st_corps: {
          active_operations: ops,
          ...(opts.pendingHalt !== undefined
            ? { pending_op_halt: opts.pendingHalt }
            : {}),
        },
      },
    },
  };
}

describe('STOP-OP apply step (apply-op-halts)', () => {
  it('removes the matching live op, releases its commander, records the halt, and clears the staged field', () => {
    const state = makeState({
      pendingHalt: { op_id: 'op_live_1', op_name: 'Operation Live', turn: 12, ca_cost: 25 },
    });
    const cc = state.military.corps_command.rbih_1st_corps;
    expect(cc.active_operations).toHaveLength(1);

    runStep(state);

    // Op removed via canonical clean-removal path.
    expect(cc.active_operations).toHaveLength(0);
    // Commander released back to reserve, assignment cleared (no dangling officer ref).
    const officer = state.military.named_officers.rbih_officer_1;
    expect(officer.status).toBe('reserve');
    expect(officer.assigned_operation).toBeUndefined();
    // Brigades freed — op-membership recompute now lists them as available (no dangling ref).
    const freed = getAvailableBrigades(cc as any, ['rbih_b1', 'rbih_b2']);
    expect(freed.sort()).toEqual(['rbih_b1', 'rbih_b2']);
    // Halt recorded.
    expect(cc.halted_op_record).toEqual([{ op_name: 'Operation Live', turn: 12 }]);
    // Staged field consumed.
    expect(cc.pending_op_halt).toBeUndefined();
  });

  it('releases the TG tactical_commander too when halting a TG op (no dangling ref)', () => {
    const state = makeState({
      withTgCommander: true,
      pendingHalt: { op_id: 'op_live_1', op_name: 'Operation Live', turn: 12, ca_cost: 25 },
    });
    const cc = state.military.corps_command.rbih_1st_corps;

    runStep(state);

    // Op removed.
    expect(cc.active_operations).toHaveLength(0);
    // Op commander released.
    const officer = state.military.named_officers.rbih_officer_1;
    expect(officer.status).toBe('reserve');
    expect(officer.assigned_operation).toBeUndefined();
    // TG tactical_commander ALSO released back to reserve — not left active/assigned to a
    // removed op (the Codex P2 fix). Otherwise it is unavailable for future TG assignments.
    const tgOfficer = state.military.named_officers.rbih_officer_tg_1;
    expect(tgOfficer.status).toBe('reserve');
    expect(tgOfficer.assigned_operation).toBeUndefined();
    // Halt recorded, staged field consumed.
    expect(cc.halted_op_record).toEqual([{ op_name: 'Operation Live', turn: 12 }]);
    expect(cc.pending_op_halt).toBeUndefined();
  });

  it('matches the live op by name when op_id is absent', () => {
    const state = makeState({
      pendingHalt: { op_name: 'Operation Live', turn: 12, ca_cost: 25 },
    });
    const cc = state.military.corps_command.rbih_1st_corps;
    runStep(state);
    expect(cc.active_operations).toHaveLength(0);
    expect(cc.halted_op_record).toEqual([{ op_name: 'Operation Live', turn: 12 }]);
    expect(cc.pending_op_halt).toBeUndefined();
  });

  it('clears pending_op_halt even when no matching op exists (no record, no op removed)', () => {
    const state = makeState({
      pendingHalt: { op_id: 'op_does_not_exist', op_name: 'Ghost', turn: 12, ca_cost: 25 },
    });
    const cc = state.military.corps_command.rbih_1st_corps;
    runStep(state);
    // Live op untouched.
    expect(cc.active_operations).toHaveLength(1);
    // No record (nothing was halted).
    expect(cc.halted_op_record).toBeUndefined();
    // Staged field still consumed.
    expect(cc.pending_op_halt).toBeUndefined();
  });

  it('DETERMINISM EARLY-OUT: makes ZERO mutation when no corps has a pending_op_halt', () => {
    const state = makeState(); // no pendingHalt
    const before = JSON.stringify(state);
    runStep(state);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('MECHANICAL ONLY: wires NO dimension/consequence effects (patron_confidence unchanged)', () => {
    const state = makeState({
      pendingHalt: { op_id: 'op_live_1', op_name: 'Operation Live', turn: 12, ca_cost: 25 },
    });
    const patronBefore = state.meta.patron_confidence;
    runStep(state);
    // The political-consequence dimension is a deliberate FOLLOW-UP, not this slice.
    expect(state.meta.patron_confidence).toBe(patronBefore);
  });
});
