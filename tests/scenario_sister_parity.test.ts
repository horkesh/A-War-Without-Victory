/**
 * Sister-parity audit for the definitive apr1992 scenarios.
 *
 * The standalone 40w scenario definitions were RETIRED 2026-09-19; short tests and
 * diagnostics now run `apr1992_definitive_188w.json` with a duration override rather
 * than keeping a second scenario definition. This test therefore compares the
 * definitive 188w line against the richest remaining canonical sister, the desktop
 * default `apr1992_definitive_52w.json`: every top-level wiring field the 52w default
 * declares must also be declared by 188w, unless it is intentionally scenario-specific.
 *
 * The pattern bug this catches: a scenario silently runs without a wiring field that
 * its sister has, leaving runtime state for that field undefined (e.g. #22's
 * war_timeline gap).
 *
 * The test scopes to TOP-LEVEL keys only (not nested data structures).
 *
 * Direction note: this is a ONE-DIRECTIONAL check — the desktop default (52w) must be a
 * subset of the definitive line (188w). Extra 188w-only keys are expected and not compared.
 * Entry-LEVEL validity of `must_hold_osids_by_corps` (live corps ids + real OSIDs, non-empty)
 * is guarded separately in `scenario_harness_contracts.test.ts`, because 52w declares no
 * must-hold set for the parity check to compare against.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Fields intentionally declared on only one of the two scenarios.
const SCENARIO_SPECIFIC = new Set([
    // Inline-only control overrides belong to the definitive line, not the desktop default.
    'osid_control_overrides',
    'initial_osid_controllers',
    'must_hold_osids_by_corps',
    'comms_override_by_corps',
    'painted_targets',
    'painted_friendlies',
    'painted_holdouts',
    // Definitive-only scoring/gate flags.
    'calibration_scenario',
    'firepower_deficit_penalty_enabled',
    // Desktop decision surface; the engine defaults it for simulation-only runs.
    'decision_mode',
    // Deprecated bot-compensation field (must be absent or empty; see scenario_guardrails).
    'avoided_osids_by_faction',
]);

function loadScenario(name: string): Record<string, unknown> {
    const path = join(process.cwd(), 'data', 'scenarios', name);
    return JSON.parse(readFileSync(path, 'utf8'));
}

describe('scenario sister-parity (definitive 188w vs desktop 52w)', () => {
    const scenario52w = loadScenario('apr1992_definitive_52w.json');
    const scenario188w = loadScenario('apr1992_definitive_188w.json');

    it('desktop 52w sister scenario loads', () => {
        expect(scenario52w).toBeDefined();
        expect(scenario52w.scenario_id).toBe('apr1992_definitive_52w');
    });

    it('188w scenario loads', () => {
        expect(scenario188w).toBeDefined();
        expect(scenario188w.scenario_id).toBe('apr1992_definitive_188w');
    });

    it('188w has all top-level wiring fields its 52w sister has (modulo scenario-specific)', () => {
        const keys52w = new Set(Object.keys(scenario52w));
        const keys188w = new Set(Object.keys(scenario188w));

        const offendingMissing: string[] = [];

        for (const key of [...keys52w].sort()) {
            if (SCENARIO_SPECIFIC.has(key)) continue;
            if (keys188w.has(key)) continue;
            offendingMissing.push(`${key} — present in 52w but missing from 188w (and not scenario-specific)`);
        }

        expect(
            offendingMissing,
            `Missing wiring fields in 188w (not scenario-specific):\n${offendingMissing.join('\n')}`
        ).toEqual([]);
    });

    it('all active definitive April 1992 scenarios use the canonical turn-40 bilateral-war floor', () => {
        const scenarioNames = readdirSync(join(process.cwd(), 'data', 'scenarios'))
            .filter((name) => /^apr1992_definitive_.*\.json$/.test(name))
            .sort();
        const mismatches: string[] = [];

        for (const scenarioName of scenarioNames) {
            const scenario = loadScenario(scenarioName);
            if (scenario.enable_rbih_hrhb_dynamics !== true) continue;
            if (scenario.rbih_hrhb_war_earliest_week !== 40) {
                mismatches.push(
                    `${scenarioName}: ${String(scenario.rbih_hrhb_war_earliest_week)}`,
                );
            }
        }

        expect(mismatches, mismatches.join('\n')).toEqual([]);
    });
});
