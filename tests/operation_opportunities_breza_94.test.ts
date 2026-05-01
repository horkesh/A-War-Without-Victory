/**
 * operation_opportunities_breza_94.test.ts — LANE C Phase 4 protection suite (T3).
 *
 * Validates the second of three T3 defensive-crisis triad entries — Operation
 * Breza 94 Defense (BB2 pp.540-542, 31 Aug – ~15 Sep 1994; three-axis VRS-SVK
 * offensive across Grabež plateau / Bosanska Otoka / Buzim; 12 Sep ARBiH
 * counterattack near-capture of Mladić). AWWV window w125-w130.
 *
 * Contract under test (T3 specific — mirrors the Una 94 shape):
 *   - Pre-window invisibility (turn < 125).
 *   - Post-window invisibility (turn > 130).
 *   - pocket_survival missing → no proposal.
 *   - corps_readiness < 0.30 (higher than Una's 0.25 — three-axis fight).
 *   - logistics pressure ≥ 95 → no proposal.
 *   - operation_storm_triggered === true → no proposal (pre-Storm gate).
 *   - All required axes aligned → proposal surfaces at mid-window turn.
 *   - **T3 substrate consumption**: Approve does NOT push a CorpsOperation;
 *     resolution row gets executed_op_aar_id=undefined +
 *     exit_class='t3_authorized_no_offensive'.
 *   - Decline path records resolution; no CorpsOperation.
 *   - One-shot via seenOpportunityIds.
 *   - Single-owner: triggered_operations.ts has no Breza scripted op.
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
    BREZA_94_OPPORTUNITY,
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

const BREZA_BRIGADE_IDS = [
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
        for (const id of BREZA_BRIGADE_IDS) {
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

describe('Breza 94 opportunity (LANE C Phase 4 — T3 defensive-crisis triad)', () => {
    // ── 1. Pre-window invisibility ──────────────────────────────────────────
    it('does not surface before turn 125 (date_window not yet open)', () => {
        const state = buildState({ turn: 124 });
        runOpportunityEvaluationStep(state, 124);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'breza_94')).toBeUndefined();
    });

    // ── 2. Post-window invisibility ─────────────────────────────────────────
    it('does not surface after turn 130 (date_window has closed)', () => {
        const state = buildState({ turn: 131 });
        runOpportunityEvaluationStep(state, 131);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'breza_94')).toBeUndefined();
    });

    // ── 3. pocket_survival missing ──────────────────────────────────────────
    it('does not surface when the Bihać pocket has collapsed (anchor lost to RS)', () => {
        const state = buildState({
            turn: 127,
            pocketAnchorsHeldByRBiH: false,
        });
        runOpportunityEvaluationStep(state, 127);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'breza_94')).toBeUndefined();
    });

    // ── 4. corps_readiness < threshold ──────────────────────────────────────
    it('does not surface when 5th Corps command is absent (readiness predicate red)', () => {
        const state = buildState({ turn: 127 });
        delete state.military.corps_command!['arbih_5th_corps'];
        runOpportunityEvaluationStep(state, 127);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'breza_94')).toBeUndefined();
    });

    // ── 5. logistics pressure >= 95 ─────────────────────────────────────────
    it('does not surface when RBiH supply pressure is critical (>= 95)', () => {
        const state = buildState({
            turn: 127,
            rbihSupplyPressure: 96,
        });
        runOpportunityEvaluationStep(state, 127);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'breza_94')).toBeUndefined();
    });

    // ── 6. operation_storm_triggered === true → no proposal ─────────────────
    it('does not surface after Operation Storm has triggered (pre-Storm gate)', () => {
        const state = buildState({
            turn: 127,
            operationStormTriggered: true,
        });
        runOpportunityEvaluationStep(state, 127);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'breza_94')).toBeUndefined();
    });

    // ── 7. All required axes aligned → proposal surfaces ────────────────────
    it('surfaces at turn 127 when all required axes align (mid-window)', () => {
        const state = buildState({
            turn: 127,
            pocketAnchorsHeldByRBiH: true,
            addCorpsReadinessInputs: true,
            rbihSupplyPressure: 50,
            operationStormTriggered: false,
        });
        runOpportunityEvaluationStep(state, 127);
        const proposals = state.military.operation_opportunities ?? [];
        const breza = proposals.find(p => p.opportunity_id === 'breza_94');
        expect(breza).toBeDefined();
        expect(breza!.status).toBe('eligible_pending_review');
        expect(breza!.proposal_id).toBe('OPP_127_breza_94');
        expect(breza!.approver_faction).toBe('RBiH');
        expect(breza!.last_axis_evaluation).toHaveLength(9);
        const required = breza!.last_axis_evaluation.filter(a => a.mode === 'required');
        for (const r of required) expect(r.green).toBe(true);
    });

    // ── 8. T3 SUBSTRATE: Approve short-circuit verified ─────────────────────
    it('T3 approve does NOT push a CorpsOperation; resolution carries t3_authorized_no_offensive', () => {
        const state = buildState({ turn: 127 });
        runOpportunityEvaluationStep(state, 127);
        const proposalId = buildProposalId('breza_94', 127);
        const updated = applyOpportunityDecision(state, 127, proposalId, 'approve');
        expect(updated!.status).toBe('approved');
        const cmd = state.military.corps_command!['arbih_5th_corps'];
        expect(cmd.active_operations.filter(o => o.name === 'Operation Breza 94 Defense')).toHaveLength(0);
        expect(updated!.executed_op_id).toBeUndefined();
        const resolution = state.military.operation_opportunity_resolutions!
            .find(r => r.opportunity_id === 'breza_94')!;
        expect(resolution.response).toBe('approve');
        expect(resolution.executed_op_name).toBeUndefined();
        expect(resolution.executed_op_aar_id).toBeUndefined();
        expect(resolution.exit_class).toBe('t3_authorized_no_offensive');
    });

    // ── 9. Decline path records resolution; no CorpsOperation ──────────────
    it('decline writes a resolution row and does NOT spawn a CorpsOperation', () => {
        const state = buildState({ turn: 127 });
        runOpportunityEvaluationStep(state, 127);
        const updated = applyOpportunityDecision(
            state, 127, buildProposalId('breza_94', 127), 'decline');
        expect(updated!.status).toBe('declined');
        const cmd = state.military.corps_command!['arbih_5th_corps'];
        expect(cmd.active_operations.filter(o => o.name === 'Operation Breza 94 Defense')).toHaveLength(0);
        const resolutions = state.military.operation_opportunity_resolutions!;
        expect(resolutions.some(r => r.opportunity_id === 'breza_94' && r.response === 'decline'))
            .toBe(true);
    });

    // ── 10. One-shot guard ─────────────────────────────────────────────────
    it('one-shot: does NOT re-enqueue breza_94 after approval', () => {
        const state = buildState({ turn: 127 });
        runOpportunityEvaluationStep(state, 127);
        applyOpportunityDecision(state, 127, buildProposalId('breza_94', 127), 'approve');
        for (let t = 128; t <= 135; t++) runOpportunityEvaluationStep(state, t);
        const brezaProposals = state.military.operation_opportunities!
            .filter(p => p.opportunity_id === 'breza_94');
        expect(brezaProposals).toHaveLength(1);
        expect(brezaProposals[0].status).toBe('approved');
    });

    // ── 11. Single-owner discipline ─────────────────────────────────────────
    it('triggered_operations has NO Una/Breza/Pauk/Spider scripted op (single owner)', () => {
        const matches = _TRIGGERED_OPS.filter((op: { name: string }) =>
            /una|breza|pauk|spider/i.test(op.name));
        expect(matches).toHaveLength(0);
    });

    // ── 12. Determinism ─────────────────────────────────────────────────────
    it('two consecutive evaluator runs produce identical resolution rows', () => {
        const stateA = buildState({ turn: 127 });
        const stateB = buildState({ turn: 127 });
        runOpportunityEvaluationStep(stateA, 127);
        runOpportunityEvaluationStep(stateB, 127);
        applyOpportunityDecision(stateA, 127, buildProposalId('breza_94', 127), 'approve');
        applyOpportunityDecision(stateB, 127, buildProposalId('breza_94', 127), 'approve');
        expect(JSON.stringify(stateA.military.operation_opportunity_resolutions))
            .toBe(JSON.stringify(stateB.military.operation_opportunity_resolutions));
        expect(JSON.stringify(stateA.military.operation_opportunities))
            .toBe(JSON.stringify(stateB.military.operation_opportunities));
    });

    // ── 13. T3-specific guard ───────────────────────────────────────────────
    it('catalog identity: tier === T3, family === fifth_corps, faction === RBiH', () => {
        expect(BREZA_94_OPPORTUNITY.tier).toBe('T3');
        expect(BREZA_94_OPPORTUNITY.family).toBe('fifth_corps');
        expect(BREZA_94_OPPORTUNITY.faction).toBe('RBiH');
        expect(BREZA_94_OPPORTUNITY.primary_corps).toBe('arbih_5th_corps');
        expect(FIFTH_CORPS_OPPORTUNITIES.some(d => d.opportunity_id === 'breza_94')).toBe(true);
        expect(OPERATION_OPPORTUNITY_CATALOG.some(d => d.opportunity_id === 'breza_94')).toBe(true);
    });

    // ── Catalog identity sanity ─────────────────────────────────────────────
    it('axes carry the canonical 5th Corps brigade IDs (cross-ref oob_brigades.json)', () => {
        const axis = BREZA_94_OPPORTUNITY.axes[0];
        expect([...axis.brigades].sort()).toEqual([...BREZA_BRIGADE_IDS].sort());
        expect(axis.objectives).toEqual([]);
    });

    it('isOpportunityEligible passes when all required axes align (min_optional_axes:0)', () => {
        const state = buildState({ turn: 127 });
        const axes = evaluateAxes(state, 127, BREZA_94_OPPORTUNITY);
        expect(isOpportunityEligible(BREZA_94_OPPORTUNITY, axes)).toBe(true);
        expect(BREZA_94_OPPORTUNITY.prerequisites.min_optional_axes).toBe(0);
        expect(BREZA_94_OPPORTUNITY.prerequisites.alliance_context).toBe('required');
    });
});
