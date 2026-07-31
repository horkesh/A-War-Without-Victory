import { afterEach, describe, expect, it, vi } from 'vitest';

import type { FormationState, GameState, OGActivationOrder } from '../src/state/game_state.js';
import { generateOGActivationOrders } from '../src/sim/combat/bot_corps_operations.js';
import { activateOGs, updateOGLifecycle } from '../src/sim/combat/operational_groups.js';

function formation(
    id: string,
    kind: FormationState['kind'],
    personnel?: number,
): FormationState {
    return {
        id,
        faction: 'RS',
        name: id,
        created_turn: 0,
        status: 'active',
        assignment: null,
        kind,
        personnel,
        cohesion: 70,
        corps_id: kind === 'corps' ? undefined : 'rs-corps-1',
        location_osid: kind === 'corps' ? undefined : 'osid:home',
    } as FormationState;
}

function legacyOrder(corpsId = 'rs-corps-1'): OGActivationOrder {
    return {
        corps_id: corpsId,
        donors: [
            { brigade_id: 'rs-brig-1', personnel_contribution: 300 },
            { brigade_id: 'rs-brig-2', personnel_contribution: 300 },
        ],
        focus_settlements: ['osid:focus'],
        posture: 'attack',
        max_duration: 5,
    };
}

function convergenceState(): GameState {
    const formations: Record<string, FormationState> = {
        'rs-corps-1': formation('rs-corps-1', 'corps'),
        'rs-brig-1': formation('rs-brig-1', 'brigade', 1_000),
        'rs-brig-2': formation('rs-brig-2', 'brigade', 1_000),
        'rs-brig-3': formation('rs-brig-3', 'brigade', 1_000),
    };
    return {
        meta: { turn: 20, seed: 'og-convergence', phase: 'war' },
        political: { political_controllers: { 'osid:focus': 'RS' } },
        military: {
            formations,
            tactical_groups: {},
            corps_command: {
                'rs-corps-1': {
                    stance: 'offensive',
                    active_operations: [{
                        name: 'Legacy producer witness',
                        type: 'general_offensive',
                        phase: 'execution',
                        started_turn: 18,
                        phase_started_turn: 19,
                        participating_brigades: ['rs-brig-1', 'rs-brig-2', 'rs-brig-3'],
                        target_settlements: ['osid:focus'],
                    }],
                    active_ogs: [],
                    og_slots: 1,
                    corps_exhaustion: 0,
                },
            },
        },
    } as unknown as GameState;
}

function personnelAcrossLegacyOverlay(state: GameState): number {
    return Object.values(state.military.formations ?? {})
        .filter((entry) => entry.kind === 'brigade' || entry.kind === 'og')
        .reduce((total, entry) => total + (entry.personnel ?? 0), 0);
}

afterEach(() => {
    vi.doUnmock('../src/sim/combat/tactical_group_config.js');
    vi.resetModules();
});

describe('legacy Operational Group convergence', () => {
    it('keeps the serialized empty order shape but enqueues no legacy order when Tactical Groups own production', () => {
        const state = convergenceState();
        delete state.military.og_orders;

        generateOGActivationOrders(state, 'RS', []);

        expect(state.military.og_orders).toEqual([]);
        expect(Object.values(state.military.formations).filter((entry) => entry.kind === 'og')).toEqual([]);
    });

    it('discards multiple persisted legacy orders without mutating formations, personnel, or corps command', () => {
        const state = convergenceState();
        state.military.og_orders = [legacyOrder(), legacyOrder()];
        const formationsBefore = structuredClone(state.military.formations);
        const commandBefore = structuredClone(state.military.corps_command);

        expect(activateOGs(state)).toEqual({ activated: [], rejected: [] });
        expect(state.military.og_orders).toEqual([]);
        expect(state.military.formations).toEqual(formationsBefore);
        expect(state.military.corps_command).toEqual(commandBefore);

        const afterFirstDiscard = structuredClone(state);
        expect(activateOGs(state)).toEqual({ activated: [], rejected: [] });
        expect(state).toEqual(afterFirstDiscard);
    });

    it('retains the flag-off legacy activation body for supported old compatibility runs', async () => {
        vi.resetModules();
        vi.doMock('../src/sim/combat/tactical_group_config.js', async () => {
            const actual = await vi.importActual<typeof import('../src/sim/combat/tactical_group_config.js')>(
                '../src/sim/combat/tactical_group_config.js',
            );
            return { ...actual, ENABLE_TACTICAL_GROUPS: false };
        });
        const compatibility = await import('../src/sim/combat/operational_groups.js');
        const state = convergenceState();
        state.military.og_orders = [legacyOrder()];

        const report = compatibility.activateOGs(state);

        expect(report.activated).toEqual(['og-rs-corps-1-t20']);
        expect(state.military.formations['rs-brig-1'].personnel).toBe(700);
        expect(state.military.formations['rs-brig-2'].personnel).toBe(700);
        expect(state.military.formations['og-rs-corps-1-t20'].personnel).toBe(600);
        expect(state.military.og_orders).toEqual([]);
    });

    it('drains only already-active legacy OGs in sorted order and conserves combined personnel beside a live TG', () => {
        const state = convergenceState();
        const firstOg = formation('og:a', 'og', 600);
        firstOg.created_turn = 10;
        firstOg.cohesion = 10;
        firstOg.tags = ['og_max_dur:5'];
        const secondOg = formation('og:z', 'og', 300);
        secondOg.created_turn = 10;
        secondOg.cohesion = 10;
        secondOg.tags = ['og_max_dur:5'];
        state.military.formations['og:z'] = secondOg;
        state.military.formations['og:a'] = firstOg;
        state.military.corps_command!['rs-corps-1'].active_ogs = ['missing-og', 'og:z', 'og:a', 'og:z'];
        state.military.tactical_groups = {
            'tg:live': {
                id: 'tg:live',
                corps_id: 'rs-corps-1',
                op_id: 'op:live',
                anchor_brigade_id: 'rs-brig-1',
                donor_contributions: [{
                    brigade_id: 'rs-brig-2',
                    source_corps_id: 'rs-corps-1',
                    distance_hops: 1,
                    personnel_lent: 200,
                    heavy_equipment_lent: { tanks: 0, artillery: 0, aa_systems: 0 },
                    casualties_so_far: 0,
                    equipment_losses_so_far: { tanks: 0, artillery: 0, aa_systems: 0 },
                    cohesion_bleed_applied: 0,
                }],
                location_osid: 'osid:home',
                status: 'engaged',
                formed_on_turn: 19,
                cohesion: 80,
            },
        };
        state.military.formations['rs-brig-2'].personnel_lent_by_tg = { 'tg:live': 200 };
        const tacticalGroupsBefore = structuredClone(state.military.tactical_groups);
        const lentLedgerBefore = structuredClone(state.military.formations['rs-brig-2'].personnel_lent_by_tg);
        const personnelBefore = personnelAcrossLegacyOverlay(state);

        expect(updateOGLifecycle(state)).toEqual(['og:a', 'og:z']);

        expect(personnelAcrossLegacyOverlay(state)).toBe(personnelBefore);
        expect(state.military.tactical_groups).toEqual(tacticalGroupsBefore);
        expect(state.military.formations['rs-brig-2'].personnel_lent_by_tg).toEqual(lentLedgerBefore);
        expect(state.military.formations['og:a'].status).toBe('inactive');
        expect(state.military.formations['og:z'].status).toBe('inactive');
        expect(state.military.corps_command!['rs-corps-1'].active_ogs).toEqual([]);

        const stateAfterDissolution = structuredClone(state);
        expect(updateOGLifecycle(state)).toEqual([]);
        expect(state).toEqual(stateAfterDissolution);
    });

    it('bounds the compatibility drain to one deterministic decrement per active OG per call', () => {
        const state = convergenceState();
        const legacyOg = formation('og:active', 'og', 600);
        legacyOg.created_turn = 20;
        legacyOg.cohesion = 70;
        legacyOg.tags = ['og_max_dur:8'];
        state.military.formations[legacyOg.id] = legacyOg;
        state.military.corps_command!['rs-corps-1'].active_ogs = [legacyOg.id];

        expect(updateOGLifecycle(state)).toEqual([]);
        expect(state.military.formations[legacyOg.id].cohesion).toBe(66);
        expect(state.military.corps_command!['rs-corps-1'].active_ogs).toEqual([legacyOg.id]);
    });
});
