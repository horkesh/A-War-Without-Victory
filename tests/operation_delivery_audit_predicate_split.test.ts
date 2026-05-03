/**
 * LANE-NIGHTSHIFT-N6 — Operation delivery audit predicate split contract test.
 *
 * Asserts that `tools/diagnostics/operation_delivery_audit.cjs` splits the
 * historical `no_contact_other` bucket into three sub-predicates by
 * op-level `recovery_reason`:
 *   - `no_launch_readiness`  ← recovery_reason === 'planning_invalidated'
 *   - `no_opening_attack`    ← recovery_reason in {max_failures, no_logged_attempt}
 *   - `no_staging_march`     ← recovery_reason in {brigade_attrition, orphaned_sector}
 *   - `no_contact_other`     ← fallback for unknown / undocumented recovery_reason
 *
 * Mirrors the test pattern shipped at
 * `tests/krivaja_brigade_lifecycle_diagnostic.test.ts` — spawnSync against
 * a pinned run dir; structural assertions on stdout markdown.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

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

describe('LANE-NIGHTSHIFT-N6 operation delivery audit predicate split', () => {
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
