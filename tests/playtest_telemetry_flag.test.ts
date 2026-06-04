/**
 * Playtest telemetry — DEFAULT-OFF feature gate.
 *
 * Tests:
 *   1  Default (env unset, no override) → DISABLED (preserves byte-identical baseline).
 *   2  Env "1"/"true"/"on"/"yes" → enabled; any other value → disabled.
 *   3  Module-local override wins over env (both directions).
 *   4  reset() reverts to env-default (OFF when unset).
 *
 * Determinism: each test snapshots/restores process.env and resets the override.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    PLAYTEST_TELEMETRY_ENV_KEY,
    isPlaytestTelemetryEnabled,
    resetPlaytestTelemetryOverride,
    setPlaytestTelemetryOverride,
} from '../src/diagnostics/telemetry/playtest_telemetry_flag.js';

describe('playtest telemetry default-off gate', () => {
    let savedEnv: string | undefined;

    beforeEach(() => {
        savedEnv = process.env[PLAYTEST_TELEMETRY_ENV_KEY];
        delete process.env[PLAYTEST_TELEMETRY_ENV_KEY];
        resetPlaytestTelemetryOverride();
    });

    afterEach(() => {
        if (savedEnv === undefined) delete process.env[PLAYTEST_TELEMETRY_ENV_KEY];
        else process.env[PLAYTEST_TELEMETRY_ENV_KEY] = savedEnv;
        resetPlaytestTelemetryOverride();
    });

    it('defaults OFF when env unset and no override (byte-identical baseline)', () => {
        expect(isPlaytestTelemetryEnabled()).toBe(false);
    });

    it('enables only on explicit truthy env values', () => {
        for (const on of ['1', 'true', 'on', 'yes', 'TRUE', 'On', ' yes ']) {
            process.env[PLAYTEST_TELEMETRY_ENV_KEY] = on;
            expect(isPlaytestTelemetryEnabled()).toBe(true);
        }
        for (const off of ['0', 'false', 'off', 'no', '', 'enabled', 'maybe']) {
            process.env[PLAYTEST_TELEMETRY_ENV_KEY] = off;
            expect(isPlaytestTelemetryEnabled()).toBe(false);
        }
    });

    it('module-local override wins over env in both directions', () => {
        delete process.env[PLAYTEST_TELEMETRY_ENV_KEY];
        setPlaytestTelemetryOverride(true);
        expect(isPlaytestTelemetryEnabled()).toBe(true);

        process.env[PLAYTEST_TELEMETRY_ENV_KEY] = '1';
        setPlaytestTelemetryOverride(false);
        expect(isPlaytestTelemetryEnabled()).toBe(false);
    });

    it('reset reverts to env-default (OFF when unset)', () => {
        setPlaytestTelemetryOverride(true);
        expect(isPlaytestTelemetryEnabled()).toBe(true);
        resetPlaytestTelemetryOverride();
        expect(isPlaytestTelemetryEnabled()).toBe(false);
    });
});
