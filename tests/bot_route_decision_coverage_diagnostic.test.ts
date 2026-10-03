import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TMP_ROOT = join(process.cwd(), '.tmp_bot_route_decision_coverage');

afterEach(() => rmSync(TMP_ROOT, { recursive: true, force: true }));

function writeRows(rows: unknown[]): string {
    mkdirSync(TMP_ROOT, { recursive: true });
    writeFileSync(
        join(TMP_ROOT, 'weekly_report.jsonl'),
        `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`,
        'utf8',
    );
    return TMP_ROOT;
}

function receipt(overrides: Record<string, unknown> = {}) {
    return {
        turn: 138,
        phase: 'war',
        brigade_id: 'arbih_737th_muslim_light',
        location_osid: 'A',
        transit_status: null,
        preexisting_movement_order_destination_osid: null,
        persistent_movement_state_destination_osid: null,
        operation_name: null,
        axis_id: null,
        current_objective: null,
        rule: 'offensive_target',
        route_goal_osids: ['X'],
        outcome: 'issued',
        candidate_destination_osid: 'B',
        issued_destination_osid: 'B',
        rejection_reason: null,
        ...overrides,
    };
}

function row(destination = 'B', details: unknown[] = [receipt()]) {
    return {
        week_index: 138,
        bot_order_diagnostics: {
            movement_orders_by_brigade: { arbih_737th_muslim_light: destination },
            route_decision_details: details,
        },
    };
}

function run(args: string[]) {
    try {
        const stdout = execFileSync(
            process.execPath,
            ['tools/diagnostics/bot_route_decision_coverage.cjs', ...args, '--json'],
            { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
        );
        return { exit: 0, report: JSON.parse(stdout) };
    } catch (error) {
        const result = error as { status?: number; stdout?: string | Buffer };
        const stdout = String(result.stdout ?? '').trim();
        return { exit: result.status ?? 1, report: stdout.length > 0 ? JSON.parse(stdout) : {} };
    }
}

describe('bot route-decision coverage diagnostic', () => {
    it('accepts a requested formation with a consistent serialized pre-order receipt', () => {
        const runDir = writeRows([row()]);
        const result = run([
            runDir,
            '--formation', 'arbih_737th_muslim_light',
            '--expect-boundary', 'arbih_737th_muslim_light:138',
            '--turn-min', '138', '--turn-max', '138',
        ]);

        expect(result.exit).toBe(0);
        expect(result.report).toEqual(expect.objectContaining({
            receipts_seen: 1,
            requested_formations_covered: ['arbih_737th_muslim_light'],
            expected_boundaries_covered: ['arbih_737th_muslim_light:138'],
            missing_expected_boundaries: [],
            inconsistencies: [],
            causal_proof: false,
        }));
    });

    it.each([
        ['completed-turn mismatch', { rows: [{ ...row(), week_index: 137 }], reason: 'receipt_turn_week_index_mismatch' }],
        ['duplicate brigade receipt', { rows: [row('B', [receipt(), receipt()])], reason: 'duplicate_brigade_receipt_in_row' }],
        ['unknown rule', { rows: [row('B', [receipt({ rule: 'invented' })])], reason: 'invalid_receipt_schema' }],
        ['invalid outcome invariant', {
            rows: [row('B', [receipt({ outcome: 'no_order', candidate_destination_osid: null, issued_destination_osid: null, rejection_reason: null })])],
            reason: 'invalid_outcome_invariant',
        }],
        ['non-exact schema', {
            rows: [row('B', [receipt({ unexpected: true })])],
            reason: 'invalid_receipt_schema',
        }],
        ['duplicate route goal', {
            rows: [row('B', [receipt({ route_goal_osids: ['X', 'X'] })])],
            reason: 'route_goals_not_unique_sorted',
        }],
    ])('fails closed on %s', (_label, fixture) => {
        const runDir = writeRows(fixture.rows);
        const result = run([runDir, '--formation', 'arbih_737th_muslim_light']);

        expect(result.exit).toBe(1);
        expect(result.report.inconsistencies).toContainEqual(
            expect.objectContaining({ reason: fixture.reason }),
        );
    });

    it('fails closed when an explicit named boundary is missing', () => {
        const runDir = writeRows([row()]);
        const result = run([
            runDir, '--formation', 'arbih_737th_muslim_light',
            '--expect-boundary', 'arbih_737th_muslim_light:137',
        ]);

        expect(result.exit).toBe(1);
        expect(result.report.missing_expected_boundaries)
            .toEqual(['arbih_737th_muslim_light:137']);
    });

    it('fails closed when a requested formation has no receipt in the window', () => {
        const runDir = writeRows([row()]);
        const result = run([runDir, '--formation', 'arbih_missing', '--turn-min', '138', '--turn-max', '138']);

        expect(result.exit).toBe(1);
        expect(result.report.missing_requested_formations).toEqual(['arbih_missing']);
    });

    it('detects an issued destination that disagrees with the serialized order map', () => {
        const runDir = writeRows([row('C')]);
        const result = run([runDir, '--formation', 'arbih_737th_muslim_light']);

        expect(result.exit).toBe(1);
        expect(result.report.inconsistencies).toEqual([
            expect.objectContaining({
                brigade_id: 'arbih_737th_muslim_light',
                reason: 'issued_destination_order_mismatch',
            }),
        ]);
    });
});
