import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import { generateAllBotOrdersOsid } from '../src/sim/combat/bot_brigade_ai_osid.js';
import { SANA_95_OPPORTUNITY } from '../src/sim/combat/operation_opportunity_catalog_5th_corps.js';
import type { GameState } from '../src/state/game_state.js';

const otoka = 'op:bosanska_krupa:otoka_2';
const ivanjska = 'op:bosanska_krupa:ivanjska_2';
const krupaAxis = SANA_95_OPPORTUNITY.axes.find((axis) => axis.axis_id === 'sana_krupa')!;
const sanskiAxis = SANA_95_OPPORTUNITY.axes.find((axis) => axis.axis_id === 'sana_sanski_most_kljuc')!;
const sanskiBrigades = [...sanskiAxis.brigades].sort();
const krupaBrigades = [...krupaAxis.brigades].sort();

function realContactEdges(): Array<{ a: string; b: string }> {
    const graph = JSON.parse(readFileSync(
        'data/derived/operational/operational_contact_graph.json',
        'utf8',
    )) as { edges: Array<{ a: string; b: string }> };
    return graph.edges;
}

function makeState(): GameState {
    const formation = (id: string) => ({
        id,
        name: id,
        faction: 'RBiH',
        kind: 'brigade',
        status: 'active',
        corps_id: 'arbih_5th_corps',
        personnel: 1800,
        cohesion: 85,
        morale: 90,
        experience: 0.6,
        posture: 'attack',
        location_osid: otoka,
        equipment: { infantry: 1800, tanks: 0, artillery: 0, air_defense: 0 },
    });

    const axes = [krupaAxis, sanskiAxis].map((axis) => ({
        axis_id: axis.axis_id,
        name: axis.name,
        assigned_brigades: [...axis.brigades],
        objectives: [...axis.objectives],
        current_objective_index: 0,
        staging_osid: axis.staging_osid,
        preserve_objective_sequence: axis.preserve_objective_sequence,
        status: 'executing',
        failure_count: 0,
        consecutive_failures_on_current: 0,
        momentum: 0,
        attack_attempt_count: 0,
        objective_capture_count: 0,
        movement_only_execution_turns: 0,
        idle_execution_turn_streak: 0,
    }));

    return {
        meta: { turn: 177, phase: 'war', seed: 'sana-ivanjska-order-preflight' },
        political: {
            political_controllers: { [otoka]: 'RBiH', [ivanjska]: 'RS' },
            control_events: [],
        },
        military: {
            formations: Object.fromEntries(
                [...krupaBrigades, ...sanskiBrigades].map((id) => [id, formation(id)]),
            ),
            corps_command: {
                arbih_5th_corps: {
                    stance: 'offensive',
                    corps_exhaustion: 0,
                    active_operations: [{
                        name: 'Operation Sana',
                        type: 'sector_attack',
                        phase: 'execution',
                        started_turn: 175,
                        phase_started_turn: 177,
                        participating_brigades: [...krupaBrigades, ...sanskiBrigades],
                        objectives: [ivanjska],
                        current_objective_index: 0,
                        axes,
                    }],
                },
            },
            brigade_attack_orders: {},
            brigade_movement_orders: {},
            brigade_posture_orders: [],
        },
    } as unknown as GameState;
}

describe('Sana Ivanjska production order-generation preflight', () => {
    it('emits lawful Ivanjska orders for both disjoint catalog axes without changing control', () => {
        const state = makeState();
        const beforeControl = { ...state.political.political_controllers };
        const diagnostics = generateAllBotOrdersOsid(state, ['RBiH'], {
            edges: realContactEdges() as any,
            reverseMap: new Map(),
            supplyStateByOsid: {} as any,
            osidPopulationMap: new Map(),
        }, {
            brigadeFilter: (brigade) => [...sanskiBrigades, ...krupaBrigades].includes(brigade.id),
        });

        const attackOrders = Object.fromEntries(
            [...sanskiBrigades, ...krupaBrigades].map((id) => [
                id,
                state.military.brigade_attack_orders?.[id],
            ]),
        );
        const movementOrders = Object.fromEntries(
            [...sanskiBrigades, ...krupaBrigades].map((id) => [
                id,
                state.military.brigade_movement_orders?.[id]?.destination_sids?.[0] ?? null,
            ]),
        );
        const reasonReceipts = Object.fromEntries(
            [...sanskiBrigades, ...krupaBrigades].map((id) => [id, {
                faction: 'RBiH',
                location: otoka,
                current_objective: ivanjska,
                order: attackOrders[id] === ivanjska ? 'attack' : movementOrders[id] ?? 'none',
                lawful_gateway: attackOrders[id] === ivanjska || movementOrders[id] === otoka,
            }]),
        );
        console.log(JSON.stringify({ attackOrders, movementOrders, diagnostics, reasonReceipts }));

        expect(attackOrders).toEqual(Object.fromEntries(
            [...sanskiBrigades, ...krupaBrigades].map((id) => [id, ivanjska]),
        ));
        expect(movementOrders).toEqual(Object.fromEntries(
            [...sanskiBrigades, ...krupaBrigades].map((id) => [id, null]),
        ));
        expect(diagnostics.eligible_attackers_by_corps).toEqual({ arbih_5th_corps: 5 });
        expect(reasonReceipts).toEqual(Object.fromEntries(
            [...sanskiBrigades, ...krupaBrigades].map((id) => [id, {
                faction: 'RBiH', location: otoka, current_objective: ivanjska,
                order: 'attack', lawful_gateway: true,
            }]),
        ));
        expect(state.political.political_controllers).toEqual(beforeControl);
        expect(state.political.control_events).toEqual([]);
    });
});
