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
                power_ratio: decision === 'direct_attack' ? 1.1 : 0.5,
                predicted_outcome: decision === 'direct_attack' ? 'stalemate' : 'repulsed',
            }],
        }],
    };
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
            execFileSync(
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
