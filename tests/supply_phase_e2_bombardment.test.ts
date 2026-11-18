// tests/supply_phase_e2_bombardment.test.ts
//
// Phase E2 scaled bombardment and suppression by the heavy-munitions reserve. That reserve was
// retired 2026-11-17 (Fable consult 6) and its state field removed in the retired-field sweep
// (2026-11-18): getHeavyMunitionsMult is gone and both functions run on the base curve alone.
// The cases below pin that base curve.
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

function makeState(): GameState {
    return { meta: {}, military: {} } as unknown as GameState;
}

describe('getBombardmentCasualtyMult base curve', () => {
    // Constants: MAX_BOMBARDMENT_CAS_MULT=2.2, BOMBARDMENT_DIVISOR=60
    // makeHeavyAttacker: artEff=80, totalFirepower=80, fraction=min(1,80/60)=1.0 (saturated)
    it('full bombardment multiplier (2.2) for a saturated artillery stack', () => {
        const mult = getBombardmentCasualtyMult([makeHeavyAttacker()], 'RS', makeState());
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
        const mult = getBombardmentCasualtyMult([lightAttacker], 'RS', makeState());
        expect(mult).toBeCloseTo(1.0, 2);
    });
});

describe('getArtillerySuppression base curve', () => {
    it('suppression at full cap (0.7) for a saturated artillery stack', () => {
        const sup = getArtillerySuppression([makeHeavyAttacker()], 'RS', makeState());
        expect(sup).toBeCloseTo(0.7, 2);
    });
});
