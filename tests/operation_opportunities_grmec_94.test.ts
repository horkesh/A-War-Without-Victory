/**
 * operation_opportunities_grmec_94.test.ts — LANE C Phase 5 protection suite.
 *
 * Validates the seventh 5th Corps family entry — Operation Grmeč 94, the
 * October 1994 precursor that historically triggers the Pauk crisis.
 *
 * Vanilla T1 offensive — NO substrate change. All six target OSIDs are
 * RS-painted in jan1993 baseline, so the standard friendly-controller filter
 * is the right behavior; no `targets_friendly_overrides` is set.
 *
 * Contract under test (mirrors the APWB Pressure suite shape):
 *   - Pre-window invisibility (turn < 133).
 *   - Post-window invisibility (turn > 138).
 *   - Each REQUIRED axis is individually load-bearing — pocket survival,
 *     corps readiness, enemy weakness, commander confidence, date.
 *   - When all required axes align AND the optional axis is green → proposal
 *     surfaces at mid-window turn (w135).
 *   - Approval routes through buildCorpsOperation + the spawned op carries
 *     the RS-painted ridge OSIDs as objectives.
 *   - One-shot: post-approval re-enqueue is blocked.
 *   - Decline records resolution and spawns no CorpsOperation.
 *   - AAR-loop linker: spawned op name matches def.name; resolution row gets
 *     executed_op_aar_id and exit_class filled.
 *   - Single-owner: triggered_operations.ts has no Grmeč scripted entry.
 *   - Determinism: two consecutive evaluator runs produce identical resolution
 *     rows.
 *   - Sana coexistence: Grmeč window (w133-w138) does NOT overlap Sana window
 *     (w178-w188); both can coexist in the catalog.
 *   - Pauk emergent dependency (informational): both Grmeč and Pauk can
 *     surface in the same catalog evaluation pass — no hardcoded chain.
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
    GRMEC_94_OPPORTUNITY,
    PAUK_94_95_OPPORTUNITY,
    SANA_95_OPPORTUNITY,
    FIFTH_CORPS_OPPORTUNITIES,
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
    targetsHeldByRS?: boolean;                     // jan1993 painted truth (default true)
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

/** The six Grmeč ridge target OSIDs the catalog uses as objectives. All six
 *  are RS-painted in jan1993 baseline (verified via lines 13-16, 51-53, 89,
 *  100-103, 111 of painted_control_jan1993.json). */
const GRMEC_TARGETS = [
    'op:bihac:ripac',
    'op:bihac:racic',
    'op:bihac:orasac_2',
    'op:bosanski_petrovac:vodjenica',
    'op:bosanski_petrovac:prkosi',
    'op:bosanska_krupa:gornja_suvaja',
];

const GRMEC_BRIGADE_IDS = [
    'arbih_501st_slavna_mountain',
    'arbih_502nd_vitezka_mountain',
    'arbih_503rd_slavna_mountain',
    'arbih_505th_vitezka_mountain',
    'arbih_510th_bosnian_liberation',
    'arbih_511th_slavna_mountain',
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

    // Pocket anchors default to RBiH; flip Bihać to RS to model collapse.
    for (const osid of POCKET_ANCHORS) controllers[osid] = 'RBiH';

    // Grmeč ridge targets default to RS (jan1993 painted truth).
    if (opts.targetsHeldByRS ?? true) {
        for (const osid of GRMEC_TARGETS) controllers[osid] = 'RS';
    } else {
        for (const osid of GRMEC_TARGETS) controllers[osid] = 'RBiH';
    }

    // Pocket-anchor collapse runs after target setup so it cannot be undone
    // by the target default (Bihać is not in the target set).
    if (opts.pocketAnchorsHeldByRBiH === false) {
        controllers['op:bihac:bihac_2'] = 'RS';
    }

    const formations: Record<string, unknown> = {};
    if (opts.addCorpsReadinessInputs ?? true) {
        for (const id of GRMEC_BRIGADE_IDS) {
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

function fakeGrmecAar(overrides: Partial<OperationAAR> = {}): OperationAAR {
    return {
        operation_id: 'arbih_5th_corps:Operation Grmeč 94:t135',
        operation_name: 'Operation Grmeč 94',
        corps_id: 'arbih_5th_corps',
        faction: 'RBiH',
        type: 'sector_attack',
        started_turn: 135,
        ended_turn: 138,
        outcome: 'partial',
        objectives_targeted: [...GRMEC_TARGETS],
        objectives_captured: [GRMEC_TARGETS[0], GRMEC_TARGETS[1], GRMEC_TARGETS[2]],
        duration_turns: 3,
        total_attacks: 6,
        casualties_suffered: { killed: 0, wounded: 0 },
        casualties_inflicted: { killed: 0, wounded: 0 },
        equipment_lost: { tanks: 0, artillery: 0 },
        equipment_destroyed: { tanks: 0, artillery: 0 },
        equipment_captured: { tanks: 0, artillery: 0 },
        participating_brigades: [...GRMEC_BRIGADE_IDS],
        initial_strength: 4500,
        final_strength: 4100,
        grade: {
            stars: 3,
            verdict: 'partial',
            factors: {
                objective_completion: 0.5,
                exchange_ratio: 1,
                tempo: 1,
                preservation: 0.91,
            },
        },
        weekly_log: [],
        ...overrides,
    };
}

// Player-facing prose vocabulary that must NOT appear in the description /
// citations / axis names / predicate reasons (catalog hygiene).
const RED_FLAG_WORDS = [
    'civilian',
    'refugee',
    'displaced',
    'column',
    'fled',
    'flee',
    'expelled',
    'cleansing',
];

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Grmeč 94 opportunity (LANE C Phase 5)', () => {
    // ── 1. Pre-window invisibility ──────────────────────────────────────────
    it('does not surface before turn 133 (date_window not yet open)', () => {
        const state = buildState({ turn: 132 });
        runOpportunityEvaluationStep(state, 132);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'grmec_94')).toBeUndefined();
    });

    // ── 2. Post-window invisibility ─────────────────────────────────────────
    it('does not surface after turn 138 (date_window has closed)', () => {
        const state = buildState({ turn: 139 });
        runOpportunityEvaluationStep(state, 139);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'grmec_94')).toBeUndefined();
    });

    // ── 3. Pocket-survival missing → no proposal ────────────────────────────
    it('does not surface when the Bihać pocket has collapsed (anchor lost to RS)', () => {
        const state = buildState({
            turn: 135,
            pocketAnchorsHeldByRBiH: false,
        });
        runOpportunityEvaluationStep(state, 135);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'grmec_94')).toBeUndefined();
    });

    // ── 4. corps_readiness < 0.40 → no proposal ────────────────────────────
    it('does not surface when 5th Corps command is absent (readiness predicate red)', () => {
        const state = buildState({ turn: 135 });
        delete state.military.corps_command!['arbih_5th_corps'];
        runOpportunityEvaluationStep(state, 135);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'grmec_94')).toBeUndefined();
    });

    // ── 5. enemy_weakness fails — all targets RBiH-controlled by accident ──
    it('does not surface when all Grmeč ridge targets are already RBiH-controlled', () => {
        const state = buildState({
            turn: 135,
            targetsHeldByRS: false,
        });
        runOpportunityEvaluationStep(state, 135);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'grmec_94')).toBeUndefined();
    });

    // ── 6. commander_state missing → no proposal ──────────────────────────
    it('does not surface when 5th Corps commander_state is missing', () => {
        const state = buildState({
            turn: 135,
            addCommanderState: false,
        });
        runOpportunityEvaluationStep(state, 135);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'grmec_94')).toBeUndefined();
    });

    // ── 6b. LANE E: logistics-red still surfaces via force_quality optional ─
    it('LANE E: surfaces when supply pressure is too high IF force_quality is green (axis_coordination as second optional)', () => {
        // Under LANE E topology, `force_quality` was added as a second
        // optional axis backed by `axis_coordination` from
        // computeCorpsOperationReadiness. With min_optional_axes:1, EITHER
        // logistics OR force_quality being green is sufficient. Closes the
        // LANE D railroad-by-omission for Grmeč 94.
        const state = buildState({
            turn: 135,
            rbihSupplyPressure: 91,
        });
        runOpportunityEvaluationStep(state, 135);
        const proposals = state.military.operation_opportunities ?? [];
        const grmec = proposals.find(p => p.opportunity_id === 'grmec_94');
        expect(grmec).toBeDefined();
        const logisticsAxis = grmec!.last_axis_evaluation.find(a => a.axis === 'logistics');
        const forceQualityAxis = grmec!.last_axis_evaluation.find(a => a.axis === 'force_quality');
        expect(logisticsAxis?.green).toBe(false);
        expect(forceQualityAxis?.green).toBe(true);
    });

    // ── 7. All required + 1 optional → proposal surfaces at mid-window ─────
    it('surfaces at turn 135 when all required axes align + the optional logistics axis is green', () => {
        const state = buildState({
            turn: 135,
            pocketAnchorsHeldByRBiH: true,
            targetsHeldByRS: true,
            addCorpsReadinessInputs: true,
            addCommanderState: true,
            rbihSupplyPressure: 50,
        });
        runOpportunityEvaluationStep(state, 135);
        const proposals = state.military.operation_opportunities ?? [];
        const grmec = proposals.find(p => p.opportunity_id === 'grmec_94');
        expect(grmec).toBeDefined();
        expect(grmec!.status).toBe('eligible_pending_review');
        expect(grmec!.proposal_id).toBe('OPP_135_grmec_94');
        expect(grmec!.approver_faction).toBe('RBiH');
        expect(grmec!.last_axis_evaluation).toHaveLength(10);
        const required = grmec!.last_axis_evaluation.filter(a => a.mode === 'required');
        for (const r of required) expect(r.green).toBe(true);
    });

    // ── 8. Approval routes through buildCorpsOperation + RS-painted objectives
    it('approve spawns a CorpsOperation and the RS-painted ridge OSIDs are the op objectives', () => {
        const state = buildState({
            turn: 135,
            targetsHeldByRS: true,
        });
        runOpportunityEvaluationStep(state, 135);
        const proposalId = buildProposalId('grmec_94', 135);
        const updated = applyOpportunityDecision(state, 135, proposalId, 'approve');
        expect(updated!.status).toBe('approved');
        const cmd = state.military.corps_command!['arbih_5th_corps'];
        const op = cmd.active_operations.find(o => o.name === 'Operation Grmeč 94');
        expect(op).toBeDefined();
        expect(op!.axes).toHaveLength(1);
        const axes = op!.axes!;
        const axis0 = axes[0];
        expect(axis0).toBeDefined();
        // All six RS-painted ridge targets survive the standard
        // friendly-controller filter (they ARE enemy-controlled).
        const objectives = axis0!.objectives;
        for (const osid of GRMEC_TARGETS) {
            expect(objectives).toContain(osid);
        }
    });

    // ── 9. One-shot guard — post-approval re-enqueue blocked ───────────────
    it('one-shot: does NOT re-enqueue grmec_94 after approval', () => {
        const state = buildState({ turn: 135 });
        runOpportunityEvaluationStep(state, 135);
        applyOpportunityDecision(state, 135, buildProposalId('grmec_94', 135), 'approve');
        for (let t = 136; t <= 138; t++) runOpportunityEvaluationStep(state, t);
        const grmecProposals = state.military.operation_opportunities!
            .filter(p => p.opportunity_id === 'grmec_94');
        expect(grmecProposals).toHaveLength(1);
        expect(grmecProposals[0].status).toBe('approved');
        const cmd = state.military.corps_command!['arbih_5th_corps'];
        expect(cmd.active_operations.filter(o => o.name === 'Operation Grmeč 94')).toHaveLength(1);
    });

    // ── 10. Decline path records resolution; no CorpsOperation ─────────────
    it('decline writes a resolution row and does NOT spawn a CorpsOperation', () => {
        const state = buildState({ turn: 135 });
        runOpportunityEvaluationStep(state, 135);
        const updated = applyOpportunityDecision(
            state, 135, buildProposalId('grmec_94', 135), 'decline');
        expect(updated!.status).toBe('declined');
        const cmd = state.military.corps_command!['arbih_5th_corps'];
        expect(cmd.active_operations.filter(o => o.name === 'Operation Grmeč 94')).toHaveLength(0);
        const resolutions = state.military.operation_opportunity_resolutions!;
        expect(resolutions.some(r => r.opportunity_id === 'grmec_94' && r.response === 'decline'))
            .toBe(true);
    });

    // ── 11. AAR-loop linker ────────────────────────────────────────────────
    it('AAR linker fills executed_op_aar_id + exit_class on the resolution row', () => {
        const state = buildState({ turn: 135 });
        runOpportunityEvaluationStep(state, 135);
        applyOpportunityDecision(state, 135, buildProposalId('grmec_94', 135), 'approve');
        // Spawned op name === def.name (the AAR linker matches by name + start turn).
        const cmd = state.military.corps_command!['arbih_5th_corps'];
        const spawned = cmd.active_operations.find(o => o.name === 'Operation Grmeč 94')!;
        expect(spawned.name).toBe(GRMEC_94_OPPORTUNITY.name);
        // Synthesize a final AAR (partial_success — the historical exit class).
        const aar = fakeGrmecAar({ outcome: 'partial', total_attacks: 6 });
        const linked = linkOpportunityResolutionToAAR(state, aar);
        expect(linked).toBe(true);
        const resolution = state.military.operation_opportunity_resolutions!
            .find(r => r.opportunity_id === 'grmec_94' && r.response === 'approve')!;
        expect(resolution.executed_op_aar_id).toBe(aar.operation_id);
        expect(resolution.exit_class).toBe('partial_success');
    });

    // ── 12. Single-owner — no Grmeč scripted entry in triggered_operations ─
    it('triggered_operations has NO Grmeč scripted op (single owner)', () => {
        const matches = _TRIGGERED_OPS.filter((op: { name: string }) =>
            /grmec|grmeč/i.test(op.name));
        expect(matches).toHaveLength(0);
    });

    // ── 13. Determinism ────────────────────────────────────────────────────
    it('two consecutive evaluator runs produce identical resolution rows', () => {
        const stateA = buildState({ turn: 135 });
        const stateB = buildState({ turn: 135 });
        runOpportunityEvaluationStep(stateA, 135);
        runOpportunityEvaluationStep(stateB, 135);
        applyOpportunityDecision(stateA, 135, buildProposalId('grmec_94', 135), 'approve');
        applyOpportunityDecision(stateB, 135, buildProposalId('grmec_94', 135), 'approve');
        expect(JSON.stringify(stateA.military.operation_opportunity_resolutions))
            .toBe(JSON.stringify(stateB.military.operation_opportunity_resolutions));
        expect(JSON.stringify(stateA.military.operation_opportunities))
            .toBe(JSON.stringify(stateB.military.operation_opportunities));
    });

    // ── 14. Sana coexistence — windows do not overlap ─────────────────────
    it('Grmeč window (w133-w138) does NOT overlap Sana 95 window (w178-w188)', () => {
        // Probe the Sana date_window predicate at the Grmeč peak turn and the
        // Grmeč date_window predicate at the Sana peak turn — neither should
        // be green at the other's window. This guarantees the two T1 fifth_corps
        // entries can coexist in the catalog without window collision.
        const stateAtGrmecPeak = buildState({ turn: 135 });
        const stateAtSanaPeak = buildState({ turn: 183 });
        const grmecAtGrmec = evaluateAxes(stateAtGrmecPeak, 135, GRMEC_94_OPPORTUNITY)
            .find(a => a.axis === 'date_window')!;
        const sanaAtGrmec = evaluateAxes(stateAtGrmecPeak, 135, SANA_95_OPPORTUNITY)
            .find(a => a.axis === 'date_window')!;
        const grmecAtSana = evaluateAxes(stateAtSanaPeak, 183, GRMEC_94_OPPORTUNITY)
            .find(a => a.axis === 'date_window')!;
        const sanaAtSana = evaluateAxes(stateAtSanaPeak, 183, SANA_95_OPPORTUNITY)
            .find(a => a.axis === 'date_window')!;
        expect(grmecAtGrmec.green).toBe(true);
        expect(sanaAtGrmec.green).toBe(false);     // Sana window not yet open at w135
        expect(grmecAtSana.green).toBe(false);     // Grmeč window long closed at w183
        expect(sanaAtSana.green).toBe(true);
    });

    // ── 15. Pauk emergent dependency (informational) ──────────────────────
    it('Grmeč and Pauk can both surface in the same catalog evaluation pass at w135 — no hardcoded chain', () => {
        // Both windows overlap at w135 by design (Grmeč w133-w138, Pauk w135-w145).
        // Confirm BOTH date_window predicates are green at w135 — meaning the
        // catalog evaluator can surface both proposals concurrently with no
        // ordering / blocking predicate. The emergent dependency runs through
        // brigade-pool scarcity + live-state pocket-anchor drift, NOT a
        // catalog-level prerequisite.
        const state = buildState({ turn: 135 });
        const grmecAxes = evaluateAxes(state, 135, GRMEC_94_OPPORTUNITY);
        const paukAxes = evaluateAxes(state, 135, PAUK_94_95_OPPORTUNITY);
        const grmecDate = grmecAxes.find(a => a.axis === 'date_window')!;
        const paukDate = paukAxes.find(a => a.axis === 'date_window')!;
        expect(grmecDate.green).toBe(true);
        expect(paukDate.green).toBe(true);
        // Neither def references the other's id in any predicate reason text —
        // a lightweight regression hedge against accidental hardcoded chain
        // creation in future packets.
        const allReasons = [...grmecAxes, ...paukAxes].map(a => a.reason).join(' ').toLowerCase();
        expect(allReasons.includes('grmec_94')).toBe(false);
        expect(allReasons.includes('pauk_94_95')).toBe(false);
    });

    // ── Catalog-identity sanity ───────────────────────────────────────────
    it('catalog identity: exposed via FIFTH_CORPS_OPPORTUNITIES + OPERATION_OPPORTUNITY_CATALOG', () => {
        expect(FIFTH_CORPS_OPPORTUNITIES.some(d => d.opportunity_id === 'grmec_94')).toBe(true);
        expect(OPERATION_OPPORTUNITY_CATALOG.some(d => d.opportunity_id === 'grmec_94')).toBe(true);
        expect(GRMEC_94_OPPORTUNITY.faction).toBe('RBiH');
        expect(GRMEC_94_OPPORTUNITY.primary_corps).toBe('arbih_5th_corps');
        expect(GRMEC_94_OPPORTUNITY.tier).toBe('T1');
        expect(GRMEC_94_OPPORTUNITY.family).toBe('fifth_corps');
        // No friendly-target overrides — Grmeč is a vanilla offensive against
        // RS-painted targets.
        expect(GRMEC_94_OPPORTUNITY.targets_friendly_overrides).toBeUndefined();
    });

    it('axes carry the canonical 5th Corps spearhead+depth brigade IDs (cross-ref oob_brigades.json)', () => {
        const axis = GRMEC_94_OPPORTUNITY.axes[0];
        expect([...axis.brigades].sort()).toEqual([...GRMEC_BRIGADE_IDS].sort());
        expect([...axis.objectives].sort()).toEqual([...GRMEC_TARGETS].sort());
    });

    it('isOpportunityEligible passes when all required axes align and logistics is green', () => {
        const state = buildState({ turn: 135 });
        const axes = evaluateAxes(state, 135, GRMEC_94_OPPORTUNITY);
        expect(isOpportunityEligible(GRMEC_94_OPPORTUNITY, axes)).toBe(true);
    });

    // ── Prose hygiene — no civilian-displacement vocabulary ───────────────
    it('catalog text contains NO civilian-displacement vocabulary', () => {
        const state = buildState({ turn: 135 });
        const axes = evaluateAxes(state, 135, GRMEC_94_OPPORTUNITY);
        const reasonText = axes.map(a => a.reason).join(' ');
        const citationText = GRMEC_94_OPPORTUNITY.citations.join(' ');
        const nameText = GRMEC_94_OPPORTUNITY.name;
        const axisNameText = GRMEC_94_OPPORTUNITY.axes
            .map(a => `${a.axis_id} ${a.name}`).join(' ');
        const haystack = `${nameText} ${citationText} ${reasonText} ${axisNameText}`.toLowerCase();
        for (const word of RED_FLAG_WORDS) {
            expect(haystack.includes(word)).toBe(false);
        }
    });

    it('axis reasons are player-safe — no raw OSID strings leak', () => {
        const state = buildState({ turn: 135 });
        const axes = evaluateAxes(state, 135, GRMEC_94_OPPORTUNITY);
        for (const a of axes) {
            expect(a.reason.includes('op:')).toBe(false);
        }
    });
});
