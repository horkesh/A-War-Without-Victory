import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TMP_ROOT = join(process.cwd(), '.tmp_opportunity_health_diagnostic');

function writeJson(path: string, value: unknown): void {
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

describe('opportunity health diagnostic script', () => {
    afterEach(() => {
        rmSync(TMP_ROOT, { recursive: true, force: true });
    });

    it('prints linked outcomes, T3 sentinels, and dangling approved resolutions', () => {
        const runDir = join(TMP_ROOT, 'run_a');
        mkdirSync(runDir, { recursive: true });
        writeJson(join(runDir, 'run_summary.json'), {
            weeks: 188,
            final_state_hash: 'abc123',
        });
        writeJson(join(runDir, 'final_save.json'), {
            meta: { turn: 188 },
            military: {
                operation_opportunities: [
                    { proposal_id: 'OPP_175_sana_95', opportunity_id: 'sana_95', approver_faction: 'RBiH' },
                    { proposal_id: 'OPP_126_breza_94', opportunity_id: 'breza_94', approver_faction: 'RBiH' },
                    { proposal_id: 'OPP_180_no_aar', opportunity_id: 'no_aar', approver_faction: 'RS' },
                ],
                operation_opportunity_resolutions: [
                    {
                        proposal_id: 'OPP_175_sana_95',
                        opportunity_id: 'sana_95',
                        response: 'approve',
                        response_turn: 175,
                        executed_op_name: 'Operation Sana',
                        executed_op_aar_id: 'aar_sana_95',
                        exit_class: 'partial_success',
                    },
                    {
                        proposal_id: 'OPP_126_breza_94',
                        opportunity_id: 'breza_94',
                        response: 'approve',
                        response_turn: 126,
                        exit_class: 't3_authorized_no_offensive',
                    },
                    {
                        proposal_id: 'OPP_180_no_aar',
                        opportunity_id: 'no_aar',
                        response: 'approve',
                        response_turn: 180,
                        executed_op_name: 'Operation Missing AAR',
                    },
                ],
            },
            operation_history: [
                {
                    operation_id: 'aar_sana_95',
                    operation_name: 'Operation Sana',
                    faction: 'RBiH',
                    outcome: 'partial',
                    total_attacks: 7,
                    objectives_targeted: ['a', 'b'],
                    objectives_captured: ['a'],
                    grade: { stars: 3 },
                },
            ],
        });

        const output = execFileSync(
            process.execPath,
            ['tools/diagnostics/opportunity_health_audit.cjs', runDir],
            { cwd: process.cwd(), encoding: 'utf8' },
        );

        expect(output).toContain('# Operation Opportunity Health Audit');
        expect(output).toContain('| Total decisions | 3 |');
        expect(output).toContain('| Completed | 2 |');
        expect(output).toContain('| Unlinked approved offensive resolutions | 1 |');
        expect(output).toContain('Operation Sana');
        expect(output).toContain('partial_success');
        expect(output).toContain('t3_authorized_no_offensive');
        expect(output).toContain('OPP_180_no_aar');
    });
});
