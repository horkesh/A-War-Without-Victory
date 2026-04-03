import { describe, expect, it } from 'vitest';
import {
    applyCorpsFrontAutoDistributionForCorps,
    deriveCorpsFrontEdgesFromBrigadeAoR,
} from '../src/sim/combat/corps_front_assign.js';
import { CURRENT_SCHEMA_VERSION, type GameState, type LegacyBrigadeAoRState } from '../src/state/game_state.js';
import { getLegacyAoR } from '../src/state/game_state.js';

function makeState(overrides?: Partial<GameState & LegacyBrigadeAoRState>): GameState & LegacyBrigadeAoRState {
    return {
  schema_version: CURRENT_SCHEMA_VERSION,
  meta: {
            turn: 12,
            seed: 'corps-front-assign-test',
            phase: 'war',
            referendum_held: true,
            referendum_turn: 6,
            war_start_turn: 10,
        },
  factions: [
            { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
            { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
        ] as any,
  ...overrides,
  military: {
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
      ...(overrides?.military || {})
} as any,
  political: {
    political_controllers: {},
      ...(overrides?.political || {})
} as any,
  displacement: {
      ...(overrides?.displacement || {})
} as any,
} as GameState & LegacyBrigadeAoRState;
}

describe('corps_front_assign', () => {
    it('derives corps front edges from brigade AoR (always empty — brigade_aor never populated)', () => {
        const state = makeState({
  brigade_aor: { S1: 'b1' },
  military: {
    formations: {
                corps_rbih: { id: 'corps_rbih', faction: 'RBiH', kind: 'corps', status: 'active', name: 'Corps', created_turn: 1, assignment: null },
                b1: { id: 'b1', faction: 'RBiH', kind: 'brigade', status: 'active', name: 'B1', created_turn: 1, assignment: null, corps_id: 'corps_rbih' },
            } as any
  } as any,
  political: {
    political_controllers: { S1: 'RBiH', S2: 'RS' },
  } as any,
});
        // brigade_aor is never populated in pipeline; function always returns {}
        const derived = deriveCorpsFrontEdgesFromBrigadeAoR(state, [{ a: 'S1', b: 'S2' }]);
        expect(derived).toEqual({});
    });

    it.skip('auto-distributes front-adjacent controlled settlements (phased out: OSID/front assignment only)', () => {
        const state = makeState({
  brigade_aor: {},
  military: {
    formations: {
                corps_rbih: { id: 'corps_rbih', faction: 'RBiH', kind: 'corps', status: 'active', name: 'Corps', created_turn: 1, assignment: null },
                b1: { id: 'b1', faction: 'RBiH', kind: 'brigade', status: 'active', name: 'B1', created_turn: 1, assignment: null, corps_id: 'corps_rbih' },
                b2: { id: 'b2', faction: 'RBiH', kind: 'brigade', status: 'active', name: 'B2', created_turn: 1, assignment: null, corps_id: 'corps_rbih' },
            } as any,
    corps_front_edges: { corps_rbih: ['S1__S2', 'S3__S4'] }
  } as any,
  political: {
    political_controllers: { S1: 'RBiH', S2: 'RS', S3: 'RBiH', S4: 'RS' },
  } as any,
});
        applyCorpsFrontAutoDistributionForCorps(state, 'corps_rbih');
        const aor = getLegacyAoR(state).brigade_aor ?? {};
        expect(Object.keys(aor).sort()).toEqual(['S1', 'S3']);
        expect(aor.S1).toBe('b1');
        expect(aor.S3).toBe('b2');
    });

});

