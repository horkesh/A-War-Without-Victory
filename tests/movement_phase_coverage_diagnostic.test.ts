import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GameState } from '../src/state/game_state.js';
import { createMovementPhaseObserver, resetMovementPhaseSelectorCacheForTests } from '../src/sim/combat/movement_phase_diagnostic.js';
import { runNamedPhase } from '../src/sim/turn_pipeline.js';
const TMP = join(process.cwd(), '.tmp_movement_phase_coverage');
afterEach(() => {
    rmSync(TMP, { recursive: true, force: true });
    delete process.env.AWWV_DEBUG_REASON_CODES;
    delete process.env.AWWV_DEBUG_MOVEMENT_FORMATIONS;
    resetMovementPhaseSelectorCacheForTests();
});
const absent = () => ({ presence: 'absent' });
const value = (v: unknown) => ({ presence: 'present_value', value: v });
const snapshot = (location = 'A') => ({ formation: value({ faction: value('RBiH'), status: value('active'), location_osid: value(location), corps_id: { presence: 'present_null' } }), movement_state: absent(), movement_order: absent() });
const manifest = [{ phase_index: 0, phase_name: 'first', phase_group: 'war' }, { phase_index: 1, phase_name: 'second', phase_group: 'war' }];
const receipt = (index: number, before = snapshot(), after = snapshot(), overrides: Record<string, unknown> = {}) => ({ completed_turn: 21, phase_name: manifest[index].phase_name, phase_group: 'war', phase_index: index, disposition: 'executed', skip_reason: null, formation_id: 'actor', before, after, ...overrides });
const diagnostic = (receipts: unknown[], terminal = snapshot(), overrides: Record<string, unknown> = {}) => ({ topic: 'movement_phase', selector_configured: true, requested_formations: ['actor'], phase_manifest: manifest.map((entry) => ({ ...entry })), causal_proof: false, receipts, terminal_receipts: [{ completed_turn: 21, phase_index: 2, formation_id: 'actor', before: terminal, after: terminal }], ...overrides });
function run(payload: unknown | undefined, expectBoundary = true, weekIndex: unknown = 21, boundary = 'actor:21', activity: 'active' | 'inactive' = 'active') {
    mkdirSync(TMP, { recursive: true });
    const payloads = Array.isArray(payload) ? payload : [payload];
    writeFileSync(join(TMP, 'weekly_report.jsonl'), `${payloads.map((entry) => JSON.stringify(entry === undefined ? { week_index: weekIndex } : { week_index: weekIndex, movement_phase_diagnostics: entry })).join('\n')}\n`);
    const args = ['tools/diagnostics/movement_phase_coverage.cjs', TMP];
    if (expectBoundary) args.push(activity === 'active' ? '--expect-boundary' : '--expect-inactive-boundary', boundary);
    args.push('--json');
    try { return { exit: 0, report: JSON.parse(execFileSync(process.execPath, args, { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })) }; }
    catch (error) { const e = error as { status?: number; stdout?: string | Buffer }; return { exit: e.status ?? 1, report: JSON.parse(String(e.stdout ?? '{}')) }; }
}
describe('movement phase strict coverage correction', () => {
    it('requires an explicit expectation', () => {
        const result = run(diagnostic([receipt(0), receipt(1)]), false);
        expect(result.exit).toBe(1);
        expect(result.report.inconsistencies).toContainEqual(expect.objectContaining({ reason: 'expectation_required' }));
    });
    it('accepts exactly one complete continuous manifest and terminal chain', () => {
        const a = receipt(0); const b = receipt(1, a.after, snapshot('B'));
        const result = run(diagnostic([a, b], b.after));
        expect(result.exit).toBe(0);
        expect(result.report).toEqual(expect.objectContaining({ receipts_seen: 2, causal_proof: false, inconsistencies: [], missing_expected_boundaries: [] }));
    });
    it('accepts a genuine producer stream before birth and through activation with explicit activity expectations', async () => {
        process.env.AWWV_DEBUG_REASON_CODES = 'movement_phase';
        process.env.AWWV_DEBUG_MOVEMENT_FORMATIONS = 'actor';
        resetMovementPhaseSelectorCacheForTests();
        const actual = {
            meta: { turn: 1, phase: 'war', seed: 'prebirth-activation' },
            factions: [{ id: 'RBiH' }],
            military: { formations: {}, militia_pools: {} },
            political: { political_controllers: {} },
            displacement: {},
        } as unknown as GameState;
        const makeTurn = async (activate: boolean) => {
            const report = { seed: 'prebirth-activation', phases: [] } as any;
            const observer = createMovementPhaseObserver()!;
            await runNamedPhase({ state: actual, report, input: {}, rng: () => 0 } as any, {
                name: 'process-lifecycle-events',
                run: () => {
                    if (activate) actual.military.formations.actor = {
                        id: 'actor', faction: 'RBiH', name: 'Actor', kind: 'brigade', status: 'active', assignment: null,
                        created_turn: actual.meta.turn, personnel: 1_000, cohesion: 70, morale: 70,
                        location_osid: 'A', home_osid: 'A', corps_id: null,
                    } as any;
                },
            }, 'war', observer);
            observer.terminalBoundary(actual, report.phases.length);
            return observer.finish();
        };
        const prebirth = await makeTurn(false);
        actual.meta.turn = 2;
        const activated = await makeTurn(true);
        mkdirSync(TMP, { recursive: true });
        writeFileSync(join(TMP, 'weekly_report.jsonl'), [
            { week_index: 1, movement_phase_diagnostics: prebirth },
            { week_index: 2, movement_phase_diagnostics: activated },
        ].map((row) => JSON.stringify(row)).join('\n') + '\n');
        const args = ['tools/diagnostics/movement_phase_coverage.cjs', TMP,
            '--expect-inactive-boundary', 'actor:1', '--expect-boundary', 'actor:2', '--json'];
        const result = JSON.parse(execFileSync(process.execPath, args, { cwd: process.cwd(), encoding: 'utf8' }));
        expect(result).toMatchObject({
            inconsistencies: [], missing_expected_boundaries: [],
            active_coverage: ['actor:2'], inactive_coverage: ['actor:1'],
        });
    });
    it('rejects active-as-inactive and inactive-as-active expectations', () => {
        const active = run(diagnostic([receipt(0), receipt(1)]), true, 21, 'actor:21', 'inactive');
        expect(active.exit).toBe(1);
        expect(active.report.inconsistencies).toContainEqual(expect.objectContaining({ reason: 'terminal_actor_unexpectedly_active' }));
        const inactiveSnapshot = { formation: absent(), movement_state: absent(), movement_order: absent() } as unknown as ReturnType<typeof snapshot>;
        const inactive = run(diagnostic([receipt(0, inactiveSnapshot, inactiveSnapshot), receipt(1, inactiveSnapshot, inactiveSnapshot)], inactiveSnapshot));
        expect(inactive.exit).toBe(1);
        expect(inactive.report.inconsistencies).toContainEqual(expect.objectContaining({ reason: 'terminal_actor_not_active' }));
    });
    it('rejects string weekly, receipt, and terminal completed turns', () => {
        const a = receipt(0); const b = receipt(1, a.after, snapshot('B'));
        const malformed = diagnostic(
            [a, b].map((entry) => ({ ...entry, completed_turn: '21' })),
            b.after,
        );
        malformed.terminal_receipts[0].completed_turn = '21' as never;
        const result = run(malformed, true, '21');
        expect(result.exit).toBe(1);
        expect(result.report.inconsistencies).toContainEqual(expect.objectContaining({ reason: 'invalid_week_index' }));
        expect(result.report.inconsistencies).toContainEqual(expect.objectContaining({ reason: 'invalid_receipt_schema' }));
        expect(result.report.inconsistencies).toContainEqual(expect.objectContaining({ reason: 'invalid_terminal_receipt' }));
    });
    it('rejects noncanonical CLI turns and noninteger artifact indexes', () => {
        mkdirSync(TMP, { recursive: true });
        writeFileSync(join(TMP, 'weekly_report.jsonl'), `${JSON.stringify({ week_index: 21, movement_phase_diagnostics: diagnostic([receipt(0), receipt(1)]) })}\n`);
        for (const boundary of ['actor:0', 'actor:21.0', 'actor:not-a-turn']) {
            try {
                execFileSync(process.execPath, ['tools/diagnostics/movement_phase_coverage.cjs', TMP, '--expect-boundary', boundary, '--json'], { cwd: process.cwd(), stdio: 'pipe' });
                throw new Error(`expected rejection for ${boundary}`);
            } catch (error) {
                expect((error as { status?: number }).status).toBe(2);
            }
        }
        const malformed = diagnostic([receipt(0), receipt(1)]);
        malformed.phase_manifest[0].phase_index = '0' as never;
        (malformed.receipts[0] as Record<string, unknown>).phase_index = '0';
        malformed.terminal_receipts[0].phase_index = '2' as never;
        const result = run(malformed);
        expect(result.exit).toBe(1);
        expect(result.report.inconsistencies).toContainEqual(expect.objectContaining({ reason: 'invalid_phase_manifest' }));
        expect(result.report.inconsistencies).toContainEqual(expect.objectContaining({ reason: 'invalid_receipt_schema' }));
        expect(result.report.inconsistencies).toContainEqual(expect.objectContaining({ reason: 'invalid_terminal_receipt' }));
    });
    it('rejects numeric actor 737 before coercion can satisfy string expectation 737', () => {
        const a = { ...receipt(0), formation_id: 737 };
        const b = { ...receipt(1, a.after, snapshot('B')), formation_id: 737 };
        const malformed = diagnostic([a, b], b.after, { requested_formations: [737] });
        malformed.terminal_receipts[0].formation_id = 737 as never;
        const result = run(malformed, true, 21, '737:21');
        expect(result.exit).toBe(1);
        expect(result.report.inconsistencies).toContainEqual(expect.objectContaining({ reason: 'invalid_actor_manifest' }));
        expect(result.report.inconsistencies).toContainEqual(expect.objectContaining({ reason: 'invalid_receipt_schema' }));
        expect(result.report.inconsistencies).toContainEqual(expect.objectContaining({ reason: 'invalid_terminal_receipt' }));
    });
    it('accepts numeric-looking actor ID 737 when its artifact type is string', () => {
        const a = { ...receipt(0), formation_id: '737' };
        const b = { ...receipt(1, a.after, snapshot('B')), formation_id: '737' };
        const valid = diagnostic([a, b], b.after, { requested_formations: ['737'] });
        valid.terminal_receipts[0].formation_id = '737';
        expect(run(valid, true, 21, '737:21').exit).toBe(0);
    });
    it.each([
        ['blank actor manifest', diagnostic([receipt(0), receipt(1)], snapshot(), { requested_formations: [''] }), 'invalid_actor_manifest'],
        ['blank receipt actor', diagnostic([{ ...receipt(0), formation_id: '' }, receipt(1)]), 'invalid_receipt_schema'],
        ['nonstring receipt actor', diagnostic([{ ...receipt(0), formation_id: false }, receipt(1)]), 'invalid_receipt_schema'],
        ['blank terminal actor', { ...diagnostic([receipt(0), receipt(1)]), terminal_receipts: [{ ...diagnostic([], snapshot()).terminal_receipts[0], formation_id: '' }] }, 'invalid_terminal_receipt'],
        ['nonstring terminal actor', { ...diagnostic([receipt(0), receipt(1)]), terminal_receipts: [{ ...diagnostic([], snapshot()).terminal_receipts[0], formation_id: false }] }, 'invalid_terminal_receipt'],
        ['blank manifest phase name', { ...diagnostic([receipt(0), receipt(1)]), phase_manifest: [{ ...manifest[0], phase_name: '' }, manifest[1]] }, 'invalid_phase_manifest'],
        ['nonstring manifest phase name', { ...diagnostic([receipt(0), receipt(1)]), phase_manifest: [{ ...manifest[0], phase_name: 7 }, manifest[1]] }, 'invalid_phase_manifest'],
        ['nonstring receipt phase name', diagnostic([{ ...receipt(0), phase_name: 7 }, receipt(1)]), 'invalid_receipt_schema'],
        ['nonstring receipt phase group', diagnostic([{ ...receipt(0), phase_group: 7 }, receipt(1)]), 'invalid_receipt_schema'],
        ['nonstring receipt disposition', diagnostic([{ ...receipt(0), disposition: 7 }, receipt(1)]), 'invalid_receipt_schema'],
    ])('rejects primitive boundary defect: %s', (_label, payload, reason) => {
        const result = run(payload);
        expect(result.exit).toBe(1);
        expect(result.report.inconsistencies).toContainEqual(expect.objectContaining({ reason }));
    });
    it.each([
        ['missing diagnostics', undefined, 'missing_expected_boundary'],
        ['empty/unconfigured', diagnostic([], snapshot(), { selector_configured: false, requested_formations: [], phase_manifest: [], terminal_receipts: [] }), 'unconfigured_diagnostic'],
        ['empty configured manifest', diagnostic([], snapshot(), { phase_manifest: [], terminal_receipts: [{ completed_turn: 21, phase_index: 0, formation_id: 'actor', before: snapshot(), after: snapshot() }] }), 'invalid_phase_manifest'],
        ['missing interleaved phase', diagnostic([receipt(0)]), 'missing_phase_receipt'],
        ['duplicate index', diagnostic([receipt(0), receipt(0)]), 'duplicate_actor_turn_phase_index'],
        ['duplicate weekly diagnostic', [diagnostic([receipt(0), receipt(1)]), diagnostic([receipt(0), receipt(1)])], 'duplicate_actor_turn_diagnostic'],
        ['index order', diagnostic([receipt(1), receipt(0)]), 'phase_order_mismatch'],
        ['malformed nested', diagnostic([receipt(0, snapshot(), { ...snapshot(), movement_order: value({ destination_sids: ['B'], invented: true }) }), receipt(1)]), 'invalid_receipt_schema'],
        ['interleaved discontinuity', diagnostic([receipt(0), receipt(1, snapshot('X'))]), 'non_continuous_boundary'],
        ['final gap', diagnostic([receipt(0), receipt(1)], snapshot('X')), 'terminal_discontinuity'],
        ['removed terminal actor', diagnostic([receipt(0), receipt(1)], { formation: absent(), movement_state: absent(), movement_order: absent() } as unknown as ReturnType<typeof snapshot>), 'terminal_actor_not_active'],
        ['contradictory skip', diagnostic([receipt(0, snapshot(), snapshot(), { disposition: 'skipped', skip_reason: null }), receipt(1)]), 'disposition_contradiction'],
    ])('fails closed for %s', (_label, payload, reason) => {
        const result = run(payload);
        expect(result.exit).toBe(1);
        expect(result.report.inconsistencies).toContainEqual(expect.objectContaining({ reason }));
    });
});
