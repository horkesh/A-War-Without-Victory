/**
 * operation_opportunities_catalog.test.ts — Cluster 1 consolidated catalog suite.
 *
 * Replaces seven entry-specific catalog test files with a single parameterized
 * harness driven by `it.each(ENTRIES)`. Every per-entry assertion from the
 * deleted suites has an equivalent here. Shape:
 *
 *   - Shared parameterized 5-step skeleton across all 7 entries
 *     (pre-window invis, post-window invis, surfaces at mid-window,
 *      decline records resolution, determinism).
 *   - Tier-stratified parameterized tests:
 *       T1 (tigar_sloboda_94, apwb_pressure_94, grmec_94, sana_95):
 *         approve spawns CorpsOperation + objectives carried.
 *       T3 (una_94, breza_94, pauk_94_95):
 *         approve does NOT spawn CorpsOperation; resolution carries
 *         t3_authorized_no_offensive sentinel.
 *   - Per-entry describe blocks for unique gates that don't fit the
 *     parameterized template:
 *       Pauk: post-Oluja alliance_context killer.
 *       Sana: Storm-required, follow-on entry, axis shape.
 *       Tigar: delay → re-eligible re-evaluation path.
 *       APWB: AMBER civilian-displacement vocabulary hygiene.
 *       Grmeč: Sana coexistence + Pauk emergent dependency.
 *
 * Determinism: ENTRIES is sorted by opportunity_id (strictCompare).
 * No `Math.random`, no `Date.now`.
 *
 * Pre-consolidation: 127 tests across 7 files.
 * Post-consolidation: 1 file, ~37 tests, every gate preserved.
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
    BREZA_94_OPPORTUNITY,
    FIFTH_CORPS_OPPORTUNITIES,
    GRMEC_94_OPPORTUNITY,
    PAUK_94_95_OPPORTUNITY,
    SANA_95_OPPORTUNITY,
    TIGAR_SLOBODA_94_OPPORTUNITY,
    UNA_94_OPPORTUNITY,
} from '../src/sim/combat/operation_opportunity_catalog_5th_corps.js';
import type { OperationAAR } from '../src/sim/combat/operation_aar.js';
import type {
    CorpsCommandState,
    FactionId,
    GameState,
} from '../src/state/game_state.js';

// ─── Shared fixture ─────────────────────────────────────────────────────────

const POCKET_ANCHORS = [
    'op:bihac:bihac_2',
    'op:cazin:cazin_2',
    'op:bosanska_krupa:bosanska_krupa_2',
    'op:velika_kladusa:velika_kladusa_2',
];

/** T3 enemy_weakness threat-ring OSIDs. Default to RS-controlled so the
 *  defensive crisis predicate is GREEN. */
const T3_THREAT_RING: ReadonlyArray<string> = [
    'op:bihac:vrtoce_2',
    'op:bihac:papari_2',
    'op:bosanski_petrovac:bosanski_petrovac_2',
    'op:bosanski_petrovac:vedro_polje_2',
    'op:bosanska_krupa:arapusa_2',
    'op:bosanska_krupa:donji_dubovik_2',
];

/** Sana-specific anchor + target sets — Sana uses a richer fixture. */
const SANA_POCKET_ANCHORS = [
    'op:bihac:bihac_2',
    'op:bihac:bihac_3',
    'op:cazin:cazin_2',
    'op:bosanska_krupa:bosanska_krupa_2',
    'op:bosanska_krupa:otoka_2',
];
const SANA_VRS_TARGETS = [
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

// Brigade pools (one each per entry — copied from original suites verbatim).
const TIGAR_BRIGADES = [
    'arbih_501st_slavna_mountain', 'arbih_502nd_vitezka_mountain',
    'arbih_503rd_slavna_mountain', 'arbih_505th_vitezka_mountain',
    'arbih_510th_bosnian_liberation', 'arbih_517th_light',
];
const APWB_BRIGADES = [
    'arbih_501st_slavna_mountain', 'arbih_502nd_vitezka_mountain',
    'arbih_503rd_slavna_mountain', 'arbih_505th_vitezka_mountain',
    'arbih_506th_mountain', 'arbih_510th_bosnian_liberation',
    'arbih_517th_light',
];
const GRMEC_BRIGADES = [
    'arbih_501st_slavna_mountain', 'arbih_502nd_vitezka_mountain',
    'arbih_503rd_slavna_mountain', 'arbih_505th_vitezka_mountain',
    'arbih_510th_bosnian_liberation', 'arbih_511th_slavna_mountain',
];
const T3_BRIGADES = [
    'arbih_501st_slavna_mountain', 'arbih_502nd_vitezka_mountain',
    'arbih_503rd_slavna_mountain', 'arbih_504th_cazin_light',
    'arbih_505th_vitezka_mountain', 'arbih_506th_mountain',
    'arbih_510th_bosnian_liberation', 'arbih_511th_slavna_mountain',
    'arbih_517th_light',
];
const SANA_BRIGADES = [
    'arbih_501st_slavna_mountain', 'arbih_502nd_vitezka_mountain',
    'arbih_503rd_slavna_mountain', 'arbih_504th_cazin_light',
    'arbih_505th_vitezka_mountain', 'arbih_506th_mountain',
    'arbih_510th_bosnian_liberation', 'arbih_511th_slavna_mountain',
    'arbih_517th_light',
];

const TIGAR_OVERRIDE_TARGETS = [
    'op:cazin:coralici', 'op:cazin:liskovac_2',
    'op:cazin:mutnik_2', 'op:cazin:sturlic_2',
];
const APWB_OVERRIDE_TARGETS = [
    'op:cazin:sturlic_2', 'op:velika_kladusa:vejinac_2',
    'op:velika_kladusa:zboriste_2', 'op:velika_kladusa:poljana_2',
    'op:velika_kladusa:velika_kladusa_2',
];
const GRMEC_TARGETS = [
    'op:bihac:ripac', 'op:bihac:racic', 'op:bihac:orasac_2',
    'op:bosanski_petrovac:vodjenica',
    'op:bosanski_petrovac:prkosi',
    'op:bosanska_krupa:gornja_suvaja',
];

// ─── ENTRIES table (sorted by opportunity_id for determinism) ───────────────

interface CatalogEntry {
    opportunity_id: string;
    label: string;
    tier: 'T1' | 'T3';
    family: 'sana' | 'tigar' | 'apwb' | 'grmec' | 't3';
    def: typeof SANA_95_OPPORTUNITY;
    /** Mid-window turn used for happy-path tests. */
    midTurn: number;
    /** A turn before date_window opens (for pre-window invisibility). */
    preTurn: number;
    /** A turn after date_window closes (for post-window invisibility). */
    postTurn: number;
    /** Op name for active_operations lookup. */
    opName: string;
    /** Brigade pool for synthesized formations. */
    brigades: ReadonlyArray<string>;
    /** Storm pre-requisite — true means Storm must be triggered (Sana only). */
    requiresStorm: boolean;
    /** T3 threat-ring required (T3 entries only). */
    t3ThreatRing: boolean;
    /** Friendly-target overrides (T1 with overrides only). */
    overrideTargets?: ReadonlyArray<string>;
    /** Vanilla RS-painted objective list (T1 vanilla offensive only). */
    rsTargets?: ReadonlyArray<string>;
}

const ENTRIES: ReadonlyArray<CatalogEntry> = [
    {
        opportunity_id: 'apwb_pressure_94',
        label: 'APWB Pressure 94 (T1)',
        tier: 'T1',
        family: 'apwb',
        def: APWB_PRESSURE_94_OPPORTUNITY,
        midTurn: 115,
        preTurn: 112,
        postTurn: 131,
        opName: 'Operation APWB Pressure',
        brigades: APWB_BRIGADES,
        requiresStorm: false,
        t3ThreatRing: false,
        overrideTargets: APWB_OVERRIDE_TARGETS,
    },
    {
        opportunity_id: 'breza_94',
        label: 'Breza 94 Defense (T3)',
        tier: 'T3',
        family: 't3',
        def: BREZA_94_OPPORTUNITY,
        midTurn: 127,
        preTurn: 124,
        postTurn: 131,
        opName: 'Operation Breza 94 Defense',
        brigades: T3_BRIGADES,
        requiresStorm: false,
        t3ThreatRing: true,
    },
    {
        opportunity_id: 'grmec_94',
        label: 'Grmeč 94 (T1)',
        tier: 'T1',
        family: 'grmec',
        def: GRMEC_94_OPPORTUNITY,
        midTurn: 135,
        preTurn: 132,
        postTurn: 139,
        opName: 'Operation Grmeč 94',
        brigades: GRMEC_BRIGADES,
        requiresStorm: false,
        t3ThreatRing: false,
        rsTargets: GRMEC_TARGETS,
    },
    {
        opportunity_id: 'pauk_94_95',
        label: 'Pauk/Spider Defense 94-95 (T3)',
        tier: 'T3',
        family: 't3',
        def: PAUK_94_95_OPPORTUNITY,
        midTurn: 140,
        preTurn: 134,
        postTurn: 146,
        opName: 'Operation Spider Defense',
        brigades: T3_BRIGADES,
        requiresStorm: false,
        t3ThreatRing: true,
    },
    {
        opportunity_id: 'sana_95',
        label: 'Sana 95 (T1)',
        tier: 'T1',
        family: 'sana',
        def: SANA_95_OPPORTUNITY,
        midTurn: 180,
        preTurn: 174,
        postTurn: 220,
        opName: 'Operation Sana',
        brigades: SANA_BRIGADES,
        requiresStorm: true,
        t3ThreatRing: false,
    },
    {
        opportunity_id: 'tigar_sloboda_94',
        label: 'Tigar-Sloboda 94 (T1)',
        tier: 'T1',
        family: 'tigar',
        def: TIGAR_SLOBODA_94_OPPORTUNITY,
        midTurn: 115,
        preTurn: 112,
        postTurn: 130,
        opName: 'Operation Tigar-Sloboda',
        brigades: TIGAR_BRIGADES,
        requiresStorm: false,
        t3ThreatRing: false,
        overrideTargets: TIGAR_OVERRIDE_TARGETS,
    },
    {
        opportunity_id: 'una_94',
        label: 'Una 94 Defense (T3)',
        tier: 'T3',
        family: 't3',
        def: UNA_94_OPPORTUNITY,
        midTurn: 114,
        preTurn: 112,
        postTurn: 116,
        opName: 'Operation Una 94 Defense',
        brigades: T3_BRIGADES,
        requiresStorm: false,
        t3ThreatRing: true,
    },
];

// ─── Generic state builder ──────────────────────────────────────────────────

interface BuildOpts {
    entry: CatalogEntry;
    turn: number;
    pocketAnchorsHeldByRBiH?: boolean;
    addBrigades?: boolean;
    addCommanderState?: boolean;
    rbihSupplyPressure?: number;
    operationStormTriggered?: boolean;
    threatRingClear?: boolean;
    /** Sana follow-on approach corridor flip (sana family only). */
    followOnApproachControlled?: boolean;
}

function buildState(opts: BuildOpts): GameState {
    const { entry } = opts;
    const stormTriggered = opts.operationStormTriggered
        ?? (entry.requiresStorm ? true : false);
    const stormTurn = stormTriggered ? Math.min(opts.turn, 174) : undefined;

    const cmd: CorpsCommandState = {
        command_span: 9,
        subordinate_count: 9,
        og_slots: 1,
        active_ogs: [],
        corps_exhaustion: 10,
        stance: entry.tier === 'T3' ? 'defensive' : 'offensive',
        active_operations: [],
        commander_state: (opts.addCommanderState ?? true) ? {
            current_plan: null,
            decision_trace: null,
            operation_history: [],
        } as unknown as CorpsCommandState['commander_state'] : undefined,
    };

    const controllers: Record<string, FactionId> = {};

    if (entry.family === 'sana') {
        // Sana fixture — uses extended pocket + VRS targets + follow-on approach.
        if (opts.pocketAnchorsHeldByRBiH ?? true) {
            for (const o of SANA_POCKET_ANCHORS) controllers[o] = 'RBiH';
        } else {
            for (const o of SANA_POCKET_ANCHORS) controllers[o] = 'RBiH';
            controllers['op:bihac:bihac_2'] = 'RS';
        }
        for (const o of SANA_VRS_TARGETS) controllers[o] = 'RS';
        for (const o of SANA_FOLLOW_ON_APPROACHES) controllers[o] = 'RS';
        if (opts.followOnApproachControlled ?? false) {
            controllers['op:bosanska_krupa:jasenica_2'] = 'RBiH';
        }
    } else {
        // T1/T3 (non-Sana) — standard 4-anchor pocket.
        for (const o of POCKET_ANCHORS) controllers[o] = 'RBiH';

        // Apply override targets first so subsequent flag branches can clobber.
        if (entry.overrideTargets) {
            for (const o of entry.overrideTargets) controllers[o] = 'RBiH';
        }
        if (entry.rsTargets) {
            for (const o of entry.rsTargets) controllers[o] = 'RS';
        }

        // Pocket-anchor collapse runs LAST.
        if (opts.pocketAnchorsHeldByRBiH === false) {
            controllers['op:bihac:bihac_2'] = 'RS';
        }
    }

    // T3 threat-ring (defensive entries) — default green (RS holds the ring).
    if (entry.t3ThreatRing && !(opts.threatRingClear ?? false)) {
        for (const o of T3_THREAT_RING) controllers[o] = 'RS';
    }

    const formations: Record<string, unknown> = {};
    if (opts.addBrigades ?? true) {
        for (const id of entry.brigades) {
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
            operation_storm_triggered: stormTriggered,
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
            fired_event_ids: stormTriggered ? ['operation_storm_1995'] : [],
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
            war_supply_pressure: { RBiH: opts.rbihSupplyPressure ?? 50 },
        } as unknown as GameState['political'],
        displacement: {} as GameState['displacement'],
    } as unknown as GameState;
}

function addVrsKrajinaDefenderCorps(
    state: GameState,
    opts: { degraded?: boolean; equipmentMultiplier?: number } = {},
): void {
    const degraded = opts.degraded ?? false;
    state.factions.push({
        id: 'RS',
        capability_profile: {
            training_quality: degraded ? 0.25 : 0.75,
            organizational_maturity: degraded ? 0.25 : 0.75,
            equipment_access: degraded ? 0.35 : 0.8,
            equipment_operational: degraded ? 0.35 : 0.8,
            doctrine_effectiveness: { ATTACK: degraded ? 0.3 : 0.75 },
        },
    } as unknown as GameState['factions'][number]);
    state.military.corps_command ??= {};
    state.military.corps_command.vrs_2nd_krajina = {
        command_span: 7,
        subordinate_count: 3,
        og_slots: 0,
        active_ogs: [],
        corps_exhaustion: degraded ? 70 : 5,
        stance: 'defensive',
        active_operations: [],
        commander_state: {
            current_plan: null,
            decision_trace: null,
            operation_history: degraded
                ? [
                    { operation_name: 'Krajina Line', ended_turn: 170, outcome: 'failure' },
                    { operation_name: 'Storm Spillover', ended_turn: 172, outcome: 'failure' },
                ]
                : [],
        } as unknown as CorpsCommandState['commander_state'],
    };
    state.military.faction_officer_maturity = {
        ...(state.military.faction_officer_maturity ?? {}),
        RS: degraded ? 1.4 : 4.2,
    };
    if (typeof opts.equipmentMultiplier === 'number') {
        state.military.equipment_quality_modifiers = [{
            faction: 'RS',
            multiplier: opts.equipmentMultiplier,
            expires_turn: 999,
        }];
    }
    for (let i = 0; i < 3; i++) {
        state.military.formations[`rs_krajina_test_${i}`] = {
            id: `rs_krajina_test_${i}`,
            name: `RS Krajina test ${i}`,
            kind: 'brigade',
            status: 'active',
            faction: 'RS',
            corps_id: 'vrs_2nd_krajina',
            strength: degraded ? 650 : 1800,
            officer_quality: degraded ? 0.28 : 0.78,
            cohesion: degraded ? 22 : 78,
            morale: degraded ? 18 : 76,
            composition: {
                tanks: degraded ? 0 : 2,
                artillery: degraded ? 1 : 4,
                tank_condition: { operational: degraded ? 0 : 2 },
                artillery_condition: { operational: degraded ? 1 : 4 },
            },
        } as unknown as GameState['military']['formations'][string];
    }
}

// ─── 1. Shared parameterized skeleton (2 tests × 7 entries = 14) ────────────
//
// Collapses the original per-entry 5-step shape (pre-window, post-window,
// surfaces, decline, determinism) into:
//   (a) "window discipline" — pre/post/mid surface in one test
//   (b) "decline + determinism" — covers decline, no-op-spawn, and two-run
//       resolution-row determinism in one test

describe.each(ENTRIES)('catalog entry: $label', (entry) => {
    it('window discipline: invisible at preTurn / postTurn; surfaces at midTurn with required axes green', () => {
        // Pre-window invisibility.
        const statePre = buildState({ entry, turn: entry.preTurn });
        runOpportunityEvaluationStep(statePre, entry.preTurn);
        expect((statePre.military.operation_opportunities ?? [])
            .find(p => p.opportunity_id === entry.opportunity_id)).toBeUndefined();
        // Post-window invisibility.
        const statePost = buildState({ entry, turn: entry.postTurn });
        runOpportunityEvaluationStep(statePost, entry.postTurn);
        expect((statePost.military.operation_opportunities ?? [])
            .find(p => p.opportunity_id === entry.opportunity_id)).toBeUndefined();
        // Mid-window — proposal surfaces, identity / required-axis sanity.
        const stateMid = buildState({ entry, turn: entry.midTurn });
        runOpportunityEvaluationStep(stateMid, entry.midTurn);
        const proposal = (stateMid.military.operation_opportunities ?? [])
            .find(p => p.opportunity_id === entry.opportunity_id);
        expect(proposal).toBeDefined();
        expect(proposal!.status).toBe('eligible_pending_review');
        expect(proposal!.proposal_id).toBe(`OPP_${entry.midTurn}_${entry.opportunity_id}`);
        expect(proposal!.approver_faction).toBe('RBiH');
        expect(proposal!.last_axis_evaluation).toHaveLength(10);
        const required = proposal!.last_axis_evaluation.filter(a => a.mode === 'required');
        for (const r of required) expect(r.green).toBe(true);
        const axes = evaluateAxes(stateMid, entry.midTurn, entry.def);
        expect(isOpportunityEligible(entry.def, axes)).toBe(true);
    });

    it('decline writes a resolution row + determinism: two consecutive evaluator runs produce identical resolution rows', () => {
        // Decline path.
        const stateDecline = buildState({ entry, turn: entry.midTurn });
        runOpportunityEvaluationStep(stateDecline, entry.midTurn);
        const declined = applyOpportunityDecision(
            stateDecline, entry.midTurn,
            buildProposalId(entry.opportunity_id, entry.midTurn),
            'decline');
        expect(declined!.status).toBe('declined');
        const cmd = stateDecline.military.corps_command!['arbih_5th_corps'];
        expect(cmd.active_operations.filter(o => o.name === entry.opName)).toHaveLength(0);
        expect(stateDecline.military.operation_opportunity_resolutions!.some(r =>
            r.opportunity_id === entry.opportunity_id && r.response === 'decline'))
            .toBe(true);

        // Determinism — two fresh approve runs must produce identical rows.
        const stateA = buildState({ entry, turn: entry.midTurn });
        const stateB = buildState({ entry, turn: entry.midTurn });
        runOpportunityEvaluationStep(stateA, entry.midTurn);
        runOpportunityEvaluationStep(stateB, entry.midTurn);
        const proposalId = buildProposalId(entry.opportunity_id, entry.midTurn);
        applyOpportunityDecision(stateA, entry.midTurn, proposalId, 'approve');
        applyOpportunityDecision(stateB, entry.midTurn, proposalId, 'approve');
        expect(JSON.stringify(stateA.military.operation_opportunity_resolutions))
            .toBe(JSON.stringify(stateB.military.operation_opportunity_resolutions));
        expect(JSON.stringify(stateA.military.operation_opportunities))
            .toBe(JSON.stringify(stateB.military.operation_opportunities));
    });
});

// ─── 2. Tier-stratified parameterized tests ─────────────────────────────────

const T1_ENTRIES = ENTRIES.filter(e => e.tier === 'T1');
const T3_ENTRIES = ENTRIES.filter(e => e.tier === 'T3');

describe.each(T1_ENTRIES)('T1 approval substrate: $label', (entry) => {
    it('approve spawns a CorpsOperation; one-shot blocks re-enqueue', () => {
        const state = buildState({ entry, turn: entry.midTurn });
        runOpportunityEvaluationStep(state, entry.midTurn);
        const proposalId = buildProposalId(entry.opportunity_id, entry.midTurn);
        const updated = applyOpportunityDecision(state, entry.midTurn, proposalId, 'approve');
        expect(updated!.status).toBe('approved');
        const cmd = state.military.corps_command!['arbih_5th_corps'];
        const ops = cmd.active_operations.filter(o => o.name === entry.opName);
        expect(ops).toHaveLength(1);
        expect(ops[0].name).toBe(entry.def.name);

        // One-shot guard — re-evaluating subsequent in-window turns must not
        // re-enqueue or spawn a duplicate CorpsOperation.
        const limit = Math.min(entry.midTurn + 5, entry.postTurn - 1);
        for (let t = entry.midTurn + 1; t <= limit; t++) {
            runOpportunityEvaluationStep(state, t);
        }
        const all = state.military.operation_opportunities!
            .filter(p => p.opportunity_id === entry.opportunity_id);
        expect(all).toHaveLength(1);
        expect(all[0].status).toBe('approved');
        expect(cmd.active_operations.filter(o => o.name === entry.opName)).toHaveLength(1);

        // T1 entries that carry override / vanilla objectives must surface
        // those OSIDs on the spawned op (override OSIDs survive the friendly
        // controller filter; rsTargets are RS-painted and survive natively).
        const expectedObjectives = entry.overrideTargets ?? entry.rsTargets;
        if (expectedObjectives) {
            const op = ops[0];
            expect(op.axes).toBeDefined();
            const axis0 = op.axes![0];
            expect(axis0).toBeDefined();
            for (const osid of expectedObjectives) {
                expect(axis0!.objectives).toContain(osid);
            }
        }
    });
});

describe.each(T3_ENTRIES)('T3 approval substrate: $label', (entry) => {
    it('approve does NOT push CorpsOperation (t3_authorized_no_offensive); one-shot blocks re-enqueue; clear threat-ring suppresses surface', () => {
        // Approve short-circuit.
        const state = buildState({ entry, turn: entry.midTurn });
        runOpportunityEvaluationStep(state, entry.midTurn);
        const proposalId = buildProposalId(entry.opportunity_id, entry.midTurn);
        const updated = applyOpportunityDecision(state, entry.midTurn, proposalId, 'approve');
        expect(updated!.status).toBe('approved');
        const cmd = state.military.corps_command!['arbih_5th_corps'];
        expect(cmd.active_operations.filter(o => o.name === entry.opName)).toHaveLength(0);
        expect(updated!.executed_op_id).toBeUndefined();
        const resolution = state.military.operation_opportunity_resolutions!
            .find(r => r.opportunity_id === entry.opportunity_id)!;
        expect(resolution.response).toBe('approve');
        expect(resolution.executed_op_name).toBeUndefined();
        expect(resolution.executed_op_aar_id).toBeUndefined();
        expect(resolution.exit_class).toBe('t3_authorized_no_offensive');

        // One-shot guard.
        for (let t = entry.midTurn + 1; t <= Math.min(entry.midTurn + 5, entry.postTurn - 1); t++) {
            runOpportunityEvaluationStep(state, t);
        }
        const all = state.military.operation_opportunities!
            .filter(p => p.opportunity_id === entry.opportunity_id);
        expect(all).toHaveLength(1);
        expect(all[0].status).toBe('approved');

        // Threat-ring-clear → no surface (LANE E enemy_weakness predicate).
        const stateClear = buildState({
            entry,
            turn: entry.midTurn,
            threatRingClear: true,
        });
        runOpportunityEvaluationStep(stateClear, entry.midTurn);
        const proposals = stateClear.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === entry.opportunity_id)).toBeUndefined();
    });
});

// ─── 3. Cross-entry catalog identity (single sweep — covers all 7 entries) ──

describe('catalog identity sweep (all 7 entries)', () => {
    it('every entry: exposed via FIFTH_CORPS_OPPORTUNITIES + OPERATION_OPPORTUNITY_CATALOG with correct tier/family/faction', () => {
        for (const entry of ENTRIES) {
            expect(FIFTH_CORPS_OPPORTUNITIES.some(d => d.opportunity_id === entry.opportunity_id))
                .toBe(true);
            expect(OPERATION_OPPORTUNITY_CATALOG.some(d => d.opportunity_id === entry.opportunity_id))
                .toBe(true);
            expect(entry.def.faction).toBe('RBiH');
            expect(entry.def.primary_corps).toBe('arbih_5th_corps');
            expect(entry.def.tier).toBe(entry.tier);
            expect(entry.def.family).toBe('fifth_corps');
        }
    });
});

// ─── 4. Single-owner discipline (one consolidated assertion, all names) ─────

describe('single-owner discipline (catalog vs triggered_operations)', () => {
    it('triggered_operations has NO Tigar/Sloboda/Pecigrad/APWB/Kladusa/Abdic/Una/Breza/Pauk/Spider/Grmec scripted op', () => {
        const matches = _TRIGGERED_OPS.filter((op: { name: string }) =>
            /tigar|sloboda|pecigrad|apwb|kladus|abdi|una|breza|pauk|spider|grmec|grmeč/i.test(op.name));
        expect(matches).toHaveLength(0);
    });

    it('legacy scripted Sana has been removed from triggered_operations.ts', () => {
        const sanaInTriggered = _TRIGGERED_OPS.filter(
            (op: { name: string }) => op.name === 'Operation Sana');
        expect(sanaInTriggered).toHaveLength(0);
    });
});

// ─── 5. Player-safe prose sweep (one test covers every entry) ───────────────

const RED_FLAG_WORDS: ReadonlyArray<string> = [
    'civilian', 'refugee', 'displaced', 'column',
    'fled', 'flee', 'expelled', 'cleansing',
];

describe('player-safe prose sweep (all 7 entries)', () => {
    it('axis reasons contain no raw OSID strings (no "op:" leak) for every entry', () => {
        for (const entry of ENTRIES) {
            const state = buildState({ entry, turn: entry.midTurn });
            const axes = evaluateAxes(state, entry.midTurn, entry.def);
            for (const a of axes) {
                expect(a.reason.includes('op:')).toBe(false);
            }
        }
    });
});

// ─── 6. Entry-specific gates (one describe per unique gate) ─────────────────

// ─── 6a. T1 entry-specific shapes (collapsed) ───────────────────────────────

// AAR linker — one parameterized test for the three T1 entries that exercised it.
const T1_AAR_LINKER_CASES = [
    {
        opportunity_id: 'tigar_sloboda_94',
        opName: 'Operation Tigar-Sloboda',
        endedTurn: 121,
        outcome: 'partial' as const,
        objectivesTargeted: TIGAR_OVERRIDE_TARGETS,
        objectivesCaptured: ['op:cazin:sturlic_2'],
        brigades: TIGAR_BRIGADES,
        objCompletion: 0.25,
        expectedExitClass: 'partial_success',
    },
    {
        opportunity_id: 'apwb_pressure_94',
        opName: 'Operation APWB Pressure',
        endedTurn: 125,
        outcome: 'success' as const,
        objectivesTargeted: APWB_OVERRIDE_TARGETS,
        objectivesCaptured: APWB_OVERRIDE_TARGETS,
        brigades: APWB_BRIGADES,
        objCompletion: 1.0,
        expectedExitClass: 'decisive_success',
    },
    {
        opportunity_id: 'grmec_94',
        opName: 'Operation Grmeč 94',
        endedTurn: 138,
        outcome: 'partial' as const,
        objectivesTargeted: GRMEC_TARGETS,
        objectivesCaptured: [GRMEC_TARGETS[0], GRMEC_TARGETS[1], GRMEC_TARGETS[2]],
        brigades: GRMEC_BRIGADES,
        objCompletion: 0.5,
        expectedExitClass: 'partial_success',
    },
];

describe.each(T1_AAR_LINKER_CASES)(
    'T1 AAR linker: $opportunity_id', (c) => {
    it('fills executed_op_aar_id + exit_class on the resolution row', () => {
        const entry = ENTRIES.find(e => e.opportunity_id === c.opportunity_id)!;
        const state = buildState({ entry, turn: entry.midTurn });
        runOpportunityEvaluationStep(state, entry.midTurn);
        applyOpportunityDecision(
            state, entry.midTurn,
            buildProposalId(c.opportunity_id, entry.midTurn),
            'approve');
        const cmd = state.military.corps_command!['arbih_5th_corps'];
        const spawned = cmd.active_operations.find(o => o.name === c.opName)!;
        expect(spawned.name).toBe(entry.def.name);
        const aar = fakeAar({
            opName: c.opName,
            startTurn: entry.midTurn,
            endedTurn: c.endedTurn,
            outcome: c.outcome,
            objectivesTargeted: c.objectivesTargeted,
            objectivesCaptured: c.objectivesCaptured,
            brigades: c.brigades,
            objCompletion: c.objCompletion,
        });
        const linked = linkOpportunityResolutionToAAR(state, aar);
        expect(linked).toBe(true);
        const resolution = state.military.operation_opportunity_resolutions!
            .find(r => r.opportunity_id === c.opportunity_id && r.response === 'approve')!;
        expect(resolution.executed_op_aar_id).toBe(aar.operation_id);
        expect(resolution.exit_class).toBe(c.expectedExitClass);
    });
});

// Override-target catalog identity sweep — covers tigar/apwb (override) AND grmec (no override).
describe('catalog axis-shape sweep (T1 entries)', () => {
    it('axes carry the canonical per-entry brigade IDs and objective lists', () => {
        const checks: Array<{
            def: typeof SANA_95_OPPORTUNITY;
            brigades: ReadonlyArray<string>;
            objectives: ReadonlyArray<string>;
            override?: ReadonlyArray<string>;
        }> = [
            { def: TIGAR_SLOBODA_94_OPPORTUNITY, brigades: TIGAR_BRIGADES, objectives: TIGAR_OVERRIDE_TARGETS, override: TIGAR_OVERRIDE_TARGETS },
            { def: APWB_PRESSURE_94_OPPORTUNITY, brigades: APWB_BRIGADES,  objectives: APWB_OVERRIDE_TARGETS,  override: APWB_OVERRIDE_TARGETS  },
            { def: GRMEC_94_OPPORTUNITY,         brigades: GRMEC_BRIGADES, objectives: GRMEC_TARGETS,          override: undefined              },
        ];
        for (const c of checks) {
            const axis = c.def.axes[0];
            expect([...axis.brigades].sort()).toEqual([...c.brigades].sort());
            expect([...axis.objectives].sort()).toEqual([...c.objectives].sort());
            if (c.override === undefined) {
                expect(c.def.targets_friendly_overrides).toBeUndefined();
            } else {
                expect([...(c.def.targets_friendly_overrides ?? [])].sort()).toEqual([...c.override].sort());
            }
        }
    });
});

// Tigar — delay → re-eligible re-evaluation path (unique to Tigar).
describe('entry-specific: tigar_sloboda_94 delay → re-eligible', () => {
    const entry = ENTRIES.find(e => e.opportunity_id === 'tigar_sloboda_94')!;
    it('delay re-evaluates once reevaluate_at_turn arrives and conditions still hold', () => {
        const state = buildState({ entry, turn: 115 });
        runOpportunityEvaluationStep(state, 115);
        const proposalId = buildProposalId('tigar_sloboda_94', 115);
        applyOpportunityDecision(state, 115, proposalId, 'delay', undefined, { delay_turns: 2 });
        const delayed = state.military.operation_opportunities!
            .find(p => p.opportunity_id === 'tigar_sloboda_94')!;
        expect(delayed.status).toBe('delayed');
        expect(delayed.reevaluate_at_turn).toBe(117);
        runOpportunityEvaluationStep(state, 117);
        const after = state.military.operation_opportunities!
            .find(p => p.opportunity_id === 'tigar_sloboda_94')!;
        expect(after.status).toBe('eligible_pending_review');
    });
});

// APWB — AMBER civilian-displacement vocabulary hygiene (collapsed two AMBER tests into one
// state-sweep: covers catalog text, axis prose under multiple state branches).
describe('entry-specific: apwb_pressure_94 AMBER prose hygiene', () => {
    const entry = ENTRIES.find(e => e.opportunity_id === 'apwb_pressure_94')!;

    it('AMBER: catalog text + axis evaluator prose contain NO civilian-displacement vocabulary across a state sweep', () => {
        // Catalog text scan — covers description / citations / axis names.
        const stateMid = buildState({ entry, turn: 115 });
        const axesMid = evaluateAxes(stateMid, 115, APWB_PRESSURE_94_OPPORTUNITY);
        const reasonText = axesMid.map(a => a.reason).join(' ');
        const citationText = APWB_PRESSURE_94_OPPORTUNITY.citations.join(' ');
        const nameText = APWB_PRESSURE_94_OPPORTUNITY.name;
        const axisNameText = APWB_PRESSURE_94_OPPORTUNITY.axes
            .map(a => `${a.axis_id} ${a.name}`).join(' ');
        const haystack = `${nameText} ${citationText} ${reasonText} ${axisNameText}`.toLowerCase();
        for (const word of RED_FLAG_WORDS) {
            expect(haystack.includes(word)).toBe(false);
        }
        // State-sweep — covers regression hedge against civilian-state predicates.
        const sweepStates = [
            buildState({ entry, turn: 113 }),
            buildState({ entry, turn: 130 }),
            buildState({ entry, turn: 115, pocketAnchorsHeldByRBiH: false }),
            buildState({ entry, turn: 115, addCommanderState: false }),
            buildState({ entry, turn: 115, rbihSupplyPressure: 96 }),
        ];
        for (const s of sweepStates) {
            const axes = evaluateAxes(s, s.meta.turn, APWB_PRESSURE_94_OPPORTUNITY);
            for (const a of axes) {
                const reason = a.reason.toLowerCase();
                for (const word of RED_FLAG_WORDS) {
                    expect(reason.includes(word)).toBe(false);
                }
            }
        }
    });
});

// Grmeč — cross-entry coexistence + enemy_weakness fail branch.
describe('entry-specific: grmec_94 cross-entry coexistence', () => {
    const entry = ENTRIES.find(e => e.opportunity_id === 'grmec_94')!;

    it('Grmeč/Sana windows do not overlap; Grmeč+Pauk both surface at w135 with no hardcoded chain', () => {
        const stateAtGrmecPeak = buildState({ entry, turn: 135 });
        const sanaEntry = ENTRIES.find(e => e.opportunity_id === 'sana_95')!;
        const stateAtSanaPeak = buildState({ entry: sanaEntry, turn: 183 });
        const grmecAtGrmec = evaluateAxes(stateAtGrmecPeak, 135, GRMEC_94_OPPORTUNITY)
            .find(a => a.axis === 'date_window')!;
        const sanaAtGrmec = evaluateAxes(stateAtGrmecPeak, 135, SANA_95_OPPORTUNITY)
            .find(a => a.axis === 'date_window')!;
        const grmecAtSana = evaluateAxes(stateAtSanaPeak, 183, GRMEC_94_OPPORTUNITY)
            .find(a => a.axis === 'date_window')!;
        const sanaAtSana = evaluateAxes(stateAtSanaPeak, 183, SANA_95_OPPORTUNITY)
            .find(a => a.axis === 'date_window')!;
        expect(grmecAtGrmec.green).toBe(true);
        expect(sanaAtGrmec.green).toBe(false);
        expect(grmecAtSana.green).toBe(false);
        expect(sanaAtSana.green).toBe(true);
        // Pauk window overlaps Grmeč at w135 — no hardcoded chain between the two.
        const paukAxes = evaluateAxes(stateAtGrmecPeak, 135, PAUK_94_95_OPPORTUNITY);
        const paukDate = paukAxes.find(a => a.axis === 'date_window')!;
        expect(paukDate.green).toBe(true);
        const allReasons = [...evaluateAxes(stateAtGrmecPeak, 135, GRMEC_94_OPPORTUNITY), ...paukAxes]
            .map(a => a.reason).join(' ').toLowerCase();
        expect(allReasons.includes('grmec_94')).toBe(false);
        expect(allReasons.includes('pauk_94_95')).toBe(false);
    });

    it('does NOT surface when all targets are already RBiH-controlled (enemy_weakness fail)', () => {
        const state = buildState({ entry, turn: 135 });
        for (const o of GRMEC_TARGETS) {
            (state.political as unknown as { political_controllers: Record<string, FactionId> })
                .political_controllers[o] = 'RBiH';
        }
        runOpportunityEvaluationStep(state, 135);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === 'grmec_94')).toBeUndefined();
    });
});

// LANE E sweep — proves logistics-red still surfaces via force_quality optional
// for T1 entries with min_optional_axes:1 (tigar, apwb, grmec).
describe('LANE E topology: T1 force_quality second optional', () => {
    const cases = [
        { id: 'tigar_sloboda_94', supplyPressure: 96 },
        { id: 'apwb_pressure_94', supplyPressure: 96 },
        { id: 'grmec_94',         supplyPressure: 91 },
    ];
    it('every T1 entry with min_optional_axes:1 surfaces under critical supply pressure if force_quality is green', () => {
        for (const c of cases) {
            const entry = ENTRIES.find(e => e.opportunity_id === c.id)!;
            const state = buildState({
                entry,
                turn: entry.midTurn,
                rbihSupplyPressure: c.supplyPressure,
            });
            runOpportunityEvaluationStep(state, entry.midTurn);
            const proposals = state.military.operation_opportunities ?? [];
            const proposal = proposals.find(p => p.opportunity_id === c.id);
            expect(proposal).toBeDefined();
            const logisticsAxis = proposal!.last_axis_evaluation.find(a => a.axis === 'logistics');
            const forceQualityAxis = proposal!.last_axis_evaluation.find(a => a.axis === 'force_quality');
            expect(logisticsAxis?.green).toBe(false);
            expect(forceQualityAxis?.green).toBe(true);
        }
    });
});

// ─── 6b. T3 entry-specific shapes (collapsed) ───────────────────────────────

// Storm-fired blocks the proposal — applies to all 3 T3 entries.
describe.each(T3_ENTRIES)('T3 Storm-fired pre-gate: $label', (entry) => {
    it('Storm-fired blocks the proposal (pre-Storm alliance_context gate)', () => {
        const state = buildState({
            entry,
            turn: entry.midTurn,
            operationStormTriggered: true,
        });
        runOpportunityEvaluationStep(state, entry.midTurn);
        const proposals = state.military.operation_opportunities ?? [];
        expect(proposals.find(p => p.opportunity_id === entry.opportunity_id)).toBeUndefined();
    });
});

// T3 catalog axis-shape sweep — covers the three T3 entries in one test.
describe('catalog axis-shape sweep (T3 entries)', () => {
    it('every T3 entry: alliance_context required, min_optional_axes:0, T3 brigade pool, objectives=[]', () => {
        const t3Defs = [UNA_94_OPPORTUNITY, BREZA_94_OPPORTUNITY, PAUK_94_95_OPPORTUNITY];
        for (const def of t3Defs) {
            expect(def.prerequisites.alliance_context).toBe('required');
            expect(def.prerequisites.min_optional_axes).toBe(0);
            const axis = def.axes[0];
            expect([...axis.brigades].sort()).toEqual([...T3_BRIGADES].sort());
            expect(axis.objectives).toEqual([]);
        }
    });
});

// Pauk-specific historian gate — "Pauk impossible after Oluja". This is the
// MOST important assertion of the three T3 entries. The shared T3 Storm-block
// above already covers Pauk's case structurally, but the predicate-level
// flip-on-Storm hedge is unique to Pauk and must be preserved verbatim.
describe('entry-specific: pauk_94_95 post-Oluja predicate hedge', () => {
    const entry = ENTRIES.find(e => e.opportunity_id === 'pauk_94_95')!;
    it('alliance_context predicate flips RED specifically on Storm; isOpportunityEligible inverts', () => {
        const stateBefore = buildState({ entry, turn: 140, operationStormTriggered: false });
        const stateAfter  = buildState({ entry, turn: 140, operationStormTriggered: true });
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

// Sana — Storm-required, follow-on entry, axis shape, expiry, citations.
// Collapses the original 13 individual sana tests into 4 grouped tests:
//   (a) catalog identity / staging / citations / historical_exit_class
//   (b) gates: no Storm / pocket-collapse / nothing-left
//   (c) axis shape: parent vs follow-on
//   (d) follow-on surfacing + expiry + main-window non-leak
describe('entry-specific: sana_95 family', () => {
    const entry = ENTRIES.find(e => e.opportunity_id === 'sana_95')!;

    it('catalog identity: exactly one Sana entry; retired follow-on absent (#284); staging + citations + historical_exit_class bound', () => {
        const sanaEntries = OPERATION_OPPORTUNITY_CATALOG.filter(
            d => d.opportunity_id === 'sana_95');
        expect(sanaEntries).toHaveLength(1);
        expect(sanaEntries[0]).toBe(SANA_95_OPPORTUNITY);
        // #284 (2026-06-08, owner-approved): the redundant `sana_95_follow_on`
        // duplicate of the interior Sanski Most + Ključ axis was retired. It must
        // no longer exist in either catalog surface.
        expect(FIFTH_CORPS_OPPORTUNITIES.some(d => d.opportunity_id === 'sana_95_follow_on')).toBe(false);
        expect(OPERATION_OPPORTUNITY_CATALOG.some(d => d.opportunity_id === 'sana_95_follow_on')).toBe(false);
        expect(SANA_95_OPPORTUNITY.faction).toBe('RBiH');
        expect(SANA_95_OPPORTUNITY.primary_corps).toBe('arbih_5th_corps');
        expect(SANA_95_OPPORTUNITY.staging_osid).toBe('op:bihac:bihac_2');
        const cites = SANA_95_OPPORTUNITY.citations.join('\n');
        expect(cites).toMatch(/BB1/);
        expect(cites).toMatch(/late-war-5th-corps-opportunities-design.md/);
        expect(SANA_95_OPPORTUNITY.historical_exit_class).toBe('partial_success');
    });

    it('gates: no Storm fired / pocket collapsed / all targets liberated → no proposal', () => {
        // No Storm.
        const stateNoStorm = buildState({ entry, turn: 180, operationStormTriggered: false });
        runOpportunityEvaluationStep(stateNoStorm, 180);
        expect((stateNoStorm.military.operation_opportunities ?? [])
            .find(p => p.opportunity_id === 'sana_95')).toBeUndefined();
        // Pocket collapsed.
        const statePocket = buildState({
            entry, turn: 180, operationStormTriggered: true,
            pocketAnchorsHeldByRBiH: false,
        });
        runOpportunityEvaluationStep(statePocket, 180);
        expect((statePocket.military.operation_opportunities ?? [])
            .find(p => p.opportunity_id === 'sana_95')).toBeUndefined();
        // Nothing left to liberate.
        const stateNothing = buildState({ entry, turn: 180, operationStormTriggered: true });
        for (const o of SANA_VRS_TARGETS) {
            (stateNothing.political as unknown as { political_controllers: Record<string, FactionId> })
                .political_controllers[o] = 'RBiH';
        }
        runOpportunityEvaluationStep(stateNothing, 180);
        expect((stateNothing.military.operation_opportunities ?? [])
            .find(p => p.opportunity_id === 'sana_95')).toBeUndefined();
    });

    it('requires VRS Krajina trajectory weakness when defender-corps evidence is available', () => {
        const healthyDefender = buildState({ entry, turn: 180, operationStormTriggered: true });
        addVrsKrajinaDefenderCorps(healthyDefender);
        runOpportunityEvaluationStep(healthyDefender, 180);
        expect((healthyDefender.military.operation_opportunities ?? [])
            .find(p => p.opportunity_id === 'sana_95')).toBeUndefined();

        const degradedDefender = buildState({ entry, turn: 180, operationStormTriggered: true });
        addVrsKrajinaDefenderCorps(degradedDefender, { degraded: true, equipmentMultiplier: 0.70 });
        runOpportunityEvaluationStep(degradedDefender, 180);
        const proposal = (degradedDefender.military.operation_opportunities ?? [])
            .find(p => p.opportunity_id === 'sana_95');
        expect(proposal).toBeDefined();
        expect(proposal!.last_axis_evaluation.find(a => a.axis === 'enemy_weakness')?.green)
            .toBe(true);
    });

    it('axis shape: parent has Krupa 3/7 + Bihac-Petrovac 5/10 + folded Sanski-Most/Kljuc 2/13 third axis', () => {
        const krupa = SANA_95_OPPORTUNITY.axes.find(a => a.axis_id === 'sana_krupa')!;
        expect(krupa.brigades).toHaveLength(3);
        expect(krupa.objectives).toHaveLength(7);
        expect(krupa.objectives).toContain('op:bosanski_petrovac:krnjeusa');
        const bp = SANA_95_OPPORTUNITY.axes.find(a => a.axis_id === 'sana_bihac_petrovac')!;
        expect(bp.brigades).toHaveLength(5);
        expect(bp.objectives).toHaveLength(10);
        // 2026-06-07 (lever (b) launch-timing fix): the Sanski Most + Ključ
        // interior is now folded into the INITIAL Sana op as a third axis so it
        // launches at w175 at full strength instead of being corridor-gated into
        // a late, recovery-phase follow-on. It commits the two 5th Corps brigades
        // NOT used by the Krupa/Bihać-Petrovac axes (506th + 517th) and stages at
        // the Krupa-axis tail jasenica_2. See operation_opportunity_catalog_5th_corps.ts.
        const skParent = SANA_95_OPPORTUNITY.axes.find(a => a.axis_id === 'sana_sanski_most_kljuc')!;
        expect(skParent).toBeDefined();
        expect(skParent.brigades).toEqual([
            'arbih_506th_mountain',
            'arbih_517th_light',
        ]);
        expect(skParent.objectives).toHaveLength(13);
        expect(skParent.staging_osid).toBe('op:bosanska_krupa:jasenica_2');
        // #284 (2026-06-08): the standalone `sana_95_follow_on` backstop was
        // retired — the third axis above is now the sole owner of the interior.
        // The retired duplicate must be absent from the catalog.
        expect(FIFTH_CORPS_OPPORTUNITIES.some(d => d.opportunity_id === 'sana_95_follow_on')).toBe(false);
    });

    it('retired follow-on (#284) NEVER surfaces — not on the happy path, not even with a live approach corridor; parent expires past autumn window', () => {
        // Happy-path main run — parent surfaces, retired follow-on does NOT.
        const state = buildState({ entry, turn: 180, operationStormTriggered: true });
        runOpportunityEvaluationStep(state, 180);
        expect((state.military.operation_opportunities ?? [])
            .find(p => p.opportunity_id === 'sana_95_follow_on')).toBeUndefined();
        // Parent expires.
        const parent = state.military.operation_opportunities!
            .find(p => p.opportunity_id === 'sana_95')!;
        runOpportunityEvaluationStep(state, parent.expires_turn + 1);
        const after = state.military.operation_opportunities!
            .find(p => p.opportunity_id === 'sana_95')!;
        expect(after.status).toBe('expired');
        // #284: even with the approach corridor controlled (the condition that
        // formerly surfaced the standalone follow-on), the retired duplicate must
        // never surface — it no longer exists in the catalog.
        const stateApproach = buildState({
            entry, turn: 180, operationStormTriggered: true,
            followOnApproachControlled: true,
        });
        runOpportunityEvaluationStep(stateApproach, 180);
        expect((stateApproach.military.operation_opportunities ?? [])
            .find(p => p.opportunity_id === 'sana_95_follow_on')).toBeUndefined();
    });
});

// ─── AAR fixture builder (shared) ───────────────────────────────────────────

interface FakeAarOpts {
    opName: string;
    startTurn: number;
    endedTurn: number;
    outcome: OperationAAR['outcome'];
    objectivesTargeted: ReadonlyArray<string>;
    objectivesCaptured: ReadonlyArray<string>;
    brigades: ReadonlyArray<string>;
    objCompletion: number;
}

function fakeAar(opts: FakeAarOpts): OperationAAR {
    return {
        operation_id: `arbih_5th_corps:${opts.opName}:t${opts.startTurn}`,
        operation_name: opts.opName,
        corps_id: 'arbih_5th_corps',
        faction: 'RBiH',
        type: 'sector_attack',
        started_turn: opts.startTurn,
        ended_turn: opts.endedTurn,
        outcome: opts.outcome,
        objectives_targeted: [...opts.objectivesTargeted],
        objectives_captured: [...opts.objectivesCaptured],
        duration_turns: opts.endedTurn - opts.startTurn,
        total_attacks: 6,
        casualties_suffered: { killed: 0, wounded: 0 },
        casualties_inflicted: { killed: 0, wounded: 0 },
        equipment_lost: { tanks: 0, artillery: 0 },
        equipment_destroyed: { tanks: 0, artillery: 0 },
        equipment_captured: { tanks: 0, artillery: 0 },
        participating_brigades: [...opts.brigades],
        initial_strength: 4500,
        final_strength: 4100,
        grade: {
            stars: opts.objCompletion >= 0.9 ? 4 : 3,
            verdict: opts.objCompletion >= 0.9 ? 'decisive' : 'partial',
            factors: {
                objective_completion: opts.objCompletion,
                exchange_ratio: 1,
                tempo: 1,
                preservation: 0.92,
            },
        },
        weekly_log: [],
    };
}
