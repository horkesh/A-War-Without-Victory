/**
 * B1 Casualty-Model Realism V2 — feature gate.
 *
 * The gate re-anchors the KIA/WIA/MIA split toward historical realism (collapse the
 * over-produced missing/captured bucket into WIA, hold KIA at the #316 re-anchor).
 * It DEFAULTS OFF so the calibration floor is byte-identical when the flag is unset;
 * activation is the D1 finalization decision.
 *
 * Tests:
 *   1  Default (env unset, no override) → disabled (preserves the floor).
 *   2  Env "1"/"true"/"on"/"yes" → enabled; any other value → disabled.
 *   3  Module-local override wins over env (both directions); reset reverts.
 *   4  Flag-OFF: every per-path accessor returns the EXACT shipped fractions
 *      (byte-identity guarantee — must equal the live KIA_FRACTION / siege consts).
 *   5  Flag-ON: KIA held, WIA raised, MIA (= 1-kia-wia) strictly reduced on every path.
 *   6  splitKiaWiaMia is byte-identical flag-OFF and shifts WIA-up / MIA-down flag-ON.
 *
 * Determinism: each test snapshots/restores process.env and resets the override.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    isCasualtyRealismV2Enabled,
    resetCasualtyRealismV2Override,
    setCasualtyRealismV2Override,
    getMainCasualtySplit,
    getSiegeCasualtySplit,
    getUndefendedCasualtySplit,
    getSurrenderCascadeCasualtySplit,
} from '../src/sim/combat/casualty_realism_v2_gate.js';
import {
    KIA_FRACTION,
    WIA_FRACTION,
    splitKiaWiaMia,
} from '../src/sim/combat/attack_casualty_distribution.js';
import {
    SIEGE_KIA_FRACTION,
    SIEGE_WIA_FRACTION,
} from '../src/sim/combat/siege_attrition.js';

const ENV_KEY = 'AWWV_CASUALTY_REALISM_V2';

/** MIA fraction implied by a (kia, wia) split. */
function mia(split: { kia: number; wia: number }): number {
    return Math.max(0, 1 - split.kia - split.wia);
}

describe('B1 casualty-realism V2 gate', () => {
    let savedEnv: string | undefined;

    beforeEach(() => {
        savedEnv = process.env[ENV_KEY];
        delete process.env[ENV_KEY];
        resetCasualtyRealismV2Override();
    });

    afterEach(() => {
        if (savedEnv === undefined) delete process.env[ENV_KEY];
        else process.env[ENV_KEY] = savedEnv;
        resetCasualtyRealismV2Override();
    });

    it('defaults OFF when env unset and no override (preserves the floor)', () => {
        expect(isCasualtyRealismV2Enabled()).toBe(false);
    });

    it('enables only on explicit truthy env values', () => {
        for (const on of ['1', 'true', 'on', 'yes', 'TRUE', 'On']) {
            process.env[ENV_KEY] = on;
            expect(isCasualtyRealismV2Enabled()).toBe(true);
        }
        for (const off of ['0', 'false', 'off', 'no', '', 'maybe']) {
            process.env[ENV_KEY] = off;
            expect(isCasualtyRealismV2Enabled()).toBe(false);
        }
    });

    it('module-local override wins over env, and reset reverts', () => {
        process.env[ENV_KEY] = '1';
        setCasualtyRealismV2Override(false);
        expect(isCasualtyRealismV2Enabled()).toBe(false);

        delete process.env[ENV_KEY];
        setCasualtyRealismV2Override(true);
        expect(isCasualtyRealismV2Enabled()).toBe(true);

        resetCasualtyRealismV2Override();
        expect(isCasualtyRealismV2Enabled()).toBe(false);
    });

    describe('flag-OFF byte-identity (split == shipped fractions)', () => {
        beforeEach(() => setCasualtyRealismV2Override(false));

        it('main split equals the live KIA_FRACTION / WIA_FRACTION exactly', () => {
            const s = getMainCasualtySplit();
            expect(s.kia).toBe(KIA_FRACTION);
            expect(s.wia).toBe(WIA_FRACTION);
        });

        it('siege split equals the live SIEGE_KIA / SIEGE_WIA constants exactly', () => {
            const s = getSiegeCasualtySplit();
            expect(s.kia).toBe(SIEGE_KIA_FRACTION);
            expect(s.wia).toBe(SIEGE_WIA_FRACTION);
        });

        it('undefended split is the shipped 0.15 / 0.50 (MIA 0.35)', () => {
            const s = getUndefendedCasualtySplit();
            expect(s.kia).toBe(0.15);
            expect(s.wia).toBe(0.50);
        });

        it('surrender-cascade split is the shipped 0.10 / 0.40 (MIA 0.50)', () => {
            const s = getSurrenderCascadeCasualtySplit();
            expect(s.kia).toBe(0.10);
            expect(s.wia).toBe(0.40);
        });

        it('splitKiaWiaMia reproduces the shipped split for a fixed total', () => {
            // 1000 cas × shipped 0.22/0.74/0.04 → 220 / 740 / 40.
            expect(splitKiaWiaMia(1000)).toEqual({ killed: 220, wounded: 740, missing_captured: 40 });
        });
    });

    describe('flag-ON re-anchor (KIA held, MIA collapsed into WIA)', () => {
        beforeEach(() => setCasualtyRealismV2Override(true));

        it('holds KIA and strictly reduces MIA on every path vs shipped', () => {
            const paths: Array<[() => { kia: number; wia: number }, { kia: number; wia: number }]> = [
                [getMainCasualtySplit, { kia: 0.22, wia: 0.74 }],
                [getSiegeCasualtySplit, { kia: 0.20, wia: 0.65 }],
                [getUndefendedCasualtySplit, { kia: 0.15, wia: 0.50 }],
                [getSurrenderCascadeCasualtySplit, { kia: 0.10, wia: 0.40 }],
            ];
            for (const [getOn, shipped] of paths) {
                const on = getOn();
                // KIA unchanged (don't disturb the ~1:3.4 killed:wounded the #316 work set).
                expect(on.kia).toBe(shipped.kia);
                // WIA raised, MIA strictly lower.
                expect(on.wia).toBeGreaterThan(shipped.wia);
                expect(mia(on)).toBeLessThan(mia(shipped));
            }
        });

        it('keeps the main killed:wounded ratio within the historical ~1:3.5 band', () => {
            const s = getMainCasualtySplit();
            const ratio = s.wia / s.kia; // wounded per killed
            expect(ratio).toBeGreaterThanOrEqual(3.0);
            expect(ratio).toBeLessThanOrEqual(3.6);
        });

        it('splitKiaWiaMia shifts WIA-up / MIA-down for a fixed total', () => {
            // 1000 cas × V2 0.22/0.76/0.02 → 220 / 760 / 20 (vs 220/740/40 shipped).
            expect(splitKiaWiaMia(1000)).toEqual({ killed: 220, wounded: 760, missing_captured: 20 });
        });
    });
});
