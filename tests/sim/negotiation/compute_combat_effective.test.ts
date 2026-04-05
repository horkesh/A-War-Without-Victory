/**
 * Tests for v0.8.2 Phase 3 — computeCombatEffectiveBrigades
 *
 * Covers:
 * 1. Basic count per faction
 * 2. Personnel filter (< 200 excluded)
 * 3. Morale filter (< 40 excluded)
 * 4. Status filter (inactive excluded)
 * 5. Kind filter (artillery, etc. excluded)
 * 6. Multi-faction counts are independent
 * 7. Phase guard: non-war phase → no write
 * 8. All passing brigades counted correctly
 * 9. Write target: value appears in state.military.negotiation.capital
 * 10. Null-safe: works when negotiation state does not exist yet
 * 11. Edge: 0 eligible brigades → count = 0 (not undefined)
 * 12. Mixed valid/invalid brigades: only valid ones counted
 *
 * Deterministic: no Math.random(), no Date.now().
 */

import { describe, it, expect } from 'vitest';
import { computeCombatEffectiveBrigades } from '../../../src/sim/negotiation/compute_combat_effective.js';
import type { GameState } from '../../../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../../../src/state/game_state.js';

// ═══════════════════════════════════════════════════════════════════════════
// Fixture helpers
// ═══════════════════════════════════════════════════════════════════════════

type FormationStub = {
    faction: string;
    status: string;
    kind?: string;
    personnel?: number;
    morale?: number;
};

function makeState(phase: 'war' | 'peace' = 'war', formations: Record<string, FormationStub> = {}): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 10,
            seed: 'combat-effective-test',
            phase,
            referendum_held: true,
            referendum_turn: 6,
            war_start_turn: 10,
        },
        factions: [
            { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 70, legitimacy: 60, control: 70, logistics: 60, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: { authority: 40, legitimacy: 40, control: 40, logistics: 40, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: {
            formations: formations as any,
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            war_exhaustion: {},
            // deliberately no negotiation state — tests that ensureNegotiationCapital creates it
        } as any,
        political: { political_controllers: {} } as any,
        displacement: {} as any,
        turn_summaries: [],
    };
}

function makeFormation(overrides: Partial<FormationStub> = {}): FormationStub {
    return {
        faction: 'RBiH',
        status: 'active',
        kind: 'brigade',
        personnel: 500,
        morale: 60,
        ...overrides,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Group 1: Basic counts
// ═══════════════════════════════════════════════════════════════════════════

describe('Group 1: Basic brigade counting', () => {
    it('1. Three active RBiH brigades all meeting thresholds → RBiH count = 3', () => {
        const state = makeState('war', {
            bde_1: makeFormation({ faction: 'RBiH', personnel: 500, morale: 60 }),
            bde_2: makeFormation({ faction: 'RBiH', personnel: 800, morale: 80 }),
            bde_3: makeFormation({ faction: 'RBiH', personnel: 200, morale: 40 }), // exactly at threshold
        });
        computeCombatEffectiveBrigades(state);
        expect(state.military.negotiation!.capital['RBiH'].combat_effective_brigades).toBe(3);
    });

    it('2. Personnel filter: brigade with personnel = 150 is not counted (< 200)', () => {
        const state = makeState('war', {
            bde_1: makeFormation({ faction: 'RBiH', personnel: 500, morale: 60 }),
            bde_2: makeFormation({ faction: 'RBiH', personnel: 150, morale: 60 }), // below threshold
        });
        computeCombatEffectiveBrigades(state);
        expect(state.military.negotiation!.capital['RBiH'].combat_effective_brigades).toBe(1);
    });

    it('3. Personnel filter: brigade with personnel = 199 is not counted (< 200, not >=)', () => {
        const state = makeState('war', {
            bde_1: makeFormation({ faction: 'RBiH', personnel: 199, morale: 60 }),
        });
        computeCombatEffectiveBrigades(state);
        expect(state.military.negotiation!.capital['RBiH'].combat_effective_brigades).toBe(0);
    });

    it('4. Morale filter: brigade with morale = 35 is not counted (< 40)', () => {
        const state = makeState('war', {
            bde_1: makeFormation({ faction: 'RBiH', personnel: 500, morale: 35 }), // below threshold
            bde_2: makeFormation({ faction: 'RBiH', personnel: 500, morale: 60 }),
        });
        computeCombatEffectiveBrigades(state);
        expect(state.military.negotiation!.capital['RBiH'].combat_effective_brigades).toBe(1);
    });

    it('5. Morale filter: brigade with morale = 39 is not counted (< 40, not >=)', () => {
        const state = makeState('war', {
            bde_1: makeFormation({ faction: 'RBiH', personnel: 500, morale: 39 }),
        });
        computeCombatEffectiveBrigades(state);
        expect(state.military.negotiation!.capital['RBiH'].combat_effective_brigades).toBe(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 2: Status and kind filters
// ═══════════════════════════════════════════════════════════════════════════

describe('Group 2: Status and kind filters', () => {
    it('6. Status filter: inactive brigade is not counted', () => {
        const state = makeState('war', {
            bde_active: makeFormation({ faction: 'RBiH', status: 'active' }),
            bde_inactive: makeFormation({ faction: 'RBiH', status: 'inactive' }),
        });
        computeCombatEffectiveBrigades(state);
        expect(state.military.negotiation!.capital['RBiH'].combat_effective_brigades).toBe(1);
    });

    it('7. Kind filter: formation with kind = "artillery" is not counted', () => {
        const state = makeState('war', {
            brigade_1: makeFormation({ faction: 'RS', kind: 'brigade' }),
            artillery_1: makeFormation({ faction: 'RS', kind: 'artillery' }), // excluded
        });
        computeCombatEffectiveBrigades(state);
        expect(state.military.negotiation!.capital['RS'].combat_effective_brigades).toBe(1);
    });

    it('8. Kind filter: formation with kind = undefined is counted (brigade implicit)', () => {
        const state = makeState('war', {
            bde_no_kind: makeFormation({ faction: 'HRHB', kind: undefined }),
        });
        computeCombatEffectiveBrigades(state);
        expect(state.military.negotiation!.capital['HRHB'].combat_effective_brigades).toBe(1);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 3: Multi-faction and phase guard
// ═══════════════════════════════════════════════════════════════════════════

describe('Group 3: Multi-faction counts and phase guard', () => {
    it('9. Multi-faction: counts are per-faction, not shared', () => {
        const state = makeState('war', {
            rbih_1: makeFormation({ faction: 'RBiH', personnel: 500, morale: 60 }),
            rbih_2: makeFormation({ faction: 'RBiH', personnel: 600, morale: 70 }),
            rs_1: makeFormation({ faction: 'RS', personnel: 800, morale: 80 }),
            hrhb_1: makeFormation({ faction: 'HRHB', personnel: 300, morale: 50 }),
            hrhb_2: makeFormation({ faction: 'HRHB', personnel: 400, morale: 45 }),
            hrhb_3: makeFormation({ faction: 'HRHB', personnel: 250, morale: 42 }),
        });
        computeCombatEffectiveBrigades(state);
        const cap = state.military.negotiation!.capital;
        expect(cap['RBiH'].combat_effective_brigades).toBe(2);
        expect(cap['RS'].combat_effective_brigades).toBe(1);
        expect(cap['HRHB'].combat_effective_brigades).toBe(3);
    });

    it('10. Phase guard: non-war phase → function is a no-op, negotiation state unchanged', () => {
        const state = makeState('peace', {
            bde_1: makeFormation({ faction: 'RBiH', personnel: 500, morale: 60 }),
        });
        // Ensure no negotiation state pre-exists
        expect((state.military as any).negotiation).toBeUndefined();

        computeCombatEffectiveBrigades(state);

        // No-op: negotiation state must remain absent
        expect((state.military as any).negotiation).toBeUndefined();
    });

    it('11. Edge: 0 eligible brigades → count = 0, not undefined', () => {
        const state = makeState('war', {
            // Brigade that fails all filters
            bde_fail: makeFormation({ faction: 'RBiH', personnel: 100, morale: 20, status: 'inactive' }),
        });
        computeCombatEffectiveBrigades(state);
        expect(state.military.negotiation!.capital['RBiH'].combat_effective_brigades).toBe(0);
        expect(state.military.negotiation!.capital['RBiH'].combat_effective_brigades).not.toBeUndefined();
    });

    it('12. Null-safe: works even when negotiation state does not exist (ensureNegotiationCapital creates it)', () => {
        const state = makeState('war', {
            bde_1: makeFormation({ faction: 'RBiH', personnel: 500, morale: 60 }),
        });
        // State has no negotiation field at all
        expect((state.military as any).negotiation).toBeUndefined();

        expect(() => computeCombatEffectiveBrigades(state)).not.toThrow();
        expect(state.military.negotiation).toBeDefined();
        expect(state.military.negotiation!.capital['RBiH'].combat_effective_brigades).toBe(1);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 4: Write target and mixed formations
// ═══════════════════════════════════════════════════════════════════════════

describe('Group 4: Write target and mixed formations', () => {
    it('13. Write target: result appears in state.military.negotiation.capital[faction].combat_effective_brigades', () => {
        const state = makeState('war', {
            bde_rs: makeFormation({ faction: 'RS', personnel: 700, morale: 65 }),
        });
        computeCombatEffectiveBrigades(state);
        // Explicit path check
        const value = state.military.negotiation!.capital['RS'].combat_effective_brigades;
        expect(value).toBeDefined();
        expect(typeof value).toBe('number');
        expect(value).toBe(1);
    });

    it('14. Mixed valid/invalid: only valid brigades counted; invalid ones in same faction do not pollute', () => {
        const state = makeState('war', {
            good_1: makeFormation({ faction: 'RS', personnel: 500, morale: 60, kind: 'brigade' }),
            bad_personnel: makeFormation({ faction: 'RS', personnel: 100, morale: 60 }),    // personnel too low
            bad_morale: makeFormation({ faction: 'RS', personnel: 500, morale: 20 }),       // morale too low
            bad_status: makeFormation({ faction: 'RS', status: 'inactive', personnel: 500, morale: 60 }),
            bad_kind: makeFormation({ faction: 'RS', kind: 'artillery', personnel: 500, morale: 60 }),
            good_2: makeFormation({ faction: 'RS', personnel: 300, morale: 55, kind: undefined }), // valid: no kind = brigade
        });
        computeCombatEffectiveBrigades(state);
        expect(state.military.negotiation!.capital['RS'].combat_effective_brigades).toBe(2);
    });
});
