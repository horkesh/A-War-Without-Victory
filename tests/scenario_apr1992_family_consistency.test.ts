/**
 * Apr1992 Definitive Family Consistency
 *
 * The `apr1992_definitive_*.json` scenarios are siblings that all start from
 * April 1992 and consume the shared `data/scenarios/timelines/apr1992.json`
 * timeline (which carries the `officer_config` block, including
 * `learning_rate` per faction).
 *
 * If a sibling does NOT bind `war_timeline: "apr1992"` and
 * `init_officers: "apr1992"`, the engine silently routes that scenario
 * through the hardcoded fallback officer-learning multipliers
 * (`officer_quality_update.ts:46-49`) instead of the timeline values,
 * producing irreconcilable cross-window comparisons (see Force Quality
 * Trajectory Evidence Audit §6 CC1, 2026-05-01).
 *
 * This test auto-discovers every member of the family (excluding
 * `*_backup_*.json`) and asserts the binding agreement, so adding a new
 * sibling later cannot reintroduce the drift silently.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { strictCompare } from '../src/state/validateGameState.js';

const SCENARIOS_DIR = join(process.cwd(), 'data', 'scenarios');
const FAMILY_PREFIX = 'apr1992_definitive_';
const BACKUP_MARKER = '_backup_';
const EXPECTED_TIMELINE = 'apr1992';
const EXPECTED_INIT_OFFICERS = 'apr1992';

interface ScenarioFileShape {
    war_timeline?: string;
    init_officers?: string;
}

function discoverFamilyFiles(): string[] {
    return readdirSync(SCENARIOS_DIR)
        .filter(
            (f) =>
                f.startsWith(FAMILY_PREFIX) &&
                f.endsWith('.json') &&
                !f.includes(BACKUP_MARKER),
        )
        .slice()
        .sort(strictCompare);
}

describe('apr1992_definitive family — timeline & officer-config binding agreement', () => {
    const files = discoverFamilyFiles();

    it('discovers at least the known family members', () => {
        // Sanity: if discovery breaks, the per-file assertions vacuously pass.
        // This guards against accidental future glob/path regressions.
        expect(files.length).toBeGreaterThanOrEqual(3);
        // Known minimum members observed by the Force Quality audit (CC1).
        for (const expected of [
            'apr1992_definitive_40w.json',
            'apr1992_definitive_104w.json',
            'apr1992_definitive_188w.json',
        ]) {
            expect(files).toContain(expected);
        }
    });

    for (const file of files) {
        it(`${file} binds war_timeline="${EXPECTED_TIMELINE}" and init_officers="${EXPECTED_INIT_OFFICERS}"`, () => {
            const raw = readFileSync(join(SCENARIOS_DIR, file), 'utf8');
            const parsed = JSON.parse(raw) as ScenarioFileShape;

            expect(
                parsed.war_timeline,
                `${file}: war_timeline must be "${EXPECTED_TIMELINE}" (got ${JSON.stringify(parsed.war_timeline)}). ` +
                    `Without this binding the engine silently uses the hardcoded fallback officer-learning multipliers ` +
                    `instead of timelines/apr1992.json (see Force Quality Trajectory Audit §6 CC1).`,
            ).toBe(EXPECTED_TIMELINE);

            expect(
                parsed.init_officers,
                `${file}: init_officers must be "${EXPECTED_INIT_OFFICERS}" (got ${JSON.stringify(parsed.init_officers)}). ` +
                    `Without this binding faction_officer_maturity initial values diverge from the apr1992 timeline.`,
            ).toBe(EXPECTED_INIT_OFFICERS);
        });
    }
});
