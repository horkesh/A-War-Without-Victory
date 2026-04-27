/**
 * Issue #25 sub-task E: Sister-parity audit for apr1992 scenarios.
 *
 * Asserts that `apr1992_definitive_188w.json` declares the same set of
 * top-level "wiring" fields as the canonical sister scenario
 * `apr1992_definitive_40w.json`. The pattern bug this catches: a scenario
 * silently runs without a wiring field that its sister has, leaving runtime
 * state for that field undefined (e.g., #22's war_timeline gap).
 *
 * Known gaps are listed in KNOWN_GAPS_ALLOW_LIST. As fields are wired into
 * 188w, they're removed from the allow-list and the test asserts the field
 * is present.
 *
 * Empirically discovered gaps (per session 2026-04-27 investigation):
 * - apr1992_definitive_188w.json was missing `war_timeline` until PR #26
 * - apr1992_definitive_188w.json was missing `init_officers` until PR #27 phase 2
 * - apr1992_definitive_188w.json still missing `supply_reserves_enabled` and
 *   `enable_rbih_hrhb_dynamics` (deferred per #29)
 *
 * The test scopes to TOP-LEVEL keys only (not nested data structures like
 * init_control overrides which are intentionally inline-only in 40w).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// Fields that are intentionally INLINE-only in 40w (e.g., osid_control_overrides)
// and not expected in 188w which uses external snapshots. Skip these.
const INTENTIONALLY_INLINE_ONLY = new Set([
    'osid_control_overrides',
    'initial_osid_controllers',
    'must_hold_osids_by_corps',
    'comms_override_by_corps',
    'painted_targets',
    'painted_friendlies',
    'painted_holdouts',
]);

// Known gaps in 188w that have not yet been addressed. As fields are wired,
// remove from this list. Each entry should be tied to a tracking issue/PR.
const KNOWN_GAPS_ALLOW_LIST = new Set<string>([
    // Deferred per #29 — not yet addressed
    'supply_reserves_enabled',
    'enable_rbih_hrhb_dynamics',
]);

function loadScenario(name: string): Record<string, unknown> {
    const path = join(process.cwd(), 'data', 'scenarios', name);
    return JSON.parse(readFileSync(path, 'utf8'));
}

describe('scenario sister-parity (issue #25 sub-task E)', () => {
    const scenario40w = loadScenario('apr1992_definitive_40w.json');
    const scenario188w = loadScenario('apr1992_definitive_188w.json');

    it('40w sister scenario loads', () => {
        expect(scenario40w).toBeDefined();
        expect(scenario40w.scenario_id).toBe('apr1992_definitive_40w');
    });

    it('188w scenario loads', () => {
        expect(scenario188w).toBeDefined();
        expect(scenario188w.scenario_id).toBe('apr1992_definitive_188w');
    });

    it('188w has all wiring fields its 40w sister has (modulo allow-list and intentionally-inline-only)', () => {
        const keys40w = new Set(Object.keys(scenario40w));
        const keys188w = new Set(Object.keys(scenario188w));

        const offendingMissing: string[] = [];
        const allowedMissing: string[] = [];

        for (const key of [...keys40w].sort()) {
            if (INTENTIONALLY_INLINE_ONLY.has(key)) continue;
            if (keys188w.has(key)) continue;

            if (KNOWN_GAPS_ALLOW_LIST.has(key)) {
                allowedMissing.push(key);
            } else {
                offendingMissing.push(`${key} — present in 40w but missing from 188w (and not in allow-list)`);
            }
        }

        expect(
            offendingMissing,
            `Missing wiring fields in 188w (not in KNOWN_GAPS_ALLOW_LIST):\n${offendingMissing.join('\n')}`
        ).toEqual([]);

        if (allowedMissing.length > 0) {
            console.log(
                `[issue #25 sub-task E] ${allowedMissing.length} known sister-parity gaps in 188w ` +
                `(allow-listed):\n  ${allowedMissing.join('\n  ')}`
            );
        }
    });

    it('KNOWN_GAPS_ALLOW_LIST entries are actually missing from 188w (no false-positive allow-listing)', () => {
        const keys188w = new Set(Object.keys(scenario188w));
        const wronglyAllowListed: string[] = [];

        for (const key of KNOWN_GAPS_ALLOW_LIST) {
            if (keys188w.has(key)) {
                wronglyAllowListed.push(`${key} — present in 188w; remove from KNOWN_GAPS_ALLOW_LIST`);
            }
        }

        expect(wronglyAllowListed, wronglyAllowListed.join('\n')).toEqual([]);
    });
});
