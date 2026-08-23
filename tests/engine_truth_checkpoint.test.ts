import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
    buildEngineTruthCheckpoint,
    renderEngineTruthCheckpoint,
} = require('../tools/diagnostics/engine_truth_checkpoint.cjs') as {
    buildEngineTruthCheckpoint: (input: Record<string, unknown>) => any;
    renderEngineTruthCheckpoint: (report: unknown) => string;
};

function fixture(): Record<string, unknown> {
    const emittedOutDir = join('runs', 'run-1');
    return {
        runDir: resolve('runs/run-1'),
        runMeta: {
            run_id: 'run-1', scenario_id: 'scenario-1', weeks: 2,
            out_dir: 'runs/run-1', scenario_path: 'data/scenarios/test.json',
            provenance: { git_commit: '1111111111111111111111111111111111111111' },
            anchor_contract: {
                schema_version: 1,
                scenario_id: 'scenario-1',
                weeks: 2,
                epoch: 'test-epoch',
                source: 'src/scenario/historical_anchors.ts#canonical-anchor-contract-v1',
                anchors: [
                    { anchor_id: 'anchor:a', anchor_type: 'osid', expected_controller: 'RBiH' },
                    { anchor_id: 'anchor:b', anchor_type: 'control_band', expected_controller: 'x' },
                ],
            },
        },
        finalSave: {
            meta: { scenario_start_date: { year: 1992, month: 3, day: 6 }, turn: 2 },
            military: {
                formations: {
                    a: { id: 'a', faction: 'RBiH', personnel: 90, status: 'active' },
                    b: { id: 'b', faction: 'RS', personnel: 180, status: 'active' },
                    c: { id: 'c', faction: 'HRHB', personnel: 45, status: 'active' },
                },
                casualty_ledger: {
                    HRHB: { killed: 5, wounded: 15, missing_captured: 1 },
                    RBiH: { killed: 10, wounded: 30, missing_captured: 2 },
                    RS: { killed: 20, wounded: 60, missing_captured: 4 },
                },
            },
            displacement: {
                civilian_casualties: {
                    RBiH: { killed: 4, fled_abroad: 12 },
                    RS: { killed: 5, fled_abroad: 14 },
                },
                displacement_state: {
                    alpha: { displaced_in: 20, displaced_out: 40, lost_population: 7 },
                },
            },
        },
        runSummary: {
            run_id: 'run-1',
            scenario_id: 'scenario-1',
            weeks: 2,
            final_state_hash: 'abc123',
            takeover_displacement: { displaced_total: 40 },
            combat_causality: {
                valid_for_combat_calibration: true,
                invalid_operation_count: 0,
                recovery_without_logged_attempt_count: 0,
                zero_eligible_attacker_operation_count: 0,
                total_attack_orders: 3,
                total_battles: 2,
                total_objective_attempts: 4,
                total_objective_captures: 1,
            },
            attack_resolution: { orders_processed: 3, flips_applied: 1 },
            op_injection_validation: { count: 0, errors: 0, warnings: 0, issues: [] },
            historical_fit: {
                osid_pair_match: { matched_osids: 8, total_osids: 10, match_ratio: 0.8 },
                anchor_checks: [
                    { anchor_id: 'anchor:a', anchor_type: 'osid', expected_controller: 'RBiH', actual_controller: 'RBiH', passed: true },
                    { anchor_id: 'anchor:b', anchor_type: 'control_band', expected_controller: 'x', actual_controller: 'x', passed: true },
                ],
            },
            anchor_checks: [
                { anchor_id: 'anchor:a', anchor_type: 'osid', expected_controller: 'RBiH', actual_controller: 'RBiH', passed: true },
                { anchor_id: 'anchor:b', anchor_type: 'control_band', expected_controller: 'x', actual_controller: 'x', passed: true },
            ],
        },
        temporalRows: [
            { brigade_id: 'c', faction: 'HRHB', personnel: 50, status: 'active', sector_id: 'sector:4', week_index: 0, turn: 1 },
            { brigade_id: 'a', faction: 'RBiH', personnel: 100, status: 'active', sector_id: 'sector:1', week_index: 0, turn: 1 },
            { brigade_id: 'b', faction: 'RS', personnel: 200, status: 'active', sector_id: 'sector:2', week_index: 0, turn: 1 },
            { brigade_id: 'c', faction: 'HRHB', personnel: 45, status: 'active', sector_id: 'sector:4', week_index: 1, turn: 2 },
            { brigade_id: 'a', faction: 'RBiH', personnel: 90, status: 'active', sector_id: 'sector:3', week_index: 1, turn: 2 },
            { brigade_id: 'b', faction: 'RS', personnel: 180, status: 'active', sector_id: 'sector:2', week_index: 1, turn: 2 },
        ],
        displacementRows: [
            { turn: 1, killed: 4, displaced: 20, fled_abroad: 12 },
            { turn: 2, killed: 5, displaced: 20, fled_abroad: 14 },
        ],
        assignmentLog: '> tsx tools/scenario_runner/run_scenario_with_preflight.ts --scenario data/scenarios/test.json --unique --out runs\n' +
            '[brigade_assignment] FINAL_SEAL kind=turn turn=1 unresolved=0\n' +
            '[brigade_assignment] FINAL_SEAL kind=turn turn=2 unresolved=0\n' +
            '[brigade_assignment] FINAL_SEAL kind=final_save turn=2 unresolved=0\n' +
            `outDir: ${emittedOutDir}\nfinal_state_hash: abc123\n`,
    };
}

function check(report: any, id: string): any {
    return report.checks.find((candidate: any) => candidate.id === id);
}

describe('engine truth checkpoint', () => {
    it('reports every evidence surface in stable order and byte-identically', () => {
        const a = buildEngineTruthCheckpoint(fixture());
        const b = buildEngineTruthCheckpoint(fixture());

        expect(renderEngineTruthCheckpoint(a)).toBe(renderEngineTruthCheckpoint(b));
        expect(a.force_totals.map((row: any) => [row.date, row.faction, row.personnel])).toEqual([
            ['1992-03-06', 'HRHB', 50],
            ['1992-03-06', 'RBiH', 100],
            ['1992-03-06', 'RS', 200],
            ['1992-03-13', 'HRHB', 45],
            ['1992-03-13', 'RBiH', 90],
            ['1992-03-13', 'RS', 180],
        ]);
        expect(a.casualties.RBiH.ratios).toEqual({ wounded_per_killed: 3, missing_captured_per_killed: 0.2 });
        expect(a.civilians.event_totals).toEqual({ killed: 9, displaced: 40, fled_abroad: 26 });
        expect(a.assignment_log).toMatchObject({
            evidence_available: true,
            binding: { status: 'ESTABLISHED', bound: true },
            warning_count: 0,
            final_seals: {
                marker_count: 3,
                turn_coverage_complete: true,
                exactly_one_turn_marker_per_turn: true,
                exactly_one_final_save_marker: true,
                warnings_reconciled: true,
            },
        });
        expect(a.calibration).toMatchObject({ matched_osids: 8, total_osids: 10, match_ratio: 0.8 });
        expect(a.calibration.anchors.map((anchor: any) => anchor.anchor_id)).toEqual(['anchor:a', 'anchor:b']);
        expect(a.pass).toBe(true);
    });

    it.each([
        ['artifact identity', 'artifact_identity', (x: any) => { x.runSummary.run_id = 'wrong'; }],
        ['force totals', 'force_timeline', (x: any) => { x.temporalRows[0].personnel = -1; }],
        ['casualties', 'casualty_ledger', (x: any) => { x.finalSave.military.casualty_ledger.RS.wounded = -1; }],
        ['civilian harm', 'civilian_displacement', (x: any) => { x.displacementRows[0].displaced = -1; }],
        ['assignment log binding', 'assignment_log_binding', (x: any) => { delete x.assignmentLog; }],
        ['unresolved assignment health', 'assignment_unresolved_health', (x: any) => {
            x.assignmentLog = '[brigade_assignment] UNRESOLVED a (90 pers): fell through sector pipeline, corps=arbih_1st_corps\n' + x.assignmentLog;
            x.assignmentLog = x.assignmentLog.replace('FINAL_SEAL kind=turn turn=2 unresolved=0', 'FINAL_SEAL kind=turn turn=2 unresolved=1');
        }],
        ['operations/combat', 'operations_combat', (x: any) => { x.runSummary.combat_causality.valid_for_combat_calibration = false; }],
        ['calibration and anchors', 'calibration_anchors', (x: any) => { x.runSummary.anchor_checks[0].passed = false; }],
    ])('positive control: %s check demonstrably fails', (_label, checkId, mutate) => {
        const input: any = fixture();
        mutate(input);
        const report = buildEngineTruthCheckpoint(input);
        expect(check(report, checkId)).toMatchObject({ ok: false });
        expect(report.pass).toBe(false);
    });

    it('does not turn absent assignment evidence into a zero', () => {
        const input: any = fixture();
        delete input.assignmentLog;
        const report = buildEngineTruthCheckpoint(input);
        expect(report.assignment_log).toMatchObject({
            evidence_available: false,
            warning_count: null,
            warnings: [],
            binding: { status: 'NOT_ESTABLISHED', bound: false },
        });
    });

    it('accepts complete force and seal evidence for a stamped resumed-run tail', () => {
        const input: any = fixture();
        input.runMeta.resume_from_save_path = 'runs/checkpoint.json';
        input.runMeta.resume_from_week_index = 1;
        input.temporalRows = input.temporalRows.filter((row: any) => row.week_index >= 1);
        input.assignmentLog = input.assignmentLog.replace(
            '[brigade_assignment] FINAL_SEAL kind=turn turn=1 unresolved=0\n',
            '',
        );

        const report = buildEngineTruthCheckpoint(input);
        expect(check(report, 'force_timeline')).toMatchObject({ ok: true });
        expect(check(report, 'assignment_warning_stream')).toMatchObject({ ok: true });
    });

    it('positive control: parses an exact warning emission and fails health', () => {
        const input: any = fixture();
        input.assignmentLog = '[brigade_assignment] UNRESOLVED a (90 pers): fell through sector pipeline, corps=arbih_1st_corps\n' + input.assignmentLog;
        input.assignmentLog = input.assignmentLog.replace('FINAL_SEAL kind=turn turn=2 unresolved=0', 'FINAL_SEAL kind=turn turn=2 unresolved=1');
        const report = buildEngineTruthCheckpoint(input);
        expect(report.assignment_log.warning_count).toBe(1);
        expect(report.assignment_log.warning_resolution_correctness).toBe('NOT_ESTABLISHED');
        expect(report.assignment_log.warnings[0]).toMatchObject({
            formation_id: 'a',
            formation_record_exists_in_final_save: true,
            formation_survives_final_state: true,
        });
        expect(check(report, 'assignment_unresolved_health')).toMatchObject({ ok: false });
        expect(check(report, 'assignment_warning_stream')).toMatchObject({ ok: true });
        expect(report.pass).toBe(false);
    });

    it('does not call a destroyed final record surviving', () => {
        const input: any = fixture();
        input.finalSave.military.formations.a.status = 'destroyed';
        input.assignmentLog = '[brigade_assignment] UNRESOLVED a (90 pers): fell through sector pipeline, corps=arbih_1st_corps\n' + input.assignmentLog;
        input.assignmentLog = input.assignmentLog.replace('FINAL_SEAL kind=turn turn=2 unresolved=0', 'FINAL_SEAL kind=turn turn=2 unresolved=1');
        const report = buildEngineTruthCheckpoint(input);
        expect(report.assignment_log.warnings[0]).toMatchObject({
            formation_record_exists_in_final_save: true,
            formation_survives_final_state: false,
        });
    });

    it.each([
        ['truncated final week', (x: any) => { x.temporalRows = x.temporalRows.filter((row: any) => row.week_index !== 1); }],
        ['missing faction-week', (x: any) => { x.temporalRows = x.temporalRows.filter((row: any) => !(row.week_index === 1 && row.faction === 'RBiH')); }],
        ['duplicate formation-week', (x: any) => { x.temporalRows.push({ ...x.temporalRows[0] }); }],
    ])('positive control: rejects %s temporal evidence', (_label, mutate) => {
        const input: any = fixture();
        mutate(input);
        expect(check(buildEngineTruthCheckpoint(input), 'force_timeline')).toMatchObject({ ok: false });
    });

    it('positive control: rejects an interior per-formation temporal deletion', () => {
        const input: any = fixture();
        input.runMeta.weeks = input.runSummary.weeks = input.finalSave.meta.turn = 3;
        input.assignmentLog = input.assignmentLog.replace(
            'FINAL_SEAL kind=turn turn=2 unresolved=0',
            'FINAL_SEAL kind=turn turn=2 unresolved=0\n[brigade_assignment] FINAL_SEAL kind=turn turn=3 unresolved=0',
        );
        input.assignmentLog = input.assignmentLog.replace('FINAL_SEAL kind=final_save turn=2', 'FINAL_SEAL kind=final_save turn=3');
        input.temporalRows.push(
            { ...input.temporalRows[0], week_index: 2, turn: 3 },
            { ...input.temporalRows[1], week_index: 2, turn: 3 },
            { ...input.temporalRows[2], week_index: 2, turn: 3 },
        );
        input.finalSave.military.formations.a2 = { id: 'a2', kind: 'brigade', faction: 'RBiH', personnel: 20, status: 'active' };
        input.temporalRows.push(
            { ...input.temporalRows[1], brigade_id: 'a2', week_index: 0, turn: 1 },
            { ...input.temporalRows[1], brigade_id: 'a2', week_index: 1, turn: 2 },
            { ...input.temporalRows[1], brigade_id: 'a2', week_index: 2, turn: 3 },
        );
        input.temporalRows = input.temporalRows.filter((row: any) => !(row.brigade_id === 'a' && row.week_index === 1));
        expect(check(buildEngineTruthCheckpoint(input), 'force_timeline')).toMatchObject({ ok: false });
    });

    it('positive control: rejects turn/week disagreement and a final active brigade missing from the final week', () => {
        const turnMismatch: any = fixture();
        turnMismatch.temporalRows[0].turn = 99;
        expect(check(buildEngineTruthCheckpoint(turnMismatch), 'force_timeline')).toMatchObject({ ok: false });

        const missingSurvivor: any = fixture();
        missingSurvivor.finalSave.military.formations.d = { id: 'd', kind: 'brigade', faction: 'RS', personnel: 10, status: 'active' };
        expect(check(buildEngineTruthCheckpoint(missingSurvivor), 'force_timeline')).toMatchObject({ ok: false });
    });

    it.each([
        ['missing output directory', (log: string) => log.replace(`outDir: ${join('runs', 'run-1')}\n`, '')],
        ['wrong final hash', (log: string) => log.replace('final_state_hash: abc123', 'final_state_hash: bad999')],
        ['wrong output directory', (log: string) => log.replace(`outDir: ${join('runs', 'run-1')}`, `outDir: ${join('runs', 'wrong-run')}`)],
    ])('positive control: isolated console binding mutation fails: %s', (_label, mutateLog) => {
        const input: any = fixture();
        input.assignmentLog = mutateLog(input.assignmentLog);
        const report = buildEngineTruthCheckpoint(input);
        expect(report.assignment_log.binding.bound).toBe(false);
        expect(check(report, 'assignment_log_binding')).toMatchObject({ ok: false });
    });

    it('positive control: rejects incoherent seals and concatenated multi-run logs', () => {
        const badSeal: any = fixture();
        badSeal.assignmentLog = badSeal.assignmentLog.replace('FINAL_SEAL kind=turn turn=2 unresolved=0', 'FINAL_SEAL kind=turn turn=2 unresolved=1');
        expect(check(buildEngineTruthCheckpoint(badSeal), 'assignment_warning_stream')).toMatchObject({ ok: false });

        const multiRun: any = fixture();
        multiRun.assignmentLog += multiRun.assignmentLog;
        expect(check(buildEngineTruthCheckpoint(multiRun), 'assignment_log_binding')).toMatchObject({ ok: false });
    });

    it('positive control: rejects a duplicate same-turn final seal', () => {
        const input: any = fixture();
        input.assignmentLog = input.assignmentLog.replace(
            'FINAL_SEAL kind=turn turn=1 unresolved=0',
            'FINAL_SEAL kind=turn turn=1 unresolved=0\n[brigade_assignment] FINAL_SEAL kind=turn turn=1 unresolved=0',
        );
        const report = buildEngineTruthCheckpoint(input);
        expect(report.assignment_log.final_seals.turn_coverage_complete).toBe(true);
        expect(report.assignment_log.final_seals.exactly_one_turn_marker_per_turn).toBe(false);
        expect(check(report, 'assignment_warning_stream')).toMatchObject({ ok: false });
    });

    it.each([
        ['duplicate final-save marker', (log: string) => log.replace(
            'FINAL_SEAL kind=final_save turn=2 unresolved=0',
            'FINAL_SEAL kind=final_save turn=2 unresolved=0\n[brigade_assignment] FINAL_SEAL kind=final_save turn=2 unresolved=0',
        )],
        ['wrong final-save turn', (log: string) => log.replace('kind=final_save turn=2', 'kind=final_save turn=1')],
        ['unknown marker kind', (log: string) => log.replace('kind=final_save', 'kind=mystery')],
        ['legacy marker without kind', (log: string) => log.replace('FINAL_SEAL kind=final_save', 'FINAL_SEAL')],
    ])('positive control: rejects final-seal protocol violation: %s', (_label, mutateLog) => {
        const input: any = fixture();
        input.assignmentLog = mutateLog(input.assignmentLog);
        expect(check(buildEngineTruthCheckpoint(input), 'assignment_warning_stream')).toMatchObject({ ok: false });
    });

    it('positive control: rejects casualty faction drift and anchor-copy drift', () => {
        const casualty: any = fixture();
        delete casualty.finalSave.military.casualty_ledger.HRHB;
        expect(check(buildEngineTruthCheckpoint(casualty), 'casualty_ledger')).toMatchObject({ ok: false });

        const anchors: any = fixture();
        anchors.runSummary.historical_fit.anchor_checks.pop();
        expect(check(buildEngineTruthCheckpoint(anchors), 'calibration_anchors')).toMatchObject({ ok: false });
    });

    it('positive control: joint truncation of both summary anchor copies still fails the authored contract', () => {
        const input: any = fixture();
        input.runSummary.anchor_checks.pop();
        input.runSummary.historical_fit.anchor_checks.pop();
        const report = buildEngineTruthCheckpoint(input);
        expect(report.calibration.anchor_sources.copies_match).toBe(true);
        expect(report.calibration.anchor_sources.contract_matches).toBe(false);
        expect(check(report, 'calibration_anchors')).toMatchObject({ ok: false });
    });

    it('positive control: missing scenario-bound anchor contract fails closed', () => {
        const input: any = fixture();
        delete input.runMeta.anchor_contract;
        const report = buildEngineTruthCheckpoint(input);
        expect(report.calibration.anchor_sources.contract_available).toBe(false);
        expect(check(report, 'calibration_anchors')).toMatchObject({ ok: false });
    });

    it.each([
        ['order reconciliation', (x: any) => { x.runSummary.attack_resolution.orders_processed = 2; }],
        ['flip ceiling', (x: any) => { x.runSummary.attack_resolution.flips_applied = 4; }],
        ['injection warning reconciliation', (x: any) => {
            x.runSummary.op_injection_validation = { count: 1, errors: 0, warnings: 1, issues: [] };
        }],
    ])('positive control: rejects combat inconsistency: %s', (_label, mutate) => {
        const input: any = fixture();
        mutate(input);
        expect(check(buildEngineTruthCheckpoint(input), 'operations_combat')).toMatchObject({ ok: false });
    });

    it('positive control: rejects a partial displacement log', () => {
        const input: any = fixture();
        input.displacementRows.pop();
        const report = buildEngineTruthCheckpoint(input);
        expect(check(report, 'civilian_displacement')).toMatchObject({ ok: false });
    });
});
