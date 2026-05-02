/**
 * operation_opportunities_5th_corps_sana.test.ts — LANE B Phase 3 protection suite.
 *
 * Validates the first content family — Operation Sana 95 as the MVP
 * opportunity for the 5th Corps / Bihać pocket arc.
 *
 * Contract under test:
 *   - The opportunity catalog ships exactly one Sana entry (no duplicates).
 *   - The legacy scripted Sana has been REMOVED from triggered_operations.ts
 *     — single ownership.
 *   - Sana does NOT surface before its date_window opens (turn < 175).
 *   - Sana does NOT surface before the Operation Storm event opens the
 *     western theater, even if the date_window is open (alliance_context
 *     required).
 *   - Sana does NOT surface when the Bihać pocket has structurally
 *     collapsed (any pocket-survival anchor controlled by RS).
 *   - Sana DOES surface when the date is open AND the Storm event has fired
 *     AND pocket anchors are RBiH AND a sufficient enemy_weakness footprint
 *     exists AND corps readiness clears the soft floor.
 *   - The opportunity entry binds to arbih_5th_corps and the canonical
 *     Bihać staging anchor.
 *   - Phase 4 will run scenario sanities; this file is unit-level only.
 */

import { describe, expect, it } from 'vitest';

import { _TRIGGERED_OPS } from '../src/sim/combat/triggered_operations.js';
import {
    OPERATION_OPPORTUNITY_CATALOG,
    evaluateAxes,
    isOpportunityEligible,
    runOpportunityEvaluationStep,
    type OperationOpportunityDef,
} from '../src/sim/combat/operation_opportunities.js';
import {
    FIFTH_CORPS_OPPORTUNITIES,
    SANA_95_FOLLOW_ON_OPPORTUNITY,
    SANA_95_OPPORTUNITY,
} from '../src/sim/combat/operation_opportunity_catalog_5th_corps.js';
import type {
    CorpsCommandState,
    FactionId,
    GameState,
} from '../src/state/game_state.js';

// ─── Fixture state builder ──────────────────────────────────────────────────

interface FixtureOpts {
    turn: number;
    stormTriggered?: boolean;
    pocketAnchorsHeldByRBiH?: boolean;
    enemyTargetsRsControlled?: boolean;
    followOnApproachControlled?: boolean;
    addCorpsReadinessInputs?: boolean;
}

const POCKET_ANCHORS = [
    'op:bihac:bihac_2',
    'op:bihac:bihac_3',
    'op:cazin:cazin_2',
    'op:bosanska_krupa:bosanska_krupa_2',
    'op:bosanska_krupa:otoka_2',
];

const VRS_TARGETS = [
    'op:bosanski_petrovac:bosanski_petrovac_2',
    'op:bosanski_petrovac:vrtoce',
    'op:sanski_most:sanski_most_2',
    'op:kljuc:kljuc_2',
];

const SANA_FOLLOW_ON_APPROACHES = [
    'op:bosanska_krupa:jasenica_2',
    'op:bosanski_petrovac:vrtoce',
    'op:bosanski_petrovac:dobro_selo_2',
];

function buildState(opts: FixtureOpts): GameState {
    const stormTurn = opts.stormTriggered ? Math.min(opts.turn, 174) : undefined;
    const cmd: CorpsCommandState = {
        command_span: 9,
        subordinate_count: 9,
        og_slots: 1,
        active_ogs: [],
        corps_exhaustion: 10,
        stance: 'offensive',
        active_operations: [],
        commander_state: opts.addCorpsReadinessInputs ? {
            current_plan: null,
            decision_trace: null,
            operation_history: [],
        } as unknown as CorpsCommandState['commander_state'] : undefined,
    };
    const controllers: Record<string, FactionId> = {};
    if (opts.pocketAnchorsHeldByRBiH ?? true) {
        for (const osid of POCKET_ANCHORS) controllers[osid] = 'RBiH';
    } else {
        // Mark Bihać HQ lost — pocket has collapsed.
        for (const osid of POCKET_ANCHORS) controllers[osid] = 'RBiH';
        controllers['op:bihac:bihac_2'] = 'RS';
    }
    if (opts.enemyTargetsRsControlled ?? true) {
        for (const osid of VRS_TARGETS) controllers[osid] = 'RS';
        for (const osid of SANA_FOLLOW_ON_APPROACHES) {
            controllers[osid] = 'RS';
        }
        if (opts.followOnApproachControlled ?? false) {
            controllers['op:bosanska_krupa:jasenica_2'] = 'RBiH';
        }
    } else {
        // All targets liberated — enemy_weakness predicate goes red ("nothing
        // left to liberate" branch).
        for (const osid of VRS_TARGETS) controllers[osid] = 'RBiH';
    }

    // Synthesize formations sized for a credible 5th Corps readiness pass.
    // computeCorpsOperationReadiness expects formations keyed by id with
    // own_corps_cmd, officer_quality, cohesion, morale.
    const formations: Record<string, unknown> = {};
    if (opts.addCorpsReadinessInputs ?? true) {
        const brigadeIds = [
            'arbih_501st_slavna_mountain', 'arbih_502nd_vitezka_mountain',
            'arbih_503rd_slavna_mountain', 'arbih_504th_cazin_light',
            'arbih_505th_vitezka_mountain', 'arbih_506th_mountain',
            'arbih_510th_bosnian_liberation', 'arbih_511th_slavna_mountain',
            'arbih_517th_light',
        ];
        for (const id of brigadeIds) {
            formations[id] = {
                id,
                name: id,
                faction: 'RBiH',
                own_corps_cmd: 'arbih_5th_corps',
                strength: 1500,
                officer_quality: 0.85,
                cohesion: 65,
                morale: 70,
                composition: { tanks: 0, artillery: 0,
                    tank_condition: { operational: 0 },
                    artillery_condition: { operational: 0 } },
            };
        }
    }

    return {
        schema_version: 0,
        meta: {
            turn: opts.turn,
            seed: 'test',
            phase: 'war',
            operation_storm_triggered: opts.stormTriggered ?? false,
        },
        factions: [
            {
                id: 'RBiH',
                capability_profile: {
                    training_quality: 0.7,
                    organizational_maturity: 0.7,
                    equipment_access: 0.5,
                    equipment_operational: 0.5,
                    doctrine_effectiveness: { ATTACK: 0.6, COORDINATED_STRIKE: 0.6 },
                },
            },
        ],
        military: {
            formations,
            fired_event_ids: opts.stormTriggered ? ['operation_storm_1995'] : [],
            event_last_fired_turn: stormTurn === undefined ? {} : { operation_storm_1995: stormTurn },
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            corps_command: { arbih_5th_corps: cmd },
            faction_officer_maturity: { RBiH: 3.5 },
        },
        political: {
            political_controllers: controllers,
            war_supply_pressure: { RBiH: 50 },
        } as unknown as GameState['political'],
        displacement: {} as GameState['displacement'],
    } as unknown as GameState;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Sana 95 opportunity (LANE B Phase 3)', () => {
    it('the catalog contains exactly one Sana entry', () => {
        const sanaEntries = OPERATION_OPPORTUNITY_CATALOG.filter(
            d => d.opportunity_id === 'sana_95');
        expect(sanaEntries).toHaveLength(1);
        expect(sanaEntries[0]).toBe(SANA_95_OPPORTUNITY);
    });

    it('FIFTH_CORPS_OPPORTUNITIES exposes Sana as the MVP family entry', () => {
        expect(FIFTH_CORPS_OPPORTUNITIES.some(d => d.opportunity_id === 'sana_95')).toBe(true);
    });

    it('FIFTH_CORPS_OPPORTUNITIES exposes the Sanski/Kljuc follow-on separately', () => {
        expect(FIFTH_CORPS_OPPORTUNITIES.some(d => d.opportunity_id === 'sana_95_follow_on')).toBe(true);
        expect(SANA_95_FOLLOW_ON_OPPORTUNITY.family).toBe('fifth_corps');
    });

    it('legacy scripted Sana has been removed from triggered_operations.ts', () => {
        const sanaInTriggered = _TRIGGERED_OPS.filter((op: { name: string }) => op.name === 'Operation Sana');
        expect(sanaInTriggered).toHaveLength(0);
    });

    it('Sana primary corps and faction are correctly bound', () => {
        expect(SANA_95_OPPORTUNITY.faction).toBe('RBiH');
        expect(SANA_95_OPPORTUNITY.primary_corps).toBe('arbih_5th_corps');
        expect(SANA_95_OPPORTUNITY.staging_osid).toBe('op:bihac:bihac_2');
    });

    it('does not surface before turn 175 (date_window closed)', () => {
        const state = buildState({ turn: 174, stormTriggered: true });
        runOpportunityEvaluationStep(state, 174);
        expect(state.military.operation_opportunities ?? []).toEqual([]);
    });

    it('does not surface before the Operation Storm event opens the western theater', () => {
        const state = buildState({ turn: 180, stormTriggered: false });
        runOpportunityEvaluationStep(state, 180);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'sana_95')).toBeUndefined();
    });

    it('does not surface when the Bihać pocket has collapsed (anchor lost to RS)', () => {
        const state = buildState({
            turn: 180,
            stormTriggered: true,
            pocketAnchorsHeldByRBiH: false,
        });
        runOpportunityEvaluationStep(state, 180);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'sana_95')).toBeUndefined();
    });

    it('does not surface when there is nothing left for the enemy to lose (all targets RBiH)', () => {
        const state = buildState({
            turn: 180,
            stormTriggered: true,
            enemyTargetsRsControlled: false,
        });
        runOpportunityEvaluationStep(state, 180);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'sana_95')).toBeUndefined();
    });

    it('surfaces when all required prerequisites align', () => {
        const state = buildState({
            turn: 180,
            stormTriggered: true,
            pocketAnchorsHeldByRBiH: true,
            enemyTargetsRsControlled: true,
            addCorpsReadinessInputs: true,
        });
        runOpportunityEvaluationStep(state, 180);
        const proposals = state.military.operation_opportunities ?? [];
        const sana = proposals.find(p => p.opportunity_id === 'sana_95');
        expect(sana).toBeDefined();
        expect(sana!.status).toBe('eligible_pending_review');
        expect(sana!.proposal_id).toBe('OPP_180_sana_95');
        expect(sana!.approver_faction).toBe('RBiH');
        expect(sana!.last_axis_evaluation).toHaveLength(10);
        expect(proposals.find(p => p.opportunity_id === 'sana_95_follow_on')).toBeUndefined();
        // Required axes all green:
        const required = sana!.last_axis_evaluation.filter(a => a.mode === 'required');
        for (const r of required) expect(r.green).toBe(true);
    });

    it('expires past the autumn window (turn > 200)', () => {
        const state = buildState({
            turn: 180,
            stormTriggered: true,
            addCorpsReadinessInputs: true,
        });
        runOpportunityEvaluationStep(state, 180);
        // Now jump past expires_turn (default substrate = turn + 24 = 204).
        // The proposal does NOT itself include the family expiry, so the
        // substrate-level expiry is what triggers the move to expired.
        const proposal = state.military.operation_opportunities!
            .find(p => p.opportunity_id === 'sana_95')!;
        const advanced = proposal.expires_turn + 1;
        runOpportunityEvaluationStep(state, advanced);
        const after = state.military.operation_opportunities!
            .find(p => p.opportunity_id === 'sana_95')!;
        expect(after.status).toBe('expired');
    });

    it('axis evaluation includes player-safe reasons (no raw OSIDs in axis text)', () => {
        const state = buildState({
            turn: 180,
            stormTriggered: true,
            addCorpsReadinessInputs: true,
        });
        const axes = evaluateAxes(state, 180, SANA_95_OPPORTUNITY);
        for (const a of axes) {
            expect(a.reason.includes('op:')).toBe(false);
        }
    });

    it('isOpportunityEligible respects the family prerequisites', () => {
        const state = buildState({
            turn: 180,
            stormTriggered: true,
            addCorpsReadinessInputs: true,
        });
        const axes = evaluateAxes(state, 180, SANA_95_OPPORTUNITY);
        expect(isOpportunityEligible(SANA_95_OPPORTUNITY, axes)).toBe(true);
    });

    it('initial Sana axes cover only the reachable Krupa and Bihac-Petrovac breakthrough', () => {
        // Krupa axis: 2 brigades, 6 objectives.
        const krupa = SANA_95_OPPORTUNITY.axes.find(a => a.axis_id === 'sana_krupa')!;
        expect(krupa.brigades).toHaveLength(2);
        expect(krupa.objectives).toHaveLength(6);
        // Bihac-Petrovac axis: 3 brigades, 12 objectives.
        const bp = SANA_95_OPPORTUNITY.axes.find(a => a.axis_id === 'sana_bihac_petrovac')!;
        expect(bp.brigades).toHaveLength(3);
        expect(bp.objectives).toHaveLength(12);
        // Sanski-Most/Ključ axis: 4 brigades, 13 objectives.
        expect(SANA_95_OPPORTUNITY.axes.find(a => a.axis_id === 'sana_sanski_most_kljuc')).toBeUndefined();
    });

    it('Sanski-Most/Kljuc is a follow-on axis with the legacy interior objective shape', () => {
        expect(SANA_95_FOLLOW_ON_OPPORTUNITY.opportunity_id).toBe('sana_95_follow_on');
        expect(SANA_95_FOLLOW_ON_OPPORTUNITY.staging_osid).toBe('op:bosanska_krupa:otoka_2');
        const sk = SANA_95_FOLLOW_ON_OPPORTUNITY.axes.find(a => a.axis_id === 'sana_sanski_most_kljuc')!;
        expect(sk.brigades).toHaveLength(4);
        expect(sk.objectives).toHaveLength(13);
    });

    it('does not surface the follow-on before a live approach corridor exists', () => {
        const state = buildState({
            turn: 180,
            stormTriggered: true,
            pocketAnchorsHeldByRBiH: true,
            enemyTargetsRsControlled: true,
            followOnApproachControlled: false,
            addCorpsReadinessInputs: true,
        });
        runOpportunityEvaluationStep(state, 180);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'sana_95_follow_on')).toBeUndefined();
    });

    it('surfaces the follow-on when a live approach corridor reaches Sanski/Kljuc objectives', () => {
        const state = buildState({
            turn: 180,
            stormTriggered: true,
            pocketAnchorsHeldByRBiH: true,
            enemyTargetsRsControlled: true,
            followOnApproachControlled: true,
            addCorpsReadinessInputs: true,
        });
        runOpportunityEvaluationStep(state, 180);
        const proposals = state.military.operation_opportunities ?? [];
        const followOn = proposals.find(p => p.opportunity_id === 'sana_95_follow_on');
        expect(followOn).toBeDefined();
        expect(followOn!.proposal_id).toBe('OPP_180_sana_95_follow_on');
        expect(followOn!.last_axis_evaluation.find(a => a.axis === 'staging_access')?.green).toBe(true);
    });

    it('citations include both BB1 and the family design doc', () => {
        const cites = SANA_95_OPPORTUNITY.citations.join('\n');
        expect(cites).toMatch(/BB1/);
        expect(cites).toMatch(/late-war-5th-corps-opportunities-design.md/);
    });

    it('historical_exit_class is partial_success (not forced decisive_success)', () => {
        expect(SANA_95_OPPORTUNITY.historical_exit_class).toBe('partial_success');
    });
});
