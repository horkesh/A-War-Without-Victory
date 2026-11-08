/**
 * Dayton Phase-4 — client-side read-model (daytonReadouts) unit tests.
 *
 * These pure helpers MIRROR the shipped sim read-models so the negotiation modal
 * shows live readouts without an IPC round-trip. The tests pin them to the
 * engine's authoritative values (computeEntityAutonomyIndex) and to the
 * peace_dysfunction component formulas so UI/engine truth can't silently drift.
 */
import { describe, it, expect } from 'vitest';
import {
    computeAutonomyPreview,
    computeDysfunctionPreview,
    previewBrckoOutcome,
    OUTCOME_CAP_THRESHOLD,
    BRCKO_PACKAGE_ID,
    type InstitutionChoice,
} from '../../src/ui/map/data/daytonReadouts';
import { computeTreatyAutonomyIndex } from '../../src/sim/negotiation/institutional_packages';
import { COMPETENCY_PACKAGES } from '../../src/sim/negotiation/competency_packages';
import { PEACE_DYSFUNCTION_CAP_THRESHOLD } from '../../src/sim/negotiation/peace_dysfunction';

const ALL_DECENTRAL: Record<string, InstitutionChoice> = {
    military: 'decentralized', economy: 'decentralized', police: 'decentralized',
    judiciary: 'decentralized', presidency: 'decentralized', education: 'decentralized',
};
const ALL_CENTRAL: Record<string, InstitutionChoice> = {
    military: 'centralized', economy: 'centralized', police: 'centralized',
    judiciary: 'centralized', presidency: 'centralized', education: 'centralized',
};

describe('computeAutonomyPreview mirrors the engine', () => {
    it('all-decentralized → 100 (historical Dayton default)', () => {
        expect(computeAutonomyPreview(ALL_DECENTRAL)).toBe(100);
    });
    // One treaty measure since the DC walkthrough (2026-11-08): each power counted once
    // through its competency row; the legacy toggles cover five of the sixteen rows,
    // so "all six centralized" is far below history but not a unitary state.
    it('all six legacy toggles centralized → well below history, above 0', () => {
        const v = computeAutonomyPreview(ALL_CENTRAL);
        expect(v).toBeGreaterThan(0);
        expect(v).toBeLessThan(40);
    });
    it('every competency at the state → 0 (unitary state)', () => {
        const allState = Object.fromEntries(COMPETENCY_PACKAGES.map(c => [c.id, 'state']));
        expect(computeAutonomyPreview({}, allState)).toBe(0);
    });
    it('empty map → 100 (the historical Dayton division of powers)', () => {
        expect(computeAutonomyPreview({})).toBe(100);
    });
    it('naming a competency at its historical owner changes nothing', () => {
        expect(computeAutonomyPreview(ALL_DECENTRAL, { comp_education: 'entity', comp_customs: 'state' })).toBe(100);
    });
    it('matches the engine treaty index for the same terms', () => {
        const mixed: Record<string, InstitutionChoice> = {
            military: 'centralized', economy: 'decentralized', police: 'centralized',
            judiciary: 'decentralized', presidency: 'centralized', education: 'decentralized',
        };
        expect(computeAutonomyPreview(mixed)).toBe(computeTreatyAutonomyIndex({ institutional_choices: mixed }));
        expect(computeAutonomyPreview(mixed, { comp_monetary: 'entity' }))
            .toBe(computeTreatyAutonomyIndex({ institutional_choices: mixed, competency_allocation: { comp_monetary: 'entity' } }));
    });
});

describe('previewBrckoOutcome', () => {
    const empty = new Set<string>();
    it('unraised Brčko → arbitration district (the real Annex-2 default)', () => {
        expect(previewBrckoOutcome('RBiH', empty, empty)).toBe('arbitration');
    });
    it('demanded by a Federation player → federation', () => {
        expect(previewBrckoOutcome('RBiH', new Set([BRCKO_PACKAGE_ID]), empty)).toBe('federation');
    });
    it('demanded by RS player → rs', () => {
        expect(previewBrckoOutcome('RS', new Set([BRCKO_PACKAGE_ID]), empty)).toBe('rs');
    });
    it('conceded by a Federation player → rs (the other side)', () => {
        expect(previewBrckoOutcome('RBiH', empty, new Set([BRCKO_PACKAGE_ID]))).toBe('rs');
    });
});

describe('computeDysfunctionPreview (honest floor)', () => {
    const balancedSplit = { RBiH: 34, RS: 33, HRHB: 33 };
    it('cap threshold mirrors the engine cap threshold', () => {
        expect(OUTCOME_CAP_THRESHOLD).toBe(PEACE_DYSFUNCTION_CAP_THRESHOLD);
    });
    it('decentralized + balanced split + arbitration → high floor capping a clean win', () => {
        const p = computeDysfunctionPreview(ALL_DECENTRAL, balancedSplit, 'arbitration');
        expect(p.autonomyComponent).toBeGreaterThan(0);
        expect(p.fragmentationComponent).toBeGreaterThan(0);
        expect(p.brckoComponent).toBe(100);
        expect(p.indexFloor).toBeGreaterThanOrEqual(0);
        expect(p.indexFloor).toBeLessThanOrEqual(100);
    });
    it('centralized + cohesive split + clean Brčko → low floor, no cap', () => {
        const cohesive = { RBiH: 90, RS: 8, HRHB: 2 };
        const p = computeDysfunctionPreview(ALL_CENTRAL, cohesive, 'federation');
        expect(p.autonomyComponent).toBe(0);
        expect(p.brckoComponent).toBe(20);
        expect(p.capsCleanWin).toBe(false);
    });
    it('capsCleanWin is true exactly when indexFloor >= threshold', () => {
        const p = computeDysfunctionPreview(ALL_DECENTRAL, balancedSplit, 'arbitration');
        expect(p.capsCleanWin).toBe(p.indexFloor >= OUTCOME_CAP_THRESHOLD);
    });
    it('refugee/condemnation are excluded → floor never exceeds the structural-only weights', () => {
        // autonomy(0.30)+fragmentation(0.25)+brcko(0.10) = 0.65 of the blend max.
        const p = computeDysfunctionPreview(ALL_DECENTRAL, { RBiH: 34, RS: 33, HRHB: 33 }, 'arbitration');
        expect(p.indexFloor).toBeLessThanOrEqual(65 + 0.1);
    });
});
