// tests/supply_phase_e2_bombardment.test.ts
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

function makeStateWithMunitions(reserve: number, enabled = true): GameState {
    return {
        meta: { supply_reserves_enabled: enabled },
        heavy_munitions_reserve: { RS: reserve, RBiH: 60, HRHB: 60 },
        general_supply_reserve: { RS: 80, RBiH: 80, HRHB: 80 },
    } as unknown as GameState;
}

describe('Phase E2 — getBombardmentCasualtyMult with heavy munitions', () => {
    it('adequate munitions (>=50): full bombardment multiplier (1.8)', () => {
        const mult = getBombardmentCasualtyMult([makeHeavyAttacker()], 'RS', makeStateWithMunitions(60));
        expect(mult).toBeCloseTo(1.8, 1);
    });

    it('strained munitions (20-49): bonus portion at 75%', () => {
        const mult = getBombardmentCasualtyMult([makeHeavyAttacker()], 'RS', makeStateWithMunitions(30));
        // 1.0 + (1.8 - 1.0) * 0.75 = 1.6
        expect(mult).toBeCloseTo(1.6, 1);
    });

    it('critical munitions (<20): bonus portion at 50%', () => {
        const mult = getBombardmentCasualtyMult([makeHeavyAttacker()], 'RS', makeStateWithMunitions(10));
        // 1.0 + (1.8 - 1.0) * 0.5 = 1.4
        expect(mult).toBeCloseTo(1.4, 1);
    });

    it('supply disabled: bombardment unaffected by munitions level', () => {
        const mult = getBombardmentCasualtyMult([makeHeavyAttacker()], 'RS', makeStateWithMunitions(0, false));
        expect(mult).toBeCloseTo(1.8, 1);
    });

    it('no heavy weapons: base multiplier 1.0 regardless of munitions', () => {
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

describe('Phase E2 — getArtillerySuppression with heavy munitions', () => {
    it('adequate munitions: suppression at full cap (0.7)', () => {
        const sup = getArtillerySuppression([makeHeavyAttacker()], 'RS', makeStateWithMunitions(60));
        expect(sup).toBeCloseTo(0.7, 2);
    });

    it('critical munitions: suppression at half cap (0.35)', () => {
        const sup = getArtillerySuppression([makeHeavyAttacker()], 'RS', makeStateWithMunitions(10));
        expect(sup).toBeCloseTo(0.35, 2);
    });

    it('strained munitions: suppression at 75% of cap (0.525)', () => {
        const sup = getArtillerySuppression([makeHeavyAttacker()], 'RS', makeStateWithMunitions(30));
        expect(sup).toBeCloseTo(0.525, 2);
    });
});
