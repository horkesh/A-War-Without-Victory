/**
 * Tests for assertSectorBrigadesActive invariant.
 *
 * Verifies:
 * 1. Inactive/dissolved brigades in sectors trigger console.error.
 * 2. All-active brigades produce no error.
 */

import { describe, expect, it, vi } from 'vitest';
import { assertSectorBrigadesActive } from '../src/sim/combat/corps_front_sectors.js';
import type { CorpsFrontSector, FormationState, FormationId } from '../src/state/game_state.js';

/** Minimal sector fixture. */
function makeSector(overrides: Partial<CorpsFrontSector> = {}): CorpsFrontSector {
    return {
        sector_id: 'sector:test_corps:0',
        corps_id: 'test_corps',
        faction: 'RS',
        opposing_factions: ['RBiH'],
        edge_ids: ['e1'],
        sub_segments: [],
        length_edges: 1,
        territory_osids: ['op:test:a'],
        assigned_brigade_ids: [],
        reserve_brigade_ids: [],
        ...overrides,
    } as CorpsFrontSector;
}

/** Minimal formation fixture. */
function makeFormation(overrides: Partial<FormationState> = {}): FormationState {
    return {
        id: 'brig_1',
        faction: 'RS',
        name: 'Test Brigade',
        kind: 'infantry',
        status: 'active',
        personnel: 2000,
        cohesion: 80,
        morale: 70,
        corps: 'test_corps',
        location_osid: 'op:test:a',
        ...overrides,
    } as FormationState;
}

describe('assertSectorBrigadesActive', () => {
    it('logs error when sector contains an inactive brigade', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const formations: Record<FormationId, FormationState> = {
            brig_inactive: makeFormation({ id: 'brig_inactive', status: 'inactive' }),
        };
        const sectors = [makeSector({ assigned_brigade_ids: ['brig_inactive'] })];

        assertSectorBrigadesActive(sectors, formations);

        expect(spy).toHaveBeenCalledOnce();
        expect(spy.mock.calls[0][0]).toContain('SECTOR BRIGADE STATUS INVARIANT VIOLATION');
        expect(spy.mock.calls[0][0]).toContain("status='inactive'");

        spy.mockRestore();
    });

    it('logs error when sector contains a destroyed brigade', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const formations: Record<FormationId, FormationState> = {
            brig_dead: makeFormation({ id: 'brig_dead', status: 'inactive', lifecycle_status: 'destroyed' }),
        };
        const sectors = [makeSector({ reserve_brigade_ids: ['brig_dead'] })];

        assertSectorBrigadesActive(sectors, formations);

        expect(spy).toHaveBeenCalledOnce();
        const msg = spy.mock.calls[0][0] as string;
        // status='inactive' is caught first; lifecycle_status only fires as invariant if status='active'
        expect(msg).toContain("status='inactive'");

        spy.mockRestore();
    });

    it('logs error when sector references a non-existent formation', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const formations: Record<FormationId, FormationState> = {};
        const sectors = [makeSector({ assigned_brigade_ids: ['brig_ghost'] })];

        assertSectorBrigadesActive(sectors, formations);

        expect(spy).toHaveBeenCalledOnce();
        expect(spy.mock.calls[0][0]).toContain('formation not found');

        spy.mockRestore();
    });

    it('does not log error when all brigades are active', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const formations: Record<FormationId, FormationState> = {
            brig_ok: makeFormation({ id: 'brig_ok' }),
            brig_ok2: makeFormation({ id: 'brig_ok2' }),
        };
        const sectors = [makeSector({
            assigned_brigade_ids: ['brig_ok'],
            reserve_brigade_ids: ['brig_ok2'],
        })];

        assertSectorBrigadesActive(sectors, formations);

        expect(spy).not.toHaveBeenCalled();

        spy.mockRestore();
    });
});
