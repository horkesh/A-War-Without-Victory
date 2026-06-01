/**
 * Author-new-op engine injection (Free War Phase 4, #67) — Slice 3 Part B.
 *
 * Exercises the `inject-authored-operations` war-phase step (war_phases.ts).
 * The step consumes cc.pending_authored_op once and either injects a canon
 * CorpsOperation (tagged authored_by_player) or rejects + clears.
 *
 * Verifies:
 *   - valid def → reaches active_operations with authored_by_player tag
 *   - invalid def → cleared, NOT injected, rejection recorded
 *   - brigade double-commit prevented (brigade busy in another op is filtered)
 *   - slot exhaustion blocks injection
 *   - pending_authored_op is ALWAYS consumed/cleared
 *   - DETERMINISM EARLY-OUT: state untouched when nothing is staged
 */
import { describe, it, expect } from 'vitest';
import { warPhases } from '../src/sim/turn_phases/war_phases.js';
import type { GameState } from '../src/state/game_state.js';

const STEP = warPhases.find((p) => p.name === 'inject-authored-operations')!;

function runStep(state: any) {
  STEP.run({ state } as any);
}

/** Build a minimal war-phase state with a corps, brigades, and enemy objectives. */
function makeState(opts: {
  brigades?: string[];
  participating?: string[];
  objectives?: string[];
  busyBrigades?: string[]; // brigades already committed to another active op
  activeOps?: number;       // count of pre-existing active ops (slot pressure)
  type?: string;
} = {}): GameState {
  const brigades = opts.brigades ?? ['rbih_b1', 'rbih_b2', 'rbih_b3'];
  const participating = opts.participating ?? ['rbih_b1', 'rbih_b2'];
  const objectives = opts.objectives ?? ['op:enemy:a', 'op:enemy:b'];

  const formations: Record<string, any> = {
    rbih_1st_corps: { id: 'rbih_1st_corps', faction: 'RBiH', kind: 'corps', status: 'active' },
  };
  for (const b of brigades) {
    formations[b] = { id: b, faction: 'RBiH', kind: 'brigade', status: 'active', corps_id: 'rbih_1st_corps', personnel: 3000 };
  }

  const political_controllers: Record<string, string> = {};
  for (const o of objectives) political_controllers[o] = 'RS'; // enemy-controlled

  const activeOps: any[] = [];
  for (let i = 0; i < (opts.activeOps ?? 0); i++) {
    activeOps.push({ name: `existing_${i}`, type: 'sector_attack', phase: 'execution', participating_brigades: [] });
  }
  // A separate active op holding the "busy" brigades to test double-commit guard.
  if (opts.busyBrigades && opts.busyBrigades.length > 0) {
    activeOps.push({ name: 'prior_op', type: 'sector_attack', phase: 'execution', participating_brigades: [...opts.busyBrigades] });
  }

  return {
    meta: { turn: 10, phase: 'war' },
    political: { political_controllers },
    military: {
      formations,
      corps_command: {
        rbih_1st_corps: {
          stance: 'balanced',
          active_operations: activeOps,
          pending_authored_op: {
            turn: 10,
            ca_cost: 25,
            def: {
              corps_id: 'rbih_1st_corps',
              name: 'Operation Author Test',
              type: opts.type ?? 'sector_attack',
              objectives,
              participating_brigades: participating,
              staging_osid: 'op:friendly:stage',
            },
          },
        },
      },
    },
  } as unknown as GameState;
}

function cc(state: GameState) {
  return (state.military.corps_command as any).rbih_1st_corps;
}

describe('inject-authored-operations war-phase step', () => {
  it('determinism early-out: no pending_authored_op → state untouched', () => {
    const state = makeState();
    cc(state).pending_authored_op = undefined;
    const before = JSON.stringify(state);
    runStep(state);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('valid def reaches active_operations tagged authored_by_player, and is consumed', () => {
    const state = makeState();
    runStep(state);
    const ops = cc(state).active_operations;
    const authored = ops.find((o: any) => o.authored_by_player === true);
    expect(authored).toBeDefined();
    expect(authored.name).toBe('Operation Author Test');
    expect(authored.type).toBe('sector_attack');
    expect(authored.participating_brigades).toContain('rbih_b1');
    expect(authored.participating_brigades).toContain('rbih_b2');
    // Consumed-once.
    expect(cc(state).pending_authored_op).toBeUndefined();
    expect(cc(state).stance).toBe('offensive');
  });

  it('invalid def (no enemy objectives) is cleared, NOT injected, with rejection recorded', () => {
    const state = makeState({ objectives: ['op:friendly:owned'] });
    // Make the only objective friendly-owned → op_empty (error) blocks.
    (state.political as any).political_controllers = { 'op:friendly:owned': 'RBiH' };
    runStep(state);
    expect(cc(state).active_operations.some((o: any) => o.authored_by_player)).toBe(false);
    expect(cc(state).pending_authored_op).toBeUndefined();
    expect(cc(state).authored_op_rejection).toBeDefined();
  });

  it('brigade double-commit prevented (busy brigades filtered, falls below attack floor)', () => {
    // Both requested brigades are already committed to a prior op → 0 survivors → reject.
    const state = makeState({
      participating: ['rbih_b1', 'rbih_b2'],
      busyBrigades: ['rbih_b1', 'rbih_b2'],
    });
    runStep(state);
    expect(cc(state).active_operations.some((o: any) => o.authored_by_player)).toBe(false);
    expect(cc(state).pending_authored_op).toBeUndefined();
    expect(cc(state).authored_op_rejection?.reason).toBe('participants_below_attack_floor');
  });

  it('partial double-commit: only uncommitted brigades survive', () => {
    // 24 brigades → 2 op slots, so the prior_op holding the busy brigade leaves
    // a free slot for the authored op (isolates the double-commit filter from
    // slot exhaustion).
    const many = Array.from({ length: 24 }, (_, i) => `rbih_b${i + 1}`);
    const state = makeState({
      brigades: many,
      participating: ['rbih_b1', 'rbih_b2', 'rbih_b3'],
      busyBrigades: ['rbih_b1'], // b1 busy; b2,b3 free → 2 survivors → valid
    });
    runStep(state);
    const authored = cc(state).active_operations.find((o: any) => o.authored_by_player);
    expect(authored).toBeDefined();
    expect(authored.participating_brigades).not.toContain('rbih_b1');
    expect(authored.participating_brigades).toContain('rbih_b2');
    expect(authored.participating_brigades).toContain('rbih_b3');
  });

  it('slot exhaustion blocks injection (max slots = floor(brigades/12), min 1)', () => {
    // 3 brigades → getMaxOperationSlots = max(1, floor(3/12)) = 1. One pre-existing
    // active op already fills the single slot → no free slot → reject.
    const state = makeState({ activeOps: 1 });
    runStep(state);
    expect(cc(state).active_operations.some((o: any) => o.authored_by_player)).toBe(false);
    expect(cc(state).pending_authored_op).toBeUndefined();
    expect(cc(state).authored_op_rejection?.reason).toBe('no_available_slot');
  });

  it('pending_authored_op is ALWAYS consumed even on rejection paths', () => {
    const reject = makeState({ participating: ['rbih_b1'] }); // below floor (1 < 2)
    runStep(reject);
    expect(cc(reject).pending_authored_op).toBeUndefined();

    const valid = makeState();
    runStep(valid);
    expect(cc(valid).pending_authored_op).toBeUndefined();
  });

  it('cross-corps double-commit prevented (brigade busy in ANOTHER corps op is excluded)', () => {
    // 24 brigades → 2 op slots so slot exhaustion does not mask the guard.
    const many = Array.from({ length: 24 }, (_, i) => `rbih_b${i + 1}`);
    const state = makeState({
      brigades: many,
      participating: ['rbih_b1', 'rbih_b2', 'rbih_b3'],
    });
    // A SECOND corps hosts an active op whose participating_brigades include
    // rbih_b1 (a 1st-corps brigade joined as a secondary axis). The local
    // getAvailableBrigades guard on the 1st corps would NOT see this — only the
    // state-wide findBrigadeOperationAnywhere lookup catches it.
    (state.military.corps_command as any).rbih_2nd_corps = {
      stance: 'offensive',
      active_operations: [
        { name: 'joint_op', type: 'sector_attack', phase: 'execution', participating_brigades: ['rbih_b1'] },
      ],
    };
    runStep(state);
    const authored = cc(state).active_operations.find((o: any) => o.authored_by_player);
    // b2,b3 still free → 2 survivors → op injects, but rbih_b1 is excluded.
    expect(authored).toBeDefined();
    expect(authored.participating_brigades).not.toContain('rbih_b1');
    expect(authored.participating_brigades).toContain('rbih_b2');
    expect(authored.participating_brigades).toContain('rbih_b3');
  });

  it('cross-corps double-commit can drop the op below the attack floor → reject', () => {
    const many = Array.from({ length: 24 }, (_, i) => `rbih_b${i + 1}`);
    const state = makeState({
      brigades: many,
      participating: ['rbih_b1', 'rbih_b2'],
    });
    // Both requested brigades committed in another corps's op → 0 survivors → reject.
    (state.military.corps_command as any).rbih_2nd_corps = {
      stance: 'offensive',
      active_operations: [
        { name: 'joint_op', type: 'sector_attack', phase: 'execution', participating_brigades: ['rbih_b1', 'rbih_b2'] },
      ],
    };
    runStep(state);
    expect(cc(state).active_operations.some((o: any) => o.authored_by_player)).toBe(false);
    expect(cc(state).pending_authored_op).toBeUndefined();
    expect(cc(state).authored_op_rejection?.reason).toBe('participants_below_attack_floor');
  });

  it('brigade-corps membership enforced (foreign-corps brigade filtered out)', () => {
    const state = makeState({ participating: ['rbih_b1', 'foreign_b'] });
    // foreign_b belongs to a different corps.
    (state.military.formations as any).foreign_b = {
      id: 'foreign_b', faction: 'RBiH', kind: 'brigade', status: 'active', corps_id: 'rbih_2nd_corps', personnel: 3000,
    };
    runStep(state);
    // Only rbih_b1 survives membership → 1 < attack floor → reject.
    expect(cc(state).active_operations.some((o: any) => o.authored_by_player)).toBe(false);
    expect(cc(state).authored_op_rejection?.reason).toBe('participants_below_attack_floor');
  });
});
