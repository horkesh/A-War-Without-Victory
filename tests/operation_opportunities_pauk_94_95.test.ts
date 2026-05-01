/**
 * operation_opportunities_pauk_94_95.test.ts — LANE C Phase 4 protection suite (T3).
 *
 * Validates the third of three T3 defensive-crisis triad entries — Operation
 * Spider Defense (Pauk 94/95). Citation: BB1 p.417, BB2 p.556. Historical
 * anchor: ~25 November 1994 - Spring 1995. VRS+SVK+APWB-restored joint pressure
 * following Grmeč 94 overextension; up to ~25,000 enemy vs ~15,000 5th Corps.
 * AWWV window w135-w145 (10-turn sustained siege phase).
 *
 * Pauk-specific historian gate: "Pauk impossible after Oluja". The
 * `alliance_context` REQUIRED predicate hard-blocks the proposal once
 * `state.meta.operation_storm_triggered === true`. This is the MOST important
 * gate of the three T3 entries.
 *
 * Contract under test (T3 specific — mirrors the Una 94 / Breza 94 shape):
 *   - Pre-window invisibility (turn < 135).
 *   - Post-window invisibility (turn > 145).
 *   - pocket_survival missing → no proposal.
 *   - corps_readiness < 0.30 → no proposal.
 *   - logistics pressure ≥ 95 → no proposal.
 *   - operation_storm_triggered === true → no proposal (PRIMARY GATE).
 *   - All required axes aligned → proposal surfaces at mid-window turn.
 *   - **T3 substrate consumption**: Approve does NOT push a CorpsOperation;
 *     resolution row gets executed_op_aar_id=undefined +
 *     exit_class='t3_authorized_no_offensive'.
 *   - Decline path records resolution; no CorpsOperation.
 *   - One-shot via seenOpportunityIds.
 *   - Single-owner: triggered_operations.ts has no Pauk/Spider scripted op.
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
    PAUK_94_95_OPPORTUNITY,
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
}

const POCKET_ANCHORS = [
    'op:bihac:bihac_2',
    'op:cazin:cazin_2',
    'op:bosanska_krupa:bosanska_krupa_2',
    'op:velika_kladusa:velika_kladusa_2',
];

const PAUK_BRIGADE_IDS = [
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
        controllers['op:bihac:bihac_2'] = 'RS';
    }

    const formations: Record<string, unknown> = {};
    if (opts.addCorpsReadinessInputs ?? true) {
        for (const id of PAUK_BRIGADE_IDS) {
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

describe('Pauk/Spider 94-95 opportunity (LANE C Phase 4 — T3 defensive-crisis triad)', () => {
    // ── 1. Pre-window invisibility ──────────────────────────────────────────
    it('does not surface before turn 135 (date_window not yet open)', () => {
        const state = buildState({ turn: 134 });
        runOpportunityEvaluationStep(state, 134);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'pauk_94_95')).toBeUndefined();
    });

    // ── 2. Post-window invisibility ─────────────────────────────────────────
    it('does not surface after turn 145 (date_window has closed — sustained 10-turn siege)', () => {
        const state = buildState({ turn: 146 });
        runOpportunityEvaluationStep(state, 146);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'pauk_94_95')).toBeUndefined();
    });

    // ── 3. pocket_survival missing ──────────────────────────────────────────
    it('does not surface when the Bihać pocket has collapsed (anchor lost to RS)', () => {
        const state = buildState({
            turn: 140,
            pocketAnchorsHeldByRBiH: false,
        });
        runOpportunityEvaluationStep(state, 140);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'pauk_94_95')).toBeUndefined();
    });

    // ── 4. corps_readiness < threshold ──────────────────────────────────────
    it('does not surface when 5th Corps command is absent (readiness predicate red)', () => {
        const state = buildState({ turn: 140 });
        delete state.military.corps_command!['arbih_5th_corps'];
        runOpportunityEvaluationStep(state, 140);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'pauk_94_95')).toBeUndefined();
    });

    // ── 5. logistics pressure >= 95 ─────────────────────────────────────────
    it('does not surface when RBiH supply pressure is critical (>= 95)', () => {
        const state = buildState({
            turn: 140,
            rbihSupplyPressure: 96,
        });
        runOpportunityEvaluationStep(state, 140);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'pauk_94_95')).toBeUndefined();
    });

    // ── 6. PRIMARY GATE: operation_storm_triggered === true → no proposal ──
    //   "Pauk impossible after Oluja" — historian. The hardest constraint of
    //   the three T3 entries. Even within the date window with all other axes
    //   green, post-Storm state must block the proposal entirely.
    it('does NOT surface after Operation Storm has triggered ("Pauk impossible after Oluja")', () => {
        const state = buildState({
            turn: 140,
            operationStormTriggered: true,
            // Everything else green to isolate the alliance_context block.
            pocketAnchorsHeldByRBiH: true,
            addCorpsReadinessInputs: true,
            rbihSupplyPressure: 50,
        });
        runOpportunityEvaluationStep(state, 140);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'pauk_94_95')).toBeUndefined();
    });

    // ── 7. All required axes aligned → proposal surfaces ────────────────────
    it('surfaces at turn 140 when all required axes align (mid-window)', () => {
        const state = buildState({
            turn: 140,
            pocketAnchorsHeldByRBiH: true,
            addCorpsReadinessInputs: true,
            rbihSupplyPressure: 50,
            operationStormTriggered: false,
        });
        runOpportunityEvaluationStep(state, 140);
        const proposals = state.military.operation_opportunities ?? [];
        const pauk = proposals.find(p => p.opportunity_id === 'pauk_94_95');
        expect(pauk).toBeDefined();
        expect(pauk!.status).toBe('eligible_pending_review');
        expect(pauk!.proposal_id).toBe('OPP_140_pauk_94_95');
        expect(pauk!.approver_faction).toBe('RBiH');
        expect(pauk!.last_axis_evaluation).toHaveLength(9);
        const required = pauk!.last_axis_evaluation.filter(a => a.mode === 'required');
        for (const r of required) expect(r.green).toBe(true);
    });

    // ── 8. T3 SUBSTRATE: Approve short-circuit verified ─────────────────────
    it('T3 approve does NOT push a CorpsOperation; resolution carries t3_authorized_no_offensive', () => {
        const state = buildState({ turn: 140 });
        runOpportunityEvaluationStep(state, 140);
        const proposalId = buildProposalId('pauk_94_95', 140);
        const updated = applyOpportunityDecision(state, 140, proposalId, 'approve');
        expect(updated!.status).toBe('approved');
        const cmd = state.military.corps_command!['arbih_5th_corps'];
        expect(cmd.active_operations.filter(o => o.name === 'Operation Spider Defense')).toHaveLength(0);
        expect(updated!.executed_op_id).toBeUndefined();
        const resolution = state.military.operation_opportunity_resolutions!
            .find(r => r.opportunity_id === 'pauk_94_95')!;
        expect(resolution.response).toBe('approve');
        expect(resolution.executed_op_name).toBeUndefined();
        expect(resolution.executed_op_aar_id).toBeUndefined();
        expect(resolution.exit_class).toBe('t3_authorized_no_offensive');
    });

    // ── 9. Decline path records resolution; no CorpsOperation ──────────────
    it('decline writes a resolution row and does NOT spawn a CorpsOperation', () => {
        const state = buildState({ turn: 140 });
        runOpportunityEvaluationStep(state, 140);
        const updated = applyOpportunityDecision(
            state, 140, buildProposalId('pauk_94_95', 140), 'decline');
        expect(updated!.status).toBe('declined');
        const cmd = state.military.corps_command!['arbih_5th_corps'];
        expect(cmd.active_operations.filter(o => o.name === 'Operation Spider Defense')).toHaveLength(0);
        const resolutions = state.military.operation_opportunity_resolutions!;
        expect(resolutions.some(r => r.opportunity_id === 'pauk_94_95' && r.response === 'decline'))
            .toBe(true);
    });

    // ── 10. One-shot guard ─────────────────────────────────────────────────
    it('one-shot: does NOT re-enqueue pauk_94_95 after approval', () => {
        const state = buildState({ turn: 140 });
        runOpportunityEvaluationStep(state, 140);
        applyOpportunityDecision(state, 140, buildProposalId('pauk_94_95', 140), 'approve');
        for (let t = 141; t <= 150; t++) runOpportunityEvaluationStep(state, t);
        const paukProposals = state.military.operation_opportunities!
            .filter(p => p.opportunity_id === 'pauk_94_95');
        expect(paukProposals).toHaveLength(1);
        expect(paukProposals[0].status).toBe('approved');
    });

    // ── 11. Single-owner discipline ─────────────────────────────────────────
    it('triggered_operations has NO Una/Breza/Pauk/Spider scripted op (single owner)', () => {
        const matches = _TRIGGERED_OPS.filter((op: { name: string }) =>
            /una|breza|pauk|spider/i.test(op.name));
        expect(matches).toHaveLength(0);
    });

    // ── 12. Determinism ─────────────────────────────────────────────────────
    it('two consecutive evaluator runs produce identical resolution rows', () => {
        const stateA = buildState({ turn: 140 });
        const stateB = buildState({ turn: 140 });
        runOpportunityEvaluationStep(stateA, 140);
        runOpportunityEvaluationStep(stateB, 140);
        applyOpportunityDecision(stateA, 140, buildProposalId('pauk_94_95', 140), 'approve');
        applyOpportunityDecision(stateB, 140, buildProposalId('pauk_94_95', 140), 'approve');
        expect(JSON.stringify(stateA.military.operation_opportunity_resolutions))
            .toBe(JSON.stringify(stateB.military.operation_opportunity_resolutions));
        expect(JSON.stringify(stateA.military.operation_opportunities))
            .toBe(JSON.stringify(stateB.military.operation_opportunities));
    });

    // ── 13. T3-specific guard ───────────────────────────────────────────────
    it('catalog identity: tier === T3, family === fifth_corps, faction === RBiH', () => {
        expect(PAUK_94_95_OPPORTUNITY.tier).toBe('T3');
        expect(PAUK_94_95_OPPORTUNITY.family).toBe('fifth_corps');
        expect(PAUK_94_95_OPPORTUNITY.faction).toBe('RBiH');
        expect(PAUK_94_95_OPPORTUNITY.primary_corps).toBe('arbih_5th_corps');
        expect(FIFTH_CORPS_OPPORTUNITIES.some(d => d.opportunity_id === 'pauk_94_95')).toBe(true);
        expect(OPERATION_OPPORTUNITY_CATALOG.some(d => d.opportunity_id === 'pauk_94_95')).toBe(true);
    });

    // ── Catalog identity sanity ─────────────────────────────────────────────
    it('axes carry the canonical 5th Corps brigade IDs (cross-ref oob_brigades.json)', () => {
        const axis = PAUK_94_95_OPPORTUNITY.axes[0];
        expect([...axis.brigades].sort()).toEqual([...PAUK_BRIGADE_IDS].sort());
        expect(axis.objectives).toEqual([]);
    });

    it('isOpportunityEligible passes when all required axes align (min_optional_axes:0)', () => {
        const state = buildState({ turn: 140 });
        const axes = evaluateAxes(state, 140, PAUK_94_95_OPPORTUNITY);
        expect(isOpportunityEligible(PAUK_94_95_OPPORTUNITY, axes)).toBe(true);
        expect(PAUK_94_95_OPPORTUNITY.prerequisites.min_optional_axes).toBe(0);
        expect(PAUK_94_95_OPPORTUNITY.prerequisites.alliance_context).toBe('required');
    });

    it('Pauk-specific historian gate: alliance_context is the post-Oluja killer', () => {
        // Sanity: confirm alliance_context predicate flips red specifically on Storm.
        const stateBefore = buildState({ turn: 140, operationStormTriggered: false });
        const stateAfter  = buildState({ turn: 140, operationStormTriggered: true });
        const axesBefore = evaluateAxes(stateBefore, 140, PAUK_94_95_OPPORTUNITY);
        const axesAfter  = evaluateAxes(stateAfter,  140, PAUK_94_95_OPPORTUNITY);
        const acBefore = axesBefore.find(a => a.axis === 'alliance_context')!;
        const acAfter  = axesAfter.find(a => a.axis === 'alliance_context')!;
        expect(acBefore.green).toBe(true);
        expect(acAfter.green).toBe(false);
        expect(isOpportunityEligible(PAUK_94_95_OPPORTUNITY, axesBefore)).toBe(true);
        expect(isOpportunityEligible(PAUK_94_95_OPPORTUNITY, axesAfter)).toBe(false);
    });
});
