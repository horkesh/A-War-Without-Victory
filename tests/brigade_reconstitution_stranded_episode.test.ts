import { describe, expect, it } from 'vitest';

import {
    RECONSTITUTION_DELAY_TURNS,
    RECONSTITUTION_MIN_POOL,
    RECONSTITUTION_PERSONNEL_FRACTION,
    reconstituteBrigades,
} from '../src/sim/combat/brigade_reconstitution.js';
import {
    STRANDED_COHESION_DECAY,
    STRANDED_MORALE_DECAY,
    updateStrandedBrigadeLifecycle,
} from '../src/sim/combat/stranded_brigade_lifecycle.js';
import { appendDisplacementEvent } from '../src/state/displacement_event_log.js';
import { militiaPoolKey } from '../src/state/militia_pool_key.js';
import type { DisplacementEvent, FormationState, GameState } from '../src/state/game_state.js';

const TURN = 45;

function brigade(id: string, overrides: Partial<FormationState> = {}): FormationState {
    return {
        id,
        name: id,
        faction: 'RS',
        kind: 'brigade',
        status: 'inactive',
        lifecycle_status: 'destroyed',
        personnel: 0,
        cohesion: 0,
        morale: 0,
        max_personnel: 2000,
        location_osid: `op:${id}:home_1`,
        home_osid: `op:${id}:home_1`,
        origin_mun: id,
        corps_id: 'corps_1',
        destruction_turn: TURN - RECONSTITUTION_DELAY_TURNS - 1,
        stranded_status: 'holding',
        stranded_since_turn: 19,
        last_reachable_turn: 5,
        readiness: 'forming',
        officer_quality: 0.4,
        composition: {
            infantry: 0,
            tanks: 0,
            artillery: 0,
            aa_systems: 0,
            tank_condition: { operational: 0, degraded: 0, non_operational: 0 },
            artillery_condition: { operational: 0, degraded: 0, non_operational: 0 },
        },
        ...overrides,
    } as FormationState;
}

function makeState(formations: Record<string, FormationState>): GameState {
    return {
        meta: { turn: TURN, phase: 'war', seed: 'recon-stranded-episode' },
        military: {
            formations,
            militia_pools: {},
            corps_command: { corps_1: { active_operations: [] } },
            strategic_reserves: { RBiH: 0, RS: 0, HRHB: 0 },
        },
        political: { political_controllers: {} },
        displacement: {},
    } as unknown as GameState;
}

function addPool(state: GameState, mun: string, available: number): void {
    state.military.militia_pools![militiaPoolKey(mun as any, 'RS')] = {
        mun_id: mun, faction: 'RS', available, committed: 0, exhausted: false, updated_turn: TURN - 1,
    } as any;
}

type FundingPath = 'home' | 'refugee' | 'reserve';

function makeFundingState(path: FundingPath, strandedStatus: 'holding' | 'collapsed' = 'holding') {
    const id = `${path}_unit`;
    const corpsId = `corps_${path}`;
    const f = brigade(id, {
        home_osid: `op:${path}:home_1`,
        location_osid: `op:${path}:home_1`,
        origin_mun: path,
        corps_id: corpsId,
        stranded_status: strandedStatus,
    });
    const state = makeState({ [id]: f });
    if (path === 'home') {
        state.political.political_controllers!['op:home:home_1'] = 'RS';
        addPool(state, 'home', RECONSTITUTION_MIN_POOL + 500);
    } else if (path === 'refugee') {
        state.political.political_controllers!['op:refugee:home_1'] = 'RBiH';
        state.political.political_controllers!['op:ref:ref_1'] = 'RS';
        state.military.corps_front_sectors = {
            [`sector:${corpsId}:0`]: { id: `sector:${corpsId}:0`, corps_id: corpsId, faction: 'RS', territory_osids: ['op:ref:ref_1'], front_edges: [], sub_segments: [], assigned_brigade_ids: [], reserve_brigade_ids: [] },
        } as any;
        addPool(state, 'ref', RECONSTITUTION_MIN_POOL + 500);
        appendDisplacementEvent(state, {
            turn: 30, origin_mun: 'refugee', dest_mun: 'ref', ethnicity: 'RS',
            displaced: 5000, killed: 0, fled_abroad: 0, settled: 5000,
        } as DisplacementEvent);
    } else {
        state.political.political_controllers!['op:reserve:home_1'] = 'RS';
        state.military.strategic_reserves!.RS = RECONSTITUTION_MIN_POOL + 500;
    }
    return { state, id, f };
}

describe('reconstitution stranded episode reset', () => {
    it('Path A home-pool reactivation starts a new episode and preserves last_reachable until classification', () => {
        const f = brigade('home', { home_osid: 'op:home:home_1', location_osid: 'op:home:home_1' });
        const state = makeState({ home: f });
        state.political.political_controllers!['op:home:home_1'] = 'RS';
        addPool(state, 'home', RECONSTITUTION_MIN_POOL + 500);
        expect(reconstituteBrigades(state).reconstituted_count).toBe(1);
        expect(f.status).toBe('active');
        expect(f.stranded_status).toBe('none');
        expect(f.stranded_since_turn).toBeUndefined();
        expect(f.last_reachable_turn).toBe(5);
    });

    it('Path B refugee reactivation and Path C reserve reactivation reset the episode', () => {
        const refugee = brigade('refugee', { home_osid: 'op:refugee:home_1', origin_mun: 'refugee', corps_id: 'corps_ref' });
        const reserve = brigade('reserve', { home_osid: 'op:reserve:home_1', origin_mun: 'reserve', corps_id: 'corps_reserve' });
        const state = makeState({ refugee, reserve });
        state.political.political_controllers!['op:refugee:home_1'] = 'RBiH';
        state.political.political_controllers!['op:ref:ref_1'] = 'RS';
        state.military.corps_front_sectors = {
            'sector:corps_ref:0': { id: 'sector:corps_ref:0', corps_id: 'corps_ref', faction: 'RS', territory_osids: ['op:ref:ref_1'], front_edges: [], sub_segments: [], assigned_brigade_ids: [], reserve_brigade_ids: [] },
        } as any;
        state.political.political_controllers!['op:reserve:home_1'] = 'RS';
        addPool(state, 'ref', RECONSTITUTION_MIN_POOL + 500);
        appendDisplacementEvent(state, {
            turn: 30, origin_mun: 'refugee', dest_mun: 'ref', ethnicity: 'RS',
            displaced: 5000, killed: 0, fled_abroad: 0, settled: 5000,
        } as DisplacementEvent);
        state.military.strategic_reserves!.RS = RECONSTITUTION_MIN_POOL + 500;
        const refugeePoolBefore = state.military.militia_pools![militiaPoolKey('ref' as any, 'RS')]!.available;
        const reserveBefore = state.military.strategic_reserves!.RS;

        const report = reconstituteBrigades(state);
        expect(report.reconstituted_count).toBe(2);
        const refugeeEntry = report.reconstituted_brigades.find((entry) => entry.id === 'refugee')!;
        const reserveEntry = report.reconstituted_brigades.find((entry) => entry.id === 'reserve')!;
        expect(refugeeEntry.refugee_mun).toBe('ref');
        const expectedPoolDraw = Math.min(
            Math.floor((refugee.max_personnel ?? 0) * RECONSTITUTION_PERSONNEL_FRACTION),
            refugeePoolBefore,
        );
        expect(refugeePoolBefore - state.military.militia_pools![militiaPoolKey('ref' as any, 'RS')]!.available)
            .toBe(expectedPoolDraw);
        expect(reserveEntry.via_reserve).toBe(true);
        expect(reserveEntry.reserve_spawn_osid).toBe('op:reserve:home_1');
        const expectedReserveDraw = Math.min(
            Math.floor((reserve.max_personnel ?? 0) * RECONSTITUTION_PERSONNEL_FRACTION),
            reserveBefore,
        );
        expect(reserveBefore - state.military.strategic_reserves!.RS).toBe(expectedReserveDraw);
        for (const f of [refugee, reserve]) {
            expect(f.status).toBe('active');
            expect(f.stranded_status).toBe('none');
            expect(f.stranded_since_turn).toBeUndefined();
            expect(f.last_reachable_turn).toBe(5);
        }
    });

    it('classifies the actual critical destination as a new current-turn holding episode', () => {
        const f = brigade('home', { home_osid: 'op:home:home_1', location_osid: 'op:home:home_1' });
        const state = makeState({ home: f });
        state.political.political_controllers!['op:home:home_1'] = 'RS';
        addPool(state, 'home', RECONSTITUTION_MIN_POOL + 500);
        reconstituteBrigades(state);
        const cohesionAfterRecon = f.cohesion;
        const moraleAfterRecon = f.morale;
        state.political.last_supply_state_by_osid = { [f.location_osid!]: 'critical' } as any;
        state.military.corps_front_sectors = {} as any;
        const first = updateStrandedBrigadeLifecycle(state, new Map());
        expect(first.newly_stranded).toEqual(['home']);
        expect(first.still_holding).toEqual([]);
        expect(f.cohesion).toBe(cohesionAfterRecon);
        expect(f.morale).toBe(moraleAfterRecon);
        expect(f.stranded_since_turn).toBe(TURN);

        state.meta.turn = TURN + 1;
        const second = updateStrandedBrigadeLifecycle(state, new Map());
        expect(second.still_holding).toEqual(['home']);
        expect(f.cohesion).toBe((cohesionAfterRecon ?? 0) - STRANDED_COHESION_DECAY);
        expect(f.morale).toBe((moraleAfterRecon ?? 0) - STRANDED_MORALE_DECAY);
        expect(f.stranded_since_turn).toBe(TURN);
    });

    it('classifies a supplied destination as none and updates last_reachable', () => {
        const f = brigade('home', { home_osid: 'op:home:home_1', location_osid: 'op:home:home_1' });
        const state = makeState({ home: f });
        state.political.political_controllers!['op:home:home_1'] = 'RS';
        addPool(state, 'home', RECONSTITUTION_MIN_POOL + 500);
        reconstituteBrigades(state);
        state.military.corps_front_sectors = {
            'sector:corps_1:0': { id: 'sector:corps_1:0', corps_id: 'corps_1', faction: 'RS', territory_osids: [f.location_osid], front_edges: [], sub_segments: [], assigned_brigade_ids: [], reserve_brigade_ids: [] },
        } as any;
        const report = updateStrandedBrigadeLifecycle(state, new Map());
        expect(report.newly_stranded).not.toContain('home');
        expect(f.stranded_status).toBe('none');
        expect(f.last_reachable_turn).toBe(TURN);
    });

    it('leaves no-resource and delay cases on their old episode bytes', () => {
        const noResource = brigade('no_resource');
        const state = makeState({ no_resource: noResource });
        state.political.political_controllers!['op:no_resource:home_1'] = 'RS';
        expect(reconstituteBrigades(state).reconstituted_count).toBe(0);
        expect(noResource.status).toBe('inactive');
        expect(noResource.stranded_status).toBe('holding');
        expect(noResource.stranded_since_turn).toBe(19);

        const delayed = brigade('delayed', { destruction_turn: TURN });
        const delayedState = makeState({ delayed });
        delayedState.political.political_controllers!['op:delayed:home_1'] = 'RS';
        addPool(delayedState, 'delayed', RECONSTITUTION_MIN_POOL + 500);
        reconstituteBrigades(delayedState);
        expect(delayed.status).toBe('inactive');
        expect(delayed.stranded_status).toBe('holding');
    });

    it('parameterizes fully resourced collapsed home/refugee/reserve cases against noncollapsed controls', () => {
        for (const path of ['home', 'refugee', 'reserve'] as const) {
            const control = makeFundingState(path, 'holding');
            expect(reconstituteBrigades(control.state).reconstituted_count).toBe(1);

            const collapsed = makeFundingState(path, 'collapsed');
            const beforeFormation = structuredClone(collapsed.f);
            const beforePools = structuredClone(collapsed.state.military.militia_pools);
            const beforeReserve = structuredClone(collapsed.state.military.strategic_reserves);
            const beforeCommand = structuredClone(collapsed.state.military.corps_command);
            expect(reconstituteBrigades(collapsed.state).reconstituted_count).toBe(0);
            expect(collapsed.f).toEqual(beforeFormation);
            expect(collapsed.state.military.militia_pools).toEqual(beforePools);
            expect(collapsed.state.military.strategic_reserves).toEqual(beforeReserve);
            expect(collapsed.state.military.corps_command).toEqual(beforeCommand);
            expect(collapsed.f.stranded_status).toBe('collapsed');
        }
    });

    it('is deterministic under both formation insertion orders with fresh state per case', () => {
        const makeCase = (order: 'ab' | 'ba') => {
            const a = brigade('a', { home_osid: 'op:a:home_1', origin_mun: 'a', corps_id: 'corps_a' });
            const b = brigade('b', { home_osid: 'op:b:home_1', origin_mun: 'b', corps_id: 'corps_b' });
            const state = makeState(order === 'ab' ? { a, b } : { b, a });
            state.political.political_controllers!['op:a:home_1'] = 'RS';
            state.political.political_controllers!['op:b:home_1'] = 'RS';
            addPool(state, 'a', RECONSTITUTION_MIN_POOL + 500);
            addPool(state, 'b', RECONSTITUTION_MIN_POOL + 500);
            const report = reconstituteBrigades(state);
            return { report, a, b, state };
        };
        const first = makeCase('ab');
        const second = makeCase('ba');
        const normalize = (run: ReturnType<typeof makeCase>) => JSON.stringify({
            count: run.report.reconstituted_count,
            brigades: [...run.report.reconstituted_brigades].sort((x, y) => x.id.localeCompare(y.id)),
            a: {
                status: run.a.status, stranded_status: run.a.stranded_status,
                stranded_since_turn: run.a.stranded_since_turn, personnel: run.a.personnel,
                cohesion: run.a.cohesion, morale: run.a.morale, location_osid: run.a.location_osid,
            },
            b: {
                status: run.b.status, stranded_status: run.b.stranded_status,
                stranded_since_turn: run.b.stranded_since_turn, personnel: run.b.personnel,
                cohesion: run.b.cohesion, morale: run.b.morale, location_osid: run.b.location_osid,
            },
            pools: run.state.military.militia_pools,
            reserves: run.state.military.strategic_reserves,
        });
        expect(normalize(first)).toBe(normalize(second));
    });
});

describe('reconstitution journey invalidation', () => {
    for (const path of ['home', 'refugee', 'reserve'] as FundingPath[]) {
        it(`invalidates an old journey on successful ${path} reconstitution and preserves pending orders`, () => {
            const { state, id, f } = makeFundingState(path);
            const origin = f.location_osid!;
            const order = { destination_sids: ['op:dest:any'], stance: 'column' } as any;
            state.military.brigade_movement_orders = { [id]: order };
            state.military.brigade_movement_state = {
                [id]: {
                    status: 'in_transit', stance: 'column', destination_sids: ['op:dest:any'],
                    path: [origin, 'op:dest:any'], turns_remaining: 2, owner: 'bot_discretionary',
                },
            };

            const report = reconstituteBrigades(state);

            expect(report.reconstituted_count).toBe(1);
            expect(f.status).toBe('active');
            expect(state.military.brigade_movement_state?.[id]).toBeUndefined();
            expect(state.military.brigade_movement_orders?.[id]).toEqual(order);
        });
    }

    it('preserves existing journeys when reconstitution has no funding', () => {
        for (const path of ['home', 'refugee', 'reserve'] as FundingPath[]) {
            const { state, id, f } = makeFundingState(path);
            if (path === 'reserve') {
                state.military.strategic_reserves!.RS = 0;
            } else {
                const poolMun = path === 'home' ? 'home' : 'ref';
                state.military.militia_pools![militiaPoolKey(poolMun as any, 'RS')]!.available = 0;
            }
            const origin = f.location_osid!;
            const order = { destination_sids: ['op:dest:any'], stance: 'column' } as any;
            state.military.brigade_movement_orders = { [id]: order };
            state.military.brigade_movement_state = {
                [id]: {
                    status: 'in_transit', stance: 'column', destination_sids: ['op:dest:any'],
                    path: [origin, 'op:dest:any'], turns_remaining: 2,
                },
            };

            const report = reconstituteBrigades(state);

            expect(report.reconstituted_count).toBe(0);
            expect(f.status).toBe('inactive');
            expect(state.military.brigade_movement_state?.[id]).toBeDefined();
            expect(state.military.brigade_movement_orders?.[id]).toEqual(order);
        }
    });
});
