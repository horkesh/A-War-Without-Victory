import { describe, expect, it } from 'vitest';

import { buildBriefing } from '../../src/sim/combat/commander/briefing.js';
import { managePlan } from '../../src/sim/combat/commander/plan.js';

import type {
    CorpsFrontSector,
    FactionId,
    FormationId,
    FormationState,
    GameState,
} from '../../src/state/game_state.js';
import type {
    BrigadeEvaluation,
    CommanderBriefing,
    ForceAssessment,
    ZoneAssessment,
    ZoneId,
} from '../../src/sim/combat/commander/commander_state.js';

function makeZone(overrides: Partial<ZoneAssessment> = {}): ZoneAssessment {
    return {
        zone_id: 'zone:test_corps:0' as ZoneId,
        corps_id: 'test_corps' as FormationId,
        faction: 'RBiH' as FactionId,
        osids: ['op:test:t1', 'op:test:t2'],
        front_edge_count: 10,
        depth: 3,
        corridor_width: 5,
        population_value: 10000,
        strategic_value: 5,
        posture: 'balanced',
        commitment_ratio: 2.5,
        garrison_budget: 1,
        assigned_brigades: [],
        surplus_brigades: [],
        deficit: 0,
        is_main_body: true,
        enemy_adjacent_osids: [],
        is_must_hold: false,
        ...overrides,
    };
}

function makeEval(overrides: Partial<BrigadeEvaluation> = {}): BrigadeEvaluation {
    return {
        brigade_id: 'b1' as FormationId,
        fitness_offense: 1.0,
        fitness_defense: 0.6,
        fitness_garrison: 0.4,
        equipment_class: 'mechanized',
        equipment_priority: 3,
        tier: 'main_effort',
        is_combat_effective: true,
        is_disrupted: false,
        is_on_loan: false,
        is_home_defense: false,
        morale: 80,
        current_zone: 'zone:test_corps:0' as ZoneId,
        ...overrides,
    };
}

function makeForces(
    evaluations: BrigadeEvaluation[],
    zones: ZoneAssessment[] = [],
): ForceAssessment {
    const byZone: Record<string, BrigadeEvaluation[]> = {};
    for (const ev of evaluations) {
        const key = ev.current_zone ?? '__unassigned__';
        if (!byZone[key]) byZone[key] = [];
        byZone[key]!.push(ev);
    }

    return {
        total_brigades: evaluations.length,
        combat_effective: evaluations.filter(ev => ev.is_combat_effective).length,
        evaluations,
        by_zone: byZone,
        tier_counts: {
            main_effort: evaluations.filter(ev => ev.tier === 'main_effort').length,
            active_defense: evaluations.filter(ev => ev.tier === 'active_defense').length,
            garrison: evaluations.filter(ev => ev.tier === 'garrison').length,
        },
        total_surplus: zones.reduce((sum, zone) => sum + Math.max(0, zone.assigned_brigades.length - zone.garrison_budget), 0),
    };
}

function makeMinimalBriefing(overrides: Partial<CommanderBriefing> = {}): CommanderBriefing {
    return {
        corps_id: 'test_corps' as FormationId,
        faction: 'RBiH' as FactionId,
        turn: 10,
        spatial: {
            adjacency: new Map<string, string[]>([
                ['op:enemy:priority', ['op:test:t1']],
                ['op:enemy:other', ['op:test:t2']],
            ]),
            friendlyOsidsByFaction: new Map<FactionId, Set<string>>([
                ['RBiH' as FactionId, new Set(['op:test:t1', 'op:test:t2'])],
            ]),
            componentsByFaction: new Map<FactionId, Map<string, number>>([
                ['RBiH' as FactionId, new Map([
                    ['op:test:t1', 0],
                    ['op:test:t2', 0],
                ])],
            ]),
        } as any,
        sectors: [],
        brigades: [],
        supply_by_osid: null,
        ethnic_map: null,
        graph_analysis: null,
        front_geometry: null,
        intel_data: null,
        doctrine_stance: 'balanced',
        corps_stance: 'balanced',
        corps_exhaustion: 0,
        avg_fatigue_pct: 0,
        brigades_above_fatigue_threshold: 0,
        enemy_equipment_summary: {
            tanks: 0,
            artillery: 0,
            infantry_only: true,
        },
        officer_personality: {
            aggression: 0.6,
            caution: 0.3,
            initiative: 0.4,
            competence: 0.7,
        },
        pre_planned_ops: [],
        previous_state: null,
        active_operations: [],
        must_hold_osids: [],
        campaign_role: null,
        campaign_offensive_targets: [],
        campaign_hold_targets: [],
        campaign_stance_ceiling: null,
        campaign_sync_role: null,
        campaign_sync_targets: [],
        ...overrides,
    } as CommanderBriefing;
}

describe('commander briefing campaign intent', () => {
    it('buildBriefing carries campaign front intent and merges campaign hold targets', () => {
        const corpsId = 'test_corps' as FormationId;
        const faction = 'RBiH' as FactionId;
        const sector: CorpsFrontSector = {
            sector_id: 'sector:test',
            corps_id: corpsId,
            faction,
            opposing_factions: ['RS' as FactionId],
            edge_ids: ['e1'],
            sub_segments: [{
                id: 'ss1',
                friendly_osids: ['op:test:t1'],
                enemy_osids: ['op:enemy:priority'],
                length_edges: 1,
            }],
            length_edges: 1,
            territory_osids: ['op:test:t1'],
            assigned_brigade_ids: ['b1' as FormationId],
            reserve_brigade_ids: [],
            stance: 'defend',
            sector_stance: 'defend',
            local_priority: 0,
            vulnerability: 0,
            opportunity_score: 0,
        } as unknown as CorpsFrontSector;

        const brigade: FormationState = {
            id: 'b1' as FormationId,
            faction,
            name: 'Test Brigade',
            created_turn: 0,
            status: 'active',
            assignment: null,
            kind: 'brigade',
            personnel: 1800,
            cohesion: 60,
            morale: 60,
            location_osid: 'op:test:t1',
            corps_id: corpsId,
        } as FormationState;

        const state = {
            meta: { turn: 10 },
            military: {
                formations: { [brigade.id]: brigade },
                corps_front_sectors: { [sector.sector_id]: sector },
                corps_command: {
                    [corpsId]: {
                        stance: 'balanced',
                        corps_exhaustion: 14,
                        active_operations: [],
                    },
                },
                campaign_plans: {
                    [faction]: {
                        issued_turn: 10,
                        valid_until_turn: 14,
                        emergency: false,
                        trigger_reason: 'test',
                        front_priorities: [{
                            corps_id: corpsId,
                            role: 'primary',
                            suggested_stance: 'offensive',
                            offensive_targets: ['op:enemy:priority'],
                            hold_targets: ['op:test:campaign_hold'],
                        }],
                        doctrine_override: {
                            army_stance: 'general_offensive',
                            aggression_modifier: 0.2,
                            corps_stance_ceilings: { [corpsId]: 'offensive' },
                        },
                        synchronized_operations: [{
                            name: 'sync test',
                            participants: [{
                                corps_id: corpsId,
                                role: 'main_effort',
                                target_osids: ['op:enemy:priority'],
                                min_brigades: 3,
                            }],
                            launch_window_start: 10,
                            launch_window_end: 12,
                            target_area: ['test_area'],
                        }],
                        force_transfers: [],
                        excluded_corps: [],
                    },
                },
                must_hold_osids_by_corps: {
                    [corpsId]: ['op:test:scripted_hold'],
                },
                sector_intel: {},
                opsec_sectors: [],
            },
        } as unknown as GameState;

        const briefing = buildBriefing(
            state,
            corpsId,
            faction,
            {
                adjacency: new Map(),
                friendlyOsidsByFaction: new Map([[faction, new Set(['op:test:t1'])]]),
            } as any,
            [],
            null,
            null,
            null,
            null,
        );

        expect(briefing.campaign_role).toBe('primary');
        expect(briefing.campaign_offensive_targets).toEqual(['op:enemy:priority']);
        expect(briefing.campaign_hold_targets).toEqual(['op:test:campaign_hold']);
        expect(briefing.campaign_stance_ceiling).toBe('offensive');
        expect(briefing.campaign_sync_role).toBe('main_effort');
        expect(briefing.campaign_sync_targets).toEqual(['op:enemy:priority']);
        expect(briefing.must_hold_osids).toEqual(['op:test:campaign_hold', 'op:test:scripted_hold']);
        expect(briefing.corps_exhaustion).toBe(14);
    });

    it('buildBriefing summarizes adjacent enemy equipment from opposing sectors', () => {
        const corpsId = 'test_corps' as FormationId;
        const enemyCorpsId = 'enemy_corps' as FormationId;
        const faction = 'RBiH' as FactionId;
        const enemyFaction = 'RS' as FactionId;

        const friendlySector: CorpsFrontSector = {
            sector_id: 'sector:friendly',
            corps_id: corpsId,
            faction,
            opposing_factions: [enemyFaction],
            edge_ids: ['e1'],
            sub_segments: [{
                id: 'ss_friendly',
                friendly_osids: ['op:test:t1'],
                enemy_osids: ['op:enemy:e1'],
                length_edges: 1,
            }],
            length_edges: 1,
            territory_osids: ['op:test:t1'],
            assigned_brigade_ids: ['b1' as FormationId],
            reserve_brigade_ids: [],
            stance: 'defend',
            sector_stance: 'defend',
            local_priority: 0,
            vulnerability: 0,
            opportunity_score: 0,
        } as unknown as CorpsFrontSector;

        const enemySector: CorpsFrontSector = {
            sector_id: 'sector:enemy',
            corps_id: enemyCorpsId,
            faction: enemyFaction,
            opposing_factions: [faction],
            edge_ids: ['e2'],
            sub_segments: [{
                id: 'ss_enemy',
                friendly_osids: ['op:enemy:e1'],
                enemy_osids: ['op:test:t1'],
                length_edges: 1,
            }],
            length_edges: 1,
            territory_osids: ['op:enemy:e1'],
            assigned_brigade_ids: ['enemy_mech' as FormationId, 'enemy_inf' as FormationId],
            reserve_brigade_ids: [],
            stance: 'defend',
            sector_stance: 'defend',
            local_priority: 0,
            vulnerability: 0,
            opportunity_score: 0,
        } as unknown as CorpsFrontSector;

        const friendlyBrigade: FormationState = {
            id: 'b1' as FormationId,
            faction,
            name: 'Friendly Brigade',
            created_turn: 0,
            status: 'active',
            assignment: null,
            kind: 'brigade',
            personnel: 1800,
            cohesion: 60,
            morale: 60,
            location_osid: 'op:test:t1',
            corps_id: corpsId,
        } as FormationState;

        const enemyMechanized: FormationState = {
            id: 'enemy_mech' as FormationId,
            faction: enemyFaction,
            name: 'Enemy Mechanized',
            created_turn: 0,
            status: 'active',
            assignment: null,
            kind: 'brigade',
            personnel: 2200,
            cohesion: 70,
            morale: 65,
            location_osid: 'op:enemy:e1',
            corps_id: enemyCorpsId,
            composition: {
                infantry: 800,
                tanks: 12,
                artillery: 6,
                aa_systems: 1,
                tank_condition: { operational: 1, degraded: 0, non_operational: 0 },
                artillery_condition: { operational: 1, degraded: 0, non_operational: 0 },
            },
        } as unknown as FormationState;

        const enemyInfantry: FormationState = {
            id: 'enemy_inf' as FormationId,
            faction: enemyFaction,
            name: 'Enemy Infantry',
            created_turn: 0,
            status: 'active',
            assignment: null,
            kind: 'brigade',
            personnel: 1600,
            cohesion: 55,
            morale: 55,
            location_osid: 'op:enemy:e1',
            corps_id: enemyCorpsId,
            composition: {
                infantry: 900,
                tanks: 0,
                artillery: 0,
                aa_systems: 0,
                tank_condition: { operational: 0, degraded: 0, non_operational: 1 },
                artillery_condition: { operational: 0, degraded: 0, non_operational: 1 },
            },
        } as unknown as FormationState;

        const state = {
            meta: { turn: 10 },
            military: {
                formations: {
                    [friendlyBrigade.id]: friendlyBrigade,
                    [enemyMechanized.id]: enemyMechanized,
                    [enemyInfantry.id]: enemyInfantry,
                },
                corps_front_sectors: {
                    [friendlySector.sector_id]: friendlySector,
                    [enemySector.sector_id]: enemySector,
                },
                corps_command: {
                    [corpsId]: {
                        stance: 'balanced',
                        corps_exhaustion: 14,
                        active_operations: [],
                    },
                },
                must_hold_osids_by_corps: {},
                sector_intel: {},
                opsec_sectors: [],
            },
            political: {
                political_controllers: {
                    'op:test:t1': faction,
                    'op:enemy:e1': enemyFaction,
                },
            },
        } as unknown as GameState;

        const briefing = buildBriefing(
            state,
            corpsId,
            faction,
            {
                adjacency: new Map([
                    ['op:test:t1', ['op:enemy:e1']],
                    ['op:enemy:e1', ['op:test:t1']],
                ]),
                friendlyOsidsByFaction: new Map([
                    [faction, new Set(['op:test:t1'])],
                    [enemyFaction, new Set(['op:enemy:e1'])],
                ]),
            } as any,
            [],
            null,
            null,
            null,
            null,
        );

        expect(briefing.enemy_equipment_summary).toEqual({
            tanks: 12,
            artillery: 6,
            infantry_only: false,
        });
    });

    it('buildBriefing summarizes subordinate brigade fatigue from live ops state', () => {
        const corpsId = 'test_corps' as FormationId;
        const faction = 'RBiH' as FactionId;

        const sector: CorpsFrontSector = {
            sector_id: 'sector:test',
            corps_id: corpsId,
            faction,
            opposing_factions: ['RS' as FactionId],
            edge_ids: ['e1'],
            sub_segments: [],
            length_edges: 1,
            territory_osids: ['op:test:t1'],
            assigned_brigade_ids: ['b1' as FormationId, 'b2' as FormationId, 'b3' as FormationId],
            reserve_brigade_ids: [],
            stance: 'defend',
            sector_stance: 'defend',
            local_priority: 0,
            vulnerability: 0,
            opportunity_score: 0,
        } as unknown as CorpsFrontSector;

        const makeBrigade = (
            id: string,
            fatigue: number,
        ): FormationState => ({
            id: id as FormationId,
            faction,
            name: id,
            created_turn: 0,
            status: 'active',
            assignment: null,
            kind: 'brigade',
            personnel: 1600,
            cohesion: 60,
            morale: 60,
            location_osid: 'op:test:t1',
            corps_id: corpsId,
            ops: {
                fatigue,
                last_supplied_turn: null,
            },
        } as FormationState);

        const state = {
            meta: { turn: 12 },
            military: {
                formations: {
                    b1: makeBrigade('b1', 12),
                    b2: makeBrigade('b2', 24),
                    b3: makeBrigade('b3', 30),
                },
                corps_front_sectors: { [sector.sector_id]: sector },
                corps_command: {
                    [corpsId]: {
                        stance: 'balanced',
                        corps_exhaustion: 10,
                        active_operations: [],
                    },
                },
                sector_intel: {},
                opsec_sectors: [],
            },
        } as unknown as GameState;

        const briefing = buildBriefing(
            state,
            corpsId,
            faction,
            {
                adjacency: new Map(),
                friendlyOsidsByFaction: new Map([[faction, new Set(['op:test:t1'])]]),
            } as any,
            [],
            null,
            null,
            null,
            null,
        );

        expect(briefing.avg_fatigue_pct).toBe(73);
        expect(briefing.brigades_above_fatigue_threshold).toBe(2);
    });
});

describe('commander planning campaign intent', () => {
    it('opportunity plan prioritizes Army HQ offensive targets when available', () => {
        const stagingZone = makeZone({
            zone_id: 'zone:test_corps:0' as ZoneId,
            posture: 'projecting',
            front_edge_count: 10,
            surplus_brigades: ['b1', 'b2', 'b3'].map(id => id as FormationId),
            assigned_brigades: ['b1', 'b2', 'b3'].map(id => id as FormationId),
            enemy_adjacent_osids: ['op:enemy:other', 'op:enemy:priority'],
            osids: ['op:test:t1', 'op:test:t2'],
        });
        const zones = [stagingZone];
        const evals = ['b1', 'b2', 'b3'].map((id, index) => makeEval({
            brigade_id: id as FormationId,
            current_zone: stagingZone.zone_id,
            fitness_offense: 1.0 - index * 0.1,
        }));
        const forces = makeForces(evals, zones);

        const briefing = makeMinimalBriefing({
            campaign_role: 'primary',
            campaign_offensive_targets: ['op:enemy:priority'],
            brigades: ['b1', 'b2', 'b3'].map((id, index) => ({
                id: id as FormationId,
                faction: 'RBiH' as FactionId,
                name: id,
                created_turn: 0,
                status: 'active',
                assignment: null,
                kind: 'brigade',
                personnel: 1800,
                cohesion: 60,
                morale: 60,
                location_osid: index === 0 ? 'op:test:t1' : 'op:test:t2',
            })) as FormationState[],
        });

        const result = managePlan(briefing, zones, forces, evals, null, 10);

        expect(result.action).toBe('created');
        expect(result.plan).not.toBeNull();
        expect(result.plan!.target_osids[0]).toBe('op:enemy:priority');
    });

    it('opportunity plan prioritizes synchronized-operation targets over broader campaign targets', () => {
        const stagingZone = makeZone({
            zone_id: 'zone:test_corps:0' as ZoneId,
            posture: 'projecting',
            front_edge_count: 10,
            surplus_brigades: ['b1', 'b2', 'b3'].map(id => id as FormationId),
            assigned_brigades: ['b1', 'b2', 'b3'].map(id => id as FormationId),
            enemy_adjacent_osids: ['op:enemy:campaign', 'op:enemy:sync'],
            osids: ['op:test:t1', 'op:test:t2'],
        });
        const zones = [stagingZone];
        const evals = ['b1', 'b2', 'b3'].map((id, index) => makeEval({
            brigade_id: id as FormationId,
            current_zone: stagingZone.zone_id,
            fitness_offense: 1.0 - index * 0.1,
        }));
        const forces = makeForces(evals, zones);

        const briefing = makeMinimalBriefing({
            campaign_role: 'primary',
            campaign_offensive_targets: ['op:enemy:campaign'],
            campaign_sync_role: 'main_effort',
            campaign_sync_targets: ['op:enemy:sync'],
            spatial: {
                adjacency: new Map<string, string[]>([
                    ['op:enemy:campaign', ['op:test:t1']],
                    ['op:enemy:sync', ['op:test:t2']],
                    ['op:test:t1', ['op:enemy:campaign']],
                    ['op:test:t2', ['op:enemy:sync']],
                ]),
                friendlyOsidsByFaction: new Map<FactionId, Set<string>>([
                    ['RBiH' as FactionId, new Set(['op:test:t1', 'op:test:t2'])],
                ]),
                componentsByFaction: new Map<FactionId, Map<string, number>>([
                    ['RBiH' as FactionId, new Map([
                        ['op:test:t1', 0],
                        ['op:test:t2', 0],
                    ])],
                ]),
            } as any,
            brigades: ['b1', 'b2', 'b3'].map((id, index) => ({
                id: id as FormationId,
                faction: 'RBiH' as FactionId,
                name: id,
                created_turn: 0,
                status: 'active',
                assignment: null,
                kind: 'brigade',
                personnel: 1800,
                cohesion: 60,
                morale: 60,
                location_osid: index === 0 ? 'op:test:t1' : 'op:test:t2',
            })) as FormationState[],
        });

        const result = managePlan(briefing, zones, forces, evals, null, 10);

        expect(result.action).toBe('created');
        expect(result.plan).not.toBeNull();
        expect(result.plan!.target_osids[0]).toBe('op:enemy:sync');
    });

    it('opportunity plan demands more brigades against heavy enemy equipment', () => {
        const stagingZone = makeZone({
            zone_id: 'zone:test_corps:0' as ZoneId,
            posture: 'projecting',
            front_edge_count: 10,
            surplus_brigades: ['b1', 'b2', 'b3', 'b4'].map(id => id as FormationId),
            assigned_brigades: ['b1', 'b2', 'b3', 'b4'].map(id => id as FormationId),
            enemy_adjacent_osids: ['op:enemy:priority'],
            osids: ['op:test:t1', 'op:test:t2'],
        });
        const zones = [stagingZone];
        const evals = ['b1', 'b2', 'b3', 'b4'].map((id, index) => makeEval({
            brigade_id: id as FormationId,
            current_zone: stagingZone.zone_id,
            fitness_offense: 1.0 - index * 0.1,
            tier: index < 3 ? 'main_effort' : 'active_defense',
        }));
        const forces = makeForces(evals, zones);

        const briefing = makeMinimalBriefing({
            enemy_equipment_summary: {
                tanks: 12,
                artillery: 12,
                infantry_only: false,
            },
            brigades: ['b1', 'b2', 'b3', 'b4'].map((id, index) => ({
                id: id as FormationId,
                faction: 'RBiH' as FactionId,
                name: id,
                created_turn: 0,
                status: 'active',
                assignment: null,
                kind: 'brigade',
                personnel: 1800,
                cohesion: 60,
                morale: 60,
                location_osid: index === 0 ? 'op:test:t1' : 'op:test:t2',
            })) as FormationState[],
        });

        const result = managePlan(briefing, zones, forces, evals, null, 10);

        expect(result.action).toBe('created');
        expect(result.plan).not.toBeNull();
        expect(result.plan!.required_brigades).toBe(4);
    });

    it('does not create an opportunity plan when the local brigade pool is heavily fatigued', () => {
        const zoneId = 'zone:test_corps:0' as ZoneId;
        const brigIds = ['b1', 'b2', 'b3', 'b4'].map(id => id as FormationId);
        const zones = [makeZone({
            zone_id: zoneId,
            posture: 'projecting',
            front_edge_count: 10,
            enemy_adjacent_osids: ['op:enemy:e1', 'op:enemy:e2'],
            surplus_brigades: brigIds,
            assigned_brigades: brigIds,
        })];
        const evals = brigIds.map(id => makeEval({
            brigade_id: id,
            current_zone: zoneId,
            tier: 'main_effort',
            is_combat_effective: true,
            is_disrupted: false,
        }));
        const forces = makeForces(evals, zones);

        const briefing = makeMinimalBriefing({
            avg_fatigue_pct: 73,
            brigades_above_fatigue_threshold: 2,
        });

        const result = managePlan(briefing, zones, forces, evals, null, 10);

        expect(result.action).toBe('none');
        expect(result.reason).toContain('fatigue');
        expect(result.plan).toBeNull();
    });

    it('does not create a fresh offensive plan on an economy front', () => {
        const zoneId = 'zone:test_corps:0' as ZoneId;
        const brigIds = ['b1', 'b2', 'b3'].map(id => id as FormationId);
        const zones = [makeZone({
            zone_id: zoneId,
            posture: 'projecting',
            front_edge_count: 10,
            enemy_adjacent_osids: ['op:enemy:e1'],
            surplus_brigades: brigIds,
            assigned_brigades: brigIds,
        })];
        const evals = brigIds.map(id => makeEval({
            brigade_id: id,
            current_zone: zoneId,
            tier: 'main_effort',
            is_combat_effective: true,
            is_disrupted: false,
        }));
        const forces = makeForces(evals, zones);

        const briefing = makeMinimalBriefing({
            campaign_role: 'economy',
        });

        const result = managePlan(briefing, zones, forces, evals, null, 10);

        expect(result.action).toBe('none');
        expect(result.reason).toContain('economy');
        expect(result.plan).toBeNull();
    });

    it('does not create a fresh offensive plan on a contain front', () => {
        const zoneId = 'zone:test_corps:0' as ZoneId;
        const brigIds = ['b1', 'b2', 'b3'].map(id => id as FormationId);
        const zones = [makeZone({
            zone_id: zoneId,
            posture: 'projecting',
            front_edge_count: 10,
            enemy_adjacent_osids: ['op:enemy:e1'],
            surplus_brigades: brigIds,
            assigned_brigades: brigIds,
        })];
        const evals = brigIds.map(id => makeEval({
            brigade_id: id,
            current_zone: zoneId,
            tier: 'main_effort',
            is_combat_effective: true,
            is_disrupted: false,
        }));
        const forces = makeForces(evals, zones);

        const briefing = makeMinimalBriefing({
            campaign_role: 'contain',
        });

        const result = managePlan(briefing, zones, forces, evals, null, 10);

        expect(result.action).toBe('none');
        expect(result.reason).toContain('contain');
        expect(result.plan).toBeNull();
    });

    it('does not create a fresh offensive plan when synchronized role is feint', () => {
        const zoneId = 'zone:test_corps:0' as ZoneId;
        const brigIds = ['b1', 'b2', 'b3'].map(id => id as FormationId);
        const zones = [makeZone({
            zone_id: zoneId,
            posture: 'projecting',
            front_edge_count: 10,
            enemy_adjacent_osids: ['op:enemy:e1'],
            surplus_brigades: brigIds,
            assigned_brigades: brigIds,
        })];
        const evals = brigIds.map(id => makeEval({
            brigade_id: id,
            current_zone: zoneId,
            tier: 'main_effort',
            is_combat_effective: true,
            is_disrupted: false,
        }));
        const forces = makeForces(evals, zones);

        const briefing = makeMinimalBriefing({
            campaign_role: 'primary',
            campaign_sync_role: 'feint',
            campaign_sync_targets: ['op:enemy:e1'],
        });

        const result = managePlan(briefing, zones, forces, evals, null, 10);

        expect(result.action).toBe('none');
        expect(result.reason).toContain('feint');
        expect(result.plan).toBeNull();
    });

    it('does not create a fresh offensive plan when synchronized role is fixing', () => {
        const zoneId = 'zone:test_corps:0' as ZoneId;
        const brigIds = ['b1', 'b2', 'b3'].map(id => id as FormationId);
        const zones = [makeZone({
            zone_id: zoneId,
            posture: 'projecting',
            front_edge_count: 10,
            enemy_adjacent_osids: ['op:enemy:e1'],
            surplus_brigades: brigIds,
            assigned_brigades: brigIds,
        })];
        const evals = brigIds.map(id => makeEval({
            brigade_id: id,
            current_zone: zoneId,
            tier: 'main_effort',
            is_combat_effective: true,
            is_disrupted: false,
        }));
        const forces = makeForces(evals, zones);

        const briefing = makeMinimalBriefing({
            campaign_role: 'primary',
            campaign_sync_role: 'fixing',
            campaign_sync_targets: ['op:enemy:e1'],
        });

        const result = managePlan(briefing, zones, forces, evals, null, 10);

        expect(result.action).toBe('none');
        expect(result.reason).toContain('fixing');
        expect(result.plan).toBeNull();
    });
});
