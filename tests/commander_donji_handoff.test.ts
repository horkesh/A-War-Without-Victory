import { describe, expect, it } from 'vitest';

import { buildBriefing } from '../src/sim/combat/commander/briefing.js';
import { managePlan } from '../src/sim/combat/commander/plan.js';

import type {
    FactionId,
    FormationId,
    FormationState,
    GameState,
} from '../src/state/game_state.js';
import type {
    BrigadeEvaluation,
    CommanderBriefing,
    ForceAssessment,
    ZoneAssessment,
    ZoneId,
} from '../src/sim/combat/commander/commander_state.js';

const TURN = 187;
const DONJI = 'op:kljuc:donji_vrbljani_2';
const TOMISLAVGRAD = 'hvo_tomislavgrad' as FormationId;
const SOUTHEAST = 'hvo_southeast_herzegovina' as FormationId;
const FIFTH_CORPS = 'arbih_5th_corps' as FormationId;

const SOUTHEAST_TARGETS = [
    'op:trebinje:ivanica',
    'op:trebinje:velicani',
    'op:trebinje:zakovo_2',
    'op:ljubinje:bancici',
    'op:ljubinje:ljubinje_2',
    'op:mostar:vranjevici_2',
    'op:nevesinje:nevesinje_2',
    'op:nevesinje:sopilja',
    'op:stolac:hatelji_2',
] as const;

const TOMISLAVGRAD_TARGETS = [
    'op:jajce:barevo_2',
    'op:jajce:jezero_2',
    'op:jajce:kruscica',
    'op:jajce:lupnica',
    'op:jajce:prisoje',
    'op:mrkonjic_grad:majdan_2',
    DONJI,
    'op:mrkonjic_grad:podrasnica_2',
    'op:bihac:trubar',
    'op:titov_drvar:drvar_2',
] as const;

const FIFTH_CORPS_TARGETS = [
    'op:bosanski_novi:krslje_2',
    'op:bosanski_novi:matavazi_2',
    'op:bosanski_novi:suhaca_4',
    DONJI,
    'op:kljuc:kljuc_2',
    'op:kljuc:krasulje_2',
    'op:kljuc:sanica_2',
    'op:prijedor:raljas',
    'op:sanski_most:jelasinovci',
    'op:sanski_most:skucani_vakuf_2',
] as const;

const CORPS_FACTS = {
    [TOMISLAVGRAD]: {
        faction: 'HRHB' as FactionId,
        stance: 'balanced' as const,
        exhaustion: 44,
        subordinateCount: 14,
        localOsid: 'op:fixture:tomislavgrad_home',
        positiveTarget: DONJI,
    },
    [SOUTHEAST]: {
        faction: 'HRHB' as FactionId,
        stance: 'defensive' as const,
        exhaustion: 0,
        subordinateCount: 11,
        localOsid: 'op:fixture:southeast_home',
        positiveTarget: SOUTHEAST_TARGETS[0],
    },
    [FIFTH_CORPS]: {
        faction: 'RBiH' as FactionId,
        stance: 'defensive' as const,
        exhaustion: 0,
        subordinateCount: 10,
        localOsid: 'op:fixture:fifth_home',
        positiveTarget: DONJI,
    },
} as const;

function makeOperation(
    name: string,
    phase: 'execution' | 'recovery',
    startedTurn: number,
    objectiveCount: number,
) {
    return {
        name,
        phase,
        started_turn: startedTurn,
        type: 'sector_attack',
        objectives: Array.from({ length: objectiveCount }, (_, index) => `op:fixture:${name}:${index}`),
    };
}

function makeFormation(
    corpsId: FormationId,
    faction: FactionId,
    localOsid: string,
    index: number,
): FormationState {
    return {
        id: `${corpsId}:brigade:${index}` as FormationId,
        faction,
        name: `${corpsId} brigade ${index}`,
        created_turn: 0,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        personnel: 1800,
        cohesion: 60,
        morale: 60,
        fatigue: 0,
        location_osid: localOsid,
        corps_id: corpsId,
    } as FormationState;
}

function makeRetainedSlice(): GameState {
    const formations: Record<string, FormationState> = {};
    for (const [corpsId, facts] of Object.entries(CORPS_FACTS)) {
        for (let index = 0; index < facts.subordinateCount; index += 1) {
            const formation = makeFormation(
                corpsId as FormationId,
                facts.faction,
                facts.localOsid,
                index,
            );
            formations[formation.id] = formation;
        }
    }

    return {
        meta: { turn: TURN },
        political: { war_exhaustion: { HRHB: 0, RBiH: 0 } },
        military: {
            formations,
            corps_front_sectors: {},
            corps_command: {
                [TOMISLAVGRAD]: {
                    stance: 'balanced',
                    corps_exhaustion: 44,
                    active_operations: [
                        makeOperation('Operation Mistral 2', 'execution', 175, 14),
                        makeOperation('Operation Southern Move', 'execution', 182, 5),
                    ],
                },
                [SOUTHEAST]: {
                    stance: 'defensive',
                    corps_exhaustion: 0,
                    active_operations: [],
                },
                [FIFTH_CORPS]: {
                    stance: 'defensive',
                    corps_exhaustion: 0,
                    active_operations: [
                        makeOperation('Operation Sana', 'execution', 175, 34),
                    ],
                },
            },
            campaign_plans: {
                HRHB: {
                    issued_turn: 185,
                    valid_until_turn: 197,
                    emergency: true,
                    trigger_reason: 'corps_strength_collapse',
                    front_priorities: [
                        {
                            corps_id: SOUTHEAST,
                            role: 'primary',
                            suggested_stance: 'offensive',
                            offensive_targets: [...SOUTHEAST_TARGETS],
                        },
                        {
                            corps_id: TOMISLAVGRAD,
                            role: 'secondary',
                            suggested_stance: 'balanced',
                            offensive_targets: [...TOMISLAVGRAD_TARGETS],
                        },
                    ],
                    doctrine_override: {
                        army_stance: 'balanced',
                        aggression_modifier: 0,
                    },
                    synchronized_operations: [{
                        name: 'sync_hvo_southeast_herzegovina_hvo_tomislavgrad',
                        participants: [
                            {
                                corps_id: SOUTHEAST,
                                role: 'main_effort',
                                target_osids: [...SOUTHEAST_TARGETS],
                                min_brigades: 3,
                            },
                            {
                                corps_id: TOMISLAVGRAD,
                                role: 'supporting',
                                target_osids: [...TOMISLAVGRAD_TARGETS],
                                min_brigades: 3,
                            },
                        ],
                        launch_window_start: 188,
                        launch_window_end: 193,
                        target_area: [
                            'bihac', 'jajce', 'kljuc', 'ljubinje', 'mostar',
                            'mrkonjic_grad', 'nevesinje', 'stolac', 'titov_drvar', 'trebinje',
                        ],
                    }],
                    force_transfers: [],
                    excluded_corps: [],
                },
                RBiH: {
                    issued_turn: 185,
                    valid_until_turn: 195,
                    emergency: true,
                    trigger_reason: 'emergency_event',
                    front_priorities: [{
                        corps_id: FIFTH_CORPS,
                        role: 'secondary',
                        suggested_stance: 'balanced',
                        offensive_targets: [...FIFTH_CORPS_TARGETS],
                    }],
                    doctrine_override: {
                        army_stance: 'balanced',
                        aggression_modifier: -0.05,
                        corps_stance_ceilings: {},
                    },
                    synchronized_operations: [],
                    force_transfers: [],
                    excluded_corps: ['arbih_general_staff'],
                },
            },
            must_hold_osids_by_corps: {},
            sector_intel: {},
            opsec_sectors: [],
        },
    } as unknown as GameState;
}

function makeSpatial() {
    const adjacency = new Map<string, string[]>();
    const friendlyOsidsByFaction = new Map<FactionId, Set<string>>([
        ['HRHB' as FactionId, new Set<string>()],
        ['RBiH' as FactionId, new Set<string>()],
    ]);
    const componentsByFaction = new Map<FactionId, Map<string, number>>([
        ['HRHB' as FactionId, new Map<string, number>()],
        ['RBiH' as FactionId, new Map<string, number>()],
    ]);

    for (const facts of Object.values(CORPS_FACTS)) {
        adjacency.set(facts.localOsid, [facts.positiveTarget]);
        const reverse = adjacency.get(facts.positiveTarget) ?? [];
        adjacency.set(facts.positiveTarget, [...new Set([...reverse, facts.localOsid])]);
        friendlyOsidsByFaction.get(facts.faction)!.add(facts.localOsid);
        componentsByFaction.get(facts.faction)!.set(facts.localOsid, 0);
    }

    return { adjacency, friendlyOsidsByFaction, componentsByFaction } as any;
}

function buildForCorps(state: GameState, corpsId: FormationId): CommanderBriefing {
    const facts = CORPS_FACTS[corpsId as keyof typeof CORPS_FACTS];
    return buildBriefing(
        state,
        corpsId,
        facts.faction,
        makeSpatial(),
        [],
        null,
        null,
        null,
        null,
    );
}

function makeEval(corpsId: FormationId, index: number, zoneId: ZoneId): BrigadeEvaluation {
    return {
        brigade_id: `${corpsId}:brigade:${index}` as FormationId,
        fitness_offense: 1 - index * 0.05,
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
        current_zone: zoneId,
    };
}

function makeOpportunityInputs(
    corpsId: FormationId,
    target: string,
    brigadeCount = 3,
    additionalTargets: string[] = [],
): { zones: ZoneAssessment[]; forces: ForceAssessment; evaluations: BrigadeEvaluation[] } {
    const facts = CORPS_FACTS[corpsId as keyof typeof CORPS_FACTS];
    const zoneId = `zone:${corpsId}:fixture` as ZoneId;
    const evaluations = Array.from(
        { length: brigadeCount },
        (_, index) => makeEval(corpsId, index, zoneId),
    );
    const brigadeIds = evaluations.map(evaluation => evaluation.brigade_id);
    const zone = {
        zone_id: zoneId,
        corps_id: corpsId,
        faction: facts.faction,
        osids: [facts.localOsid],
        front_edge_count: 1,
        depth: 1,
        corridor_width: 1,
        population_value: 1000,
        strategic_value: 5,
        posture: 'projecting',
        commitment_ratio: 2,
        garrison_budget: 0,
        assigned_brigades: brigadeIds,
        surplus_brigades: brigadeIds,
        deficit: 0,
        is_main_body: true,
        enemy_adjacent_osids: [target, ...additionalTargets],
        is_must_hold: false,
    } as ZoneAssessment;
    return {
        zones: [zone],
        evaluations,
        forces: {
            total_brigades: brigadeCount,
            combat_effective: brigadeCount,
            evaluations,
            by_zone: { [zoneId]: evaluations },
            tier_counts: { main_effort: brigadeCount, active_defense: 0, garrison: 0 },
            total_surplus: brigadeCount,
        },
    };
}

function makeRetainedForceCount(totalBrigades: number): ForceAssessment {
    return {
        total_brigades: totalBrigades,
        combat_effective: totalBrigades,
        evaluations: [],
        by_zone: {},
        tier_counts: { main_effort: totalBrigades, active_defense: 0, garrison: 0 },
        total_surplus: 0,
    };
}

function openGeneralGuards(briefing: CommanderBriefing): CommanderBriefing {
    return {
        ...briefing,
        corps_stance: 'balanced',
        corps_exhaustion: 30,
        active_operations: [],
    };
}

describe('retained Donji Vrbljani campaign-plan to commander handoff', () => {
    it('preserves the source bindings and stops at the retained earliest general guards', () => {
        const state = makeRetainedSlice();
        const tomislavgrad = buildForCorps(state, TOMISLAVGRAD);
        const southeast = buildForCorps(state, SOUTHEAST);
        const fifth = buildForCorps(state, FIFTH_CORPS);

        expect(tomislavgrad).toMatchObject({
            turn: 187,
            campaign_role: 'secondary',
            campaign_sync_role: 'supporting',
            corps_stance: 'balanced',
            corps_exhaustion: 44,
        });
        expect(tomislavgrad.campaign_offensive_targets).toEqual([...TOMISLAVGRAD_TARGETS].sort());
        expect(tomislavgrad.campaign_sync_targets).toEqual([...TOMISLAVGRAD_TARGETS].sort());
        expect(tomislavgrad.campaign_sync_targets).toContain(DONJI);
        expect(tomislavgrad.brigades).toHaveLength(14);
        expect(tomislavgrad.active_operations).toHaveLength(2);

        expect(southeast).toMatchObject({
            turn: 187,
            campaign_role: 'primary',
            campaign_sync_role: 'main_effort',
            corps_stance: 'defensive',
            corps_exhaustion: 0,
        });
        expect(southeast.campaign_offensive_targets).toEqual([...SOUTHEAST_TARGETS].sort());
        expect(southeast.campaign_sync_targets).toEqual([...SOUTHEAST_TARGETS].sort());
        expect(southeast.campaign_sync_targets).not.toContain(DONJI);
        expect(southeast.brigades).toHaveLength(11);

        expect(fifth).toMatchObject({
            turn: 187,
            campaign_role: 'secondary',
            campaign_sync_role: null,
            corps_stance: 'defensive',
            corps_exhaustion: 0,
        });
        expect(fifth.campaign_offensive_targets).toEqual([...FIFTH_CORPS_TARGETS].sort());
        expect(fifth.campaign_offensive_targets).toContain(DONJI);
        expect(fifth.campaign_sync_targets).toEqual([]);
        expect(fifth.brigades).toHaveLength(10);
        expect(fifth.active_operations).toHaveLength(1);

        const hrhbSync = state.military.campaign_plans!.HRHB!.synchronized_operations[0]!;
        expect(hrhbSync).toMatchObject({
            launch_window_start: 188,
            launch_window_end: 193,
        });
        expect(hrhbSync.participants.map(participant => ({
            corps_id: participant.corps_id,
            role: participant.role,
            min_brigades: participant.min_brigades,
        }))).toEqual([
            { corps_id: SOUTHEAST, role: 'main_effort', min_brigades: 3 },
            { corps_id: TOMISLAVGRAD, role: 'supporting', min_brigades: 3 },
        ]);
        expect((tomislavgrad as unknown as Record<string, unknown>).campaign_sync_min_brigades).toBeUndefined();
        expect((tomislavgrad as unknown as Record<string, unknown>).campaign_launch_window_start).toBeUndefined();

        const actual = {
            tomislavgrad: managePlan(
                tomislavgrad,
                [],
                makeRetainedForceCount(14),
                [],
                null,
                TURN,
            ),
            southeast: managePlan(
                southeast,
                [],
                makeRetainedForceCount(11),
                [],
                null,
                TURN,
            ),
            fifth: managePlan(
                fifth,
                [],
                makeRetainedForceCount(10),
                [],
                null,
                TURN,
            ),
        };

        expect(actual.tomislavgrad).toMatchObject({
            action: 'none',
            plan: null,
            reason: 'corps exhaustion 44 above operation threshold 30',
            decision_trace: {
                winning_intent_id: null,
                candidates: [],
                hard_constraints: ['corps_exhaustion_exceeds_threshold'],
            },
        });
        expect(actual.southeast).toMatchObject({
            action: 'none',
            plan: null,
            reason: 'corps in defensive stance — no new plans',
            decision_trace: {
                winning_intent_id: null,
                candidates: [],
                hard_constraints: ['corps_stance_forbids_offensive'],
            },
        });
        expect(actual.fifth).toMatchObject({
            action: 'none',
            plan: null,
            reason: 'corps in defensive stance — no new plans',
            decision_trace: {
                winning_intent_id: null,
                candidates: [],
                hard_constraints: ['corps_stance_forbids_offensive'],
            },
        });

        console.log(`AWWV_646_ACTUAL ${JSON.stringify({
            source: {
                hrhb_sync: {
                    launch_window: [hrhbSync.launch_window_start, hrhbSync.launch_window_end],
                    participants: hrhbSync.participants.map(participant => ({
                        corps_id: participant.corps_id,
                        role: participant.role,
                        min_brigades: participant.min_brigades,
                        target_count: participant.target_osids.length,
                        has_donji: participant.target_osids.includes(DONJI),
                    })),
                },
                rbih_fifth_target_count: fifth.campaign_offensive_targets.length,
                rbih_fifth_has_donji: fifth.campaign_offensive_targets.includes(DONJI),
            },
            decisions: Object.fromEntries(Object.entries(actual).map(([key, value]) => [key, {
                action: value.action,
                reason: value.reason,
                hard_constraints: value.decision_trace?.hard_constraints,
                candidate_count: value.decision_trace?.candidates.length,
            }])),
        })}`);
    });

    it('counterfactually opens general guards and delivers each corps source target into a plan', () => {
        const state = makeRetainedSlice();
        const cases = [TOMISLAVGRAD, SOUTHEAST, FIFTH_CORPS] as const;
        const observations: Array<Record<string, unknown>> = [];

        for (const corpsId of cases) {
            const facts = CORPS_FACTS[corpsId];
            const briefing = openGeneralGuards(buildForCorps(state, corpsId));
            const inputs = makeOpportunityInputs(corpsId, facts.positiveTarget);
            const decision = managePlan(
                briefing,
                inputs.zones,
                inputs.forces,
                inputs.evaluations,
                null,
                TURN,
            );

            expect(decision.action).toBe('created');
            expect(decision.plan?.target_osids).toContain(facts.positiveTarget);
            expect(decision.plan?.required_brigades).toBe(3);
            expect(decision.decision_trace?.candidates.some(candidate =>
                candidate.type === 'launch_opportunity'
            )).toBe(true);

            observations.push({
                corps_id: corpsId,
                source_role: briefing.campaign_role,
                sync_role: briefing.campaign_sync_role,
                selected_targets: decision.plan?.target_osids,
                required_brigades: decision.plan?.required_brigades,
                candidate_count: decision.decision_trace?.candidates.length,
                winning_intent_id: decision.decision_trace?.winning_intent_id,
            });
        }

        console.log(`AWWV_646_COUNTERFACTUAL_ADMISSION ${JSON.stringify(observations)}`);
    });

    it('counterfactual controls prove source-target preference and the generic admission floor', () => {
        const state = makeRetainedSlice();
        const alternateTarget = 'op:fixture:alternate_target';
        const hrhb = state.military.campaign_plans!.HRHB!;
        const tomislavPriority = hrhb.front_priorities.find(priority =>
            priority.corps_id === TOMISLAVGRAD
        )!;
        const tomislavParticipant = hrhb.synchronized_operations[0]!.participants.find(participant =>
            participant.corps_id === TOMISLAVGRAD
        )!;
        tomislavPriority.offensive_targets = [alternateTarget];
        tomislavParticipant.target_osids = [alternateTarget];

        const sourceAlteredBriefing = openGeneralGuards(buildForCorps(state, TOMISLAVGRAD));
        const counterfactualAdjacency = sourceAlteredBriefing.spatial.adjacency as Map<string, string[]>;
        counterfactualAdjacency.set(
            CORPS_FACTS[TOMISLAVGRAD].localOsid,
            [DONJI, alternateTarget],
        );
        counterfactualAdjacency.set(
            alternateTarget,
            [CORPS_FACTS[TOMISLAVGRAD].localOsid],
        );
        const admittedInputs = makeOpportunityInputs(
            TOMISLAVGRAD,
            DONJI,
            3,
            [alternateTarget],
        );
        const sourceAlteredDecision = managePlan(
            sourceAlteredBriefing,
            admittedInputs.zones,
            admittedInputs.forces,
            admittedInputs.evaluations,
            null,
            TURN,
        );
        expect(sourceAlteredBriefing.campaign_sync_targets).toEqual([alternateTarget]);
        expect(sourceAlteredDecision.action).toBe('created');
        expect(sourceAlteredDecision.plan?.target_osids).toContain(alternateTarget);
        expect(sourceAlteredDecision.plan?.target_osids).not.toContain(DONJI);

        const twoBrigadeInputs = makeOpportunityInputs(TOMISLAVGRAD, alternateTarget, 2);
        const belowFloorDecision = managePlan(
            sourceAlteredBriefing,
            twoBrigadeInputs.zones,
            twoBrigadeInputs.forces,
            twoBrigadeInputs.evaluations,
            null,
            TURN,
        );
        expect(belowFloorDecision.action).toBe('none');
        expect(belowFloorDecision.plan).toBeNull();
        expect(belowFloorDecision.decision_trace?.candidates.some(candidate =>
            candidate.type === 'launch_opportunity'
        )).toBe(false);

        const retainedOperationsBriefing = {
            ...sourceAlteredBriefing,
            active_operations: buildForCorps(makeRetainedSlice(), TOMISLAVGRAD).active_operations,
        };
        const liveOperationDecision = managePlan(
            retainedOperationsBriefing,
            admittedInputs.zones,
            admittedInputs.forces,
            admittedInputs.evaluations,
            null,
            TURN,
        );
        expect(liveOperationDecision).toMatchObject({
            action: 'none',
            plan: null,
            reason: 'major operation already active for this corps',
            decision_trace: {
                candidates: [],
                hard_constraints: ['major_operation_already_active'],
            },
        });

        console.log(`AWWV_646_COUNTERFACTUAL_CONTROLS ${JSON.stringify({
            altered_source_targets: sourceAlteredBriefing.campaign_sync_targets,
            selected_targets: sourceAlteredDecision.plan?.target_osids,
            two_brigade: {
                action: belowFloorDecision.action,
                reason: belowFloorDecision.reason,
                candidate_types: belowFloorDecision.decision_trace?.candidates.map(candidate => candidate.type),
            },
            live_operation: {
                action: liveOperationDecision.action,
                reason: liveOperationDecision.reason,
                candidate_count: liveOperationDecision.decision_trace?.candidates.length,
            },
        })}`);
    });
});
