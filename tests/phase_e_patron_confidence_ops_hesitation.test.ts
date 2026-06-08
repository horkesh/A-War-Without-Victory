/**
 * Phase E extension — patron_confidence → bot op-launch patron-hesitation gate.
 *
 * Tests:
 *   1-5  Gate-module unit tests (env, override, combined, reset).
 *   6    Integration: briefing surfaces `political_dimensions.patron_confidence`
 *        when both gates are ON and the negotiation substrate has a value.
 *   7    Byte-stability: with the gate OFF, briefing OMITS the field.
 *   8    Compositional: patron sub-flag ON + other sub-flags OFF →
 *        briefing has political_dimensions with patron_confidence ONLY.
 *   9-12 Multiplier byte-stable fast-paths (undefined, NaN, >= threshold) and
 *        0.75 for patron_confidence < 30.
 *
 * Determinism: each test resets gate overrides via `resetPoliticalDimensionGates`
 * and snapshots/restores process.env entries.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    isPatronConfidenceOpsHesitationActive,
    isPatronConfidenceOpsHesitationEnabled,
    isCohesionCautionBiasActive,
    isIntlStandingOpsHesitationActive,
    isMilitaryCredibilityCautionBiasActive,
    isPoliticalDimensionPropagationEnabled,
    resetPoliticalDimensionGates,
    setPatronConfidenceOpsHesitationOverride,
    setPoliticalDimensionPropagationOverride,
} from '../src/sim/political/political_dimension_propagation_gate.js';
import { getPatronConfidenceOpsHesitationMultiplier } from '../src/sim/combat/sector_offensive.js';
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
    patron: string | undefined;
} {
    return {
        propagation: process.env.AWWV_POLITICAL_DIMENSION_PROPAGATION,
        patron: process.env.AWWV_PDP_PATRON_CONFIDENCE_OPS_HESITATION,
    };
}

function restorePdpEnv(snap: ReturnType<typeof snapshotPdpEnv>): void {
    if (snap.propagation === undefined) {
        delete process.env.AWWV_POLITICAL_DIMENSION_PROPAGATION;
    } else {
        process.env.AWWV_POLITICAL_DIMENSION_PROPAGATION = snap.propagation;
    }
    if (snap.patron === undefined) {
        delete process.env.AWWV_PDP_PATRON_CONFIDENCE_OPS_HESITATION;
    } else {
        process.env.AWWV_PDP_PATRON_CONFIDENCE_OPS_HESITATION = snap.patron;
    }
}

function clearPdpEnv(): void {
    delete process.env.AWWV_POLITICAL_DIMENSION_PROPAGATION;
    delete process.env.AWWV_PDP_PATRON_CONFIDENCE_OPS_HESITATION;
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
    patronConfidence: number | undefined,
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
    if (patronConfidence !== undefined) {
        military.negotiation = {
            strategic_dimensions: {
                [faction]: {
                    patron_confidence: {
                        base_value: patronConfidence,
                        event_modifier: 0,
                        effective_value: patronConfidence,
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

describe('Phase E extension — patron_confidence → bot patron-hesitation gate', () => {
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

    // Test 1: Default-ON activation contract (PDP activation lane). With env
    // unset and no overrides, the global switch AND the patron sub-flag are both
    // DEFAULT-ON, so the combined patron gate is active.
    it('test 1: defaults to ON (global + patron sub-flag) when env unset', () => {
        expect(isPoliticalDimensionPropagationEnabled()).toBe(true);
        expect(isPatronConfidenceOpsHesitationEnabled()).toBe(true);
        expect(isPatronConfidenceOpsHesitationActive()).toBe(true);
    });

    // Test 1b: explicit opt-out ("0"/"false") restores the legacy OFF path.
    it('test 1b: patron sub-flag opt-out forces the channel OFF', () => {
        process.env.AWWV_PDP_PATRON_CONFIDENCE_OPS_HESITATION = '0';
        expect(isPatronConfidenceOpsHesitationEnabled()).toBe(false);
        expect(isPatronConfidenceOpsHesitationActive()).toBe(false);
        process.env.AWWV_PDP_PATRON_CONFIDENCE_OPS_HESITATION = 'false';
        expect(isPatronConfidenceOpsHesitationEnabled()).toBe(false);
    });

    // Test 2: Sub-flag override true + global false → combined false.
    it('test 2: combined patron gate requires BOTH tiers ON', () => {
        setPoliticalDimensionPropagationOverride(false);
        setPatronConfidenceOpsHesitationOverride(true);
        expect(isPoliticalDimensionPropagationEnabled()).toBe(false);
        expect(isPatronConfidenceOpsHesitationEnabled()).toBe(true);
        expect(isPatronConfidenceOpsHesitationActive()).toBe(false);
    });

    // Test 3: Both overrides true → combined true.
    it('test 3: combined patron gate ON when both tiers ON', () => {
        setPoliticalDimensionPropagationOverride(true);
        setPatronConfidenceOpsHesitationOverride(true);
        expect(isPatronConfidenceOpsHesitationActive()).toBe(true);
    });

    // Test 4: Env vars route through without overrides.
    it('test 4: env vars enable patron gate without overrides', () => {
        process.env.AWWV_POLITICAL_DIMENSION_PROPAGATION = 'true';
        process.env.AWWV_PDP_PATRON_CONFIDENCE_OPS_HESITATION = 'true';
        expect(isPoliticalDimensionPropagationEnabled()).toBe(true);
        expect(isPatronConfidenceOpsHesitationEnabled()).toBe(true);
        expect(isPatronConfidenceOpsHesitationActive()).toBe(true);
    });

    // Test 5: Reset clears the patron override.
    it('test 5: resetPoliticalDimensionGates clears patron override', () => {
        setPoliticalDimensionPropagationOverride(true);
        setPatronConfidenceOpsHesitationOverride(true);
        expect(isPatronConfidenceOpsHesitationActive()).toBe(true);
        resetPoliticalDimensionGates();
        // After reset, env falls through. With env cleared the patron channel is
        // DEFAULT-ON (both tiers default-on), so it is active again.
        expect(isPatronConfidenceOpsHesitationEnabled()).toBe(true);
        expect(isPatronConfidenceOpsHesitationActive()).toBe(true);
    });

    // Test 6: Integration — briefing carries patron_confidence when gate ON.
    it('test 6: briefing surfaces political_dimensions.patron_confidence when gate ON', () => {
        setPoliticalDimensionPropagationOverride(true);
        setPatronConfidenceOpsHesitationOverride(true);

        const corpsId = 'test_corps' as FormationId;
        const faction = 'RS' as FactionId;
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
        expect(briefing.political_dimensions?.patron_confidence).toBe(20);
        // Other sub-flags OFF → those fields MUST be absent.
        expect(briefing.political_dimensions?.international_standing).toBeUndefined();
        expect(briefing.political_dimensions?.internal_cohesion).toBeUndefined();
        expect(briefing.political_dimensions?.military_credibility).toBeUndefined();
    });

    // Test 7: Byte-stability — briefing OMITS political_dimensions when the
    // substrate is OFF. Since patron + milcred are now DEFAULT-ON, force the
    // legacy no-op path via the global opt-out override.
    it('test 7: briefing OMITS political_dimensions when gate OFF', () => {
        setPoliticalDimensionPropagationOverride(false);

        const corpsId = 'test_corps' as FormationId;
        const faction = 'RS' as FactionId;
        const state = buildMinimalState(corpsId, faction, 20);

        // Sanity-check all gates are OFF (global opt-out forces every channel off).
        expect(isPatronConfidenceOpsHesitationActive()).toBe(false);
        expect(isIntlStandingOpsHesitationActive()).toBe(false);
        expect(isCohesionCautionBiasActive()).toBe(false);
        expect(isMilitaryCredibilityCautionBiasActive()).toBe(false);

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

    // Test 8: Compositional — patron sub-flag ON, others OFF.
    it('test 8: patron-only composition surfaces patron_confidence alone', () => {
        setPoliticalDimensionPropagationOverride(true);
        setPatronConfidenceOpsHesitationOverride(true);

        const corpsId = 'test_corps' as FormationId;
        const faction = 'HRHB' as FactionId;
        const state = buildMinimalState(corpsId, faction, 15);

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
        expect(briefing.political_dimensions?.patron_confidence).toBe(15);
        expect(briefing.political_dimensions?.international_standing).toBeUndefined();
        expect(briefing.political_dimensions?.internal_cohesion).toBeUndefined();
        expect(briefing.political_dimensions?.military_credibility).toBeUndefined();
    });

    // ----- Multiplier byte-stable fast-paths -----

    it('multiplier returns 1.0 for undefined input (byte-stable fast-path)', () => {
        expect(getPatronConfidenceOpsHesitationMultiplier(undefined)).toBe(1.0);
    });

    it('multiplier returns 1.0 for non-numeric/NaN input (defensive)', () => {
        expect(getPatronConfidenceOpsHesitationMultiplier(NaN as unknown as number)).toBe(1.0);
    });

    it('multiplier returns 1.0 when patron_confidence >= 30 (no hesitation)', () => {
        expect(getPatronConfidenceOpsHesitationMultiplier(30)).toBe(1.0);
        expect(getPatronConfidenceOpsHesitationMultiplier(50)).toBe(1.0);
        expect(getPatronConfidenceOpsHesitationMultiplier(100)).toBe(1.0);
    });

    it('multiplier returns 0.75 when patron_confidence < 30 (hesitation active)', () => {
        expect(getPatronConfidenceOpsHesitationMultiplier(29)).toBe(0.75);
        expect(getPatronConfidenceOpsHesitationMultiplier(10)).toBe(0.75);
        expect(getPatronConfidenceOpsHesitationMultiplier(0)).toBe(0.75);
    });
});
