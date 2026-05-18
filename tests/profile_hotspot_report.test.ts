import { describe, expect, it } from 'vitest';

import {
    buildProfileHotspotReport,
    formatProfileHotspotMarkdown,
} from '../tools/perf/profile_hotspot_report.js';

describe('profile hotspot report', () => {
    it('summarizes step profile and rejects unsafe optimization when risk is declared', () => {
        const report = buildProfileHotspotReport({
            profilePath: 'data/derived/_debug/profile.json',
            profile: {
                scenario: 'data/scenarios/apr1992_definitive_40w.json',
                totalWallMs: 100_000,
                totalWallS: 100,
                phaseTotals: [
                    { name: 'partition-corps-front-sectors', totalMs: 10_000, count: 40 },
                    { name: 'reconcile-final-sector-truth', totalMs: 9_000, count: 40 },
                    { name: 'update-displacement', totalMs: 5_000, count: 40 },
                ],
            },
            finalStateHash: 'abc123',
            riskNotes: {
                'partition-corps-front-sectors': 'Sector reconstruction is deterministic behavior, not diagnostic-only overhead.',
            },
            sectorPartition: {
                path: 'data/derived/_debug/sector_partition_perf.jsonl',
                invocations: 95,
                totalMs: 25_000,
                topSubFunctions: [
                    { label: 'buildFactionSectors:RS', totalMs: 3_800, count: 95 },
                    { label: 'recoverDroppedFrontEdges:1', totalMs: 1_700, count: 95 },
                ],
            },
        });

        expect(report.optimization_decision).toEqual({
            status: 'truth_report_only',
            rationale: 'Dominant profiled target has declared behavior/determinism risk; do not optimize without a narrower follow-up plan.',
        });
        expect(report.top_steps[0]).toEqual({
            name: 'partition-corps-front-sectors',
            total_ms: 10000,
            pct_total: 10,
            ms_per_call: 250,
            count: 40,
            risk_note: 'Sector reconstruction is deterministic behavior, not diagnostic-only overhead.',
        });
        expect(report.sector_partition?.top_sub_functions[0]).toEqual({
            label: 'buildFactionSectors:RS',
            total_ms: 3800,
            pct_sector_partition: 15.2,
            count: 95,
        });
        expect(report.determinism).toEqual({
            timing_sidecar_only: true,
            deterministic_artifacts_unchanged_by_construction: true,
            final_state_hash: 'abc123',
        });
    });

    it('formats markdown with evidence and no timestamp-shaped text', () => {
        const report = buildProfileHotspotReport({
            profilePath: 'profile.json',
            profile: {
                scenario: 'scenario.json',
                totalWallMs: 50_000,
                totalWallS: 50,
                phaseTotals: [{ name: 'simulation-step', totalMs: 25_000, count: 10 }],
            },
            finalStateHash: 'hash',
        });

        const markdown = formatProfileHotspotMarkdown(report);

        expect(markdown).toContain('| step | total ms | pct total | ms/call | count | risk note |');
        expect(markdown).toContain('| simulation-step | 25000.000 | 50.000 | 2500.000 | 10 |  |');
        expect(markdown).toContain('Optimization decision: `profile_supports_candidate`');
        expect(markdown).not.toMatch(/timestamp/i);
        expect(markdown).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
    });
});
