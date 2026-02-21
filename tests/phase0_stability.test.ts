/**
 * Phase B Step 4: Stability Score derivation tests.
 * - Formula: Base(50) + Demographic + Organizational - Geographic.
 * - Domain [0, 100] enforced.
 * - Edge cases: enclave, isolated, strong majority.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import {
    STABILITY_BASE,
    STABILITY_CONTESTED_MIN,
    STABILITY_MAX,
    STABILITY_MIN,
    STABILITY_SECURE_MIN,
    computeControlStatus,
    computeStabilityScore,
    demographicFactor,
    geographicVulnerabilityTotal,
    organizationalFactor,
    updateAllStabilityScores,
    updateMunicipalityStabilityScore
} from '../src/phase0/index.js';
import type { GameState, MunicipalityId } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function minimalStateWithMunicipalities(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 0, seed: 'stab-test', phase: 'phase_0' },
        factions: [],
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        municipalities: {
            M1: {},
            M2: { organizational_penetration: { police_loyalty: 'loyal', to_control: 'controlled' } },
            M3: { organizational_penetration: { police_loyalty: 'hostile', sds_penetration: 60 } }
        }
    };
}

test('STABILITY_BASE is 50, domain is [0, 100]', () => {
    assert.strictEqual(STABILITY_BASE, 50);
    assert.strictEqual(STABILITY_MIN, 0);
    assert.strictEqual(STABILITY_MAX, 100);
    assert.strictEqual(STABILITY_SECURE_MIN, 60);
    assert.strictEqual(STABILITY_CONTESTED_MIN, 40);
});

test('demographicFactor: >60% +25, 50-60% +15, 40-50% +5, <40% -15', () => {
    assert.strictEqual(demographicFactor(0.65), 25);
    assert.strictEqual(demographicFactor(0.55), 15);
    assert.strictEqual(demographicFactor(0.45), 5);
    assert.strictEqual(demographicFactor(0.35), -15);
    assert.strictEqual(demographicFactor(undefined), -15);
});

test('organizationalFactor: police loyal +15, mixed -10, hostile -15', () => {
    assert.strictEqual(organizationalFactor({ police_loyalty: 'loyal' }, 'RBiH'), 15);
    assert.strictEqual(organizationalFactor({ police_loyalty: 'mixed' }, 'RBiH'), -10);
    assert.strictEqual(organizationalFactor({ police_loyalty: 'hostile' }, 'RS'), -15);
});

test('organizationalFactor: TO controlled +15, contested -10', () => {
    assert.strictEqual(organizationalFactor({ to_control: 'controlled' }, 'RBiH'), 15);
    assert.strictEqual(organizationalFactor({ to_control: 'contested' }, 'RBiH'), -10);
    assert.strictEqual(organizationalFactor({ to_control: 'lost' }, 'RBiH'), 0);
});

test('organizationalFactor: strong SDS in non-RS area -15', () => {
    const op = { sds_penetration: 55 };
    assert.strictEqual(organizationalFactor(op, 'RBiH'), -15);
    assert.strictEqual(organizationalFactor(op, 'RS'), 0);
});

test('organizationalFactor: strong PL in RBiH area +10', () => {
    assert.strictEqual(organizationalFactor({ patriotska_liga: 50 }, 'RBiH'), 10);
    assert.strictEqual(organizationalFactor({ patriotska_liga: 50 }, 'RS'), 0);
});

test('organizationalFactor: JNA RS-aligned +10, non-RS -10', () => {
    assert.strictEqual(organizationalFactor({ jna_presence: true }, 'RS'), 10);
    assert.strictEqual(organizationalFactor({ jna_presence: true }, 'RBiH'), -10);
});

test('geographicVulnerabilityTotal: adjacent hostile -20, strategic -10, isolated -10, friendly rear +10', () => {
    assert.strictEqual(geographicVulnerabilityTotal({ adjacentHostile: true }), 20);
    assert.strictEqual(geographicVulnerabilityTotal({ strategicRoute: true }), 10);
    assert.strictEqual(geographicVulnerabilityTotal({ isolatedEnclave: true }), 10);
    assert.strictEqual(geographicVulnerabilityTotal({ connectedFriendlyRear: true }), -10);
    assert.strictEqual(
        geographicVulnerabilityTotal({ adjacentHostile: true, isolatedEnclave: true }),
        30
    );
});

test('computeStabilityScore: full formula and clamp to [0, 100]', () => {
    const score = computeStabilityScore({
        controller: 'RBiH',
        controllerShare: 0.65,
        organizational: { police_loyalty: 'loyal', to_control: 'controlled' },
        geographic: {}
    });
    const raw = 50 + 25 + 15 + 15;
    assert.strictEqual(score, Math.min(100, raw));
    assert.ok(score >= STABILITY_MIN && score <= STABILITY_MAX);
});

test('computeControlStatus: thresholds map to SECURE/CONTESTED/HIGHLY_CONTESTED', () => {
    assert.strictEqual(computeControlStatus(80), 'SECURE');
    assert.strictEqual(computeControlStatus(60), 'SECURE');
    assert.strictEqual(computeControlStatus(59), 'CONTESTED');
    assert.strictEqual(computeControlStatus(40), 'CONTESTED');
    assert.strictEqual(computeControlStatus(39), 'HIGHLY_CONTESTED');
});

test('computeStabilityScore: clamps to 100 when raw exceeds', () => {
    const score = computeStabilityScore({
        controller: 'RS',
        controllerShare: 0.7,
        organizational: { police_loyalty: 'loyal', to_control: 'controlled', jna_presence: true },
        geographic: { connectedFriendlyRear: true }
    });
    assert.strictEqual(score, 100);
});

test('computeStabilityScore: clamps to 0 when raw below zero', () => {
    const score = computeStabilityScore({
        controller: null,
        controllerShare: 0.2,
        organizational: { police_loyalty: 'hostile', to_control: 'contested', sds_penetration: 60 },
        geographic: { adjacentHostile: true, isolatedEnclave: true, strategicRoute: true }
    });
    assert.strictEqual(score, 0);
});

test('computeStabilityScore: enclave/isolated applies -10 geographic', () => {
    const score = computeStabilityScore({
        controller: 'RBiH',
        controllerShare: 0.5,
        organizational: {},
        geographic: { isolatedEnclave: true }
    });
    assert.strictEqual(score, 50 + 15 + 0 - 10);
});

test('updateMunicipalityStabilityScore sets state.municipalities[munId].stability_score', () => {
    const state = minimalStateWithMunicipalities();
    const out = updateMunicipalityStabilityScore(state, 'M_NEW' as MunicipalityId, {
        controller: 'RBiH',
        controllerShare: 0.55,
        organizational: {},
        geographic: {}
    });
    assert.strictEqual(out, 50 + 15 + 0 - 0);
    assert.strictEqual(state.municipalities!['M_NEW'].stability_score, 65);
    assert.strictEqual(state.municipalities!['M_NEW'].control_status, 'SECURE');
});

test('updateAllStabilityScores iterates in sorted order and sets all scores', () => {
    const state = minimalStateWithMunicipalities();
    updateAllStabilityScores(state, {
        getController: (id) => (id === 'M2' ? 'RBiH' : id === 'M3' ? 'RBiH' : null),
        getControllerShare: () => 0.5,
        getGeographic: (id) => (id === 'M3' ? { adjacentHostile: true } : undefined)
    });
    const m1 = state.municipalities!['M1'];
    const m2 = state.municipalities!['M2'];
    const m3 = state.municipalities!['M3'];
    assert.ok(m1 && typeof m1.stability_score === 'number');
    assert.ok(m1.stability_score >= 0 && m1.stability_score <= 100);
    assert.ok(m2 && typeof m2.stability_score === 'number' && m2.stability_score >= 50);
    assert.ok(m3 && m2 && typeof m3.stability_score === 'number' && typeof m2.stability_score === 'number' && m3.stability_score <= m2.stability_score);
});
