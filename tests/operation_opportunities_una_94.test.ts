/**
 * operation_opportunities_una_94.test.ts — LANE C Phase 4 protection suite (T3).
 *
 * Validates the first of three T3 defensive-crisis triad entries — Operation
 * Una 94 Defense (BB2 p.534, 11-15 July 1994 VRS 2nd Krajina probe along the
 * Grabež plateau). AWWV window w113-w115 (3-turn crisis).
 *
 * Contract under test (T3 specific — mirrors the APWB shape):
 *   - Pre-window invisibility (turn < 113).
 *   - Post-window invisibility (turn > 115).
 *   - pocket_survival missing → no proposal.
 *   - corps_readiness < 0.25 → no proposal.
 *   - logistics pressure ≥ 95 → no proposal.
 *   - operation_storm_triggered === true → no proposal (pre-Storm gate).
 *   - All required axes aligned → proposal surfaces at mid-window turn.
 *   - **T3 substrate consumption**: Approve does NOT push a CorpsOperation;
 *     resolution row gets executed_op_aar_id=undefined +
 *     exit_class='t3_authorized_no_offensive'.
 *   - Decline path records resolution; no CorpsOperation.
 *   - One-shot via seenOpportunityIds.
 *   - Single-owner: triggered_operations.ts has no Una scripted op.
 *   - Determinism: two consecutive evaluator runs produce identical resolution rows.
 *   - T3-specific guard: def.tier === 'T3'.
 */

import { describe, expect, it } from 'vitest';

import { _TRIGGERED_OPS } from '../src/sim/combat/triggered_operations.js';
import {
    OPERATION_OPPORTUNITY_CATALOG,
    applyOpportunityDecision,
    buildProposalId,
    evaluateAxes,
    isOpportunityEligible,
    runOpportunityEvaluationStep,
} from '../src/sim/combat/operation_opportunities.js';
import {
    UNA_94_OPPORTUNITY,
    FIFTH_CORPS_OPPORTUNITIES,
} from '../src/sim/combat/operation_opportunity_catalog_5th_corps.js';
import type {
    CorpsCommandState,
    FactionId,
    GameState,
} from '../src/state/game_state.js';

// ─── Fixture state builder ──────────────────────────────────────────────────

interface FixtureOpts {
    turn: number;
    pocketAnchorsHeldByRBiH?: boolean;
    addCorpsReadinessInputs?: boolean;
    rbihSupplyPressure?: number;
    operationStormTriggered?: boolean;
    /** LANE E: when true, the Bihać threat ring is cleared (no hostile control)
     *  so the new `enemy_weakness: required` predicate evaluates RED. Default
     *  false (historical state has hostile pressure on the pocket). */
    threatRingClear?: boolean;
}

const POCKET_ANCHORS = [
    'op:bihac:bihac_2',
    'op:cazin:cazin_2',
    'op:bosanska_krupa:bosanska_krupa_2',
    'op:velika_kladusa:velika_kladusa_2',
];

const UNA_BRIGADE_IDS = [
    'arbih_501st_slavna_mountain',
    'arbih_502nd_vitezka_mountain',
    'arbih_503rd_slavna_mountain',
    'arbih_504th_cazin_light',
    'arbih_505th_vitezka_mountain',
    'arbih_506th_mountain',
    'arbih_510th_bosnian_liberation',
    'arbih_511th_slavna_mountain',
    'arbih_517th_light',
];

function buildState(opts: FixtureOpts): GameState {
    const cmd: CorpsCommandState = {
        command_span: 9,
        subordinate_count: 9,
        og_slots: 1,
        active_ogs: [],
        corps_exhaustion: 10,
        stance: 'defensive',
        active_operations: [],
        commander_state: {
            current_plan: null,
            decision_trace: null,
            operation_history: [],
        } as unknown as CorpsCommandState['commander_state'],
    };
    const controllers: Record<string, FactionId> = {};

    if (opts.pocketAnchorsHeldByRBiH ?? true) {
        for (const osid of POCKET_ANCHORS) controllers[osid] = 'RBiH';
    } else {
        for (const osid of POCKET_ANCHORS) controllers[osid] = 'RBiH';
        // Flip Bihać to RS to model pocket collapse.
        controllers['op:bihac:bihac_2'] = 'RS';
    }

    // LANE E: T3 enemy_weakness predicate (`threatPressureT3`) reads the
    // Bihać threat ring — at least one ring OSID must be hostile-controlled
    // for the defensive crisis to be eligible. Default to historically-true
    // RS pressure on the pocket; tests that want to model "no threat"
    // explicitly clear it via `threatRingClear`.
    if (!(opts.threatRingClear ?? false)) {
        controllers['op:bihac:vrtoce_2'] = 'RS';
        controllers['op:bihac:papari_2'] = 'RS';
        controllers['op:bosanski_petrovac:bosanski_petrovac_2'] = 'RS';
        controllers['op:bosanski_petrovac:vedro_polje_2'] = 'RS';
        controllers['op:bosanska_krupa:arapusa_2'] = 'RS';
        controllers['op:bosanska_krupa:donji_dubovik_2'] = 'RS';
    }

    const formations: Record<string, unknown> = {};
    if (opts.addCorpsReadinessInputs ?? true) {
        for (const id of UNA_BRIGADE_IDS) {
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
            operation_storm_triggered: opts.operationStormTriggered ?? false,
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
            war_supply_pressure: { RBiH: opts.rbihSupplyPressure ?? 50 },
        } as unknown as GameState['political'],
        displacement: {} as GameState['displacement'],
    } as unknown as GameState;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Una 94 opportunity (LANE C Phase 4 — T3 defensive-crisis triad)', () => {
    // ── 1. Pre-window invisibility ──────────────────────────────────────────
    it('does not surface before turn 113 (date_window not yet open)', () => {
        const state = buildState({ turn: 112 });
        runOpportunityEvaluationStep(state, 112);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'una_94')).toBeUndefined();
    });

    // ── 2. Post-window invisibility ─────────────────────────────────────────
    it('does not surface after turn 115 (date_window has closed — short 3-turn crisis)', () => {
        const state = buildState({ turn: 116 });
        runOpportunityEvaluationStep(state, 116);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'una_94')).toBeUndefined();
    });

    // ── 3. pocket_survival missing ──────────────────────────────────────────
    it('does not surface when the Bihać pocket has collapsed (anchor lost to RS)', () => {
        const state = buildState({
            turn: 114,
            pocketAnchorsHeldByRBiH: false,
        });
        runOpportunityEvaluationStep(state, 114);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'una_94')).toBeUndefined();
    });

    // ── 4. corps_readiness < threshold ──────────────────────────────────────
    it('does not surface when 5th Corps command is absent (readiness predicate red)', () => {
        const state = buildState({ turn: 114 });
        delete state.military.corps_command!['arbih_5th_corps'];
        runOpportunityEvaluationStep(state, 114);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'una_94')).toBeUndefined();
    });

    // ── 5. LANE E: logistics is now OPTIONAL severity, not a required gate ──
    it('LANE E: surfaces even when RBiH supply pressure is critical (logistics is severity, not gate)', () => {
        const state = buildState({
            turn: 114,
            rbihSupplyPressure: 96,
        });
        runOpportunityEvaluationStep(state, 114);
        const proposals = state.military.operation_opportunities ?? [];
        const una = proposals.find(p => p.opportunity_id === 'una_94');
        expect(una).toBeDefined();
        // Logistics axis appears RED in the dossier as a severity warning,
        // but it does NOT block eligibility under LANE E topology.
        const logisticsAxis = una!.last_axis_evaluation.find(a => a.axis === 'logistics');
        expect(logisticsAxis?.green).toBe(false);
    });

    // ── 5b. LANE E: T3 does NOT surface when threat ring is clear ───────────
    it('LANE E: does not surface when Bihać threat ring is clear (no enemy pressure to defend against)', () => {
        const state = buildState({
            turn: 114,
            threatRingClear: true,
        });
        runOpportunityEvaluationStep(state, 114);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'una_94')).toBeUndefined();
    });

    // ── 6. operation_storm_triggered === true → no proposal ─────────────────
    it('does not surface after Operation Storm has triggered (pre-Storm gate)', () => {
        const state = buildState({
            turn: 114,
            operationStormTriggered: true,
        });
        runOpportunityEvaluationStep(state, 114);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'una_94')).toBeUndefined();
    });

    // ── 7. All required axes aligned → proposal surfaces ────────────────────
    it('surfaces at turn 114 when all required axes align (mid-window)', () => {
        const state = buildState({
            turn: 114,
            pocketAnchorsHeldByRBiH: true,
            addCorpsReadinessInputs: true,
            rbihSupplyPressure: 50,
            operationStormTriggered: false,
        });
        runOpportunityEvaluationStep(state, 114);
        const proposals = state.military.operation_opportunities ?? [];
        const una = proposals.find(p => p.opportunity_id === 'una_94');
        expect(una).toBeDefined();
        expect(una!.status).toBe('eligible_pending_review');
        expect(una!.proposal_id).toBe('OPP_114_una_94');
        expect(una!.approver_faction).toBe('RBiH');
        expect(una!.last_axis_evaluation).toHaveLength(10);
        const required = una!.last_axis_evaluation.filter(a => a.mode === 'required');
        for (const r of required) expect(r.green).toBe(true);
    });

    // ── 8. T3 SUBSTRATE: Approve short-circuit verified ─────────────────────
    it('T3 approve does NOT push a CorpsOperation; resolution carries t3_authorized_no_offensive', () => {
        const state = buildState({ turn: 114 });
        runOpportunityEvaluationStep(state, 114);
        const proposalId = buildProposalId('una_94', 114);
        const updated = applyOpportunityDecision(state, 114, proposalId, 'approve');
        expect(updated!.status).toBe('approved');
        // T3 substrate skip: no CorpsOperation pushed.
        const cmd = state.military.corps_command!['arbih_5th_corps'];
        expect(cmd.active_operations.filter(o => o.name === 'Operation Una 94 Defense')).toHaveLength(0);
        expect(updated!.executed_op_id).toBeUndefined();
        // Resolution row carries the T3 sentinel.
        const resolution = state.military.operation_opportunity_resolutions!
            .find(r => r.opportunity_id === 'una_94')!;
        expect(resolution.response).toBe('approve');
        expect(resolution.executed_op_name).toBeUndefined();
        expect(resolution.executed_op_aar_id).toBeUndefined();
        expect(resolution.exit_class).toBe('t3_authorized_no_offensive');
    });

    // ── 9. Decline path records resolution; no CorpsOperation ──────────────
    it('decline writes a resolution row and does NOT spawn a CorpsOperation', () => {
        const state = buildState({ turn: 114 });
        runOpportunityEvaluationStep(state, 114);
        const updated = applyOpportunityDecision(
            state, 114, buildProposalId('una_94', 114), 'decline');
        expect(updated!.status).toBe('declined');
        const cmd = state.military.corps_command!['arbih_5th_corps'];
        expect(cmd.active_operations.filter(o => o.name === 'Operation Una 94 Defense')).toHaveLength(0);
        const resolutions = state.military.operation_opportunity_resolutions!;
        expect(resolutions.some(r => r.opportunity_id === 'una_94' && r.response === 'decline'))
            .toBe(true);
    });

    // ── 10. One-shot guard ─────────────────────────────────────────────────
    it('one-shot: does NOT re-enqueue una_94 after approval', () => {
        const state = buildState({ turn: 114 });
        runOpportunityEvaluationStep(state, 114);
        applyOpportunityDecision(state, 114, buildProposalId('una_94', 114), 'approve');
        for (let t = 115; t <= 120; t++) runOpportunityEvaluationStep(state, t);
        const unaProposals = state.military.operation_opportunities!
            .filter(p => p.opportunity_id === 'una_94');
        expect(unaProposals).toHaveLength(1);
        expect(unaProposals[0].status).toBe('approved');
    });

    // ── 11. Single-owner discipline ─────────────────────────────────────────
    it('triggered_operations has NO Una/Breza/Pauk/Spider scripted op (single owner)', () => {
        const matches = _TRIGGERED_OPS.filter((op: { name: string }) =>
            /una|breza|pauk|spider/i.test(op.name));
        expect(matches).toHaveLength(0);
    });

    // ── 12. Determinism ─────────────────────────────────────────────────────
    it('two consecutive evaluator runs produce identical resolution rows', () => {
        const stateA = buildState({ turn: 114 });
        const stateB = buildState({ turn: 114 });
        runOpportunityEvaluationStep(stateA, 114);
        runOpportunityEvaluationStep(stateB, 114);
        applyOpportunityDecision(stateA, 114, buildProposalId('una_94', 114), 'approve');
        applyOpportunityDecision(stateB, 114, buildProposalId('una_94', 114), 'approve');
        expect(JSON.stringify(stateA.military.operation_opportunity_resolutions))
            .toBe(JSON.stringify(stateB.military.operation_opportunity_resolutions));
        expect(JSON.stringify(stateA.military.operation_opportunities))
            .toBe(JSON.stringify(stateB.military.operation_opportunities));
    });

    // ── 13. T3-specific guard ───────────────────────────────────────────────
    it('catalog identity: tier === T3, family === fifth_corps, faction === RBiH', () => {
        expect(UNA_94_OPPORTUNITY.tier).toBe('T3');
        expect(UNA_94_OPPORTUNITY.family).toBe('fifth_corps');
        expect(UNA_94_OPPORTUNITY.faction).toBe('RBiH');
        expect(UNA_94_OPPORTUNITY.primary_corps).toBe('arbih_5th_corps');
        expect(FIFTH_CORPS_OPPORTUNITIES.some(d => d.opportunity_id === 'una_94')).toBe(true);
        expect(OPERATION_OPPORTUNITY_CATALOG.some(d => d.opportunity_id === 'una_94')).toBe(true);
    });

    // ── Catalog identity sanity ─────────────────────────────────────────────
    it('axes carry the canonical 5th Corps brigade IDs (cross-ref oob_brigades.json)', () => {
        const axis = UNA_94_OPPORTUNITY.axes[0];
        expect([...axis.brigades].sort()).toEqual([...UNA_BRIGADE_IDS].sort());
        // T3 has empty objective list — substrate skips iteration.
        expect(axis.objectives).toEqual([]);
    });

    it('isOpportunityEligible passes when all required axes align (min_optional_axes:0)', () => {
        const state = buildState({ turn: 114 });
        const axes = evaluateAxes(state, 114, UNA_94_OPPORTUNITY);
        expect(isOpportunityEligible(UNA_94_OPPORTUNITY, axes)).toBe(true);
        expect(UNA_94_OPPORTUNITY.prerequisites.min_optional_axes).toBe(0);
        expect(UNA_94_OPPORTUNITY.prerequisites.alliance_context).toBe('required');
    });
});
