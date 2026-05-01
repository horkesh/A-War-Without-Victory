/**
 * operation_opportunities_tigar_sloboda_94.test.ts — LANE C Phase 2 protection suite.
 *
 * Validates the second 5th Corps family entry — Operation Tigar-Sloboda 94 as
 * a deception/thrust opportunity along the Cazin southern flank in early
 * July 1994.
 *
 * Contract under test (mirrors the Sana suite shape):
 *   - Pre-window invisibility (turn < 113).
 *   - Post-window invisibility (turn > 122).
 *   - Each REQUIRED axis is individually load-bearing — pocket survival,
 *     corps readiness, commander confidence, logistics ceiling, date.
 *   - When all required axes align AND the optional axis is green → proposal
 *     surfaces at turn 115.
 *   - Approval routes through buildCorpsOperation + the spawned op carries the
 *     friendly-controlled OSIDs past the substrate filter (proves the
 *     `targets_friendly_overrides` primitive consumes correctly).
 *   - One-shot: post-approval re-enqueue is blocked.
 *   - Decline records resolution and spawns no CorpsOperation.
 *   - Delay → re-eligible the next turn if conditions still hold.
 *   - AAR-loop linker: spawned op name matches def.name; resolution row gets
 *     executed_op_aar_id and exit_class filled.
 *   - Single-owner: triggered_operations.ts has no Tigar-Sloboda or Pecigrad
 *     scripted entry.
 *   - Determinism: two consecutive evaluator runs produce identical resolution
 *     rows.
 *   - Player-safe descriptions: no raw OSIDs in axis reasons.
 */

import { describe, expect, it } from 'vitest';

import { _TRIGGERED_OPS } from '../src/sim/combat/triggered_operations.js';
import {
    OPERATION_OPPORTUNITY_CATALOG,
    applyOpportunityDecision,
    buildProposalId,
    evaluateAxes,
    isOpportunityEligible,
    linkOpportunityResolutionToAAR,
    runOpportunityEvaluationStep,
} from '../src/sim/combat/operation_opportunities.js';
import {
    FIFTH_CORPS_OPPORTUNITIES,
    TIGAR_SLOBODA_94_OPPORTUNITY,
} from '../src/sim/combat/operation_opportunity_catalog_5th_corps.js';
import type { OperationAAR } from '../src/sim/combat/operation_aar.js';
import type {
    CorpsCommandState,
    FactionId,
    GameState,
} from '../src/state/game_state.js';

// ─── Fixture state builder ──────────────────────────────────────────────────

interface FixtureOpts {
    turn: number;
    pocketAnchorsHeldByRBiH?: boolean;
    overrideTargetsHeldByRBiH?: boolean;     // jan1993 painted truth (default true)
    addCorpsReadinessInputs?: boolean;
    addCommanderState?: boolean;
    rbihSupplyPressure?: number;
}

const POCKET_ANCHORS = [
    'op:bihac:bihac_2',
    'op:cazin:cazin_2',
    'op:bosanska_krupa:bosanska_krupa_2',
    'op:velika_kladusa:velika_kladusa_2',
];

// The four southern-flank OSIDs the catalog uses as friendly-target overrides.
const OVERRIDE_TARGETS = [
    'op:cazin:coralici',
    'op:cazin:liskovac_2',
    'op:cazin:mutnik_2',
    'op:cazin:sturlic_2',
];

const TIGAR_BRIGADE_IDS = [
    'arbih_501st_slavna_mountain',
    'arbih_502nd_vitezka_mountain',
    'arbih_503rd_slavna_mountain',
    'arbih_505th_vitezka_mountain',
    'arbih_510th_bosnian_liberation',
    'arbih_517th_light',
];

function buildState(opts: FixtureOpts): GameState {
    const cmd: CorpsCommandState = {
        command_span: 9,
        subordinate_count: 9,
        og_slots: 1,
        active_ogs: [],
        corps_exhaustion: 10,
        stance: 'offensive',
        active_operations: [],
        commander_state: (opts.addCommanderState ?? true) ? {
            current_plan: null,
            decision_trace: null,
            operation_history: [],
        } as unknown as CorpsCommandState['commander_state'] : undefined,
    };
    const controllers: Record<string, FactionId> = {};
    if (opts.pocketAnchorsHeldByRBiH ?? true) {
        for (const osid of POCKET_ANCHORS) controllers[osid] = 'RBiH';
    } else {
        for (const osid of POCKET_ANCHORS) controllers[osid] = 'RBiH';
        // Mark the Bihać HQ lost to RS — pocket has collapsed.
        controllers['op:bihac:bihac_2'] = 'RS';
    }
    // Friendly-target override OSIDs default to RBiH-painted (jan1993 baseline).
    if (opts.overrideTargetsHeldByRBiH ?? true) {
        for (const osid of OVERRIDE_TARGETS) controllers[osid] = 'RBiH';
    }

    const formations: Record<string, unknown> = {};
    if (opts.addCorpsReadinessInputs ?? true) {
        for (const id of TIGAR_BRIGADE_IDS) {
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

function fakeTigarAar(overrides: Partial<OperationAAR> = {}): OperationAAR {
    return {
        operation_id: 'arbih_5th_corps:Operation Tigar-Sloboda:t115',
        operation_name: 'Operation Tigar-Sloboda',
        corps_id: 'arbih_5th_corps',
        faction: 'RBiH',
        type: 'sector_attack',
        started_turn: 115,
        ended_turn: 121,
        outcome: 'partial',
        objectives_targeted: [...OVERRIDE_TARGETS],
        objectives_captured: ['op:cazin:sturlic_2'],
        duration_turns: 6,
        total_attacks: 4,
        casualties_suffered: { killed: 0, wounded: 0 },
        casualties_inflicted: { killed: 0, wounded: 0 },
        equipment_lost: { tanks: 0, artillery: 0 },
        equipment_destroyed: { tanks: 0, artillery: 0 },
        equipment_captured: { tanks: 0, artillery: 0 },
        participating_brigades: [...TIGAR_BRIGADE_IDS],
        initial_strength: 4200,
        final_strength: 4000,
        grade: {
            stars: 3,
            verdict: 'solid',
            factors: {
                objective_completion: 0.25,
                exchange_ratio: 1,
                tempo: 1,
                preservation: 0.95,
            },
        },
        weekly_log: [],
        ...overrides,
    };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Tigar-Sloboda 94 opportunity (LANE C Phase 2)', () => {
    // ── 1. Pre-window invisibility ──────────────────────────────────────────
    it('does not surface before turn 113 (date_window not yet open)', () => {
        const state = buildState({ turn: 112 });
        runOpportunityEvaluationStep(state, 112);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'tigar_sloboda_94')).toBeUndefined();
    });

    // ── 2. Post-window invisibility ─────────────────────────────────────────
    it('does not surface after turn 122 (date_window has closed)', () => {
        const state = buildState({ turn: 130 });
        runOpportunityEvaluationStep(state, 130);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'tigar_sloboda_94')).toBeUndefined();
    });

    // ── 3. Date alone insufficient — pocket_survival missing ────────────────
    it('does not surface when the Bihać pocket has collapsed (anchor lost to RS)', () => {
        const state = buildState({
            turn: 115,
            pocketAnchorsHeldByRBiH: false,
        });
        runOpportunityEvaluationStep(state, 115);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'tigar_sloboda_94')).toBeUndefined();
    });

    // ── 4. Date alone insufficient — corps_readiness < 0.30 ─────────────────
    it('does not surface when 5th Corps command is absent (readiness predicate red)', () => {
        // The corpsReadinessTigar predicate gates on `corps_command[arbih_5th_corps]`
        // existence first; a scenario without the corps cannot run a 5th Corps op.
        const state = buildState({ turn: 115 });
        delete state.military.corps_command!['arbih_5th_corps'];
        runOpportunityEvaluationStep(state, 115);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'tigar_sloboda_94')).toBeUndefined();
    });

    // ── 5. Date alone insufficient — commander_state missing ────────────────
    it('does not surface when 5th Corps commander_state is missing', () => {
        const state = buildState({
            turn: 115,
            addCommanderState: false,
        });
        runOpportunityEvaluationStep(state, 115);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'tigar_sloboda_94')).toBeUndefined();
    });

    // ── 6. LANE E: logistics-red still surfaces via force_quality optional ──
    it('LANE E: surfaces when supply pressure is critical IF force_quality is green (logistics no longer sole optional)', () => {
        // Under LANE E topology, `force_quality` was added as a second
        // optional axis backed by `staging_reliability` from
        // computeCorpsOperationReadiness. With min_optional_axes:1, EITHER
        // logistics OR force_quality being green is sufficient. This proves
        // the railroad-by-omission described in LANE D is closed.
        const state = buildState({
            turn: 115,
            rbihSupplyPressure: 96,
        });
        runOpportunityEvaluationStep(state, 115);
        const proposals = state.military.operation_opportunities ?? [];
        const tigar = proposals.find(p => p.opportunity_id === 'tigar_sloboda_94');
        expect(tigar).toBeDefined();
        const logisticsAxis = tigar!.last_axis_evaluation.find(a => a.axis === 'logistics');
        const forceQualityAxis = tigar!.last_axis_evaluation.find(a => a.axis === 'force_quality');
        expect(logisticsAxis?.green).toBe(false);
        expect(forceQualityAxis?.green).toBe(true);
    });

    // ── 7. All required + 1+ optional → proposal surfaces ───────────────────
    it('surfaces at turn 115 when all required axes align + the optional logistics axis is green', () => {
        const state = buildState({
            turn: 115,
            pocketAnchorsHeldByRBiH: true,
            addCorpsReadinessInputs: true,
            addCommanderState: true,
            rbihSupplyPressure: 50,
        });
        runOpportunityEvaluationStep(state, 115);
        const proposals = state.military.operation_opportunities ?? [];
        const tigar = proposals.find(p => p.opportunity_id === 'tigar_sloboda_94');
        expect(tigar).toBeDefined();
        expect(tigar!.status).toBe('eligible_pending_review');
        expect(tigar!.proposal_id).toBe('OPP_115_tigar_sloboda_94');
        expect(tigar!.approver_faction).toBe('RBiH');
        expect(tigar!.last_axis_evaluation).toHaveLength(10);
        const required = tigar!.last_axis_evaluation.filter(a => a.mode === 'required');
        for (const r of required) expect(r.green).toBe(true);
    });

    // ── 8. Approval routes through buildCorpsOperation + override OSIDs visible
    it('approve spawns a CorpsOperation and the friendly-painted OSIDs survive the controller filter', () => {
        const state = buildState({
            turn: 115,
            overrideTargetsHeldByRBiH: true,            // jan1993 painted truth
        });
        runOpportunityEvaluationStep(state, 115);
        const proposalId = buildProposalId('tigar_sloboda_94', 115);
        const updated = applyOpportunityDecision(state, 115, proposalId, 'approve');
        expect(updated!.status).toBe('approved');
        const cmd = state.military.corps_command!['arbih_5th_corps'];
        const op = cmd.active_operations.find(o => o.name === 'Operation Tigar-Sloboda');
        expect(op).toBeDefined();
        expect(op!.axes).toHaveLength(1);
        const axes = op!.axes!;
        const axis0 = axes[0];
        expect(axis0).toBeDefined();
        // Override survives the controller filter — all four objectives are
        // visible on the spawned op even though all four are RBiH-painted.
        const objectives = axis0!.objectives;
        for (const osid of OVERRIDE_TARGETS) {
            expect(objectives).toContain(osid);
        }
    });

    // ── 9. One-shot guard — post-approval re-enqueue blocked ────────────────
    it('one-shot: does NOT re-enqueue tigar_sloboda_94 after approval', () => {
        const state = buildState({ turn: 115 });
        runOpportunityEvaluationStep(state, 115);
        applyOpportunityDecision(state, 115, buildProposalId('tigar_sloboda_94', 115), 'approve');
        for (let t = 116; t <= 122; t++) runOpportunityEvaluationStep(state, t);
        const tigarProposals = state.military.operation_opportunities!
            .filter(p => p.opportunity_id === 'tigar_sloboda_94');
        expect(tigarProposals).toHaveLength(1);
        expect(tigarProposals[0].status).toBe('approved');
        const cmd = state.military.corps_command!['arbih_5th_corps'];
        expect(cmd.active_operations.filter(o => o.name === 'Operation Tigar-Sloboda')).toHaveLength(1);
    });

    // ── 10. Decline path records resolution; no CorpsOperation ──────────────
    it('decline writes a resolution row and does NOT spawn a CorpsOperation', () => {
        const state = buildState({ turn: 115 });
        runOpportunityEvaluationStep(state, 115);
        const updated = applyOpportunityDecision(
            state, 115, buildProposalId('tigar_sloboda_94', 115), 'decline');
        expect(updated!.status).toBe('declined');
        const cmd = state.military.corps_command!['arbih_5th_corps'];
        expect(cmd.active_operations.filter(o => o.name === 'Operation Tigar-Sloboda')).toHaveLength(0);
        const resolutions = state.military.operation_opportunity_resolutions!;
        expect(resolutions.some(r => r.opportunity_id === 'tigar_sloboda_94' && r.response === 'decline'))
            .toBe(true);
    });

    // ── 11. Delay → re-eligible next turn if conditions still hold ──────────
    it('delay re-evaluates once reevaluate_at_turn arrives and conditions still hold', () => {
        const state = buildState({ turn: 115 });
        runOpportunityEvaluationStep(state, 115);
        const proposalId = buildProposalId('tigar_sloboda_94', 115);
        applyOpportunityDecision(state, 115, proposalId, 'delay', undefined, { delay_turns: 2 });
        const delayed = state.military.operation_opportunities!
            .find(p => p.opportunity_id === 'tigar_sloboda_94')!;
        expect(delayed.status).toBe('delayed');
        expect(delayed.reevaluate_at_turn).toBe(117);
        // Advance — at turn 117 the opportunity should flip back to pending.
        runOpportunityEvaluationStep(state, 117);
        const after = state.military.operation_opportunities!
            .find(p => p.opportunity_id === 'tigar_sloboda_94')!;
        expect(after.status).toBe('eligible_pending_review');
    });

    // ── 12. AAR-loop linker ─────────────────────────────────────────────────
    it('AAR linker fills executed_op_aar_id + exit_class on the resolution row', () => {
        const state = buildState({ turn: 115 });
        runOpportunityEvaluationStep(state, 115);
        applyOpportunityDecision(state, 115, buildProposalId('tigar_sloboda_94', 115), 'approve');
        // Spawned op name === def.name (the AAR linker matches by name + start turn).
        const cmd = state.military.corps_command!['arbih_5th_corps'];
        const spawned = cmd.active_operations.find(o => o.name === 'Operation Tigar-Sloboda')!;
        expect(spawned.name).toBe(TIGAR_SLOBODA_94_OPPORTUNITY.name);
        // Synthesize a final AAR that matches name + start turn.
        const aar = fakeTigarAar({ outcome: 'partial', total_attacks: 5 });
        const linked = linkOpportunityResolutionToAAR(state, aar);
        expect(linked).toBe(true);
        const resolution = state.military.operation_opportunity_resolutions!
            .find(r => r.opportunity_id === 'tigar_sloboda_94' && r.response === 'approve')!;
        expect(resolution.executed_op_aar_id).toBe(aar.operation_id);
        expect(resolution.exit_class).toBe('partial_success');
    });

    // ── 13. Single-owner — no Tigar/Sloboda/Pecigrad in triggered_operations
    it('triggered_operations has NO Tigar-Sloboda or Pecigrad scripted op (single owner)', () => {
        const matches = _TRIGGERED_OPS.filter((op: { name: string }) =>
            /tigar|sloboda|pecigrad/i.test(op.name));
        expect(matches).toHaveLength(0);
    });

    // ── 14. Determinism ─────────────────────────────────────────────────────
    it('two consecutive evaluator runs produce identical resolution rows', () => {
        const stateA = buildState({ turn: 115 });
        const stateB = buildState({ turn: 115 });
        runOpportunityEvaluationStep(stateA, 115);
        runOpportunityEvaluationStep(stateB, 115);
        applyOpportunityDecision(stateA, 115, buildProposalId('tigar_sloboda_94', 115), 'approve');
        applyOpportunityDecision(stateB, 115, buildProposalId('tigar_sloboda_94', 115), 'approve');
        expect(JSON.stringify(stateA.military.operation_opportunity_resolutions))
            .toBe(JSON.stringify(stateB.military.operation_opportunity_resolutions));
        expect(JSON.stringify(stateA.military.operation_opportunities))
            .toBe(JSON.stringify(stateB.military.operation_opportunities));
    });

    // ── 15. No raw OSID spam in axis reasons ────────────────────────────────
    it('axis reasons are player-safe — no raw OSID strings leak', () => {
        const state = buildState({ turn: 115 });
        const axes = evaluateAxes(state, 115, TIGAR_SLOBODA_94_OPPORTUNITY);
        for (const a of axes) {
            expect(a.reason.includes('op:')).toBe(false);
        }
    });

    // ── Catalog identity sanity (free assertions; not part of the 15 cases) ─
    it('catalog identity: exposed via FIFTH_CORPS_OPPORTUNITIES + OPERATION_OPPORTUNITY_CATALOG', () => {
        expect(FIFTH_CORPS_OPPORTUNITIES.some(d => d.opportunity_id === 'tigar_sloboda_94')).toBe(true);
        expect(OPERATION_OPPORTUNITY_CATALOG.some(d => d.opportunity_id === 'tigar_sloboda_94')).toBe(true);
        expect(TIGAR_SLOBODA_94_OPPORTUNITY.faction).toBe('RBiH');
        expect(TIGAR_SLOBODA_94_OPPORTUNITY.primary_corps).toBe('arbih_5th_corps');
        expect(TIGAR_SLOBODA_94_OPPORTUNITY.tier).toBe('T1');
        expect(TIGAR_SLOBODA_94_OPPORTUNITY.family).toBe('fifth_corps');
        // Override list is exactly the four southern-flank OSIDs the catalog declared.
        expect([...(TIGAR_SLOBODA_94_OPPORTUNITY.targets_friendly_overrides ?? [])].sort())
            .toEqual([...OVERRIDE_TARGETS].sort());
    });

    it('axes carry the canonical 5th Corps brigade IDs (cross-ref oob_brigades.json)', () => {
        const axis = TIGAR_SLOBODA_94_OPPORTUNITY.axes[0];
        expect([...axis.brigades].sort()).toEqual([...TIGAR_BRIGADE_IDS].sort());
        expect([...axis.objectives].sort()).toEqual([...OVERRIDE_TARGETS].sort());
    });

    it('isOpportunityEligible passes when all required axes align and logistics is green', () => {
        const state = buildState({ turn: 115 });
        const axes = evaluateAxes(state, 115, TIGAR_SLOBODA_94_OPPORTUNITY);
        expect(isOpportunityEligible(TIGAR_SLOBODA_94_OPPORTUNITY, axes)).toBe(true);
    });
});
