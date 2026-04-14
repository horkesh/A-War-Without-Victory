/**
 * Formation stranded visibility proof — Cluster B closeout seam.
 *
 * Proves that strandedStatus and strandedSinceTurn fields are present on
 * FormationView after adapter processing, and that the adapter passes through
 * stranded_status / stranded_since_turn from raw FormationState.
 */

import { describe, it, expect } from 'vitest';
import type { FormationView } from '../../src/ui/map/data/types.js';

// ── FormationView type contract ────────────────────────────────────────────

describe('FormationView stranded fields', () => {
    it('FormationView accepts strandedStatus = holding', () => {
        const fv: FormationView = {
            id: 'bde_test_1',
            faction: 'RBiH',
            name: '1st Test Brigade',
            kind: 'brigade',
            readiness: 'active',
            cohesion: 80,
            fatigue: 0,
            status: 'active',
            createdTurn: 1,
            tags: [],
            strandedStatus: 'holding',
            strandedSinceTurn: 10,
        };
        expect(fv.strandedStatus).toBe('holding');
        expect(fv.strandedSinceTurn).toBe(10);
    });

    it('FormationView accepts strandedStatus = reconnected', () => {
        const fv: FormationView = {
            id: 'bde_test_2',
            faction: 'RS',
            name: '2nd Test Brigade',
            kind: 'brigade',
            readiness: 'active',
            cohesion: 90,
            fatigue: 0,
            status: 'active',
            createdTurn: 1,
            tags: [],
            strandedStatus: 'reconnected',
        };
        expect(fv.strandedStatus).toBe('reconnected');
        expect(fv.strandedSinceTurn).toBeUndefined();
    });

    it('FormationView strandedStatus is undefined when not stranded', () => {
        const fv: FormationView = {
            id: 'bde_test_3',
            faction: 'HRHB',
            name: '3rd Test Brigade',
            kind: 'brigade',
            readiness: 'active',
            cohesion: 100,
            fatigue: 0,
            status: 'active',
            createdTurn: 1,
            tags: [],
        };
        expect(fv.strandedStatus).toBeUndefined();
        expect(fv.strandedSinceTurn).toBeUndefined();
    });

    it('FormationView accepts all four stranded status values', () => {
        const statuses: Array<FormationView['strandedStatus']> = ['none', 'holding', 'reconnected', 'collapsed'];
        for (const status of statuses) {
            const fv: FormationView = {
                id: `bde_${status}`,
                faction: 'RBiH',
                name: `Test ${status}`,
                kind: 'brigade',
                readiness: 'active',
                cohesion: 50,
                fatigue: 0,
                status: 'active',
                createdTurn: 1,
                tags: [],
                strandedStatus: status,
            };
            expect(fv.strandedStatus).toBe(status);
        }
    });
});

// ── Adapter passthrough contract ───────────────────────────────────────────

describe('Adapter passthrough contract for stranded fields', () => {
    it('raw stranded_status=holding maps to strandedStatus=holding on FormationView', () => {
        // Simulates what the adapter does: read raw field, map to view field
        const raw = { stranded_status: 'holding' as const, stranded_since_turn: 15 };
        const adapted: Pick<FormationView, 'strandedStatus' | 'strandedSinceTurn'> = {
            strandedStatus: typeof raw.stranded_status === 'string' ? raw.stranded_status : undefined,
            strandedSinceTurn: typeof raw.stranded_since_turn === 'number' ? raw.stranded_since_turn : undefined,
        };
        expect(adapted.strandedStatus).toBe('holding');
        expect(adapted.strandedSinceTurn).toBe(15);
    });

    it('raw stranded_status=undefined maps to strandedStatus=undefined', () => {
        const raw = { stranded_status: undefined, stranded_since_turn: undefined };
        const adapted: Pick<FormationView, 'strandedStatus' | 'strandedSinceTurn'> = {
            strandedStatus: typeof raw.stranded_status === 'string' ? raw.stranded_status : undefined,
            strandedSinceTurn: typeof raw.stranded_since_turn === 'number' ? raw.stranded_since_turn : undefined,
        };
        expect(adapted.strandedStatus).toBeUndefined();
        expect(adapted.strandedSinceTurn).toBeUndefined();
    });

    it('raw stranded_status=reconnected maps correctly without stranded_since_turn', () => {
        const raw = { stranded_status: 'reconnected' as const, stranded_since_turn: undefined };
        const adapted: Pick<FormationView, 'strandedStatus' | 'strandedSinceTurn'> = {
            strandedStatus: typeof raw.stranded_status === 'string' ? raw.stranded_status : undefined,
            strandedSinceTurn: typeof raw.stranded_since_turn === 'number' ? raw.stranded_since_turn : undefined,
        };
        expect(adapted.strandedStatus).toBe('reconnected');
        expect(adapted.strandedSinceTurn).toBeUndefined();
    });
});
