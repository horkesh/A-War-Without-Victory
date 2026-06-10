/**
 * COLLAPSE PHASE IV-b D2 — G2-A marker run-dir-reuse hygiene regression
 * (review-383 BLOCKING defect fix).
 *
 * Defect: `uniqueRunFolder` defaults to false, so re-running the same scenario
 * collapse-OFF after a collapse-ON run reuses the SAME run dir — final_save.json is
 * overwritten with the OFF artifact, but a stale `collapse_enabled.json` sidecar would
 * survive → the G2 §6 invariant test (G2-A) would assert the collapse-ON proof against
 * an OFF artifact: exactly the false-green G2-A exists to kill.
 *
 * Fix under test: `syncCollapseEnabledMarker(outDir)` (scenario_runner.ts) writes the
 * marker on the ENABLE_COLLAPSE=true path and DELETES any pre-existing marker on the
 * OFF path (rm force — a no-op for fresh OFF dirs).
 *
 * Determinism: temp-dir filesystem only; env var saved/restored; no RNG/clock in the
 * helper under test (the tmpdir suffix here is test scaffolding, not sim code).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { syncCollapseEnabledMarker } from '../src/scenario/scenario_runner.js';

describe('collapse run marker hygiene (G2-A run-dir reuse, review-383)', () => {
    let dir: string;
    let savedEnv: string | undefined;

    beforeEach(() => {
        dir = mkdtempSync(join(tmpdir(), 'awwv-collapse-marker-'));
        savedEnv = process.env.ENABLE_COLLAPSE;
    });

    afterEach(() => {
        if (savedEnv === undefined) delete process.env.ENABLE_COLLAPSE;
        else process.env.ENABLE_COLLAPSE = savedEnv;
        rmSync(dir, { recursive: true, force: true });
    });

    const markerPath = () => join(dir, 'collapse_enabled.json');

    it('collapse-ON run writes the marker with constant content', async () => {
        process.env.ENABLE_COLLAPSE = 'true';
        await syncCollapseEnabledMarker(dir);
        expect(existsSync(markerPath())).toBe(true);
        const parsed = JSON.parse(readFileSync(markerPath(), 'utf8')) as Record<string, unknown>;
        expect(parsed).toEqual({ collapse_enabled: true, gate: 'ENABLE_COLLAPSE' });
    });

    it('collapse-OFF rerun of a REUSED dir deletes the stale ON marker (the defect)', async () => {
        // First: an ON run leaves the marker.
        process.env.ENABLE_COLLAPSE = 'true';
        await syncCollapseEnabledMarker(dir);
        expect(existsSync(markerPath())).toBe(true);

        // Then: an OFF rerun reusing the SAME dir must remove it.
        delete process.env.ENABLE_COLLAPSE;
        await syncCollapseEnabledMarker(dir);
        expect(existsSync(markerPath())).toBe(false);
    });

    it('collapse-OFF run on a fresh dir is a no-op (no marker created, no error)', async () => {
        delete process.env.ENABLE_COLLAPSE;
        await expect(syncCollapseEnabledMarker(dir)).resolves.toBeUndefined();
        expect(existsSync(markerPath())).toBe(false);
    });

    it('ENABLE_COLLAPSE values other than the literal "true" are OFF (marker removed)', async () => {
        process.env.ENABLE_COLLAPSE = 'true';
        await syncCollapseEnabledMarker(dir);
        process.env.ENABLE_COLLAPSE = '1';
        await syncCollapseEnabledMarker(dir);
        expect(existsSync(markerPath())).toBe(false);
    });
});
