/**
 * Phase E extension — military_credibility → bot op-launch caution-bias gate.
 *
 * Tests:
 *   1-5  Gate-module unit tests (env, override, combined, reset).
 *   6    Integration: briefing surfaces `political_dimensions.military_credibility`
 *        when both gates are ON and the negotiation substrate has a value.
 *   7    Byte-stability: with the gate OFF, briefing OMITS the field.
 *   8    Compositional: credibility sub-flag ON + other sub-flags OFF →
 *        briefing has political_dimensions with military_credibility ONLY.
 *   9    No-data low military_credibility is omitted from op-launch briefing.
 *   10-13 Multiplier byte-stable fast-paths (undefined, NaN, >= threshold) and
 *        0.85 for military_credibility < 40.
 *   14   Four-flag-OFF product sentinel = 1.0 exactly.
 *
 * Determinism: each test resets gate overrides via `resetPoliticalDimensionGates`
 * and snapshots/restores process.env entries.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    isMilitaryCredibilityCautionBiasActive,
    isMilitaryCredibilityCautionBiasEnabled,
    isCohesionCautionBiasActive,
    isIntlStandingOpsHesitationActive,
    isPatronConfidenceOpsHesitationActive,
    isPoliticalDimensionPropagationEnabled,
    resetPoliticalDimensionGates,
    setMilitaryCredibilityCautionBiasOverride,
    setPoliticalDimensionPropagationOverride,
} from '../src/sim/political/political_dimension_propagation_gate.js';
import {
    getMilitaryCredibilityCautionBiasMultiplier,
    getPatronConfidenceOpsHesitationMultiplier,
    getIntlStandingOpsHesitationMultiplier,
    getCohesionCautionBiasMultiplier,
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
// ---------------------------------------------------------------------------

function snapshotPdpEnv(): {
    propagation: string | undefined;
    credibility: string | undefined;
} {
    return {
        propagation: process.env.AWWV_POLITICAL_DIMENSION_PROPAGATION,
        credibility: process.env.AWWV_PDP_MILITARY_CREDIBILITY_CAUTION_BIAS,
    };
}

function restorePdpEnv(snap: ReturnType<typeof snapshotPdpEnv>): void {
    if (snap.propagation === undefined) {
        delete process.env.AWWV_POLITICAL_DIMENSION_PROPAGATION;
    } else {
        process.env.AWWV_POLITICAL_DIMENSION_PROPAGATION = snap.propagation;
    }
    if (snap.credibility === undefined) {
        delete process.env.AWWV_PDP_MILITARY_CREDIBILITY_CAUTION_BIAS;
    } else {
        process.env.AWWV_PDP_MILITARY_CREDIBILITY_CAUTION_BIAS = snap.credibility;
    }
}

function clearPdpEnv(): void {
    delete process.env.AWWV_POLITICAL_DIMENSION_PROPAGATION;
    delete process.env.AWWV_PDP_MILITARY_CREDIBILITY_CAUTION_BIAS;
}

// ---------------------------------------------------------------------------
// Minimal state fixture for integration / byte-stability tests.
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
    militaryCredibility: number | undefined,
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
    if (militaryCredibility !== undefined) {
        military.negotiation = {
            capital: {
                [faction]: {
                    operations_launched: 1,
                    operations_successful: 0,
                    military_casualties_inflicted: 0,
                    military_casualties_taken: 100,
                },
            },
            strategic_dimensions: {
                [faction]: {
                    military_credibility: {
                        base_value: militaryCredibility,
                        event_modifier: 0,
                        effective_value: militaryCredibility,
                    },
                },
            },
        };
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Phase E extension — military_credibility → bot caution-bias gate', () => {
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

    // Test 1: Default ON when env unset and no overrides (PR-4 activation).
    // The umbrella + military_credibility sub-flag now default ON so headless
    // calibration picks up the cleared channel without env vars.
    it('test 1: defaults to ON when env unset and no overrides (PR-4)', () => {
        expect(isPoliticalDimensionPropagationEnabled()).toBe(true);
        expect(isMilitaryCredibilityCautionBiasEnabled()).toBe(true);
        expect(isMilitaryCredibilityCautionBiasActive()).toBe(true);
    });

    // Test 1b: explicit env 'false' forces the credibility channel back OFF.
    it('test 1b: env false forces credibility channel OFF', () => {
        process.env.AWWV_PDP_MILITARY_CREDIBILITY_CAUTION_BIAS = 'false';
        expect(isMilitaryCredibilityCautionBiasEnabled()).toBe(false);
        expect(isMilitaryCredibilityCautionBiasActive()).toBe(false);
        delete process.env.AWWV_PDP_MILITARY_CREDIBILITY_CAUTION_BIAS;
        process.env.AWWV_POLITICAL_DIMENSION_PROPAGATION = 'false';
        expect(isPoliticalDimensionPropagationEnabled()).toBe(false);
        expect(isMilitaryCredibilityCautionBiasActive()).toBe(false);
    });

    // Test 2: Sub-flag override true + global false → combined false.
    it('test 2: combined credibility gate requires BOTH tiers ON', () => {
        setPoliticalDimensionPropagationOverride(false);
        setMilitaryCredibilityCautionBiasOverride(true);
        expect(isPoliticalDimensionPropagationEnabled()).toBe(false);
        expect(isMilitaryCredibilityCautionBiasEnabled()).toBe(true);
        expect(isMilitaryCredibilityCautionBiasActive()).toBe(false);
    });

    // Test 3: Both overrides true → combined true.
    it('test 3: combined credibility gate ON when both tiers ON', () => {
        setPoliticalDimensionPropagationOverride(true);
        setMilitaryCredibilityCautionBiasOverride(true);
        expect(isMilitaryCredibilityCautionBiasActive()).toBe(true);
    });

    // Test 4: Env vars route through without overrides.
    it('test 4: env vars enable credibility gate without overrides', () => {
        process.env.AWWV_POLITICAL_DIMENSION_PROPAGATION = 'true';
        process.env.AWWV_PDP_MILITARY_CREDIBILITY_CAUTION_BIAS = 'true';
        expect(isPoliticalDimensionPropagationEnabled()).toBe(true);
        expect(isMilitaryCredibilityCautionBiasEnabled()).toBe(true);
        expect(isMilitaryCredibilityCautionBiasActive()).toBe(true);
    });

    // Test 5: Reset clears the credibility override → env-fallback. As of PR-4
    // the credibility channel defaults ON, so after reset the env-fallback
    // reports ON (env-driven OFF is tested in test 1b). The point is that the
    // override is dropped, returning to the env-default.
    it('test 5: resetPoliticalDimensionGates clears credibility override', () => {
        setPoliticalDimensionPropagationOverride(false);
        setMilitaryCredibilityCautionBiasOverride(false);
        expect(isMilitaryCredibilityCautionBiasActive()).toBe(false);
        resetPoliticalDimensionGates();
        // Override dropped → env-fallback default ON.
        expect(isMilitaryCredibilityCautionBiasEnabled()).toBe(true);
        expect(isMilitaryCredibilityCautionBiasActive()).toBe(true);
    });

    // Test 6: Integration — briefing carries military_credibility when gate ON.
    it('test 6: briefing surfaces political_dimensions.military_credibility when gate ON', () => {
        setPoliticalDimensionPropagationOverride(true);
        setMilitaryCredibilityCautionBiasOverride(true);

        const corpsId = 'test_corps' as FormationId;
        const faction = 'RBiH' as FactionId;
        const state = buildMinimalState(corpsId, faction, 25);

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
        expect(briefing.political_dimensions?.military_credibility).toBe(25);
        expect(briefing.political_dimensions?.international_standing).toBeUndefined();
        expect(briefing.political_dimensions?.internal_cohesion).toBeUndefined();
        expect(briefing.political_dimensions?.patron_confidence).toBeUndefined();
    });

    // Test 7: Byte-stability — briefing OMITS political_dimensions when gate OFF.
    // PR-4 made the umbrella + patron + credibility channels default ON, so this
    // test forces the umbrella OFF via override to exercise the no-op path
    // (which dominates every sub-flag).
    it('test 7: briefing OMITS political_dimensions when credibility gate OFF', () => {
        setPoliticalDimensionPropagationOverride(false);
        const corpsId = 'test_corps' as FormationId;
        const faction = 'RBiH' as FactionId;
        const state = buildMinimalState(corpsId, faction, 25);

        // Sanity-check all gates are OFF.
        expect(isMilitaryCredibilityCautionBiasActive()).toBe(false);
        expect(isIntlStandingOpsHesitationActive()).toBe(false);
        expect(isCohesionCautionBiasActive()).toBe(false);
        expect(isPatronConfidenceOpsHesitationActive()).toBe(false);

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

        // Field must be entirely absent (not present-with-undefined).
        expect('political_dimensions' in briefing).toBe(false);
    });

    // Test 8: Compositional — credibility sub-flag ON, others OFF.
    it('test 8: credibility-only composition surfaces military_credibility alone', () => {
        setPoliticalDimensionPropagationOverride(true);
        setMilitaryCredibilityCautionBiasOverride(true);

        const corpsId = 'test_corps' as FormationId;
        const faction = 'RS' as FactionId;
        const state = buildMinimalState(corpsId, faction, 30);

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
        expect(briefing.political_dimensions?.military_credibility).toBe(30);
        expect(briefing.political_dimensions?.international_standing).toBeUndefined();
        expect(briefing.political_dimensions?.internal_cohesion).toBeUndefined();
        expect(briefing.political_dimensions?.patron_confidence).toBeUndefined();
    });

    it('test 9: no ops or casualty evidence omits no-data military_credibility from op-launch briefing', () => {
        setPoliticalDimensionPropagationOverride(true);
        setMilitaryCredibilityCautionBiasOverride(true);

        const corpsId = 'test_corps' as FormationId;
        const faction = 'RS' as FactionId;
        const state = buildMinimalState(corpsId, faction, 25);
        state.military.negotiation = {
            ...state.military.negotiation,
            capital: {
                [faction]: {
                    operations_launched: 0,
                    operations_successful: 0,
                    military_casualties_inflicted: 0,
                    military_casualties_taken: 0,
                },
            },
        } as any;

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

        expect(briefing.political_dimensions?.military_credibility).toBeUndefined();
    });

    // ----- Multiplier byte-stable fast-paths -----

    it('multiplier returns 1.0 for undefined input (byte-stable fast-path)', () => {
        expect(getMilitaryCredibilityCautionBiasMultiplier(undefined)).toBe(1.0);
    });

    it('multiplier returns 1.0 for non-numeric/NaN input (defensive)', () => {
        expect(getMilitaryCredibilityCautionBiasMultiplier(NaN as unknown as number)).toBe(1.0);
    });

    it('multiplier returns 1.0 when military_credibility >= 40 (no caution bias)', () => {
        expect(getMilitaryCredibilityCautionBiasMultiplier(40)).toBe(1.0);
        expect(getMilitaryCredibilityCautionBiasMultiplier(50)).toBe(1.0);
        expect(getMilitaryCredibilityCautionBiasMultiplier(100)).toBe(1.0);
    });

    it('multiplier returns 0.85 when military_credibility < 40 (caution bias active)', () => {
        expect(getMilitaryCredibilityCautionBiasMultiplier(39)).toBe(0.85);
        expect(getMilitaryCredibilityCautionBiasMultiplier(20)).toBe(0.85);
        expect(getMilitaryCredibilityCautionBiasMultiplier(0)).toBe(0.85);
    });

    // Test 13: Four-flag-OFF product sentinel — all four PDP multipliers receive
    // undefined → product is exactly 1.0, protecting the !== 1.0 byte-stable
    // fast-path in emit.ts buildOperations (the combined consumption site).
    it('test 13: four-multiplier product remains 1.0 exactly when all flags OFF', () => {
        const product = getIntlStandingOpsHesitationMultiplier(undefined)
            * getCohesionCautionBiasMultiplier(undefined)
            * getPatronConfidenceOpsHesitationMultiplier(undefined)
            * getMilitaryCredibilityCautionBiasMultiplier(undefined);
        expect(product).toBe(1.0);
    });
});
