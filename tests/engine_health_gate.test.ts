import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('engine health gate stranded-formation domain', () => {
    it('excludes live operation participants but retains a genuinely stranded formation', () => {
        const runDir = mkdtempSync(join(tmpdir(), 'engine-health-'));
        try {
            writeFileSync(join(runDir, 'run_summary.json'), JSON.stringify({
                weeks: 188,
                combat_causality: {},
                destroyed_brigades: [],
                historical_fit: {
                    osid_pair_match: { matched_osids: 655 },
                    checkpoints: [],
                },
            }));
            writeFileSync(join(runDir, 'final_save.json'), JSON.stringify({
                meta: { turn: 188 },
                military: {
                    formations: {
                        flat_participant: { id: 'flat_participant', status: 'active', stranded_status: 'holding' },
                        axis_participant: { id: 'axis_participant', status: 'active', stranded_status: 'reconnected' },
                        genuinely_stranded: { id: 'genuinely_stranded', status: 'active', stranded_status: 'holding' },
                    },
                    corps_command: {
                        test_corps: {
                            active_operations: [{
                                participating_brigades: ['flat_participant'],
                                axes: [{ assigned_brigades: ['axis_participant'] }],
                            }],
                        },
                    },
                },
            }));

            const result = spawnSync(process.execPath, [
                resolve('tools/engine_health_gate.cjs'),
                runDir,
                '--horizon',
                '188w',
                '--json',
            ], { cwd: process.cwd(), encoding: 'utf8' });
            const jsonLine = result.stdout
                .split(/\r?\n/)
                .find((line) => line.startsWith('{"horizon"'));

            expect(jsonLine, result.stderr).toBeDefined();
            expect(JSON.parse(jsonLine!).measured.stranded_brigades).toBe(1);
        } finally {
            rmSync(runDir, { recursive: true, force: true });
        }
    });

    it('engine-integrity-only keeps exactly five engine checks and labels calibration observations', () => {
        const runDir = mkdtempSync(join(tmpdir(), 'engine-health-integrity-'));
        try {
            writeFileSync(join(runDir, 'run_summary.json'), JSON.stringify({
                weeks: 188,
                combat_causality: { killed: 12, wounded: 34 },
                destroyed_brigades: [],
                historical_fit: {
                    osid_pair_match: { matched_osids: 1 },
                    checkpoints: [{ reference_key: 'jan1993', osid_pair_match: { matched_osids: 1 } }],
                },
            }));
            writeFileSync(join(runDir, 'final_save.json'), JSON.stringify({
                meta: { turn: 188 },
                military: {
                    formations: {},
                    corps_command: {},
                    casualty_ledger: { rbih: { killed: 12, wounded: 34 } },
                },
            }));

            const result = spawnSync(process.execPath, [
                resolve('tools/engine_health_gate.cjs'),
                runDir,
                '--horizon',
                '188w',
                '--engine-integrity-only',
                '--json',
            ], { cwd: process.cwd(), encoding: 'utf8' });
            const jsonLine = result.stdout.split(/\r?\n/).find((line) => line.startsWith('{"mode"'));
            expect(result.status, result.stderr).toBe(0);
            expect(jsonLine, result.stderr).toBeDefined();
            const report = JSON.parse(jsonLine!);
            expect(report.mode).toBe('engine-integrity-only');
            expect(report.checks.map((check: { name: string }) => check.name)).toEqual([
                'zero_eligible_ops',
                'invalid_op_weeks',
                'ghost_destroyed',
                'stranded_brigades',
                'consistency_failures',
            ]);
            expect(report.checks.every((check: { hard: boolean }) => check.hard)).toBe(true);
            expect(report.calibration_observations).toEqual({
                matched_osids: 1,
                checkpoint_matched: { jan1993: 1 },
                kw_ratio: 2.833,
                total_killed: 12,
                total_wounded: 34,
            });

            const legacy = spawnSync(process.execPath, [
                resolve('tools/engine_health_gate.cjs'),
                runDir,
                '--horizon',
                '188w',
                '--json',
            ], { cwd: process.cwd(), encoding: 'utf8' });
            expect(legacy.status).toBe(1);
            const legacyLine = legacy.stdout.split(/\r?\n/).find((line) => line.startsWith('{"horizon"'));
            expect(legacyLine, legacy.stderr).toBeDefined();
            expect(JSON.parse(legacyLine!).checks).toEqual(expect.arrayContaining([
                expect.objectContaining({ name: 'matched_osids', hard: true, ok: false }),
            ]));
        } finally {
            rmSync(runDir, { recursive: true, force: true });
        }
    });

    it.each(['--update', '--force', '--strict'])('rejects %s with engine-integrity-only', (incompatible) => {
        const result = spawnSync(process.execPath, [
            resolve('tools/engine_health_gate.cjs'),
            'does-not-need-to-exist',
            '--engine-integrity-only',
            incompatible,
        ], { cwd: process.cwd(), encoding: 'utf8' });
        expect(result.status).toBe(2);
        expect(result.stderr).toContain(`${incompatible} is incompatible with --engine-integrity-only`);
    });
});

describe('engine health gate idle-execution ceiling (P3 mismatch rider)', () => {
    const BASE_BAND = {
        zero_eligible_ops_max: 3,
        dead_ops_max: 3,
        ghost_destroyed_max: 3,
        stranded_brigades_max: 3,
        consistency_failures_max: 99,
        matched_osids_min: 0,
        checkpoint_matched_min: {},
        kw_ratio_lo: 0,
        kw_ratio_hi: 99,
    };

    function runGate(idleWeeks: number, band: Record<string, unknown>) {
        const runDir = mkdtempSync(join(tmpdir(), 'engine-health-idle-'));
        try {
            writeFileSync(join(runDir, 'run_summary.json'), JSON.stringify({
                weeks: 188,
                combat_causality: {
                    idle_execution_op_weeks: idleWeeks,
                    idle_execution_stationary_op_weeks: idleWeeks,
                    idle_execution_masked_op_weeks: 0,
                    paused_op_weeks: 7,
                    planning_grace_op_weeks: 4,
                    launch_demotions: 2,
                    launch_demotion_terminations: 1,
                },
                destroyed_brigades: [],
                historical_fit: { osid_pair_match: { matched_osids: 1 }, checkpoints: [] },
            }));
            writeFileSync(join(runDir, 'final_save.json'), JSON.stringify({
                meta: { turn: 188 },
                military: { formations: {}, corps_command: {} },
            }));
            const thresholdsPath = join(runDir, 'thresholds.json');
            writeFileSync(thresholdsPath, JSON.stringify({ '188w': band }));
            const result = spawnSync(process.execPath, [
                resolve('tools/engine_health_gate.cjs'),
                runDir,
                '--horizon',
                '188w',
                '--thresholds',
                thresholdsPath,
                '--json',
            ], { cwd: process.cwd(), encoding: 'utf8' });
            const jsonLine = result.stdout.split(/\r?\n/).find((line) => line.startsWith('{"horizon"'));
            expect(jsonLine, result.stderr).toBeDefined();
            return { status: result.status, report: JSON.parse(jsonLine!) };
        } finally {
            rmSync(runDir, { recursive: true, force: true });
        }
    }

    it('enforces idle_execution_ops_max as a hard ceiling when the band carries it', () => {
        const over = runGate(5, { ...BASE_BAND, idle_execution_ops_max: 4 });
        expect(over.report.measured.idle_execution_op_weeks).toBe(5);
        expect(over.report.checks).toEqual(expect.arrayContaining([
            expect.objectContaining({ name: 'idle_execution_ops', hard: true, ok: false }),
        ]));
        expect(over.status).toBe(1);

        const under = runGate(4, { ...BASE_BAND, idle_execution_ops_max: 4 });
        expect(under.report.checks).toEqual(expect.arrayContaining([
            expect.objectContaining({ name: 'idle_execution_ops', hard: true, ok: true }),
        ]));
        expect(under.status).toBe(0);
    });

    it('ignores the idle-execution measure when the band does not carry the ceiling', () => {
        const absent = runGate(500, BASE_BAND);
        expect(absent.report.checks.map((check: { name: string }) => check.name)).not.toContain('idle_execution_ops');
        expect(absent.status).toBe(0);
    });

    it('reports paused, planning-grace and launch-demotion weeks as advisory measures only', () => {
        const run = runGate(0, BASE_BAND);
        expect(run.report.measured.paused_op_weeks).toBe(7);
        expect(run.report.measured.planning_grace_op_weeks).toBe(4);
        expect(run.report.measured.launch_demotions).toBe(2);
        expect(run.report.measured.launch_demotion_terminations).toBe(1);
        const names = run.report.checks.map((check: { name: string }) => check.name);
        expect(names).not.toContain('paused_op_weeks');
        expect(names).not.toContain('planning_grace_op_weeks');
        expect(names).not.toContain('launch_demotions');
    });
});
