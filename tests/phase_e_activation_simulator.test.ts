/**
 * Phase J Packet 1 — Phase E activation simulator tests.
 *
 * Validates that the simulator:
 *   - Tier 1: enumerates all 5 canonical combos in declared order, applies the
 *     canonical multiplier helpers per combo gate state, honors --faction
 *     and --combo filters, surfaces non-trivial multipliers correctly, and
 *     degrades gracefully when the save path is absent.
 *   - Tier 2: drives the gate override module per combo, classifies
 *     artifact drift (DRIFT vs FLAT vs MISSING vs NO_BASELINE) against a
 *     supplied manifest, and resets gates between combos / on failure.
 *
 * Determinism: tests use the `rawSave` + `manifestOverride` + `tier2RunnerOverride`
 * hooks instead of real file I/O or real scenario runs. No env-var mutation —
 * gate overrides are reset via the gate module's exported reset.
 */

import { afterEach, describe, expect, it } from 'vitest';

import {
    buildTier1Projection,
    buildTier2Projection,
    COMBO_GATES,
    parseArgs,
    runSimulator,
    SIM_COMBOS,
    type BaselineManifest,
    type ManifestScenarioEntry,
    type SimCombo,
} from '../tools/diagnostics/phase_e_activation_simulator.js';
import {
    isCohesionCautionBiasActive,
    isIntlStandingOpsHesitationActive,
    isPoliticalDimensionPropagationEnabled,
    resetPoliticalDimensionGates,
} from '../src/sim/political/political_dimension_propagation_gate.js';

afterEach(() => {
    // Defensive — every test that touches Tier 2 should already reset, but if
    // an assertion fails mid-test we still want clean module state.
    resetPoliticalDimensionGates();
});

function mockSave(overrides: Partial<Record<string, Partial<Record<string, number>>>> = {}): unknown {
    const factions = ['RBiH', 'RS', 'HRHB'] as const;
    const dims = ['international_standing', 'internal_cohesion'] as const;
    const store: Record<string, Record<string, { base_value: number; event_modifier: number; effective_value: number }>> = {};
    for (const f of factions) {
        store[f] = {};
        for (const d of dims) {
            // Default 50 — above both thresholds (intl 30, cohesion 40).
            store[f][d] = { base_value: 50, event_modifier: 0, effective_value: 50 };
        }
    }
    for (const [faction, dimOverrides] of Object.entries(overrides)) {
        if (!store[faction] || !dimOverrides) continue;
        for (const [dim, val] of Object.entries(dimOverrides)) {
            if (typeof val === 'number' && store[faction][dim]) {
                store[faction][dim].effective_value = val;
            }
        }
    }
    return {
        meta: { turn: 40, scenario_id: 'phase_e_sim_test', seed: 'test-seed' },
        military: { negotiation: { strategic_dimensions: store } },
    };
}

function manifestStub(): BaselineManifest {
    return {
        schema_version: 1,
        artifacts: ['activity_summary.json', 'control_delta.json', 'final_save.json'],
        scenarios: [
            {
                id: 'noop_4w',
                scenario_path: 'data/scenarios/noop_4w.json',
                weeks: 4,
                expected_files: ['activity_summary.json', 'control_delta.json', 'final_save.json'],
                hashes: {
                    'activity_summary.json': 'aaaa',
                    'control_delta.json': 'bbbb',
                    'final_save.json': 'cccc',
                },
            },
        ],
    };
}

describe('Phase E activation simulator — Tier 1 (math-only)', () => {
    it('enumerates all 5 canonical combos in declared procedural order', () => {
        const result = buildTier1Projection({ rawSave: mockSave() });
        expect(result.combos.length).toBe(5);
        expect(result.combos.map((c) => c.combo)).toEqual([
            'global_off',
            'global_only',
            'intl_only',
            'cohesion_only',
            'both_on',
        ]);
        // Canonical declared order is also the SIM_COMBOS constant.
        expect(result.combos.map((c) => c.combo)).toEqual([...SIM_COMBOS]);
    });

    it('every combo emits 3 factions when no --faction filter is set', () => {
        const result = buildTier1Projection({ rawSave: mockSave() });
        for (const combo of result.combos) {
            expect(combo.factions.length).toBe(3);
            // Stable sort: HRHB, RBiH, RS alphabetically.
            expect(combo.factions.map((f) => f.faction)).toEqual(['HRHB', 'RBiH', 'RS']);
        }
    });

    it('global_off forces every faction to combined_active = 1.0 regardless of dimension state', () => {
        const result = buildTier1Projection({
            rawSave: mockSave({
                RBiH: { international_standing: 5, internal_cohesion: 5 },
                RS: { international_standing: 0, internal_cohesion: 0 },
                HRHB: { international_standing: 10, internal_cohesion: 10 },
            }),
        });
        const off = result.combos.find((c) => c.combo === 'global_off')!;
        for (const f of off.factions) {
            expect(f.intl_multiplier_active).toBe(1.0);
            expect(f.cohesion_multiplier_active).toBe(1.0);
            expect(f.combined_active).toBe(1.0);
            expect(f.nontrivial).toBe(false);
        }
        expect(off.factions_with_nontrivial_multiplier).toBe(0);
    });

    it('intl_only triggers 0.7× on sub-threshold international_standing and 1.0× on cohesion', () => {
        const result = buildTier1Projection({
            rawSave: mockSave({
                RBiH: { international_standing: 20, internal_cohesion: 20 },
            }),
        });
        const combo = result.combos.find((c) => c.combo === 'intl_only')!;
        const rbih = combo.factions.find((f) => f.faction === 'RBiH')!;
        expect(rbih.intl_multiplier_active).toBe(0.7);
        // cohesion sub-flag inactive → cohesion mult forced 1.0 even though
        // the value (20) is sub-threshold.
        expect(rbih.cohesion_multiplier_active).toBe(1.0);
        expect(rbih.combined_active).toBeCloseTo(0.7, 10);
        expect(rbih.nontrivial).toBe(true);
    });

    it('cohesion_only triggers 0.85× on sub-threshold cohesion and 1.0× on intl_standing', () => {
        const result = buildTier1Projection({
            rawSave: mockSave({
                HRHB: { international_standing: 20, internal_cohesion: 20 },
            }),
        });
        const combo = result.combos.find((c) => c.combo === 'cohesion_only')!;
        const hrhb = combo.factions.find((f) => f.faction === 'HRHB')!;
        expect(hrhb.intl_multiplier_active).toBe(1.0);
        expect(hrhb.cohesion_multiplier_active).toBe(0.85);
        expect(hrhb.combined_active).toBeCloseTo(0.85, 10);
        expect(hrhb.nontrivial).toBe(true);
    });

    it('both_on chains intl × cohesion when both dimensions sub-threshold', () => {
        const result = buildTier1Projection({
            rawSave: mockSave({
                RS: { international_standing: 10, internal_cohesion: 10 },
            }),
        });
        const combo = result.combos.find((c) => c.combo === 'both_on')!;
        const rs = combo.factions.find((f) => f.faction === 'RS')!;
        expect(rs.intl_multiplier_active).toBe(0.7);
        expect(rs.cohesion_multiplier_active).toBe(0.85);
        expect(rs.combined_active).toBeCloseTo(0.7 * 0.85, 10);
    });

    it('global_only leaves every multiplier at 1.0 (no sub-flag active)', () => {
        const result = buildTier1Projection({
            rawSave: mockSave({
                RBiH: { international_standing: 0, internal_cohesion: 0 },
            }),
        });
        const combo = result.combos.find((c) => c.combo === 'global_only')!;
        const rbih = combo.factions.find((f) => f.faction === 'RBiH')!;
        expect(rbih.intl_multiplier_active).toBe(1.0);
        expect(rbih.cohesion_multiplier_active).toBe(1.0);
        expect(rbih.combined_active).toBe(1.0);
    });

    it('--faction filter restricts every combo to a single faction', () => {
        const result = buildTier1Projection({ rawSave: mockSave(), faction: 'RS' });
        for (const combo of result.combos) {
            expect(combo.factions.length).toBe(1);
            expect(combo.factions[0].faction).toBe('RS');
        }
    });

    it('--combo filter restricts output to one combo', () => {
        const result = buildTier1Projection({ rawSave: mockSave(), combo: 'intl_only' });
        expect(result.combos.length).toBe(1);
        expect(result.combos[0].combo).toBe('intl_only');
    });

    it('graceful degradation: throws a helpful message when save path absent', () => {
        expect(() =>
            buildTier1Projection({ savePath: 'definitely/not/a/real/path/save.json' }),
        ).toThrow(/Save path not found/);
    });

    it('JSON shape round-trips cleanly through JSON.stringify/parse', () => {
        const result = buildTier1Projection({ rawSave: mockSave() });
        const reparsed = JSON.parse(JSON.stringify(result));
        expect(reparsed.combos.length).toBe(5);
        expect(reparsed.combos[0].combo).toBe('global_off');
        expect(reparsed.combos[0].gate.global).toBe(false);
        expect(reparsed.combos[4].combo).toBe('both_on');
        expect(reparsed.combos[4].gate.global).toBe(true);
        expect(reparsed.combos[4].gate.intl_standing).toBe(true);
        expect(reparsed.combos[4].gate.cohesion).toBe(true);
    });

    it('parseArgs handles --combo and --run-scenarios flags', () => {
        const args = parseArgs(['--json', '--combo', 'intl_only', '--run-scenarios']);
        expect(args.json).toBe(true);
        expect(args.combo).toBe('intl_only');
        expect(args.runScenarios).toBe(true);
    });

    it('COMBO_GATES table reflects the documented combo semantics', () => {
        expect(COMBO_GATES.global_off).toEqual({ global: false, intl_standing: false, cohesion: false });
        expect(COMBO_GATES.both_on).toEqual({ global: true, intl_standing: true, cohesion: true });
        expect(COMBO_GATES.intl_only).toEqual({ global: true, intl_standing: true, cohesion: false });
        expect(COMBO_GATES.cohesion_only).toEqual({ global: true, intl_standing: false, cohesion: true });
        expect(COMBO_GATES.global_only).toEqual({ global: true, intl_standing: false, cohesion: false });
    });
});

describe('Phase E activation simulator — Tier 2 (real-scenario shape)', () => {
    it('runs the injected runner for every non-baseline combo and resets gates after', async () => {
        const observed: Array<{ combo: SimCombo; globalActive: boolean; intlActive: boolean; cohesionActive: boolean }> = [];
        const runner = async (entry: ManifestScenarioEntry, combo: SimCombo) => {
            // Read live gate state INSIDE the runner — proves the simulator
            // set the override before invoking the runner.
            observed.push({
                combo,
                globalActive: isPoliticalDimensionPropagationEnabled(),
                intlActive: isIntlStandingOpsHesitationActive(),
                cohesionActive: isCohesionCautionBiasActive(),
            });
            // Return baseline-matching hashes so drift classifies as FLAT.
            return { ...entry.hashes };
        };

        const tier2 = await buildTier2Projection({
            manifestOverride: manifestStub(),
            tier2RunnerOverride: runner,
        });

        // 4 non-baseline combos × 1 scenario = 4 invocations.
        expect(observed.length).toBe(4);
        expect(observed.map((o) => o.combo)).toEqual(['global_only', 'intl_only', 'cohesion_only', 'both_on']);

        const intlObs = observed.find((o) => o.combo === 'intl_only')!;
        expect(intlObs.globalActive).toBe(true);
        expect(intlObs.intlActive).toBe(true);
        expect(intlObs.cohesionActive).toBe(false);

        const bothObs = observed.find((o) => o.combo === 'both_on')!;
        expect(bothObs.globalActive).toBe(true);
        expect(bothObs.intlActive).toBe(true);
        expect(bothObs.cohesionActive).toBe(true);

        // After the simulator returns, all overrides must be cleared.
        expect(isPoliticalDimensionPropagationEnabled()).toBe(false);
        expect(isIntlStandingOpsHesitationActive()).toBe(false);
        expect(isCohesionCautionBiasActive()).toBe(false);

        // Every artifact drift cell is FLAT.
        for (const run of tier2.runs) {
            for (const sc of run.scenarios) {
                expect(sc.behavioral_drift_signal).toBe('NO-DRIFT');
                for (const cell of sc.artifact_drift) {
                    expect(cell.status).toBe('FLAT');
                }
            }
        }
    });

    it('classifies drift as DRIFT when hashes diverge and BOT-MILITARY when bot artifacts change', async () => {
        const runner = async (entry: ManifestScenarioEntry, _combo: SimCombo) => {
            // Tamper with one bot-military artifact only.
            return {
                ...entry.hashes,
                'activity_summary.json': 'ZZZZ-divergent-hash',
            };
        };
        const tier2 = await buildTier2Projection({
            manifestOverride: manifestStub(),
            tier2RunnerOverride: runner,
            combo: 'intl_only',
        });
        expect(tier2.runs.length).toBe(1);
        const sc = tier2.runs[0].scenarios[0];
        expect(sc.behavioral_drift_signal).toBe('BOT-MILITARY');
        const driftCell = sc.artifact_drift.find((c) => c.artifact === 'activity_summary.json')!;
        expect(driftCell.status).toBe('DRIFT');
        expect(driftCell.expected_hash).toBe('aaaa');
        expect(driftCell.actual_hash).toBe('ZZZZ-divergent-hash');
        // Other artifacts remain FLAT.
        const flatCell = sc.artifact_drift.find((c) => c.artifact === 'final_save.json')!;
        expect(flatCell.status).toBe('FLAT');
    });

    it('classifies MISSING when actual hash is absent, NO_BASELINE when expected absent', async () => {
        const customManifest: BaselineManifest = {
            schema_version: 1,
            artifacts: ['activity_summary.json', 'control_delta.json', 'unbaselined_artifact.json'],
            scenarios: [
                {
                    id: 'tinyscenario',
                    scenario_path: 'data/scenarios/noop_4w.json',
                    weeks: 4,
                    expected_files: ['activity_summary.json', 'control_delta.json', 'unbaselined_artifact.json'],
                    hashes: {
                        // unbaselined_artifact.json has no expected hash.
                        'activity_summary.json': 'aaaa',
                        'control_delta.json': 'bbbb',
                    },
                },
            ],
        };
        const runner = async (_entry: ManifestScenarioEntry, _combo: SimCombo) => {
            // control_delta missing from actuals.
            return { 'activity_summary.json': 'aaaa', 'unbaselined_artifact.json': 'dddd' };
        };
        const tier2 = await buildTier2Projection({
            manifestOverride: customManifest,
            tier2RunnerOverride: runner,
            combo: 'cohesion_only',
        });
        const sc = tier2.runs[0].scenarios[0];
        const cells = Object.fromEntries(sc.artifact_drift.map((c) => [c.artifact, c]));
        expect(cells['activity_summary.json'].status).toBe('FLAT');
        expect(cells['control_delta.json'].status).toBe('MISSING');
        expect(cells['unbaselined_artifact.json'].status).toBe('NO_BASELINE');
    });

    it('runSimulator returns tier2 only when --run-scenarios requested', async () => {
        const noTier2 = await runSimulator({ rawSave: mockSave() });
        expect(noTier2.tier2).toBeNull();
        const withTier2 = await runSimulator({
            rawSave: mockSave(),
            runScenarios: true,
            manifestOverride: manifestStub(),
            tier2RunnerOverride: async (entry) => ({ ...entry.hashes }),
        });
        expect(withTier2.tier2).not.toBeNull();
        expect(withTier2.tier2!.runs.length).toBe(4);
    });

    it('resets gates even when the runner throws', async () => {
        const runner = async () => {
            throw new Error('synthetic runner failure');
        };
        await expect(
            buildTier2Projection({
                manifestOverride: manifestStub(),
                tier2RunnerOverride: runner,
                combo: 'both_on',
            }),
        ).rejects.toThrow(/synthetic runner failure/);
        // Gates MUST be reset even after a throw — Tier 2's try/finally
        // contract.
        expect(isPoliticalDimensionPropagationEnabled()).toBe(false);
        expect(isIntlStandingOpsHesitationActive()).toBe(false);
        expect(isCohesionCautionBiasActive()).toBe(false);
    });
});
