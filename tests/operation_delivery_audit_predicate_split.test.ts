/**
 * LANE-NIGHTSHIFT-N6 — Operation delivery audit predicate split contract test.
 *
 * Asserts that `tools/diagnostics/operation_delivery_audit.cjs` splits the
 * historical `no_contact_other` bucket into three sub-predicates by
 * op-level `recovery_reason`:
 *   - `no_launch_readiness`  ← recovery_reason in {planning_invalidated, no_launch_readiness}
 *   - `defender_power_too_high` ← recovery_reason === 'defender_power_too_high'
 *   - `no_opening_attack`    ← recovery_reason in {max_failures, no_logged_attempt}
 *   - `no_staging_march`     ← recovery_reason in {brigade_attrition, orphaned_sector}
 *   - `no_contact_other`     ← fallback for unknown / undocumented recovery_reason
 *
 * Mirrors the test pattern shipped at
 * `tests/krivaja_brigade_lifecycle_diagnostic.test.ts` — spawnSync against
 * a pinned run dir; structural assertions on stdout markdown.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, it, expect } from 'vitest';

const RUN_DIR = 'runs/apr1992_definitive_188w__210e69404d054959__w188_n1621';
const DIAGNOSTIC = 'tools/diagnostics/operation_delivery_audit.cjs';

function runDiagnostic(args: string[]): { stdout: string; status: number | null } {
    const r = spawnSync(process.execPath, [DIAGNOSTIC, ...args], {
        encoding: 'utf8',
        cwd: path.resolve(path.join(__dirname, '..')),
        maxBuffer: 64 * 1024 * 1024,
    });
    return { stdout: r.stdout, status: r.status };
}

const HAS_RUN_DIR = existsSync(path.resolve(path.join(__dirname, '..', RUN_DIR)));
const TMP_ROOT = path.resolve(path.join(__dirname, '..', '.tmp_operation_delivery_audit'));

function writeJson(filePath: string, value: unknown): void {
    writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

describe('LANE-NIGHTSHIFT-N6 operation delivery audit predicate split', () => {
    afterEach(() => {
        rmSync(TMP_ROOT, { recursive: true, force: true });
    });

    it('exposes recovery blocker on op-level rows', () => {
        const runDir = path.join(TMP_ROOT, 'run_a');
        mkdirSync(runDir, { recursive: true });
        writeJson(path.join(runDir, 'final_save.json'), {
            meta: { turn: 20 },
            political: {
                political_controllers: {
                    'op:test:front': 'RS',
                    'op:test:objective': 'RBiH',
                },
            },
            military: {},
            operation_history: [
                {
                    operation_id: 'op_a',
                    operation_name: 'Operation Test',
                    corps_id: 'rs_corps',
                    faction: 'RS',
                    type: 'sector_attack',
                    started_turn: 10,
                    ended_turn: 12,
                    outcome: 'failure',
                    recovery_reason: 'defender_power_too_high',
                    total_attacks: 0,
                    objectives_targeted: ['op:test:objective'],
                    objectives_captured: [],
                },
            ],
        });

        const { stdout, status } = runDiagnostic([runDir]);
        expect(status).toBe(0);
        expect(stdout).toContain('| Started | Op | Corps | Faction | Outcome | Attacks | Captured | Provenance | Recovery | Blocker | Predicate | Opp | Resp | Exit |');
        expect(stdout).toContain('| 10 | Operation Test | rs_corps | RS | failure | 0 | 0/1 | n/a | defender_power_too_high | defender_power_too_high |');
    });

    it.skipIf(!HAS_RUN_DIR)(
        'emits the new sub-predicate labels in the failure-mode summary',
        () => {
            const { stdout, status } = runDiagnostic([RUN_DIR]);
            expect(status).toBe(0);
            const summaryMatch = /### Failure-Mode Summary \(per axis\)([\s\S]*?)(?=\n## |\n### |$)/.exec(stdout);
            expect(summaryMatch).not.toBeNull();
            const summary = summaryMatch![1];
            expect(summary).toContain('NO-LAUNCH-READINESS');
            expect(summary).toContain('NO-CONTACT-PATH');
        },
    );

    it.skipIf(!HAS_RUN_DIR)(
        'classifies the 6 vrs_1st_krajina sequential ops at boljanic_2 as NO-LAUNCH-READINESS',
        () => {
            const { stdout } = runDiagnostic([RUN_DIR]);
            const opsToCheck = ['Jesen', 'Hrast', 'Gvožđe', 'Obruč', 'Štit', 'Sadejstvo'];
            for (const opName of opsToCheck) {
                const axisRowPattern = new RegExp(
                    `Operacija ${opName}[^\\n]*NO-LAUNCH-READINESS`,
                );
                expect(axisRowPattern.test(stdout)).toBe(true);
            }
        },
    );

    it.skipIf(!HAS_RUN_DIR)(
        'preserves the existing predicate vocabulary as a regression guard',
        () => {
            const { stdout } = runDiagnostic([RUN_DIR]);
            expect(stdout).toContain('DELIV');
            expect(stdout).toContain('UNDERDELIV');
            expect(stdout).toContain('PRE-FRIENDLY');
            expect(stdout).toContain('NO-CONTACT-PATH');
        },
    );

    it.skipIf(!HAS_RUN_DIR)(
        'is byte-stable across two invocations on the same artifacts',
        () => {
            const a = runDiagnostic([RUN_DIR]).stdout;
            const b = runDiagnostic([RUN_DIR]).stdout;
            expect(a).toBe(b);
        },
    );
});
