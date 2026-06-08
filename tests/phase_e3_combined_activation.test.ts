/**
 * Phase E Packet 3 — Combined-flag-ON activation test matrix.
 *
 * Validates that the Phase E MVS (Packet 1 — `international_standing → ops
 * hesitation`) and the Phase E2 (Packet 2 — `internal_cohesion → bot caution
 * bias`) work together correctly when BOTH sub-flags are activated
 * simultaneously, and that the combined-flag-OFF and partial-activation paths
 * remain byte-stable.
 *
 * E1 and E2 each have their own per-sub-flag suites
 * (`political_dimension_propagation_gate.test.ts`,
 * `phase_e2_cohesion_caution_bias.test.ts`). What this suite covers is the
 * compositional surface those two suites do NOT exercise:
 *
 *   A. Pure multiplier-product math (helper composition).
 *      `getIntlStandingOpsHesitationMultiplier × getCohesionCautionBiasMultiplier`
 *      across the threshold-crossing matrix, including the off-by-one boundary
 *      cells (29/30, 39/40) and the both-helpers-1.0 byte-stable sentinel.
 *
 *   B. Briefing integration (combined flags ON).
 *      Verifies `buildBriefing` surfaces BOTH `international_standing` AND
 *      `internal_cohesion` simultaneously when both sub-flags are ON, surfaces
 *      only the one that's ON in partial-activation cases, and OMITS
 *      `political_dimensions` entirely when the global tier-1 switch is OFF
 *      (even with both sub-flags ON — the global gate must dominate).
 *
 *   C. Consumer-formula replication.
 *      Reproduces the EXACT formula that lives at the
 *      `commander/emit.ts buildOperations` consumer site:
 *        combinedMult = hesitationMult * cohesionMult
 *        effectiveMinForOp = combinedMult !== 1.0
 *          ? Math.ceil(baseMinForOp / combinedMult)
 *          : baseMinForOp
 *      and validates the resulting `effectiveMinForOp` against the documented
 *      worked-example values. `buildOperations` is not exported, so this suite
 *      tests the formula at the same shape it appears in production; any
 *      future drift between the production site and these tests is a signal
 *      that the consumer was refactored and the test needs follow-up.
 *
 * Determinism: each test resets gate overrides via
 * `resetPoliticalDimensionGates` and snapshots/restores `process.env`. No
 * Math.random, no Date.now, no real env-var manipulation (overrides only —
 * env-var tests already live in the per-sub-flag suites).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    isCohesionCautionBiasActive,
    isIntlStandingOpsHesitationActive,
    resetPoliticalDimensionGates,
    setCohesionCautionBiasOverride,
    setIntlStandingOpsHesitationOverride,
    setPoliticalDimensionPropagationOverride,
} from '../src/sim/political/political_dimension_propagation_gate.js';
import {
    getCohesionCautionBiasMultiplier,
    getIntlStandingOpsHesitationMultiplier,
} from '../src/sim/combat/sector_offensive.js';
import { buildBriefing } from '../src/sim/combat/commander/briefing.js';

import type {
    CorpsFrontSector,
    FactionId,
    FormationId,
    GameState,
} from '../src/state/game_state.js';

// ---------------------------------------------------------------------------
// Env snapshot helper — keeps tests isolated from ambient AWWV_* env values.
// Mirrors the snapshot helpers in the per-sub-flag suites, extended for all
// three Phase E env vars.
// ---------------------------------------------------------------------------

function snapshotPdpEnv(): {
    propagation: string | undefined;
    intlStanding: string | undefined;
    cohesion: string | undefined;
} {
    return {
        propagation: process.env.AWWV_POLITICAL_DIMENSION_PROPAGATION,
        intlStanding: process.env.AWWV_PDP_INTL_STANDING_OPS_HESITATION,
        cohesion: process.env.AWWV_PDP_COHESION_CAUTION_BIAS,
    };
}

function restorePdpEnv(snap: ReturnType<typeof snapshotPdpEnv>): void {
    if (snap.propagation === undefined) {
        delete process.env.AWWV_POLITICAL_DIMENSION_PROPAGATION;
    } else {
        process.env.AWWV_POLITICAL_DIMENSION_PROPAGATION = snap.propagation;
    }
    if (snap.intlStanding === undefined) {
        delete process.env.AWWV_PDP_INTL_STANDING_OPS_HESITATION;
    } else {
        process.env.AWWV_PDP_INTL_STANDING_OPS_HESITATION = snap.intlStanding;
    }
    if (snap.cohesion === undefined) {
        delete process.env.AWWV_PDP_COHESION_CAUTION_BIAS;
    } else {
        process.env.AWWV_PDP_COHESION_CAUTION_BIAS = snap.cohesion;
    }
}

function clearPdpEnv(): void {
    delete process.env.AWWV_POLITICAL_DIMENSION_PROPAGATION;
    delete process.env.AWWV_PDP_INTL_STANDING_OPS_HESITATION;
    delete process.env.AWWV_PDP_COHESION_CAUTION_BIAS;
}

// ---------------------------------------------------------------------------
// Minimal state fixture — mirrors the per-sub-flag suites' fixture shape so
// behavior comparisons across suites stay 1:1.
// ---------------------------------------------------------------------------

function buildMinimalSector(
    corpsId: FormationId,
    faction: FactionId,
): CorpsFrontSector {
    return {
        sector_id: 'sector:test',
        corps_id: corpsId,
        faction,
        opposing_factions: ['RS' as FactionId],
        edge_ids: ['e1'],
        sub_segments: [{
            id: 'ss1',
            friendly_osids: ['op:test:t1'],
            enemy_osids: ['op:enemy:e1'],
            length_edges: 1,
        }],
        length_edges: 1,
        territory_osids: ['op:test:t1'],
        assigned_brigade_ids: [],
        reserve_brigade_ids: [],
        stance: 'defend',
        sector_stance: 'defend',
        local_priority: 0,
        vulnerability: 0,
        opportunity_score: 0,
    } as unknown as CorpsFrontSector;
}

function buildMinimalState(
    corpsId: FormationId,
    faction: FactionId,
    intlStanding: number | undefined,
    cohesion: number | undefined,
): GameState {
    const sector = buildMinimalSector(corpsId, faction);
    const military: any = {
        formations: {},
        corps_front_sectors: { [sector.sector_id]: sector },
        corps_command: { [corpsId]: { stance: 'balanced', active_operations: [] } },
        must_hold_osids_by_corps: {},
        sector_intel: {},
        opsec_sectors: [],
    };
    if (intlStanding !== undefined || cohesion !== undefined) {
        const dims: any = {};
        if (intlStanding !== undefined) {
            dims.international_standing = {
                base_value: intlStanding,
                event_modifier: 0,
                effective_value: intlStanding,
            };
        }
        if (cohesion !== undefined) {
            dims.internal_cohesion = {
                base_value: cohesion,
                event_modifier: 0,
                effective_value: cohesion,
            };
        }
        military.negotiation = { strategic_dimensions: { [faction]: dims } };
    }
    return {
        meta: { turn: 10 },
        military,
    } as unknown as GameState;
}

function buildSpatial(faction: FactionId): any {
    return {
        adjacency: new Map<string, string[]>([
            ['op:test:t1', ['op:enemy:e1']],
            ['op:enemy:e1', ['op:test:t1']],
        ]),
        friendlyOsidsByFaction: new Map([[faction, new Set(['op:test:t1'])]]),
    };
}

/**
 * Replicates the EXACT formula at
 * `src/sim/combat/commander/emit.ts buildOperations` (line ~870):
 *
 *   const combinedMult = hesitationMult * cohesionMult;
 *   const effectiveMinForOp = combinedMult !== 1.0
 *     ? Math.ceil(baseMinForOp / combinedMult)
 *     : baseMinForOp;
 *
 * `buildOperations` is not exported, so this helper recomputes the same
 * expression. If the production site refactors, this helper must follow.
 */
function computeEffectiveMinForOp(
    baseMinForOp: number,
    intlStanding: number | undefined,
    cohesion: number | undefined,
    currentTurn = 120, // default ≥ intl_standing turn-gate so the dimension is live in this matrix
): number {
    const hesitationMult = getIntlStandingOpsHesitationMultiplier(intlStanding, currentTurn);
    const cohesionMult = getCohesionCautionBiasMultiplier(cohesion);
    const combinedMult = hesitationMult * cohesionMult;
    return combinedMult !== 1.0
        ? Math.ceil(baseMinForOp / combinedMult)
        : baseMinForOp;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Phase E Packet 3 — combined-flag-ON activation matrix', () => {
    let envSnap: ReturnType<typeof snapshotPdpEnv>;

    beforeEach(() => {
        envSnap = snapshotPdpEnv();
        clearPdpEnv();
        resetPoliticalDimensionGates();
    });

    afterEach(() => {
        resetPoliticalDimensionGates();
        restorePdpEnv(envSnap);
    });

    // -----------------------------------------------------------------------
    // Section A — Multiplier-product math (pure helper composition).
    // -----------------------------------------------------------------------

    describe('A. multiplier-product math', () => {
        // NOTE (activation guards 2026-06-08): intl_standing is now turn-gated
        // (engages only at turn >= 100), so all intl_standing calls below pass an
        // explicit live turn (120). Cohesion threshold was recalibrated 40 → 15,
        // so penalty-zone cohesion fixtures use values < 15 (e.g. 10) and
        // above-threshold fixtures use >= 15.
        const LIVE_TURN = 120;

        // A1: Byte-stability sentinel — both helpers idle → product is exactly 1.0.
        it('A1: both dimensions absent → product is exactly 1.0 (byte-stable sentinel)', () => {
            const product = getIntlStandingOpsHesitationMultiplier(undefined, LIVE_TURN)
                * getCohesionCautionBiasMultiplier(undefined);
            expect(product).toBe(1.0);
        });

        // A2: Both penalties active — the canonical worked example.
        it('A2: intl_standing=20 + cohesion=10 (turn live) → product is exactly 0.7 × 0.85 = 0.595', () => {
            const product = getIntlStandingOpsHesitationMultiplier(20, LIVE_TURN)
                * getCohesionCautionBiasMultiplier(10);
            // Floating-point exact value — both 0.7 and 0.85 are constants and
            // their product is representable. expect(...).toBe enforces strict
            // equality (no toBeCloseTo tolerance).
            expect(product).toBe(0.7 * 0.85);
            expect(product).toBe(0.595);
        });

        // A3: Only intl_standing in penalty zone, cohesion above threshold.
        it('A3: intl_standing=20 + cohesion=50 (turn live) → product is 0.7 (cohesion no-op)', () => {
            const product = getIntlStandingOpsHesitationMultiplier(20, LIVE_TURN)
                * getCohesionCautionBiasMultiplier(50);
            expect(product).toBe(0.7);
        });

        // A4: Only cohesion in penalty zone, intl_standing above threshold.
        it('A4: intl_standing=50 + cohesion=10 (turn live) → product is 0.85 (intl_standing no-op)', () => {
            const product = getIntlStandingOpsHesitationMultiplier(50, LIVE_TURN)
                * getCohesionCautionBiasMultiplier(10);
            expect(product).toBe(0.85);
        });

        // A5: Both above thresholds — full baseline preservation.
        it('A5: intl_standing=50 + cohesion=50 (turn live) → product is exactly 1.0 (baseline preserved)', () => {
            const product = getIntlStandingOpsHesitationMultiplier(50, LIVE_TURN)
                * getCohesionCautionBiasMultiplier(50);
            expect(product).toBe(1.0);
        });

        // A6: Inside-band off-by-one cell — values one unit below each threshold.
        it('A6: boundary intl_standing=29 + cohesion=14 (turn live) → both penalties apply', () => {
            const hesitation = getIntlStandingOpsHesitationMultiplier(29, LIVE_TURN);
            const caution = getCohesionCautionBiasMultiplier(14);
            expect(hesitation).toBe(0.7);
            expect(caution).toBe(0.85);
            expect(hesitation * caution).toBe(0.595);
        });

        // A7: At-threshold off-by-one cell — thresholds are STRICT-LESS-THAN.
        // intl_standing < 30 fires; intl_standing === 30 does NOT.
        // cohesion < 15 fires; cohesion === 15 does NOT (recalibrated).
        it('A7: boundary intl_standing=30 + cohesion=15 (turn live) → NEITHER penalty applies (off-by-one safety)', () => {
            const hesitation = getIntlStandingOpsHesitationMultiplier(30, LIVE_TURN);
            const caution = getCohesionCautionBiasMultiplier(15);
            expect(hesitation).toBe(1.0);
            expect(caution).toBe(1.0);
            expect(hesitation * caution).toBe(1.0);
        });

        // A8: ACTIVATION GUARD — intl_standing turn-gate. Below turn 100 the
        // intl_standing channel is inert even with intl_standing < 30, so the only
        // live penalty is cohesion (when < 15).
        it('A8: turn-gate — intl_standing=20 + cohesion=10 BEFORE turn 100 → only cohesion fires (0.85)', () => {
            const product = getIntlStandingOpsHesitationMultiplier(20, 40)
                * getCohesionCautionBiasMultiplier(10);
            expect(product).toBe(0.85);
        });
    });

    // -----------------------------------------------------------------------
    // Section B — Briefing integration (combined flags ON).
    // -----------------------------------------------------------------------

    describe('B. briefing integration', () => {
        // B1: Both sub-flags ON + both dimension values populated → briefing
        // surfaces BOTH fields simultaneously.
        it('B1: all flags ON + intl_standing=20 + cohesion=30 → briefing has BOTH fields', () => {
            setPoliticalDimensionPropagationOverride(true);
            setIntlStandingOpsHesitationOverride(true);
            setCohesionCautionBiasOverride(true);
            // Sanity-check both combined predicates report active.
            expect(isIntlStandingOpsHesitationActive()).toBe(true);
            expect(isCohesionCautionBiasActive()).toBe(true);

            const corpsId = 'test_corps' as FormationId;
            const faction = 'RBiH' as FactionId;
            const state = buildMinimalState(corpsId, faction, 20, 30);

            const briefing = buildBriefing(
                state,
                corpsId,
                faction,
                buildSpatial(faction),
                [],
                null,
                null,
                null,
                null,
            );

            expect(briefing.political_dimensions).toBeDefined();
            expect(briefing.political_dimensions?.international_standing).toBe(20);
            expect(briefing.political_dimensions?.internal_cohesion).toBe(30);
        });

        // B2: Only intl_standing sub-flag ON → cohesion field absent even though
        // the state fixture provides a value.
        it('B2: only intl_standing sub-flag ON → briefing has international_standing only', () => {
            setPoliticalDimensionPropagationOverride(true);
            setIntlStandingOpsHesitationOverride(true);
            setCohesionCautionBiasOverride(false);

            const corpsId = 'test_corps' as FormationId;
            const faction = 'RBiH' as FactionId;
            const state = buildMinimalState(corpsId, faction, 20, 30);

            const briefing = buildBriefing(
                state,
                corpsId,
                faction,
                buildSpatial(faction),
                [],
                null,
                null,
                null,
                null,
            );

            expect(briefing.political_dimensions).toBeDefined();
            expect(briefing.political_dimensions?.international_standing).toBe(20);
            expect(briefing.political_dimensions?.internal_cohesion).toBeUndefined();
        });

        // B3: Only cohesion sub-flag ON → intl_standing field absent even though
        // the state fixture provides a value.
        it('B3: only cohesion sub-flag ON → briefing has internal_cohesion only', () => {
            setPoliticalDimensionPropagationOverride(true);
            setIntlStandingOpsHesitationOverride(false);
            setCohesionCautionBiasOverride(true);

            const corpsId = 'test_corps' as FormationId;
            const faction = 'RBiH' as FactionId;
            const state = buildMinimalState(corpsId, faction, 20, 30);

            const briefing = buildBriefing(
                state,
                corpsId,
                faction,
                buildSpatial(faction),
                [],
                null,
                null,
                null,
                null,
            );

            expect(briefing.political_dimensions).toBeDefined();
            expect(briefing.political_dimensions?.international_standing).toBeUndefined();
            expect(briefing.political_dimensions?.internal_cohesion).toBe(30);
        });

        // B4: Global tier-1 switch OFF + both sub-flags ON → political_dimensions
        // is OMITTED entirely. Global gate dominates.
        it('B4: global gate OFF + both sub-flags ON → briefing OMITS political_dimensions', () => {
            setPoliticalDimensionPropagationOverride(false);
            setIntlStandingOpsHesitationOverride(true);
            setCohesionCautionBiasOverride(true);
            // Sanity-check both combined predicates are FALSE because the
            // global tier dominates.
            expect(isIntlStandingOpsHesitationActive()).toBe(false);
            expect(isCohesionCautionBiasActive()).toBe(false);

            const corpsId = 'test_corps' as FormationId;
            const faction = 'RBiH' as FactionId;
            const state = buildMinimalState(corpsId, faction, 20, 30);

            const briefing = buildBriefing(
                state,
                corpsId,
                faction,
                buildSpatial(faction),
                [],
                null,
                null,
                null,
                null,
            );

            expect('political_dimensions' in briefing).toBe(false);
        });
    });

    // -----------------------------------------------------------------------
    // Section C — Consumer-formula replication.
    //
    // `buildOperations` is not exported; these tests reproduce the exact
    // expression at `commander/emit.ts:869-872`:
    //   combinedMult = hesitationMult * cohesionMult
    //   effectiveMinForOp = combinedMult !== 1.0
    //     ? Math.ceil(baseMinForOp / combinedMult)
    //     : baseMinForOp
    //
    // Any drift between the production site and `computeEffectiveMinForOp`
    // here is a signal that the consumer was refactored — these tests must
    // then be kept in sync.
    // -----------------------------------------------------------------------

    describe('C. consumer-formula replication (effectiveMinForOp)', () => {
        // C1: All flags ON + both dimensions in penalty zones.
        //   combinedMult = 0.7 × 0.85 = 0.595
        //   effectiveMinForOp = Math.ceil(10 / 0.595) = Math.ceil(16.806...) = 17
        it('C1: all flags ON + intl_standing=20 + cohesion=10 + base=10 → effective=17', () => {
            const effective = computeEffectiveMinForOp(10, 20, 10);
            expect(effective).toBe(17);
            // Reconfirm the worked-example arithmetic in isolation, so a
            // future floating-point quirk would be diagnosed at the right
            // step.
            expect(Math.ceil(10 / 0.595)).toBe(17);
        });

        // C2: Byte-stable baseline — both dimensions absent (gate-off
        // equivalent). The `!== 1.0` fast-path must short-circuit.
        it('C2: all flags OFF-equivalent (undefined inputs) + base=10 → effective=10 (byte-stable)', () => {
            const effective = computeEffectiveMinForOp(10, undefined, undefined);
            expect(effective).toBe(10);
        });

        // C3: Partial activation — only intl_standing in penalty zone.
        // Equivalent to running with the intl_standing sub-flag ON and the
        // cohesion sub-flag OFF (briefing.internal_cohesion would be
        // undefined → helper returns 1.0).
        //   combinedMult = 0.7 × 1.0 = 0.7
        //   effectiveMinForOp = Math.ceil(10 / 0.7) = Math.ceil(14.285...) = 15
        it('C3: intl_standing=20 + cohesion undefined + base=10 → effective=15', () => {
            const effective = computeEffectiveMinForOp(10, 20, undefined);
            expect(effective).toBe(15);
            expect(Math.ceil(10 / 0.7)).toBe(15);
        });

        // C4: Partial activation — only cohesion in penalty zone.
        //   combinedMult = 1.0 × 0.85 = 0.85
        //   effectiveMinForOp = Math.ceil(10 / 0.85) = Math.ceil(11.764...) = 12
        it('C4: intl_standing undefined + cohesion=10 + base=10 → effective=12', () => {
            const effective = computeEffectiveMinForOp(10, undefined, 10);
            expect(effective).toBe(12);
            expect(Math.ceil(10 / 0.85)).toBe(12);
        });

        // C5: Both flags ON but BOTH dimensions above thresholds → both
        // helpers return 1.0 → combinedMult === 1.0 → fast-path → effective
        // === base (byte-stable even when flags are flipped).
        it('C5: all flags ON + intl_standing=50 + cohesion=50 + base=10 → effective=10 (fast-path)', () => {
            const effective = computeEffectiveMinForOp(10, 50, 50);
            expect(effective).toBe(10);
        });

        // C6: Sanity for a different baseMinForOp value (the anchored-sector
        // case in emit.ts uses baseMinForOp = 2).
        //   combinedMult = 0.595
        //   effectiveMinForOp = Math.ceil(2 / 0.595) = Math.ceil(3.361...) = 4
        it('C6: all flags ON + intl_standing=20 + cohesion=10 + base=2 → effective=4', () => {
            const effective = computeEffectiveMinForOp(2, 20, 10);
            expect(effective).toBe(4);
        });
    });
});
