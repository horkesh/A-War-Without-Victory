import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TMP_ROOT = join(process.cwd(), '.tmp_sensitive_history_status');

function writeJson(path: string, value: unknown): void {
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeFixtureRun(fixtureName: string, runName: string): string {
    const fixturePath = join(process.cwd(), 'tests', 'fixtures', 'sensitive_history_watched_operations', fixtureName);
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as { files: Record<string, unknown> };
    const runDir = join(TMP_ROOT, runName);
    mkdirSync(runDir, { recursive: true });
    for (const [name, value] of Object.entries(fixture.files)) {
        writeJson(join(runDir, name), value);
    }
    return runDir;
}

describe('sensitive_history_status diagnostic script', () => {
    afterEach(() => {
        rmSync(TMP_ROOT, { recursive: true, force: true });
    });

    it('reports unresolved Srebrenica/Zepa controller and rupture status', () => {
        const runDir = join(TMP_ROOT, 'run_a');
        mkdirSync(runDir, { recursive: true });
        writeJson(join(runDir, 'run_summary.json'), {
            weeks: 188,
            final_state_hash: 'abc123',
        });
        writeJson(join(runDir, 'final_save.json'), {
            meta: { turn: 188 },
            political: {
                political_controllers: {
                    'op:srebrenica:bostahovine_2': 'RBiH',
                    'op:srebrenica:brezovice_2': 'RBiH',
                    'op:srebrenica:donji_potocari_2': 'RBiH',
                    'op:srebrenica:ljeskovik_2': 'RBiH',
                    'op:srebrenica:luka_2': 'RBiH',
                    'op:srebrenica:mala_daljegosta_2': 'RBiH',
                    'op:srebrenica:milacevici': 'RBiH',
                    'op:srebrenica:radovcici': 'RBiH',
                    'op:srebrenica:srebrenica_2': 'RBiH',
                    'op:srebrenica:suceska': 'RBiH',
                    'op:srebrenica:sulice_2': 'RBiH',
                    'op:rogatica:zepa_2': 'RBiH',
                },
            },
            military: {
                event_fire_counts: {
                    srebrenica_falls_1995: 1,
                    zepa_falls_1995: 1,
                },
                event_last_fired_turn: {
                    srebrenica_falls_1995: 162,
                    zepa_falls_1995: 164,
                },
                fired_event_ids: ['srebrenica_falls_1995', 'zepa_falls_1995'],
                formations: {
                    rs_skelani_battalion: {
                        status: 'inactive',
                        personnel: 0,
                        cohesion: 65,
                        morale: 10,
                        corps_id: 'vrs_drina',
                        location_osid: 'op:srebrenica:mala_daljegosta_2',
                    },
                    rs_1st_bratunac: {
                        status: 'active',
                        personnel: 1800,
                        cohesion: 40,
                        morale: 32,
                        corps_id: 'vrs_drina',
                        location_osid: 'op:bratunac:bratunac_2',
                    },
                },
            },
        });
        writeJson(join(runDir, 'operation_aars.json'), [
            {
                operation_id: 'vrs_drina:Operation Krivaja-95:t168',
                operation_name: 'Operation Krivaja-95',
                started_turn: 168,
                outcome: 'failure',
                recovery_reason: 'planning_invalidated',
                total_attacks: 0,
                objectives_targeted: ['op:srebrenica:srebrenica_2'],
                objectives_captured: [],
                force_ratio_estimate: 0.08,
                axis_summaries: [
                    {
                        axis_id: 'srebrenica_enclave',
                        staging_osid: 'op:bratunac:bratunac_2',
                        total_attacks: 0,
                        objectives_targeted: ['op:srebrenica:srebrenica_2'],
                        objectives_captured: [],
                        brigades: ['rs_1st_bratunac'],
                    },
                ],
            },
        ]);

        const output = execFileSync(
            process.execPath,
            ['tools/diagnostics/sensitive_history_status.cjs', runDir],
            { cwd: process.cwd(), encoding: 'utf8' },
        );

        expect(output).toContain('# Sensitive-History Enclave Status');
        expect(output).toContain('- Verdict: **OPEN_P0**');
        expect(output).toContain('| srebrenica | 0/11 | 11/11 | 0 | RBiH | no | RBiH:11 |');
        expect(output).toContain('| zepa | 0/1 | 1/1 | 0 | RBiH | no | RBiH:1 |');
        expect(output).toContain('| srebrenica_genocide_1995 | no | 0 | - | - |');
        expect(output).toContain('| Operation Krivaja-95 | 168 | failure | planning_invalidated | planning_invalidated | 0 | 0/1 | 0.080 | srebrenica_enclave:0/1@op:bratunac:bratunac_2 |');
        expect(output).toContain('| rs_skelani_battalion | inactive | 0 | 65 | 10 | vrs_drina | op:srebrenica:mala_daljegosta_2 |');
    });

    it('exports deterministic run summaries', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const diagnostic = require('../tools/diagnostics/sensitive_history_status.cjs') as {
            summarizeEnclave: (
                name: string,
                osids: string[],
                controllers: Record<string, string>,
                capitalOsid: string,
            ) => { controller_summary: string; all_rs: boolean };
        };

        const summary = diagnostic.summarizeEnclave(
            'demo',
            ['b', 'a'],
            { a: 'RS', b: 'RBiH' },
            'a',
        );

        expect(summary.controller_summary).toBe('RBiH:1, RS:1');
        expect(summary.all_rs).toBe(false);
    });

    it('reports watched-operation visibility separately from capture delivery', () => {
        const runDir = writeFixtureRun('blocked_operation_run.json', 'watched_operation_trace');

        const jsonOutput = execFileSync(
            process.execPath,
            ['tools/diagnostics/sensitive_history_status.cjs', '--json', runDir],
            { cwd: process.cwd(), encoding: 'utf8' },
        );
        const [summary] = JSON.parse(jsonOutput) as Array<{
            watched_operations: Array<{
                operation_name: string;
                watched_label: string;
                operation_id: string;
                canonical_window: string;
                catalog_status: string;
                eligibility_status: string;
                launch_status: string;
                blocker_code: string;
                aar_status: string;
                presence_status: string;
                delivery_status: string;
                typed_blocker: string;
                aar_visible: boolean;
            }>;
        }>;

        expect(summary.watched_operations).toEqual([
            {
                operation_name: 'Operation Cerska-Kamenica',
                watched_label: 'Cerska-Kamenica',
                operation_id: '',
                canonical_window: '',
                catalog_status: 'missing',
                eligibility_status: 'unknown',
                launch_status: 'unknown',
                blocker_code: '',
                aar_status: 'not_visible',
                presence_status: 'missing',
                delivery_status: 'missing',
                typed_blocker: '',
                aar_visible: false,
            },
            {
                operation_name: 'Operation Krivaja-95',
                watched_label: 'Krivaja',
                operation_id: 'vrs_drina:Operation Krivaja-95:t168',
                canonical_window: '168-176',
                catalog_status: 'present',
                eligibility_status: 'not_eligible',
                launch_status: 'blocked',
                blocker_code: 'defender_power_too_high',
                aar_status: 'not_visible',
                presence_status: 'aar_not_visible',
                delivery_status: 'blocked',
                typed_blocker: 'defender_power_too_high',
                aar_visible: false,
            },
            {
                operation_name: 'Operation Stupčanica-95',
                watched_label: 'Stupcanica',
                operation_id: 'vrs_drina:Operation Stupcanica-95:t172',
                canonical_window: '172-180',
                catalog_status: 'present',
                eligibility_status: 'eligible',
                launch_status: 'launched',
                blocker_code: '',
                aar_status: 'visible',
                presence_status: 'aar_visible',
                delivery_status: 'delivered',
                typed_blocker: '',
                aar_visible: true,
            },
        ]);

        const markdown = execFileSync(
            process.execPath,
            ['tools/diagnostics/sensitive_history_status.cjs', runDir],
            { cwd: process.cwd(), encoding: 'utf8' },
        );

        expect(markdown).toContain('| Operation Krivaja-95 | Krivaja | vrs_drina:Operation Krivaja-95:t168 | 168-176 | present | not_eligible | blocked | defender_power_too_high | not_visible | blocked |');
        expect(markdown).toContain('| Operation Cerska-Kamenica | Cerska-Kamenica | - | - | missing | unknown | unknown | - | not_visible | missing |');
        expect(markdown).toContain('| Operation Stupčanica-95 | Stupcanica | vrs_drina:Operation Stupcanica-95:t172 | 172-180 | present | eligible | launched | - | visible | delivered |');
    });

    it('uses persisted injection warnings when no watched-operation trace exists', () => {
        const runDir = join(TMP_ROOT, 'injection_warning_trace');
        mkdirSync(runDir, { recursive: true });
        writeJson(join(runDir, 'run_summary.json'), {
            weeks: 188,
            final_state_hash: 'warning-only-fixture',
        });
        writeJson(join(runDir, 'final_save.json'), {
            meta: { turn: 188 },
            political: { political_controllers: {} },
            military: {
                op_injection_warnings: [
                    {
                        op_name: 'Operation Krivaja-95',
                        axis_id: 'srebrenica_enclave',
                        check: 'brigade_ineligible',
                        detail: 'Brigade "rs_skelani_battalion" ineligible: kind="brigade", status="inactive"',
                        severity: 'warning',
                        turn: 172,
                    },
                ],
                formations: {},
            },
        });
        writeJson(join(runDir, 'operation_aars.json'), []);

        const jsonOutput = execFileSync(
            process.execPath,
            ['tools/diagnostics/sensitive_history_status.cjs', '--json', runDir],
            { cwd: process.cwd(), encoding: 'utf8' },
        );
        const [summary] = JSON.parse(jsonOutput) as Array<{
            watched_operations: Array<{
                operation_name: string;
                operation_id: string;
                canonical_window: string;
                catalog_status: string;
                eligibility_status: string;
                launch_status: string;
                blocker_code: string;
                aar_status: string;
                delivery_status: string;
            }>;
        }>;

        expect(summary.watched_operations.find((op) => op.operation_name === 'Operation Krivaja-95')).toMatchObject({
            operation_id: 'Operation Krivaja-95',
            canonical_window: '170-178',
            catalog_status: 'present',
            eligibility_status: 'not_eligible',
            launch_status: 'blocked',
            blocker_code: 'brigade_ineligible',
            aar_status: 'not_visible',
            delivery_status: 'blocked',
        });
    });

    it('distinguishes catalog-present watched operations from missing operations when no launch trace survives', () => {
        const runDir = join(TMP_ROOT, 'catalog_only_trace');
        mkdirSync(runDir, { recursive: true });
        writeJson(join(runDir, 'run_summary.json'), {
            weeks: 188,
            final_state_hash: 'catalog-only-fixture',
        });
        writeJson(join(runDir, 'final_save.json'), {
            meta: { turn: 188 },
            political: { political_controllers: {} },
            military: {
                formations: {},
            },
        });
        writeJson(join(runDir, 'watched_operation_catalog.json'), [
            { operation_name: 'Operation Cerska-Kamenica' },
        ]);
        writeJson(join(runDir, 'operation_aars.json'), []);

        const jsonOutput = execFileSync(
            process.execPath,
            ['tools/diagnostics/sensitive_history_status.cjs', '--json', runDir],
            { cwd: process.cwd(), encoding: 'utf8' },
        );
        const [summary] = JSON.parse(jsonOutput) as Array<{
            watched_operations: Array<{
                operation_name: string;
                canonical_window: string;
                catalog_status: string;
                eligibility_status: string;
                launch_status: string;
                aar_status: string;
                delivery_status: string;
            }>;
        }>;

        expect(summary.watched_operations.find((op) => op.operation_name === 'Operation Cerska-Kamenica')).toMatchObject({
            canonical_window: '40',
            catalog_status: 'present',
            eligibility_status: 'unknown',
            launch_status: 'not_launched',
            aar_status: 'not_visible',
            delivery_status: 'unknown',
        });
        expect(summary.watched_operations.find((op) => op.operation_name === 'Operation Krivaja-95')).toMatchObject({
            catalog_status: 'missing',
            launch_status: 'unknown',
            delivery_status: 'missing',
        });
    });

    it('prefers concrete no-launch traces over same-turn warning-only traces', () => {
        const runDir = join(TMP_ROOT, 'same_turn_warning_and_no_launch');
        mkdirSync(runDir, { recursive: true });
        writeJson(join(runDir, 'run_summary.json'), {
            weeks: 188,
            final_state_hash: 'same-turn-fixture',
        });
        writeJson(join(runDir, 'final_save.json'), {
            meta: { turn: 188 },
            political: { political_controllers: {} },
            military: {
                formations: {},
            },
        });
        writeJson(join(runDir, 'watched_operations.json'), [
            {
                operation_name: 'Operation Krivaja-95',
                canonical_window: '170-178',
                catalog_status: 'present',
                eligibility_status: 'unknown',
                launch_status: 'not_launched',
                delivery_status: 'unknown',
                blocker_code: 'build_defender_power_too_high',
                typed_blocker: 'build_defender_power_too_high',
                turn: 188,
                launch_feasibility_ratio: 0.317,
                launch_attacker_power: 205.892,
                launch_defender_power: 649.751,
            },
            {
                operation_name: 'Operation Krivaja-95',
                canonical_window: '170-178',
                catalog_status: 'present',
                eligibility_status: 'unknown',
                launch_status: 'unknown',
                delivery_status: 'unknown',
                blocker_code: 'brigade_ineligible',
                typed_blocker: 'brigade_ineligible',
                turn: 188,
            },
        ]);
        writeJson(join(runDir, 'operation_aars.json'), []);

        const jsonOutput = execFileSync(
            process.execPath,
            ['tools/diagnostics/sensitive_history_status.cjs', '--json', runDir],
            { cwd: process.cwd(), encoding: 'utf8' },
        );
        const [summary] = JSON.parse(jsonOutput) as Array<{
            watched_operations: Array<{
                operation_name: string;
                launch_status: string;
                blocker_code: string;
                launch_feasibility_ratio?: number;
                launch_attacker_power?: number;
                launch_defender_power?: number;
            }>;
        }>;

        expect(summary.watched_operations.find((op) => op.operation_name === 'Operation Krivaja-95')).toMatchObject({
            launch_status: 'not_launched',
            blocker_code: 'build_defender_power_too_high',
            launch_feasibility_ratio: 0.317,
            launch_attacker_power: 205.892,
            launch_defender_power: 649.751,
        });
    });
});
