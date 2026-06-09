/**
 * Codex #342 P1 — `dayton_close_out` must survive `normalizeScenario()`.
 *
 * The A2 Dayton close-out (#342) added `dayton_close_out` to the close-out
 * scenario JSON and parsed it in the loader. Codex flagged that the NORMAL
 * harness path is `runScenario → loadScenario → normalizeScenario → state build`,
 * and `normalizeScenario()` whitelists/rebuilds the returned object across TWO
 * return branches (the `use_harness_bots` branch and the default branch). If the
 * flag were only preserved at one site, the close-out would never reach
 * `state.meta.dayton_close_out` via the standard path and the terminal Pyrrhic
 * verdict (game_over) would silently never fire.
 *
 * These tests pin the passthrough on BOTH normalization branches so a future
 * refactor of `normalizeScenario` cannot silently drop the field. The A2 unit
 * tests (`dayton_headless_close_out.test.ts`) exercise the terminal resolver
 * directly via a hand-built state and never touch the loader — this file closes
 * that coverage gap.
 *
 * CALIBRATION SAFETY: the flag is default-absent on all calibration scenarios
 * (40w/52w/188w never set it). These tests also assert the calibration scenarios
 * normalize WITHOUT the field (it stays `undefined`), so the 40w/52w/188w
 * baselines remain byte-identical.
 */
import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadScenario, normalizeScenario } from '../src/scenario/scenario_loader.js';

const REPO_ROOT = resolve(__dirname, '..');
const CLOSE_OUT_PATH = resolve(REPO_ROOT, 'data/scenarios/apr1992_definitive_188w_dayton_close.json');
const CAL_188W_PATH = resolve(REPO_ROOT, 'data/scenarios/apr1992_definitive_188w.json');
const CAL_40W_PATH = resolve(REPO_ROOT, 'data/scenarios/apr1992_definitive_40w.json');
const CAL_52W_PATH = resolve(REPO_ROOT, 'data/scenarios/apr1992_definitive_52w.json');

/** Minimal valid scenario stub the normalizer accepts (war phase, 1+ weeks). */
function baseRaw(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        scenario_id: 'unit_close_out',
        weeks: 1,
        turns: [],
        ...overrides,
    };
}

describe('Codex #342 P1 — normalizeScenario preserves dayton_close_out', () => {
    it('preserves dayton_close_out=true through the DEFAULT return branch (no harness bots)', () => {
        const s = normalizeScenario(baseRaw({ dayton_close_out: true }));
        expect(s.use_harness_bots).toBeFalsy();
        expect(s.dayton_close_out).toBe(true);
    });

    it('preserves dayton_close_out=true through the use_harness_bots return branch', () => {
        const s = normalizeScenario(baseRaw({ dayton_close_out: true, use_harness_bots: true }));
        expect(s.use_harness_bots).toBe(true);
        expect(s.dayton_close_out).toBe(true);
    });

    it('omits dayton_close_out when absent (default-off) on both branches', () => {
        expect(normalizeScenario(baseRaw()).dayton_close_out).toBeUndefined();
        expect(normalizeScenario(baseRaw({ use_harness_bots: true })).dayton_close_out).toBeUndefined();
    });

    it('coerces a non-true value to undefined (only literal true opts in)', () => {
        // Defensive: a truthy-but-not-true JSON value (e.g. 1, "true") must NOT
        // silently arm the close-out — the loader requires `=== true`.
        const s = normalizeScenario(baseRaw({ dayton_close_out: 1 as unknown as boolean }));
        expect(s.dayton_close_out).toBeUndefined();
    });
});

describe('Codex #342 P1 — end-to-end loadScenario from disk', () => {
    it('the close-out scenario JSON sets the flag, and loadScenario preserves it', async () => {
        const rawJson = JSON.parse(await readFile(CLOSE_OUT_PATH, 'utf8')) as Record<string, unknown>;
        // Guard: the source JSON actually opts in (catches an accidental drop in the data file).
        expect(rawJson.dayton_close_out).toBe(true);

        const loaded = await loadScenario(CLOSE_OUT_PATH);
        expect(loaded.scenario_id).toBe('apr1992_definitive_188w_dayton_close');
        // This is the path the real harness uses: runScenario → loadScenario.
        expect(loaded.dayton_close_out).toBe(true);
    });

    it('calibration scenarios (40w/52w/188w) normalize WITHOUT the flag — byte-identity guard', async () => {
        for (const p of [CAL_40W_PATH, CAL_52W_PATH, CAL_188W_PATH]) {
            const loaded = await loadScenario(p);
            expect(loaded.dayton_close_out).toBeUndefined();
        }
    });
});
