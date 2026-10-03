import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TMP_ROOT = join(process.cwd(), '.tmp_bot_dispatcher_decision_coverage');
afterEach(() => rmSync(TMP_ROOT, { recursive: true, force: true }));

const emptyOutput = () => ({
    attack_target_osid: null, movement_destination_osid: null,
    column_march_destination_osid: null, postures: [],
});

function receipt(overrides: Record<string, unknown> = {}) {
    return {
        turn: 138, phase: 'war', pass: 'bot_dispatcher', scope: 'replace', requested_factions: ['RBiH'],
        formation_id: 'arbih_737th_muslim_light', formation_faction: 'RBiH', formation_status: 'active',
        formation_kind: 'brigade', location_osid: 'A', eligibility: 'eligible', caller_filter: 'not_present',
        corps_id: 'arbih_3rd_corps', corps_stance: 'offensive', directive_assigned_front_ids: [],
        directive_offensive_targets: ['X'], directive_hold_osids: [], directive_avoid_osids: [],
        assigned_sector_id: null, assigned_sector_role: null, operation_name: null,
        operation_axis_id: null, operation_current_objective: null, transit_status: null,
        transit_stance: null, persistent_destination_osids: [], preexisting_movement_order_destination_osid: null,
        first_handler: 'interior_movement', pre_cap_output: emptyOutput(),
        final_generated_output: emptyOutput(), snapshot_output: emptyOutput(),
        ...overrides,
    };
}

function row(details: unknown[] = [receipt()]) {
    return { week_index: 138, bot_order_diagnostics: { dispatcher_decision_details: details } };
}

function run(rows: unknown[], extra: string[] = []) {
    mkdirSync(TMP_ROOT, { recursive: true });
    writeFileSync(join(TMP_ROOT, 'weekly_report.jsonl'), `${rows.map((entry) => JSON.stringify(entry)).join('\n')}\n`);
    try {
        const stdout = execFileSync(process.execPath, [
            'tools/diagnostics/bot_dispatcher_decision_coverage.cjs', TMP_ROOT,
            '--formation', 'arbih_737th_muslim_light', '--json', ...extra,
        ], { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
        return { exit: 0, report: JSON.parse(stdout) };
    } catch (error) {
        const result = error as { status?: number; stdout?: string | Buffer };
        const stdout = String(result.stdout ?? '').trim();
        return { exit: result.status ?? 1, report: stdout ? JSON.parse(stdout) : {} };
    }
}

describe('bot dispatcher decision coverage diagnostic', () => {
    it('accepts a strict named actor/pass boundary', () => {
        const result = run([row()], ['--expect-boundary', 'arbih_737th_muslim_light:138']);
        expect(result.exit).toBe(0);
        expect(result.report).toEqual(expect.objectContaining({ receipts_seen: 1, inconsistencies: [], missing_expected_boundaries: [] }));
    });

    it.each([
        ['malformed schema', receipt({ unexpected: true }), 'invalid_receipt_schema'],
        ['unknown enum', receipt({ first_handler: 'invented' }), 'invalid_receipt_schema'],
        ['turn misalignment', receipt({ turn: 137 }), 'receipt_turn_week_index_mismatch'],
        ['eligibility/handler contradiction', receipt({ eligibility: 'inactive' }), 'eligibility_handler_contradiction'],
        ['inactive with active facts', receipt({ eligibility: 'inactive', first_handler: null, caller_filter: 'not_invoked' }), 'eligibility_handler_contradiction'],
        ['unsupported kind with brigade facts', receipt({ eligibility: 'unsupported_kind', first_handler: null, caller_filter: 'not_invoked' }), 'eligibility_handler_contradiction'],
        ['missing location with a location', receipt({ eligibility: 'missing_location', first_handler: null, caller_filter: 'not_invoked' }), 'eligibility_handler_contradiction'],
        ['excluded faction that was requested', receipt({ eligibility: 'faction_not_requested', first_handler: null, caller_filter: 'not_invoked' }), 'eligibility_handler_contradiction'],
        ['filter rejection without base eligibility', receipt({ eligibility: 'caller_filter_rejected', formation_status: 'inactive', first_handler: null, caller_filter: 'rejected' }), 'eligibility_handler_contradiction'],
        ['inactive cannot outrank faction exclusion', receipt({ eligibility: 'inactive', formation_faction: 'RS', formation_status: 'inactive', first_handler: null, caller_filter: 'not_invoked' }), 'eligibility_handler_contradiction'],
        ['eligible without a measured handler', receipt({ first_handler: null }), 'eligibility_handler_contradiction'],
        ['unknown posture enum', receipt({ snapshot_output: { ...emptyOutput(), postures: ['invented'] } }), 'invalid_receipt_schema'],
    ])('fails closed on %s', (_label, detail, reason) => {
        const result = run([row([detail])]);
        expect(result.exit).toBe(1);
        expect(result.report.inconsistencies).toContainEqual(expect.objectContaining({ reason }));
    });

    it('rejects duplicate actor/pass keys', () => {
        const result = run([row([receipt(), receipt()])]);
        expect(result.exit).toBe(1);
        expect(result.report.inconsistencies).toContainEqual(expect.objectContaining({ reason: 'duplicate_actor_pass_key' }));
    });

    it('rejects duplicate completed-turn actor/pass keys across weekly rows', () => {
        const result = run([row(), row()]);
        expect(result.exit).toBe(1);
        expect(result.report.inconsistencies).toContainEqual(expect.objectContaining({
            reason: 'duplicate_actor_pass_key',
            turn: 138,
        }));
    });

    it('rejects a non-skip handler for an eligible active column transit', () => {
        const result = run([row([receipt({
            transit_status: 'in_transit',
            transit_stance: 'column',
            persistent_destination_osids: ['B'],
            first_handler: 'interior_movement',
        })])]);
        expect(result.exit).toBe(1);
        expect(result.report.inconsistencies).toContainEqual(expect.objectContaining({
            reason: 'eligibility_handler_contradiction',
        }));
    });

    it('rejects a missing named boundary', () => {
        const result = run([row()], ['--expect-boundary', 'arbih_737th_muslim_light:139']);
        expect(result.exit).toBe(1);
        expect(result.report.missing_expected_boundaries).toEqual(['arbih_737th_muslim_light:139']);
    });
});
