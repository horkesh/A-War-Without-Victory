/**
 * Enclave-column displacement effect (RS brigade-attrition follow-up, 2026-08-05).
 * On an enclave-fall event, ARBiH enclave formations take heavy casualties and either
 * break out at reduced strength (Srebrenica) or are deported (Žepa). Flag-gated
 * AWWV_ENCLAVE_COLUMN_DISPLACEMENT (default OFF => no-op => byte-identical).
 * Spec: docs/plans/2026-08-05-enclave-column-displacement-and-codex-lane.md.
 */
import { describe, it, expect } from 'vitest';
import { applyEventEffects } from '../src/sim/events/apply_effects.js';
import type { EventEffect } from '../src/sim/events/event_types.js';
import type { GameState } from '../src/state/game_state.js';

const FLAG = 'AWWV_ENCLAVE_COLUMN_DISPLACEMENT';
function withFlag(v: string | undefined, fn: () => void): void {
    const prev = process.env[FLAG];
    if (v === undefined) delete process.env[FLAG]; else process.env[FLAG] = v;
    try { fn(); } finally { if (prev === undefined) delete process.env[FLAG]; else process.env[FLAG] = prev; }
}

function encFormation(over?: Record<string, unknown>) {
    return {
        id: 'arbih_280th', faction: 'RBiH', corps_id: 'arbih_2nd_corps', status: 'active',
        personnel: 1000, tags: ['enclave'],
        location_osid: 'op:srebrenica:srebrenica_2', home_osid: 'op:srebrenica:srebrenica_2',
        assignment: { kind: 'sector', sector_id: 's', role: 'front' },
        ...over,
    } as Record<string, unknown>;
}

function makeState(f: Record<string, unknown>): GameState {
    return {
        schema_version: 1,
        meta: { turn: 165, phase: 'war', scenario_id: 'test', player_faction: 'RBiH', seed: 'a' },
        factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
        military: { formations: { [f.id as string]: f } },
    } as unknown as GameState;
}

const srebEffect: EventEffect = {
    kind: 'enclave_formation_displacement', faction: 'RBiH',
    source_osids: ['op:srebrenica:srebrenica_2'], destination_osid: 'op:zivinice:gracanica_2',
    casualty_fraction: 0.6, reconstitute_as: 'reduced',
};

describe('enclave_formation_displacement', () => {
    it('flag OFF (default): no-op — byte-identical', () => {
        withFlag(undefined, () => {
            const f = encFormation(); applyEventEffects(makeState(f), [srebEffect]);
            expect(f.personnel).toBe(1000);
            expect(f.location_osid).toBe('op:srebrenica:srebrenica_2');
            expect(f.status).toBe('active');
        });
    });

    it('flag ON + reconstitute_as reduced: casualties + relocate to destination, stays active', () => {
        withFlag('true', () => {
            const f = encFormation(); applyEventEffects(makeState(f), [srebEffect]);
            expect(f.personnel).toBe(400);                       // 1000 - floor(1000*0.6)
            expect(f.location_osid).toBe('op:zivinice:gracanica_2');
            expect(f.home_osid).toBe('op:zivinice:gracanica_2');
            expect(f.status).toBe('active');
            expect(f.assignment).toBeNull();
        });
    });

    it('flag ON + reconstitute_as none: deported — inactive, personnel 0 (Žepa)', () => {
        withFlag('true', () => {
            const f = encFormation();
            applyEventEffects(makeState(f), [{ ...srebEffect, reconstitute_as: 'none', casualty_fraction: 0.15 }]);
            expect(f.status).toBe('inactive');
            expect(f.personnel).toBe(0);
            expect(f.lifecycle_status).toBe('destroyed');
        });
    });

    it('flag ON: does NOT touch non-enclave-tagged formations', () => {
        withFlag('true', () => {
            const f = encFormation({ tags: [] }); applyEventEffects(makeState(f), [srebEffect]);
            expect(f.personnel).toBe(1000);
            expect(f.location_osid).toBe('op:srebrenica:srebrenica_2');
        });
    });

    it('flag ON: matches via stable home_osid even after the generic net already relocated the formation', () => {
        withFlag('true', () => {
            // Already displaced out of the enclave to a rear OSID, but home_osid is pinned.
            const f = encFormation({ location_osid: 'op:banovici:banovici_2', home_osid: 'op:srebrenica:srebrenica_2' });
            applyEventEffects(makeState(f), [srebEffect]);
            expect(f.personnel).toBe(400);                       // matched via home_osid -> casualties applied
            expect(f.location_osid).toBe('op:zivinice:gracanica_2');
        });
    });

    it('flag ON: does NOT touch formations outside source_osids', () => {
        withFlag('true', () => {
            const f = encFormation({ location_osid: 'op:tuzla:tuzla_2', home_osid: 'op:tuzla:tuzla_2' });
            applyEventEffects(makeState(f), [srebEffect]);
            expect(f.personnel).toBe(1000);
        });
    });

    it('flag ON: malformed casualty_fraction is a safe no-op', () => {
        withFlag('true', () => {
            const f = encFormation();
            applyEventEffects(makeState(f), [{ ...srebEffect, casualty_fraction: Number.NaN }]);
            expect(f.personnel).toBe(1000);
        });
    });
});
