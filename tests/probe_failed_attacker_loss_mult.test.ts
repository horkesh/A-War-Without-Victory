/**
 * PROBE_FAILED_ATTACKER_LOSS_MULT (lane C Part 5 F2 ruling, 2026-11-22).
 *
 * The constant multiplies ONLY a failed probe's attacker base casualties, as the
 * last factor in computeFinalCasualties. As shipped it is 1.0, so it is exact and
 * hash-neutral; the calibration pass's killed-per-failed-probe row (target 2-4:1)
 * is the only intended lever on it.
 */
import { describe, expect, it } from 'vitest';
import { computeFinalCasualties } from '../src/sim/combat/attack_casualty_distribution.js';
import { PROBE_FAILED_ATTACKER_LOSS_MULT } from '../src/sim/combat/combat_math.js';

const base = {
    personnelAttacker: 1837,
    personnelDefender: 2411,
    outcome: 'repulsed' as const,
    lastStandCasMult: 1,
    militiaOnlyMult: 1,
    attCasMult: 0.8731,
    defCasMult: 1.1137,
    defensiveFireMult: 1.07,
    bombardmentMult: 1,
    attackerCount: 2,
    powerRatio: 0.71,
};

describe('PROBE_FAILED_ATTACKER_LOSS_MULT', () => {
    it('ships as exactly 1.0 (hash-neutral)', () => {
        expect(PROBE_FAILED_ATTACKER_LOSS_MULT).toBe(1.0);
    });

    it('passing the shipped constant is identical to omitting it', () => {
        for (const outcome of ['repulsed', 'catastrophic', 'stalemate', 'victory'] as const) {
            const omitted = computeFinalCasualties({ ...base, outcome });
            const passed = computeFinalCasualties({ ...base, outcome, failedProbeAttackerLossMult: PROBE_FAILED_ATTACKER_LOSS_MULT });
            expect(passed).toEqual(omitted);
        }
    });

    it('scales attacker losses only; defender losses are untouched', () => {
        const full = computeFinalCasualties(base);
        const half = computeFinalCasualties({ ...base, failedProbeAttackerLossMult: 0.5 });
        expect(half.finalDefenderCas).toBe(full.finalDefenderCas);
        expect(half.finalAttackerCas).toBeLessThan(full.finalAttackerCas);
        expect(Math.abs(half.finalAttackerCas - full.finalAttackerCas / 2)).toBeLessThanOrEqual(1);
    });
});
