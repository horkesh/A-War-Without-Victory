import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TMP_ROOT = join(process.cwd(), '.tmp_operation_launch_order_consistency');

function writeWeeklyReport(runDir: string, rows: unknown[]): void {
    mkdirSync(runDir, { recursive: true });
    writeFileSync(
        join(runDir, 'weekly_report.jsonl'),
        `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`,
        'utf8',
    );
}

function operation(decision: string) {
    return {
        corps_id: 'arbih_3rd_corps',
        operation_name: 'Operation Harness',
        operation_phase: 'execution',
        axis_decision_diagnostics: [{
            axis_id: 'axis_1',
            launch_readiness_detail: {
                executable: true,
                result_state: 'executable',
                objective: 'op:test:opening',
                threshold: 'repulsed',
                brigades: [{
                    id: 'arbih_706th',
                    considered: true,
                    found_in_predictor: true,
                    power_ratio: 1.1,
                    predicted_outcome: 'stalemate',
                }],
            },
            order_generation_details: [{
                brigade_id: 'arbih_706th',
                decision,
                turn: 90,
                phase: 'execution',
                objective: 'op:test:opening',
                issued_target_osid: 'op:test:opening',
                power_ratio: decision === 'direct_attack' ? 1.1 : 0.5,
                predicted_outcome: decision === 'direct_attack' ? 'stalemate' : 'repulsed',
            }],
        }],
    };
}

function operationWithUnrelatedMovement() {
    const row = operation('direct_attack_below_threshold');
    row.axis_decision_diagnostics[0].order_generation_details.push({
        brigade_id: 'arbih_unrelated',
        decision: 'march_to_approach',
        turn: 90,
        phase: 'execution',
        objective: 'op:test:opening',
        issued_target_osid: 'op:test:approach',
        power_ratio: 0.5,
        predicted_outcome: 'repulsed',
    });
    return row;
}

describe('operation launch/order consistency diagnostic', () => {
    afterEach(() => rmSync(TMP_ROOT, { recursive: true, force: true }));

    it('accepts an executable launch that issues an attack', () => {
        const runDir = join(TMP_ROOT, 'consistent');
        writeWeeklyReport(runDir, [{ week_index: 90, operation_diagnostics: [operation('direct_attack')] }]);

        const output = execFileSync(
            process.execPath,
            ['tools/diagnostics/operation_launch_order_consistency.cjs', runDir, '--json'],
            { cwd: process.cwd(), encoding: 'utf8' },
        );
        const report = JSON.parse(output);
        expect(report.first_execution_axes_checked).toBe(1);
        expect(report.mismatches).toEqual([]);
    });

    it('detects the demonstrated executable-launch/immediate-refusal defect', () => {
        const runDir = join(TMP_ROOT, 'contradiction');
        writeWeeklyReport(runDir, [{
            week_index: 90,
            operation_diagnostics: [operation('direct_attack_below_threshold')],
        }]);

        let stdout = '';
        try {
            stdout = execFileSync(
                process.execPath,
                ['tools/diagnostics/operation_launch_order_consistency.cjs', runDir, '--json'],
                { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
            );
        } catch (error) {
            stdout = String((error as { stdout?: string | Buffer }).stdout ?? '');
        }
        const report = JSON.parse(stdout);
        expect(report.mismatches).toEqual([expect.objectContaining({
            week: 90,
            operation_name: 'Operation Harness',
            axis_id: 'axis_1',
            reason: 'executable_launch_immediate_refusal',
        })]);
    });

    it('does not let an unrelated brigade movement mask the launched brigade refusal', () => {
        const runDir = join(TMP_ROOT, 'unrelated_movement');
        writeWeeklyReport(runDir, [{
            week_index: 90,
            operation_diagnostics: [operationWithUnrelatedMovement()],
        }]);

        let stdout = '';
        try {
            stdout = execFileSync(
                process.execPath,
                ['tools/diagnostics/operation_launch_order_consistency.cjs', runDir, '--json'],
                { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
            );
        } catch (error) {
            stdout = String((error as { stdout?: string | Buffer }).stdout ?? '');
        }
        const report = JSON.parse(stdout);
        expect(report.mismatches).toEqual([expect.objectContaining({
            reason: 'executable_launch_immediate_refusal',
            launch_brigades: ['arbih_706th'],
        })]);
    });

    it('does not accept stale planning-phase movement as execution evidence', () => {
        const runDir = join(TMP_ROOT, 'stale_planning_movement');
        const stale = operation('march_to_approach');
        stale.axis_decision_diagnostics[0].order_generation_details[0].turn = 89;
        stale.axis_decision_diagnostics[0].order_generation_details[0].phase = 'planning';
        writeWeeklyReport(runDir, [{ week_index: 90, operation_diagnostics: [stale] }]);

        let stdout = '';
        try {
            stdout = execFileSync(
                process.execPath,
                ['tools/diagnostics/operation_launch_order_consistency.cjs', runDir, '--json'],
                { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
            );
        } catch (error) {
            stdout = String((error as { stdout?: string | Buffer }).stdout ?? '');
        }
        expect(JSON.parse(stdout).mismatches).toEqual([expect.objectContaining({
            reason: 'executable_launch_missing_order_evidence',
        })]);
    });

    it('rejects a direct attack issued against a target other than its recorded objective', () => {
        const runDir = join(TMP_ROOT, 'wrong_opening_target');
        const wrongTarget = operation('direct_attack');
        wrongTarget.axis_decision_diagnostics[0].order_generation_details[0].issued_target_osid = 'op:test:sibling';
        writeWeeklyReport(runDir, [{ week_index: 90, operation_diagnostics: [wrongTarget] }]);

        let stdout = '';
        try {
            stdout = execFileSync(
                process.execPath,
                ['tools/diagnostics/operation_launch_order_consistency.cjs', runDir, '--json'],
                { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
            );
        } catch (error) {
            stdout = String((error as { stdout?: string | Buffer }).stdout ?? '');
        }
        expect(JSON.parse(stdout).mismatches).toEqual([expect.objectContaining({
            reason: 'executable_launch_immediate_refusal',
            refused_launch_brigades: ['arbih_706th'],
        })]);
    });

    it('rejects self-consistent downstream fields that drift from the launch objective', () => {
        const runDir = join(TMP_ROOT, 'downstream_objective_drift');
        const drifted = operation('direct_attack');
        drifted.axis_decision_diagnostics[0].order_generation_details[0].objective = 'op:test:sibling';
        drifted.axis_decision_diagnostics[0].order_generation_details[0].issued_target_osid = 'op:test:sibling';
        writeWeeklyReport(runDir, [{ week_index: 90, operation_diagnostics: [drifted] }]);

        let stdout = '';
        try {
            stdout = execFileSync(
                process.execPath,
                ['tools/diagnostics/operation_launch_order_consistency.cjs', runDir, '--json'],
                { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
            );
        } catch (error) {
            stdout = String((error as { stdout?: string | Buffer }).stdout ?? '');
        }
        expect(JSON.parse(stdout).mismatches).toEqual([expect.objectContaining({
            reason: 'executable_launch_immediate_refusal',
            order_decisions: [expect.objectContaining({
                launch_objective: 'op:test:opening',
                objective: 'op:test:sibling',
                issued_target_osid: 'op:test:sibling',
            })],
        })]);
    });

    it.each(['march_to_approach', 'in_transit_skipped', 'attack_intermediate'])(
        'rejects %s evidence whose downstream objective drifts from launch',
        (decision) => {
            const runDir = join(TMP_ROOT, `drifted_${decision}`);
            const drifted = operation(decision);
            drifted.axis_decision_diagnostics[0].order_generation_details[0].objective = 'op:test:sibling';
            drifted.axis_decision_diagnostics[0].order_generation_details[0].issued_target_osid = 'op:test:approach';
            writeWeeklyReport(runDir, [{ week_index: 90, operation_diagnostics: [drifted] }]);

            let stdout = '';
            try {
                stdout = execFileSync(
                    process.execPath,
                    ['tools/diagnostics/operation_launch_order_consistency.cjs', runDir, '--json'],
                    { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
                );
            } catch (error) {
                stdout = String((error as { stdout?: string | Buffer }).stdout ?? '');
            }
            expect(JSON.parse(stdout).mismatches).toEqual([expect.objectContaining({
                reason: 'executable_launch_immediate_refusal',
                refused_launch_brigades: ['arbih_706th'],
            })]);
        },
    );

    it('accepts a strong launch candidate when a weaker sibling correctly refuses', () => {
        const runDir = join(TMP_ROOT, 'weak_and_strong_candidates');
        const mixed = operation('direct_attack');
        mixed.axis_decision_diagnostics[0].launch_readiness_detail.brigades.unshift({
            id: 'arbih_weak',
            considered: true,
            found_in_predictor: true,
            power_ratio: 0.5,
            predicted_outcome: 'repulsed',
        });
        mixed.axis_decision_diagnostics[0].launch_readiness_detail.threshold = 'costly_victory';
        mixed.axis_decision_diagnostics[0].launch_readiness_detail.brigades[1].predicted_outcome = 'costly_victory';
        mixed.axis_decision_diagnostics[0].order_generation_details.unshift({
            brigade_id: 'arbih_weak',
            decision: 'direct_attack_below_threshold',
            turn: 90,
            phase: 'execution',
            objective: 'op:test:opening',
            issued_target_osid: '',
            power_ratio: 0.5,
            predicted_outcome: 'repulsed',
        });
        writeWeeklyReport(runDir, [{ week_index: 90, operation_diagnostics: [mixed] }]);

        const stdout = execFileSync(
            process.execPath,
            ['tools/diagnostics/operation_launch_order_consistency.cjs', runDir, '--json'],
            { cwd: process.cwd(), encoding: 'utf8' },
        );
        expect(JSON.parse(stdout).mismatches).toEqual([]);
    });

    it('proves its positive control while keeping production results separate', () => {
        const runDir = join(TMP_ROOT, 'positive_control');
        writeWeeklyReport(runDir, [{ week_index: 90, operation_diagnostics: [operation('direct_attack')] }]);

        const output = execFileSync(
            process.execPath,
            [
                'tools/diagnostics/operation_launch_order_consistency.cjs',
                runDir,
                '--json',
                '--inject-positive-control',
            ],
            { cwd: process.cwd(), encoding: 'utf8' },
        );
        const report = JSON.parse(output);
        expect(report.positive_control_detected).toBe(true);
        expect(report.mismatches).toEqual([]);
    });
});
