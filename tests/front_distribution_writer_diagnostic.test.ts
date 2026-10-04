import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { distributeBrigadesToFront } from '../src/sim/combat/brigade_front_distribution.js';
import { attachFrontDistributionDiagnosticsToWeeklyReport, buildWeeklyReport } from '../src/scenario/scenario_reporting.js';
import { resetMovementPhaseSelectorCacheForTests } from '../src/sim/combat/movement_phase_diagnostic.js';
import { setSpatialContextCache } from '../src/sim/turn_pipeline_types.js';
import { warPhases } from '../src/sim/turn_phases/war_phases.js';
import { warPhaseReconciliationSteps } from '../src/sim/turn_phases/war_phase_reconciliation_steps.js';
import type { CorpsFrontSector, GameState } from '../src/state/game_state.js';

const savedTopics = process.env.AWWV_DEBUG_REASON_CODES;
const savedActors = process.env.AWWV_DEBUG_MOVEMENT_FORMATIONS;
const TMP = join(process.cwd(), '.tmp_front_distribution_writer');

afterEach(() => {
    if (savedTopics === undefined) delete process.env.AWWV_DEBUG_REASON_CODES;
    else process.env.AWWV_DEBUG_REASON_CODES = savedTopics;
    if (savedActors === undefined) delete process.env.AWWV_DEBUG_MOVEMENT_FORMATIONS;
    else process.env.AWWV_DEBUG_MOVEMENT_FORMATIONS = savedActors;
    resetMovementPhaseSelectorCacheForTests();
    rmSync(TMP, { recursive: true, force: true });
});

function fixture(): { state: GameState; sectors: CorpsFrontSector[]; adjacency: Map<string, string[]> } {
    const state = {
        schema_version: 1,
        meta: { turn: 21, phase: 'war', seed: 'front-writer' },
        factions: [],
        military: {
            formations: {
                actor: { id: 'actor', name: 'Actor', faction: 'RS', kind: 'brigade', status: 'active', created_turn: 1, assignment: null, corps_id: 'test_corps', location_osid: 'rear', home_osid: 'rear', personnel: 1000, readiness: 'active', cohesion: 70, morale: 70, entrenchment_turns: 0, disrupted_turns: 0 },
            },
            front_segments: {}, front_posture: {}, front_posture_regions: {}, front_pressure: {}, militia_pools: {},
            brigade_movement_orders: {},
        },
        political: { political_controllers: { rear: 'RS', mid: 'RS', front_a: 'RS', front_b: 'RS' } },
        displacement: {},
    } as unknown as GameState;
    const sectors = [{
        sector_id: 'sector:test', corps_id: 'test_corps', faction: 'RS',
        assigned_brigade_ids: ['actor'], reserve_brigade_ids: [], rear_brigade_ids: [],
        territory_osids: ['rear', 'front_a', 'front_b'],
        sub_segments: [{ sub_segment_id: 'sub:test', friendly_osids: ['front_a', 'front_b'], enemy_osids: ['enemy'], primary_brigade_ids: ['actor'], edge_ids: [], length_edges: 2 }],
    }] as unknown as CorpsFrontSector[];
    return { state, sectors, adjacency: new Map([['rear', ['mid']], ['mid', ['rear', 'front_a']], ['front_a', ['mid', 'front_b']], ['front_b', ['front_a']]]) };
}

describe('front-distribution writer diagnostics', () => {
    it('is absent when disabled and records the real pre-write Phase B choice when enabled', () => {
        const off = fixture();
        delete process.env.AWWV_DEBUG_REASON_CODES;
        process.env.AWWV_DEBUG_MOVEMENT_FORMATIONS = 'actor';
        resetMovementPhaseSelectorCacheForTests();
        expect(distributeBrigadesToFront(off.state, off.sectors, off.adjacency)).toBeUndefined();

        const on = fixture();
        process.env.AWWV_DEBUG_REASON_CODES = 'front_distribution';
        resetMovementPhaseSelectorCacheForTests();
        const diagnostics = distributeBrigadesToFront(on.state, on.sectors, on.adjacency, {
            diagnosticCallsite: 'distribute-brigades-to-front', completedTurn: 21, invocationOrdinal: 0,
        });
        expect(on.state).toEqual(off.state);
        expect(diagnostics).toMatchObject({ topic: 'front_distribution', selector_configured: true, requested_formations: ['actor'], causal_proof: false });
        expect(diagnostics?.invocations).toHaveLength(1);
        expect(diagnostics?.writes).toHaveLength(1);
        expect(diagnostics?.writes[0]).toMatchObject({
            helper: 'main_phase_b', action_kind: 'column_order', formation_id: 'actor', boundary: 'pre_write', target_osid: 'front_a', distance: 2,
        });
        expect(diagnostics?.writes[0]?.candidate_ids).toEqual(['actor']);
        expect(diagnostics?.writes[0]?.target_ids).toEqual(['front_a', 'front_b']);
        expect(diagnostics?.invocations[0]).toMatchObject({ formation_id: 'actor', write_count: 1, wrote_helpers: ['main_phase_b'] });
    });

    it('fails closed with structured inconsistencies for incomplete calls and malformed receipt/schema entries', () => {
        process.env.AWWV_DEBUG_REASON_CODES = 'front_distribution';
        process.env.AWWV_DEBUG_MOVEMENT_FORMATIONS = 'actor';
        resetMovementPhaseSelectorCacheForTests();
        const f = fixture();
        const diagnostics = distributeBrigadesToFront(f.state, f.sectors, f.adjacency, {
            diagnosticCallsite: 'final-distribute-brigades-to-front', completedTurn: 21, invocationOrdinal: 1,
        })!;
        const row = buildWeeklyReport(f.state);
        attachFrontDistributionDiagnosticsToWeeklyReport(row, diagnostics);
        mkdirSync(TMP, { recursive: true });
        const reject = (candidate: unknown, message: string) => {
            writeFileSync(join(TMP, 'weekly_report.jsonl'), `${JSON.stringify(candidate)}\n`);
            const result = spawnSync(process.execPath, ['tools/diagnostics/front_distribution_writer_coverage.cjs', TMP, '--expect-boundary', 'actor:21', '--json'], { cwd: process.cwd(), encoding: 'utf8' });
            expect(result.status).toBe(1);
            const parsed = JSON.parse(result.stdout) as { inconsistencies: string[] };
            expect(parsed.inconsistencies.some((entry) => entry.includes(message))).toBe(true);
        };
        reject(row, 'production call sequence');
        expect(diagnostics.invocations[0]).toMatchObject({ callsite: 'final-distribute-brigades-to-front', invocation_ordinal: 1 });
        writeFileSync(join(TMP, 'weekly_report.jsonl'), `${JSON.stringify(row)}\n`);
        expect(spawnSync(process.execPath, ['tools/diagnostics/front_distribution_writer_coverage.cjs', TMP, '--json'], { cwd: process.cwd() }).status).toBe(2);
        const malformed = structuredClone(row) as any;
        malformed.front_distribution_diagnostics.invocations[0].formation_id = 737;
        reject(malformed, 'invalid invocation receipt');
        const nullInvocation = structuredClone(row) as any;
        nullInvocation.front_distribution_diagnostics.invocations.push(null);
        reject(nullInvocation, 'invalid invocation receipt');
        const primitiveWrite = structuredClone(row) as any;
        primitiveWrite.front_distribution_diagnostics.writes.push(737);
        reject(primitiveWrite, 'invalid write receipt');
        const malformedSnapshot = structuredClone(row) as any;
        malformedSnapshot.front_distribution_diagnostics.invocations[0].before_invocation.movement_state = { presence: 'present_value', value: { status: 737 } };
        reject(malformedSnapshot, 'invalid invocation receipt');
        const malformedStance = structuredClone(row) as any;
        malformedStance.front_distribution_diagnostics.writes[0].before.movement_order = { presence: 'present_value', value: { destination_sids: ['front_a'], stance: 737 } };
        reject(malformedStance, 'invalid write receipt');
        const malformedTurns = structuredClone(row) as any;
        malformedTurns.front_distribution_diagnostics.writes[0].before.movement_state = { presence: 'present_value', value: { status: 'packing', turns_remaining: '2' } };
        reject(malformedTurns, 'invalid write receipt');
        const missingOrderDestination = structuredClone(row) as any;
        missingOrderDestination.front_distribution_diagnostics.writes[0].before.movement_order = { presence: 'present_value', value: { stance: 'column' } };
        reject(missingOrderDestination, 'invalid write receipt');
        const malformedCandidates = structuredClone(row) as any;
        malformedCandidates.front_distribution_diagnostics.writes[0].candidate_ids = ['actor', 737];
        reject(malformedCandidates, 'invalid write receipt');
        const missingLinkage = structuredClone(row) as any;
        missingLinkage.front_distribution_diagnostics.writes[0].candidate_ids = ['someone_else'];
        reject(missingLinkage, 'candidate linkage');
        const missingFeatures = structuredClone(row) as any;
        missingFeatures.front_distribution_diagnostics.writes[0].feature_inputs = {};
        reject(missingFeatures, 'helper feature inputs');
        const malformedObjectBoundaries: Array<[string, (candidate: any) => void, string]> = [
            ['missing feature inputs', (candidate) => { delete candidate.front_distribution_diagnostics.writes[0].feature_inputs; }, 'invalid write receipt'],
            ['null feature inputs', (candidate) => { candidate.front_distribution_diagnostics.writes[0].feature_inputs = null; }, 'invalid write receipt'],
            ['primitive feature inputs', (candidate) => { candidate.front_distribution_diagnostics.writes[0].feature_inputs = 737; }, 'invalid write receipt'],
            ['null invocation snapshot', (candidate) => { candidate.front_distribution_diagnostics.invocations[0].before_invocation = null; }, 'invalid invocation receipt'],
            ['primitive write snapshot', (candidate) => { candidate.front_distribution_diagnostics.writes[0].before = 'bad'; }, 'invalid write receipt'],
            ['null roster', (candidate) => { candidate.front_distribution_diagnostics.writes[0].before.roster = null; }, 'invalid write receipt'],
            ['primitive formation presence', (candidate) => { candidate.front_distribution_diagnostics.writes[0].before.formation = 737; }, 'invalid write receipt'],
            ['null movement state presence', (candidate) => { candidate.front_distribution_diagnostics.writes[0].before.movement_state = null; }, 'invalid write receipt'],
            ['primitive target pool', (candidate) => { candidate.front_distribution_diagnostics.writes[0].target_ids = 737; }, 'invalid write receipt'],
        ];
        for (const [, mutate, message] of malformedObjectBoundaries) {
            const candidate = structuredClone(row) as any;
            mutate(candidate);
            reject(candidate, message);
        }
        const mixedFeatures = structuredClone(row) as any;
        mixedFeatures.front_distribution_diagnostics.writes[0].feature_inputs.mixed = ['x', 1];
        reject(mixedFeatures, 'invalid write receipt');
        writeFileSync(join(TMP, 'weekly_report.jsonl'), `${JSON.stringify(row).replace('"distance_weight":0.3', '"distance_weight":1e999')}\n`);
        const nonFinite = spawnSync(process.execPath, ['tools/diagnostics/front_distribution_writer_coverage.cjs', TMP, '--expect-boundary', 'actor:21', '--json'], { cwd: process.cwd(), encoding: 'utf8' });
        expect(nonFinite.status).toBe(1);
        expect(JSON.parse(nonFinite.stdout).inconsistencies.some((entry: string) => entry.includes('invalid write receipt'))).toBe(true);
        writeFileSync(join(TMP, 'weekly_report.jsonl'), '21\n');
        const primitiveRow = spawnSync(process.execPath, ['tools/diagnostics/front_distribution_writer_coverage.cjs', TMP, '--expect-boundary', 'actor:21', '--json'], { cwd: process.cwd(), encoding: 'utf8' });
        expect(primitiveRow.status).toBe(1);
        expect(JSON.parse(primitiveRow.stdout).inconsistencies).toContain('invalid weekly row schema');
    });

    it('reports enabled but unconfigured selection without actor receipts', () => {
        process.env.AWWV_DEBUG_REASON_CODES = 'front_distribution';
        delete process.env.AWWV_DEBUG_MOVEMENT_FORMATIONS;
        resetMovementPhaseSelectorCacheForTests();
        const f = fixture();
        const diagnostics = distributeBrigadesToFront(f.state, f.sectors, f.adjacency)!;
        expect(diagnostics).toEqual({ topic: 'front_distribution', selector_configured: false, requested_formations: [], causal_proof: false, invocations: [], writes: [] });
    });

    it('binds invocation receipts to both actual production phase callsites in order', async () => {
        process.env.AWWV_DEBUG_MOVEMENT_FORMATIONS = 'actor,actor2';
        const invoke = async (enabled: boolean) => {
            if (enabled) process.env.AWWV_DEBUG_REASON_CODES = 'front_distribution'; else delete process.env.AWWV_DEBUG_REASON_CODES;
            resetMovementPhaseSelectorCacheForTests();
            const f = fixture();
            f.state.military.formations.actor2 = { ...(f.state.military.formations.actor as any), id: 'actor2', name: 'Actor 2' };
            (f.sectors[0] as any).assigned_brigade_ids = ['actor', 'actor2'];
            (f.sectors[0] as any).territory_osids = ['rear', 'mid', 'front_a', 'front_b'];
            (f.sectors[0] as any).sub_segments[0].primary_brigade_ids = ['actor', 'actor2'];
            (f.state.military as any).corps_front_sectors = { test: f.sectors[0] };
            const context = { state: f.state, input: { seed: 'front-writer' }, report: { seed: 'front-writer', phases: [] }, rng: () => 0.5 } as any;
            setSpatialContextCache(context, { preCombat: { adjacency: f.adjacency, sharedBoundaryAdjacency: new Map(), friendlyOsidsByFaction: new Map(), componentsByFaction: new Map(), frontEdgesOsid: undefined, computedAtTurn: 21, phase: 'pre-combat' } } as any);
            await warPhases.find((phase) => phase.name === 'distribute-brigades-to-front')!.run(context);
            await warPhaseReconciliationSteps.find((phase) => phase.name === 'final-distribute-brigades-to-front')!.run(context);
            return context;
        };
        const off = await invoke(false);
        expect(Object.prototype.hasOwnProperty.call(off.report, 'front_distribution_diagnostics')).toBe(false);
        const on = await invoke(true);
        expect(on.state).toEqual(off.state);
        const ordinaryReport = { ...on.report };
        delete ordinaryReport.front_distribution_diagnostics;
        expect(ordinaryReport).toEqual(off.report);
        expect(on.report.front_distribution_diagnostics.invocations.map((receipt: any) => [receipt.callsite, receipt.invocation_ordinal, receipt.formation_id])).toEqual([
            ['distribute-brigades-to-front', 0, 'actor'],
            ['distribute-brigades-to-front', 0, 'actor2'],
            ['final-distribute-brigades-to-front', 1, 'actor'],
            ['final-distribute-brigades-to-front', 1, 'actor2'],
        ]);
        expect(on.report.front_distribution_diagnostics.writes.filter((write: any) => write.invocation_ordinal === 0).map((write: any) => write.write_ordinal)).toEqual([0, 1, 2]);
        expect(on.report.front_distribution_diagnostics.writes.filter((write: any) => write.invocation_ordinal === 1).map((write: any) => write.write_ordinal)).toEqual([0, 1]);
        const row = buildWeeklyReport(on.state);
        attachFrontDistributionDiagnosticsToWeeklyReport(row, on.report.front_distribution_diagnostics);
        mkdirSync(TMP, { recursive: true });
        writeFileSync(join(TMP, 'weekly_report.jsonl'), `${JSON.stringify(row)}\n`);
        const result = spawnSync(process.execPath, ['tools/diagnostics/front_distribution_writer_coverage.cjs', TMP, '--expect-boundary', 'actor:21', '--expect-boundary', 'actor2:21', '--json'], { cwd: process.cwd(), encoding: 'utf8' });
        expect(result.status).toBe(0);
        expect(JSON.parse(result.stdout)).toEqual(expect.objectContaining({ inconsistencies: [], missing_expected_boundaries: [], invocations: 4, writes: 5 }));
        const rejectProduction = (mutate: (candidate: any) => void, message: string) => {
            const candidate = structuredClone(row) as any;
            mutate(candidate.front_distribution_diagnostics);
            writeFileSync(join(TMP, 'weekly_report.jsonl'), `${JSON.stringify(candidate)}\n`);
            const rejected = spawnSync(process.execPath, ['tools/diagnostics/front_distribution_writer_coverage.cjs', TMP, '--expect-boundary', 'actor:21', '--expect-boundary', 'actor2:21', '--json'], { cwd: process.cwd(), encoding: 'utf8' });
            expect(rejected.status).toBe(1);
            expect(JSON.parse(rejected.stdout).inconsistencies.some((entry: string) => entry.includes(message))).toBe(true);
        };
        rejectProduction((d) => { d.invocations.reverse(); }, 'production call sequence');
        rejectProduction((d) => { for (const receipt of d.invocations.filter((item: any) => item.invocation_ordinal === 1)) receipt.invocation_ordinal = 2; for (const write of d.writes.filter((item: any) => item.invocation_ordinal === 1)) write.invocation_ordinal = 2; }, 'production call sequence');
        rejectProduction((d) => { d.invocations.push(structuredClone(d.invocations[0])); }, 'duplicate invocation');
        rejectProduction((d) => { for (const receipt of d.invocations) receipt.callsite = 'direct-call'; for (const write of d.writes) write.callsite = 'direct-call'; }, 'production call sequence');
        rejectProduction((d) => { d.writes[1].write_ordinal = 0; }, 'invocation write ordinals');
    });

    it('captures the other five real column-order writer helpers without changing their choices', () => {
        process.env.AWWV_DEBUG_REASON_CODES = 'front_distribution';
        process.env.AWWV_DEBUG_MOVEMENT_FORMATIONS = 'actor';
        const run = (f: ReturnType<typeof fixture>, options: Record<string, unknown> = {}) => {
            resetMovementPhaseSelectorCacheForTests();
            const before = structuredClone(f.state);
            delete process.env.AWWV_DEBUG_REASON_CODES; resetMovementPhaseSelectorCacheForTests();
            distributeBrigadesToFront(before, f.sectors, f.adjacency, options);
            process.env.AWWV_DEBUG_REASON_CODES = 'front_distribution'; resetMovementPhaseSelectorCacheForTests();
            const diagnostics = distributeBrigadesToFront(f.state, f.sectors, f.adjacency, options)!;
            expect(f.state).toEqual(before);
            const found = diagnostics.writes.find((write) => write.formation_id === 'actor' && write.action_kind === 'column_order');
            if (!found) throw new Error(`missing actor column write: ${JSON.stringify(diagnostics.writes)}`);
            return found;
        };

        const rear = fixture();
        rear.state.military.formations.aaa_anchor = { ...(rear.state.military.formations.actor as any), id: 'aaa_anchor' };
        rear.state.military.formations.front_guard = { ...(rear.state.military.formations.actor as any), id: 'front_guard', location_osid: 'front_a' };
        (rear.state.military.formations.actor as any).location_osid = 'rear';
        (rear.state.military.formations.aaa_anchor as any).location_osid = 'rear';
        (rear.sectors[0] as any).assigned_brigade_ids = ['front_guard'];
        (rear.sectors[0] as any).rear_brigade_ids = ['aaa_anchor', 'actor'];
        (rear.sectors[0] as any).sub_segments[0].primary_brigade_ids = ['front_guard'];
        (rear.sectors[0] as any).sub_segments[0].friendly_osids = ['front_a'];
        (rear.sectors[0] as any).territory_osids = ['rear', 'rear_2', 'front_a'];
        (rear.state.political as any).political_controllers.rear_2 = 'RS';
        (rear.state.political as any).political_controllers.mid = 'RS';
        rear.adjacency = new Map([['rear', ['mid']], ['mid', ['rear', 'rear_2']], ['rear_2', ['mid']]]);
        expect(run(rear).helper).toBe('rear_stack_dispersion');

        const reserve = fixture();
        reserve.state.military.formations.front_guard = { ...(reserve.state.military.formations.actor as any), id: 'front_guard', location_osid: 'front_a', entrenchment_turns: 12 };
        (reserve.sectors[0] as any).assigned_brigade_ids = ['front_guard'];
        (reserve.sectors[0] as any).reserve_brigade_ids = ['actor'];
        (reserve.sectors[0] as any).threat_ratio = 2.2;
        (reserve.sectors[0] as any).sub_segments[0].primary_brigade_ids = ['front_guard'];
        (reserve.sectors[0] as any).sub_segments[0].friendly_osids = ['front_a'];
        expect(run(reserve, { enableStandingOgReserveCommit: true }).helper).toBe('threatened_reserve_commit');

        const gap = fixture();
        (gap.sectors[0] as any).assigned_brigade_ids = [];
        (gap.sectors[0] as any).reserve_brigade_ids = ['actor'];
        (gap.sectors[0] as any).sub_segments[0].primary_brigade_ids = [];
        expect(run(gap).helper).toBe('empty_front_subsegment_fill');

        const shared = fixture();
        shared.state.military.formations.other = { ...(shared.state.military.formations.actor as any), id: 'other', location_osid: 'front_a', personnel: 2000 };
        (shared.state.military.formations.actor as any).location_osid = 'front_a';
        (shared.state.military.formations.actor as any).entrenchment_turns = 12;
        const second = structuredClone(shared.sectors[0]) as any;
        second.sector_id = 'sector:second'; second.assigned_brigade_ids = ['other']; second.sub_segments[0].primary_brigade_ids = ['other'];
        (shared.sectors[0] as any).assigned_brigade_ids = ['actor']; (shared.sectors[0] as any).sub_segments[0].primary_brigade_ids = ['actor'];
        shared.sectors.push(second);
        shared.adjacency = new Map([['front_a', ['mid']], ['mid', ['front_a', 'front_b']], ['front_b', ['mid']]]);
        expect(run(shared).helper).toBe('shared_front_stack_deconflict');

        const garrison = fixture();
        (garrison.state.military as any).must_hold_osids_by_corps = { test_corps: ['front_a'] };
        (garrison.sectors[0] as any).assigned_brigade_ids = [];
        (garrison.sectors[0] as any).sub_segments = [];
        expect(run(garrison).helper).toBe('must_hold_garrison_pin');
    });
});
