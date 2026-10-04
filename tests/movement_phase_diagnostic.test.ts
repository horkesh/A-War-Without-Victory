import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { attachMovementPhaseDiagnosticsToWeeklyReport, buildWeeklyReport } from '../src/scenario/scenario_reporting.js';
import { createMovementPhaseObserver, resetMovementPhaseSelectorCacheForTests } from '../src/sim/combat/movement_phase_diagnostic.js';
import type { MovementPhaseDiagnostics } from '../src/sim/combat/movement_phase_diagnostic.js';
import { runNamedPhase, runTurn } from '../src/sim/turn_pipeline.js';
import { warPhases } from '../src/sim/turn_phases/war_phases.js';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';

const savedTopics = process.env.AWWV_DEBUG_REASON_CODES;
const savedFormations = process.env.AWWV_DEBUG_MOVEMENT_FORMATIONS;
const TMP = join(process.cwd(), '.tmp_movement_phase_serialization');
afterEach(() => {
    rmSync(TMP, { recursive: true, force: true });
    if (savedTopics === undefined) delete process.env.AWWV_DEBUG_REASON_CODES; else process.env.AWWV_DEBUG_REASON_CODES = savedTopics;
    if (savedFormations === undefined) delete process.env.AWWV_DEBUG_MOVEMENT_FORMATIONS; else process.env.AWWV_DEBUG_MOVEMENT_FORMATIONS = savedFormations;
    resetMovementPhaseSelectorCacheForTests();
});

function state(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 20, seed: 'movement-observer', phase: 'war', recruitment_mode: 'bottom_up', referendum_held: true, referendum_turn: 6, war_start_turn: 10 },
        factions: [
            { id: 'RBiH', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: {
            formations: { actor: { id: 'actor', faction: 'RBiH', name: 'Actor', created_turn: 1, status: 'active', assignment: null, kind: 'brigade', location_osid: 'A', corps_id: null, personnel: 1200, readiness: 'active', cohesion: 70, morale: 70, home_osid: 'A' } },
            front_segments: {}, front_posture: {}, front_posture_regions: {}, front_pressure: {}, militia_pools: {},
            brigade_movement_state: { actor: { status: 'packing', destination_sids: ['B'], owner: 'bot_discretionary' } },
            brigade_movement_orders: { actor: { destination_sids: ['B'], owner: 'bot_discretionary' } },
        } as any,
        political: { political_controllers: { A: 'RBiH', B: 'RBiH' } } as any,
        displacement: {} as any,
    };
}
function enable(selector = 'actor'): void {
    process.env.AWWV_DEBUG_REASON_CODES = 'movement_phase';
    process.env.AWWV_DEBUG_MOVEMENT_FORMATIONS = selector;
    resetMovementPhaseSelectorCacheForTests();
}

describe('movement phase diagnostic correction', () => {
    it('does no observer work and emits no report key when default-off', async () => {
        delete process.env.AWWV_DEBUG_REASON_CODES;
        process.env.AWWV_DEBUG_MOVEMENT_FORMATIONS = 'actor';
        resetMovementPhaseSelectorCacheForTests();
        expect(createMovementPhaseObserver()).toBeUndefined();
        const off = await runTurn(state(), { seed: 'movement-observer', settlementEdges: [{ a: 'A', b: 'B' }] });
        expect(off.report.movement_phase_diagnostics).toBeUndefined();
    });

    it('records every wrapper phase, duplicate names by index, skips, and a fresh terminal snapshot', async () => {
        enable();
        const fixture = state();
        const report = { seed: 'synthetic', phases: [] } as any;
        const context = { state: fixture, input: { seed: 'synthetic' }, report, rng: (() => { throw new Error('rng'); }) as never };
        const observer = createMovementPhaseObserver()!;
        await runNamedPhase(context, { name: 'duplicate', run: () => { fixture.military.brigade_movement_orders!.actor.destination_sids = ['C']; } }, 'war', observer);
        await runNamedPhase(context, { name: 'duplicate', skipIf: [() => 'fixture_skip'], run: () => { throw new Error('must skip'); } }, 'early-war', observer);
        observer.terminalBoundary(fixture, report.phases.length);
        const d = observer.finish();
        expect(d.phase_manifest).toEqual([
            { phase_index: 0, phase_name: 'duplicate', phase_group: 'war' },
            { phase_index: 1, phase_name: 'duplicate', phase_group: 'early-war' },
        ]);
        expect(d.receipts.map((r) => [r.phase_index, r.disposition])).toEqual([[0, 'executed'], [1, 'skipped']]);
        expect(d.terminal_receipts[0].before).toEqual(d.terminal_receipts[0].after);
        expect(d.terminal_receipts[0].before).toEqual(d.receipts[1].after);
    });

    it('distinguishes absent, undefined, null, and value and detaches removal snapshots', async () => {
        enable('actor,missing');
        const fixture = state();
        (fixture.military.formations.actor as any).location_osid = undefined;
        (fixture.military.brigade_movement_state as any).actor = null;
        (fixture.military.brigade_movement_orders as any).actor = undefined;
        const report = { seed: 'presence', phases: [] } as any;
        const observer = createMovementPhaseObserver()!;
        await runNamedPhase({ state: fixture, input: { seed: 'presence' }, report, rng: (() => { throw new Error('rng'); }) as never }, { name: 'remove', run: () => { delete fixture.military.formations.actor; } }, 'war', observer);
        observer.terminalBoundary(fixture, 1);
        const receipts = observer.finish().receipts;
        const actor = receipts.find((r) => r.formation_id === 'actor')!;
        const missing = receipts.find((r) => r.formation_id === 'missing')!;
        expect((actor.before.formation as any).value.location_osid).toEqual({ presence: 'present_undefined' });
        expect(actor.before.movement_state).toEqual({ presence: 'present_null' });
        expect(actor.before.movement_order).toEqual({ presence: 'present_undefined' });
        expect(actor.after.formation).toEqual({ presence: 'absent' });
        expect(missing.before.formation).toEqual({ presence: 'absent' });
    });

    it('proves a real apply-brigade-movement mutation and complete runTurn/weekly neutrality', async () => {
        const input = { seed: 'movement-observer', settlementEdges: [{ a: 'A', b: 'B' }], operationalData: { opData: { canonicalToOperational: { A: 'A', B: 'B' }, operationalToCanonical: new Map([['A', ['A']], ['B', ['B']]]) }, edges: [{ a: 'A', b: 'B' }], centroids: new Map() } } as any;
        delete process.env.AWWV_DEBUG_REASON_CODES; resetMovementPhaseSelectorCacheForTests();
        const off = await runTurn(state(), input);
        enable();
        const on = await runTurn(state(), input);
        expect(off.status).toBe('success');
        expect(on.status).toBe('success');
        expect(on.nextState).toEqual(off.nextState);
        const ordinaryReport = { ...on.report } as any;
        const diagnostics = ordinaryReport.movement_phase_diagnostics as MovementPhaseDiagnostics; delete ordinaryReport.movement_phase_diagnostics;
        expect(ordinaryReport).toEqual(off.report);
        expect(diagnostics.phase_manifest).toEqual(on.report.phases.map((p, phase_index) => ({ phase_index, phase_name: p.name, phase_group: phase_index < warPhases.length ? 'war' : 'early-war' })));
        expect(diagnostics.phase_manifest.some((p) => p.phase_group === 'early-war')).toBe(true);
        expect(diagnostics.receipts).toHaveLength(diagnostics.phase_manifest.length);
        const moveIndex = on.report.phases.findIndex((p) => p.name === 'apply-brigade-movement');
        const move = diagnostics.receipts.find((r) => r.phase_index === moveIndex)!;
        expect(move.disposition).toBe('executed');
        expect((move.before.formation as any).value.location_osid).toEqual({ presence: 'present_value', value: 'A' });
        expect((move.before.movement_order as any).value.destination_sids).toEqual(['B']);
        expect((move.after.formation as any).value.location_osid).toEqual({ presence: 'present_value', value: 'B' });
        expect(move.after.movement_order).toEqual({ presence: 'absent' });
        expect(diagnostics.terminal_receipts[0].before).toEqual(diagnostics.receipts.at(-1)!.after);
        const offRow = buildWeeklyReport(off.nextState);
        const onRow = buildWeeklyReport(on.nextState); attachMovementPhaseDiagnosticsToWeeklyReport(onRow, diagnostics);
        const ordinaryRow = { ...onRow } as any; delete ordinaryRow.movement_phase_diagnostics;
        expect(ordinaryRow).toEqual(offRow);
        mkdirSync(TMP, { recursive: true }); writeFileSync(join(TMP, 'weekly_report.jsonl'), `${JSON.stringify(onRow)}\n`);
        const reader = JSON.parse(execFileSync(process.execPath, ['tools/diagnostics/movement_phase_coverage.cjs', TMP, '--expect-boundary', `actor:${on.nextState.meta.turn}`, '--json'], { cwd: process.cwd(), encoding: 'utf8' }));
        expect(reader).toEqual(expect.objectContaining({ causal_proof: false, inconsistencies: [], missing_expected_boundaries: [] }));
    });
});
