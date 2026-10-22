import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FormationState, GameState, MilitiaPoolState } from '../src/state/game_state.js';
import { reinforceBrigadesFromPools } from '../src/sim/formation_spawn.js';
import { resetReasonCodeTopicCacheForTests } from '../src/sim/combat/reason_code_debug.js';
import {
    createReinforcementAllocationObserver,
    REINFORCEMENT_ALLOCATION_PREFIX,
    resetReinforcementAllocationSelectorCacheForTests,
} from '../src/sim/combat/reinforcement_allocation_diagnostic.js';
import { serializeState } from '../src/state/serialize.js';
import { resetPersonnelSelectorCacheForTests } from '../src/sim/combat/personnel_diagnostic.js';

const PREFIX = REINFORCEMENT_ALLOCATION_PREFIX;

function configure(topic?: string, pools?: string): void {
    if (topic === undefined) delete process.env.AWWV_DEBUG_REASON_CODES;
    else process.env.AWWV_DEBUG_REASON_CODES = topic;
    if (pools === undefined) delete process.env.AWWV_DEBUG_REINFORCEMENT_POOLS;
    else process.env.AWWV_DEBUG_REINFORCEMENT_POOLS = pools;
    resetReasonCodeTopicCacheForTests();
    resetReinforcementAllocationSelectorCacheForTests();
    resetPersonnelSelectorCacheForTests();
}

function brigade(
    id: string,
    faction: 'RS' | 'HRHB',
    personnel: number,
    munId = 'pale',
): FormationState {
    return {
        id,
        faction,
        recruit_pool_faction: 'RS',
        name: id,
        kind: 'brigade',
        status: 'active',
        readiness: 'active',
        assignment: null,
        created_turn: 0,
        personnel,
        max_personnel: 2200,
        location_osid: `op:${munId}:${id}`,
        tags: [`mun:${munId}`],
    } as FormationState;
}

function fixture(reverse = false): GameState {
    const entries: Array<[string, FormationState]> = [
        ['a_earlier_consumer', brigade('a_earlier_consumer', 'HRHB', 1800)],
        ['b_later_consumer', brigade('b_later_consumer', 'RS', 1800)],
        ['z_reserve_consumer', brigade('z_reserve_consumer', 'RS', 1800, 'zenica')],
    ];
    if (reverse) entries.reverse();
    const pool: MilitiaPoolState = {
        mun_id: 'pale',
        faction: 'RS',
        available: 1900,
        committed: 100,
        exhausted: 0,
        updated_turn: 21,
    };
    return {
        meta: {
            turn: 22,
            phase: 'war',
            seed: 'reinforcement-allocation-fixture',
            recruitment_mode: 'player_choice',
        },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: {
            formations: Object.fromEntries(entries),
            militia_pools: {
                'pale:RS': pool,
                'zenica:RS': {
                    mun_id: 'zenica', faction: 'RS', available: 900,
                    committed: 20, exhausted: 0, updated_turn: 21,
                },
            },
            formation_spawn_directive: { kind: 'brigade' },
        } as unknown as GameState['military'],
        political: {
            political_controllers: {
                'op:pale:a_earlier_consumer': 'HRHB',
                'op:pale:b_later_consumer': 'RS',
                'op:zenica:z_reserve_consumer': 'RS',
            },
            municipalities: { pale: { control: 'consolidated' }, zenica: { control: 'consolidated' } },
        } as unknown as GameState['political'],
    } as GameState;
}

function rows(lines: string[]): Array<Record<string, unknown>> {
    return lines
        .filter((line) => line.startsWith(`${PREFIX} `))
        .map((line) => JSON.parse(line.slice(PREFIX.length + 1)) as Record<string, unknown>);
}

describe('regular reinforcement allocation diagnostic', () => {
    beforeEach(() => configure());
    afterEach(() => {
        vi.restoreAllMocks();
        delete process.env.AWWV_DEBUG_PERSONNEL_FORMATIONS;
        configure();
    });

    it('captures the actual sorted shared-pool allocation with a real nonzero spawn reserve', () => {
        configure('reinforcement_allocation', ' zenica:RS, pale:RS, pale:RS ');
        const output: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((line) => output.push(String(line)));
        const state = fixture(true);

        const report = reinforceBrigadesFromPools(state);

        expect(report).toEqual({ formations_reinforced: 3, manpower_added: 800, pools_touched: 3 });
        expect(state.military.formations.a_earlier_consumer.personnel).toBe(2100);
        expect(state.military.formations.b_later_consumer.personnel).toBe(2200);
        expect(state.military.formations.z_reserve_consumer.personnel).toBe(1900);
        expect(state.military.militia_pools?.['pale:RS']).toMatchObject({ available: 1200, committed: 800 });
        expect(state.military.militia_pools?.['zenica:RS']).toMatchObject({ available: 800, committed: 120 });
        const observed = rows(output);
        expect(observed.every((row) => row.source === 'formation_spawn.reinforce')).toBe(true);
        expect(observed.map((row) => [row.event, row.pool_key, row.formation_id ?? null])).toEqual([
            ['stage_open', 'pale:RS', null],
            ['stage_open', 'zenica:RS', null],
            ['recipient', 'pale:RS', 'a_earlier_consumer'],
            ['recipient', 'pale:RS', 'b_later_consumer'],
            ['recipient', 'zenica:RS', 'z_reserve_consumer'],
            ['stage_close', 'pale:RS', null],
            ['stage_close', 'zenica:RS', null],
        ]);
        expect(observed[0]).toEqual(
            {
                schema_version: 1,
                source: 'formation_spawn.reinforce',
                event: 'stage_open',
                branch: 'regular',
                completed_turn: 22,
                pool_key: 'pale:RS',
                selected_pool_ordinal: 0,
                pool: {
                    presence: 'present',
                    available: { presence: 'present_value', value: 1900 },
                    committed: { presence: 'present_value', value: 100 },
                },
            },
        );
        expect(observed[2]).toEqual(expect.objectContaining({
                schema_version: 1,
                event: 'recipient',
                branch: 'regular',
                completed_turn: 22,
                pool_key: 'pale:RS',
                formation_id: 'a_earlier_consumer',
                global_order: 0,
                disposition: 'transferred',
                reserve_for_spawn: { presence: 'present_value', value: 0 },
                effective_available: { presence: 'present_value', value: 1900 },
                transfer: { presence: 'present_value', value: 300 },
                pool_available_before: { presence: 'present_value', value: 1900 },
                pool_available_after: { presence: 'present_value', value: 1600 },
            }));
        expect(observed[3]).toEqual(expect.objectContaining({
                schema_version: 1,
                event: 'recipient',
                branch: 'regular',
                completed_turn: 22,
                pool_key: 'pale:RS',
                formation_id: 'b_later_consumer',
                global_order: 1,
                disposition: 'transferred',
                reserve_for_spawn: { presence: 'present_value', value: 0 },
                effective_available: { presence: 'present_value', value: 1600 },
                transfer: { presence: 'present_value', value: 400 },
                pool_available_before: { presence: 'present_value', value: 1600 },
                pool_available_after: { presence: 'present_value', value: 1200 },
            }));
        expect(observed[4]).toEqual(expect.objectContaining({
            event: 'recipient', pool_key: 'zenica:RS', formation_id: 'z_reserve_consumer', global_order: 2,
            reserve_for_spawn: { presence: 'present_value', value: 800 },
            effective_available: { presence: 'present_value', value: 100 },
            transfer: { presence: 'present_value', value: 100 },
            pool_available_before: { presence: 'present_value', value: 900 },
            pool_available_after: { presence: 'present_value', value: 800 },
        }));
        expect(1900 + 100).toBe(1200 + 800);
        expect(900 + 20).toBe(800 + 120);
        expect(observed[5]).toEqual({
                schema_version: 1,
                source: 'formation_spawn.reinforce',
                event: 'stage_close',
                branch: 'regular',
                completed_turn: 22,
                pool_key: 'pale:RS',
                selected_pool_ordinal: 0,
                pool: {
                    presence: 'present',
                    available: { presence: 'present_value', value: 1200 },
                    committed: { presence: 'present_value', value: 800 },
                },
            });

        const onStateBytes = serializeState(state);
        configure();
        const offState = fixture();
        const offReport = reinforceBrigadesFromPools(offState);
        expect(offReport).toEqual(report);
        expect(serializeState(offState)).toBe(onStateBytes);

        configure('reinforcement_allocation', 'pale:RS,zenica:RS');
        const reversedOutput: string[] = [];
        vi.mocked(console.log).mockImplementation((line) => reversedOutput.push(String(line)));
        const reversedState = fixture(false);
        const reversedReport = reinforceBrigadesFromPools(reversedState);
        expect(reversedReport).toEqual(report);
        expect(serializeState(reversedState)).toBe(onStateBytes);
        expect(rows(reversedOutput)).toEqual(observed);
    });

    it('stays unallocated and silent unless both the exact topic and a pool selector are present', () => {
        const sink = vi.spyOn(console, 'log').mockImplementation(() => undefined);
        const pools = fixture().military.militia_pools as Record<string, MilitiaPoolState>;

        expect(createReinforcementAllocationObserver(22, pools)).toBeUndefined();
        reinforceBrigadesFromPools(fixture());
        expect(sink).not.toHaveBeenCalled();

        configure('personnel', 'pale:RS');
        expect(createReinforcementAllocationObserver(22, pools)).toBeUndefined();
        reinforceBrigadesFromPools(fixture());
        expect(sink).not.toHaveBeenCalled();

        configure('reinforcement_allocation');
        expect(createReinforcementAllocationObserver(22, pools)).toBeUndefined();
        reinforceBrigadesFromPools(fixture());
        expect(sink).not.toHaveBeenCalled();

        configure('reinforcement_allocation', 'unselected:RS');
        reinforceBrigadesFromPools(fixture());
        const observed = rows(sink.mock.calls.map(([line]) => String(line)));
        expect(observed.map((row) => [row.event, row.pool_key])).toEqual([
            ['stage_open', 'unselected:RS'],
            ['stage_close', 'unselected:RS'],
        ]);
        expect(observed.every((row) => row.pool && (row.pool as { presence: string }).presence === 'missing')).toBe(true);
    });

    it('preserves production guard order while resolving selected early-skip pools only when observation is on', () => {
        const offState = fixture();
        const offIneligible = brigade('a_ineligible', 'RS', 1000);
        offIneligible.readiness = 'forming';
        Object.defineProperty(offIneligible, 'recruit_pool_faction', {
            configurable: true,
            get: () => { throw new Error('pool selection evaluated'); },
        });
        const offAtCap = brigade('b_at_cap', 'RS', 2200);
        Object.defineProperty(offAtCap, 'recruit_pool_faction', {
            configurable: true,
            get: () => { throw new Error('at-cap pool selection evaluated'); },
        });
        offState.military.formations = { a_ineligible: offIneligible, b_at_cap: offAtCap };

        expect(() => reinforceBrigadesFromPools(offState)).not.toThrow();

        configure('reinforcement_allocation', 'pale:RS');
        const output: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((line) => output.push(String(line)));
        const onState = fixture();
        const onIneligible = brigade('a_ineligible', 'RS', 1000);
        onIneligible.readiness = 'forming';
        let poolFactionReads = 0;
        Object.defineProperty(onIneligible, 'recruit_pool_faction', {
            configurable: true,
            get: () => {
                poolFactionReads += 1;
                return 'RS';
            },
        });
        onState.military.formations = { a_ineligible: onIneligible };

        expect(() => reinforceBrigadesFromPools(onState)).not.toThrow();
        expect(poolFactionReads).toBe(1);
        expect(rows(output).filter((row) => row.event === 'recipient')).toEqual([
            expect.objectContaining({
                pool_key: 'pale:RS', formation_id: 'a_ineligible', disposition: 'skipped', reason: 'ineligible',
            }),
        ]);

        output.length = 0;
        const failingDiagnosticState = fixture();
        const failingDiagnosticFormation = brigade('a_ineligible', 'RS', 1000);
        failingDiagnosticFormation.readiness = 'forming';
        Object.defineProperty(failingDiagnosticFormation, 'recruit_pool_faction', {
            configurable: true,
            get: () => { throw new Error('diagnostic pool association failed'); },
        });
        failingDiagnosticState.military.formations = { a_ineligible: failingDiagnosticFormation };
        expect(() => reinforceBrigadesFromPools(failingDiagnosticState)).not.toThrow();
        expect(rows(output).map((row) => row.event)).toEqual(['stage_open', 'stage_close']);
    });

    it('labels each reached early guard and leaves later operands explicitly unreached', () => {
        configure('reinforcement_allocation', 'empty:RS,missing:RS,pale:RS,zenica:RS');
        const output: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((line) => output.push(String(line)));
        const state = fixture();
        state.military.formations = {
            a_ineligible: { ...brigade('a_ineligible', 'RS', 1000), readiness: 'forming' },
            b_at_cap: brigade('b_at_cap', 'RS', 2200),
            c_missing_pool: brigade('c_missing_pool', 'RS', 1000, 'missing'),
            d_empty_pool: brigade('d_empty_pool', 'RS', 1000, 'empty'),
            e_reserve_exhausted: brigade('e_reserve_exhausted', 'RS', 1000, 'zenica'),
        };
        state.military.militia_pools = {
            'pale:RS': { mun_id: 'pale', faction: 'RS', available: 500, committed: 1, exhausted: 0, updated_turn: 21 },
            'empty:RS': { mun_id: 'empty', faction: 'RS', available: 0, committed: 2, exhausted: 0, updated_turn: 21 },
            'zenica:RS': { mun_id: 'zenica', faction: 'RS', available: 500, committed: 3, exhausted: 0, updated_turn: 21 },
        };

        const report = reinforceBrigadesFromPools(state);

        expect(report).toEqual({ formations_reinforced: 0, manpower_added: 0, pools_touched: 0 });
        const recipients = rows(output).filter((row) => row.event === 'recipient');
        expect(recipients.map((row) => [row.formation_id, row.reason])).toEqual([
            ['a_ineligible', 'ineligible'],
            ['b_at_cap', 'at_cap'],
            ['c_missing_pool', 'pool_missing'],
            ['d_empty_pool', 'pool_empty'],
            ['e_reserve_exhausted', 'reserve_exhausted'],
        ]);
        expect(recipients[0]).toMatchObject({
            current_personnel: { presence: 'unreached' }, cap: { presence: 'unreached' },
            reserve_for_spawn: { presence: 'unreached' }, transfer: { presence: 'unreached' },
        });
        expect(recipients[1]).toMatchObject({
            current_personnel: { presence: 'present_value', value: 2200 },
            cap: { presence: 'present_value', value: 2200 },
            rate: { presence: 'unreached' }, reserve_for_spawn: { presence: 'unreached' },
        });
        expect(recipients[2]).toMatchObject({
            pool_available_before: { presence: 'unreached' }, reserve_for_spawn: { presence: 'unreached' },
        });
        expect(recipients[3]).toMatchObject({
            pool_available_before: { presence: 'present_value', value: 0 },
            pool_committed_before: { presence: 'present_value', value: 2 },
            reserve_for_spawn: { presence: 'unreached' },
        });
        expect(recipients[4]).toMatchObject({
            reserve_for_spawn: { presence: 'present_value', value: 800 },
            effective_available: { presence: 'present_value', value: 0 },
            transfer: { presence: 'present_value', value: 0 },
        });
    });

    it('emits a bounded regular-stage opening and closing when no formation reaches the selected pool', () => {
        configure('reinforcement_allocation', 'pale:RS');
        const output: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((line) => output.push(String(line)));
        const state = fixture();
        state.military.formations = {};

        reinforceBrigadesFromPools(state);

        expect(rows(output).map((row) => row.event)).toEqual(['stage_open', 'stage_close']);
        expect(rows(output).every((row) => row.branch === 'regular' && row.completed_turn === 22)).toBe(true);
    });

    it('isolates stdout and serialization failures while preserving full state and report neutrality', () => {
        configure();
        const offState = fixture();
        const offReport = reinforceBrigadesFromPools(offState);
        const offBytes = serializeState(offState);

        configure('reinforcement_allocation', 'pale:RS,zenica:RS');
        vi.spyOn(console, 'log').mockImplementation(() => { throw new Error('sink'); });
        const onState = fixture();
        const onReport = reinforceBrigadesFromPools(onState);
        expect(onReport).toEqual(offReport);
        expect(serializeState(onState)).toBe(offBytes);

        const observer = createReinforcementAllocationObserver(22, onState.military.militia_pools!)!;
        expect(() => observer.recordRecipient('pale:RS', () => ({
            formation_id: 'serialization_probe', global_order: 0, disposition: 'skipped', reason: 'no_transfer',
            numbers: { transfer: 1n },
        }))).not.toThrow();
    });

    it('propagates a gameplay exception and does not emit a false regular-stage closing row', () => {
        configure('reinforcement_allocation', 'pale:RS');
        const output: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((line) => output.push(String(line)));
        const state = fixture();
        const failure = new Error('gameplay getter failure');
        Object.defineProperty(state.military.formations.a_earlier_consumer, 'personnel', {
            configurable: true,
            get: () => { throw failure; },
        });

        expect(() => reinforceBrigadesFromPools(state)).toThrow(failure);
        expect(rows(output).map((row) => row.event)).toEqual(['stage_open']);
    });

    it('represents nonfinite pool values explicitly and keeps the personnel writer available field unchanged', () => {
        configure('reinforcement_allocation', 'pale:RS');
        const output: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((line) => output.push(String(line)));
        const malformedPools = {
            'pale:RS': { mun_id: 'pale', faction: 'RS', available: Number.NaN, committed: Number.POSITIVE_INFINITY },
        } as unknown as Record<string, MilitiaPoolState>;
        createReinforcementAllocationObserver(22, malformedPools)!.stageOpen();
        expect(rows(output)[0]).toMatchObject({
            pool: {
                presence: 'present',
                available: { presence: 'present_nonfinite', value: 'NaN' },
                committed: { presence: 'present_nonfinite', value: 'Infinity' },
            },
        });

        output.length = 0;
        process.env.AWWV_DEBUG_PERSONNEL_FORMATIONS = 'b_later_consumer';
        configure('reinforcement_allocation,personnel', 'pale:RS');
        reinforceBrigadesFromPools(fixture());
        const personnel = output
            .filter((line) => line.startsWith('[personnel] '))
            .map((line) => JSON.parse(line.slice('[personnel] '.length)))
            .find((row) => row.formation_id === 'b_later_consumer');
        expect(personnel).toMatchObject({ branch: 'regular', available: 1600, transfer: 400 });
    });
});
