/**
 * operation_opportunities_apwb_pressure_94.test.ts — LANE C Phase 3 protection suite.
 *
 * Validates the third 5th Corps family entry — Operation APWB Pressure 94 as
 * a sustained drive along the Pecigrad–Šturlić–Trzac–Velika Kladuša axis in
 * mid-1994.
 *
 * AMBER scope guardrails (per canon-compliance Phase 0 verdict):
 *   - Pure military framing: APWB armed formations / Abdić's brigades.
 *   - NO civilian / refugee / displacement / column / fled / cleansing
 *     vocabulary in description prose, predicate reasons, citations, or
 *     proposal text. Two dedicated AMBER tests enforce this.
 *
 * Contract under test (mirrors the Tigar-Sloboda suite shape):
 *   - Pre-window invisibility (turn < 113).
 *   - Post-window invisibility (turn > 130).
 *   - Each REQUIRED axis is individually load-bearing — pocket survival,
 *     southern-flank approach control, corps readiness, commander confidence,
 *     logistics ceiling, date.
 *   - When all required axes align AND the optional axis is green → proposal
 *     surfaces at turn 115.
 *   - Approval routes through buildCorpsOperation + the spawned op carries the
 *     friendly-painted OSIDs past the substrate filter (proves the
 *     `targets_friendly_overrides` primitive consumes correctly).
 *   - One-shot: post-approval re-enqueue is blocked.
 *   - Decline records resolution and spawns no CorpsOperation.
 *   - AAR-loop linker: spawned op name matches def.name; resolution row gets
 *     executed_op_aar_id and exit_class filled.
 *   - Single-owner: triggered_operations.ts has no APWB / Pecigrad / Kladuša /
 *     Abdić scripted entry.
 *   - Determinism: two consecutive evaluator runs produce identical resolution
 *     rows.
 *   - AMBER #1: description / citations / axis reasons contain NO civilian-
 *     displacement vocabulary.
 *   - AMBER #2: no axis predicate reads or asserts civilian-displacement
 *     state (regression hedge).
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
    APWB_PRESSURE_94_OPPORTUNITY,
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
    tigarApproachesHeldByRBiH?: boolean;       // southern-flank approach control
    overrideTargetsHeldByRBiH?: boolean;       // jan1993 painted truth (default true)
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

/** Southern-flank approaches that Tigar-Sloboda captured first. The APWB
 *  Pressure staging_access axis requires these to be RBiH-controlled — the
 *  emergent Tigar-Sloboda dependency, expressed as live state. */
const TIGAR_APPROACH_OSIDS = [
    'op:cazin:coralici',
    'op:cazin:liskovac_2',
    'op:cazin:mutnik_2',
    'op:cazin:sturlic_2',
];

/** The five Pecigrad–Šturlić–Trzac–Velika Kladuša axis OSIDs the catalog uses
 *  as friendly-target overrides. */
const OVERRIDE_TARGETS = [
    'op:cazin:sturlic_2',
    'op:velika_kladusa:vejinac_2',
    'op:velika_kladusa:zboriste_2',
    'op:velika_kladusa:poljana_2',
    'op:velika_kladusa:velika_kladusa_2',
];

const APWB_BRIGADE_IDS = [
    'arbih_501st_slavna_mountain',
    'arbih_502nd_vitezka_mountain',
    'arbih_503rd_slavna_mountain',
    'arbih_505th_vitezka_mountain',
    'arbih_506th_mountain',
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

    // Pocket anchors default to RBiH; flip Bihać to RS to model collapse.
    for (const osid of POCKET_ANCHORS) controllers[osid] = 'RBiH';

    // Friendly-target override OSIDs default to RBiH-painted (jan1993 baseline).
    // Applied FIRST so subsequent flag branches can override specific OSIDs
    // without being clobbered (Šturlić is in BOTH the override set and the
    // Tigar-approach set — the latter must win when its flag flips).
    if (opts.overrideTargetsHeldByRBiH ?? true) {
        for (const osid of OVERRIDE_TARGETS) controllers[osid] = 'RBiH';
    }

    // Southern-flank approach control (the live emergent-dependency signal).
    if (opts.tigarApproachesHeldByRBiH ?? true) {
        for (const osid of TIGAR_APPROACH_OSIDS) controllers[osid] = 'RBiH';
    } else {
        for (const osid of TIGAR_APPROACH_OSIDS) controllers[osid] = 'RBiH';
        // Mark Šturlić as still in APWB hands — Tigar-Sloboda has not finished.
        // We model "APWB-held" by setting the controller to RS (APWB rides as
        // RS-aligned auxiliary per late-war design §10; the engine has no
        // fourth faction). This makes the southern-flank axis red.
        // This intentionally clobbers the override-targets default for sturlic_2.
        controllers['op:cazin:sturlic_2'] = 'RS';
    }

    // Pocket-anchor collapse runs LAST so it cannot be re-flipped by the
    // override-targets default (Bihać is not in the override set, but VK is —
    // we don't want a `pocketAnchorsHeldByRBiH:false` flag silently undone).
    if (opts.pocketAnchorsHeldByRBiH === false) {
        controllers['op:bihac:bihac_2'] = 'RS';
    }

    const formations: Record<string, unknown> = {};
    if (opts.addCorpsReadinessInputs ?? true) {
        for (const id of APWB_BRIGADE_IDS) {
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

function fakeApwbAar(overrides: Partial<OperationAAR> = {}): OperationAAR {
    return {
        operation_id: 'arbih_5th_corps:Operation APWB Pressure:t115',
        operation_name: 'Operation APWB Pressure',
        corps_id: 'arbih_5th_corps',
        faction: 'RBiH',
        type: 'sector_attack',
        started_turn: 115,
        ended_turn: 125,
        outcome: 'success',
        objectives_targeted: [...OVERRIDE_TARGETS],
        objectives_captured: [...OVERRIDE_TARGETS],
        duration_turns: 10,
        total_attacks: 8,
        casualties_suffered: { killed: 0, wounded: 0 },
        casualties_inflicted: { killed: 0, wounded: 0 },
        equipment_lost: { tanks: 0, artillery: 0 },
        equipment_destroyed: { tanks: 0, artillery: 0 },
        equipment_captured: { tanks: 0, artillery: 0 },
        participating_brigades: [...APWB_BRIGADE_IDS],
        initial_strength: 4900,
        final_strength: 4500,
        grade: {
            stars: 4,
            verdict: 'decisive',
            factors: {
                objective_completion: 1.0,
                exchange_ratio: 1,
                tempo: 1,
                preservation: 0.92,
            },
        },
        weekly_log: [],
        ...overrides,
    };
}

// AMBER vocabulary that must NOT appear in description / citations / reasons.
const AMBER_RED_FLAG_WORDS = [
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

describe('APWB Pressure 94 opportunity (LANE C Phase 3)', () => {
    // ── 1. Pre-window invisibility ──────────────────────────────────────────
    it('does not surface before turn 113 (date_window not yet open)', () => {
        const state = buildState({ turn: 112 });
        runOpportunityEvaluationStep(state, 112);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'apwb_pressure_94')).toBeUndefined();
    });

    // ── 2. Post-window invisibility ─────────────────────────────────────────
    it('does not surface after turn 130 (date_window has closed)', () => {
        const state = buildState({ turn: 131 });
        runOpportunityEvaluationStep(state, 131);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'apwb_pressure_94')).toBeUndefined();
    });

    // ── 3. Staging access missing — southern-flank approach not RBiH ────────
    it('does not surface when southern-flank approaches are not yet RBiH-controlled', () => {
        const state = buildState({
            turn: 115,
            tigarApproachesHeldByRBiH: false,
        });
        runOpportunityEvaluationStep(state, 115);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'apwb_pressure_94')).toBeUndefined();
    });

    // ── 3b. Staging access missing — pocket collapsed ───────────────────────
    it('does not surface when the Bihać pocket has collapsed (anchor lost to RS)', () => {
        const state = buildState({
            turn: 115,
            pocketAnchorsHeldByRBiH: false,
        });
        runOpportunityEvaluationStep(state, 115);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'apwb_pressure_94')).toBeUndefined();
    });

    // ── 4. corps_readiness gate — corps absent ──────────────────────────────
    it('does not surface when 5th Corps command is absent (readiness predicate red)', () => {
        const state = buildState({ turn: 115 });
        delete state.military.corps_command!['arbih_5th_corps'];
        runOpportunityEvaluationStep(state, 115);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'apwb_pressure_94')).toBeUndefined();
    });

    // ── 5. commander_state missing ──────────────────────────────────────────
    it('does not surface when 5th Corps commander_state is missing', () => {
        const state = buildState({
            turn: 115,
            addCommanderState: false,
        });
        runOpportunityEvaluationStep(state, 115);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'apwb_pressure_94')).toBeUndefined();
    });

    // ── 5b. logistics critical → optional axis count fails ──────────────────
    it('does not surface when RBiH supply pressure is critical (>= 95) — min_optional_axes:1 fails', () => {
        const state = buildState({
            turn: 115,
            rbihSupplyPressure: 96,
        });
        runOpportunityEvaluationStep(state, 115);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'apwb_pressure_94')).toBeUndefined();
    });

    // ── 6. All required + 1+ optional → proposal surfaces ───────────────────
    it('surfaces at turn 115 when all required axes align + the optional logistics axis is green', () => {
        const state = buildState({
            turn: 115,
            pocketAnchorsHeldByRBiH: true,
            tigarApproachesHeldByRBiH: true,
            addCorpsReadinessInputs: true,
            addCommanderState: true,
            rbihSupplyPressure: 50,
        });
        runOpportunityEvaluationStep(state, 115);
        const proposals = state.military.operation_opportunities ?? [];
        const apwb = proposals.find(p => p.opportunity_id === 'apwb_pressure_94');
        expect(apwb).toBeDefined();
        expect(apwb!.status).toBe('eligible_pending_review');
        expect(apwb!.proposal_id).toBe('OPP_115_apwb_pressure_94');
        expect(apwb!.approver_faction).toBe('RBiH');
        expect(apwb!.last_axis_evaluation).toHaveLength(9);
        const required = apwb!.last_axis_evaluation.filter(a => a.mode === 'required');
        for (const r of required) expect(r.green).toBe(true);
    });

    // ── 7. Approval routes through buildCorpsOperation + override OSIDs visible
    it('approve spawns a CorpsOperation and the friendly-painted OSIDs survive the controller filter', () => {
        const state = buildState({
            turn: 115,
            overrideTargetsHeldByRBiH: true,            // jan1993 painted truth
        });
        runOpportunityEvaluationStep(state, 115);
        const proposalId = buildProposalId('apwb_pressure_94', 115);
        const updated = applyOpportunityDecision(state, 115, proposalId, 'approve');
        expect(updated!.status).toBe('approved');
        const cmd = state.military.corps_command!['arbih_5th_corps'];
        const op = cmd.active_operations.find(o => o.name === 'Operation APWB Pressure');
        expect(op).toBeDefined();
        expect(op!.axes).toHaveLength(1);
        const axes = op!.axes!;
        const axis0 = axes[0];
        expect(axis0).toBeDefined();
        // Override survives the controller filter — all five objectives are
        // visible on the spawned op even though all five are RBiH-painted.
        const objectives = axis0!.objectives;
        for (const osid of OVERRIDE_TARGETS) {
            expect(objectives).toContain(osid);
        }
    });

    // ── 8. One-shot guard — post-approval re-enqueue blocked ────────────────
    it('one-shot: does NOT re-enqueue apwb_pressure_94 after approval', () => {
        const state = buildState({ turn: 115 });
        runOpportunityEvaluationStep(state, 115);
        applyOpportunityDecision(state, 115, buildProposalId('apwb_pressure_94', 115), 'approve');
        for (let t = 116; t <= 130; t++) runOpportunityEvaluationStep(state, t);
        const apwbProposals = state.military.operation_opportunities!
            .filter(p => p.opportunity_id === 'apwb_pressure_94');
        expect(apwbProposals).toHaveLength(1);
        expect(apwbProposals[0].status).toBe('approved');
        const cmd = state.military.corps_command!['arbih_5th_corps'];
        expect(cmd.active_operations.filter(o => o.name === 'Operation APWB Pressure')).toHaveLength(1);
    });

    // ── 9. Decline path records resolution; no CorpsOperation ──────────────
    it('decline writes a resolution row and does NOT spawn a CorpsOperation', () => {
        const state = buildState({ turn: 115 });
        runOpportunityEvaluationStep(state, 115);
        const updated = applyOpportunityDecision(
            state, 115, buildProposalId('apwb_pressure_94', 115), 'decline');
        expect(updated!.status).toBe('declined');
        const cmd = state.military.corps_command!['arbih_5th_corps'];
        expect(cmd.active_operations.filter(o => o.name === 'Operation APWB Pressure')).toHaveLength(0);
        const resolutions = state.military.operation_opportunity_resolutions!;
        expect(resolutions.some(r => r.opportunity_id === 'apwb_pressure_94' && r.response === 'decline'))
            .toBe(true);
    });

    // ── 10. AAR-loop linker ─────────────────────────────────────────────────
    it('AAR linker fills executed_op_aar_id + exit_class on the resolution row', () => {
        const state = buildState({ turn: 115 });
        runOpportunityEvaluationStep(state, 115);
        applyOpportunityDecision(state, 115, buildProposalId('apwb_pressure_94', 115), 'approve');
        // Spawned op name === def.name (the AAR linker matches by name + start turn).
        const cmd = state.military.corps_command!['arbih_5th_corps'];
        const spawned = cmd.active_operations.find(o => o.name === 'Operation APWB Pressure')!;
        expect(spawned.name).toBe(APWB_PRESSURE_94_OPPORTUNITY.name);
        // Synthesize a final AAR that matches name + start turn.
        const aar = fakeApwbAar({ outcome: 'success', total_attacks: 8 });
        const linked = linkOpportunityResolutionToAAR(state, aar);
        expect(linked).toBe(true);
        const resolution = state.military.operation_opportunity_resolutions!
            .find(r => r.opportunity_id === 'apwb_pressure_94' && r.response === 'approve')!;
        expect(resolution.executed_op_aar_id).toBe(aar.operation_id);
        expect(resolution.exit_class).toBe('decisive_success');
    });

    // ── 11. Single-owner — no APWB / Pecigrad / Kladuša / Abdić in triggered_operations
    it('triggered_operations has NO APWB/Pecigrad/Kladuša/Abdić scripted op (single owner)', () => {
        const matches = _TRIGGERED_OPS.filter((op: { name: string }) =>
            /apwb|pecigrad|kladus|abdi/i.test(op.name));
        expect(matches).toHaveLength(0);
    });

    // ── 12. Determinism ─────────────────────────────────────────────────────
    it('two consecutive evaluator runs produce identical resolution rows', () => {
        const stateA = buildState({ turn: 115 });
        const stateB = buildState({ turn: 115 });
        runOpportunityEvaluationStep(stateA, 115);
        runOpportunityEvaluationStep(stateB, 115);
        applyOpportunityDecision(stateA, 115, buildProposalId('apwb_pressure_94', 115), 'approve');
        applyOpportunityDecision(stateB, 115, buildProposalId('apwb_pressure_94', 115), 'approve');
        expect(JSON.stringify(stateA.military.operation_opportunity_resolutions))
            .toBe(JSON.stringify(stateB.military.operation_opportunity_resolutions));
        expect(JSON.stringify(stateA.military.operation_opportunities))
            .toBe(JSON.stringify(stateB.military.operation_opportunities));
    });

    // ── 13. AMBER GUARDRAIL — description / citations / axis reasons ────────
    it('AMBER: catalog text contains NO civilian-displacement vocabulary', () => {
        // Concatenate every player-facing string the catalog emits or could
        // emit through the substrate. Lower-case for case-insensitive scan.
        const state = buildState({ turn: 115 });
        const axes = evaluateAxes(state, 115, APWB_PRESSURE_94_OPPORTUNITY);
        const reasonText = axes.map(a => a.reason).join(' ');
        const citationText = APWB_PRESSURE_94_OPPORTUNITY.citations.join(' ');
        const nameText = APWB_PRESSURE_94_OPPORTUNITY.name;
        const axisNameText = APWB_PRESSURE_94_OPPORTUNITY.axes
            .map(a => `${a.axis_id} ${a.name}`).join(' ');
        const haystack = `${nameText} ${citationText} ${reasonText} ${axisNameText}`.toLowerCase();
        for (const word of AMBER_RED_FLAG_WORDS) {
            expect(haystack.includes(word)).toBe(false);
        }
    });

    // ── 14. AMBER GUARDRAIL — no civilian-displacement-state predicates ─────
    it('AMBER: no axis evaluator references civilian-displacement state (regression hedge)', () => {
        // The opportunity must not gate on displacement.ts state, refugee
        // tallies, or any civilian-outflow signal. A future regression that
        // wires such a predicate would surface here. We confirm by inspecting
        // the textual reasons returned by every evaluator across a small
        // sweep of states — if any reason references the AMBER vocabulary, the
        // predicate is reading civilian state.
        const sweepStates = [
            buildState({ turn: 113 }),
            buildState({ turn: 115 }),
            buildState({ turn: 130 }),
            buildState({ turn: 115, pocketAnchorsHeldByRBiH: false }),
            buildState({ turn: 115, tigarApproachesHeldByRBiH: false }),
            buildState({ turn: 115, addCommanderState: false }),
            buildState({ turn: 115, rbihSupplyPressure: 96 }),
        ];
        for (const s of sweepStates) {
            const axes = evaluateAxes(s, s.meta.turn, APWB_PRESSURE_94_OPPORTUNITY);
            for (const a of axes) {
                const reason = a.reason.toLowerCase();
                for (const word of AMBER_RED_FLAG_WORDS) {
                    expect(reason.includes(word)).toBe(false);
                }
            }
        }
    });

    // ── 15. No raw OSID spam in axis reasons ────────────────────────────────
    it('axis reasons are player-safe — no raw OSID strings leak', () => {
        const state = buildState({ turn: 115 });
        const axes = evaluateAxes(state, 115, APWB_PRESSURE_94_OPPORTUNITY);
        for (const a of axes) {
            expect(a.reason.includes('op:')).toBe(false);
        }
    });

    // ── Catalog identity sanity (free assertions) ───────────────────────────
    it('catalog identity: exposed via FIFTH_CORPS_OPPORTUNITIES + OPERATION_OPPORTUNITY_CATALOG', () => {
        expect(FIFTH_CORPS_OPPORTUNITIES.some(d => d.opportunity_id === 'apwb_pressure_94')).toBe(true);
        expect(OPERATION_OPPORTUNITY_CATALOG.some(d => d.opportunity_id === 'apwb_pressure_94')).toBe(true);
        expect(APWB_PRESSURE_94_OPPORTUNITY.faction).toBe('RBiH');
        expect(APWB_PRESSURE_94_OPPORTUNITY.primary_corps).toBe('arbih_5th_corps');
        expect(APWB_PRESSURE_94_OPPORTUNITY.tier).toBe('T1');
        expect(APWB_PRESSURE_94_OPPORTUNITY.family).toBe('fifth_corps');
        // Override list is exactly the five Pecigrad–Šturlić–Trzac–VK axis OSIDs.
        expect([...(APWB_PRESSURE_94_OPPORTUNITY.targets_friendly_overrides ?? [])].sort())
            .toEqual([...OVERRIDE_TARGETS].sort());
    });

    it('axes carry the canonical 5th Corps brigade IDs (cross-ref oob_brigades.json)', () => {
        const axis = APWB_PRESSURE_94_OPPORTUNITY.axes[0];
        expect([...axis.brigades].sort()).toEqual([...APWB_BRIGADE_IDS].sort());
        expect([...axis.objectives].sort()).toEqual([...OVERRIDE_TARGETS].sort());
    });

    it('isOpportunityEligible passes when all required axes align and logistics is green', () => {
        const state = buildState({ turn: 115 });
        const axes = evaluateAxes(state, 115, APWB_PRESSURE_94_OPPORTUNITY);
        expect(isOpportunityEligible(APWB_PRESSURE_94_OPPORTUNITY, axes)).toBe(true);
    });
});
