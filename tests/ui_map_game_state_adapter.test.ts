import assert from 'node:assert';
import { test } from 'node:test';

import { parseGameState } from '../src/ui/map/data/GameStateAdapter.js';
import { extractWarData } from '../src/ui/warroom/data/war_data_extractor.js';
import { getOperationalSitrepView } from '../src/ui/shared/operational_sitrep_views.js';

test('parseGameState extracts deterministic order lists and events', () => {
    const parsed = parseGameState({
  meta: { turn: 7, phase: 'war' },
  military: {
    formations: {
            b2: { faction: 'RS', name: 'B2', kind: 'brigade', readiness: 'active', cohesion: 60, status: 'active', created_turn: 1, tags: [] },
            b1: { faction: 'RBiH', name: 'B1', kind: 'brigade', readiness: 'active', cohesion: 70, status: 'active', created_turn: 1, tags: [] }
        },
    brigade_attack_orders: [
            { brigade_id: 'b2', target_settlement_id: 'S3' },
            { brigade_id: 'b1', target_settlement_id: 'S1' }
        ],
    brigade_movement_orders: {
            b2: { destination_sids: ['S4', 'S3'] },
            b1: { destination_sids: ['S2'] }
        }
  } as any,
  political: {
    control_events: [
            { turn: 7, settlement_id: 'S2', from: 'RS', to: 'RBiH', mechanism: 'phase_ii_attack', mun_id: 'foo' },
            { turn: 6, settlement_id: 'S1', from: null, to: 'RS', mechanism: 'war', mun_id: 'bar' }
        ],
    political_controllers: { S1: 'RBiH' }
  } as any,
});

    assert.strictEqual(parsed.attackOrders.length, 2);
    assert.strictEqual(parsed.attackOrders[0].brigadeId, 'b1');
    assert.strictEqual(parsed.movementOrdersSettlement?.[0]?.brigadeId, 'b1');
    assert.deepStrictEqual(parsed.movementOrdersSettlement?.[0]?.targetSettlementIds, ['S2']);
    assert.strictEqual(parsed.recentControlEvents.length, 2);
    assert.strictEqual(parsed.recentControlEvents[0].turn, 6);
});

test('parseGameState preserves meta.player_faction in LoadedGameState', () => {
    const parsed = parseGameState({
  meta: { turn: 1, phase: 'war', player_faction: 'RS' },
  military: {
    formations: {}
  } as any,
  political: {
    political_controllers: {}
  } as any,
});
    assert.strictEqual(parsed.player_faction, 'RS');
});

test('parseGameState extracts canonical front edge and pressure views', () => {
    const parsed = parseGameState({
  meta: { turn: 11, phase: 'war' },
  military: {
    formations: {},
    front_edges: [
            { a: 'S2', b: 'S1', side_a: 'RS', side_b: 'RBiH' },
            { edge_id: 'S3__S4', a: 'S3', b: 'S4', side_a: 'RBiH', side_b: 'HRHB' }
        ],
    war_front_edges_osid: [
            { a: 'op:a', b: 'op:b', side_a: 'RS', side_b: 'RBiH' }
        ],
    front_pressure: {
            S1__S2: { edge_id: 'S1__S2', value: -3, max_abs: 9, last_updated_turn: 11 }
        },
    brigade_front_assignment: {
            b1: 'RBiH__RS__S1__S2',
            b2: null,
        }
  } as any,
  political: {
    political_controllers: {}
  } as any,
});
    assert.ok(parsed.frontEdges && parsed.frontEdges.length === 2);
    assert.strictEqual(parsed.frontEdges?.[0]?.edge_id, 'S1__S2');
    assert.ok(parsed.frontEdgesOsid && parsed.frontEdgesOsid.length === 1);
    assert.strictEqual(parsed.frontEdgesOsid?.[0]?.edge_id, 'op:a__op:b');
    assert.strictEqual(parsed.frontPressureByEdge?.S1__S2?.value, -3);
    assert.strictEqual((parsed as any).brigadeFrontAssignment, undefined);
});

test('parseGameState treats phase_ii as war for formation location_osid', () => {
    const parsed = parseGameState({
  meta: { turn: 5, phase: 'phase_ii' },
  military: {
    formations: {
            b1: { id: 'b1', faction: 'RS', name: 'B1', kind: 'brigade', location_osid: 'op:mun:xyz', tags: [] },
        }
  } as any,
  political: {
    political_controllers: {}
  } as any,
});
    assert.strictEqual(parsed.phase, 'phase_ii');
    assert.strictEqual(parsed.formations.length, 1);
    assert.strictEqual(parsed.formations[0].location_osid, 'op:mun:xyz');
    assert.deepStrictEqual(parsed.formations[0].aorSettlementIds, ['op:mun:xyz']);
});

test('parseGameState accepts formations as array', () => {
    const parsed = parseGameState({
  meta: { turn: 1, phase: 'war' },
  military: {
    formations: [
            { id: 'f1', faction: 'RBiH', name: 'F1', kind: 'brigade', tags: [] },
            { id: 'f2', faction: 'RS', name: 'F2', kind: 'brigade', tags: [] },
        ]
  } as any,
  political: {
    political_controllers: {}
  } as any,
});
    assert.strictEqual(parsed.formations.length, 2);
    assert.strictEqual(parsed.formations[0].id, 'f1');
    assert.strictEqual(parsed.formations[1].id, 'f2');
});

test('parseGameState unwraps { state: GameState } wrapper', () => {
    const parsed = parseGameState({
        state: {
  meta: { turn: 3, phase: 'war' },
  military: {
    formations: {}
  } as any,
  political: {
    political_controllers: {}
  } as any,
},
    });
    assert.strictEqual(parsed.turn, 3);
    assert.strictEqual(parsed.phase, 'war');
});

test('parseGameState throws clear error when meta.turn is missing', () => {
    assert.throws(
        () => parseGameState({
  meta: {},
  military: {
    formations: {}
  } as any,
  political: {
    political_controllers: {}
  } as any,
}),
        /meta\.turn must be a number/
    );
});

test('parseGameState derives enclave, mobilization, and sector entrenchment summaries', () => {
    const parsed = parseGameState({
  meta: { turn: 16, phase: 'war', player_faction: 'RBiH' },
  supply_state_by_osid: {
            factions: [
                {
                    faction_id: 'RBiH',
                    by_osid: [
                        { osid: 'op:gorazde:gorazde_2', state: 'critical' },
                        { osid: 'op:gorazde:gorazde_3', state: 'strained' },
                        { osid: 'op:centar_sarajevo:centar_1', state: 'strained' },
                    ],
                },
            ],
        },
  military: {
    formations: {
            rbih_corps: { id: 'rbih_corps', faction: 'RBiH', name: '1st Corps', kind: 'corps', tags: [] },
            b1: {
                id: 'b1',
                faction: 'RBiH',
                corps_id: 'rbih_corps',
                name: '1st Brigade',
                kind: 'brigade',
                location_osid: 'op:gorazde:gorazde_2',
                entrenchment_turns: 4,
                dig_in_progress: 0.6,
                posture: 'dig_in',
                tags: ['mun:gorazde'],
            },
            b2: {
                id: 'b2',
                faction: 'RBiH',
                corps_id: 'rbih_corps',
                name: '2nd Brigade',
                kind: 'brigade',
                location_osid: 'op:gorazde:gorazde_3',
                entrenchment_turns: 2,
                dig_in_progress: 0.2,
                posture: 'hold',
                tags: ['mun:gorazde'],
            },
        },
    militia_pools: {
            gorazde: { faction: 'RBiH', available: 1200, committed: 300, exhausted: 100, fatigue: 0 },
            'gorazde:HRHB': { faction: 'HRHB', available: 50, committed: 20, exhausted: 10, fatigue: 0 },
            sarajevo: { faction: 'RBiH', available: 2000, committed: 500, exhausted: 250, fatigue: 0 },
        },
    strategic_reserves: {
            RBiH: 9000,
            HRHB: 1200,
        },
    corps_front_sectors: {
            rbih_sector_1: {
                sector_id: 'rbih_sector_1',
                corps_id: 'rbih_corps',
                faction: 'RBiH',
                opposing_factions: ['RS'],
                edge_ids: ['op:gorazde:gorazde_2__op:rs:foe_1'],
                sub_segments: [{ friendly_osids: ['op:gorazde:gorazde_2', 'op:gorazde:gorazde_3'], enemy_osids: ['op:rs:foe_1'] }],
                assigned_brigade_ids: ['b1', 'b2'],
                reserve_brigade_ids: [],
                density: 1.1,
                threat_ratio: 0.9,
                defensive_power: 500,
            },
        }
  } as any,
  political: {
    political_controllers: {
            'op:gorazde:gorazde_2': 'RBiH',
            'op:gorazde:gorazde_3': 'RBiH',
        },
    enclave_resilience: {
            gorazde: { resilience: 9, isolation_turns: 5, hardening_active: false },
            sarajevo: { resilience: 12, isolation_turns: 9, hardening_active: true },
        }
  } as any,
});

    assert.equal(parsed.enclaveResilience?.gorazde?.supply_state, 'critical');
    assert.equal(parsed.enclaveResilience?.gorazde?.airdrop_status, 'receiving');
    assert.equal(parsed.enclaveResilience?.gorazde?.faction, 'RBiH');
    assert.equal(parsed.enclaveResilience?.sarajevo?.hardening_active, true);

    assert.equal(parsed.mobilizationSummary?.RBiH?.total_available, 3200);
    assert.equal(parsed.mobilizationSummary?.RBiH?.total_committed, 800);
    assert.equal(parsed.mobilizationSummary?.RBiH?.total_exhausted, 350);
    assert.equal(parsed.mobilizationSummary?.RBiH?.strategic_reserve, 9000);
    assert.equal(parsed.mobilizationSummary?.RBiH?.top_pools[0]?.mun_id, 'sarajevo');

    assert.equal(parsed.sectorEntrenchmentSummary?.rbih_sector_1?.avgEntrenchment, 3);
    assert.equal(parsed.sectorEntrenchmentSummary?.rbih_sector_1?.avgDigIn, 0.4);
    assert.equal(parsed.sectorEntrenchmentSummary?.rbih_sector_1?.digInCount, 1);
    assert.equal(parsed.sectorEntrenchmentSummary?.rbih_sector_1?.totalCount, 2);
});

test('parseGameState derives operation readiness and offensive metadata', () => {
    const parsed = parseGameState({
  meta: { turn: 16, phase: 'war', player_faction: 'RBiH' },
  military: {
    formations: {
            rbih_corps: { id: 'rbih_corps', faction: 'RBiH', name: '1st Corps', kind: 'corps', tags: [] },
            b1: { id: 'b1', faction: 'RBiH', corps_id: 'rbih_corps', name: '1st Brigade', kind: 'brigade', cohesion: 80, personnel: 2000, tags: [] },
            b2: { id: 'b2', faction: 'RBiH', corps_id: 'rbih_corps', name: '2nd Brigade', kind: 'brigade', cohesion: 60, personnel: 1500, tags: [] },
        },
    corps_front_sectors: {
            rbih_sector_1: {
                sector_id: 'rbih_sector_1',
                corps_id: 'rbih_corps',
                faction: 'RBiH',
                opposing_factions: ['RS'],
                edge_ids: [],
                sub_segments: [],
                assigned_brigade_ids: ['b1', 'b2'],
                reserve_brigade_ids: ['b3'],
                density: 1.2,
                threat_ratio: 0.8,
                defensive_power: 500,
            },
        },
    sector_intel: {
            rbih_sector_1: [
                { enemy_sector_id: 'rs_sector_1', confidence: 0.65, strength_category: 'dense', posture_observed: 'defensive', offensive_signs: false, turns_in_contact: 3, visible_brigade_ids: [], last_updated_turn: 16 },
            ],
        },
    corps_command: {
            rbih_corps: {
                active_operations: [{
                    name: 'Operation Drina',
                    type: 'sector_attack',
                    phase: 'planning',
                    sector_id: 'rbih_sector_1',
                    participating_brigades: ['b1', 'b2'],
                    objectives: ['op:drina:1'],
                    current_objective_index: 0,
                    started_turn: 14,
                    phase_started_turn: 15,
                    supply_readiness: 0.75,
                    min_attack_outcome: 'costly_victory',
                    tempo: 'all_out',
                    schwerpunkt_osid: 'op:drina:1',
                    artillery_preparation: true,
                    consecutive_failures_on_current: 1,
                }],
            },
        }
  } as any,
  political: {
    political_controllers: {}
  } as any,
});

test('parseGameState scopes player-facing operations, operation history, active operations, and reserve requests', () => {
    const parsed = parseGameState({
  meta: { turn: 9, phase: 'war', player_faction: 'RBiH' },
  military: {
    formations: {
            arbih_3rd_corps: { id: 'arbih_3rd_corps', faction: 'RBiH', name: '3rd Corps', kind: 'corps', tags: [] },
            vrs_1st_krajina: { id: 'vrs_1st_krajina', faction: 'RS', name: '1st Krajina Corps', kind: 'corps', tags: [] },
            b1: { id: 'b1', faction: 'RBiH', corps_id: 'arbih_3rd_corps', name: '1st Brigade', kind: 'brigade', tags: [] },
            e1: { id: 'e1', faction: 'RS', corps_id: 'vrs_1st_krajina', name: 'Enemy Brigade', kind: 'brigade', tags: [] },
        },
    corps_command: {
            arbih_3rd_corps: {
                active_operations: [
                    { name: 'Own Op', type: 'sector_attack', phase: 'planning', started_turn: 9, participating_brigades: ['b1'], objectives: ['osid_a'] },
                ],
            },
            vrs_1st_krajina: {
                active_operations: [
                    { name: 'Enemy Op', type: 'sector_attack', phase: 'execution', started_turn: 9, participating_brigades: ['e1'], objectives: ['osid_b'] },
                ],
            },
        },
    pending_reserve_requests: [
            { request_id: 'req_own', corps_id: 'arbih_3rd_corps', faction: 'RBiH', reason: 'pressure', description: 'Need reserve', turn_requested: 9 },
            { request_id: 'req_enemy', corps_id: 'vrs_1st_krajina', faction: 'RS', reason: 'pressure', description: 'Enemy reserve', turn_requested: 9 },
        ],
  } as any,
  operation_history: [
        { operation_id: 'own_hist', operation_name: 'Own Historic Op', corps_id: 'arbih_3rd_corps', faction: 'RBiH', started_turn: 1, ended_turn: 2, outcome: 'success', objectives_targeted: [], objectives_captured: [], objectives_logged_captured: [], objectives_held_without_logged_capture: [], capture_provenance: 'no_objectives_held', total_attacks: 1, casualties_suffered: { killed: 0, wounded: 0 }, casualties_inflicted: { killed: 0, wounded: 0 }, equipment_lost: { tanks: 0, artillery: 0 }, equipment_destroyed: { tanks: 0, artillery: 0 }, equipment_captured: { tanks: 0, artillery: 0 }, grade: { stars: 2, verdict: 'solid', factors: {} }, duration_turns: 1, weekly_log: [] },
        { operation_id: 'enemy_hist', operation_name: 'Enemy Historic Op', corps_id: 'vrs_1st_krajina', faction: 'RS', started_turn: 1, ended_turn: 2, outcome: 'success', objectives_targeted: [], objectives_captured: [], objectives_logged_captured: [], objectives_held_without_logged_capture: [], capture_provenance: 'no_objectives_held', total_attacks: 1, casualties_suffered: { killed: 0, wounded: 0 }, casualties_inflicted: { killed: 0, wounded: 0 }, equipment_lost: { tanks: 0, artillery: 0 }, equipment_destroyed: { tanks: 0, artillery: 0 }, equipment_captured: { tanks: 0, artillery: 0 }, grade: { stars: 2, verdict: 'solid', factors: {} }, duration_turns: 1, weekly_log: [] },
    ] as any,
  political: {
    political_controllers: {}
  } as any,
});

    assert.deepEqual(parsed.operations?.map((operation) => operation.name), ['Own Op']);
    assert.deepEqual(parsed.activeOperations?.map((operation) => operation.operation_name), ['Own Op']);
    assert.deepEqual(parsed.operationHistory?.map((operation) => operation.operation_name), ['Own Historic Op']);
    assert.deepEqual(parsed.pendingReserveRequests?.map((request) => request.request_id), ['req_own']);
    assert.equal(parsed.operationHistory?.[0]?.capture_provenance, 'no_objectives_held');
});

test('parseGameState derives legacy AAR provenance when new provenance fields are absent', () => {
    const parsed = parseGameState({
        meta: { turn: 9, phase: 'war', player_faction: 'RBiH' },
        military: { formations: {} } as any,
        operation_history: [
            {
                operation_id: 'legacy_hist',
                operation_name: 'Legacy Historic Op',
                corps_id: 'arbih_3rd_corps',
                faction: 'RBiH',
                started_turn: 1,
                ended_turn: 2,
                outcome: 'success',
                objectives_targeted: ['osid_a', 'osid_b'],
                objectives_captured: ['osid_a', 'osid_b'],
                total_attacks: 0,
                casualties_suffered: { killed: 0, wounded: 0 },
                casualties_inflicted: { killed: 0, wounded: 0 },
                equipment_lost: { tanks: 0, artillery: 0 },
                equipment_destroyed: { tanks: 0, artillery: 0 },
                equipment_captured: { tanks: 0, artillery: 0 },
                grade: { stars: 2, verdict: 'solid', factors: {} },
                duration_turns: 1,
                weekly_log: [],
            },
        ] as any,
        political: {
            political_controllers: {},
        } as any,
    });

    assert.equal(parsed.operationHistory?.[0]?.capture_provenance, 'held_without_logged_attack');
    assert.deepEqual(parsed.operationHistory?.[0]?.objectives_held_without_logged_capture, ['osid_a', 'osid_b']);
});

    const operation = parsed.operations?.[0];
    assert.ok(operation);
    assert.equal(operation?.min_attack_outcome, 'costly_victory');
    assert.equal(operation?.tempo, 'all_out');
    assert.equal(operation?.schwerpunkt_osid, 'op:drina:1');
    assert.equal(operation?.artillery_preparation, true);
    assert.equal(operation?.readiness?.supply, 0.75);
    assert.equal(operation?.readiness?.intel, 0.65);
    assert.equal(operation?.avg_cohesion, 70);
    assert.equal(operation?.avg_personnel_pct, 0.7);
});

test('parseGameState exposes municipality support orders for the player faction UI', () => {
    const parsed = parseGameState({
  meta: { turn: 9, phase: 'war', player_faction: 'RBiH' },
  military: {
    formations: {},
    municipality_support_orders: {
            RBiH: {
                faction: 'RBiH',
                mun_id: 'gorazde',
                type: 'weapons_shipment',
                staged_turn: 9,
            }
        }
  } as any,
  political: {
    political_controllers: {}
  } as any,
});

    assert.equal(parsed.municipalitySupportOrders?.RBiH?.mun_id, 'gorazde');
    assert.equal(parsed.municipalitySupportOrders?.RBiH?.type, 'weapons_shipment');
    assert.equal(parsed.municipalitySupportOrders?.RBiH?.label, 'Weapons shipment');
});

test('parseGameState maps sim-owned command briefing without rebuilding it in the adapter', () => {
    const parsed = parseGameState({
  meta: { turn: 24, phase: 'war', player_faction: 'RBiH' },
  military: {
    formations: {},
    last_briefing: {
            turn: 24,
            faction: 'RBiH',
            headline: '2 items for your review.',
            criticalCount: 1,
            warningCount: 1,
            items: [
                {
                    id: 'cmd-1',
                    section: 'command',
                    severity: 'critical',
                    title: 'Commander requests acknowledgement',
                    detail: 'Pending officer decision remains unresolved.',
                    target: { corpsId: 'rbih_corps' },
                },
                {
                    id: 'hum-1',
                    section: 'humanitarian',
                    severity: 'warning',
                    title: 'Gorazde under prolonged siege',
                    detail: 'Isolation is now affecting resilience.',
                    target: { enclaveId: 'gorazde' },
                },
            ],
        },
  } as any,
  political: {
    political_controllers: {}
  } as any,
});

test('parseGameState maps the canonical operational SITREP packet from extractWarData', () => {
    const rawState = {
        meta: { turn: 9, phase: 'war', player_faction: 'RBiH' },
        factions: [
            { id: 'RBiH', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 } },
            { id: 'RS', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 } },
        ],
        military: {
            formations: {
                arbih_3rd_corps: { id: 'arbih_3rd_corps', faction: 'RBiH', kind: 'corps', status: 'active', name: 'arbih_3rd_corps', personnel: 0 },
                arbih_b1: { id: 'arbih_b1', faction: 'RBiH', kind: 'brigade', status: 'active', name: '', personnel: 450, cohesion: 41, corps_id: 'arbih_3rd_corps' },
            },
            casualty_ledger: {},
            front_edges: [
                { edge_id: 'edge_1', a: 'op:tuzla:centar', b: 'op:bijeljina:center', side_a: 'RBiH', side_b: 'RS' },
            ],
            front_pressure: { edge_1: { value: 0.9, max_abs: 1, last_updated_turn: 9 } },
            front_segments: { edge_1: { friction: 0.5 } },
            militia_garrison: {},
            brigade_movement_state: {},
            brigade_encircled: { arbih_b1: true },
            corps_command: {
                arbih_3rd_corps: {
                    stance: 'balanced',
                    active_operations: [{ type: 'sector_attack', phase: 'execution', started_turn: 8 }],
                },
            },
        },
        political: {
            political_controllers: {
                'op:tuzla:centar': 'RBiH',
                'op:bijeljina:center': 'RS',
            },
            war_exhaustion: { RBiH: 0.2 },
            loss_of_control_trends: { by_faction: { RBiH: { exhaustion_trend: 'flat' } } },
        },
        displacement: {
            displacement_state: {},
            displacement_camp_state: { camp_1: {} },
            hostile_takeover_timers: { timer_1: {} },
            civilian_casualties: {},
            sustainability_state: {
                tuzla: { mun_id: 'tuzla', collapsed: false, sustainability_score: 20 },
            },
        },
    } as any;

    const parsed = parseGameState(rawState);
    const expected = getOperationalSitrepView(rawState, 'RBiH');

    assert.deepStrictEqual(parsed.operationalSitrep?.front, expected.front);
    assert.deepStrictEqual(parsed.operationalSitrep?.readiness, expected.readiness);
    assert.deepStrictEqual(parsed.operationalSitrep?.sustainment, expected.sustainment);
    assert.deepStrictEqual(parsed.operationalSitrep?.operations, expected.operations);
    assert.deepStrictEqual(parsed.operationalSitrep?.alerts, expected.alerts);
    assert.strictEqual(parsed.operationalSitrep?.headline, expected.headline);
});

    const briefing = (parsed as typeof parsed & {
        commandBriefing?: {
            headline: string;
            criticalCount: number;
            pendingCount: number;
            items: Array<{
                id: string;
                kind: string;
                severity: string;
                target: { type: string };
            }>;
        };
    }).commandBriefing;

    assert.ok(briefing);
    assert.equal(briefing?.criticalCount, 1);
    assert.equal(briefing?.pendingCount, 2);
    assert.equal(briefing?.headline, '2 items for your review.');
    assert.deepStrictEqual(
        briefing?.items.map((item) => `${item.id}:${item.kind}:${item.severity}:${item.target.type}`),
        [
            'cmd-1:command:critical:corps',
            'hum-1:humanitarian:warning:enclaves',
        ]
    );
});
