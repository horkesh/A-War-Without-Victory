/**
 * Phase E Packet 2 — internal_cohesion → bot op-launch caution-bias gate.
 *
 * Tests:
 *   1-5  Gate-module unit tests (env, override, combined, reset).
 *   6    Integration: briefing surfaces `political_dimensions.internal_cohesion`
 *        when both gates are ON and the negotiation substrate has a value.
 *   7    Byte-stability: with the gate OFF, briefing OMITS the field.
 *   8    Compositional: cohesion sub-flag ON + intl_standing sub-flag OFF →
 *        briefing has political_dimensions with internal_cohesion ONLY.
 *   9-11 Multiplier byte-stable fast-paths (undefined, NaN, >= threshold).
 *   12-13 Multiplier returns 0.85 for cohesion < 40.
 *
 * Determinism: each test resets gate overrides via `resetPoliticalDimensionGates`
 * and snapshots/restores process.env entries.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    isCohesionCautionBiasActive,
    isCohesionCautionBiasEnabled,
    isIntlStandingOpsHesitationActive,
    isPoliticalDimensionPropagationEnabled,
    resetPoliticalDimensionGates,
    setCohesionCautionBiasOverride,
    setIntlStandingOpsHesitationOverride,
    setPoliticalDimensionPropagationOverride,
} from '../src/sim/political/political_dimension_propagation_gate.js';
import { getCohesionCautionBiasMultiplier } from '../src/sim/combat/sector_offensive.js';
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
    cohesion: number | undefined,
    intlStanding: number | undefined = undefined,
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
    if (cohesion !== undefined || intlStanding !== undefined) {
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Phase E Packet 2 — internal_cohesion → bot caution-bias gate', () => {
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

    // Test 1: Default (no env, no override). As of PR-4 the umbrella defaults
    // ON, but the cohesion sub-flag remains default-OFF (held back: needs
    // threshold recal), so the cohesion combined gate stays inactive.
    it('test 1: umbrella defaults ON but cohesion sub-flag stays OFF', () => {
        expect(isPoliticalDimensionPropagationEnabled()).toBe(true);
        expect(isCohesionCautionBiasEnabled()).toBe(false);
        expect(isCohesionCautionBiasActive()).toBe(false);
    });

    // Test 2: Sub-flag override true + global false → combined false.
    it('test 2: combined cohesion gate requires BOTH tiers ON', () => {
        setPoliticalDimensionPropagationOverride(false);
        setCohesionCautionBiasOverride(true);
        expect(isPoliticalDimensionPropagationEnabled()).toBe(false);
        expect(isCohesionCautionBiasEnabled()).toBe(true);
        expect(isCohesionCautionBiasActive()).toBe(false);
    });

    // Test 3: Both overrides true → combined true.
    it('test 3: combined cohesion gate ON when both tiers ON', () => {
        setPoliticalDimensionPropagationOverride(true);
        setCohesionCautionBiasOverride(true);
        expect(isCohesionCautionBiasActive()).toBe(true);
    });

    // Test 4: Env vars route through without overrides.
    it('test 4: env vars enable cohesion gate without overrides', () => {
        process.env.AWWV_POLITICAL_DIMENSION_PROPAGATION = 'true';
        process.env.AWWV_PDP_COHESION_CAUTION_BIAS = 'true';
        expect(isPoliticalDimensionPropagationEnabled()).toBe(true);
        expect(isCohesionCautionBiasEnabled()).toBe(true);
        expect(isCohesionCautionBiasActive()).toBe(true);
    });

    // Test 5: Reset clears the cohesion override.
    it('test 5: resetPoliticalDimensionGates clears cohesion override', () => {
        setPoliticalDimensionPropagationOverride(true);
        setCohesionCautionBiasOverride(true);
        expect(isCohesionCautionBiasActive()).toBe(true);
        resetPoliticalDimensionGates();
        expect(isCohesionCautionBiasEnabled()).toBe(false);
        expect(isCohesionCautionBiasActive()).toBe(false);
    });

    // Test 6: Integration — briefing carries cohesion when gate ON.
    it('test 6: briefing surfaces political_dimensions.internal_cohesion when gate ON', () => {
        setPoliticalDimensionPropagationOverride(true);
        setCohesionCautionBiasOverride(true);

        const corpsId = 'test_corps' as FormationId;
        const faction = 'RBiH' as FactionId;
        const state = buildMinimalState(corpsId, faction, 20);

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
        expect(briefing.political_dimensions?.internal_cohesion).toBe(20);
        // intl_standing sub-flag is OFF, so that field MUST be absent even though
        // the state fixture has no intl_standing value either.
        expect(briefing.political_dimensions?.international_standing).toBeUndefined();
    });

    // Test 7: Byte-stability — briefing OMITS political_dimensions when gate OFF.
    it('test 7: briefing OMITS political_dimensions when cohesion gate OFF', () => {
        const corpsId = 'test_corps' as FormationId;
        const faction = 'RBiH' as FactionId;
        const state = buildMinimalState(corpsId, faction, 20);

        // Sanity-check both gates are OFF.
        expect(isCohesionCautionBiasActive()).toBe(false);
        expect(isIntlStandingOpsHesitationActive()).toBe(false);

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

    // Test 8: Compositional — cohesion sub-flag ON, intl_standing sub-flag OFF.
    it('test 8: cohesion-only composition surfaces internal_cohesion alone', () => {
        setPoliticalDimensionPropagationOverride(true);
        setIntlStandingOpsHesitationOverride(false);
        setCohesionCautionBiasOverride(true);

        const corpsId = 'test_corps' as FormationId;
        const faction = 'RS' as FactionId;
        const state = buildMinimalState(corpsId, faction, 35, 25);

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
        expect(briefing.political_dimensions?.internal_cohesion).toBe(35);
        // intl_standing sub-flag is OFF → field must be absent even though the
        // state fixture provides a value.
        expect(briefing.political_dimensions?.international_standing).toBeUndefined();
    });

    // ----- Multiplier byte-stable fast-paths -----

    it('multiplier returns 1.0 for undefined input (byte-stable fast-path)', () => {
        expect(getCohesionCautionBiasMultiplier(undefined)).toBe(1.0);
    });

    it('multiplier returns 1.0 for non-numeric/NaN input (defensive)', () => {
        expect(getCohesionCautionBiasMultiplier(NaN as unknown as number)).toBe(1.0);
    });

    it('multiplier returns 1.0 when cohesion >= 40 (no caution bias)', () => {
        expect(getCohesionCautionBiasMultiplier(40)).toBe(1.0);
        expect(getCohesionCautionBiasMultiplier(50)).toBe(1.0);
        expect(getCohesionCautionBiasMultiplier(100)).toBe(1.0);
    });

    it('multiplier returns 0.85 when cohesion < 40 (caution bias active)', () => {
        expect(getCohesionCautionBiasMultiplier(39)).toBe(0.85);
        expect(getCohesionCautionBiasMultiplier(20)).toBe(0.85);
        expect(getCohesionCautionBiasMultiplier(0)).toBe(0.85);
    });

    it('multiplier 0.85 × 0.7 product remains byte-stable when both flags OFF', () => {
        // Sentinel: when both helpers receive undefined, product is 1.0 exactly,
        // protecting the !== 1.0 byte-stable fast-path in emit.ts buildOperations.
        const mult = getCohesionCautionBiasMultiplier(undefined)
            * getCohesionCautionBiasMultiplier(undefined);
        expect(mult).toBe(1.0);
    });
});
