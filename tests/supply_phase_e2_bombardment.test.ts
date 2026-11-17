// tests/supply_phase_e2_bombardment.test.ts
//
// Phase E2 scaled bombardment and suppression by the heavy-munitions reserve. That reserve was
// retired 2026-11-17 (Fable consult 6): getHeavyMunitionsMult is gone and both functions now
// ignore any reserve an old save carries. The cases below pin that, plus the unchanged base curve.
import { describe, it, expect } from 'vitest';
import { getBombardmentCasualtyMult, getArtillerySuppression } from '../src/sim/combat/combat_math.js';
import type { FormationState, GameState } from '../src/state/game_state.js';

/** Formation with enough artillery to saturate bombardment at max firepower (artEff=80). */
function makeHeavyAttacker(factionId = 'RS'): FormationState {
    return {
        faction: factionId,
        composition: {
            infantry: 0,
            tanks: 0,
            artillery: 80,
            aa_systems: 0,
            tank_condition: { operational: 1.0, degraded: 0, non_operational: 0 },
            artillery_condition: { operational: 1.0, degraded: 0, non_operational: 0 },
        },
        personnel: 3000,
        posture: 'attack',
    } as unknown as FormationState;
}

/** An old save that still carries the retired reserve (and the retired flag). */
function makeStateWithMunitions(reserve: number, enabled = true): GameState {
    return {
  meta: { supply_reserves_enabled: enabled },
  military: {
    heavy_munitions_reserve: { RS: reserve, RBiH: 60, HRHB: 60 },
    general_supply_reserve: { RS: 80, RBiH: 80, HRHB: 80 }
  } as any,
} as unknown as GameState;
}

describe('getBombardmentCasualtyMult ignores the retired heavy-munitions reserve', () => {
    // Constants: MAX_BOMBARDMENT_CAS_MULT=2.2, BOMBARDMENT_DIVISOR=60
    // makeHeavyAttacker: artEff=80, totalFirepower=80, fraction=min(1,80/60)=1.0 (saturated)
    it.each([60, 30, 10, 0])('full bombardment multiplier (2.2) whatever an old save reserve says (reserve=%s)', (reserve) => {
        const mult = getBombardmentCasualtyMult([makeHeavyAttacker()], 'RS', makeStateWithMunitions(reserve));
        expect(mult).toBeCloseTo(2.2, 1);
    });

    it('no reserve fields at all: full multiplier', () => {
        const mult = getBombardmentCasualtyMult([makeHeavyAttacker()], 'RS', { meta: {}, military: {} } as unknown as GameState);
        expect(mult).toBeCloseTo(2.2, 1);
    });

    it('no heavy weapons: base multiplier 1.0', () => {
        const lightAttacker = {
            ...makeHeavyAttacker(),
            composition: {
                infantry: 0, tanks: 0, artillery: 0, aa_systems: 0,
                tank_condition: { operational: 1.0, degraded: 0, non_operational: 0 },
                artillery_condition: { operational: 1.0, degraded: 0, non_operational: 0 },
            },
        } as unknown as FormationState;
        const mult = getBombardmentCasualtyMult([lightAttacker], 'RS', makeStateWithMunitions(10));
        expect(mult).toBeCloseTo(1.0, 2);
    });
});

describe('getArtillerySuppression ignores the retired heavy-munitions reserve', () => {
    it.each([60, 30, 10])('suppression at full cap (0.7) whatever an old save reserve says (reserve=%s)', (reserve) => {
        const sup = getArtillerySuppression([makeHeavyAttacker()], 'RS', makeStateWithMunitions(reserve));
        expect(sup).toBeCloseTo(0.7, 2);
    });
});
