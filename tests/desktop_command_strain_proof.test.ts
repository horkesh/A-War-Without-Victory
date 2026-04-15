import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  computeCorpsCommandStrain,
  FORCE_LAUNCH_STRAIN,
  FRICTION_EVENT_STRAIN,
  COMPROMISED_THRESHOLD,
} = require('../src/desktop/command_strain.cjs') as {
  computeCorpsCommandStrain: (
    state: any,
    corpsId: string,
    currentTurn: number,
  ) => { totalStrain: number; isCompromised: boolean };
  FORCE_LAUNCH_STRAIN: number;
  FRICTION_EVENT_STRAIN: number;
  COMPROMISED_THRESHOLD: number;
};

const CORPS = 'rbih_1_corps';
const OTHER_CORPS = 'rbih_2_corps';

function makeState(opts: {
  ops?: Array<{ name: string; was_force_launched?: boolean; started_turn?: number }>;
  officers?: Array<{ id: string; status?: string; assigned_corps_id?: string }>;
  frictions?: Array<{ officer_id: string; turn: number; resolved?: boolean }>;
} = {}): any {
  const named_officers: Record<string, any> = {};
  for (const o of opts.officers ?? []) {
    named_officers[o.id] = {
      status: o.status ?? 'active',
      assigned_corps_id: o.assigned_corps_id ?? CORPS,
    };
  }
  return {
    meta: { turn: 10 },
    corps_command: {
      [CORPS]: { active_operations: opts.ops ?? [] },
    },
    military: {
      named_officers,
      friction_events: opts.frictions ?? [],
    },
  };
}

describe('desktop command_strain.cjs helper', () => {
  it('constants match the canonical doctrine (Wave 4 / Presidential Command)', () => {
    expect(FORCE_LAUNCH_STRAIN).toBe(3);
    expect(FRICTION_EVENT_STRAIN).toBe(2);
    expect(COMPROMISED_THRESHOLD).toBe(6);
  });

  it('returns zero strain and healthy when no ops and no officers', () => {
    const state = makeState();
    const result = computeCorpsCommandStrain(state, CORPS, 10);
    expect(result).toEqual({ totalStrain: 0, isCompromised: false });
  });

  it('accumulates force-launched op strain with decay by turn age', () => {
    // Op launched turn 9, current turn 10 → turnAge=1 → strain = 3 - 1 = 2
    // Op launched turn 10, current turn 10 → turnAge=0 → strain = 3
    // Total = 5, below compromised threshold (6)
    const state = makeState({
      ops: [
        { name: 'op_alpha', was_force_launched: true, started_turn: 9 },
        { name: 'op_beta', was_force_launched: true, started_turn: 10 },
        { name: 'op_gamma', was_force_launched: false, started_turn: 10 }, // ignored
      ],
    });
    const result = computeCorpsCommandStrain(state, CORPS, 10);
    expect(result.totalStrain).toBe(5);
    expect(result.isCompromised).toBe(false);
  });

  it('adds friction-event strain only for the corps active commander', () => {
    // Officer A commands CORPS, has one unresolved friction at turn 10 → strain += 2
    // Officer B commands OTHER_CORPS — ignored
    // Officer C inactive — ignored
    // Officer A also has a resolved friction — ignored
    const state = makeState({
      officers: [
        { id: 'A', assigned_corps_id: CORPS },
        { id: 'B', assigned_corps_id: OTHER_CORPS },
        { id: 'C', assigned_corps_id: CORPS, status: 'retired' },
      ],
      frictions: [
        { officer_id: 'A', turn: 10, resolved: false },
        { officer_id: 'A', turn: 10, resolved: true },
        { officer_id: 'B', turn: 10, resolved: false },
        { officer_id: 'C', turn: 10, resolved: false },
      ],
    });
    const result = computeCorpsCommandStrain(state, CORPS, 10);
    expect(result.totalStrain).toBe(2);
    expect(result.isCompromised).toBe(false);
  });

  it('crosses the compromised threshold when ops + frictions stack', () => {
    // 2 force-launched ops turn 10 → 3+3 = 6
    // 1 unresolved friction turn 10 for active CORPS officer → +2
    // Total = 8, compromised = true
    const state = makeState({
      ops: [
        { name: 'op_alpha', was_force_launched: true, started_turn: 10 },
        { name: 'op_beta', was_force_launched: true, started_turn: 10 },
      ],
      officers: [{ id: 'A', assigned_corps_id: CORPS }],
      frictions: [{ officer_id: 'A', turn: 10, resolved: false }],
    });
    const result = computeCorpsCommandStrain(state, CORPS, 10);
    expect(result.totalStrain).toBe(8);
    expect(result.isCompromised).toBe(true);
  });

  it('decays strain fully so ancient events no longer contribute', () => {
    // Op launched 5 turns ago → strain = max(0, 3 - 5) = 0
    // Friction 3 turns ago → strain = max(0, 2 - 3) = 0
    const state = makeState({
      ops: [{ name: 'old_op', was_force_launched: true, started_turn: 5 }],
      officers: [{ id: 'A', assigned_corps_id: CORPS }],
      frictions: [{ officer_id: 'A', turn: 7, resolved: false }],
    });
    const result = computeCorpsCommandStrain(state, CORPS, 10);
    expect(result.totalStrain).toBe(0);
    expect(result.isCompromised).toBe(false);
  });
});
