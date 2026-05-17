import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TMP_ROOT = join(process.cwd(), '.tmp_endgame_188w_diagnostics');

function writeJson(path: string, value: unknown): void {
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

describe('188w endgame diagnostics', () => {
    afterEach(() => {
        rmSync(TMP_ROOT, { recursive: true, force: true });
    });

    it('classifies all four P0 probes as latent on a well-shaped final save', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/p0_latent_recheck.cjs') as {
            buildReport: (finalSavePath: string) => {
                active_count: number;
                rows: Array<{ id: string; endgame_status: string; evidence_field: string }>;
            };
        };
        const runDir = join(TMP_ROOT, 'p0_latent');
        mkdirSync(runDir, { recursive: true });
        const finalSave = join(runDir, 'final_save.json');
        writeJson(finalSave, {
            meta: { turn: 188 },
            political: { political_controllers: {} },
            military: {
                corps_command: { corps_a: { active_operations: [] } },
                formations: {
                    corps_a: { kind: 'corps', faction: 'RS' },
                    brigade_a: { kind: 'brigade', faction: 'RBiH', corps_id: 'corps_a' },
                },
            },
        });

        const report = diagnostic.buildReport(finalSave);

        expect(report.active_count).toBe(0);
        expect(report.rows.map((row) => `${row.id}:${row.endgame_status}`)).toEqual([
            'P0_1:LATENT',
            'P0_2:LATENT',
            'P0_3:LATENT',
            'P0_4:LATENT',
        ]);
        expect(report.rows.map((row) => row.evidence_field)).toContain('$.military.formations[*].faction');
    });

    it('flips P0 probes active when final-save shape reaches the defective paths', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/p0_latent_recheck.cjs') as {
            buildReport: (finalSavePath: string) => {
                active_count: number;
                rows: Array<{ id: string; endgame_status: string }>;
            };
        };
        const runDir = join(TMP_ROOT, 'p0_active');
        mkdirSync(runDir, { recursive: true });
        const finalSave = join(runDir, 'final_save.json');
        writeJson(finalSave, {
            meta: { turn: 188 },
            patron_pressure: { RS: 'NaN' },
            military: {
                corps_command: {},
                formations: {
                    corps_a: { kind: 'corps', faction: 'RS' },
                    brigade_a: { kind: 'brigade' },
                },
            },
        });

        const report = diagnostic.buildReport(finalSave);

        expect(report.active_count).toBeGreaterThan(0);
        expect(report.rows.filter((row) => row.endgame_status === 'ACTIVE').map((row) => row.id)).toEqual([
            'P0_2',
            'P0_3',
            'P0_4',
        ]);
    });

    it('buckets patron_pressure deterministically by faction', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/patron_pressure_probe.cjs') as {
            buildReport: (finalSavePath: string) => {
                rows: Array<{ faction: string; bucket: string; value: unknown; evidence_path: string }>;
                exact_key_hits: string[];
            };
        };
        const runDir = join(TMP_ROOT, 'patron');
        mkdirSync(runDir, { recursive: true });
        const finalSave = join(runDir, 'final_save.json');
        writeJson(finalSave, {
            meta: { turn: 188 },
            political: { patron_pressure: { RBiH: 4, RS: 0 } },
            military: { negotiation: { patron_relationships: {} } },
        });

        const report = diagnostic.buildReport(finalSave);

        expect(report.rows).toEqual([
            { faction: 'HRHB', bucket: 'absent', value: 'n/a', evidence_path: '$.political.patron_pressure' },
            { faction: 'RBiH', bucket: 'present', value: 4, evidence_path: '$.political.patron_pressure.RBiH' },
            { faction: 'RS', bucket: 'zero', value: 0, evidence_path: '$.political.patron_pressure.RS' },
        ]);
        expect(report.exact_key_hits).toEqual(['$.political.patron_pressure']);
    });

    it('builds deterministic Sarajevo casualty summaries from turn battle records', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/sarajevo_casualty_railroad.cjs') as {
            buildReport: (finalSavePath: string) => {
                verdict: string;
                city_summary: Array<{ city: string; attacker_casualties: number; defender_casualties: number; n_battles: number }>;
                rows: Array<{ osid: string; municipality: string; attacker_casualties: number; defender_casualties: number }>;
            };
        };
        const runDir = join(TMP_ROOT, 'sarajevo');
        mkdirSync(runDir, { recursive: true });
        const finalSave = join(runDir, 'final_save.json');
        writeJson(finalSave, {
            meta: { turn: 188 },
            turn_summaries: [
                {
                    turn: 2,
                    battles: [
                        {
                            osid: 'op:mostar:mostar_istok_2',
                            attacker_casualties: 100,
                            defender_casualties: 100,
                            primary_attacker_id: 'b',
                            primary_defender_id: 'c',
                        },
                        {
                            osid: 'op:centar_sarajevo:radava',
                            attacker_casualties: 500,
                            defender_casualties: 100,
                            primary_attacker_id: 'a',
                            primary_defender_id: 'd',
                        },
                    ],
                },
            ],
        });

        const first = diagnostic.buildReport(finalSave);
        const second = diagnostic.buildReport(finalSave);

        expect(JSON.stringify(first)).toEqual(JSON.stringify(second));
        expect(first.city_summary.map((row) => row.city)).toEqual(['BanjaLuka', 'Mostar', 'Sarajevo']);
        expect(first.city_summary.find((row) => row.city === 'Sarajevo')).toMatchObject({
            attacker_casualties: 500,
            defender_casualties: 100,
            n_battles: 1,
        });
        expect(first.verdict).toBe('SIGNAL_SARAJEVO_OUTLIER');
        expect(first.rows.map((row) => `${row.municipality}:${row.osid}`)).toEqual(
            first.rows.map((row) => `${row.municipality}:${row.osid}`).slice().sort(),
        );
    });
});
