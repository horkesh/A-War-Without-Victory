import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TMP_ROOT = join(process.cwd(), '.tmp_opportunity_campaign_proof');

function writeJson(path: string, value: unknown): void {
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

describe('opportunity campaign proof diagnostic script', () => {
    afterEach(() => {
        rmSync(TMP_ROOT, { recursive: true, force: true });
    });

    it('fuses proposals, ineligibility diagnostics, AAR delivery, and axis reachability', () => {
        const runDir = join(TMP_ROOT, 'run_a');
        mkdirSync(runDir, { recursive: true });
        writeJson(join(runDir, 'run_summary.json'), {
            weeks: 188,
            final_state_hash: 'proof123',
        });
        writeJson(join(runDir, 'final_save.json'), {
            meta: { turn: 188 },
            political: {
                political_controllers: {
                    'op:sanski_most:lusci_palanka_2': 'RS',
                    'op:sanski_most:budimlic_japra_2': 'RS',
                },
            },
            military: {
                operation_opportunities: [
                    {
                        proposal_id: 'OPP_175_sana_95',
                        opportunity_id: 'sana_95',
                        approver_faction: 'RBiH',
                        eligibility_turn: 175,
                        status: 'approved',
                    },
                ],
                operation_opportunity_resolutions: [
                    {
                        proposal_id: 'OPP_175_sana_95',
                        opportunity_id: 'sana_95',
                        response: 'approve',
                        response_turn: 175,
                        executed_op_name: 'Operation Sana',
                        executed_op_aar_id: 'aar_sana_95',
                        exit_class: 'failed',
                    },
                ],
                operation_opportunity_diagnostics: [
                    {
                        turn: 125,
                        opportunity_id: 'breza_94',
                        failed_required_axes: [{ axis: 'alliance_context', reason: 'pre-Storm crisis overtaken' }],
                        failed_optional_axes: [{ axis: 'logistics', reason: 'supply pressure critical' }],
                        optional_green_count: 0,
                        min_optional_axes: 0,
                    },
                    {
                        turn: 126,
                        opportunity_id: 'breza_94',
                        failed_required_axes: [{ axis: 'alliance_context', reason: 'pre-Storm crisis overtaken' }],
                        failed_optional_axes: [{ axis: 'logistics', reason: 'supply pressure critical' }],
                        optional_green_count: 0,
                        min_optional_axes: 0,
                    },
                ],
            },
            operation_history: [
                {
                    operation_id: 'aar_sana_95',
                    operation_name: 'Operation Sana',
                    corps_id: 'arbih_5th_corps',
                    faction: 'RBiH',
                    type: 'sector_attack',
                    started_turn: 175,
                    ended_turn: 188,
                    outcome: 'failure',
                    recovery_reason: 'max_failures',
                    total_attacks: 0,
                    objectives_targeted: ['op:sanski_most:lusci_palanka_2'],
                    objectives_captured: [],
                    axis_summaries: [
                        {
                            axis_id: 'sana_sanski_most_kljuc',
                            axis_name: 'Sanski Most + Kljuc',
                            total_attacks: 0,
                            objectives_targeted: ['op:sanski_most:lusci_palanka_2'],
                            objectives_captured: [],
                            staging_osid: 'op:bosanska_krupa:otoka_2',
                            unreachable_at_launch: true,
                        },
                    ],
                    grade: { stars: 3 },
                },
            ],
        });

        const output = execFileSync(
            process.execPath,
            ['tools/diagnostics/opportunity_campaign_proof.cjs', runDir],
            { cwd: process.cwd(), encoding: 'utf8' },
        );

        expect(output).toContain('# Opportunity Campaign Proof Matrix');
        expect(output).toContain('| Opportunities observed | 2 |');
        expect(output).toContain('| sana_95 | surfaced_executed | 175 | approve | failed | failure | 0 | 0/1 | NO-CONTACT-PATH:1 | aar:max_failures |');
        expect(output).toContain('| breza_94 | blocked_in_window | 125-126 | - | - | - | 0 | 0/0 | - | alliance_context x2; logistics x2 |');
        expect(output).toContain('| Operation Sana | sana_sanski_most_kljuc | true | NO-CONTACT-PATH | (none) |');
    });

    it('exports deterministic summary helpers', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const proof = require('../tools/diagnostics/opportunity_campaign_proof.cjs') as {
            summarizeDiagnostics: (rows: unknown[]) => {
                turn_window: string;
                required_blockers: string;
                optional_blockers: string;
            };
        };

        const summary = proof.summarizeDiagnostics([
            {
                turn: 3,
                failed_required_axes: [{ axis: 'zeta' }, { axis: 'alpha' }],
                failed_optional_axes: [{ axis: 'logistics' }],
            },
            {
                turn: 1,
                failed_required_axes: [{ axis: 'alpha' }],
                failed_optional_axes: [],
            },
        ]);

        expect(summary.turn_window).toBe('1-3');
        expect(summary.required_blockers).toBe('alpha x2; zeta x1');
        expect(summary.optional_blockers).toBe('logistics x1');
    });
});
