import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FormationState, GameState } from '../src/state/game_state.js';
import { runNamedPhase, runTurn } from '../src/sim/turn_pipeline.js';
import { serializeState } from '../src/state/serialize.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { applyWiaTrickleback, reinforceBrigadesFromPools } from '../src/sim/formation_spawn.js';
import { reinforceFromStrategicReserves } from '../src/sim/combat/strategic_reserve.js';
import { applyFrontlineAttrition } from '../src/sim/combat/frontline_attrition.js';
import { runMoraleDrift } from '../src/sim/combat/morale_drift.js';
import {
    createPersonnelObserver,
    emitPersonnelWriterRecord,
    PERSONNEL_DIAGNOSTIC_PREFIX,
    resetPersonnelSelectorCacheForTests,
} from '../src/sim/combat/personnel_diagnostic.js';
import { resetMovementPhaseSelectorCacheForTests } from '../src/sim/combat/movement_phase_diagnostic.js';
import { resetReasonCodeTopicCacheForTests } from '../src/sim/combat/reason_code_debug.js';

function setObserver(topic?: string, selector?: string): void {
    if (topic === undefined) delete process.env.AWWV_DEBUG_REASON_CODES;
    else process.env.AWWV_DEBUG_REASON_CODES = topic;
    if (selector === undefined) delete process.env.AWWV_DEBUG_PERSONNEL_FORMATIONS;
    else process.env.AWWV_DEBUG_PERSONNEL_FORMATIONS = selector;
    resetReasonCodeTopicCacheForTests();
    resetMovementPhaseSelectorCacheForTests();
    resetPersonnelSelectorCacheForTests();
}

function state(personnel: unknown): GameState {
    return {
        meta: { turn: 22, phase: 'war', seed: 'personnel-test' },
        factions: [{ id: 'RS' }],
        military: { formations: { actor: { id: 'actor', faction: 'RS', name: 'Actor', kind: 'brigade', status: 'active', assignment: null, created_turn: 0, personnel } as FormationState } },
        political: { political_controllers: {} },
    } as unknown as GameState;
}

describe('personnel stdout diagnostics', () => {
    beforeEach(() => setObserver());
    afterEach(() => {
        vi.restoreAllMocks();
        delete process.env.AWWV_DEBUG_MOVEMENT_FORMATIONS;
        setObserver();
    });

    it('is default-off with no observer allocation or stdout write', () => {
        const sink = vi.spyOn(console, 'log');
        expect(createPersonnelObserver()).toBeUndefined();
        emitPersonnelWriterRecord('actor', { source: 'fixture', before: 1, after: 2 });
        expect(sink).not.toHaveBeenCalled();
    });

    it('uses its own selector and emits deterministic phase start/end/skip/terminal receipts with explicit presence', async () => {
        setObserver('personnel', ' missing, actor, actor ');
        const lines: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((line) => lines.push(String(line)));
        const fixture = state(1000);
        const observer = createPersonnelObserver()!;
        const report = { seed: 'personnel-test', phases: [] } as any;
        const context = { state: fixture, input: { seed: 'personnel-test' }, report, rng: (() => { throw new Error('rng'); }) as never };
        await runNamedPhase(context, { name: 'change', run: () => { fixture.military.formations.actor.personnel = 940; } }, 'war', undefined, observer);
        await runNamedPhase(context, { name: 'skip', skipIf: [() => 'fixture_skip'], run: () => { throw new Error('must not run'); } }, 'war', undefined, observer);
        observer.terminalBoundary(fixture, report.phases.length);

        const rows = lines.map((line) => JSON.parse(line.slice(PERSONNEL_DIAGNOSTIC_PREFIX.length + 1)));
        expect(rows.map((row) => row.event)).toEqual(['phase_start', 'phase_end', 'phase_start', 'phase_end', 'terminal']);
        expect(rows[0].actors).toEqual([
            { formation_id: 'actor', personnel: { presence: 'present_value', value: 1000 } },
            { formation_id: 'missing', personnel: { presence: 'formation_absent' } },
        ]);
        expect(rows[1]).toMatchObject({ disposition: 'executed', skip_reason: null, changes: [
            { formation_id: 'actor', before: { presence: 'present_value', value: 1000 }, after: { presence: 'present_value', value: 940 }, delta: -60 },
            { formation_id: 'missing', before: { presence: 'formation_absent' }, after: { presence: 'formation_absent' }, delta: null },
        ] });
        expect(rows[3]).toMatchObject({ disposition: 'skipped', skip_reason: 'fixture_skip' });
        expect(report).toEqual({ seed: 'personnel-test', phases: [{ name: 'change' }, { name: 'skip' }], phase_skip_diagnostics: [{ phase: 'war', step: 'skip', skip_reason: 'fixture_skip' }] });
    });

    it('marks undefined, null, and nonfinite personnel explicitly without inventing deltas', () => {
        setObserver('personnel', 'actor');
        const lines: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((line) => lines.push(String(line)));
        const absent = state(1);
        delete (absent.military.formations.actor as any).personnel;
        const formationUndefined = state(1);
        (formationUndefined.military.formations as any).actor = undefined;
        const formationNull = state(1);
        (formationNull.military.formations as any).actor = null;
        const fixtures = [formationUndefined, formationNull, absent, state(undefined), state(null), state(Number.NaN)];
        for (const fixture of fixtures) {
            const observer = createPersonnelObserver()!;
            const boundary = observer.beforePhase(fixture, 'presence', 0, 'war');
            observer.afterPhase(fixture, boundary, 'executed', null);
        }
        const ends = lines.filter((line) => line.includes('"event":"phase_end"')).map((line) => JSON.parse(line.slice(PERSONNEL_DIAGNOSTIC_PREFIX.length + 1)));
        expect(ends.map((row) => row.changes[0].before.presence)).toEqual([
            'formation_present_undefined', 'formation_present_null', 'personnel_absent',
            'present_undefined', 'present_null', 'present_nonfinite',
        ]);
        expect(ends.every((row) => row.changes[0].delta === null)).toBe(true);
    });

    it('propagates the original gameplay exception and emits no false phase completion', async () => {
        setObserver('personnel', 'actor');
        const lines: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((line) => lines.push(String(line)));
        const fixture = state(1000);
        const observer = createPersonnelObserver()!;
        const failure = new Error('gameplay failure');
        const context = { state: fixture, input: { seed: 'failure' }, report: { seed: 'failure', phases: [] }, rng: (() => { throw new Error('rng'); }) as never } as any;
        await expect(runNamedPhase(context, { name: 'throws', run: () => { throw failure; } }, 'war', undefined, observer)).rejects.toBe(failure);
        const rows = lines.map((line) => JSON.parse(line.slice(PERSONNEL_DIAGNOSTIC_PREFIX.length + 1)));
        expect(rows.map((row) => row.event)).toEqual(['phase_start']);
    });

    it('emits selected direct-writer operands/results and isolates serialization/stdout failures', () => {
        setObserver('personnel', 'actor');
        const lines: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((line) => lines.push(String(line)));
        emitPersonnelWriterRecord('actor', { source: 'formation_spawn.reinforce', before: 1000, transfer: 50, after: 1050, branch: 'regular' });
        emitPersonnelWriterRecord('other', { source: 'formation_spawn.reinforce', before: 1, after: 2 });
        expect(lines).toHaveLength(1);
        expect(JSON.parse(lines[0]!.slice(PERSONNEL_DIAGNOSTIC_PREFIX.length + 1))).toMatchObject({ event: 'writer', formation_id: 'actor', source: 'formation_spawn.reinforce', before: 1000, transfer: 50, after: 1050, branch: 'regular' });

        vi.restoreAllMocks();
        vi.spyOn(console, 'log').mockImplementation(() => { throw new Error('sink'); });
        expect(() => emitPersonnelWriterRecord('actor', { source: 'fixture', before: 1n, after: 2 })).not.toThrow();
    });

    it('emits from each bounded real personnel writer at the actual assignment', () => {
        setObserver('personnel', 'bottom,pool,enclave,reserve,wia,front,collapse,morale');
        const lines: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((line) => lines.push(String(line)));
        const brigade = (id: string, extra: Record<string, unknown> = {}) => ({ id, faction: 'RBiH', name: id, kind: 'brigade', status: 'active', assignment: null, created_turn: 0, personnel: 1000, cohesion: 60, morale: 60, location_osid: 'op:test:test_1', tags: ['mun:test'], ...extra });
        const base = (formations: Record<string, unknown>): GameState => ({
            meta: { turn: 10, phase: 'war', seed: 'writers', recruitment_mode: 'player_choice' }, factions: [{ id: 'RBiH' }, { id: 'RS' }],
            military: { formations, militia_pools: {}, brigade_encircled: {}, front_segments: {}, front_posture: {}, front_posture_regions: {}, front_pressure: {} } as any,
            political: { political_controllers: {} } as any,
        } as GameState);

        const poolState = base({ pool: brigade('pool') });
        poolState.military.militia_pools = { 'test:RBiH': { mun_id: 'test', faction: 'RBiH', available: 500, committed: 0, exhausted: 0, updated_turn: 10 } } as any;
        reinforceBrigadesFromPools(poolState);

        const bottomState = base({ bottom: brigade('bottom', { kind: 'militia', personnel: 400 }) });
        bottomState.meta.recruitment_mode = 'bottom_up';
        bottomState.military.militia_pools = { 'test:RBiH': { mun_id: 'test', faction: 'RBiH', available: 500, committed: 0, exhausted: 0, updated_turn: 10 } } as any;
        reinforceBrigadesFromPools(bottomState);

        const enclaveState = base({ enclave: brigade('enclave', { personnel: 300, location_osid: 'op:srebrenica:srebrenica_2', tags: ['mun:srebrenica', 'enclave'] }) });
        enclaveState.military.militia_pools = { 'srebrenica:RBiH': { mun_id: 'srebrenica', faction: 'RBiH', available: 1000, committed: 0, exhausted: 0, updated_turn: 10 } } as any;
        reinforceBrigadesFromPools(enclaveState);

        const reserveState = base({ reserve: brigade('reserve') });
        reserveState.military.strategic_reserves = { RBiH: 500 } as any;
        reinforceFromStrategicReserves(reserveState);

        const wiaState = base({ wia: brigade('wia', { wounded_pending: 100, posture: 'defend' }) });
        applyWiaTrickleback(wiaState);

        const frontState = base({ front: brigade('front', { personnel: 2000 }) });
        frontState.military.corps_front_sectors = { s: { sector_id: 's', corps_id: 'c', faction: 'RBiH', opposing_factions: ['RS'], territory_osids: ['op:test:test_1'], assigned_brigade_ids: ['front'], reserve_brigade_ids: [], rear_brigade_ids: [], length_edges: 1, sub_segments: [{ sub_segment_id: 'ss', friendly_osids: ['op:test:test_1'], enemy_osids: ['op:test:test_2'], edge_ids: [], primary_brigade_ids: ['front'], length_edges: 1 }] } } as any;
        applyFrontlineAttrition(frontState);

        const moraleState = base({ morale: brigade('morale', { personnel: 1000, morale: 5 }) });
        runMoraleDrift(moraleState, [], { test: { total: 100, bosniak: 0, serb: 100, croat: 0, other: 0 } });

        const collapseState = base({ collapse: brigade('collapse', { personnel: 1000, morale: 0 }) });
        runMoraleDrift(collapseState, [], { test: { total: 100, bosniak: 0, serb: 100, croat: 0, other: 0 } });

        const rows = lines.map((line) => JSON.parse(line.slice(PERSONNEL_DIAGNOSTIC_PREFIX.length + 1)));
        const row = (source: string, branch?: string) => rows.find((entry) => entry.source === source && (branch === undefined || entry.branch === branch));
        const bottom = row('formation_spawn.reinforce', 'bottom_up');
        expect(bottom).toMatchObject({ formation_id: 'bottom', before: 400, tier_cap: 500, pool_mun_id: 'test', pool_faction: 'RBiH', used_pocket_fallback: false });
        expect(bottom.after).toBe(bottom.before + bottom.transfer);
        const regular = rows.find((entry) => entry.source === 'formation_spawn.reinforce' && entry.branch === 'regular' && entry.formation_id === 'pool');
        expect(regular).toMatchObject({ before: 1000, cap: 3000, pool_key: 'test:RBiH' });
        expect(regular.after).toBe(regular.before + regular.transfer);
        const enclave = row('formation_spawn.reinforce', 'enclave');
        expect(enclave).toMatchObject({ formation_id: 'enclave', cap: 600, pool_key: 'srebrenica:RBiH' });
        expect(enclave.after).toBe(enclave.before + enclave.transfer);
        const reserve = row('strategic_reserve.reinforce');
        expect(reserve).toMatchObject({ formation_id: 'reserve', before: 1000, cap: 3000, reserve_faction: 'RBiH', reserve_before: 500 });
        expect(reserve.after).toBe(reserve.before + reserve.transfer);
        expect(reserve.reserve_after).toBe(reserve.reserve_before - reserve.transfer);
        const wia = row('formation_spawn.wia_trickleback');
        expect(wia).toMatchObject({ formation_id: 'wia', before: 1000, pending_before: 100, cap: 3000, returned: 80, after: 1080, pending_after: 20 });
        const front = row('frontline_attrition');
        expect(front).toMatchObject({ formation_id: 'front', before: 2000, faction_id: 'RBiH', sector_id: 's' });
        expect(front.after).toBe(front.before - front.casualties);
        const collapse = row('morale_drift.desertion', 'collapse');
        expect(collapse).toMatchObject({ formation_id: 'collapse', before: 1000, multiplier: 0.95, floor: 100, after: 950 });
        const low = row('morale_drift.desertion', 'low_morale');
        expect(low).toMatchObject({ formation_id: 'morale', before: 1000, multiplier: 0.98, floor: 100, after: 980 });
    });

    it('preserves full runTurn state, return/report, and serialized bytes with a throwing stdout sink', async () => {
        const runState = (): GameState => ({
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: { turn: 20, seed: 'personnel-real-entry', phase: 'war', recruitment_mode: 'player_choice', referendum_held: true, referendum_turn: 6, war_start_turn: 10 },
            factions: [
                { id: 'RBiH', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
                { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
                { id: 'HRHB', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            ],
            military: { formations: { actor: { id: 'actor', faction: 'RBiH', name: 'Actor', created_turn: 1, status: 'active', assignment: null, kind: 'brigade', location_osid: 'A', personnel: 1200, readiness: 'active', cohesion: 70, morale: 70, home_osid: 'A' } }, front_segments: {}, front_posture: {}, front_posture_regions: {}, front_pressure: {}, militia_pools: {} } as any,
            political: { political_controllers: { A: 'RBiH', B: 'RBiH' } } as any,
            displacement: {} as any,
        });
        const input = { seed: 'personnel-real-entry', settlementEdges: [{ a: 'A', b: 'B' }] } as any;
        setObserver(undefined, 'actor');
        const off = await runTurn(runState(), input);
        setObserver('personnel', 'actor');
        vi.spyOn(console, 'log').mockImplementation(() => { throw new Error('diagnostic sink'); });
        const on = await runTurn(runState(), input);
        expect(on).toEqual(off);
        expect(serializeState(on.nextState)).toBe(serializeState(off.nextState));
        expect(on.report).toEqual(off.report);
    });

    it('keeps movement diagnostics byte-for-byte stable while independently selecting personnel sources and writers', async () => {
        const runState = (): GameState => ({
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: { turn: 20, seed: 'selector-independence', phase: 'war', recruitment_mode: 'player_choice', referendum_held: true, referendum_turn: 6, war_start_turn: 10 },
            factions: [
                { id: 'RBiH', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
                { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
                { id: 'HRHB', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            ],
            military: {
                formations: {
                    abb: { id: 'abb', faction: 'RBiH', name: 'ABB', created_turn: 1, status: 'active', assignment: null, kind: 'brigade', location_osid: 'A', personnel: 1200, readiness: 'active', cohesion: 70, morale: 70, home_osid: 'A' },
                    rs4: { id: 'rs4', faction: 'RS', name: 'RS4', created_turn: 1, status: 'active', assignment: null, kind: 'brigade', location_osid: 'B', personnel: 900, wounded_pending: 100, posture: 'defend', readiness: 'active', cohesion: 70, morale: 70, home_osid: 'B' },
                },
                front_segments: {}, front_posture: {}, front_posture_regions: {}, front_pressure: {}, militia_pools: {},
                brigade_movement_state: { abb: { status: 'packing', destination_sids: ['B'], owner: 'bot_discretionary' } },
                brigade_movement_orders: { abb: { destination_sids: ['B'], owner: 'bot_discretionary' } },
            } as any,
            political: { political_controllers: { A: 'RBiH', B: 'RS' } } as any,
            displacement: {} as any,
        });
        const input = { seed: 'selector-independence', settlementEdges: [{ a: 'A', b: 'B' }] } as any;

        process.env.AWWV_DEBUG_REASON_CODES = 'movement_phase';
        process.env.AWWV_DEBUG_MOVEMENT_FORMATIONS = 'abb';
        process.env.AWWV_DEBUG_PERSONNEL_FORMATIONS = 'rs4';
        resetReasonCodeTopicCacheForTests();
        resetMovementPhaseSelectorCacheForTests();
        resetPersonnelSelectorCacheForTests();
        const movementOnly = await runTurn(runState(), input);

        process.env.AWWV_DEBUG_REASON_CODES = 'movement_phase,personnel';
        resetReasonCodeTopicCacheForTests();
        resetMovementPhaseSelectorCacheForTests();
        resetPersonnelSelectorCacheForTests();
        const lines: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((line) => lines.push(String(line)));
        const combined = await runTurn(runState(), input);

        expect(combined.report.movement_phase_diagnostics).toEqual(movementOnly.report.movement_phase_diagnostics);
        const rows = lines
            .filter((line) => line.startsWith(`${PERSONNEL_DIAGNOSTIC_PREFIX} `))
            .map((line) => JSON.parse(line.slice(PERSONNEL_DIAGNOSTIC_PREFIX.length + 1)));
        expect(rows.length).toBeGreaterThan(0);
        expect(rows.flatMap((row) => row.actors ?? row.changes ?? []).map((actor) => actor.formation_id)).toEqual(
            expect.arrayContaining(['rs4']),
        );
        expect(rows.flatMap((row) => row.actors ?? row.changes ?? []).some((actor) => actor.formation_id === 'abb')).toBe(false);
        expect(rows).toContainEqual(expect.objectContaining({ event: 'writer', formation_id: 'rs4', source: 'formation_spawn.wia_trickleback' }));
    });
});
