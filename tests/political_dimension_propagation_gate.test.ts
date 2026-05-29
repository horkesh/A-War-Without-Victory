/**
 * Phase E MVS — political-dimension propagation gate + briefing surfacing
 * + sector_offensive hesitation multiplier.
 *
 * Tests:
 *   1-5  Gate-module unit tests (env, override, combined, reset).
 *   6    Integration: briefing carries `political_dimensions.international_standing`
 *        when both gates are ON and the negotiation substrate has a value.
 *   7    Byte-stability: with the gate OFF, briefing OMITS the field — the
 *        assembled briefing is deeply equal (modulo non-deterministic perf
 *        fields, which the briefing has none of) to the gate-off baseline.
 *
 * Determinism: each test resets gate overrides via `resetPoliticalDimensionGates`
 * and snapshots/restores process.env entries.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    isIntlStandingOpsHesitationActive,
    isIntlStandingOpsHesitationEnabled,
    isPoliticalDimensionPropagationEnabled,
    resetPoliticalDimensionGates,
    setIntlStandingOpsHesitationOverride,
    setPoliticalDimensionPropagationOverride,
} from '../src/sim/political/political_dimension_propagation_gate.js';
import { getIntlStandingOpsHesitationMultiplier } from '../src/sim/combat/sector_offensive.js';
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
} {
    return {
        propagation: process.env.AWWV_POLITICAL_DIMENSION_PROPAGATION,
        intlStanding: process.env.AWWV_PDP_INTL_STANDING_OPS_HESITATION,
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
}

function clearPdpEnv(): void {
    delete process.env.AWWV_POLITICAL_DIMENSION_PROPAGATION;
    delete process.env.AWWV_PDP_INTL_STANDING_OPS_HESITATION;
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
    intlStanding: number | undefined,
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
    if (intlStanding !== undefined) {
        military.negotiation = {
            strategic_dimensions: {
                [faction]: {
                    international_standing: {
                        base_value: intlStanding,
                        event_modifier: 0,
                        effective_value: intlStanding,
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

describe('Phase E MVS — political-dimension propagation gate', () => {
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

    // Test 1: Default (no env, no override) → both gates report false.
    it('test 1: defaults to OFF when env unset and no overrides', () => {
        expect(isPoliticalDimensionPropagationEnabled()).toBe(false);
        expect(isIntlStandingOpsHesitationEnabled()).toBe(false);
        expect(isIntlStandingOpsHesitationActive()).toBe(false);
    });

    // Test 2: Global override true + sub-flag override false → combined false.
    it('test 2: combined gate requires BOTH tiers ON', () => {
        setPoliticalDimensionPropagationOverride(true);
        setIntlStandingOpsHesitationOverride(false);
        expect(isPoliticalDimensionPropagationEnabled()).toBe(true);
        expect(isIntlStandingOpsHesitationEnabled()).toBe(false);
        expect(isIntlStandingOpsHesitationActive()).toBe(false);
    });

    // Test 3: Both overrides true → combined true.
    it('test 3: combined gate ON when both tiers ON', () => {
        setPoliticalDimensionPropagationOverride(true);
        setIntlStandingOpsHesitationOverride(true);
        expect(isIntlStandingOpsHesitationActive()).toBe(true);
    });

    // Test 4: Reset clears overrides, env falls through.
    it('test 4: resetPoliticalDimensionGates clears overrides', () => {
        setPoliticalDimensionPropagationOverride(true);
        setIntlStandingOpsHesitationOverride(true);
        expect(isIntlStandingOpsHesitationActive()).toBe(true);
        resetPoliticalDimensionGates();
        expect(isPoliticalDimensionPropagationEnabled()).toBe(false);
        expect(isIntlStandingOpsHesitationEnabled()).toBe(false);
        expect(isIntlStandingOpsHesitationActive()).toBe(false);
    });

    // Test 5: Env vars route through without overrides.
    it('test 5: env vars enable both tiers without overrides', () => {
        process.env.AWWV_POLITICAL_DIMENSION_PROPAGATION = 'true';
        process.env.AWWV_PDP_INTL_STANDING_OPS_HESITATION = 'true';
        expect(isPoliticalDimensionPropagationEnabled()).toBe(true);
        expect(isIntlStandingOpsHesitationEnabled()).toBe(true);
        expect(isIntlStandingOpsHesitationActive()).toBe(true);
    });

    // Test 6: Integration — briefing carries the field when gate ON + state has value.
    it('test 6: briefing surfaces political_dimensions.international_standing when gate ON', () => {
        setPoliticalDimensionPropagationOverride(true);
        setIntlStandingOpsHesitationOverride(true);

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
        expect(briefing.political_dimensions?.international_standing).toBe(20);
    });

    // Test 7: Byte-stability — briefing OMITS the field when gate OFF.
    it('test 7: briefing OMITS political_dimensions when gate OFF', () => {
        const corpsId = 'test_corps' as FormationId;
        const faction = 'RBiH' as FactionId;
        // State has the value populated, but gate is OFF.
        const state = buildMinimalState(corpsId, faction, 20);

        // Sanity-check gate is OFF.
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

        // Field must be entirely absent (not present-with-undefined) to keep
        // hash-stable briefings vs pre-Phase-E baselines.
        expect('political_dimensions' in briefing).toBe(false);
    });

    // Bonus: helper byte-stability — undefined input returns exactly 1.0.
    it('multiplier returns 1.0 for undefined input (byte-stable fast-path)', () => {
        expect(getIntlStandingOpsHesitationMultiplier(undefined)).toBe(1.0);
    });

    it('multiplier returns 1.0 for non-numeric input (defensive)', () => {
        // Cast forces the runtime defensive branch in the helper.
        expect(getIntlStandingOpsHesitationMultiplier(NaN as unknown as number))
            .toBe(1.0);
    });

    it('multiplier returns 0.7 when intl_standing < 30', () => {
        expect(getIntlStandingOpsHesitationMultiplier(29)).toBe(0.7);
        expect(getIntlStandingOpsHesitationMultiplier(0)).toBe(0.7);
    });

    it('multiplier returns 1.0 when intl_standing >= 30 (no hesitation)', () => {
        expect(getIntlStandingOpsHesitationMultiplier(30)).toBe(1.0);
        expect(getIntlStandingOpsHesitationMultiplier(50)).toBe(1.0);
        expect(getIntlStandingOpsHesitationMultiplier(100)).toBe(1.0);
    });
});
