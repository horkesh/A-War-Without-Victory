import { describe, expect, it } from 'vitest';

import {
    OPERATION_OPPORTUNITY_CATALOG,
    applyOpportunityDecision,
    buildProposalId,
    evaluateAxes,
    isOpportunityEligible,
    linkOpportunityResolutionToAAR,
    preflightOpportunityAdmission,
    runOpportunityEvaluationStep,
} from '../src/sim/combat/operation_opportunities.js';
import { advanceSectorOffensives } from '../src/sim/combat/sector_offensive.js';
import { resolveAttackOrdersOsid } from '../src/sim/combat/attack_resolution_osid.js';
import { generateAllBotOrdersOsid } from '../src/sim/combat/bot_brigade_ai_osid.js';
import { processOsidColumnMovement } from '../src/sim/combat/osid_column_movement.js';
import { buildAttackOrderOwner } from '../src/sim/combat/operation_phase_gate.js';
import { canFormationReachAssemblyInTime } from '../src/sim/combat/sector_offensive_launch_helpers.js';
import { initializeCasualtyLedger } from '../src/state/casualty_ledger.js';
import {
    BEHAR_I_94_OPPORTUNITY,
    CENTRAL_BOSNIA_VLASIC_OPPORTUNITIES,
    DONJI_VAKUF_95_OPPORTUNITY,
    KUPRES_CINCAR_94_OPPORTUNITY,
    VLASIC_RIDGE_95_OPPORTUNITY,
} from '../src/sim/combat/operation_opportunity_catalog_central_bosnia.js';
import type { OperationAAR } from '../src/sim/combat/operation_aar.js';
import type { CorpsCommandState, FactionId, GameState } from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';

const STAGING_ANCHORS = [
    'op:travnik:travnik_2',
    'op:travnik:turbe_2',
    'op:travnik:cukle_2',
];

// The authored March ridge objectives (VLASIC_TRAVNIK_RIDGE_OBJECTIVES): Domet-1's
// two historical targets. Varošluk/Komar belongs to the September 1995 Donji Vakuf
// advance, not Domet-1 (see PROJECT_LEDGER.md "Owner approval for March Vlašić
// objective scope"); the op:skender_vakuf cells were removed 2026-09-02.
const VLASIC_OBJECTIVES = [
    'op:travnik:paklarevo',
    'op:travnik:gornje_krcevine',
];

const VLASIC_BRIGADES = [
    'arbih_17th_vitezka_mountain',
    'arbih_706th_muslim_mountain',
    'arbih_712th_mountain',
    'arbih_727th_slavna',
    'arbih_737th_muslim_light',
    'arbih_705th_slavna_mountain',
];

const DONJI_VAKUF_STAGING_ANCHORS = [
    'op:travnik:turbe_2',
    'op:bugojno:gracanica',
    'op:bugojno:kopcic_2',
];

const DONJI_VAKUF_OBJECTIVES = [
    'op:donji_vakuf:komar_2',
    'op:donji_vakuf:donji_vakuf_2',
    'op:donji_vakuf:babin_potok_2',
    'op:donji_vakuf:kutanja',
    'op:donji_vakuf:torlakovac_2',
    'op:donji_vakuf:pribraca_2',
    'op:donji_vakuf:prusac_2',
    'op:donji_vakuf:jemanlici',
    'op:donji_vakuf:korenici',
    'op:donji_vakuf:oborci_2',
];

const DONJI_VAKUF_BRIGADES = [
    'arbih_17th_vitezka_mountain',
    'arbih_705th_slavna_mountain',
    'arbih_706th_muslim_mountain',
    'arbih_707th_slavna_mountain',
    'arbih_727th_slavna',
];

const KUPRES_STAGING_ANCHORS = [
    'op:livno:livno_2',
    'op:duvno:tomislavgrad_2',
    'op:kupres:kupres_2',
    'op:kupres:goravci',
];

const KUPRES_OBJECTIVES = [
    'op:kupres:bucovaca',
    'op:kupres:donji_malovan',
    'op:kupres:novo_selo_2',
];

const KUPRES_GLAMOC_SHOULDER_OBJECTIVES = [
    'op:glamoc:glamoc_2',
    'op:glamoc:pribelja',
    'op:glamoc:vidimlije_2',
];

const KUPRES_BRIGADES = [
    'hrhb_kralj_petar_kreimir_iv_brigade',
    'hrhb_kralj_tomislav_brigade',
    'hv_5th_guards_karlovac',
    'hv_7th_guards_varazdin',
];

const BEHAR_I_BRIGADES = [
    'arbih_162nd_mountain',
    'arbih_164th_mountain',
];
const BEHAR_I_STAGING = 'op:vares:budozelje_2';
const BEHAR_I_TARGET = 'op:vares:toljenak';
const BEHAR_I_GRAPH = new Map<string, string[]>([
    ['op:vares:ravne', ['op:vares:vares_2', BEHAR_I_TARGET]],
    ['op:vares:vares_2', ['op:vares:ravne', BEHAR_I_STAGING, BEHAR_I_TARGET]],
    ['op:vares:gornja_borovica_2', [BEHAR_I_STAGING]],
    [BEHAR_I_STAGING, ['op:vares:vares_2', 'op:vares:gornja_borovica_2', BEHAR_I_TARGET]],
    [BEHAR_I_TARGET, ['op:vares:ravne', 'op:vares:vares_2', BEHAR_I_STAGING]],
]);
const BEHAR_I_EDGES: EdgeRecord[] = [
    { edge_id: 'ravne-vares', a: 'op:vares:ravne', b: 'op:vares:vares_2' } as EdgeRecord,
    { edge_id: 'ravne-toljenak', a: 'op:vares:ravne', b: BEHAR_I_TARGET } as EdgeRecord,
    { edge_id: 'vares-budozelje', a: 'op:vares:vares_2', b: BEHAR_I_STAGING } as EdgeRecord,
    { edge_id: 'vares-toljenak', a: 'op:vares:vares_2', b: BEHAR_I_TARGET } as EdgeRecord,
    { edge_id: 'borovica-budozelje', a: 'op:vares:gornja_borovica_2', b: BEHAR_I_STAGING } as EdgeRecord,
    { edge_id: 'budozelje-toljenak', a: BEHAR_I_STAGING, b: BEHAR_I_TARGET } as EdgeRecord,
];
const BEHAR_I_TARGET_SECTOR = 'sector:arbih_1st_corps:behar_target';

function buildBeharIState(opts: {
    turn: number;
    targetHeldByRs?: boolean;
    stagingHeld?: boolean;
    reverseInsertion?: boolean;
}): GameState {
    const cmd: CorpsCommandState = {
        command_span: 2,
        subordinate_count: 2,
        og_slots: 1,
        active_ogs: [],
        corps_exhaustion: 8,
        stance: 'offensive',
        active_operations: [],
        commander_state: { current_plan: null, decision_trace: null, operation_history: [] } as unknown as CorpsCommandState['commander_state'],
    };
    const rows = BEHAR_I_BRIGADES.map((id, index) => [id, {
        id,
        name: id,
        kind: 'brigade',
        status: 'active',
        faction: 'RBiH',
        corps_id: 'arbih_1st_corps',
        personnel: 1800,
        strength: 1800,
        officer_quality: 0.7,
        cohesion: 62,
        morale: 100,
        location_osid: index === 0 ? 'op:vares:ravne' : 'op:vares:gornja_borovica_2',
        composition: {
            infantry: 1800,
            tanks: 0,
            artillery: 1,
            aa_systems: 0,
            tank_condition: { operational: 0 },
            artillery_condition: { operational: 1 },
        },
        ops: { fatigue: 0, last_supplied_turn: opts.turn },
        disrupted_turns: 0,
        readiness: 'active',
        created_turn: 0,
        posture: 'attack',
    }] as const);
    if (opts.reverseInsertion) rows.reverse();
    const formations = Object.fromEntries([
        ...rows,
        ['arbih_1st_corps', {
            id: 'arbih_1st_corps', name: 'ARBiH 1st Corps', kind: 'corps', status: 'active', faction: 'RBiH',
        }],
    ]);
    return {
        schema_version: 0,
        meta: { turn: opts.turn, seed: 'behar-i-test', phase: 'war' },
        factions: [{
            id: 'RBiH',
            capability_profile: {
                training_quality: 0.7,
                organizational_maturity: 0.7,
                equipment_access: 0.5,
                equipment_operational: 0.5,
                doctrine_effectiveness: { ATTACK: 0.6, COORDINATED_STRIKE: 0.6 },
            },
        }],
        military: {
            formations,
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            corps_command: { arbih_1st_corps: cmd },
            corps_front_sectors: {
                [BEHAR_I_TARGET_SECTOR]: {
                    sector_id: BEHAR_I_TARGET_SECTOR,
                    corps_id: 'arbih_1st_corps',
                    faction: 'RBiH',
                    edge_ids: ['budozelje-toljenak', 'ravne-toljenak'],
                    territory_osids: [BEHAR_I_STAGING, 'op:vares:ravne'],
                    sub_segments: [{
                        sub_segment_id: `subseg:${BEHAR_I_TARGET_SECTOR}:0`,
                        edge_ids: ['budozelje-toljenak', 'ravne-toljenak'],
                        friendly_osids: [BEHAR_I_STAGING, 'op:vares:ravne'],
                        enemy_osids: [BEHAR_I_TARGET],
                    }],
                    assigned_brigade_ids: [],
                    reserve_brigade_ids: [],
                    rear_brigade_ids: [],
                },
                'sector:arbih_1st_corps:behar_ravne': {
                    sector_id: 'sector:arbih_1st_corps:behar_ravne',
                    corps_id: 'arbih_1st_corps', faction: 'RBiH', edge_ids: [],
                    territory_osids: ['op:vares:ravne', 'op:vares:vares_2'], sub_segments: [],
                    assigned_brigade_ids: ['arbih_162nd_mountain'], reserve_brigade_ids: [], rear_brigade_ids: [],
                },
                'sector:arbih_1st_corps:behar_borovica': {
                    sector_id: 'sector:arbih_1st_corps:behar_borovica',
                    corps_id: 'arbih_1st_corps', faction: 'RBiH', edge_ids: [],
                    territory_osids: ['op:vares:gornja_borovica_2'], sub_segments: [],
                    assigned_brigade_ids: ['arbih_164th_mountain'], reserve_brigade_ids: [], rear_brigade_ids: [],
                },
            },
            sector_intel: {
                [BEHAR_I_TARGET_SECTOR]: [{
                    enemy_sector_id: 'sector:vrs_sarajevo_romanija:behar', enemy_faction: 'RS',
                    enemy_corps_id: 'vrs_sarajevo_romanija', front_edge_count: 1,
                    strength_category: 'thin', posture_observed: 'defensive', offensive_signs: false,
                    confidence: 1, turns_in_contact: 3, visible_brigade_ids: [], last_updated_turn: opts.turn,
                }],
            },
            war_front_edges_osid: [{
                edge_id: 'budozelje-toljenak', a: BEHAR_I_STAGING, b: BEHAR_I_TARGET,
                side_a: 'RBiH', side_b: 'RS',
            }, {
                edge_id: 'ravne-toljenak', a: 'op:vares:ravne', b: BEHAR_I_TARGET,
                side_a: 'RBiH', side_b: 'RS',
            }],
            brigade_attack_orders: {},
            brigade_movement_orders: {},
            brigade_posture_orders: [],
            faction_officer_maturity: { RBiH: 3.5 },
        },
        political: {
            political_controllers: {
                [BEHAR_I_STAGING]: (opts.stagingHeld ?? true) ? 'RBiH' : 'RS',
                [BEHAR_I_TARGET]: (opts.targetHeldByRs ?? true) ? 'RS' : 'RBiH',
                'op:vares:ravne': 'RBiH',
                'op:vares:vares_2': 'RBiH',
                'op:vares:gornja_borovica_2': 'RBiH',
            },
            war_alliance_rbih_hrhb: 1,
            // Retained n91 carries the live condition and a legacy report pressure of 100.
            // The production helper correctly derives live pressure 16 from condition 84.
            war_supply_condition: { RBiH: 84 },
            war_supply_pressure: { RBiH: 100 },
        } as unknown as GameState['political'],
        displacement: {} as GameState['displacement'],
    } as unknown as GameState;
}

function buildVlasicState(opts: {
    turn: number;
    alliance?: number;
    stagingHeld?: boolean;
    objectivesHeldByRs?: boolean;
    addCommanderState?: boolean;
    supplyPressure?: number;
    axisCoordinationLow?: boolean;
}): GameState {
    const cmd: CorpsCommandState = {
        command_span: 8,
        subordinate_count: 8,
        og_slots: 1,
        active_ogs: [],
        corps_exhaustion: 8,
        stance: 'offensive',
        active_operations: [],
        commander_state: (opts.addCommanderState ?? true)
            ? { current_plan: null, decision_trace: null, operation_history: [] } as unknown as CorpsCommandState['commander_state']
            : undefined,
    };

    const controllers: Record<string, FactionId> = {};
    for (const osid of STAGING_ANCHORS) {
        controllers[osid] = (opts.stagingHeld ?? true) ? 'RBiH' : 'RS';
    }
    for (const osid of VLASIC_OBJECTIVES) {
        controllers[osid] = (opts.objectivesHeldByRs ?? true) ? 'RS' : 'RBiH';
    }

    const formations: Record<string, unknown> = {};
    for (const id of VLASIC_BRIGADES) {
        formations[id] = {
            id,
            name: id,
            kind: 'brigade',
            status: 'active',
            faction: 'RBiH',
            corps_id: 'arbih_3rd_corps',
            personnel: 1400,
            strength: 1400,
            officer_quality: opts.axisCoordinationLow ? 0.25 : 0.75,
            cohesion: opts.axisCoordinationLow ? 35 : 70,
            morale: opts.axisCoordinationLow ? 40 : 72,
            composition: {
                tanks: 0,
                artillery: 1,
                tank_condition: { operational: 0 },
                artillery_condition: { operational: 1 },
            },
        };
    }

    return {
        schema_version: 0,
        meta: { turn: opts.turn, seed: 'vlasic-test', phase: 'war' },
        factions: [{
            id: 'RBiH',
            capability_profile: {
                training_quality: opts.axisCoordinationLow ? 0.3 : 0.7,
                organizational_maturity: opts.axisCoordinationLow ? 0.3 : 0.7,
                equipment_access: 0.5,
                equipment_operational: 0.5,
                doctrine_effectiveness: { ATTACK: 0.6, COORDINATED_STRIKE: 0.6 },
            },
        }],
        military: {
            formations,
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            corps_command: { arbih_3rd_corps: cmd },
            faction_officer_maturity: { RBiH: opts.axisCoordinationLow ? 1.5 : 3.5 },
        },
        political: {
            political_controllers: controllers,
            war_alliance_rbih_hrhb: opts.alliance ?? 0.65,
            war_supply_pressure: { RBiH: opts.supplyPressure ?? 55 },
        } as unknown as GameState['political'],
        displacement: {} as GameState['displacement'],
    } as unknown as GameState;
}

function buildDonjiVakufState(opts: {
    turn: number;
    stormRuptured?: boolean;
    stagingHeld?: boolean;
    objectivesHeldByRs?: boolean;
    addCommanderState?: boolean;
    supplyPressure?: number;
    axisCoordinationLow?: boolean;
}): GameState {
    const cmd: CorpsCommandState = {
        command_span: 4,
        subordinate_count: 4,
        og_slots: 1,
        active_ogs: [],
        corps_exhaustion: 8,
        stance: 'offensive',
        active_operations: [],
        commander_state: (opts.addCommanderState ?? true)
            ? { current_plan: null, decision_trace: null, operation_history: [] } as unknown as CorpsCommandState['commander_state']
            : undefined,
    };

    const controllers: Record<string, FactionId> = {};
    for (const osid of DONJI_VAKUF_STAGING_ANCHORS) {
        controllers[osid] = (opts.stagingHeld ?? true) ? 'RBiH' : 'RS';
    }
    for (const osid of DONJI_VAKUF_OBJECTIVES) {
        controllers[osid] = (opts.objectivesHeldByRs ?? true) ? 'RS' : 'RBiH';
    }

    const formations: Record<string, unknown> = {};
    for (const id of DONJI_VAKUF_BRIGADES) {
        formations[id] = {
            id,
            name: id,
            kind: 'brigade',
            status: 'active',
            faction: 'RBiH',
            corps_id: 'arbih_3rd_corps',
            own_corps_cmd: 'arbih_3rd_corps',
            personnel: 1350,
            strength: 1350,
            officer_quality: opts.axisCoordinationLow ? 0.25 : 0.72,
            cohesion: opts.axisCoordinationLow ? 34 : 68,
            morale: opts.axisCoordinationLow ? 40 : 70,
            composition: {
                tanks: 0,
                artillery: 1,
                tank_condition: { operational: 0 },
                artillery_condition: { operational: 1 },
            },
        };
    }

    return {
        schema_version: 0,
        meta: {
            turn: opts.turn,
            seed: 'donji-vakuf-test',
            phase: 'war',
            operation_storm_turn: (opts.stormRuptured ?? true) ? 172 : undefined,
        },
        factions: [{
            id: 'RBiH',
            capability_profile: {
                training_quality: opts.axisCoordinationLow ? 0.3 : 0.7,
                organizational_maturity: opts.axisCoordinationLow ? 0.3 : 0.7,
                equipment_access: 0.55,
                equipment_operational: 0.55,
                doctrine_effectiveness: { ATTACK: 0.62, COORDINATED_STRIKE: 0.62 },
            },
        }],
        military: {
            formations,
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            corps_command: { arbih_3rd_corps: cmd },
            faction_officer_maturity: { RBiH: opts.axisCoordinationLow ? 1.5 : 3.5 },
            event_last_fired_turn: (opts.stormRuptured ?? true) ? { operation_storm_1995: 172 } : {},
        },
        political: {
            political_controllers: controllers,
            war_supply_pressure: { RBiH: opts.supplyPressure ?? 55 },
            war_alliance_rbih_hrhb: 0.65,
        } as unknown as GameState['political'],
        displacement: {} as GameState['displacement'],
    } as unknown as GameState;
}

function buildDonjiVakufSourceOobState(turn: number): GameState {
    const state = buildDonjiVakufState({ turn });
    for (const id of DONJI_VAKUF_BRIGADES) {
        const formation = state.military.formations[id] as { corps_id?: string; own_corps_cmd?: string };
        formation.corps_id = 'arbih_3rd_corps';
        formation.own_corps_cmd = 'arbih_3rd_corps';
    }
    return state;
}

function buildKupresCincarState(opts: {
    turn: number;
    alliance?: number;
    stagingHeld?: boolean;
    objectivesHeldByRs?: boolean;
    addCommanderState?: boolean;
    supplyPressure?: number;
    axisCoordinationLow?: boolean;
}): GameState {
    const cmd: CorpsCommandState = {
        command_span: 6,
        subordinate_count: 6,
        og_slots: 1,
        active_ogs: [],
        corps_exhaustion: 10,
        stance: 'offensive',
        active_operations: [],
        commander_state: (opts.addCommanderState ?? true)
            ? { current_plan: null, decision_trace: null, operation_history: [] } as unknown as CorpsCommandState['commander_state']
            : undefined,
    };

    const controllers: Record<string, FactionId> = {};
    for (const osid of KUPRES_STAGING_ANCHORS) {
        controllers[osid] = (opts.stagingHeld ?? true) ? 'HRHB' : 'RS';
    }
    for (const osid of [...KUPRES_OBJECTIVES, ...KUPRES_GLAMOC_SHOULDER_OBJECTIVES]) {
        controllers[osid] = (opts.objectivesHeldByRs ?? true) ? 'RS' : 'HRHB';
    }

    const formations: Record<string, unknown> = {};
    for (const id of KUPRES_BRIGADES) {
        formations[id] = {
            id,
            name: id,
            kind: 'brigade',
            status: 'active',
            faction: 'HRHB',
            corps_id: 'hvo_tomislavgrad',
            personnel: 1450,
            strength: 1450,
            officer_quality: opts.axisCoordinationLow ? 0.25 : 0.72,
            cohesion: opts.axisCoordinationLow ? 34 : 68,
            morale: opts.axisCoordinationLow ? 40 : 70,
            composition: {
                tanks: 1,
                artillery: 2,
                tank_condition: { operational: 1 },
                artillery_condition: { operational: 2 },
            },
        };
    }

    return {
        schema_version: 0,
        meta: { turn: opts.turn, seed: 'kupres-cincar-test', phase: 'war', hv_brigades_spawned: true },
        factions: [{
            id: 'HRHB',
            capability_profile: {
                training_quality: opts.axisCoordinationLow ? 0.3 : 0.7,
                organizational_maturity: opts.axisCoordinationLow ? 0.3 : 0.7,
                equipment_access: 0.65,
                equipment_operational: 0.65,
                doctrine_effectiveness: { ATTACK: 0.65, COORDINATED_STRIKE: 0.65 },
            },
        }],
        military: {
            formations,
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            corps_command: { hvo_tomislavgrad: cmd },
            faction_officer_maturity: { HRHB: opts.axisCoordinationLow ? 1.5 : 3.5 },
        },
        political: {
            political_controllers: controllers,
            war_alliance_rbih_hrhb: opts.alliance ?? 0.65,
            war_supply_pressure: { HRHB: opts.supplyPressure ?? 55 },
            rbih_hrhb_state: { washington_signed: true, washington_turn: 85 },
        } as unknown as GameState['political'],
        displacement: {} as GameState['displacement'],
    } as unknown as GameState;
}

describe('Central Bosnia / Vlasic operation opportunity catalog', () => {
    it('authors BEHAR-I as a two-proxy Toljenak-only allocation in the bounded preparation window', () => {
        expect(BEHAR_I_94_OPPORTUNITY).toMatchObject({
            opportunity_id: 'behar_i_94',
            name: 'Operation Behar-I',
            faction: 'RBiH',
            primary_corps: 'arbih_1st_corps',
            staging_osid: BEHAR_I_STAGING,
            planning_duration: 3,
        });
        expect(BEHAR_I_94_OPPORTUNITY).not.toHaveProperty('min_attack_outcome');
        expect(BEHAR_I_94_OPPORTUNITY).not.toHaveProperty('coordinated_advance');
        expect(BEHAR_I_94_OPPORTUNITY.axes).toEqual([expect.objectContaining({
            axis_id: 'nisici_plateau',
            brigades: BEHAR_I_BRIGADES,
            staging_osid: BEHAR_I_STAGING,
            objectives: [BEHAR_I_TARGET],
        })]);
        expect(BEHAR_I_94_OPPORTUNITY.citations.join('\n')).toContain(
            'docs/40_reports/implemented/20261023_BEHAR_I_TOLJENAK_CANDIDATE.md',
        );
        expect(BEHAR_I_94_OPPORTUNITY.citations.join('\n')).toContain(
            'current-model predecessor allocation only, with no exact capturing formation claim',
        );
        expect(CENTRAL_BOSNIA_VLASIC_OPPORTUNITIES).toContain(BEHAR_I_94_OPPORTUNITY);
        expect(OPERATION_OPPORTUNITY_CATALOG).toContain(BEHAR_I_94_OPPORTUNITY);

        const eligible = buildBeharIState({ turn: 133 });
        expect(isOpportunityEligible(
            BEHAR_I_94_OPPORTUNITY,
            evaluateAxes(eligible, 133, BEHAR_I_94_OPPORTUNITY),
        )).toBe(true);
        for (const turn of [132, 134]) {
            const state = buildBeharIState({ turn });
            expect(isOpportunityEligible(
                BEHAR_I_94_OPPORTUNITY,
                evaluateAxes(state, turn, BEHAR_I_94_OPPORTUNITY),
            )).toBe(false);
        }
    });

    it('admits both live proxies deterministically and rejects an unavailable or committed proxy', () => {
        const state = buildBeharIState({ turn: 133 });
        expect(preflightOpportunityAdmission(state, BEHAR_I_94_OPPORTUNITY))
            .toEqual({ admitted: true, selected_participants: 2, required_participants: 2, reason: null });

        const reversed = buildBeharIState({ turn: 133, reverseInsertion: true });
        runOpportunityEvaluationStep(state, 133);
        runOpportunityEvaluationStep(reversed, 133);
        applyOpportunityDecision(state, 133, buildProposalId('behar_i_94', 133), 'approve');
        applyOpportunityDecision(reversed, 133, buildProposalId('behar_i_94', 133), 'approve');
        const operation = state.military.corps_command!.arbih_1st_corps.active_operations[0];
        const reversedOperation = reversed.military.corps_command!.arbih_1st_corps.active_operations[0];
        expect(operation).toEqual(reversedOperation);
        expect(operation).toMatchObject({
            name: 'Operation Behar-I',
            phase: 'planning',
            phase_started_turn: 133,
            planning_duration: 3,
            participating_brigades: BEHAR_I_BRIGADES,
            objectives: [BEHAR_I_TARGET],
        });
        expect(state.political.political_controllers![BEHAR_I_TARGET]).toBe('RS');
        expect(JSON.parse(JSON.stringify(operation))).toEqual(operation);

        const unavailable = buildBeharIState({ turn: 133 });
        unavailable.military.formations!.arbih_164th_mountain!.status = 'inactive';
        expect(preflightOpportunityAdmission(unavailable, BEHAR_I_94_OPPORTUNITY))
            .toMatchObject({ admitted: false, selected_participants: 1, required_participants: 2 });

        const committed = buildBeharIState({ turn: 133 });
        committed.military.corps_command!.arbih_1st_corps.active_operations.push({
            name: 'Existing operation', type: 'sector_attack', phase: 'execution', started_turn: 120,
            phase_started_turn: 120, participating_brigades: ['arbih_162nd_mountain'], objectives: ['op:test:other'],
        } as never);
        expect(preflightOpportunityAdmission(committed, BEHAR_I_94_OPPORTUNITY))
            .toMatchObject({ admitted: false, selected_participants: 1, required_participants: 2 });
    });

    it('uses ordinary friendly routes to assemble both proxies within the three-turn assembly budget', () => {
        const state = buildBeharIState({ turn: 133 });
        for (const id of BEHAR_I_BRIGADES) {
            expect(canFormationReachAssemblyInTime(
                state,
                id,
                'arbih_1st_corps',
                'RBiH',
                BEHAR_I_TARGET,
                3,
                BEHAR_I_GRAPH,
                new Map(),
                { by_sid: {} },
            )).toBe(true);
        }
        const broken = new Map(BEHAR_I_GRAPH);
        // Ravne is already in the objective's assembly sector. Isolate the
        // 164th's actual approach instead of treating the staged 162nd as remote.
        for (const [osid, neighbours] of broken) {
            broken.set(osid, neighbours.filter((neighbour) => neighbour !== 'op:vares:gornja_borovica_2'));
        }
        broken.set('op:vares:gornja_borovica_2', []);
        expect(canFormationReachAssemblyInTime(
            state,
            'arbih_164th_mountain',
            'arbih_1st_corps',
            'RBiH',
            BEHAR_I_TARGET,
            3,
            broken,
            new Map(),
            { by_sid: {} },
        )).toBe(false);
    });

    it('uses the real planning clock, normal march, order emitter, and ordinary combat resolver', () => {
        const state = buildBeharIState({ turn: 133 });
        state.factions!.push({ id: 'RS' } as never);
        // Constructed thin defender: proves ordinary defended-combat capability only.
        // The retained n91 evidence does not identify a Toljenak-resident formation at t130-136.
        state.military.formations!.toljenak_defender = {
            id: 'toljenak_defender', name: 'Constructed Toljenak defender', kind: 'brigade', status: 'active',
            faction: 'RS', corps_id: 'vrs_sarajevo_romanija', personnel: 100, cohesion: 20, morale: 20,
            location_osid: BEHAR_I_TARGET, posture: 'defend',
            composition: {
                infantry: 100, tanks: 0, artillery: 0, aa_systems: 0,
                tank_condition: { operational: 0 }, artillery_condition: { operational: 0 },
            },
        } as never;
        state.military.casualty_ledger = initializeCasualtyLedger(['RBiH', 'RS']);
        runOpportunityEvaluationStep(state, 133);
        applyOpportunityDecision(state, 133, buildProposalId('behar_i_94', 133), 'approve');
        const operation = state.military.corps_command!.arbih_1st_corps.active_operations[0]!;
        const ctx = {
            edges: BEHAR_I_EDGES,
            adjacency: BEHAR_I_GRAPH,
            reverseMap: new Map(),
            supplyStateByOsid: {} as never,
            osidPopulationMap: new Map(),
        };

        // Match the production turn order: advance existing column movement before
        // generating this turn's bot orders. The 162nd is already on the real
        // Ravne-Toljenak contact; the 164th alone marches one hop to Budozelje.
        state.meta.turn = 133;
        processOsidColumnMovement(state, BEHAR_I_EDGES, new Map(), { by_sid: {} }, BEHAR_I_GRAPH);
        advanceSectorOffensives(state, undefined, undefined, BEHAR_I_GRAPH);
        expect(operation.phase).toBe('planning');
        generateAllBotOrdersOsid(state, ['RBiH'], ctx, {
            brigadeFilter: (formation) => BEHAR_I_BRIGADES.includes(formation.id),
        });
        expect(state.military.brigade_attack_orders).toEqual({});
        expect(state.military.formations!.arbih_162nd_mountain!.location_osid).toBe('op:vares:ravne');
        expect(state.military.brigade_movement_orders?.arbih_162nd_mountain).toBeUndefined();
        expect(state.military.formations!.arbih_164th_mountain!.location_osid).toBe('op:vares:gornja_borovica_2');
        expect(state.military.brigade_movement_orders?.arbih_164th_mountain?.destination_sids)
            .toEqual([BEHAR_I_STAGING]);

        state.meta.turn = 134;
        processOsidColumnMovement(state, BEHAR_I_EDGES, new Map(), { by_sid: {} }, BEHAR_I_GRAPH);
        advanceSectorOffensives(state, undefined, undefined, BEHAR_I_GRAPH);
        expect(operation.phase).toBe('planning');
        expect(state.political.political_controllers![BEHAR_I_TARGET]).toBe('RS');
        generateAllBotOrdersOsid(state, ['RBiH'], ctx, {
            brigadeFilter: (formation) => BEHAR_I_BRIGADES.includes(formation.id),
        });
        expect(state.military.brigade_attack_orders).toEqual({});
        expect(state.military.formations!.arbih_162nd_mountain!.location_osid).toBe('op:vares:ravne');
        expect(state.military.formations!.arbih_164th_mountain!.location_osid).toBe('op:vares:gornja_borovica_2');
        expect(state.military.brigade_movement_state?.arbih_164th_mountain).toMatchObject({
            status: 'in_transit',
            destination_sids: [BEHAR_I_STAGING],
            path: ['op:vares:gornja_borovica_2', BEHAR_I_STAGING],
            turns_remaining: 1,
        });

        state.meta.turn = 135;
        processOsidColumnMovement(state, BEHAR_I_EDGES, new Map(), { by_sid: {} }, BEHAR_I_GRAPH);
        expect(state.military.formations!.arbih_162nd_mountain!.location_osid).toBe('op:vares:ravne');
        expect(state.military.formations!.arbih_164th_mountain!.location_osid).toBe(BEHAR_I_STAGING);
        advanceSectorOffensives(state, undefined, undefined, BEHAR_I_GRAPH);
        expect(operation).toMatchObject({ phase: 'execution', phase_started_turn: 135 });

        const negative = structuredClone(state);
        const negativeReport = resolveAttackOrdersOsid(negative, BEHAR_I_EDGES, BEHAR_I_GRAPH);
        expect(negativeReport.flips_applied).toBe(0);
        expect(negative.political.political_controllers![BEHAR_I_TARGET]).toBe('RS');

        generateAllBotOrdersOsid(state, ['RBiH'], ctx, {
            brigadeFilter: (formation) => BEHAR_I_BRIGADES.includes(formation.id),
        });
        expect(state.military.brigade_attack_orders).toEqual(Object.fromEntries(
            BEHAR_I_BRIGADES.map((id) => [id, BEHAR_I_TARGET]),
        ));
        // Ordinary nongated operations do not synthesize a phase-gate owner receipt.
        // Resolver attribution below proves these emitted orders belong to the live operation.
        expect(BEHAR_I_BRIGADES.map((id) => buildAttackOrderOwner(state, id, BEHAR_I_TARGET, 135)))
            .toEqual([null, null]);
        const report = resolveAttackOrdersOsid(state, BEHAR_I_EDGES, BEHAR_I_GRAPH);

        expect(report.flips_applied).toBe(1);
        expect(state.political.political_controllers![BEHAR_I_TARGET]).toBe('RBiH');
        expect(report.battles).toHaveLength(1);
        expect(report.battles[0]).toMatchObject({
            target_osid: BEHAR_I_TARGET,
            attacker_faction: 'RBiH',
            attacker_won: true,
            operation_id: 'arbih_1st_corps:Operation Behar-I:t133',
            operation_name: 'Operation Behar-I',
        });
        expect(report.battles[0]!.attacker_brigades).toEqual(BEHAR_I_BRIGADES);
        expect(report.battles[0]!.contributing_operation_ids)
            .toEqual(['arbih_1st_corps:Operation Behar-I:t133']);
    });

    it('exposes Central Bosnia opportunities through their family export and the canonical catalog', () => {
        expect(CENTRAL_BOSNIA_VLASIC_OPPORTUNITIES).toEqual([
            BEHAR_I_94_OPPORTUNITY,
            KUPRES_CINCAR_94_OPPORTUNITY,
            VLASIC_RIDGE_95_OPPORTUNITY,
            DONJI_VAKUF_95_OPPORTUNITY,
        ]);
        expect(OPERATION_OPPORTUNITY_CATALOG.some(d => d.opportunity_id === 'kupres_cincar_94')).toBe(true);
        expect(OPERATION_OPPORTUNITY_CATALOG.some(d => d.opportunity_id === 'vlasic_ridge_95')).toBe(true);
        expect(OPERATION_OPPORTUNITY_CATALOG.some(d => d.opportunity_id === 'donji_vakuf_95')).toBe(true);
        expect(KUPRES_CINCAR_94_OPPORTUNITY.family).toBe('central_bosnia_vlasic');
        expect(KUPRES_CINCAR_94_OPPORTUNITY.tier).toBe('T1');
        expect(KUPRES_CINCAR_94_OPPORTUNITY.faction).toBe('HRHB');
        expect(KUPRES_CINCAR_94_OPPORTUNITY.primary_corps).toBe('hvo_tomislavgrad');
        expect(KUPRES_CINCAR_94_OPPORTUNITY.variants?.map(v => v.variant_id).sort())
            .toEqual(['glamoc_shoulder', 'kupres_line_only']);
        expect(VLASIC_RIDGE_95_OPPORTUNITY.family).toBe('central_bosnia_vlasic');
        expect(VLASIC_RIDGE_95_OPPORTUNITY.tier).toBe('T1');
        expect(VLASIC_RIDGE_95_OPPORTUNITY.faction).toBe('RBiH');
        expect(VLASIC_RIDGE_95_OPPORTUNITY.primary_corps).toBe('arbih_3rd_corps');
        expect(VLASIC_RIDGE_95_OPPORTUNITY.variants?.map(v => v.variant_id).sort())
            .toEqual(['ridge_probe']);
        expect(DONJI_VAKUF_95_OPPORTUNITY.family).toBe('central_bosnia_vlasic');
        expect(DONJI_VAKUF_95_OPPORTUNITY.tier).toBe('T1');
        expect(DONJI_VAKUF_95_OPPORTUNITY.faction).toBe('RBiH');
        expect(DONJI_VAKUF_95_OPPORTUNITY.primary_corps).toBe('arbih_3rd_corps');
    });

    it('authors the March Vlašić ridge axis without Varošluk, retaining the two Domet-1 targets', () => {
        // 2026-09-28 owner-approved scope correction (PROJECT_LEDGER.md "Owner
        // approval for March Vlašić objective scope"; 2026-09-02 Historian ruling
        // docs/PROJECT_LEDGER_ARCHIVE_2026Q3.md:8714-8781): Varošluk/Komar is a
        // September 1995 Donji Vakuf objective, not a Domet-1 (20-24 Mar 1995) one.
        const ridgeAxis = VLASIC_RIDGE_95_OPPORTUNITY.axes[0];
        expect(ridgeAxis.objectives).toEqual([
            'op:travnik:paklarevo',
            'op:travnik:gornje_krcevine',
        ]);
        expect(ridgeAxis.objectives).not.toContain('op:travnik:varosluk');

        const probeAxis = VLASIC_RIDGE_95_OPPORTUNITY.variants
            ?.find(v => v.variant_id === 'ridge_probe')?.axes[0];
        expect(probeAxis?.objectives).toEqual([
            'op:travnik:paklarevo',
            'op:travnik:gornje_krcevine',
        ]);
    });

    it('starts Donji Vakuf 95 on the live Travnik-Komar contact edge', () => {
        const openingAxis = DONJI_VAKUF_95_OPPORTUNITY.axes[0];

        expect(openingAxis.staging_osid).toBe('op:travnik:turbe_2');
        expect(openingAxis.objectives[0]).toBe('op:donji_vakuf:komar_2');
        expect(openingAxis.brigades).toContain('arbih_17th_vitezka_mountain');
        expect(openingAxis.brigades).toContain('arbih_706th_muslim_mountain');
    });

    it('surfaces Kupres/Cincar in autumn 1994 as a dependency opportunity', () => {
        const state = buildKupresCincarState({ turn: 138 });
        runOpportunityEvaluationStep(state, 138);

        const proposal = state.military.operation_opportunities
            ?.find(p => p.opportunity_id === 'kupres_cincar_94');

        expect(proposal).toBeDefined();
        expect(proposal!.proposal_id).toBe('OPP_138_kupres_cincar_94');
        expect(proposal!.status).toBe('eligible_pending_review');
        expect(proposal!.last_axis_evaluation).toHaveLength(10);
        expect(proposal!.redirect_variants?.map(v => v.variant_id).sort())
            .toEqual(['glamoc_shoulder', 'kupres_line_only']);
        expect(isOpportunityEligible(
            KUPRES_CINCAR_94_OPPORTUNITY,
            evaluateAxes(state, 138, KUPRES_CINCAR_94_OPPORTUNITY),
        )).toBe(true);
    });

    it('uses the canonical Duvno OSID for the Tomislavgrad staging anchor', () => {
        const state = buildKupresCincarState({ turn: 138 });
        const controllers = state.political.political_controllers!;
        controllers['op:tomislavgrad:tomislavgrad_2'] = 'RS';
        controllers['op:duvno:tomislavgrad_2'] = 'HRHB';

        runOpportunityEvaluationStep(state, 138);

        expect(state.military.operation_opportunities
            ?.find(p => p.opportunity_id === 'kupres_cincar_94')).toBeDefined();
    });

    it('blocks Kupres/Cincar outside window, broken alliance, lost staging, or no enemy-held objectives', () => {
        const missingStagingController = buildKupresCincarState({ turn: 138 });
        delete missingStagingController.political.political_controllers!['op:duvno:tomislavgrad_2'];
        const cases = [
            buildKupresCincarState({ turn: 131 }),
            buildKupresCincarState({ turn: 143 }),
            buildKupresCincarState({ turn: 138, alliance: 0.35 }),
            buildKupresCincarState({ turn: 138, stagingHeld: false }),
            missingStagingController,
            buildKupresCincarState({ turn: 138, objectivesHeldByRs: false }),
        ];

        for (const state of cases) {
            runOpportunityEvaluationStep(state, state.meta.turn);
            expect((state.military.operation_opportunities ?? [])
                .find(p => p.opportunity_id === 'kupres_cincar_94')).toBeUndefined();
        }
    });

    it('spawns Kupres/Cincar through the canonical opportunity decision path', () => {
        const state = buildKupresCincarState({ turn: 138 });
        runOpportunityEvaluationStep(state, 138);
        const proposalId = buildProposalId('kupres_cincar_94', 138);

        const approved = applyOpportunityDecision(state, 138, proposalId, 'approve');

        expect(approved?.status).toBe('approved');
        expect(state.military.corps_command!.hvo_tomislavgrad.active_operations[0].name)
            .toBe('Operation Cincar / Kupres');
        expect(state.military.corps_command!.hvo_tomislavgrad.active_operations[0].axes![0].objectives)
            .toEqual(KUPRES_OBJECTIVES);
    });

    it('surfaces inside the spring 1995 window when required axes and two optional axes are green', () => {
        const state = buildVlasicState({ turn: 156 });
        runOpportunityEvaluationStep(state, 156);

        const proposal = state.military.operation_opportunities
            ?.find(p => p.opportunity_id === 'vlasic_ridge_95');

        expect(proposal).toBeDefined();
        expect(proposal!.proposal_id).toBe('OPP_156_vlasic_ridge_95');
        expect(proposal!.status).toBe('eligible_pending_review');
        expect(proposal!.last_axis_evaluation).toHaveLength(10);
        expect(proposal!.redirect_variants?.map(v => v.variant_id).sort())
            .toEqual(['ridge_probe']);
        expect(isOpportunityEligible(VLASIC_RIDGE_95_OPPORTUNITY, evaluateAxes(state, 156, VLASIC_RIDGE_95_OPPORTUNITY)))
            .toBe(true);
    });

    it('surfaces at the February planning boundary turn 150', () => {
        const state = buildVlasicState({ turn: 150 });
        runOpportunityEvaluationStep(state, 150);

        const proposal = state.military.operation_opportunities
            ?.find(p => p.opportunity_id === 'vlasic_ridge_95');

        expect(proposal).toBeDefined();
        expect(proposal!.proposal_id).toBe('OPP_150_vlasic_ridge_95');
        expect(proposal!.status).toBe('eligible_pending_review');
        expect(isOpportunityEligible(VLASIC_RIDGE_95_OPPORTUNITY, evaluateAxes(state, 150, VLASIC_RIDGE_95_OPPORTUNITY)))
            .toBe(true);
    });

    it('does not surface before/after window, under broken alliance, lost staging, or no enemy-held objectives', () => {
        const cases = [
            buildVlasicState({ turn: 149 }),
            buildVlasicState({ turn: 167 }),
            buildVlasicState({ turn: 156, alliance: 0.35 }),
            buildVlasicState({ turn: 156, stagingHeld: false }),
            buildVlasicState({ turn: 156, objectivesHeldByRs: false }),
        ];

        for (const state of cases) {
            runOpportunityEvaluationStep(state, state.meta.turn);
            expect((state.military.operation_opportunities ?? [])
                .find(p => p.opportunity_id === 'vlasic_ridge_95')).toBeUndefined();
        }
    });

    it('requires at least two optional axes; supply-red still passes if commander and force-quality are green', () => {
        const supplyRed = buildVlasicState({ turn: 156, supplyPressure: 95 });
        runOpportunityEvaluationStep(supplyRed, 156);
        const proposal = supplyRed.military.operation_opportunities
            ?.find(p => p.opportunity_id === 'vlasic_ridge_95');
        expect(proposal).toBeDefined();
        expect(proposal!.last_axis_evaluation.find(a => a.axis === 'logistics')?.green).toBe(false);
        expect(proposal!.last_axis_evaluation.find(a => a.axis === 'commander_confidence')?.green).toBe(true);
        expect(proposal!.last_axis_evaluation.find(a => a.axis === 'force_quality')?.green).toBe(true);

        const twoOptionalRed = buildVlasicState({
            turn: 153,
            supplyPressure: 95,
            addCommanderState: false,
        });
        runOpportunityEvaluationStep(twoOptionalRed, 153);
        expect((twoOptionalRed.military.operation_opportunities ?? [])
            .find(p => p.opportunity_id === 'vlasic_ridge_95')).toBeUndefined();
    });

    it('decline records a resolution without spawning an operation; approve and redirect use canonical op spawn', () => {
        const declineState = buildVlasicState({ turn: 156 });
        runOpportunityEvaluationStep(declineState, 156);
        const proposalId = buildProposalId('vlasic_ridge_95', 156);
        const declined = applyOpportunityDecision(declineState, 156, proposalId, 'decline');
        expect(declined?.status).toBe('declined');
        expect(declineState.military.corps_command!.arbih_3rd_corps.active_operations).toHaveLength(0);
        expect(declineState.military.operation_opportunity_resolutions)
            .toEqual([{ proposal_id: proposalId, opportunity_id: 'vlasic_ridge_95', response: 'decline', response_turn: 156 }]);

        const approveState = buildVlasicState({ turn: 156 });
        runOpportunityEvaluationStep(approveState, 156);
        const approved = applyOpportunityDecision(approveState, 156, proposalId, 'approve');
        expect(approved?.status).toBe('approved');
        expect(approveState.military.corps_command!.arbih_3rd_corps.active_operations[0].name)
            .toBe('Operation Vlasic Ridge');

        const redirectState = buildVlasicState({ turn: 156 });
        runOpportunityEvaluationStep(redirectState, 156);
        const redirected = applyOpportunityDecision(
            redirectState,
            156,
            proposalId,
            'redirect',
            undefined,
            { redirect_variant_id: 'ridge_probe' },
        );
        expect(redirected?.status).toBe('redirected');
        expect(redirected?.redirect_variant_id).toBe('ridge_probe');
        expect(redirectState.military.corps_command!.arbih_3rd_corps.active_operations[0].axes)
            .toHaveLength(1);
    });

    it('surfaces Donji Vakuf 95 after Storm rupture when 7th Corps staging and live RS objectives hold', () => {
        const state = buildDonjiVakufState({ turn: 178 });
        runOpportunityEvaluationStep(state, 178);

        const proposal = state.military.operation_opportunities
            ?.find(p => p.opportunity_id === 'donji_vakuf_95');

        expect(proposal).toBeDefined();
        expect(proposal!.proposal_id).toBe('OPP_178_donji_vakuf_95');
        expect(proposal!.status).toBe('eligible_pending_review');
        expect(proposal!.last_axis_evaluation).toHaveLength(10);
        expect(isOpportunityEligible(
            DONJI_VAKUF_95_OPPORTUNITY,
            evaluateAxes(state, 178, DONJI_VAKUF_95_OPPORTUNITY),
        )).toBe(true);
    });

    it('blocks Donji Vakuf 95 outside window, pre-Storm, lost staging, or no enemy-held objectives', () => {
        const cases = [
            buildDonjiVakufState({ turn: 176 }),
            buildDonjiVakufState({ turn: 181 }),
            buildDonjiVakufState({ turn: 178, stormRuptured: false }),
            buildDonjiVakufState({ turn: 178, stagingHeld: false }),
            buildDonjiVakufState({ turn: 178, objectivesHeldByRs: false }),
        ];

        for (const state of cases) {
            runOpportunityEvaluationStep(state, state.meta.turn);
            expect((state.military.operation_opportunities ?? [])
                .find(p => p.opportunity_id === 'donji_vakuf_95')).toBeUndefined();
        }
    });

    it('spawns Donji Vakuf 95 through the canonical opportunity decision path', () => {
        const state = buildDonjiVakufState({ turn: 178 });
        runOpportunityEvaluationStep(state, 178);
        const proposalId = buildProposalId('donji_vakuf_95', 178);

        const approved = applyOpportunityDecision(state, 178, proposalId, 'approve');

        expect(approved?.status).toBe('approved');
        expect(state.military.corps_command!.arbih_3rd_corps.active_operations[0].name)
            .toBe('Operation Donji Vakuf 95');
        expect(state.military.corps_command!.arbih_3rd_corps.active_operations[0].axes![0].objectives)
            .toEqual(DONJI_VAKUF_OBJECTIVES);
    });

    it('spawns Donji Vakuf 95 against the source-OOB 3rd Corps brigade owner', () => {
        const state = buildDonjiVakufSourceOobState(178);
        runOpportunityEvaluationStep(state, 178);
        const proposalId = buildProposalId('donji_vakuf_95', 178);

        const approved = applyOpportunityDecision(state, 178, proposalId, 'approve');

        expect(approved?.status).toBe('approved');
        const op = state.military.corps_command!.arbih_3rd_corps.active_operations[0];
        expect(op.name).toBe('Operation Donji Vakuf 95');
        expect(op.participating_brigades).toEqual([...DONJI_VAKUF_BRIGADES].sort());
    });

    it('links partial AAR exit class deterministically for failed/partial outcomes', () => {
        const state = buildVlasicState({ turn: 156 });
        runOpportunityEvaluationStep(state, 156);
        const proposalId = buildProposalId('vlasic_ridge_95', 156);
        applyOpportunityDecision(state, 156, proposalId, 'approve');
        const aar: OperationAAR = {
            operation_id: 'arbih_3rd_corps:vlasic:t156',
            operation_name: 'Operation Vlasic Ridge',
            corps_id: 'arbih_3rd_corps',
            faction: 'RBiH',
            type: 'sector_attack',
            started_turn: 156,
            ended_turn: 161,
            outcome: 'partial',
            objectives_targeted: [...VLASIC_OBJECTIVES],
            objectives_captured: ['op:travnik:paklarevo'],
            duration_turns: 5,
            total_attacks: 4,
            casualties_suffered: { killed: 0, wounded: 0 },
            casualties_inflicted: { killed: 0, wounded: 0 },
            equipment_lost: { tanks: 0, artillery: 0 },
            equipment_destroyed: { tanks: 0, artillery: 0 },
            equipment_captured: { tanks: 0, artillery: 0 },
            participating_brigades: [...VLASIC_BRIGADES],
            initial_strength: 7000,
            final_strength: 6400,
            grade: {
                stars: 2,
                verdict: 'partial',
                factors: { objective_completion: 0.25, exchange_ratio: 1, tempo: 1, preservation: 0.9 },
            },
            weekly_log: [],
        };

        expect(linkOpportunityResolutionToAAR(state, aar)).toBe(true);
        expect(state.military.operation_opportunity_resolutions?.[0].exit_class).toBe('partial_success');
        expect(state.military.operation_opportunity_resolutions?.[0].executed_op_aar_id)
            .toBe('arbih_3rd_corps:vlasic:t156');
    });

    it('spawns a t152 Vlašić operation with planning_duration 2 for t154 execution', () => {
        // 2026-09-28 timing candidate: planning_duration 4→2 must let a t152-approved
        // Vlašić operation begin executing by t154 (1995-03-20, the documented
        // Domet-1 start). This drives the real opportunity→spawn path and verifies
        // the operation inherits the shortened planning window.
        //
        // NOTE: The full planning→execution transition through advanceSectorOffensives
        // is NOT verified here. The opening-attack readiness gate
        // (axisHasExecutableOpeningAttack) depends on the combat predictor, which
        // returns 'catastrophic' with a null power ratio under this minimal fixture
        // (no terrain/supply/officer-lookup state). Configuring that state is not
        // cheap; see logs/vlasic-march-timing-20260928/opencode_result.md.
        const state = buildVlasicState({ turn: 152 });

        // The lifecycle owner derives the acting faction from the corps formation;
        // buildVlasicState only sets the six brigades, so add the RBiH corps.
        (state.military.formations as Record<string, unknown>)['arbih_3rd_corps'] = {
            id: 'arbih_3rd_corps',
            name: '3rd Corps',
            kind: 'corps',
            status: 'active',
            faction: 'RBiH',
            personnel: 50,
            cohesion: 80,
            morale: 75,
        };

        // Spawn the operation through the canonical opportunity decision path.
        runOpportunityEvaluationStep(state, 152);
        const proposalId = buildProposalId('vlasic_ridge_95', 152);
        const approved = applyOpportunityDecision(state, 152, proposalId, 'approve');

        expect(approved?.status).toBe('approved');
        const op = state.military.corps_command!.arbih_3rd_corps.active_operations[0];
        expect(op).toBeDefined();
        // The operation inherits the catalog's shortened planning window...
        expect(op.planning_duration).toBe(2);
        // ...starts in the planning phase at the approval turn...
        expect(op.phase).toBe('planning');
        expect(op.phase_started_turn).toBe(152);
        // ...and the 2-turn window means the earliest execution turn is t154
        // (t152 start + 2 planning turns), matching the documented Domet-1 start.
        expect(op.phase_started_turn + (op.planning_duration ?? 0)).toBe(154);
    });
});
