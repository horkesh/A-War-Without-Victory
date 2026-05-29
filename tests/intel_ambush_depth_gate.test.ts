/**
 * Intel ambush friction — umbrella feature gate.
 *
 * The intel surprise / ambush casualty mechanic is SHIPPED and live; the gate
 * retro-wraps it behind a single kill-switch that DEFAULTS ON so the baseline is
 * byte-identical when the flag is unset.
 *
 * Tests:
 *   1  Default (env unset, no override) → enabled (preserves live baseline).
 *   2  Env "0"/"false"/"off"/"no" → disabled; any other value → enabled.
 *   3  Module-local override wins over env (both directions).
 *   4  reset() reverts to env-default.
 *   5  When disabled, the casualty helpers return neutral ×1.0 (inert).
 *   6  When enabled (default), the helpers reproduce the shipped friction.
 *
 * Determinism: each test snapshots/restores process.env and resets the override.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    isIntelAmbushFrictionEnabled,
    resetIntelAmbushFrictionOverride,
    setIntelAmbushFrictionOverride,
} from '../src/sim/combat/intel_ambush_depth_gate.js';
import {
    getIntelAmbushAttackerCasualtyMult,
    getIntelAmbushDefenderCasualtyMult,
} from '../src/sim/combat/combat_math.js';

const ENV_KEY = 'AWWV_INTEL_AMBUSH_FRICTION';

describe('intel ambush friction umbrella gate', () => {
    let savedEnv: string | undefined;

    beforeEach(() => {
        savedEnv = process.env[ENV_KEY];
        delete process.env[ENV_KEY];
        resetIntelAmbushFrictionOverride();
    });

    afterEach(() => {
        if (savedEnv === undefined) delete process.env[ENV_KEY];
        else process.env[ENV_KEY] = savedEnv;
        resetIntelAmbushFrictionOverride();
    });

    it('defaults ON when env unset and no override (preserves live baseline)', () => {
        expect(isIntelAmbushFrictionEnabled()).toBe(true);
    });

    it('disables only on explicit falsy env values', () => {
        for (const off of ['0', 'false', 'off', 'no', 'FALSE', 'Off']) {
            process.env[ENV_KEY] = off;
            expect(isIntelAmbushFrictionEnabled()).toBe(false);
        }
        for (const on of ['1', 'true', 'on', 'yes', '']) {
            process.env[ENV_KEY] = on;
            expect(isIntelAmbushFrictionEnabled()).toBe(true);
        }
    });

    it('module-local override wins over env in both directions', () => {
        process.env[ENV_KEY] = '0';
        setIntelAmbushFrictionOverride(true);
        expect(isIntelAmbushFrictionEnabled()).toBe(true);

        delete process.env[ENV_KEY];
        setIntelAmbushFrictionOverride(false);
        expect(isIntelAmbushFrictionEnabled()).toBe(false);
    });

    it('reset reverts to env-default', () => {
        setIntelAmbushFrictionOverride(false);
        expect(isIntelAmbushFrictionEnabled()).toBe(false);
        resetIntelAmbushFrictionOverride();
        expect(isIntelAmbushFrictionEnabled()).toBe(true);
    });

    it('makes the casualty helpers inert (x1.0) when disabled', () => {
        setIntelAmbushFrictionOverride(false);
        // Low-confidence OPSEC contact would normally trigger friction.
        expect(getIntelAmbushAttackerCasualtyMult(0.1, true)).toBe(1);
        expect(getIntelAmbushDefenderCasualtyMult(0.1, true)).toBe(1);
        expect(getIntelAmbushAttackerCasualtyMult(0, true)).toBe(1);
        expect(getIntelAmbushDefenderCasualtyMult(0, true)).toBe(1);
    });

    it('reproduces the shipped friction when enabled (default)', () => {
        // Default ON: low-confidence OPSEC contact bleeds the attacker, spares the defender.
        expect(getIntelAmbushAttackerCasualtyMult(0.1, true)).toBeGreaterThan(1);
        expect(getIntelAmbushDefenderCasualtyMult(0.1, true)).toBeLessThan(1);
    });
});
