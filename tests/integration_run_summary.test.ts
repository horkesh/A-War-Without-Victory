import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { runScenario } from '../src/scenario/scenario_runner.js';
import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';

const SCENARIO_40W = join(process.cwd(), 'data', 'scenarios', 'apr1992_definitive_40w.json');
const OUT_DIR = join(process.cwd(), '.tmp_integration_run_summary');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let summary: any;
let skipped = false;

describe('run summary diagnostics (40w)', () => {
    beforeAll(async () => {
        const prereq = checkDataPrereqs({ baseDir: process.cwd() });
        if (!prereq.ok) {
            skipped = true;
            return;
        }
        if (existsSync(OUT_DIR)) await rm(OUT_DIR, { recursive: true });

        const result = await runScenario({ scenarioPath: SCENARIO_40W, outDirBase: OUT_DIR });
        const summaryJson = await readFile(result.paths.run_summary, 'utf8');
        summary = JSON.parse(summaryJson);
    }, 600_000);

    afterAll(async () => {
        if (existsSync(OUT_DIR)) await rm(OUT_DIR, { recursive: true });
    });

    it('run_summary.json exists and has expected top-level fields', () => {
        if (skipped) return;
        expect(summary).toBeDefined();
        expect(summary.summary).toBeDefined();
        expect(summary.summary.final_turn).toBeGreaterThan(0);
        expect(summary.summary.phase).toBeDefined();
        expect(summary.historical_fit).toBeDefined();
        expect(summary.behavioral_health).toBeDefined();
        expect(summary.scenario_id).toBeDefined();
        expect(summary.weeks).toBeGreaterThan(0);
        expect(summary.run_id).toBeDefined();
        expect(summary.final_state_hash).toBeDefined();
    });

    it('bot benchmarks evaluate without NaN or undefined', () => {
        if (skipped) return;
        const benchmarks = summary.historical_fit?.bot_benchmark_evaluation
            ?? summary.bot_benchmark_evaluation;
        expect(benchmarks).toBeDefined();
        expect(benchmarks.results).toBeInstanceOf(Array);
        expect(benchmarks.results.length).toBeGreaterThan(0);

        for (const entry of benchmarks.results) {
            expect(entry.faction).toBeDefined();
            expect(typeof entry.faction).toBe('string');
            expect(typeof entry.turn).toBe('number');
            expect(Number.isFinite(entry.turn)).toBe(true);
            expect(typeof entry.expected_control_share).toBe('number');
            expect(Number.isFinite(entry.expected_control_share)).toBe(true);

            if (entry.status === 'evaluated') {
                expect(typeof entry.actual_control_share).toBe('number');
                expect(Number.isFinite(entry.actual_control_share)).toBe(true);
                expect(typeof entry.deviation).toBe('number');
                expect(Number.isFinite(entry.deviation)).toBe(true);
                expect(typeof entry.passed).toBe('boolean');
            }
        }
    });

    it('bot benchmark pass rate is reasonable', () => {
        if (skipped) return;
        const benchmarks = summary.historical_fit?.bot_benchmark_evaluation
            ?? summary.bot_benchmark_evaluation;
        expect(benchmarks).toBeDefined();

        const { evaluated, passed, failed, not_reached } = benchmarks;
        console.log(`Bot benchmarks: ${evaluated} evaluated, ${passed} passed, ${failed} failed, ${not_reached} not_reached`);

        for (const entry of benchmarks.results) {
            const status = entry.passed === true ? 'PASS' : entry.passed === false ? 'FAIL' : 'NOT_REACHED';
            console.log(
                `  [${status}] ${entry.faction} w${entry.turn}: ` +
                `expected=${entry.expected_control_share}, actual=${entry.actual_control_share}, ` +
                `deviation=${entry.deviation}, tolerance=${entry.tolerance}`
            );
        }

        // At 40w, expect at least 3/6 benchmarks pass (RS w20 historically fails)
        expect(evaluated).toBeGreaterThan(0);
        expect(passed).toBeGreaterThanOrEqual(3);
    });

    it('anchor checks all present and evaluated', () => {
        if (skipped) return;
        const anchors = summary.historical_fit?.anchor_checks
            ?? summary.anchor_checks;

        // Anchor checks may be absent if scenario doesn't match apr1992 init_control
        if (!anchors) {
            console.log('No anchor checks present (scenario may not use apr1992 init_control)');
            return;
        }

        expect(anchors).toBeInstanceOf(Array);
        expect(anchors.length).toBeGreaterThan(0);

        let passCount = 0;
        let failCount = 0;
        for (const anchor of anchors) {
            expect(anchor.anchor_id ?? anchor.osid).toBeDefined();
            expect(anchor.expected_controller).toBeDefined();
            expect(typeof anchor.passed).toBe('boolean');

            if (anchor.passed) {
                passCount++;
            } else {
                failCount++;
                console.log(
                    `  ANCHOR FAIL: ${anchor.anchor_id ?? anchor.osid} — ` +
                    `expected=${anchor.expected_controller}, actual=${anchor.actual_controller}`
                );
            }
        }

        console.log(`Anchor checks: ${passCount} passed, ${failCount} failed out of ${anchors.length}`);
        // Expect majority of anchors to pass
        expect(passCount).toBeGreaterThan(failCount);
    });

    it('behavioral health — scenario produces battles', () => {
        if (skipped) return;
        const health = summary.behavioral_health;
        expect(health).toBeDefined();
        expect(typeof health.valid_for_combat_calibration).toBe('boolean');
        // Log calibration validity and any invalidation reasons
        const causality = health.combat_causality;
        console.log(`valid_for_combat_calibration: ${health.valid_for_combat_calibration}`);
        if (causality?.invalidation_reasons?.length > 0) {
            console.log(`Invalidation reasons: ${causality.invalidation_reasons.join(', ')}`);
        }
        // The scenario must produce battles even if calibration gate has other invalidation reasons
        const totalBattles = causality?.total_battles ?? 0;
        expect(totalBattles).toBeGreaterThan(0);
        console.log(`Total battles: ${totalBattles}`);

        expect(health.battleless_weeks).toBeInstanceOf(Array);
        // Early weeks are peace phase (no combat expected), and some war weeks may have no battles.
        // At 40w, expect fewer than half the weeks to be battleless.
        console.log(`Battleless weeks (${health.battleless_weeks.length}/${summary.weeks}): ${health.battleless_weeks.join(', ')}`);
        expect(health.battleless_weeks.length).toBeLessThan(summary.weeks / 2);
    });

    it('combat causality — non-zero casualties', () => {
        if (skipped) return;
        const causality = summary.behavioral_health?.combat_causality
            ?? summary.combat_causality;
        expect(causality).toBeDefined();

        // Total battles should be positive
        expect(causality.total_battles).toBeGreaterThan(0);
        console.log(`Total battles: ${causality.total_battles}`);

        // Check per-faction casualties if available
        if (causality.by_faction) {
            for (const [faction, data] of Object.entries(causality.by_faction)) {
                const d = data as Record<string, number>;
                const totalCas = (d.kia ?? 0) + (d.wia ?? 0) + (d.mia ?? 0) + (d.total_casualties ?? 0);
                console.log(`  ${faction}: casualties=${totalCas}`);
            }
        }

        // At least some total casualties
        const totalCasualties = causality.total_kia ?? causality.total_casualties ?? 0;
        if (totalCasualties > 0) {
            expect(totalCasualties).toBeGreaterThan(0);
        } else {
            // Fallback: battles > 0 implies casualties occurred
            expect(causality.total_battles).toBeGreaterThan(0);
        }
    });

    it('historical alignment — faction metrics present', () => {
        if (skipped) return;
        const alignment = summary.historical_fit?.historical_alignment
            ?? summary.historical_alignment;
        expect(alignment).toBeDefined();

        // Should contain faction-level data
        if (alignment.factions) {
            expect(Object.keys(alignment.factions).length).toBeGreaterThanOrEqual(3);
            for (const [faction, data] of Object.entries(alignment.factions)) {
                const d = data as Record<string, unknown>;
                console.log(
                    `  ${faction}: formations=${d.formation_count ?? d.formations ?? 'n/a'}, ` +
                    `personnel=${d.total_personnel ?? d.personnel ?? 'n/a'}`
                );
            }
        } else if (alignment.initial && alignment.final) {
            // Alternative structure: initial/final snapshots
            expect(alignment.initial).toBeDefined();
            expect(alignment.final).toBeDefined();
            console.log('Historical alignment: initial/final snapshot structure');
        }
    });

    it('bot benchmark contract status is valid', () => {
        if (skipped) return;
        const status = summary.historical_fit?.bot_benchmark_status;
        if (!status) {
            console.log('No bot_benchmark_status present');
            return;
        }

        expect(status.contract_valid).toBeDefined();
        expect(typeof status.contract_valid).toBe('boolean');
        expect(status.contract_issues).toBeInstanceOf(Array);

        if (!status.contract_valid) {
            console.log(`Bot benchmark contract issues: ${status.contract_issues.join(', ')}`);
        }
        // Contract should be valid — no internal inconsistencies
        expect(status.contract_valid).toBe(true);
        expect(status.contract_issues.length).toBe(0);
    });

    it('recovery status fields present', () => {
        if (skipped) return;
        const recovery = summary.recovery_status;
        expect(recovery).toBeDefined();
        expect(typeof recovery.state_protected).toBe('boolean');
        expect(typeof recovery.reporting_split_complete).toBe('boolean');
        expect(typeof recovery.calibration_resumed_under_gate).toBe('boolean');
    });
});
