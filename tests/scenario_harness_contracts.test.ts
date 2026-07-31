/**
 * Scenario harness contracts — consolidated regression suite.
 *
 * Cluster 2 — scenario harness H1/H2 merge.
 * Merged verbatim from:
 *   - scenario_harness_smoke_h1_4.test.ts          (H1.4)
 *   - scenario_end_report_h1_5.test.ts             (H1.5)
 *   - scenario_failure_reporting_h1_5_1.test.ts    (H1.5.1)
 *   - scenario_activity_diagnostics_h1_7.test.ts   (H1.7)
 *   - scenario_probe_compare_h1_8.test.ts          (H1.8)
 *   - scenario_baseline_ops_h1_9.test.ts           (H1.9)
 *   - scenario_determinism_h1_1.test.ts            (H1.1)
 *   - scenario_bots_determinism_h2_4.test.ts       (H2.4)
 *   - scenario_apr1992_family_consistency.test.ts  (family binding)
 *
 * Also absorbs (single-file):
 *   - scenario_end_report_army_strengths.test.ts   (army strengths summary)
 *   - scenario_must_hold_contract.test.ts          (must-hold validity)
 *
 * KEPT separate concerns: scenario_golden_baselines_h2_3, scenario_sister_parity,
 * scenario_runner_artifact_repair, scenario_continue_from_save_equivalence,
 * scenario_reporting_contracts.
 */

import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import path from 'node:path';

import { describe, expect, it, test } from 'vitest';

import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import { loadScenario, computeRunId } from '../src/scenario/scenario_loader.js';
import { runScenario, runProbeCompare, buildScenarioStartupState } from '../src/scenario/scenario_runner.js';
import { computeArmyStrengthsSummary } from '../src/scenario/scenario_end_report.js';
import { loadOperationalData } from '../src/data/operational_data.js';
import { strictCompare } from '../src/state/validateGameState.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type { GameState } from '../src/state/game_state.js';

// ── Shared utilities ─────────────────────────────────────────────────────────

async function ensureRemoved(dir: string): Promise<void> {
    if (existsSync(dir)) {
        await rm(dir, { recursive: true, force: true });
    }
}

function isMissingMappingError(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err);
    return (
        msg.includes('Municipality controller mapping file not found') ||
        msg.includes('not in municipality_political_controllers')
    );
}

function countLines(content: string): number {
    const lines = content.split('\n').filter((line) => line.length > 0);
    return lines.length;
}

// ═══════════════════════════════════════════════════════════════════════════
// H1.4 — Mini scenario regression suite (smoke for harness)
// ═══════════════════════════════════════════════════════════════════════════

describe('H1.4 scenario harness smoke', () => {
    const BASE_OUT = join(process.cwd(), '.tmp_scenario_smoke_h1_4');
    const BASE_A = join(process.cwd(), '.tmp_scenario_smoke_h1_4_a');
    const BASE_B = join(process.cwd(), '.tmp_scenario_smoke_h1_4_b');

    const SCENARIO_PATHS = [
        join(process.cwd(), 'data', 'scenarios', 'noop_4w.json'),
        join(process.cwd(), 'data', 'scenarios', 'noop_13w.json'),
        join(process.cwd(), 'data', 'scenarios', 'noop_52w.json')
    ];

    test('scenario harness smoke: noop scenarios produce expected artifacts', async () => {
        const prereq = checkDataPrereqs({ baseDir: process.cwd() });
        if (!prereq.ok) {
            return;
        }

        await ensureRemoved(BASE_OUT);
        await mkdir(BASE_OUT, { recursive: true });

        for (const scenarioPath of SCENARIO_PATHS) {
            const result = await runScenario({ scenarioPath, outDirBase: BASE_OUT });
            assert(existsSync(result.outDir), `output dir should exist: ${result.outDir}`);
            assert(existsSync(join(result.outDir, 'run_meta.json')), 'run_meta.json should exist');
            assert(existsSync(result.paths.initial_save), 'initial_save.json should exist');
            assert(existsSync(result.paths.final_save), 'final_save.json should exist');
            assert(existsSync(result.paths.weekly_report), 'weekly_report.jsonl should exist');
            if (result.paths.replay) {
                assert(existsSync(result.paths.replay), 'replay.jsonl should exist when replay output is enabled');
            }
            assert(existsSync(result.paths.run_summary), 'run_summary.json should exist');
            assert(existsSync(result.paths.control_delta), 'control_delta.json should exist');
            assert(existsSync(result.paths.end_report), 'end_report.md should exist');

            const scenario = await loadScenario(scenarioPath);
            const reportContent = await readFile(result.paths.weekly_report, 'utf8');
            const reportLines = countLines(reportContent);
            assert.strictEqual(reportLines, scenario.weeks, `weekly_report.jsonl line count should equal weeks (${scenario.weeks})`);

            if (result.paths.replay) {
                const replayContent = await readFile(result.paths.replay, 'utf8');
                const replayLines = countLines(replayContent);
                assert.strictEqual(replayLines, scenario.weeks, `replay.jsonl line count should equal weeks (${scenario.weeks})`);
            }
        }

        await ensureRemoved(BASE_OUT);
    }, 60_000);

    test('scenario harness smoke: noop_4w determinism (two runs => identical final_save.json)', async () => {
        const prereq = checkDataPrereqs({ baseDir: process.cwd() });
        if (!prereq.ok) {
            return;
        }

        const scenarioPath = join(process.cwd(), 'data', 'scenarios', 'noop_4w.json');
        await ensureRemoved(BASE_A);
        await ensureRemoved(BASE_B);
        await mkdir(BASE_A, { recursive: true });
        await mkdir(BASE_B, { recursive: true });

        const resultA = await runScenario({ scenarioPath, outDirBase: BASE_A });
        const resultB = await runScenario({ scenarioPath, outDirBase: BASE_B });

        assert.strictEqual(resultA.run_id, resultB.run_id, 'run_id should be deterministic');
        const bytesA = await readFile(resultA.paths.final_save, 'utf8');
        const bytesB = await readFile(resultB.paths.final_save, 'utf8');
        assert.strictEqual(bytesA, bytesB, 'final_save.json must be byte-identical across two runs');

        await ensureRemoved(BASE_A);
        await ensureRemoved(BASE_B);
    }, 60_000);
});

// ═══════════════════════════════════════════════════════════════════════════
// H1.5 — End report artifacts and control_delta ordering
// ═══════════════════════════════════════════════════════════════════════════

describe('scenario end report h1.5', () => {
    const BASE_OUT = join(process.cwd(), '.tmp_scenario_end_report_h1_5');
    const SCENARIO_PATH = join(process.cwd(), 'data', 'scenarios', 'noop_4w.json');

    it('writes the end-of-run report artifacts', async () => {
        const prereq = checkDataPrereqs({ baseDir: process.cwd() });
        if (!prereq.ok) {
            return;
        }

        await ensureRemoved(BASE_OUT);
        await mkdir(BASE_OUT, { recursive: true });

        try {
            const result = await runScenario({ scenarioPath: SCENARIO_PATH, outDirBase: BASE_OUT, consoleDiagnostics: false });

            expect(existsSync(result.paths.initial_save)).toBe(true);
            expect(existsSync(result.paths.final_save)).toBe(true);
            expect(existsSync(result.paths.control_delta)).toBe(true);
            expect(existsSync(result.paths.end_report)).toBe(true);
        } finally {
            await ensureRemoved(BASE_OUT);
        }
    }, 20_000);

    it('keeps control_delta.json stable and ordered', async () => {
        const prereq = checkDataPrereqs({ baseDir: process.cwd() });
        if (!prereq.ok) {
            return;
        }

        await ensureRemoved(BASE_OUT);
        await mkdir(BASE_OUT, { recursive: true });

        try {
            const result = await runScenario({ scenarioPath: SCENARIO_PATH, outDirBase: BASE_OUT, consoleDiagnostics: false });
            const raw = await readFile(result.paths.control_delta, 'utf8');
            const delta = JSON.parse(raw) as {
                total_flips?: number;
                flips?: unknown[];
                flips_by_direction?: Array<{ from: string | null; to: string | null; count: number }>;
                flips_by_municipality?: Array<{ municipality_id: string | null; count: number }>;
                net_control_counts_before?: unknown[];
                net_control_counts_after?: unknown[];
                net_control_count_delta?: unknown[];
            };

            expect(typeof delta.total_flips).toBe('number');
            expect(Array.isArray(delta.flips)).toBe(true);
            expect(Array.isArray(delta.flips_by_direction)).toBe(true);
            expect(Array.isArray(delta.flips_by_municipality)).toBe(true);
            expect(Array.isArray(delta.net_control_counts_before)).toBe(true);
            expect(Array.isArray(delta.net_control_counts_after)).toBe(true);
            expect(Array.isArray(delta.net_control_count_delta)).toBe(true);

            for (let i = 1; i < (delta.flips_by_municipality?.length ?? 0); i += 1) {
                const a = delta.flips_by_municipality![i - 1];
                const b = delta.flips_by_municipality![i];
                expect(b.count <= a.count).toBe(true);
                if (b.count === a.count) {
                    const aid = a.municipality_id ?? 'null';
                    const bid = b.municipality_id ?? 'null';
                    expect(aid.localeCompare(bid) <= 0).toBe(true);
                }
            }

            for (let i = 1; i < (delta.flips_by_direction?.length ?? 0); i += 1) {
                const a = delta.flips_by_direction![i - 1];
                const b = delta.flips_by_direction![i];
                const aKey = `${a.from ?? 'null'}\t${a.to ?? 'null'}`;
                const bKey = `${b.from ?? 'null'}\t${b.to ?? 'null'}`;
                expect(aKey <= bKey).toBe(true);
            }
        } finally {
            await ensureRemoved(BASE_OUT);
        }
    }, 20_000);
});

// ═══════════════════════════════════════════════════════════════════════════
// H1.5.1 — Failure reporting
// ═══════════════════════════════════════════════════════════════════════════

describe('scenario failure reporting h1.5.1', () => {
    const BASE_OUT = join(process.cwd(), '.tmp_scenario_failure_h1_5_1');
    const SCENARIO_PATH = join(process.cwd(), 'data', 'scenarios', 'noop_4w.json');

    it('writes run_meta.json and failure_report.* after an early controlled crash', async () => {
        const prereq = checkDataPrereqs({ baseDir: process.cwd() });
        if (!prereq.ok) {
            return;
        }

        await ensureRemoved(BASE_OUT);

        const controlledMessage = 'controlled failure h1_5_1';
        try {
            await runScenario({
                scenarioPath: SCENARIO_PATH,
                outDirBase: BASE_OUT,
                injectFailureAfterRunMeta: () => {
                    throw new Error(controlledMessage);
                },
                consoleDiagnostics: false,
            });
            throw new Error('runScenario should throw');
        } catch (err) {
            expect(err && (err as Error & { out_dir?: string }).out_dir).toBeTruthy();
            const e = err as Error & { out_dir: string; run_id?: string };
            const outDir = e.out_dir;

            expect(e.run_id?.includes('noop_4w')).toBe(true);

            const runMetaPath = join(outDir, 'run_meta.json');
            const failureTxtPath = join(outDir, 'failure_report.txt');
            const failureJsonPath = join(outDir, 'failure_report.json');

            expect(existsSync(runMetaPath)).toBe(true);
            expect(existsSync(failureTxtPath)).toBe(true);
            expect(existsSync(failureJsonPath)).toBe(true);

            const runMeta = JSON.parse(await readFile(runMetaPath, 'utf8')) as {
                scenario_id: string;
                run_id: string;
                weeks: number;
                scenario_path: string;
                out_dir: string;
            };
            expect(runMeta.scenario_id).toBe('noop_4w');
            expect(runMeta.weeks).toBe(4);
            expect(runMeta.run_id.length > 0).toBe(true);

            const txt = await readFile(failureTxtPath, 'utf8');
            expect(txt.includes('SCENARIO RUN FAILED')).toBe(true);
            expect(txt.includes(runMeta.run_id)).toBe(true);
            expect(txt.includes(controlledMessage)).toBe(true);
            expect(txt.includes('timestamp')).toBe(false);
            expect(/\d{4}-\d{2}-\d{2}T/.test(txt)).toBe(false);

            const failureJson = JSON.parse(await readFile(failureJsonPath, 'utf8')) as {
                run_id: string;
                scenario_id: string;
                weeks: number;
                error_name: string;
                error_message: string;
                stack: string | null;
            };
            expect(failureJson.scenario_id).toBe('noop_4w');
            expect(failureJson.error_message.includes(controlledMessage)).toBe(true);
            if (e.run_id) {
                expect(failureJson.run_id).toBe(e.run_id);
            }
        } finally {
            await ensureRemoved(BASE_OUT);
        }
    }, 20_000);
});

// ═══════════════════════════════════════════════════════════════════════════
// H1.7 — Activity diagnostics
// ═══════════════════════════════════════════════════════════════════════════

describe('H1.7 scenario activity diagnostics', () => {
    const BASE_OUT = join(process.cwd(), '.tmp_scenario_activity_h1_7');
    const SCENARIO_PATH = join(process.cwd(), 'data', 'scenarios', 'noop_4w.json');
    const PHASE_II_SCENARIO_PATH = join(process.cwd(), 'data', 'scenarios', 'apr1992_phase_ii_4w.json');

    test('scenario activity diagnostics: activity_summary.json and Activity over run in end_report', async () => {
        const prereq = checkDataPrereqs({ baseDir: process.cwd() });
        if (!prereq.ok) {
            return;
        }

        await ensureRemoved(BASE_OUT);

        const result = await runScenario({ scenarioPath: SCENARIO_PATH, outDirBase: BASE_OUT });

        const activitySummaryPath = result.paths.activity_summary;
        assert(existsSync(activitySummaryPath), 'activity_summary.json should exist');

        const endReportPath = result.paths.end_report;
        assert(existsSync(endReportPath), 'end_report.md should exist');
        const endReportContent = await readFile(endReportPath, 'utf8');
        assert(
            endReportContent.includes('## Activity over run'),
            'end_report.md should contain header "Activity over run"'
        );

        const activitySummaryRaw = await readFile(activitySummaryPath, 'utf8');
        const activitySummary = JSON.parse(activitySummaryRaw) as {
            weeks: number;
            metrics: {
                front_active_set_size: { min: number; max: number; mean: number; nonzero_weeks: number };
                pressure_eligible_size?: { min: number; max: number; mean: number; nonzero_weeks: number } | null;
                displacement_trigger_eligible_size?: {
                    min: number;
                    max: number;
                    mean: number;
                    nonzero_weeks: number;
                } | null;
            };
            notes?: string[];
        };

        assert(typeof activitySummary.weeks === 'number', 'activity_summary.weeks should be a number');
        assert(activitySummary.metrics != null, 'activity_summary.metrics should exist');
        const m = activitySummary.metrics.front_active_set_size;
        assert(m != null, 'activity_summary.metrics.front_active_set_size should exist');
        assert(typeof m.min === 'number', 'front_active_set_size.min should be a number');
        assert(typeof m.max === 'number', 'front_active_set_size.max should be a number');
        assert(typeof m.mean === 'number', 'front_active_set_size.mean should be a number');
        assert(typeof m.nonzero_weeks === 'number', 'front_active_set_size.nonzero_weeks should be a number');

        await ensureRemoved(BASE_OUT);
    });

    test('phase ii run_summary includes phase_ii_attack_resolution diagnostics block', async () => { // legacy-phase-term-ok
        const prereq = checkDataPrereqs({ baseDir: process.cwd() });
        if (!prereq.ok) {
            return;
        }

        await ensureRemoved(BASE_OUT);
        const result = await runScenario({ scenarioPath: PHASE_II_SCENARIO_PATH, outDirBase: BASE_OUT, weeksOverride: 1 });
        const runSummaryPath = result.paths.run_summary;
        assert(existsSync(runSummaryPath), 'run_summary.json should exist');

        const runSummaryRaw = await readFile(runSummaryPath, 'utf8');
        const runSummary = JSON.parse(runSummaryRaw) as {
            phase_ii_attack_resolution?: {
                weeks_at_war: number;
                weeks_with_orders: number;
                orders_processed: number;
                flips_applied: number;
                casualty_attacker: number;
                casualty_defender: number;
            };
        };

        assert(runSummary.phase_ii_attack_resolution != null, 'phase_ii_attack_resolution should exist for phase_ii scenario runs'); // legacy-phase-term-ok
        const diag = runSummary.phase_ii_attack_resolution!;
        assert(typeof diag.weeks_at_war === 'number', 'weeks_at_war should be a number');
        assert(typeof diag.weeks_with_orders === 'number', 'weeks_with_orders should be a number');
        assert(typeof diag.orders_processed === 'number', 'orders_processed should be a number');
        assert(typeof diag.flips_applied === 'number', 'flips_applied should be a number');
        assert(typeof diag.casualty_attacker === 'number', 'casualty_attacker should be a number');
        assert(typeof diag.casualty_defender === 'number', 'casualty_defender should be a number');
        assert(diag.weeks_at_war >= 1, 'weeks_at_war should be >= 1');

        await ensureRemoved(BASE_OUT);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// H1.8 — Probe compare
// ═══════════════════════════════════════════════════════════════════════════

describe('H1.8 scenario probe compare', () => {
    const BASE_OUT = join(process.cwd(), '.tmp_probe_compare_h1_8');
    const SCENARIO_PATH = join(process.cwd(), 'data', 'scenarios', 'noop_4w_probe_intent.json');

    test('scenario probe compare: probe_compare.json and probe_compare.md exist with required keys', async () => {
        const prereq = checkDataPrereqs({ baseDir: process.cwd() });
        if (!prereq.ok) {
            return;
        }

        await ensureRemoved(BASE_OUT);

        const result = await runProbeCompare({ scenarioPath: SCENARIO_PATH, outDirBase: BASE_OUT });

        assert(existsSync(result.paths.probe_compare_json), 'probe_compare.json should exist');
        assert(existsSync(result.paths.probe_compare_md), 'probe_compare.md should exist');
        assert(existsSync(result.baselineOutDir), 'baseline run dir should exist');
        assert(existsSync(result.probeOutDir), 'probe run dir should exist');

        const compareRaw = await readFile(result.paths.probe_compare_json, 'utf8');
        const compare = JSON.parse(compareRaw) as {
            scenario_id?: string;
            weeks?: number;
            run_ids?: { baseline: string; probe: string };
            deltas?: unknown;
            conclusion?: string[];
        };

        assert(typeof compare.scenario_id === 'string', 'probe_compare.json should have scenario_id');
        assert(typeof compare.weeks === 'number', 'probe_compare.json should have weeks');
        assert(compare.run_ids != null, 'probe_compare.json should have run_ids');
        assert(typeof compare.run_ids!.baseline === 'string', 'run_ids.baseline should be string');
        assert(typeof compare.run_ids!.probe === 'string', 'run_ids.probe should be string');
        assert(compare.deltas != null, 'probe_compare.json should have deltas');
        assert(Array.isArray(compare.conclusion), 'probe_compare.json should have conclusion array');

        const mdContent = await readFile(result.paths.probe_compare_md, 'utf8');
        assert(mdContent.includes('Probe compare report'), 'probe_compare.md should contain header');
        assert(mdContent.includes('Conclusion'), 'probe_compare.md should contain Conclusion section');

        await ensureRemoved(BASE_OUT);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// H1.9 — Baseline ops
// ═══════════════════════════════════════════════════════════════════════════

describe('H1.9 scenario baseline ops', () => {
    const BASE_OUT = join(process.cwd(), '.tmp_baseline_ops_h1_9');
    const SCENARIO_PATH = join(process.cwd(), 'data', 'scenarios', 'baseline_ops_4w.json');

    test('scenario baseline_ops: run succeeds and emits expected artifacts/metrics', async () => {
        const prereq = checkDataPrereqs({ baseDir: process.cwd() });
        if (!prereq.ok) {
            return;
        }

        await ensureRemoved(BASE_OUT);

        const result = await runScenario({ scenarioPath: SCENARIO_PATH, outDirBase: BASE_OUT });

        assert(existsSync(result.paths.end_report), 'end_report.md should exist');
        assert(existsSync(result.paths.activity_summary), 'activity_summary.json should exist');

        const weeklyRaw = await readFile(result.paths.weekly_report, 'utf8');
        const lines = weeklyRaw.trim().split('\n').filter(Boolean);
        assert(lines.length >= 1, 'weekly_report should have at least one line');
        const hasOps = lines.some((line) => line.includes('"ops"'));
        assert(hasOps, 'weekly_report.jsonl should contain ops (e.g. ops.level)');

        const firstRow = JSON.parse(lines[0]!) as {
            factions?: Array<{ id: string; exhaustion?: number }>;
            settlement_displacement_count?: number;
            settlement_displacement_total?: number;
        };
        const lastRow = JSON.parse(lines[lines.length - 1]!) as {
            factions?: Array<{ id: string; exhaustion?: number }>;
            settlement_displacement_count?: number;
            settlement_displacement_total?: number;
        };

        assert.ok(Array.isArray(firstRow.factions), 'first weekly row should include factions');
        assert.ok(Array.isArray(lastRow.factions), 'last weekly row should include factions');
        assert.ok(
            typeof (lastRow.settlement_displacement_total ?? 0) === 'number',
            'weekly rows should include settlement displacement metrics'
        );

        await ensureRemoved(BASE_OUT);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// H1.1 — Determinism
// ═══════════════════════════════════════════════════════════════════════════

describe('H1.1 scenario determinism', () => {
    const SCENARIO_PATH = join(process.cwd(), 'data', 'scenarios', 'noop_52w.json');
    const OUT_A = join(process.cwd(), '.tmp_scenario_test_a');
    const OUT_B = join(process.cwd(), '.tmp_scenario_test_b');

    test('scenario determinism: same scenario run twice yields identical final_save.json', async () => {
        await ensureRemoved(OUT_A);
        await ensureRemoved(OUT_B);

        const scenario = await loadScenario(SCENARIO_PATH);
        const run_id = computeRunId(scenario);

        let ranA = false;
        let ranB = false;
        try {
            await runScenario({ scenarioPath: SCENARIO_PATH, outDirBase: OUT_A });
            ranA = true;
            await runScenario({ scenarioPath: SCENARIO_PATH, outDirBase: OUT_B });
            ranB = true;
        } catch (err) {
            if (isMissingMappingError(err)) {
                return;
            }
            throw err;
        }

        if (!ranA || !ranB) return;

        const pathA = join(OUT_A, run_id, 'final_save.json');
        const pathB = join(OUT_B, run_id, 'final_save.json');

        const bytesA = await readFile(pathA, 'utf8');
        const bytesB = await readFile(pathB, 'utf8');

        assert.strictEqual(bytesA, bytesB, 'final_save.json must be byte-identical across two runs');

        const reportA = await readFile(join(OUT_A, run_id, 'weekly_report.jsonl'), 'utf8');
        const reportB = await readFile(join(OUT_B, run_id, 'weekly_report.jsonl'), 'utf8');
        assert.strictEqual(reportA, reportB, 'weekly_report.jsonl must be byte-identical across two runs');

        const formationDeltaA = await readFile(join(OUT_A, run_id, 'formation_delta.json'), 'utf8');
        const formationDeltaB = await readFile(join(OUT_B, run_id, 'formation_delta.json'), 'utf8');
        assert.strictEqual(formationDeltaA, formationDeltaB, 'formation_delta.json must be byte-identical across two runs');

        const runSummaryA = await readFile(join(OUT_A, run_id, 'run_summary.json'), 'utf8');
        const runSummaryB = await readFile(join(OUT_B, run_id, 'run_summary.json'), 'utf8');
        assert.strictEqual(runSummaryA, runSummaryB, 'run_summary.json must be byte-identical across two runs');

        await ensureRemoved(OUT_A);
        await ensureRemoved(OUT_B);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// H2.4 — Bots determinism
// ═══════════════════════════════════════════════════════════════════════════

describe('H2.4 scenario bots determinism', () => {
    const SCENARIO_PATH = join(process.cwd(), 'data', 'scenarios', 'noop_4w_bots.json');
    const OUT_A = join(process.cwd(), '.tmp_scenario_bots_h2_4_a');
    const OUT_B = join(process.cwd(), '.tmp_scenario_bots_h2_4_b');

    test('scenario bots determinism: noop_4w_bots run twice yields identical key artifacts', { timeout: 300000 }, async () => {
        await ensureRemoved(OUT_A);
        await ensureRemoved(OUT_B);

        const scenario = await loadScenario(SCENARIO_PATH);
        const run_id = computeRunId(scenario);

        let ranA = false;
        let ranB = false;
        try {
            await runScenario({ scenarioPath: SCENARIO_PATH, outDirBase: OUT_A, bot_diagnostics: true });
            ranA = true;
            await runScenario({ scenarioPath: SCENARIO_PATH, outDirBase: OUT_B, bot_diagnostics: true });
            ranB = true;
        } catch (err) {
            if (isMissingMappingError(err)) {
                return;
            }
            throw err;
        }

        if (!ranA || !ranB) return;

        const artifacts = ['final_save.json', 'weekly_report.jsonl', 'run_summary.json', 'formation_delta.json', 'activity_summary.json', 'control_delta.json', 'bot_diagnostics.json'];
        for (const name of artifacts) {
            const bytesA = await readFile(join(OUT_A, run_id, name), 'utf8');
            const bytesB = await readFile(join(OUT_B, run_id, name), 'utf8');
            assert.strictEqual(bytesA, bytesB, `${name} must be byte-identical across two runs`);
        }

        await ensureRemoved(OUT_A);
        await ensureRemoved(OUT_B);
    });

    test('scenario bots run summary includes deterministic benchmark evaluation contract', async () => {
        await ensureRemoved(OUT_A);
        const scenario = await loadScenario(SCENARIO_PATH);
        const run_id = computeRunId(scenario);

        try {
            await runScenario({ scenarioPath: SCENARIO_PATH, outDirBase: OUT_A, use_smart_bots: true });
        } catch (err) {
            if (isMissingMappingError(err)) return;
            throw err;
        }

        const summaryRaw = await readFile(join(OUT_A, run_id, 'run_summary.json'), 'utf8');
        const summary = JSON.parse(summaryRaw) as {
            bot_benchmark_evaluation?: {
                evaluated: number;
                passed: number;
                failed: number;
                not_reached: number;
                results: Array<{ faction: string; turn: number; status: string }>;
            };
        };

        const evalBlock = summary.bot_benchmark_evaluation;
        assert.ok(evalBlock, 'run_summary.json must include bot_benchmark_evaluation');
        assert.ok(Array.isArray(evalBlock.results), 'bot benchmark results must be an array');
        assert.ok(
            evalBlock.results.some((row) => Math.abs((row as any).expected_control_share - Math.round((row as any).expected_control_share)) > 0),
            'bot benchmark expected_control_share must preserve fractional values in run_summary.json'
        );
        for (let i = 1; i < evalBlock.results.length; i += 1) {
            const a = evalBlock.results[i - 1]!;
            const b = evalBlock.results[i]!;
            const orderA = `${a.turn}\t${a.faction}`;
            const orderB = `${b.turn}\t${b.faction}`;
            assert.ok(orderA <= orderB, 'bot benchmark results must be stable-sorted by turn then faction');
        }

        await ensureRemoved(OUT_A);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// apr1992 family — timeline & officer-config binding agreement
// ═══════════════════════════════════════════════════════════════════════════

describe('apr1992_definitive family — timeline & officer-config binding agreement', () => {
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

    const files = discoverFamilyFiles();

    it('discovers at least the known family members', () => {
        expect(files.length).toBeGreaterThanOrEqual(3);
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

// ═══════════════════════════════════════════════════════════════════════════
// Absorbed: scenario_end_report_army_strengths.test.ts
// ═══════════════════════════════════════════════════════════════════════════

describe('scenario end report army strengths', () => {
    function makeArmyStrengthsState(): GameState {
        return {
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: { turn: 10, seed: 'test', phase: 'war' } as any,
            factions: [
                { id: 'RBiH' },
                { id: 'RS' },
            ] as any,
            political: {} as any,
            military: {
                formations: {
                    b1: {
                        id: 'b1',
                        faction: 'RBiH',
                        name: 'B1',
                        created_turn: 1,
                        status: 'active',
                        assignment: null,
                        kind: 'brigade',
                        personnel: 1000,
                        cohesion: 60,
                        tags: [],
                        location_osid: 'op:test:s1',
                    },
                    b2: {
                        id: 'b2',
                        faction: 'RBiH',
                        name: 'B2',
                        created_turn: 1,
                        status: 'active',
                        assignment: null,
                        kind: 'brigade',
                        personnel: 1000,
                        cohesion: 60,
                        tags: [],
                        location_osid: 'op:test:s2',
                    },
                    b3: {
                        id: 'b3',
                        faction: 'RS',
                        name: 'B3',
                        created_turn: 1,
                        status: 'active',
                        assignment: null,
                        kind: 'brigade',
                        personnel: 1000,
                        cohesion: 60,
                        tags: [],
                        location_osid: 'op:test:s3',
                    },
                } as any,
                militia_pools: {},
                brigade_front_assignment: {
                    b3: 'legacy_front',
                },
                corps_front_sectors: {
                    sector_1: {
                        sector_id: 'sector_1',
                        corps_id: 'arbih_3rd_corps',
                        assigned_brigade_ids: ['b1'],
                        reserve_brigade_ids: ['b2'],
                        edge_ids: ['S1__S2'],
                        length_edges: 1,
                        posture: 'balanced',
                        objective: 'hold_line',
                        pressure_target: 0.5,
                        last_updated_turn: 10,
                    },
                },
            } as any,
            displacement: {} as any,
        } as unknown as GameState;
    }

    it('counts only live frontline-assigned brigades, excluding reserves and legacy aliases', () => {
        const summary = computeArmyStrengthsSummary(makeArmyStrengthsState());

        expect(summary.front_assignment_counts_by_faction).toEqual([
            { faction: 'RBiH', assigned_brigades: 1 },
            { faction: 'RS', assigned_brigades: 0 },
        ]);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Absorbed: scenario_must_hold_contract.test.ts
// ═══════════════════════════════════════════════════════════════════════════

describe('apr1992 must-hold contract', () => {
    test('apr1992 definitive must-hold references live corps ids and real operational osids', { timeout: 30000 }, async () => {
        const prereq = checkDataPrereqs({ baseDir: process.cwd() });
        if (!prereq.ok) return;

        const scenarioPath = path.resolve(process.cwd(), 'data/scenarios/apr1992_definitive_40w.json');
        const scenario = await loadScenario(scenarioPath);
        const startup = await buildScenarioStartupState(scenario, process.cwd());
        const operationalData = await loadOperationalData(process.cwd());
        const liveCorpsIds = new Set(Object.keys(startup.state.military.corps_command ?? {}));
        const realOsids = new Set(operationalData.operationalToCanonical.keys());

        for (const [corpsId, osids] of Object.entries(scenario.must_hold_osids_by_corps ?? {})) {
            expect(liveCorpsIds.has(corpsId), `must_hold references unknown corps "${corpsId}"`).toBe(true);
            for (const osid of osids) {
                expect(realOsids.has(osid), `must_hold references unknown OSID "${osid}"`).toBe(true);
            }
        }
    });
});
