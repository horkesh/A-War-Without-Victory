/**
 * Issue #25 sub-task D: Validation harness for officer_config consumers.
 *
 * Asserts that each field populated in `data/scenarios/timelines/apr1992.json`
 * `officer_config` has at least one consumer-side read in `src/`. The "dead
 * config" pattern (schema + data exist, runtime never reads) is the same class
 * of bug as #22's war_timeline gap — this test catches it preemptively.
 *
 * Known-dead fields are listed in DEAD_FIELDS_ALLOW_LIST. As consumers are
 * implemented, fields move from the allow-list to the active set and the test
 * asserts they have ≥1 read site.
 *
 * Empirically discovered dead fields (per session 2026-04-27 audit):
 * - HRHB.roso_restructuring_week — fix A (+1 boost) falsified; redesign needed
 * - HRHB.zagreb_cadre_interval — Zagreb cadre rotation cycle, no consumer
 * - RBiH.pool_regeneration_interval — TO→corps officer pipeline cycle
 * - RBiH.pool_generated_base_competence — new officer base comp
 * - RBiH.pool_generated_max_competence — new officer cap
 */

import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

// Faction-keyed metadata fields that are not consumer-side runtime config.
const META_FIELDS = new Set(['faction']);

// Known dead config fields (no consumer in src/). As fixes land, remove from
// this list — the test will then assert the field has ≥1 read site.
const DEAD_FIELDS_ALLOW_LIST = new Set<string>([
    'HRHB.roso_restructuring_week',
    'HRHB.zagreb_cadre_interval',
    'RBiH.pool_regeneration_interval',
    'RBiH.pool_generated_base_competence',
    'RBiH.pool_generated_max_competence',
]);

interface OfficerConfigEntry {
    [field: string]: number | string;
}

interface WarTimeline {
    officer_config?: Record<string, OfficerConfigEntry>;
}

function countReadSites(fieldName: string): number {
    // Grep src/ for `\.fieldName\b` (excluding type definitions in officer_types.ts
    // and tests) — counts actual consumer-side reads.
    try {
        const result = execSync(
            `grep -rnE '\\.${fieldName}\\b' src/ --include='*.ts' --include='*.tsx' ` +
            `| grep -v 'officer_types\\.ts' ` +
            `| grep -v 'test\\.' ` +
            `| wc -l`,
            { encoding: 'utf8', cwd: process.cwd() }
        );
        return parseInt(result.trim(), 10) || 0;
    } catch {
        return 0;
    }
}

describe('officer_config consumers (issue #25 sub-task D)', () => {
    const timelinePath = join(process.cwd(), 'data', 'scenarios', 'timelines', 'apr1992.json');
    const timeline: WarTimeline = JSON.parse(readFileSync(timelinePath, 'utf8'));

    it('apr1992 timeline has officer_config defined', () => {
        expect(timeline.officer_config).toBeDefined();
        expect(Object.keys(timeline.officer_config!)).toContain('RBiH');
        expect(Object.keys(timeline.officer_config!)).toContain('RS');
        expect(Object.keys(timeline.officer_config!)).toContain('HRHB');
    });

    it('every active officer_config field has at least one consumer in src/', () => {
        const oc = timeline.officer_config!;
        const offendingFields: string[] = [];
        const allowedDeadFields: string[] = [];

        for (const faction of ['RBiH', 'RS', 'HRHB'] as const) {
            const factionConfig = oc[faction];
            if (!factionConfig) continue;
            for (const fieldName of Object.keys(factionConfig).sort()) {
                if (META_FIELDS.has(fieldName)) continue;

                const fqn = `${faction}.${fieldName}`;
                const readSites = countReadSites(fieldName);

                if (readSites === 0) {
                    if (DEAD_FIELDS_ALLOW_LIST.has(fqn)) {
                        allowedDeadFields.push(fqn);
                    } else {
                        offendingFields.push(`${fqn} — populated in apr1992.json but no read sites in src/ (and not in allow-list)`);
                    }
                }
            }
        }

        expect(
            offendingFields,
            `Officer config fields populated without consumers (and not in DEAD_FIELDS_ALLOW_LIST):\n${offendingFields.join('\n')}`
        ).toEqual([]);

        // Informational — log allowed dead fields so the test failure mode is clear if list grows.
        if (allowedDeadFields.length > 0) {
            console.log(
                `[issue #25 sub-task D] ${allowedDeadFields.length} known-dead officer_config fields ` +
                `(allow-listed):\n  ${allowedDeadFields.join('\n  ')}`
            );
        }
    });

    it('DEAD_FIELDS_ALLOW_LIST entries are all currently dead (no false-positive allow-listing)', () => {
        // Sanity check: every allow-listed field really has 0 read sites. If a
        // field gets a consumer added, it should be removed from the allow-list.
        const wronglyAllowListed: string[] = [];
        for (const fqn of DEAD_FIELDS_ALLOW_LIST) {
            const fieldName = fqn.split('.')[1];
            const readSites = countReadSites(fieldName);
            if (readSites > 0) {
                wronglyAllowListed.push(`${fqn} — has ${readSites} read sites; remove from DEAD_FIELDS_ALLOW_LIST`);
            }
        }
        expect(wronglyAllowListed, wronglyAllowListed.join('\n')).toEqual([]);
    });
});
